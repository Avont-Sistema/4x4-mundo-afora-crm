import { NextRequest, NextResponse } from 'next/server';
import { startBroadcast, getBroadcast, getBroadcastRecipients, updateBroadcast } from '@/lib/broadcastStore';
import { botFetch } from '@/lib/botProxy';

// CRM's own public URL — needed so the bot can call back /api/broadcasts/[id]/callback
const CRM_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXTAUTH_URL ??
  'https://4x4-mundo-afora-crm-iota.vercel.app';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const broadcast = await getBroadcast(id);
    if (!broadcast) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    if (broadcast.status === 'running') return NextResponse.json({ error: 'Já em execução' }, { status: 400 });
    if (broadcast.status === 'completed') return NextResponse.json({ error: 'Já concluído' }, { status: 400 });

    let resolvedRecipients: { phone: string; name?: string }[] | undefined;

    if (broadcast.recipientSource === 'all_leads') {
      const { kvLoad } = await import('@/lib/kvStore');
      const leads = (await kvLoad<{ name?: string; phone?: string; whatsapp?: string }[]>('leads')) ?? [];
      resolvedRecipients = leads
        .map((l) => ({ phone: l.whatsapp || l.phone || '', name: l.name }))
        .filter((r) => r.phone.length > 0);
    } else if (broadcast.recipientSource === 'all_clients') {
      const { kvLoad } = await import('@/lib/kvStore');
      const clients = (await kvLoad<{ name?: string; phone?: string; whatsapp?: string }[]>('clients')) ?? [];
      resolvedRecipients = clients
        .map((c) => ({ phone: c.whatsapp || c.phone || '', name: c.name }))
        .filter((r) => r.phone.length > 0);
    }

    // Create recipient records (invalid phones — LIDs, typos — are recorded as failed)
    const { count, invalid } = await startBroadcast(id, resolvedRecipients);

    // Attempt push-based delivery via bot's /api/broadcast/send endpoint.
    // Bot sends messages autonomously and calls back /callback per recipient.
    try {
      const recipients = (await getBroadcastRecipients(id)).filter((r) => r.status === 'pending');
      const callbackUrl = `${CRM_URL}/api/broadcasts/${id}/callback`;

      const res = await botFetch('/api/broadcast/send', {
        method: 'POST',
        body: JSON.stringify({
          broadcastId: id,
          message: broadcast.message,
          mediaUrl: broadcast.mediaUrl,
          mediaType: broadcast.mediaType,
          intervalMs: (broadcast.intervalSec ?? 10) * 1000,
          callbackUrl,
          callbackSecret: process.env.BOT_SECRET || '4x4bot2025',
          recipients: recipients.map((r) => ({
            id: r.id,
            phone: r.phone.includes('@') ? r.phone : `${r.phone}@s.whatsapp.net`,
            name: r.name,
          })),
        }),
      });

      if (res.ok) {
        // Marca o modo para desativar os caminhos de poll (senão a mensagem sai duplicada)
        await updateBroadcast(id, { mode: 'push' });
        return NextResponse.json({ ok: true, count, invalid, mode: 'push' });
      }
      // Bot returned non-ok — fall through to poll mode
      console.warn('[broadcast:start] bot /api/broadcast/send retornou', res.status, '— usando poll');
    } catch (e) {
      // Bot doesn't have the endpoint yet or is unreachable — poll mode fallback
      console.warn('[broadcast:start] bot sem endpoint broadcast, usando poll:', (e as Error).message);
    }

    // Fallback: o próprio bot busca as mensagens em /api/whatsapp/pending-messages a cada 30s
    await updateBroadcast(id, { mode: 'poll' });
    return NextResponse.json({ ok: true, count, invalid, mode: 'poll' });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
