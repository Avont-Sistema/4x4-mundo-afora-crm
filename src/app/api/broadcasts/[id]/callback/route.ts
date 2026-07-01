import { NextRequest, NextResponse } from 'next/server';
import {
  getBroadcast,
  updateBroadcast,
  markBroadcastRecipientSent,
  markBroadcastRecipientFailed,
} from '@/lib/broadcastStore';

const BOT_SECRET = process.env.BOT_SECRET;

// Called by the 4x4-bot after each recipient is sent (push-based broadcast).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (BOT_SECRET) {
    const secret = req.headers.get('x-bot-secret');
    if (secret !== BOT_SECRET) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  // Final completion signal from bot
  if (body.done) {
    const broadcast = await getBroadcast(id);
    if (broadcast?.status === 'running') {
      await updateBroadcast(id, { status: 'completed', completedAt: new Date().toISOString() });
    }
    return NextResponse.json({ ok: true, done: true });
  }

  // Per-recipient status update
  const { recipientId, success, error } = body as {
    recipientId?: string;
    success?: boolean;
    error?: string;
  };

  if (!recipientId) {
    return NextResponse.json({ error: 'recipientId obrigatório' }, { status: 400 });
  }

  if (success) {
    await markBroadcastRecipientSent(recipientId, id);
  } else {
    await markBroadcastRecipientFailed(recipientId, id, error ?? 'Falha no envio');
  }

  return NextResponse.json({ ok: true });
}
