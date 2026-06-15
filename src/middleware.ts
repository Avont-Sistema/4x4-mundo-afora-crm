import { NextRequest, NextResponse } from 'next/server';

// Gate de acesso: tudo em "/" e "/dashboard/*" exige o cookie de sessão.
// O cookie só é setado pela rota /api/auth/login depois da senha correta.
const COOKIE = 'app_auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = request.cookies.get(COOKIE)?.value === 'ok';

  // Raiz: manda pro dashboard se logado, senão pro login.
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = authed ? '/dashboard' : '/login';
    return NextResponse.redirect(url);
  }

  // Área protegida: sem sessão -> login.
  if (!authed) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
};
