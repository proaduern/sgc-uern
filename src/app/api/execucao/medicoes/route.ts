import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const contratoId = searchParams.get('contratoId');

    const whereClause: any = {};
    if (contratoId) whereClause.contratoId = contratoId;

    const medicoes = await prisma.medicaoDespesa.findMany({
      where: whereClause,
      include: {
        contrato: {
          select: {
            id: true,
            numeroContrato: true,
            numeroEmpenho: true,
            objeto: true,
            processoSeiMae: true,
            valorGlobal: true,
            valorAtualizado: true,
            fornecedor: true,
          },
        },
        ordemServico: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ medicoes });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao buscar medições' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const {
      contratoId,
      ordemServicoId,
      referenciaMesAno,
      processoSeiDespesa,
      numeroNotaFiscal,
      dataEmissaoNf,
      valorNotaFiscal,
      valorGlosa,
      motivoGlosa,
    } = body;

    if (!contratoId || !referenciaMesAno || !processoSeiDespesa || !valorNotaFiscal) {
      return NextResponse.json(
        { error: 'Contrato, Referência (Mês/Ano), Processo SEI e Valor da NF são obrigatórios.' },
        { status: 400 }
      );
    }

    const valorNfFloat = parseFloat(valorNotaFiscal);
    const valorGlosaFloat = valorGlosa ? parseFloat(valorGlosa) : 0.0;
    const valorAtestadoFinal = Math.max(0, valorNfFloat - valorGlosaFloat);

    const medicao = await prisma.medicaoDespesa.create({
      data: {
        contratoId,
        ordemServicoId: ordemServicoId || null,
        referenciaMesAno,
        processoSeiDespesa,
        numeroNotaFiscal: numeroNotaFiscal || null,
        dataEmissaoNf: dataEmissaoNf ? new Date(dataEmissaoNf) : null,
        valorNotaFiscal: valorNfFloat,
        valorGlosa: valorGlosaFloat,
        motivoGlosa: motivoGlosa || null,
        valorAtestadoFinal,
        status: 'EM_CONFERENCIA_ADM',
      },
      include: {
        contrato: true,
      },
    });

    return NextResponse.json({ success: true, medicao }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar medição:', error);
    return NextResponse.json({ error: error.message || 'Erro ao registrar medição' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const { medicaoId, acao, motivoGlosa, valorGlosa } = body;

    if (!medicaoId || !acao) {
      return NextResponse.json({ error: 'ID da medição e ação são obrigatórios.' }, { status: 400 });
    }

    const medicao = await prisma.medicaoDespesa.findUnique({
      where: { id: medicaoId },
      include: { contrato: { include: { responsaveis: true } } },
    });

    if (!medicao) {
      return NextResponse.json({ error: 'Medição não encontrada.' }, { status: 404 });
    }

    // Ações: ATESTE_PROVISORIO (Fiscal Técnico), ATESTE_DEFINITIVO (Gestor), ENVIAR_PAGAMENTO
    const updateData: any = {};

    if (acao === 'ATESTE_PROVISORIO') {
      updateData.dataRecebimentoProvisorio = new Date();
      updateData.status = 'ATESTE_PROVISORIO_TECNICO';
      if (valorGlosa !== undefined) {
        const glosa = parseFloat(valorGlosa) || 0;
        updateData.valorGlosa = glosa;
        updateData.motivoGlosa = motivoGlosa || null;
        updateData.valorAtestadoFinal = Math.max(0, (medicao.valorNotaFiscal || 0) - glosa);
      }
    } else if (acao === 'ATESTE_DEFINITIVO') {
      updateData.dataRecebimentoDefinitivo = new Date();
      updateData.status = 'ATESTE_DEFINITIVO_GESTOR';
    } else if (acao === 'ENVIAR_PAGAMENTO') {
      updateData.status = 'ENVIADO_PAGAMENTO_PROPLAN';
    } else if (acao === 'LIQUIDAR') {
      updateData.status = 'LIQUIDADO_PAGO';
    }

    const updated = await prisma.medicaoDespesa.update({
      where: { id: medicaoId },
      data: updateData,
    });

    return NextResponse.json({ success: true, medicao: updated });
  } catch (error: any) {
    console.error('Erro ao atualizar medição:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar ateste' }, { status: 500 });
  }
}
