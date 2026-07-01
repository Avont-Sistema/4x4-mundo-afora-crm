import { NextRequest, NextResponse } from 'next/server';
import {
  getBroadcast,
  getBroadcastRecipients,
  markBroadcastRecipientSent,
  markBroadcastRecipientFailed,
  updateBroadcast,
} from '@/lib/broadcastStore';
import { botFetch } from '@/lib/botProxy';

// Called by the frontend every ~15s while a broadcast is running.
// Sends up to BATCH_SIZE due recipients via the bot proxy, then returns stats.
const BATCH_SIZE = 5;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const broadcast = await getBroadcast(id);
  if (!broadcast) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  if (broadcast.status !== 'running') {
    return NextResponse.json({ ok: true, sent: 0, done: broadcast.status !== 'draft' });
  }

  const now = new Date().toISOString();
  const allRecipients = await getBroadcastRecipients(id);

  const due = allRecipients
    .filter((r) => r.status === 'pending' && r.scheduledAt <= now)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .slice(0, BATCH_SIZE);

  if (due.length === 0) {
    const stillPending = allRecipients.some((r) => r.status === 'pending');
    if (!stillPending) {
      await updateBroadcast(id, { status: 'completed', completedAt: new Date().toISOString() });
      return NextResponse.json({ ok: true, sent: 0, done: true });
    }
    return NextResponse.json({ ok: true, sent: 0, done: false });
  }

  let sent = 0;
  for (const recipient of due) {
    const jid = recipient.phone.includes('@')
      ? recipient.phone
      : `${recipient.phone}@s.whatsapp.net`;

    try {
      const body: Record<string, string> = { phone: jid, text: broadcast.message
        .replace(/\{nome\}/g, recipient.name ?? '')
        .replace(/\{telefone\}/g, recipient.phone)
      };

      if (broadcast.mediaUrl) {
        body.mediaUrl = broadcast.mediaUrl;
        body.mediaType = broadcast.mediaType ?? 'image';
      }

      const res = await botFetch('/api/send', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await markBroadcastRecipientSent(recipient.id, id);
        sent++;
      } else {
        const err = await res.json().catch(() => ({}));
        await markBroadcastRecipientFailed(recipient.id, id, err.error ?? `HTTP ${res.status}`);
      }
    } catch (e) {
      await markBroadcastRecipientFailed(recipient.id, id, (e as Error).message);
    }
  }

  // Check if fully complete after this batch
  const remaining = allRecipients.filter((r) => r.status === 'pending').length - due.length;
  const done = remaining <= 0 && due.every((r) => {
    const updated = allRecipients.find((x) => x.id === r.id);
    return !updated || updated.status !== 'pending';
  });

  return NextResponse.json({ ok: true, sent, done });
}
