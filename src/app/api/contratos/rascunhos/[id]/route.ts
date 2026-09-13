import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    const rascunho = await prisma.contratoRascunho.findFirst({
      where: { id, usuarioId: session.id },
    });

    if (!rascunho) {
      return NextResponse.json({ error: 'Rascunho não encontrado' }, { status: 404 });
    }

    return NextResponse.json(rascunho);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.contratoRascunho.findFirst({
      where: { id, usuarioId: session.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Rascunho não encontrado ou não autorizado' }, { status: 404 });
    }

    await prisma.contratoRascunho.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Rascunho removido com sucesso' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
