import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, createSessionToken, setSessionCookie } from '@/lib/auth';
import {
  getClientIp,
  verificarBloqueioLogin,
  registrarFalhaLogin,
  limparTentativasLogin,
} from '@/lib/rate-limit';

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
    const ip = getClientIp(request);

    const bloqueio = await verificarBloqueioLogin(normalizedEmail, ip);
    if (bloqueio.bloqueado) {
      return NextResponse.json(
        { error: `Muitas tentativas falhas. Aguarde ${bloqueio.minutosRestantes} minuto(s) antes de tentar novamente.` },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.ativo) {
      const resFalha = await registrarFalhaLogin(normalizedEmail, ip);
      return NextResponse.json(
        {
          error: resFalha.bloqueadoAgora
            ? `Acesso bloqueado por ${resFalha.minutosBloqueio} minutos após 5 tentativas inválidas.`
            : `Credenciais inválidas ou usuário inativo. (${resFalha.tentativasRestantes} tentativa(s) restante(s)).`,
        },
        { status: resFalha.bloqueadoAgora ? 429 : 401 }
      );
    }

    const isValid = await verifyPassword(senha, user.senhaHash);
    if (!isValid) {
      const resFalha = await registrarFalhaLogin(normalizedEmail, ip);
      return NextResponse.json(
        {
          error: resFalha.bloqueadoAgora
            ? `Acesso bloqueado por ${resFalha.minutosBloqueio} minutos após 5 tentativas inválidas.`
            : `Credenciais inválidas. (${resFalha.tentativasRestantes} tentativa(s) restante(s)).`,
        },
        { status: resFalha.bloqueadoAgora ? 429 : 401 }
      );
    }

    await limparTentativasLogin(normalizedEmail, ip);

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
