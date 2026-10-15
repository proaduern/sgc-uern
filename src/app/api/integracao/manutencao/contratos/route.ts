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
        fornecedor: {
          select: {
            id: true,
            razaoSocial: true,
            nomeFantasia: true,
            cnpj: true,
            telefone: true,
            email: true,
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
            valorAtestadoFinal: true,
            valorNotaFiscal: true,
            status: true,
          },
        },
      },
      orderBy: { vigenciaFim: 'desc' },
    });

    const contratosFormatados = contratos.map((c) => {
      const totalEmpenhadoOs = c.ordensServico.reduce((acc, os) => acc + (os.valorEstimado || 0), 0);
      const totalMedido = c.medicoes.reduce((acc, m) => acc + (m.valorAtestadoFinal || m.valorNotaFiscal || 0), 0);
      const saldoDisponivel = Math.max(0, c.valorAtualizado - totalEmpenhadoOs);

      return {
        id: c.id,
        numeroContrato: c.numeroContrato,
        processoSei: c.processoSeiMae,
        licitacao: c.licitacaoProcedimento,
        objeto: c.objeto,
        vigenciaInicio: c.vigenciaInicio,
        vigenciaFim: c.vigenciaFim,
        valorGlobal: c.valorGlobal,
        valorAtualizado: c.valorAtualizado,
        totalEmpenhadoOs,
        totalMedido,
        saldoDisponivel,
        percentualConsumido: Number(((totalEmpenhadoOs / c.valorAtualizado) * 100).toFixed(2)),
        fornecedor: c.fornecedor,
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
          descricao: it.descricao,
          unidadeMedida: it.unidade,
          valorUnitario: it.valorUnitarioAtual,
          saldoQuantidade: it.quantidadeAtual,
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
