import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { canManageAtas } from '@/lib/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (!canManageAtas(session.role)) {
      return NextResponse.json({ error: 'Acesso restrito à PROAD e Gestor de Ata.' }, { status: 403 });
    }

    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    const ata = await prisma.ataRegistroPreco.findUnique({
      where: { id },
      include: {
        fornecedor: true,
        gestor: { select: { id: true, nome: true, email: true, matricula: true } },
        itens: { orderBy: { numeroItem: 'asc' } },
        adesoes: { orderBy: { createdAt: 'desc' } },
        autorizacoesExecucao: { orderBy: { dataAutorizacao: 'desc' } },
      },
    });

    if (!ata) {
      return NextResponse.json({ error: 'Ata de Registro de Preços não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ ata });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao buscar ARP' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (!canManageAtas(session.role)) {
      return NextResponse.json({ error: 'Apenas administradores da PROAD e Gestores de Ata podem editar Atas de Registro de Preços.' }, { status: 403 });
    }

    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    const body = await request.json();
    const {
      numeroAta,
      ano,
      processoSei,
      objeto,
      fornecedorId,
      gestorId,
      vigenciaInicio,
      vigenciaFim,
      valorGlobal,
      status,
      indiceReajuste,
      dataUltimoReajuste,
      percentualUltimoReajuste,
      aplicarReajustePercentual, // opcional: número em % (ex: 4.5) para aplicar em lote na ata e itens
      itens, // Array<{ id?, numeroItem, descricao, marcaModelo, unidade, quantidadeRegistrada, quantidadeSaldo, valorUnitario }>
    } = body;

    const existingAta = await prisma.ataRegistroPreco.findUnique({
      where: { id },
      include: { itens: true },
    });

    if (!existingAta) {
      return NextResponse.json({ error: 'Ata de Registro de Preços não encontrada.' }, { status: 404 });
    }

    let valorGlobalFloat = valorGlobal ? parseFloat(valorGlobal) : existingAta.valorGlobalAtual;
    let novoPercentualReajuste = percentualUltimoReajuste !== undefined ? parseFloat(percentualUltimoReajuste) : existingAta.percentualUltimoReajuste;
    let novaDataReajuste = dataUltimoReajuste ? new Date(dataUltimoReajuste) : existingAta.dataUltimoReajuste;

    if (aplicarReajustePercentual && !isNaN(parseFloat(aplicarReajustePercentual))) {
      const perc = parseFloat(aplicarReajustePercentual);
      const multiplicador = 1 + (perc / 100);
      valorGlobalFloat = Math.round((existingAta.valorGlobalAtual * multiplicador) * 100) / 100;
      novoPercentualReajuste = perc;
      novaDataReajuste = new Date();
    }

    const ataAtualizada = await prisma.$transaction(async (tx) => {
      // 1. Atualizar dados gerais da ata
      const ata = await tx.ataRegistroPreco.update({
        where: { id },
        data: {
          ...(numeroAta && { numeroAta }),
          ...(ano && { ano: parseInt(ano) }),
          ...(processoSei && { processoSei }),
          ...(objeto && { objeto }),
          ...(fornecedorId && { fornecedorId }),
          ...(gestorId && { gestorId }),
          ...(vigenciaInicio && { vigenciaInicio: new Date(vigenciaInicio) }),
          ...(vigenciaFim && { vigenciaFim: new Date(vigenciaFim) }),
          ...(valorGlobalFloat !== undefined && { valorGlobalAtual: valorGlobalFloat }),
          ...(status && { status }),
          ...(indiceReajuste && { indiceReajuste }),
          ...(novaDataReajuste && { dataUltimoReajuste: novaDataReajuste }),
          ...(novoPercentualReajuste !== undefined && { percentualUltimoReajuste: novoPercentualReajuste }),
        },
      });

      // 2. Se a lista de itens foi enviada, sincronizar itens
      if (itens && Array.isArray(itens)) {
        await tx.ataItem.deleteMany({
          where: { ataId: id },
        });

        for (let i = 0; i < itens.length; i++) {
          const item = itens[i];
          const qtdReg = parseFloat(item.quantidadeRegistrada || item.quantidade) || 0;
          const qtdSaldo = item.quantidadeSaldo !== undefined ? parseFloat(item.quantidadeSaldo) : qtdReg;
          let vUnit = parseFloat(item.valorUnitario) || 0;

          if (aplicarReajustePercentual && !isNaN(parseFloat(aplicarReajustePercentual))) {
            const perc = parseFloat(aplicarReajustePercentual);
            vUnit = Math.round((vUnit * (1 + perc / 100)) * 100) / 100;
          }

          const vTotal = Math.round((qtdReg * vUnit) * 100) / 100;

          await tx.ataItem.create({
            data: {
              ataId: id,
              numeroItem: item.numeroItem || (i + 1),
              descricao: item.descricao,
              marcaModelo: item.marcaModelo || null,
              unidade: item.unidade || 'UN',
              quantidadeRegistrada: qtdReg,
              quantidadeSaldo: qtdSaldo,
              valorUnitario: vUnit,
              valorTotal: vTotal,
            },
          });
        }
      }

      return ata;
    });

    // Retornar a ata atualizada com itens e fornecedor
    const ataCompleta = await prisma.ataRegistroPreco.findUnique({
      where: { id },
      include: {
        fornecedor: true,
        gestor: { select: { id: true, nome: true, email: true, matricula: true } },
        itens: { orderBy: { numeroItem: 'asc' } },
        adesoes: { orderBy: { createdAt: 'desc' } },
        autorizacoesExecucao: { orderBy: { dataAutorizacao: 'desc' } },
      },
    });

    return NextResponse.json({ success: true, ata: ataCompleta });
  } catch (error: any) {
    console.error('Erro ao atualizar ARP:', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar Ata' }, { status: 500 });
  }
}
