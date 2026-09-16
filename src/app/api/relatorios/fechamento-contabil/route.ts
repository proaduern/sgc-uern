import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isAdminRole, getUserDesignatedContext } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const ano = searchParams.get('ano');
    const decisao = searchParams.get('decisao');
    const cidade = searchParams.get('cidade');
    const contratoId = searchParams.get('contratoId');
    const apenasAbertas = searchParams.get('apenasAbertas') !== 'false';

    const whereClause: any = {};

    // Restrição por perfil caso não seja Administrador
    if (!isAdminRole(session.role)) {
      const { contractIds } = await getUserDesignatedContext(session.id);
      whereClause.contratoId = { in: contractIds };
    }

    if (contratoId && contratoId !== 'TODOS') {
      whereClause.contratoId = contratoId;
    }

    if (cidade && cidade !== 'TODAS') {
      whereClause.cidade = cidade;
    }

    if (decisao && decisao !== 'TODAS') {
      whereClause.decisaoContabil = decisao;
    }

    // Apenas despesas com valor estimado aberto (empenhadas)
    if (apenasAbertas) {
      whereClause.OR = [
        { status: 'ABERTA' },
        { saldo: { gt: 0 } },
      ];
    }

    if (ano && ano !== 'TODOS') {
      const anoNum = parseInt(ano);
      if (!isNaN(anoNum)) {
        whereClause.OR = [
          { anoExercicio: anoNum },
          { referencia: { contains: String(anoNum) } },
          {
            createdAt: {
              gte: new Date(`${anoNum}-01-01T00:00:00.000Z`),
              lte: new Date(`${anoNum}-12-31T23:59:59.999Z`),
            },
          },
        ];
      }
    }

    const despesas = await prisma.despesaExecucao.findMany({
      where: whereClause,
      include: {
        contrato: {
          select: {
            id: true,
            numeroContrato: true,
            numeroEmpenho: true,
            processoSeiMae: true,
            objeto: true,
            tipoContrato: true,
            valorGlobal: true,
            valorAtualizado: true,
            fornecedor: {
              select: {
                id: true,
                razaoSocial: true,
                cnpj: true,
              },
            },
          },
        },
      },
      orderBy: [
        { decisaoContabil: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Calcular consolidados orçamentários/contábeis
    let totalEstimado = 0;
    let totalManter = 0;
    let totalAnular = 0;
    let qtdManter = 0;
    let qtdAnular = 0;

    for (const d of despesas) {
      const valorBase = d.status === 'ABERTA' ? d.valorEstimado : (d.saldo > 0 ? d.saldo : d.valorEstimado);
      totalEstimado += valorBase;

      if (d.decisaoContabil === 'ANULAR_CANCELAR') {
        totalAnular += valorBase;
        qtdAnular++;
      } else {
        // Padrão é MANTER
        totalManter += valorBase;
        qtdManter++;
      }
    }

    return NextResponse.json({
      despesas,
      totais: {
        totalEstimado,
        totalManter,
        totalAnular,
        qtdTotal: despesas.length,
        qtdManter,
        qtdAnular,
      },
    });
  } catch (error: any) {
    console.error('Erro ao buscar fechamento contábil:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar dados de fechamento contábil' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const { despesaId, decisaoContabil, justificativaContabil, anoExercicio } = body;

    if (!despesaId || !decisaoContabil) {
      return NextResponse.json(
        { error: 'ID da despesa e Decisão Contábil são obrigatórios.' },
        { status: 400 }
      );
    }

    if (!['MANTER', 'ANULAR_CANCELAR'].includes(decisaoContabil)) {
      return NextResponse.json(
        { error: 'Decisão contábil inválida. Use MANTER ou ANULAR_CANCELAR.' },
        { status: 400 }
      );
    }

    // Verificar se a despesa existe
    const despesa = await prisma.despesaExecucao.findUnique({
      where: { id: despesaId },
      include: { contrato: true },
    });

    if (!despesa) {
      return NextResponse.json({ error: 'Despesa não encontrada.' }, { status: 404 });
    }

    // Verificar permissão
    if (!isAdminRole(session.role)) {
      const { contractIds } = await getUserDesignatedContext(session.id);
      if (!contractIds.includes(despesa.contratoId)) {
        return NextResponse.json(
          { error: 'Apenas Administradores ou Gestores vinculados ao contrato podem alterar a decisão contábil.' },
          { status: 403 }
        );
      }
    }

    const updated = await prisma.despesaExecucao.update({
      where: { id: despesaId },
      data: {
        decisaoContabil,
        justificativaContabil: justificativaContabil !== undefined ? justificativaContabil : despesa.justificativaContabil,
        ...(anoExercicio ? { anoExercicio: parseInt(anoExercicio) } : {}),
      },
    });

    return NextResponse.json({ success: true, despesa: updated });
  } catch (error: any) {
    console.error('Erro ao atualizar decisão contábil:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar decisão contábil' },
      { status: 500 }
    );
  }
}
