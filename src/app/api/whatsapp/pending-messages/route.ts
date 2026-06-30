import { NextRequest, NextResponse } from 'next/server';
import { isBotAuthed } from '@/lib/botAuth';
import { getPendingMessages, markMessageSent, markMessageFailed, completeRunIfDone } from '@/lib/flowsStore';

export async function GET(req: NextRequest) {
  if (!isBotAuthed(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const messages = await getPendingMessages();
  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  if (!isBotAuthed(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id, success, error, runId } = await req.json();
  if (success) {
    await markMessageSent(id);
  } else {
    await markMessageFailed(id, error || 'Erro desconhecido');
  }
  if (runId) await completeRunIfDone(runId);
  return NextResponse.json({ ok: true });
}
