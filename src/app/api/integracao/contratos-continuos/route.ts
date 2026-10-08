import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const anoPcaParam = searchParams.get('anoPca');
    const anoPca = anoPcaParam ? parseInt(anoPcaParam, 10) : new Date().getFullYear();

    const authHeader = request.headers.get('authorization');
    const serviceKey = process.env.PROAD_SERVICE_KEY || 'proad_interop_internal_service_key_2026_uern';

    // Verificação de autorização de serviço
    if (authHeader && authHeader !== `Bearer ${serviceKey}`) {
      return NextResponse.json({ error: 'Chave de integração PROAD inválida.' }, { status: 401 });
    }

    // Busca contratos ativos de natureza contínua ou terceirização
    const contratos = await prisma.contrato.findMany({
      where: {
        status: 'ATIVO',
        OR: [
          { tipoVigencia: 'CONTINUADO' },
          { tipoContrato: 'FORNECIMENTO_CONTINUADO' },
          { tipoContrato: 'SERVICO_COM_DEDICACAO_TERCEIRIZACAO' },
          { tipoContrato: 'LOCACAO_IMOVEL' },
        ],
      },
      include: {
        fornecedor: {
          select: {
            id: true,
            razaoSocial: true,
            nomeFantasia: true,
            cnpj: true,
          },
        },
        responsaveis: {
          include: {
            user: {
              select: {
                nome: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: { vigenciaFim: 'asc' },
    });

    // Mapeia e calcula projeções para o ano de planejamento do PCA
    const contratosProjetados = contratos.map((c) => {
      const dataFim = new Date(c.vigenciaFim);
      const dataInicio = new Date(c.vigenciaInicio);
      const anoFim = dataFim.getFullYear();
      const mesFim = dataFim.getMonth() + 1;

      // Anos totais decorridos desde o primeiro termo do contrato
      const diffAnos = Math.max(1, Math.round((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24 * 365)));
      const anosVigencia = c.anosVigencia && c.anosVigencia > 0 ? c.anosVigencia : diffAnos;

      // Valor anualizado estimado
      const valorAnualizado = c.valorAtualizado && anosVigencia > 0 ? c.valorAtualizado / anosVigencia : c.valorGlobal;

      // Regra Lei 14.133/2021: Limite máximo decenal (10 anos) para contínuos
      const atingiraLimiteDecenal = diffAnos >= 10;
      const tipoDemandaSugerida = atingiraLimiteDecenal ? 'NOVA' : 'RENOVACAO';

      // Relevância para o ano selecionado do PCA
      const venceNoAnoPca = anoFim === anoPca;
      const vigenciaAdentraAnoPca = anoFim >= anoPca;

      return {
        id: c.id,
        numeroContrato: c.numeroContrato || `Contrato s/n (${c.processoSeiMae})`,
        processoSeiMae: c.processoSeiMae,
        objeto: c.objeto,
        tipoContrato: c.tipoContrato,
        tipoVigencia: c.tipoVigencia,
        status: c.status,
        vigenciaInicio: c.vigenciaInicio.toISOString(),
        vigenciaFim: c.vigenciaFim.toISOString(),
        anoTerminoVigencia: anoFim,
        mesTerminoVigencia: mesFim,
        anosVigenciaAcumulados: diffAnos,
        atingiraLimiteDecenal,
        valorGlobal: c.valorGlobal,
        valorAtualizado: c.valorAtualizado,
        valorAnualizadoEstimado: Math.round(valorAnualizado * 100) / 100,
        tipoDemandaSugerida,
        venceNoAnoPca,
        vigenciaAdentraAnoPca,
        sugestaoDfd: {
          descricaoSumaria: `${tipoDemandaSugerida === 'RENOVACAO' ? 'Renovação' : 'Nova Contratação'} - ${c.objeto}`,
          justificativa: `Continuidade da prestação de serviços vinculados ao ${c.numeroContrato || 'Contrato'} (Processo SEI ${c.processoSeiMae}). Fornecedor: ${c.fornecedor.razaoSocial} (CNPJ ${c.fornecedor.cnpj}). Vencimento atual da vigência em ${dataFim.toLocaleDateString('pt-BR')}.`,
          tipoDemanda: tipoDemandaSugerida,
          dataPretendida: c.vigenciaFim.toISOString().split('T')[0],
          valorEstimado: Math.round(valorAnualizado * 100) / 100,
        },
        fornecedor: {
          id: c.fornecedor.id,
          razaoSocial: c.fornecedor.razaoSocial,
          nomeFantasia: c.fornecedor.nomeFantasia,
          cnpj: c.fornecedor.cnpj,
        },
        responsaveis: c.responsaveis.map((r) => ({
          tipoFiscalizacao: r.tipoAtuacao,
          nome: r.user.nome,
          email: r.user.email,
        })),
      };
    });

    // Filtra preferencialmente os que impactam o exercício do PCA solicitado
    const contratosRelevantes = contratosProjetados.filter((c) => c.vigenciaAdentraAnoPca);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      anoPcaReferencia: anoPca,
      totalContratosContinuadosAtivos: contratos.length,
      totalImpactamAnoPca: contratosRelevantes.length,
      contratos: contratosRelevantes,
      todosContratosContinuados: contratosProjetados,
    });
  } catch (err: any) {
    console.error('Erro ao consultar contratos contínuos para PCA:', err);
    return NextResponse.json({ error: err.message || 'Erro ao consultar contratos.' }, { status: 500 });
  }
}
