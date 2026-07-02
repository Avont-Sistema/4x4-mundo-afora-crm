import { kvLoad, kvSave } from './kvStore';

// Conversas do WhatsApp, indexadas por telefone (jid), persistidas via kvStore.

export type ConvMode = 'bot' | 'human' | 'resolved';

export interface ConvMessage {
  role: 'user' | 'assistant';
  content: string;
  at: string;
  via?: 'bot' | 'human';
}

export interface Conversation {
  phone: string;
  contactName?: string;
  mode: ConvMode;
  messages: ConvMessage[];
  lastMessage?: string;
  lastAt?: string;
  createdAt: string;
  updatedAt: string;
}

const KV_KEY = 'conversations';
let cache: Record<string, Conversation> | null = null;

async function load(): Promise<Record<string, Conversation>> {
  if (cache) return cache;
  try {
    cache = (await kvLoad<Record<string, Conversation>>(KV_KEY)) ?? {};
  } catch {
    cache = {};
  }
  return cache;
}

async function persist(): Promise<void> {
  try {
    await kvSave(KV_KEY, cache ?? {});
  } catch (err) {
    console.error('Erro ao escrever conversations:', err);
  }
}

export async function getConversation(phone: string): Promise<Conversation | undefined> {
  return (await load())[phone];
}

export async function listConversations(): Promise<Conversation[]> {
  return Object.values(await load()).sort(
    (a, b) =>
      new Date(b.lastAt || b.updatedAt).getTime() -
      new Date(a.lastAt || a.updatedAt).getTime()
  );
}

async function ensure(phone: string, contactName?: string): Promise<Conversation> {
  const all = await load();
  if (!all[phone]) {
    const now = new Date().toISOString();
    all[phone] = {
      phone,
      contactName,
      mode: 'bot',
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
  }
  if (contactName && !all[phone].contactName) all[phone].contactName = contactName;
  cache = all;
  return all[phone];
}

export async function appendMessage(
  phone: string,
  msg: { role: 'user' | 'assistant'; content: string; via?: 'bot' | 'human' },
  contactName?: string
): Promise<Conversation> {
  const conv = await ensure(phone, contactName);
  const now = new Date().toISOString();
  conv.messages.push({ ...msg, at: now });
  conv.lastMessage = msg.content;
  conv.lastAt = now;
  conv.updatedAt = now;
  await persist();
  return conv;
}

export async function setMode(phone: string, mode: ConvMode): Promise<Conversation | undefined> {
  const all = await load();
  if (!all[phone]) return undefined;
  all[phone].mode = mode;
  all[phone].updatedAt = new Date().toISOString();
  cache = all;
  await persist();
  return all[phone];
}

// Chave canônica do telefone: ignora sufixo de JID (@s.whatsapp.net/@lid) e,
// para números BR, normaliza o nono dígito — 5555996567019 e 555596567019 são a
// MESMA pessoa (contas antigas registradas sem o 9). Chave: 55 + DDD + últimos 8.
export function canonicalPhoneKey(phone: string): string {
  const digits = (phone || '').split('@')[0].replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return '55' + digits.slice(2, 4) + digits.slice(-8);
  }
  return digits;
}

// Busca a conversa por qualquer formato do telefone (JID completo, só dígitos…).
export async function findConversationByAnyPhone(phone: string): Promise<Conversation | undefined> {
  const all = await load();
  if (all[phone]) return all[phone];
  const key = canonicalPhoneKey(phone);
  if (!key) return undefined;
  return Object.values(all).find((c) => canonicalPhoneKey(c.phone) === key);
}

// Nome "de gente" (não um telefone/JID) para escolher o melhor contactName
function isRealName(name?: string): boolean {
  return !!name && !name.includes('@') && !/^\+?\d[\d\s()-]*$/.test(name);
}

// Funde uma conversa antiga (ex.: registrada pelo JID @lid antes de conhecermos
// o número real) dentro da conversa do telefone verdadeiro, e apaga a antiga.
export async function mergeConversationInto(fromPhone: string, toPhone: string): Promise<void> {
  const all = await load();
  const from = all[fromPhone];
  const to = all[toPhone];
  if (!from || fromPhone === toPhone) return;
  if (!to) {
    // Só renomeia a chave para o telefone real
    all[toPhone] = { ...from, phone: toPhone };
    delete all[fromPhone];
  } else {
    const seen = new Set(to.messages.map((m) => `${m.at}|${m.content}`));
    for (const m of from.messages) {
      const sig = `${m.at}|${m.content}`;
      if (!seen.has(sig)) { to.messages.push(m); seen.add(sig); }
    }
    to.messages.sort((a, b) => a.at.localeCompare(b.at));
    if (!isRealName(to.contactName) && isRealName(from.contactName)) {
      to.contactName = from.contactName;
    }
    const last = to.messages[to.messages.length - 1];
    to.lastMessage = last?.content ?? to.lastMessage;
    to.lastAt = last?.at ?? to.lastAt;
    delete all[fromPhone];
  }
  cache = all;
  await persist();
}

// Funde grupos de conversas duplicadas (mesma chave canônica) em uma só:
// junta as mensagens em ordem, mantém o modo/nome mais recente e apaga as cópias.
export async function dedupeConversations(): Promise<number> {
  const all = await load();
  const groups = new Map<string, Conversation[]>();
  for (const c of Object.values(all)) {
    const k = canonicalPhoneKey(c.phone);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(c);
  }

  let removed = 0;
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const newest = group[0];
    // Base: prefere o registro com número real (@s.whatsapp.net); senão o mais recente
    const base = group.find((c) => c.phone.includes('@s.whatsapp.net')) ?? newest;

    const seen = new Set(base.messages.map((m) => `${m.at}|${m.content}`));
    for (const c of group) {
      if (c === base) continue;
      for (const m of c.messages) {
        const sig = `${m.at}|${m.content}`;
        if (!seen.has(sig)) { base.messages.push(m); seen.add(sig); }
      }
      if (!isRealName(base.contactName) && isRealName(c.contactName)) {
        base.contactName = c.contactName;
      }
      delete all[c.phone];
      removed++;
    }

    base.messages.sort((a, b) => a.at.localeCompare(b.at));
    const last = base.messages[base.messages.length - 1];
    base.mode = newest.mode;
    base.lastMessage = last?.content ?? base.lastMessage;
    base.lastAt = last?.at ?? base.lastAt;
    base.updatedAt = newest.updatedAt;
  }

  if (removed > 0) {
    cache = all;
    await persist();
  }
  return removed;
}

// Define o modo aceitando qualquer formato de telefone; cria a conversa se não
// existir (ex.: conversa que só vive na memória do bot e a equipe quer finalizar).
export async function setModeByAnyPhone(
  phone: string,
  mode: ConvMode,
  contactName?: string
): Promise<Conversation> {
  const existing = await findConversationByAnyPhone(phone);
  const conv = existing ?? (await ensure(phone, contactName));
  conv.mode = mode;
  conv.updatedAt = new Date().toISOString();
  await persist();
  return conv;
}

export async function clearConversation(phone: string): Promise<void> {
  const all = await load();
  if (all[phone]) {
    all[phone].messages = [];
    all[phone].lastMessage = undefined;
    cache = all;
    await persist();
  }
}

// Histórico no formato esperado pela API (só user/assistant)
export function toClaudeHistory(conv: Conversation, max = 20) {
  return conv.messages
    .slice(-max)
    .map((m) => ({ role: m.role, content: m.content }));
}
