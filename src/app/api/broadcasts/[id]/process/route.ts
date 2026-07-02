import { NextRequest, NextResponse } from 'next/server';
import { getBroadcast, getBroadcastRecipients, updateBroadcast } from '@/lib/broadcastStore';

// Chamada pelo frontend enquanto um disparo está "running".
//
// IMPORTANTE: esta rota NÃO envia mais mensagens. O envio é feito exclusivamente
// pelo bot — via push (/api/broadcast/send + callback) ou via poll do próprio bot
// (/api/whatsapp/pending-messages a cada 30s). Antes, esta rota também enviava via
// /api/send em paralelo, o que gerava mensagens duplicadas e envios sem validação
// de número. Agora ela só confirma a conclusão e devolve o progresso.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const broadcast = await getBroadcast(id);
  if (!broadcast) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  if (broadcast.status !== 'running') {
    return NextResponse.json({ ok: true, sent: 0, done: broadcast.status !== 'draft' });
  }

  const recipients = await getBroadcastRecipients(id);
  const pending = recipients.filter((r) => r.status === 'pending').length;

  if (pending === 0) {
    await updateBroadcast(id, { status: 'completed', completedAt: new Date().toISOString() });
    return NextResponse.json({ ok: true, sent: 0, done: true });
  }

  return NextResponse.json({ ok: true, sent: 0, done: false, pending, mode: broadcast.mode ?? 'poll' });
}
