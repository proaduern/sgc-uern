import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const serviceKey = process.env.PROAD_SERVICE_KEY || 'proad_interop_internal_service_key_2026_uern';

    if (authHeader && authHeader !== `Bearer ${serviceKey}`) {
      return NextResponse.json({ error: 'Chave de integração PROAD inválida.' }, { status: 401 });
    }

    const body = await request.json();
    const {
      ordemServicoId,
      numeroOs,
      contratoId,
      valorMedido,
      numeroNotaFiscal,
      dataRecebimento,
      processoSeiDespesa,
      referenciaMesAno,
      observacao,
    } = body;

    if (!valorMedido || Number(valorMedido) <= 0) {
      return NextResponse.json({ error: 'Valor medido deve ser maior que zero.' }, { status: 400 });
    }

    // 1. Localiza a Ordem de Serviço ou Contrato
    let os = null;
    if (ordemServicoId) {
      os = await prisma.ordemServico.findUnique({
        where: { id: ordemServicoId },
        include: { contrato: true },
      });
    }

    if (!os && numeroOs) {
      os = await prisma.ordemServico.findFirst({
        where: { numeroOs: { contains: numeroOs, mode: 'insensitive' } },
        include: { contrato: true },
      });
    }

    let finalContratoId = os?.contratoId || contratoId;

    if (!finalContratoId) {
      const c = await prisma.contrato.findFirst({
        where: { status: 'ATIVO', numeroContrato: 'Contrato nº 14/2025' },
      });
      finalContratoId = c?.id;
    }

    if (!finalContratoId) {
      return NextResponse.json({ error: 'Contrato não localizado para vinculação da medição.' }, { status: 404 });
    }

    const mesAno = referenciaMesAno || `${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`;

    // 2. Registra a Medição da Despesa no SGC
    const medicao = await prisma.medicaoDespesa.create({
      data: {
        contratoId: finalContratoId,
        ordemServicoId: os?.id || null,
        referenciaMesAno: mesAno,
        processoSeiDespesa: processoSeiDespesa || os?.processoSeiDespesa || '23077.014298/2025-11',
        numeroNotaFiscal: numeroNotaFiscal || null,
        valorNotaFiscal: Number(valorMedido),
        valorAtestadoFinal: Number(valorMedido),
        valorGlosa: 0.0,
        dataRecebimentoProvisorio: new Date(),
        dataRecebimentoDefinitivo: new Date(),
        status: 'ATESTE_DEFINITIVO_GESTOR',
      },
    });

    // Se houver OS vinculada, atualiza o status dela para EXECUTADA / MEDIDA
    if (os) {
      await prisma.ordemServico.update({
        where: { id: os.id },
        data: { status: 'MEDIDA_ATESTE_DEFINITIVO' },
      });
    }

    return NextResponse.json({
      success: true,
      mensagem: 'Medição de manutenção predial incorporada com sucesso ao SGC!',
      medicao: {
        id: medicao.id,
        contratoId: finalContratoId,
        ordemServicoId: os?.id,
        numeroOs: os?.numeroOs,
        referenciaMesAno: medicao.referenciaMesAno,
        valorAtestadoFinal: medicao.valorAtestadoFinal,
        status: medicao.status,
      },
    });
  } catch (error: any) {
    console.error('Erro ao sincronizar medição no SGC:', error);
    return NextResponse.json({ error: error.message || 'Erro ao registrar medição no SGC.' }, { status: 500 });
  }
}
