import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isAdminRole, getUserDesignatedContext } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const whereClause: any = {};

    if (!isAdminRole(session.role)) {
      const { contractIds } = await getUserDesignatedContext(session.id);
      whereClause.contratoId = { in: contractIds };
    }

    const penalidades = await prisma.penalidade.findMany({
      where: whereClause,
      include: {
        contrato: {
          select: {
            id: true,
            numeroContrato: true,
            numeroEmpenho: true,
            objeto: true,
            processoSeiMae: true,
          },
        },
        fornecedor: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ penalidades });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao listar penalidades' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const { contratoId, tipoPenalidade, fatosDescricao, baseLegal, protocoloNotificacaoSei } = body;

    if (!contratoId || !tipoPenalidade || !fatosDescricao || !baseLegal) {
      return NextResponse.json(
        { error: 'Contrato, Tipo de Penalidade, Descrição dos Fatos e Base Legal são obrigatórios.' },
        { status: 400 }
      );
    }

    if (!isAdminRole(session.role)) {
      const { contractIds } = await getUserDesignatedContext(session.id);
      if (!contractIds.includes(contratoId)) {
        return NextResponse.json(
          { error: 'Você só pode abrir processo sancionatório sobre contratos em que esteja formalmente designado.' },
          { status: 403 }
        );
      }
    }

    const contrato = await prisma.contrato.findUnique({
      where: { id: contratoId },
      include: { fornecedor: true },
    });

    if (!contrato) return NextResponse.json({ error: 'Contrato não encontrado.' }, { status: 404 });

    // Prazo legal de 15 dias úteis (aproximadamente 21 dias corridos) conforme Art. 45, §1º da IN 01/2026
    const prazoDefesa = new Date();
    prazoDefesa.setDate(prazoDefesa.getDate() + 21);

    const penalidade = await prisma.penalidade.create({
      data: {
        contratoId,
        fornecedorId: contrato.fornecedorId,
        tipoPenalidade,
        fatosDescricao,
        baseLegal,
        protocoloNotificacaoSei: protocoloNotificacaoSei || 'NOTIFICAÇÃO-SEI',
        prazoDefesaFim: prazoDefesa,
        status: 'NOTIFICACAO_DEFESA_15_DIAS',
        impactoScore: tipoPenalidade === 'ADVERTENCIA' ? 2.0 : tipoPenalidade === 'MULTA' ? 5.0 : 15.0,
      },
      include: {
        contrato: true,
        fornecedor: true,
      },
    });

    // Atualizar score de confiabilidade do fornecedor
    await prisma.fornecedor.update({
      where: { id: contrato.fornecedorId },
      data: {
        scoreConfiabilidade: Math.max(0, contrato.fornecedor.scoreConfiabilidade - penalidade.impactoScore),
      },
    });

    return NextResponse.json({ success: true, penalidade }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao abrir penalidade:', error);
    return NextResponse.json({ error: error.message || 'Erro ao registrar penalidade' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: 'Apenas administradores da PROAD podem editar processos de penalidade.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      tipoPenalidade,
      fatosDescricao,
      baseLegal,
      protocoloNotificacaoSei,
      status,
      prazoDefesaFim,
      protocoloDecisaoSei,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do processo de penalidade é obrigatório.' }, { status: 400 });
    }

    const updated = await prisma.penalidade.update({
      where: { id },
      data: {
        ...(tipoPenalidade ? { tipoPenalidade } : {}),
        ...(fatosDescricao ? { fatosDescricao } : {}),
        ...(baseLegal ? { baseLegal } : {}),
        ...(protocoloNotificacaoSei !== undefined ? { protocoloNotificacaoSei } : {}),
        ...(status ? { status } : {}),
        ...(prazoDefesaFim ? { prazoDefesaFim: new Date(prazoDefesaFim) } : {}),
        ...(protocoloDecisaoSei !== undefined ? { protocoloDecisaoSei } : {}),
      },
      include: {
        contrato: true,
        fornecedor: true,
      },
    });

    return NextResponse.json({ success: true, penalidade: updated });
  } catch (error: any) {
    console.error('Erro ao atualizar penalidade:', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar processo de penalidade' }, { status: 500 });
  }
}
