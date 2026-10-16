import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma';
import { createSessionToken } from '@/lib/auth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'sgc_uern_token';

const SECRET_KEYS: Uint8Array[] = [
  process.env.PROAD_SSO_SECRET,
  process.env.JWT_SECRET,
  'uern_portal_proad_sso_master_key_2026_super_seguro',
  'uern_contratos_secret_key_proad_2026_default',
]
  .filter((k): k is string => Boolean(k && k.trim()))
  .map((k) => new TextEncoder().encode(k.trim()));

async function verificarTokenComFallback(token: string) {
  let ultimoErro: any = null;
  for (const secretKey of SECRET_KEYS) {
    try {
      const { payload } = await jwtVerify(token, secretKey);
      return payload;
    } catch (err) {
      ultimoErro = err;
    }
  }
  throw ultimoErro || new Error('Falha ao verificar assinatura JWT do token SSO.');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/login?error=token_ausente', request.url));
    }

    // 1. Valida assinatura do token emitido pelo Portal PROAD com fallback
    const payload = await verificarTokenComFallback(token);
    const { email, nome, matricula, role, targetSystem } = payload as {
      userId?: string;
      email: string;
      nome: string;
      matricula?: string;
      role?: string;
      targetSystem: string;
    };

    if (targetSystem !== 'SGC' || !email) {
      return NextResponse.redirect(new URL('/login?error=token_invalido_destino', request.url));
    }

    // 2. Mapeia role do Portal para o enum Role do SGC
    let sgcRole: Role = Role.FISCAL_TECNICO;
    const roleUpper = (role || '').toUpperCase();
    const emailLimpo = email.toLowerCase().trim();

    if (
      roleUpper === 'ADMIN_PROAD' ||
      roleUpper === 'ADMIN' ||
      emailLimpo === 'adj.proad@uern.br' ||
      emailLimpo === 'pedroreboucas@uern.br'
    ) {
      sgcRole = Role.ADMIN_PROAD;
    } else if (roleUpper === 'GESTOR') {
      sgcRole = Role.GESTOR;
    } else if (roleUpper === 'FISCAL_ADM' || roleUpper === 'FISCAL_ADMINISTRATIVO') {
      sgcRole = Role.FISCAL_ADMINISTRATIVO;
    } else if (roleUpper === 'FISCAL_SETORIAL') {
      sgcRole = Role.FISCAL_SETORIAL;
    } else if (roleUpper === 'GESTOR_ATA') {
      sgcRole = Role.GESTOR_ATA;
    } else if (roleUpper === 'SUPLENTE') {
      sgcRole = Role.SUPLENTE;
    } else if (roleUpper === 'FORNECEDOR') {
      sgcRole = Role.FORNECEDOR;
    } else if (roleUpper === 'FISCAL_TECNICO') {
      sgcRole = Role.FISCAL_TECNICO;
    }

    // 3. Localiza ou sincroniza usuário no banco do SGC (por e-mail ou matrícula para evitar duplicidade)
    let usuarioSgc = await prisma.user.findUnique({
      where: { email: emailLimpo },
    });

    if (!usuarioSgc && matricula) {
      const matDigits = matricula.replace(/\D/g, '');
      const matSemZeros = matDigits.length >= 2
        ? `${matDigits.slice(0, -1).replace(/^0+/, '') || '0'}-${matDigits.slice(-1)}`
        : matricula;
      usuarioSgc = await prisma.user.findFirst({
        where: {
          OR: [
            { matricula },
            { matricula: matSemZeros },
            { matricula: matDigits },
          ],
        },
      });
    }

    if (!usuarioSgc) {
      usuarioSgc = await prisma.user.create({
        data: {
          nome: nome || emailLimpo.split('@')[0],
          email: emailLimpo,
          matricula: matricula || null,
          senhaHash: 'SSO_CENTRAL_UERN_AUTHENTICATED',
          role: sgcRole,
          deveTrocarSenha: false,
          ativo: true,
        },
      });
    } else {
      // Atualiza role, e-mail e matrícula no registro existente preservando todos os vínculos de contratos
      usuarioSgc = await prisma.user.update({
        where: { id: usuarioSgc.id },
        data: {
          nome: nome || usuarioSgc.nome,
          email: emailLimpo,
          matricula: matricula || usuarioSgc.matricula,
          role: sgcRole,
          ativo: true,
        },
      });
    }

    // 4. Cria sessão interna do SGC
    const sessionToken = await createSessionToken({
      id: usuarioSgc.id,
      nome: usuarioSgc.nome,
      email: usuarioSgc.email,
      matricula: usuarioSgc.matricula,
      role: usuarioSgc.role,
      deveTrocarSenha: false,
    });

    const isTreino = searchParams.get('treinamento') === '1';
    const redirectTarget = isTreino ? '/contratos?treinamento=1' : '/contratos';
    const response = NextResponse.redirect(new URL(redirectTarget, request.url));
    response.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (err: any) {
    console.error('Erro no callback SSO do SGC:', err);
    return NextResponse.redirect(new URL('/login?error=falha_sso', request.url));
  }
}
