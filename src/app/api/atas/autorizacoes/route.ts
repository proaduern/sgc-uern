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

    const autorizacoes = await prisma.ataAutorizacaoExecucao.findMany({
      where: ataId ? { ataId } : undefined,
      include: {
        ata: {
          include: {
            fornecedor: true,
            itens: { orderBy: { numeroItem: 'asc' } },
          },
        },
      },
      orderBy: { dataAutorizacao: 'desc' },
    });

    return NextResponse.json({ autorizacoes });
  } catch (error: any) {
    console.error('Erro ao listar autorizações de execução:', error);
    return NextResponse.json({ error: 'Erro ao listar autorizações' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (!canManageAtas(session.role)) {
      return NextResponse.json(
        { error: 'Apenas administradores da PROAD e Gestores de Ata podem emitir autorizações de execução.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      ataId,
      numeroAutorizacao,
      processoSei,
      orgaoRequisitante,
      descricao,
      valorTotal,
      observacoes,
      itensDeducao, // Array<{ itemId: string, quantidade: number, valorUnitario?: number }>
    } = body;

    if (!ataId || !processoSei || !orgaoRequisitante || !descricao || valorTotal === undefined) {
      return NextResponse.json(
        { error: 'Ata, Processo SEI, Órgão Requisitante, Descrição e Valor Total são obrigatórios.' },
        { status: 400 }
      );
    }

    const ata = await prisma.ataRegistroPreco.findUnique({
      where: { id: ataId },
      include: { itens: true },
    });

    if (!ata) {
      return NextResponse.json({ error: 'Ata de Registro de Preço não encontrada.' }, { status: 404 });
    }

    const valorFloat = parseFloat(valorTotal);
    const anoAtual = new Date().getFullYear();

    // Auto-geração do número se não fornecido
    let numAuto = numeroAutorizacao;
    if (!numAuto || !numAuto.trim()) {
      const count = await prisma.ataAutorizacaoExecucao.count({
        where: { ataId },
      });
      numAuto = `AEA-${String(count + 1).padStart(3, '0')}/${anoAtual}`;
    }

    const resultado = await prisma.$transaction(async (tx) => {
      // Se informou dedução por item, valida e subtrai dos itens da ata
      if (itensDeducao && Array.isArray(itensDeducao) && itensDeducao.length > 0) {
        for (const it of itensDeducao) {
          const qtd = parseFloat(it.quantidade) || 0;
          if (qtd <= 0) continue;

          const itemDb = await tx.ataItem.findUnique({
            where: { id: it.itemId },
          });

          if (!itemDb) {
            throw new Error(`Item ${it.itemId} não encontrado na ata.`);
          }

          if (itemDb.quantidadeSaldo < qtd) {
            throw new Error(
              `Saldo insuficiente para o item nº ${itemDb.numeroItem} (${itemDb.descricao}). Saldo disponível: ${itemDb.quantidadeSaldo} ${itemDb.unidade}, solicitado: ${qtd}.`
            );
          }

          await tx.ataItem.update({
            where: { id: it.itemId },
            data: {
              quantidadeSaldo: itemDb.quantidadeSaldo - qtd,
            },
          });
        }
      }

      // Cria a autorização de execução
      const autorizacao = await tx.ataAutorizacaoExecucao.create({
        data: {
          ataId,
          numeroAutorizacao: numAuto,
          processoSei,
          orgaoRequisitante,
          descricao,
          valorTotal: valorFloat,
          status: 'AUTORIZADA',
          observacoes: observacoes || null,
        },
      });

      return autorizacao;
    });

    return NextResponse.json({ success: true, autorizacao: resultado }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao emitir autorização de execução de ata:', error);
    return NextResponse.json({ error: error.message || 'Erro ao emitir autorização de execução.' }, { status: 500 });
  }
}
