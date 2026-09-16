import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const fornecedor = await prisma.fornecedor.findUnique({
      where: { id: params.id },
    });

    if (!fornecedor) {
      return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ fornecedor });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao buscar fornecedor' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const {
      razaoSocial,
      nomeFantasia,
      email,
      telefone,
      endereco,
      nomeRepresentanteLegal,
      cpfRepresentanteLegal,
      telefoneRepresentanteLegal,
      emailRepresentanteLegal,
      nomePreposto,
      telefonePreposto,
      emailPreposto,
    } = body;

    const atualizado = await prisma.fornecedor.update({
      where: { id: params.id },
      data: {
        ...(razaoSocial && { razaoSocial }),
        ...(nomeFantasia !== undefined && { nomeFantasia }),
        ...(email && { email }),
        ...(telefone !== undefined && { telefone }),
        ...(endereco !== undefined && { endereco }),
        ...(nomeRepresentanteLegal !== undefined && { nomeRepresentanteLegal }),
        ...(cpfRepresentanteLegal !== undefined && { cpfRepresentanteLegal }),
        ...(telefoneRepresentanteLegal !== undefined && { telefoneRepresentanteLegal }),
        ...(emailRepresentanteLegal !== undefined && { emailRepresentanteLegal }),
        ...(nomePreposto !== undefined && { nomePreposto }),
        ...(telefonePreposto !== undefined && { telefonePreposto }),
        ...(emailPreposto !== undefined && { emailPreposto }),
      },
    });

    return NextResponse.json({ success: true, fornecedor: atualizado });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao atualizar fornecedor' }, { status: 500 });
  }
}
