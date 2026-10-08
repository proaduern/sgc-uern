import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'uern_contratos_secret_key_proad_2026_default';
const SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
const COOKIE_NAME = 'sgc_uern_token';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas que não requerem autenticação
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/sso-callback') ||
    pathname.startsWith('/api/integracao/') ||
    pathname.startsWith('/api/chat') ||
    pathname.startsWith('/api/modelos-planilhas') ||
    pathname.startsWith('/docs/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/login'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  try {
    const { payload } = await jwtVerify(token, SECRET);
    const user = payload as { id: string; role: string; deveTrocarSenha: boolean };

    // Se o usuário precisa trocar a senha e ainda não está na tela de troca
    if (user.deveTrocarSenha && pathname !== '/trocar-senha' && !pathname.startsWith('/api/auth')) {
      if (pathname.startsWith('/api/')) {
        // Permitir chamadas de API necessárias
        return NextResponse.next();
      }
      const url = request.nextUrl.clone();
      url.pathname = '/trocar-senha';
      return NextResponse.redirect(url);
    }

    // Se já está na tela de troca mas não precisa mais trocar
    if (!user.deveTrocarSenha && pathname === '/trocar-senha') {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    // Se usuário autenticado tentar acessar login
    if (pathname === '/login') {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  } catch (err) {
    // Token inválido ou expirado
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Sessão inválida ou expirada' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const response = NextResponse.redirect(url);
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth/login
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
