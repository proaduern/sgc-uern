import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isAdminRole, canManageTerceirizacao } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const trabalhadorId = searchParams.get('trabalhadorId');

    if (!trabalhadorId) {
      return NextResponse.json({ error: 'trabalhadorId é obrigatório' }, { status: 400 });
    }

    const documentos = await prisma.documentoTrabalhador.findMany({
      where: { trabalhadorId },
      orderBy: { enviadoEm: 'desc' },
    });

    return NextResponse.json({ documentos });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao buscar documentos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (!isAdminRole(session.role) && !canManageTerceirizacao(session.role)) {
      return NextResponse.json({ error: 'Permissão insuficiente.' }, { status: 403 });
    }

    const body = await request.json();
    const { trabalhadorId, tipoDocumento, nomeArquivo, arquivoUrl, observacoes, statusConferencia } = body;

    if (!trabalhadorId || !tipoDocumento || !nomeArquivo) {
      return NextResponse.json({ error: 'trabalhadorId, tipoDocumento e nomeArquivo são obrigatórios.' }, { status: 400 });
    }

    const documento = await prisma.documentoTrabalhador.create({
      data: {
        trabalhadorId,
        tipoDocumento,
        nomeArquivo,
        arquivoUrl: arquivoUrl || 'https://storage.uern.br/documentos/' + encodeURIComponent(nomeArquivo),
        statusConferencia: statusConferencia || 'PENDENTE',
        observacoes: observacoes || null,
      },
    });

    return NextResponse.json({ success: true, documento }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao registrar documento' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const { id, statusConferencia, observacoes } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do documento é obrigatório.' }, { status: 400 });
    }

    const atualizado = await prisma.documentoTrabalhador.update({
      where: { id },
      data: {
        ...(statusConferencia ? { statusConferencia } : {}),
        ...(observacoes !== undefined ? { observacoes } : {}),
      },
    });

    return NextResponse.json({ success: true, documento: atualizado });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao atualizar documento' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do documento é obrigatório.' }, { status: 400 });
    }

    await prisma.documentoTrabalhador.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao excluir documento' }, { status: 500 });
  }
}
