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

// Compara telefones ignorando sufixo de JID (@s.whatsapp.net/@lid) e formatação.
function phoneKey(phone: string): string {
  return phone.split('@')[0].replace(/\D/g, '');
}

// Busca a conversa por qualquer formato do telefone (JID completo, só dígitos…).
export async function findConversationByAnyPhone(phone: string): Promise<Conversation | undefined> {
  const all = await load();
  if (all[phone]) return all[phone];
  const key = phoneKey(phone);
  if (!key) return undefined;
  return Object.values(all).find((c) => phoneKey(c.phone) === key);
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
