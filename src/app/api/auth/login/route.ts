import { NextRequest, NextResponse } from 'next/server';

// Senha de acesso. Defina APP_PASSWORD nas variáveis de ambiente (Vercel).
// O valor abaixo é só um padrão temporário caso a env não esteja setada.
const PASSWORD = process.env.APP_PASSWORD || '4x4mundoafora';

export async function POST(request: NextRequest) {
  let password = '';
  try {
    const body = await request.json();
    password = String(body?.password ?? '');
  } catch {
    return NextResponse.json({ ok: false, error: 'Requisição inválida' }, { status: 400 });
  }

  if (password !== PASSWORD) {
    return NextResponse.json({ ok: false, error: 'Senha incorreta' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('app_auth', 'ok', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  });
  return res;
}
