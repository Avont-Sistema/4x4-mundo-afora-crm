import { NextRequest, NextResponse } from 'next/server';
import { botFetch } from '@/lib/botProxy';

export async function GET() {
  try {
    const res = await botFetch('/api/meta-chat');
    if (!res.ok) return NextResponse.json({ history: [], operatorNotes: '' });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ history: [], operatorNotes: '', offline: true });
  }
}

export async function POST(request: NextRequest) {
  const { message } = await request.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: 'message obrigatório' }, { status: 400 });
  }
  try {
    const res = await botFetch('/api/meta-chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Bot offline' }, { status: 503 });
  }
}

export async function DELETE() {
  try {
    await botFetch('/api/meta-chat', { method: 'DELETE' });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Bot offline' }, { status: 503 });
  }
}
