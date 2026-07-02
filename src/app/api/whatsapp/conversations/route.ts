import { NextResponse } from 'next/server';
import { botFetch } from '@/lib/botProxy';
import {
  listConversations,
  dedupeConversations,
  canonicalPhoneKey,
  type ConvMode,
} from '@/lib/conversationsStore';

// Lista unificada de conversas:
// - CRM (kvStore/Supabase): persistente, tem o `mode` (bot/human/resolved) das abas
// - Bot (memória): dados em tempo real (botActive, waitingMinutes), perdidos no restart
// Mescla por chave canônica de telefone (ignora @s.whatsapp.net/@lid e o nono
// dígito BR) — a mesma pessoa nunca aparece duplicada, mesmo que o número exista
// em vários formatos. Para @lid usa o senderPn da última mensagem recebida.

interface BotConv {
  phone: string;
  name?: string | null;
  stage?: string;
  botActive?: boolean;
  expeditionInterest?: string | null;
  lastMessage?: string;
  updatedAt?: string;
  waitingMinutes?: number | null;
  alertedOperator?: boolean;
  lastReceivedMsg?: { key?: { senderPn?: string } } | null;
}

function botConvKey(c: BotConv): string {
  // Conta @lid: o telefone real está no senderPn da última mensagem
  if (c.phone.includes('@lid')) {
    const pn = canonicalPhoneKey(c.lastReceivedMsg?.key?.senderPn || '');
    if (pn) return pn;
  }
  return canonicalPhoneKey(c.phone);
}

export async function GET() {
  let botConvs: BotConv[] = [];
  let offline = false;
  try {
    const res = await botFetch('/api/conversations');
    if (res.ok) botConvs = (await res.json()).conversations || [];
    else offline = true;
  } catch {
    offline = true;
  }

  // Funde duplicatas persistidas (com/sem nono dígito, formatos antigos)
  try { await dedupeConversations(); } catch { /* não bloqueia a listagem */ }

  const crmConvs = await listConversations();
  const merged = new Map<string, Record<string, unknown>>();

  // Base: conversas persistentes do CRM (fonte da verdade para o mode)
  for (const c of crmConvs) {
    merged.set(canonicalPhoneKey(c.phone), {
      phone: c.phone,
      avatarPhone: c.phone,
      name: c.contactName || c.phone.split('@')[0],
      stage: 'new',
      botActive: c.mode === 'bot',
      mode: c.mode as ConvMode,
      expeditionInterest: null,
      lastMessage: c.lastMessage || '',
      updatedAt: c.lastAt || c.updatedAt,
      waitingMinutes: null,
      alertedOperator: false,
    });
  }

  // Overlay: dados em tempo real do bot. Se várias conversas do bot caírem na
  // mesma chave (ex.: @lid + formato antigo), vence a com mensagem recebida
  // (tem quoted/avatar) e, entre iguais, a mais recente.
  const botByKey = new Map<string, BotConv>();
  for (const b of botConvs) {
    const key = botConvKey(b);
    const prev = botByKey.get(key);
    if (!prev) { botByKey.set(key, b); continue; }
    const bScore = (b.lastReceivedMsg ? 2 : 0) + (new Date(b.updatedAt || 0) > new Date(prev.updatedAt || 0) ? 1 : 0);
    const pScore = prev.lastReceivedMsg ? 2 : 0;
    if (bScore > pScore) botByKey.set(key, b);
  }

  for (const [key, b] of botByKey) {
    const base = merged.get(key);
    merged.set(key, {
      ...(base ?? {}),
      // phone do CRM (número real) para ações/histórico; bot phone se não houver
      phone: base?.phone ?? b.phone,
      // avatar busca pela conversa do bot (funciona para @lid)
      avatarPhone: b.phone,
      name:
        b.name && b.name !== b.phone
          ? b.name
          : ((base?.name as string) ?? b.phone),
      stage: b.stage ?? base?.stage ?? 'new',
      botActive: b.botActive ?? base?.botActive ?? true,
      mode: (base?.mode as ConvMode) ?? (b.botActive ? 'bot' : 'human'),
      expeditionInterest: b.expeditionInterest ?? null,
      lastMessage:
        base?.updatedAt && new Date(base.updatedAt as string) > new Date(b.updatedAt || 0)
          ? (base.lastMessage as string) || b.lastMessage || ''
          : b.lastMessage || (base?.lastMessage as string) || '',
      updatedAt:
        base?.updatedAt && new Date(base.updatedAt as string) > new Date(b.updatedAt || 0)
          ? base.updatedAt
          : b.updatedAt,
      waitingMinutes: b.waitingMinutes ?? null,
      alertedOperator: b.alertedOperator ?? false,
    });
  }

  const conversations = [...merged.values()].sort(
    (a, b) =>
      new Date((b.updatedAt as string) || 0).getTime() -
      new Date((a.updatedAt as string) || 0).getTime()
  );

  return NextResponse.json({ conversations, offline });
}
