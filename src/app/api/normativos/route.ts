import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const normativos = await prisma.normativo.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        criadoPor: {
          select: { nome: true, email: true },
        },
      },
    });

    return NextResponse.json({ normativos });
  } catch (error: any) {
    console.error('Erro ao buscar normativos:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar lista de normativos.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN_PROAD' && session.role !== 'ADMIN_PARCIAL')) {
      return NextResponse.json(
        { error: 'Apenas administradores podem cadastrar normativos.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { titulo, tipo, numero, ano, orgaoEmissor, descricao, arquivoUrl } = body;

    if (!titulo || !tipo || !arquivoUrl) {
      return NextResponse.json(
        { error: 'Título, tipo e URL do arquivo são obrigatórios.' },
        { status: 400 }
      );
    }

    const novo = await prisma.normativo.create({
      data: {
        titulo,
        tipo,
        numero,
        ano: ano ? parseInt(ano) : null,
        orgaoEmissor: orgaoEmissor || 'PROAD/UERN',
        descricao,
        arquivoUrl,
        criadoPorId: session.id,
      },
    });

    return NextResponse.json({ success: true, normativo: novo }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar normativo:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar o normativo no banco de dados.' },
      { status: 500 }
    );
  }
}
