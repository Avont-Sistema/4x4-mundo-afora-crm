import fs from 'fs';
import path from 'path';

// Conversas do WhatsApp, indexadas por telefone (jid), em .data/conversations.json

export type ConvMode = 'bot' | 'human' | 'resolved';

export interface ConvMessage {
  role: 'user' | 'assistant';
  content: string;
  at: string;
  via?: 'bot' | 'human'; // quem enviou (quando assistant)
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

const DATA_DIR = path.join(process.cwd(), '.data');
const FILE = path.join(DATA_DIR, 'conversations.json');

let cache: Record<string, Conversation> | null = null;

function load(): Record<string, Conversation> {
  if (cache) return cache;
  try {
    if (fs.existsSync(FILE)) {
      cache = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
      return cache!;
    }
  } catch (err) {
    console.error('Erro ao ler conversations.json:', err);
  }
  cache = {};
  persist();
  return cache;
}

function persist() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(cache ?? {}, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao escrever conversations.json:', err);
  }
}

export function getConversation(phone: string): Conversation | undefined {
  return load()[phone];
}

export function listConversations(): Conversation[] {
  return Object.values(load()).sort(
    (a, b) =>
      new Date(b.lastAt || b.updatedAt).getTime() -
      new Date(a.lastAt || a.updatedAt).getTime()
  );
}

function ensure(phone: string, contactName?: string): Conversation {
  const all = load();
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

export function appendMessage(
  phone: string,
  msg: { role: 'user' | 'assistant'; content: string; via?: 'bot' | 'human' },
  contactName?: string
): Conversation {
  const conv = ensure(phone, contactName);
  const now = new Date().toISOString();
  conv.messages.push({ ...msg, at: now });
  conv.lastMessage = msg.content;
  conv.lastAt = now;
  conv.updatedAt = now;
  persist();
  return conv;
}

export function setMode(phone: string, mode: ConvMode): Conversation | undefined {
  const all = load();
  if (!all[phone]) return undefined;
  all[phone].mode = mode;
  all[phone].updatedAt = new Date().toISOString();
  cache = all;
  persist();
  return all[phone];
}

export function clearConversation(phone: string) {
  const all = load();
  if (all[phone]) {
    all[phone].messages = [];
    all[phone].lastMessage = undefined;
    cache = all;
    persist();
  }
}

// Histórico no formato esperado pela API do Claude (só user/assistant)
export function toClaudeHistory(conv: Conversation, max = 20) {
  return conv.messages
    .slice(-max)
    .map((m) => ({ role: m.role, content: m.content }));
}
