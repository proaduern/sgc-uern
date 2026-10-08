import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isAdminRole, canManageContaVinculada, getUserDesignatedContext } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const contratoId = searchParams.get('contratoId');

    const whereClause: any = {};

    if (!isAdminRole(session.role)) {
      if (!canManageContaVinculada(session.role)) {
        return NextResponse.json({ error: 'Acesso restrito ao Gestor e Fiscal Administrativo do Contrato.' }, { status: 403 });
      }
      const { contractIds } = await getUserDesignatedContext(session.id);
      if (contratoId) {
        if (!contractIds.includes(contratoId)) {
          return NextResponse.json({
            movimentacoes: [],
            saldosPorRubrica: {
              FERIAS_8_33: 0,
              TERCO_FERIAS_2_78: 0,
              DECIMO_TERCEIRO_8_33: 0,
              FGTS_SOBRE_PROVISOES: 0,
              MULTA_RESCISORIA_FGTS: 0,
            },
            saldoTotal: 0,
          });
        }
        whereClause.contratoId = contratoId;
      } else {
        whereClause.contratoId = { in: contractIds };
      }
    } else if (contratoId) {
      whereClause.contratoId = contratoId;
    }

    const movimentacoes = await prisma.contaVinculadaMovimentacao.findMany({
      where: whereClause,
      include: {
        contrato: {
          select: {
            id: true,
            numeroContrato: true,
            numeroEmpenho: true,
            objeto: true,
            fornecedor: true,
          },
        },
        trabalhador: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calcular saldos acumulados por rubrica e por trabalhador
    const saldosPorRubrica: Record<string, number> = {
      FERIAS_8_33: 0,
      TERCO_FERIAS_2_78: 0,
      DECIMO_TERCEIRO_8_33: 0,
      FGTS_SOBRE_PROVISOES: 0,
      MULTA_RESCISORIA_FGTS: 0,
    };

    const saldosPorTrabalhador: Record<string, { total: number; porRubrica: Record<string, number> }> = {};
    let saldoTotal = 0;

    for (const mov of movimentacoes) {
      const valor = mov.tipoOperacao === 'RETENCAO_ENTRADA' ? mov.valor : -mov.valor;
      saldosPorRubrica[mov.rubrica] = (saldosPorRubrica[mov.rubrica] || 0) + valor;
      saldoTotal += valor;

      if (mov.trabalhadorId) {
        if (!saldosPorTrabalhador[mov.trabalhadorId]) {
          saldosPorTrabalhador[mov.trabalhadorId] = {
            total: 0,
            porRubrica: {
              FERIAS_8_33: 0,
              TERCO_FERIAS_2_78: 0,
              DECIMO_TERCEIRO_8_33: 0,
              FGTS_SOBRE_PROVISOES: 0,
              MULTA_RESCISORIA_FGTS: 0,
            },
          };
        }
        saldosPorTrabalhador[mov.trabalhadorId].total += valor;
        saldosPorTrabalhador[mov.trabalhadorId].porRubrica[mov.rubrica] =
          (saldosPorTrabalhador[mov.trabalhadorId].porRubrica[mov.rubrica] || 0) + valor;
      }
    }

    const trabalhadores = contratoId
      ? await prisma.trabalhadorTerceirizado.findMany({
          where: { contratoId, status: 'ATIVO' },
          orderBy: { nomeCompleto: 'asc' },
        })
      : [];

    return NextResponse.json({
      movimentacoes,
      saldosPorRubrica,
      saldoTotal,
      saldosPorTrabalhador,
      trabalhadores,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao buscar dados da Conta Vinculada' }, { status: 500 });
  }
}

// Calcular e aplicar retenção mensal automática ou liberação por ofício para trabalhadores
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (!isAdminRole(session.role) && !canManageContaVinculada(session.role)) {
      return NextResponse.json(
        { error: 'Seu perfil não possui permissão para movimentar a Conta Vinculada.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { contratoId, competenciaMesAno, tipoOperacao, rubrica, valor, trabalhadorId, numeroOficio, motivoLiberacao, liberacoes } = body;

    if (!contratoId) {
      return NextResponse.json({ error: 'Contrato ID é obrigatório.' }, { status: 400 });
    }

    if (!isAdminRole(session.role)) {
      const { contractIds } = await getUserDesignatedContext(session.id);
      if (!contractIds.includes(contratoId)) {
        return NextResponse.json({ error: 'Não autorizado para este contrato.' }, { status: 403 });
      }
    }

    // Se for liberação em lote por trabalhador via Ofício Bancário
    if (tipoOperacao === 'LIBERACAO_OFICIO_LOTE') {
      if (!Array.isArray(liberacoes) || liberacoes.length === 0) {
        return NextResponse.json({ error: 'Nenhuma liberação de trabalhador selecionada.' }, { status: 400 });
      }

      const registrosCriados = await prisma.$transaction(async (tx) => {
        const registros = [];
        for (const item of liberacoes) {
          const valFloat = parseFloat(item.valor) || 0;
          if (valFloat > 0) {
            const m = await tx.contaVinculadaMovimentacao.create({
              data: {
                contratoId,
                trabalhadorId: item.trabalhadorId || null,
                competenciaMesAno: competenciaMesAno || '03/2026',
                rubrica: item.rubrica || rubrica || 'DECIMO_TERCEIRO_8_33',
                tipoOperacao: 'LIBERACAO_SAIDA',
                valor: valFloat,
                saldoAnterior: 0,
                saldoAtual: 0,
                numeroOficio: numeroOficio || 'OFÍCIO-PROAD/2026',
                motivoLiberacao: motivoLiberacao || `Liberação de ${item.rubrica || rubrica} via ${numeroOficio || 'Ofício Bancário'}`,
              },
            });
            registros.push(m);
          }
        }
        return registros;
      });

      return NextResponse.json({
        success: true,
        message: `${registrosCriados.length} saídas debitadas por funcionário com sucesso.`,
        movimentacoes: registrosCriados,
      });
    }

    // Se for liberação manual simples
    if (tipoOperacao === 'LIBERACAO_SAIDA') {
      if (!valor || !rubrica) {
        return NextResponse.json({ error: 'Rubrica e Valor são obrigatórios para liberação.' }, { status: 400 });
      }

      const valFloat = parseFloat(valor);
      const mov = await prisma.contaVinculadaMovimentacao.create({
        data: {
          contratoId,
          trabalhadorId: trabalhadorId || null,
          competenciaMesAno: competenciaMesAno || '03/2026',
          rubrica,
          tipoOperacao: 'LIBERACAO_SAIDA',
          valor: valFloat,
          saldoAnterior: 0,
          saldoAtual: 0,
          numeroOficio: numeroOficio || 'OFÍCIO-PROAD/2026',
          motivoLiberacao: motivoLiberacao || 'Autorização de saque de provisão',
        },
      });

      return NextResponse.json({ success: true, movimentacao: mov });
    }

    // Se for cálculo mensal automático de provisões (Férias 8.33%, 1/3 2.78%, 13º 8.33%, FGTS 8%, Multa 4%)
    if (!competenciaMesAno) {
      return NextResponse.json({ error: 'Competência (MM/AAAA) é obrigatória.' }, { status: 400 });
    }

    const trabalhadores = await prisma.trabalhadorTerceirizado.findMany({
      where: { contratoId, status: 'ATIVO' },
    });

    if (trabalhadores.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum trabalhador ativo cadastrado neste contrato para cálculo de retenções.' },
        { status: 400 }
      );
    }

    const retencoesCriadas = [];

    for (const t of trabalhadores) {
      const salario = t.salarioBaseCct;

      // Fórmulas exatas do Caderno de Logística
      const ferias = salario * 0.0833;
      const terco = salario * 0.0278;
      const decimo = salario * 0.0833;
      const fgtsProvisoes = (ferias + terco + decimo) * 0.08;
      const multaFgts = salario * 0.04;

      const rubricas = [
        { rubrica: 'FERIAS_8_33', valor: ferias },
        { rubrica: 'TERCO_FERIAS_2_78', valor: terco },
        { rubrica: 'DECIMO_TERCEIRO_8_33', valor: decimo },
        { rubrica: 'FGTS_SOBRE_PROVISOES', valor: fgtsProvisoes },
        { rubrica: 'MULTA_RESCISORIA_FGTS', valor: multaFgts },
      ];

      for (const r of rubricas) {
        const mov = await prisma.contaVinculadaMovimentacao.create({
          data: {
            contratoId,
            trabalhadorId: t.id,
            competenciaMesAno,
            rubrica: r.rubrica as any,
            tipoOperacao: 'RETENCAO_ENTRADA',
            valor: parseFloat(r.valor.toFixed(2)),
            saldoAnterior: 0,
            saldoAtual: 0,
          },
        });
        retencoesCriadas.push(mov);
      }
    }

    return NextResponse.json({
      success: true,
      totalTrabalhadores: trabalhadores.length,
      retencoesCriadas: retencoesCriadas.length,
    });
  } catch (error: any) {
    console.error('Erro em Conta Vinculada:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar retenção' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: 'Apenas administradores da PROAD podem editar movimentações da conta vinculada.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      competenciaMesAno,
      rubrica,
      tipoOperacao,
      valor,
      numeroOficio,
      motivoLiberacao,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID da movimentação é obrigatório.' }, { status: 400 });
    }

    const updated = await prisma.contaVinculadaMovimentacao.update({
      where: { id },
      data: {
        ...(competenciaMesAno ? { competenciaMesAno } : {}),
        ...(rubrica ? { rubrica } : {}),
        ...(tipoOperacao ? { tipoOperacao } : {}),
        ...(valor !== undefined ? { valor: parseFloat(valor) } : {}),
        ...(numeroOficio !== undefined ? { numeroOficio } : {}),
        ...(motivoLiberacao !== undefined ? { motivoLiberacao } : {}),
      },
    });

    return NextResponse.json({ success: true, movimentacao: updated });
  } catch (error: any) {
    console.error('Erro ao atualizar movimentação da conta vinculada:', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar movimentação' }, { status: 500 });
  }
}
