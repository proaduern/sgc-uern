import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isAdminRole, getUserDesignatedContext } from '@/lib/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    const planilha = await prisma.contratoPlanilhaCusto.findUnique({
      where: { id },
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
        item: true,
      },
    });

    if (!planilha) return NextResponse.json({ error: 'Planilha não encontrada' }, { status: 404 });

    if (!isAdminRole(session.role)) {
      const { contractIds } = await getUserDesignatedContext(session.id);
      if (!contractIds.includes(planilha.contratoId)) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
    }

    return NextResponse.json({ planilha });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    const planilhaExistente = await prisma.contratoPlanilhaCusto.findUnique({
      where: { id },
    });

    if (!planilhaExistente) return NextResponse.json({ error: 'Planilha não encontrada' }, { status: 404 });

    if (!isAdminRole(session.role)) {
      const { contractIds } = await getUserDesignatedContext(session.id);
      if (!contractIds.includes(planilhaExistente.contratoId)) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
    }

    const body = await request.json();
    const {
      funcao,
      cbo,
      municipio,
      jornada,
      cctReferencia,
      mesesExecucao,
      quantidadeEmpregados,
      quantidadePostos,
      salarioBase,
      totalModulo1,
      totalModulo2,
      totalModulo3,
      totalModulo4,
      totalModulo5,
      totalModulo6,
      custosIndiretosPercent,
      lucroPercent,
      tributosPercent,
      precoTotalEmpregado,
      valorMensalTotal,
      valorGlobalTotal,
      fatorK,
      dadosDetalhados,
    } = body;

    const sBase = salarioBase !== undefined ? parseFloat(salarioBase) : planilhaExistente.salarioBase;
    const m1 = totalModulo1 !== undefined ? parseFloat(totalModulo1) : planilhaExistente.totalModulo1;
    const m2 = totalModulo2 !== undefined ? parseFloat(totalModulo2) : planilhaExistente.totalModulo2;
    const m3 = totalModulo3 !== undefined ? parseFloat(totalModulo3) : planilhaExistente.totalModulo3;
    const m4 = totalModulo4 !== undefined ? parseFloat(totalModulo4) : planilhaExistente.totalModulo4;
    const m5 = totalModulo5 !== undefined ? parseFloat(totalModulo5) : planilhaExistente.totalModulo5;
    const m6 = totalModulo6 !== undefined ? parseFloat(totalModulo6) : planilhaExistente.totalModulo6;
    const precoEmp = precoTotalEmpregado !== undefined ? parseFloat(precoTotalEmpregado) : (m1 + m2 + m3 + m4 + m5 + m6);
    const qtdEmp = quantidadeEmpregados !== undefined ? parseInt(quantidadeEmpregados, 10) : planilhaExistente.quantidadeEmpregados;
    const qtdPostos = quantidadePostos !== undefined ? parseInt(quantidadePostos, 10) : planilhaExistente.quantidadePostos;
    const vMensal = valorMensalTotal !== undefined ? parseFloat(valorMensalTotal) : (precoEmp * qtdEmp * qtdPostos);
    const nMeses = mesesExecucao !== undefined ? parseInt(mesesExecucao, 10) : planilhaExistente.mesesExecucao;
    const vGlobal = valorGlobalTotal !== undefined ? parseFloat(valorGlobalTotal) : (vMensal * nMeses);
    const fK = fatorK !== undefined ? parseFloat(fatorK) : (sBase > 0 ? parseFloat((precoEmp / sBase).toFixed(4)) : null);

    const updated = await prisma.contratoPlanilhaCusto.update({
      where: { id },
      data: {
        ...(funcao ? { funcao } : {}),
        ...(cbo !== undefined ? { cbo } : {}),
        ...(municipio !== undefined ? { municipio } : {}),
        ...(jornada !== undefined ? { jornada } : {}),
        ...(cctReferencia !== undefined ? { cctReferencia } : {}),
        mesesExecucao: nMeses,
        quantidadeEmpregados: qtdEmp,
        quantidadePostos: qtdPostos,
        salarioBase: sBase,
        totalModulo1: m1,
        totalModulo2: m2,
        totalModulo3: m3,
        totalModulo4: m4,
        totalModulo5: m5,
        totalModulo6: m6,
        custosIndiretosPercent: custosIndiretosPercent !== undefined ? parseFloat(custosIndiretosPercent) : null,
        lucroPercent: lucroPercent !== undefined ? parseFloat(lucroPercent) : null,
        tributosPercent: tributosPercent !== undefined ? parseFloat(tributosPercent) : null,
        precoTotalEmpregado: precoEmp,
        valorMensalTotal: vMensal,
        valorGlobalTotal: vGlobal,
        fatorK: fK,
        ...(dadosDetalhados !== undefined ? { dadosDetalhados } : {}),
      },
      include: {
        item: true,
      },
    });

    return NextResponse.json({ success: true, planilha: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    const planilhaExistente = await prisma.contratoPlanilhaCusto.findUnique({
      where: { id },
    });

    if (!planilhaExistente) return NextResponse.json({ error: 'Planilha não encontrada' }, { status: 404 });

    if (!isAdminRole(session.role)) {
      const { contractIds } = await getUserDesignatedContext(session.id);
      if (!contractIds.includes(planilhaExistente.contratoId)) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
    }

    await prisma.contratoPlanilhaCusto.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Planilha excluída com sucesso' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
