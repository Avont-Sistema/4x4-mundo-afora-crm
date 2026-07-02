import { NextRequest, NextResponse } from 'next/server';
import { isBotAuthed } from '@/lib/botAuth';
import { getPendingMessages, markMessageSent, markMessageFailed, completeRunIfDone } from '@/lib/flowsStore';
import {
  getPendingBroadcastMessages,
  markBroadcastRecipientSent,
  markBroadcastRecipientFailed,
} from '@/lib/broadcastStore';

export async function GET(req: NextRequest) {
  if (!isBotAuthed(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  // Carona no poll do bot (30s): checa follow-ups "sem resposta" (throttle interno de 10min)
  try {
    const { checkNoResponseFollowups } = await import('@/lib/followups');
    await checkNoResponseFollowups();
  } catch (e) {
    console.error('[followup] erro na checagem:', (e as Error).message);
  }

  const [flowMessages, broadcastMessages] = await Promise.all([
    getPendingMessages(),
    getPendingBroadcastMessages(),
  ]);

  return NextResponse.json({ messages: [...flowMessages, ...broadcastMessages] });
}

export async function POST(req: NextRequest) {
  if (!isBotAuthed(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id, success, error, runId } = await req.json();

  // Broadcast recipient: id format is "br:<recipientId>:<broadcastId>"
  if (typeof id === 'string' && id.startsWith('br:')) {
    const parts = id.split(':');
    const recipientId = parts[1];
    const broadcastId = parts[2];
    if (success) {
      await markBroadcastRecipientSent(recipientId, broadcastId);
    } else {
      await markBroadcastRecipientFailed(recipientId, broadcastId, error || 'Erro desconhecido');
    }
    return NextResponse.json({ ok: true });
  }

  // Flow message
  if (success) {
    await markMessageSent(id);
  } else {
    await markMessageFailed(id, error || 'Erro desconhecido');
  }
  if (runId) await completeRunIfDone(runId);

  return NextResponse.json({ ok: true });
}
