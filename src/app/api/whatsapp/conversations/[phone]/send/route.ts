import { NextRequest, NextResponse } from 'next/server';
import { botFetch } from '@/lib/botProxy';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const { phone } = await params;
  const { text } = await request.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: 'text obrigatório' }, { status: 400 });
  }
  try {
    const res = await botFetch('/api/send', {
      method: 'POST',
      body: JSON.stringify({ phone, text }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.error || 'Falha ao enviar' }, { status: res.status });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Bot offline' }, { status: 503 });
  }
}
