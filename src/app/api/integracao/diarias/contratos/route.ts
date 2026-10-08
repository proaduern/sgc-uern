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

    // Busca contratos ativos de viagens, passagens, hospedagem e transporte
    const contratos = await prisma.contrato.findMany({
      where: {
        status: 'ATIVO',
        OR: [
          { objeto: { contains: 'viagen', mode: 'insensitive' } },
          { objeto: { contains: 'passagen', mode: 'insensitive' } },
          { objeto: { contains: 'hospedagem', mode: 'insensitive' } },
          { objeto: { contains: 'transporte', mode: 'insensitive' } },
          { numeroContrato: { contains: '06/2025' } },
        ],
      },
      include: {
        fornecedor: {
          select: {
            id: true,
            razaoSocial: true,
            nomeFantasia: true,
            cnpj: true,
            email: true,
            telefone: true,
          },
        },
        ordensServico: {
          select: {
            id: true,
            numeroOs: true,
            valorEstimado: true,
          },
        },
      },
      orderBy: { vigenciaFim: 'desc' },
    });

    const contratosFormatados = contratos.map((c) => {
      const totalEmpenhado = c.ordensServico.reduce((acc, os) => acc + (os.valorEstimado || 0), 0);
      const saldoDisponivel = Math.max(0, c.valorAtualizado - totalEmpenhado);

      // Determinar o tipo de benefício predominante para o sistema de diárias
      let tipoBeneficio = 'PASSAGEM_AEREA';
      const objLower = c.objeto.toLowerCase();
      if (objLower.includes('hospedagem') && !objLower.includes('passagem')) {
        tipoBeneficio = 'HOSPEDAGEM';
      } else if (objLower.includes('terrestre') || objLower.includes('locação de veículo')) {
        tipoBeneficio = 'PASSAGEM_TERRESTRE';
      }

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
        valorTotalCentavos: Math.round(c.valorAtualizado * 100),
        saldoDisponivel,
        saldoDisponivelCentavos: Math.round(saldoDisponivel * 100),
        tipoBeneficio,
        fornecedor: c.fornecedor,
      };
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      contratos: contratosFormatados,
    });
  } catch (error: any) {
    console.error('Erro ao consultar contratos de viagens no SGC:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor SGC.' }, { status: 500 });
  }
}
