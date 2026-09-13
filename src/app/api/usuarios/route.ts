import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN_PROAD' && session.role !== 'ADMIN_PARCIAL')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    const usuarios = await prisma.user.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        matricula: true,
        role: true,
        deveTrocarSenha: true,
        ativo: true,
        createdAt: true,
      },
      orderBy: { nome: 'asc' },
    });

    return NextResponse.json({ usuarios });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao listar usuários' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN_PROAD') {
      return NextResponse.json({ error: 'Apenas o Administrador PROAD pode criar novos administradores e usuários.' }, { status: 403 });
    }

    const body = await request.json();
    const { nome, email, matricula, role } = body;

    if (!nome || !email || !role) {
      return NextResponse.json({ error: 'Nome, E-mail e Função são obrigatórios.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return NextResponse.json({ error: 'Usuário com este e-mail já cadastrado.' }, { status: 409 });
    }

    const defaultSenhaHash = await hashPassword('123');

    const novo = await prisma.user.create({
      data: {
        nome,
        email: cleanEmail,
        matricula: matricula || null,
        senhaHash: defaultSenhaHash,
        role,
        deveTrocarSenha: true,
        ativo: true,
      },
    });

    return NextResponse.json({ success: true, usuario: novo }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error);
    return NextResponse.json({ error: error.message || 'Erro ao criar usuário' }, { status: 500 });
  }
}
