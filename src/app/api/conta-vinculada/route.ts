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

    // Calcular saldos acumulados por rubrica
    const saldosPorRubrica: Record<string, number> = {
      FERIAS_8_33: 0,
      TERCO_FERIAS_2_78: 0,
      DECIMO_TERCEIRO_8_33: 0,
      FGTS_SOBRE_PROVISOES: 0,
      MULTA_RESCISORIA_FGTS: 0,
    };

    let saldoTotal = 0;

    for (const mov of movimentacoes) {
      const valor = mov.tipoOperacao === 'RETENCAO_ENTRADA' ? mov.valor : -mov.valor;
      saldosPorRubrica[mov.rubrica] = (saldosPorRubrica[mov.rubrica] || 0) + valor;
      saldoTotal += valor;
    }

    return NextResponse.json({
      movimentacoes,
      saldosPorRubrica,
      saldoTotal,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao buscar dados da Conta Vinculada' }, { status: 500 });
  }
}

// Calcular e aplicar retenção mensal automática para todos os trabalhadores do contrato
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const { contratoId, competenciaMesAno, tipoOperacao, rubrica, valor, trabalhadorId, numeroOficio, motivoLiberacao } = body;

    // Se for liberação manual
    if (tipoOperacao === 'LIBERACAO_SAIDA') {
      if (!contratoId || !valor || !rubrica) {
        return NextResponse.json({ error: 'Contrato, Rubrica e Valor são obrigatórios para liberação.' }, { status: 400 });
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
    if (!contratoId || !competenciaMesAno) {
      return NextResponse.json({ error: 'Contrato ID e Competência (MM/AAAA) são obrigatórios.' }, { status: 400 });
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
