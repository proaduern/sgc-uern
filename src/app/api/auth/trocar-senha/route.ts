import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession, hashPassword, createSessionToken, setSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const body = await request.json();
    const { novaSenha, confirmacaoSenha } = body;

    if (!novaSenha || novaSenha.length < 6) {
      return NextResponse.json(
        { error: 'A nova senha deve ter no mínimo 6 caracteres.' },
        { status: 400 }
      );
    }

    if (novaSenha !== confirmacaoSenha) {
      return NextResponse.json(
        { error: 'A confirmação de senha não confere.' },
        { status: 400 }
      );
    }

    if (novaSenha === '123') {
      return NextResponse.json(
        { error: 'A nova senha não pode ser a senha padrão provisória (123).' },
        { status: 400 }
      );
    }

    const novoHash = await hashPassword(novaSenha);

    const updatedUser = await prisma.user.update({
      where: { id: session.id },
      data: {
        senhaHash: novoHash,
        deveTrocarSenha: false,
      },
    });

    // Atualiza a sessão com deveTrocarSenha = false
    const newSession = {
      id: updatedUser.id,
      nome: updatedUser.nome,
      email: updatedUser.email,
      matricula: updatedUser.matricula,
      role: updatedUser.role,
      deveTrocarSenha: false,
    };

    const token = await createSessionToken(newSession);
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      message: 'Senha alterada com sucesso!',
      redirect: '/',
    });
  } catch (error: any) {
    console.error('Erro na alteração de senha:', error);
    return NextResponse.json(
      { error: 'Erro interno ao atualizar a senha.' },
      { status: 500 }
    );
  }
}
