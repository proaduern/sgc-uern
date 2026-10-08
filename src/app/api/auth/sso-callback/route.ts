import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma';
import { createSessionToken, setSessionCookie } from '@/lib/auth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

const PROAD_SSO_SECRET = new TextEncoder().encode(
  process.env.PROAD_SSO_SECRET || 'uern_portal_proad_sso_master_key_2026_super_seguro'
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/login?error=token_ausente', request.url));
    }

    // 1. Valida assinatura do token emitido pelo Portal PROAD
    const { payload } = await jwtVerify(token, PROAD_SSO_SECRET);
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

    if (roleUpper === 'ADMIN_PROAD' || roleUpper === 'ADMIN') {
      sgcRole = Role.ADMIN_PROAD;
    } else if (roleUpper === 'GESTOR') {
      sgcRole = Role.GESTOR;
    } else if (roleUpper === 'FISCAL_ADM' || roleUpper === 'FISCAL_ADMINISTRATIVO') {
      sgcRole = Role.FISCAL_ADMINISTRATIVO;
    } else if (roleUpper === 'FISCAL_SETORIAL') {
      sgcRole = Role.FISCAL_SETORIAL;
    } else if (roleUpper === 'GESTOR_ATA') {
      sgcRole = Role.GESTOR_ATA;
    } else if (roleUpper === 'FORNECEDOR') {
      sgcRole = Role.FORNECEDOR;
    } else if (roleUpper === 'FISCAL_TECNICO') {
      sgcRole = Role.FISCAL_TECNICO;
    }

    // 3. Localiza ou sincroniza usuário no banco do SGC
    let usuarioSgc = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!usuarioSgc) {
      usuarioSgc = await prisma.user.create({
        data: {
          nome: nome || email.split('@')[0],
          email: email.toLowerCase(),
          matricula: matricula || null,
          senhaHash: 'SSO_CENTRAL_UERN_AUTHENTICATED',
          role: sgcRole,
          deveTrocarSenha: false,
          ativo: true,
        },
      });
    } else {
      // Atualiza role e matrícula se alteradas no portal central
      usuarioSgc = await prisma.user.update({
        where: { id: usuarioSgc.id },
        data: {
          nome: nome || usuarioSgc.nome,
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

    // 5. Configura cookie de sessão do SGC e redireciona para a tela de contratos
    await setSessionCookie(sessionToken);

    return NextResponse.redirect(new URL('/contratos', request.url));
  } catch (err: any) {
    console.error('Erro no callback SSO do SGC:', err);
    return NextResponse.redirect(new URL('/login?error=falha_sso', request.url));
  }
}
