import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import {
  gerarHtmlOficioProrrogacao,
  gerarHtmlSolicitacaoProrrogacao,
  gerarHtmlSolicitacaoRepactuacao,
  ItemComparativoRepactuacao,
  MesProRataRepactuacao,
} from '@/lib/documentos-modelos-generator';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const contratoId = resolvedParams.id;

    const body = await request.json();
    const { tipoDocumento, parametros } = body;

    const contrato = await prisma.contrato.findUnique({
      where: { id: contratoId },
      include: {
        fornecedor: true,
        itens: { orderBy: { numeroItem: 'asc' } },
        responsaveis: {
          include: { user: true },
        },
      },
    });

    if (!contrato) {
      return NextResponse.json({ error: 'Contrato não encontrado.' }, { status: 404 });
    }

    // Identifica o Gestor do Contrato
    const gestorResp = contrato.responsaveis.find((r) => r.tipoAtuacao === 'GESTOR') || contrato.responsaveis[0];
    const gestorNome = gestorResp?.user?.nome || session.nome || 'Gestor do Contrato';
    const gestorMatricula = gestorResp?.user?.matricula || 'Matrícula Não Informada';
    const gestorAto = gestorResp?.numeroAtoDesignacao || 'Ato de Designação';

    let htmlGerado = '';
    const anoAtual = new Date().getFullYear();

    if (tipoDocumento === 'OFICIO_PRORROGACAO') {
      const meses = parametros?.mesesProrrogacao || 12;
      const vFimAtual = new Date(contrato.vigenciaFim);
      const novaFim = new Date(vFimAtual);
      novaFim.setMonth(novaFim.getMonth() + meses);

      htmlGerado = gerarHtmlOficioProrrogacao({
        numeroOficio: parametros?.numeroOficio || '77',
        ano: parametros?.ano || anoAtual,
        fornecedor: contrato.fornecedor.razaoSocial,
        cnpj: contrato.fornecedor.cnpj,
        enderecoFornecedor: contrato.fornecedor.endereco || '',
        numeroContrato: contrato.numeroContrato || 'S/N',
        processoSei: contrato.processoSeiMae,
        objeto: contrato.objeto,
        mesesProrrogacao: meses,
        vigenciaProrrogadaInicio: parametros?.vigenciaInicio || vFimAtual.toLocaleDateString('pt-BR'),
        vigenciaProrrogadaFim: parametros?.vigenciaFim || novaFim.toLocaleDateString('pt-BR'),
        gestorNome,
        gestorMatricula,
        gestorAto,
        gestorCargo: 'Diretor / Gestor de Contratos',
      });
    } else if (tipoDocumento === 'SOLICITACAO_PRORROGACAO') {
      const meses = parametros?.mesesProrrogacao || 12;
      const vFimAtual = new Date(contrato.vigenciaFim);
      const novaFim = new Date(vFimAtual);
      novaFim.setMonth(novaFim.getMonth() + meses);

      htmlGerado = gerarHtmlSolicitacaoProrrogacao({
        numeroSolicitacao: parametros?.numeroSolicitacao || '188',
        ano: parametros?.ano || anoAtual,
        numeroContrato: contrato.numeroContrato || 'S/N',
        processoSei: contrato.processoSeiMae,
        fornecedor: contrato.fornecedor.razaoSocial,
        cnpj: contrato.fornecedor.cnpj,
        objeto: contrato.objeto,
        documentosProcesso: parametros?.documentosProcesso || [],
        justificativa: parametros?.justificativa || '',
        mesesProrrogacao: meses,
        vigenciaProrrogadaInicio: parametros?.vigenciaInicio || vFimAtual.toLocaleDateString('pt-BR'),
        vigenciaProrrogadaFim: parametros?.vigenciaFim || novaFim.toLocaleDateString('pt-BR'),
        valorEstimadoProrrogacao: parametros?.valorEstimado || (contrato.valorAtualizado * (meses / 12)),
        gestorNome,
        gestorMatricula,
        gestorAto,
        gestorCargo: 'Diretoria de Administração e Serviços / PROAD',
      });
    } else if (tipoDocumento === 'SOLICITACAO_REPACTUACAO') {
      // Monta itens comparativos (Tabela 01)
      const percentualReajuste = parseFloat(parametros?.percentualReajuste || '0');
      const fator = percentualReajuste > 0 ? (1 + percentualReajuste / 100) : 1;

      const itensComparativos: ItemComparativoRepactuacao[] = contrato.itens.map((it) => {
        // Verifica se há novo valor específico passado nos parâmetros
        const itCustom = parametros?.itensAtualizados?.find((x: any) => x.id === it.id || x.numeroItem === it.numeroItem);
        const vUnitMensalAnt = it.valorUnitarioAtual / 12;

        // Em contratos com itens de insumos/índice, a repactuação por CCT foca na mão de obra
        const aplicaReajusteCct = it.tipoReajuste === 'REPACTUACAO_CCT' || (!it.tipoReajuste && it.tipoReajuste !== 'NAO_REAJUSTAVEL');
        const fatorItem = aplicaReajusteCct ? fator : 1.0;

        const vUnitMensalNovo = itCustom?.novoValorUnitarioMensal !== undefined
          ? parseFloat(itCustom.novoValorUnitarioMensal)
          : vUnitMensalAnt * fatorItem;

        const vTotalAnt = it.valorTotalAtual;
        const vTotalNovo = itCustom?.novoValorTotalAnual !== undefined
          ? parseFloat(itCustom.novoValorTotalAnual)
          : (vUnitMensalNovo * 12 * it.quantidadeAtual);

        // Extrai cidade do colchete se houver (ex: "[Assu/RN] Agente...")
        let cidade = 'Campus Central';
        let desc = it.descricao;
        const cityMatch = it.descricao.match(/^\[([^\]]+)\]\s*(.*)/);
        if (cityMatch) {
          cidade = cityMatch[1];
          desc = cityMatch[2];
        }

        return {
          numeroItem: it.numeroItem,
          cidade,
          funcao: desc,
          tipo: it.unidade || 'Posto',
          quantidade: it.quantidadeAtual,
          valorUnitarioMensalAnterior: vUnitMensalAnt,
          valorUnitarioAnualAnterior: it.valorUnitarioAtual,
          valorTotalAnterior: vTotalAnt,
          valorUnitarioMensalNovo: vUnitMensalNovo,
          valorUnitarioAnualNovo: vUnitMensalNovo * 12,
          valorTotalNovo: vTotalNovo,
        };
      });

      // Monta valores mês a mês (Tabela 02 com cálculo pro-rata)
      const mesesNomes = [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
      ];

      const vMensalAntGeral = contrato.valorAtualizado / 12;
      const vMensalNovoGeral = itensComparativos.reduce((acc, x) => acc + (x.valorTotalNovo / 12), 0);
      const difMensalGeral = vMensalNovoGeral - vMensalAntGeral;

      const mesesProRata: MesProRataRepactuacao[] = [];
      for (let m = 1; m <= 12; m++) {
        mesesProRata.push({
          ordem: m,
          mes: `${mesesNomes[(m + 9) % 12]}/${anoAtual - (m <= 2 ? 1 : 0)}`,
          valorVigenteAnterior: vMensalAntGeral,
          valorRepactuacaoNovo: vMensalNovoGeral,
          diferenca: difMensalGeral,
        });
      }

      const totalApostilamento = difMensalGeral * 12;

      htmlGerado = gerarHtmlSolicitacaoRepactuacao({
        numeroSolicitacao: parametros?.numeroSolicitacao || '177',
        ano: parametros?.ano || anoAtual,
        numeroContrato: contrato.numeroContrato || 'S/N',
        idSeiContrato: contrato.processoSeiMae,
        processoSei: contrato.processoSeiMae,
        fornecedor: contrato.fornecedor.razaoSocial,
        cnpj: contrato.fornecedor.cnpj,
        objeto: contrato.objeto,
        portariaContinuos: contrato.portariaContinuadosRef || '',
        vigenciaInicio: new Date(contrato.vigenciaInicio).toLocaleDateString('pt-BR'),
        vigenciaFim: new Date(contrato.vigenciaFim).toLocaleDateString('pt-BR'),
        cctRegistro: parametros?.cctRegistro || '',
        itensComparativos,
        mesesProRata,
        valorTotalApostilamento: totalApostilamento,
        gestorNome,
        gestorMatricula,
        gestorAto,
        gestorCargo: 'Diretoria de Administração e Serviços / PROAD',
      });
    } else {
      return NextResponse.json({ error: 'Tipo de documento inválido.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      tipoDocumento,
      html: htmlGerado,
      mensagem: 'Documento gerado com sucesso nos padrões da UERN e SEI.',
    });
  } catch (error: any) {
    console.error('Erro ao gerar documento modelo:', error);
    return NextResponse.json({ error: error.message || 'Falha ao gerar documento' }, { status: 500 });
  }
}
