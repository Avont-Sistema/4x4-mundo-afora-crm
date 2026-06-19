import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get('app_auth')?.value ?? '';
  const role = cookie === 'operator' ? 'operator' : 'admin';
  return NextResponse.json({ role });
}
