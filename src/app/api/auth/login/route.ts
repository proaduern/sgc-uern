import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, createSessionToken, setSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, senha } = body;

    if (!email || !senha) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.ativo) {
      return NextResponse.json(
        { error: 'Credenciais inválidas ou usuário inativo.' },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(senha, user.senhaHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Credenciais inválidas.' },
        { status: 401 }
      );
    }

    const sessionPayload = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      matricula: user.matricula,
      role: user.role,
      deveTrocarSenha: user.deveTrocarSenha,
    };

    const token = await createSessionToken(sessionPayload);
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: sessionPayload,
      redirect: user.deveTrocarSenha ? '/trocar-senha' : '/',
    });
  } catch (error: any) {
    console.error('Erro na autenticação:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro no servidor ao processar a autenticação.' },
      { status: 500 }
    );
  }
}
