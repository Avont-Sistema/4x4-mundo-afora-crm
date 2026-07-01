import { kvLoad, kvSave } from './kvStore';

export type BroadcastStatus = 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
export type RecipientStatus = 'pending' | 'sent' | 'failed' | 'skipped';
export type RecipientSource = 'all_leads' | 'all_clients' | 'custom';

export interface Broadcast {
  id: string;
  name: string;
  message: string;
  mediaUrl?: string;
  mediaType?: string;
  status: BroadcastStatus;
  recipientSource: RecipientSource;
  customPhones?: string[]; // stored phones for custom source
  intervalSec: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BroadcastRecipient {
  id: string;
  broadcastId: string;
  phone: string;
  name?: string;
  status: RecipientStatus;
  scheduledAt: string;
  sentAt?: string;
  error?: string;
  createdAt: string;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

async function loadBroadcasts(): Promise<Broadcast[]> {
  return (await kvLoad<Broadcast[]>('broadcasts')) ?? [];
}

async function saveBroadcasts(list: Broadcast[]) {
  await kvSave('broadcasts', list);
}

async function loadRecipients(broadcastId: string): Promise<BroadcastRecipient[]> {
  return (await kvLoad<BroadcastRecipient[]>(`broadcast_recipients_${broadcastId}`)) ?? [];
}

async function saveRecipients(broadcastId: string, list: BroadcastRecipient[]) {
  await kvSave(`broadcast_recipients_${broadcastId}`, list);
}

export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  return '55' + digits;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function listBroadcasts(): Promise<Broadcast[]> {
  const list = await loadBroadcasts();
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getBroadcast(id: string): Promise<Broadcast | null> {
  const list = await loadBroadcasts();
  return list.find((b) => b.id === id) ?? null;
}

export async function createBroadcast(data: {
  name: string;
  message: string;
  mediaUrl?: string;
  mediaType?: string;
  recipientSource: RecipientSource;
  customPhones?: string[];
  intervalSec?: number;
  scheduledAt?: string;
}): Promise<Broadcast> {
  const list = await loadBroadcasts();
  const now = new Date().toISOString();
  const broadcast: Broadcast = {
    id: uid(),
    name: data.name,
    message: data.message,
    mediaUrl: data.mediaUrl,
    mediaType: data.mediaType,
    status: 'draft',
    recipientSource: data.recipientSource,
    customPhones: data.customPhones,
    intervalSec: data.intervalSec ?? 10,
    scheduledAt: data.scheduledAt,
    createdAt: now,
    updatedAt: now,
  };
  await saveBroadcasts([...list, broadcast]);
  return broadcast;
}

export async function updateBroadcast(id: string, patch: Partial<Broadcast>): Promise<Broadcast> {
  const list = await loadBroadcasts();
  const idx = list.findIndex((b) => b.id === id);
  if (idx === -1) throw new Error('Disparo não encontrado');
  const updated = { ...list[idx], ...patch, id, updatedAt: new Date().toISOString() };
  list[idx] = updated;
  await saveBroadcasts(list);
  return updated;
}

export async function deleteBroadcast(id: string): Promise<void> {
  const list = await loadBroadcasts();
  await saveBroadcasts(list.filter((b) => b.id !== id));
  // Clean up recipients
  await kvSave(`broadcast_recipients_${id}`, []);
}

// ── Recipients ─────────────────────────────────────────────────────────────────

export async function getBroadcastRecipients(broadcastId: string): Promise<BroadcastRecipient[]> {
  return loadRecipients(broadcastId);
}

export async function getBroadcastStats(broadcastId: string) {
  const recs = await loadRecipients(broadcastId);
  return {
    total: recs.length,
    sent: recs.filter((r) => r.status === 'sent').length,
    failed: recs.filter((r) => r.status === 'failed').length,
    pending: recs.filter((r) => r.status === 'pending').length,
    skipped: recs.filter((r) => r.status === 'skipped').length,
  };
}

// ── Start ─────────────────────────────────────────────────────────────────────

export async function startBroadcast(
  id: string,
  resolvedRecipients?: { phone: string; name?: string }[]
): Promise<{ count: number }> {
  const broadcast = await getBroadcast(id);
  if (!broadcast) throw new Error('Disparo não encontrado');
  if (broadcast.status === 'running') throw new Error('Disparo já está em execução');
  if (broadcast.status === 'completed') throw new Error('Disparo já foi concluído');

  let rawRecipients: { phone: string; name?: string }[] = resolvedRecipients ?? [];

  // If custom, use stored phones
  if (broadcast.recipientSource === 'custom' && rawRecipients.length === 0) {
    rawRecipients = (broadcast.customPhones ?? []).map((p) => ({ phone: p }));
  }

  // Normalize and deduplicate phones
  const seen = new Set<string>();
  const recipients = rawRecipients
    .map((r) => ({ ...r, phone: normalizePhone(r.phone) }))
    .filter((r) => {
      if (r.phone.length < 10 || seen.has(r.phone)) return false;
      seen.add(r.phone);
      return true;
    });

  if (recipients.length === 0) throw new Error('Nenhum destinatário encontrado');

  // Delete pending recipients from previous runs
  const existing = await loadRecipients(id);
  const kept = existing.filter((r) => r.status !== 'pending');

  const startAt = broadcast.scheduledAt && new Date(broadcast.scheduledAt) > new Date()
    ? new Date(broadcast.scheduledAt)
    : new Date();

  const newRecipients: BroadcastRecipient[] = recipients.map((r, idx) => ({
    id: uid(),
    broadcastId: id,
    phone: r.phone,
    name: r.name,
    status: 'pending',
    scheduledAt: new Date(startAt.getTime() + idx * broadcast.intervalSec * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  }));

  await saveRecipients(id, [...kept, ...newRecipients]);
  await updateBroadcast(id, { status: 'running', startedAt: new Date().toISOString() });

  return { count: newRecipients.length };
}

// ── Pause / Resume / Cancel ───────────────────────────────────────────────────

export async function pauseBroadcast(id: string): Promise<void> {
  const b = await getBroadcast(id);
  if (!b) throw new Error('Disparo não encontrado');
  if (b.status !== 'running') throw new Error('Disparo não está em execução');
  await updateBroadcast(id, { status: 'paused' });
}

export async function resumeBroadcast(id: string): Promise<{ rescheduled: number }> {
  const b = await getBroadcast(id);
  if (!b) throw new Error('Disparo não encontrado');
  if (b.status !== 'paused') throw new Error('Disparo não está pausado');

  const recs = await loadRecipients(id);
  const now = new Date();
  let idx = 0;

  const updated = recs.map((r) => {
    if (r.status !== 'pending') return r;
    const scheduledAt = new Date(now.getTime() + idx * b.intervalSec * 1000).toISOString();
    idx++;
    return { ...r, scheduledAt };
  });

  await saveRecipients(id, updated);
  await updateBroadcast(id, { status: 'running' });
  return { rescheduled: idx };
}

export async function cancelBroadcast(id: string): Promise<void> {
  const b = await getBroadcast(id);
  if (!b) throw new Error('Disparo não encontrado');
  if (!['running', 'paused'].includes(b.status)) {
    throw new Error('Disparo não pode ser cancelado neste estado');
  }

  const recs = await loadRecipients(id);
  await saveRecipients(id, recs.map((r) =>
    r.status === 'pending' ? { ...r, status: 'skipped' as const } : r
  ));
  await updateBroadcast(id, { status: 'cancelled', completedAt: new Date().toISOString() });
}

// ── Bot queue ─────────────────────────────────────────────────────────────────

export async function getPendingBroadcastMessages() {
  const now = new Date().toISOString();
  const broadcasts = await loadBroadcasts();
  const runningIds = broadcasts.filter((b) => b.status === 'running').map((b) => b.id);
  if (runningIds.length === 0) return [];

  const results: Array<Record<string, unknown>> = [];

  for (const broadcastId of runningIds) {
    const broadcast = broadcasts.find((b) => b.id === broadcastId)!;
    const recs = await loadRecipients(broadcastId);
    const due = recs
      .filter((r) => r.status === 'pending' && r.scheduledAt <= now)
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
      .slice(0, 5);

    for (const r of due) {
      const vars: Record<string, string> = { nome: r.name ?? '', telefone: r.phone };
      // Bot expects WhatsApp JID format: 5511999...@s.whatsapp.net
      const jid = r.phone.includes('@') ? r.phone : `${r.phone}@s.whatsapp.net`;
      results.push({
        // Flow-compatible format so the bot knows the phone and how to report back
        id: `br:${r.id}:${broadcastId}`,
        runId: `br:${r.id}:${broadcastId}`,
        run: { phone: jid, id: `br:${r.id}:${broadcastId}` },
        type: broadcast.mediaType ?? 'text',
        content: interpolate(broadcast.message, vars),
        mediaUrl: broadcast.mediaUrl,
        typingDelaySec: 0,
      });
    }

    if (results.length >= 20) break;
  }

  return results;
}

export async function markBroadcastRecipientSent(recipientId: string, broadcastId: string) {
  const recs = await loadRecipients(broadcastId);
  await saveRecipients(
    broadcastId,
    recs.map((r) => r.id === recipientId ? { ...r, status: 'sent' as const, sentAt: new Date().toISOString() } : r)
  );
  await checkBroadcastComplete(broadcastId);
}

export async function markBroadcastRecipientFailed(recipientId: string, broadcastId: string, error: string) {
  const recs = await loadRecipients(broadcastId);
  await saveRecipients(
    broadcastId,
    recs.map((r) => r.id === recipientId ? { ...r, status: 'failed' as const, error } : r)
  );
  await checkBroadcastComplete(broadcastId);
}

async function checkBroadcastComplete(broadcastId: string) {
  const recs = await loadRecipients(broadcastId);
  const hasPending = recs.some((r) => r.status === 'pending');
  if (!hasPending) {
    await updateBroadcast(broadcastId, { status: 'completed', completedAt: new Date().toISOString() });
  }
}
