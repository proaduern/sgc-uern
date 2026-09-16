import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { canManageAtas } from '@/lib/rbac';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (!canManageAtas(session.role)) {
      return NextResponse.json({ error: 'Acesso restrito à PROAD e Gestor de Ata.' }, { status: 403 });
    }

    const atas = await prisma.ataRegistroPreco.findMany({
      include: {
        fornecedor: true,
        gestor: {
          select: { id: true, nome: true, email: true, matricula: true },
        },
        itens: {
          orderBy: { numeroItem: 'asc' },
        },
        adesoes: {
          orderBy: { createdAt: 'desc' },
        },
        autorizacoesExecucao: {
          orderBy: { dataAutorizacao: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ atas });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao listar atas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (!canManageAtas(session.role)) {
      return NextResponse.json({ error: 'Apenas administradores da PROAD e Gestores de Ata podem registrar Atas de Registro de Preços.' }, { status: 403 });
    }

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
      indiceReajuste,
      itens, // Array<{ numeroItem, descricao, marcaModelo, unidade, quantidade, valorUnitario }>
    } = body;

    if (!numeroAta || !processoSei || !objeto || !fornecedorId || !vigenciaInicio || !vigenciaFim || !valorGlobal) {
      return NextResponse.json(
        { error: 'Número da Ata, Processo SEI, Objeto, Fornecedor, Vigência e Valor são obrigatórios.' },
        { status: 400 }
      );
    }

    const valorGlobalFloat = parseFloat(valorGlobal);

    const novaAta = await prisma.$transaction(async (tx) => {
      const ata = await tx.ataRegistroPreco.create({
        data: {
          numeroAta,
          ano: ano ? parseInt(ano) : new Date().getFullYear(),
          processoSei,
          objeto,
          fornecedorId,
          gestorId: gestorId || session.id,
          vigenciaInicio: new Date(vigenciaInicio),
          vigenciaFim: new Date(vigenciaFim),
          valorGlobalOriginal: valorGlobalFloat,
          valorGlobalAtual: valorGlobalFloat,
          indiceReajuste: indiceReajuste || 'IPCA',
          status: 'VIGENTE',
        },
      });

      if (itens && Array.isArray(itens)) {
        for (let i = 0; i < itens.length; i++) {
          const item = itens[i];
          const qtd = parseFloat(item.quantidade) || 0;
          const vUnit = parseFloat(item.valorUnitario) || 0;
          await tx.ataItem.create({
            data: {
              ataId: ata.id,
              numeroItem: item.numeroItem || (i + 1),
              descricao: item.descricao,
              marcaModelo: item.marcaModelo || null,
              unidade: item.unidade || 'UN',
              quantidadeRegistrada: qtd,
              quantidadeSaldo: qtd,
              valorUnitario: vUnit,
              valorTotal: qtd * vUnit,
            },
          });
        }
      }

      return ata;
    });

    return NextResponse.json({ success: true, ata: novaAta }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar ARP:', error);
    return NextResponse.json({ error: error.message || 'Erro ao registrar Ata' }, { status: 500 });
  }
}
