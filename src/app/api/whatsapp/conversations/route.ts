import { NextResponse } from 'next/server';
import { botFetch } from '@/lib/botProxy';
import { listConversations, type ConvMode } from '@/lib/conversationsStore';

// Lista unificada de conversas:
// - CRM (kvStore/Supabase): persistente, tem o `mode` (bot/human/resolved) das abas
// - Bot (memória): dados em tempo real (botActive, waitingMinutes), perdidos no restart
// Mescla por telefone normalizado (ignora sufixo @s.whatsapp.net/@lid; para contas
// @lid usa o senderPn da última mensagem recebida para casar com o número real).

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

function digitsOf(jid: string | undefined | null): string {
  return (jid || '').split('@')[0].replace(/\D/g, '');
}

function botConvKey(c: BotConv): string {
  // Conta @lid: o telefone real está no senderPn da última mensagem
  if (c.phone.includes('@lid')) {
    const pn = digitsOf(c.lastReceivedMsg?.key?.senderPn);
    if (pn) return pn;
  }
  return digitsOf(c.phone);
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

  const crmConvs = await listConversations();
  const merged = new Map<string, Record<string, unknown>>();

  // Base: conversas persistentes do CRM
  for (const c of crmConvs) {
    merged.set(digitsOf(c.phone), {
      phone: c.phone,
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

  // Overlay: dados em tempo real do bot (o mode do CRM segue sendo a fonte da verdade)
  for (const b of botConvs) {
    const key = botConvKey(b);
    const base = merged.get(key);
    merged.set(key, {
      ...(base ?? {}),
      phone: b.phone, // JID do bot funciona para enviar/histórico
      name:
        b.name && b.name !== b.phone
          ? b.name
          : ((base?.name as string) ?? b.phone),
      stage: b.stage ?? base?.stage ?? 'new',
      botActive: b.botActive ?? base?.botActive ?? true,
      mode: (base?.mode as ConvMode) ?? (b.botActive ? 'bot' : 'human'),
      expeditionInterest: b.expeditionInterest ?? null,
      lastMessage: b.lastMessage || base?.lastMessage || '',
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
