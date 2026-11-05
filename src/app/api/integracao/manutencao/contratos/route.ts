import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const serviceKey = process.env.PROAD_SERVICE_KEY || 'proad_interop_internal_service_key_2026_uern';

    if (authHeader && authHeader !== `Bearer ${serviceKey}`) {
      return NextResponse.json({ error: 'Chave de integração PROAD inválida.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo')?.toUpperCase();

    // Filtros rigorosos e separados por tipo de contrato no SGC
    let whereClause: any = {
      status: 'ATIVO',
    };

    if (tipo === 'CLIMATIZACAO') {
      whereClause.OR = [
        { objeto: { contains: 'climatiza', mode: 'insensitive' } },
        { objeto: { contains: 'refrigera', mode: 'insensitive' } },
        { objeto: { contains: 'ar condicionado', mode: 'insensitive' } },
        { objeto: { contains: 'ar-condicionado', mode: 'insensitive' } },
        { numeroContrato: { contains: '11/2026' } },
      ];
    } else if (tipo === 'PREDIAL') {
      whereClause.AND = [
        {
          OR: [
            { objeto: { contains: 'predial', mode: 'insensitive' } },
            { objeto: { contains: 'civil', mode: 'insensitive' } },
            { objeto: { contains: 'reforma', mode: 'insensitive' } },
            { objeto: { contains: 'alvenaria', mode: 'insensitive' } },
            { numeroContrato: { contains: '01/2026' } },
            { numeroContrato: { contains: '01/2016' } },
            { numeroContrato: { contains: '14/2025' } },
            { numeroContrato: { contains: '03/2025' } },
          ],
        },
        {
          NOT: [
            { objeto: { contains: 'climatiza', mode: 'insensitive' } },
            { objeto: { contains: 'refrigera', mode: 'insensitive' } },
            { objeto: { contains: 'ar condicionado', mode: 'insensitive' } },
            { objeto: { contains: 'ar-condicionado', mode: 'insensitive' } },
          ],
        },
      ];
    } else {
      // Se não especificado tipo, lista contratos de manutenção geral
      whereClause.OR = [
        { objeto: { contains: 'manutenção', mode: 'insensitive' } },
        { objeto: { contains: 'predial', mode: 'insensitive' } },
        { objeto: { contains: 'climatiza', mode: 'insensitive' } },
      ];
    }

    // Busca contratos ativos no SGC
    const contratos = await prisma.contrato.findMany({
      where: whereClause,
      include: {
        itens: {
          orderBy: { numeroItem: 'asc' },
        },
        trabalhadores: {
          select: {
            id: true,
            nomeCompleto: true,
            cpf: true,
            funcao: true,
            campus: true,
            setorLotacao: true,
            salarioBaseCct: true,
            banco: true,
            agencia: true,
            contaCorrente: true,
            dataAdmissao: true,
            dataDemissao: true,
            status: true,
            beneficiosInfo: true,
          },
          orderBy: [{ status: 'asc' }, { nomeCompleto: 'asc' }],
        },
        fornecedor: {
          select: {
            id: true,
            razaoSocial: true,
            nomeFantasia: true,
            cnpj: true,
            telefone: true,
            email: true,
            endereco: true,
            nomeRepresentanteLegal: true,
          },
        },
        ordensServico: {
          select: {
            id: true,
            numeroOs: true,
            ano: true,
            descricaoServico: true,
            processoSeiDespesa: true,
            valorEstimado: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        medicoes: {
          select: {
            id: true,
            referenciaMesAno: true,
            processoSeiDespesa: true,
            numeroNotaFiscal: true,
            dataEmissaoNf: true,
            valorNotaFiscal: true,
            valorGlosa: true,
            motivoGlosa: true,
            valorAtestadoFinal: true,
            dataRecebimentoProvisorio: true,
            dataRecebimentoDefinitivo: true,
            status: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { vigenciaFim: 'desc' },
    });

    const contratosFormatados = contratos.map((c) => {
      const totalEmpenhadoOs = c.ordensServico.reduce((acc, os) => acc + (os.valorEstimado || 0), 0);
      const totalMedido = c.medicoes.reduce((acc, m) => acc + (m.valorAtestadoFinal ?? m.valorNotaFiscal ?? 0), 0);
      const consumidoEfetivo = Math.max(totalEmpenhadoOs, totalMedido);
      const saldoDisponivel = Math.max(0, c.valorAtualizado - consumidoEfetivo);

      let maoObraExecutado = 0;
      let servicosEventuaisExecutado = 0;
      let insumosExecutado = 0;
      let diariasExecutado = 0;

      for (const m of c.medicoes) {
        const val = m.valorAtestadoFinal ?? m.valorNotaFiscal ?? 0;
        const ref = (m.referenciaMesAno || '').toUpperCase();
        if (ref.includes('MÃO DE OBRA') || ref.includes('MAO DE OBRA')) {
          maoObraExecutado += val;
        } else if (ref.includes('EVENTUAIS') || ref.includes('EVENTUAL')) {
          servicosEventuaisExecutado += val;
        } else if (ref.includes('INSUMOS') || ref.includes('INSUMO')) {
          insumosExecutado += val;
        } else if (ref.includes('DIÁRIAS') || ref.includes('DIARIAS')) {
          diariasExecutado += val;
        }
      }

      return {
        id: c.id,
        numeroContrato: c.numeroContrato,
        processoSei: c.processoSeiMae,
        licitacao: c.licitacaoProcedimento,
        objeto: c.objeto,
        vigenciaInicio: c.vigenciaInicio,
        vigenciaFim: c.vigenciaFim,
        anosVigencia: c.anosVigencia || 1,
        valorGlobal: c.valorGlobal,
        valorAtualizado: c.valorAtualizado,
        totalEmpenhadoOs: Number(totalEmpenhadoOs.toFixed(2)),
        totalMedido: Number(totalMedido.toFixed(2)),
        saldoDisponivel: Number(saldoDisponivel.toFixed(2)),
        percentualConsumido: Number(((consumidoEfetivo / (c.valorAtualizado || 1)) * 100).toFixed(2)),
        execucaoPorRubrica: {
          maoObra: Number(maoObraExecutado.toFixed(2)),
          servicosEventuais: Number(servicosEventuaisExecutado.toFixed(2)),
          insumos: Number(insumosExecutado.toFixed(2)),
          diarias: Number(diariasExecutado.toFixed(2)),
          totalExecutado: Number(totalMedido.toFixed(2)),
        },
        medicoes: c.medicoes,
        fornecedor: c.fornecedor,
        trabalhadores: c.trabalhadores || [],
        totalOrdensServico: c.ordensServico.length,
        ordensServico: c.ordensServico.map((os) => ({
          id: os.id,
          numeroOs: os.numeroOs,
          ano: os.ano,
          descricaoServico: os.descricaoServico,
          processoSeiDespesa: os.processoSeiDespesa,
          valorEstimado: os.valorEstimado,
          status: os.status,
          createdAt: os.createdAt,
        })),
        status: c.status,
        itens: c.itens.map((it) => ({
          id: it.id,
          numeroItem: it.numeroItem,
          cidade: it.cidade,
          descricao: it.descricao,
          unidadeMedida: it.unidade,
          categoriaItem: it.categoriaItem,
          quantidadeAnual: it.quantidadeAnual,
          quantidadeOriginal: it.quantidadeOriginal,
          saldoQuantidade: it.quantidadeAtual,
          valorUnitario: it.valorUnitarioAtual,
          valorTotalAnual: it.valorTotalAnual,
          valorTotalPlurianual: it.valorTotalPlurianual,
          valorTotalAtual: it.valorTotalAtual,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tipoConsultado: tipo || 'TODOS',
      totalContratos: contratosFormatados.length,
      contratos: contratosFormatados,
    });
  } catch (error: any) {
    console.error('Erro ao consultar contratos de manutenção no SGC:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor SGC.' }, { status: 500 });
  }
}
