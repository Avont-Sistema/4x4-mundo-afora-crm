import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PASSWORD = process.env.APP_PASSWORD || '4x4mundoafora';
const OPERATOR_PASSWORD = process.env.OPERATOR_PASSWORD || '4x4operador';

export async function POST(request: NextRequest) {
  let password = '';
  try {
    const body = await request.json();
    password = String(body?.password ?? '');
  } catch {
    return NextResponse.json({ ok: false, error: 'Requisição inválida' }, { status: 400 });
  }

  let role: 'admin' | 'operator' | null = null;
  if (password === ADMIN_PASSWORD) role = 'admin';
  else if (password === OPERATOR_PASSWORD) role = 'operator';

  if (!role) {
    return NextResponse.json({ ok: false, error: 'Senha incorreta' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, role });
  res.cookies.set('app_auth', role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  });
  return res;
}
