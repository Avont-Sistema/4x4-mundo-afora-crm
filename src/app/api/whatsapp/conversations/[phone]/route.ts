import { NextRequest, NextResponse } from 'next/server';
import { botFetch } from '@/lib/botProxy';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const { phone } = await params;
  try {
    const res = await botFetch(`/api/history/${encodeURIComponent(phone)}`);
    if (!res.ok) return NextResponse.json({ messages: [] });
    const data = await res.json();
    return NextResponse.json({ messages: data.history || [] });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const { phone } = await params;
  const body = await request.json();
  try {
    await botFetch('/api/bot-toggle', {
      method: 'POST',
      body: JSON.stringify({ phone, bot_active: body.bot_active }),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Bot offline' }, { status: 503 });
  }
}
