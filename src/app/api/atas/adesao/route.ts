import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { canManageAtas } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (!canManageAtas(session.role)) {
      return NextResponse.json({ error: 'Acesso restrito à PROAD e Gestor de Ata.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const ataId = searchParams.get('ataId');

    const adesoes = await prisma.ataAdesao.findMany({
      where: ataId ? { ataId } : undefined,
      include: {
        ata: {
          include: {
            fornecedor: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ adesoes });
  } catch (error: any) {
    console.error('Erro ao listar adesões/caronas:', error);
    return NextResponse.json({ error: 'Erro ao listar adesões' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (!canManageAtas(session.role)) {
      return NextResponse.json(
        { error: 'Apenas administradores da PROAD e Gestores de Ata podem autorizar adesões (caronas).' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      ataId,
      orgaoRequisitante,
      processoSeiAdesao,
      valorAdesao,
      justificativa,
      statusAprovacao = 'AUTORIZADA',
    } = body;

    if (!ataId || !orgaoRequisitante || !processoSeiAdesao || valorAdesao === undefined) {
      return NextResponse.json(
        { error: 'Ata, Órgão Requisitante, Processo SEI e Valor da Adesão são obrigatórios.' },
        { status: 400 }
      );
    }

    const valorFloat = parseFloat(valorAdesao);
    if (isNaN(valorFloat) || valorFloat <= 0) {
      return NextResponse.json({ error: 'Valor da adesão inválido.' }, { status: 400 });
    }

    const ata = await prisma.ataRegistroPreco.findUnique({
      where: { id: ataId },
      include: {
        adesoes: {
          where: { statusAprovacao: 'AUTORIZADA' },
        },
      },
    });

    if (!ata) {
      return NextResponse.json({ error: 'Ata de Registro de Preço não encontrada.' }, { status: 404 });
    }

    // Regras da Lei Federal nº 14.133/2021 (Art. 86):
    // 1. Limite individual por órgão não participante: máximo de 50% do valor registrado na ata (§ 4º)
    const limiteIndividual50 = ata.valorGlobalOriginal * 0.5;
    if (valorFloat > limiteIndividual50) {
      return NextResponse.json(
        {
          error: `Limite individual excedido (Art. 86, § 4º da Lei 14.133/2021). A adesão não pode superar 50% do valor da Ata (${limiteIndividual50.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}). Solicitado: ${valorFloat.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
        },
        { status: 400 }
      );
    }

    // 2. Limite global de todas as caronas: máximo do dobro (200% / 2x) do valor registrado (§ 5º)
    const totalAdesoesExistentes = ata.adesoes.reduce((acc, ad) => acc + ad.valorAdesao, 0);
    const limiteGlobal200 = ata.valorGlobalOriginal * 2.0;

    if (totalAdesoesExistentes + valorFloat > limiteGlobal200) {
      const saldoGlobalRestante = Math.max(0, limiteGlobal200 - totalAdesoesExistentes);
      return NextResponse.json(
        {
          error: `Limite global de caronas excedido (Art. 86, § 5º da Lei 14.133/2021 - teto de 2x o valor da Ata: ${limiteGlobal200.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}). Total já autorizado: ${totalAdesoesExistentes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Saldo remanescente para novas caronas: ${saldoGlobalRestante.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
        },
        { status: 400 }
      );
    }

    const percentualCalculado = Math.round(((valorFloat / ata.valorGlobalOriginal) * 100) * 100) / 100;

    const adesao = await prisma.ataAdesao.create({
      data: {
        ataId,
        orgaoRequisitante,
        processoSeiAdesao,
        valorAdesao: valorFloat,
        percentualAdesao: percentualCalculado,
        statusAprovacao,
        dataAprovacao: statusAprovacao === 'AUTORIZADA' ? new Date() : null,
        justificativa: justificativa || null,
      },
    });

    return NextResponse.json({ success: true, adesao }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao registrar adesão à ata:', error);
    return NextResponse.json({ error: error.message || 'Erro ao registrar adesão à ata.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (!canManageAtas(session.role)) {
      return NextResponse.json({ error: 'Acesso restrito à PROAD e Gestor de Ata.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, statusAprovacao, justificativa } = body;

    if (!id || !statusAprovacao) {
      return NextResponse.json({ error: 'ID e status de aprovação são obrigatórios.' }, { status: 400 });
    }

    const adesao = await prisma.ataAdesao.update({
      where: { id },
      data: {
        statusAprovacao,
        dataAprovacao: statusAprovacao === 'AUTORIZADA' ? new Date() : null,
        ...(justificativa && { justificativa }),
      },
    });

    return NextResponse.json({ success: true, adesao });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao atualizar adesão.' }, { status: 500 });
  }
}
