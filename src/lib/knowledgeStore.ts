import { kvLoad, kvSave } from './kvStore';

// Base de conhecimento (janela de Contextos) do bot.
// Cada entrada é um "assunto": quando a conversa tocar nesse tema (keywords),
// o agente consulta o conteúdo via tool consultar_contexto e usa como fonte.

export interface KnowledgeEntry {
  id: string;
  topic: string; // ex: "Serra Gaúcha"
  keywords: string; // separadas por vírgula — ativam o contexto
  content: string; // texto livre: roteiro, valores especiais, regras, links externos...
  links?: string[]; // URLs de apoio (página de vendas, vídeo, formulário)
  createdAt: string;
  updatedAt: string;
}

const KEY = 'knowledge';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

async function load(): Promise<KnowledgeEntry[]> {
  return (await kvLoad<KnowledgeEntry[]>(KEY)) ?? [];
}

export async function listKnowledge(): Promise<KnowledgeEntry[]> {
  return (await load()).sort((a, b) => a.topic.localeCompare(b.topic));
}

export async function createKnowledge(data: {
  topic: string;
  keywords: string;
  content: string;
  links?: string[];
}): Promise<KnowledgeEntry> {
  const all = await load();
  const now = new Date().toISOString();
  const entry: KnowledgeEntry = { id: uid(), ...data, createdAt: now, updatedAt: now };
  await kvSave(KEY, [...all, entry]);
  return entry;
}

export async function updateKnowledge(id: string, patch: Partial<KnowledgeEntry>): Promise<KnowledgeEntry> {
  const all = await load();
  const idx = all.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error('Contexto não encontrado');
  all[idx] = { ...all[idx], ...patch, id, updatedAt: new Date().toISOString() };
  await kvSave(KEY, all);
  return all[idx];
}

export async function deleteKnowledge(id: string): Promise<void> {
  const all = await load();
  await kvSave(KEY, all.filter((e) => e.id !== id));
}

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Busca por assunto ou keyword (usada pela tool consultar_contexto do agente)
export async function searchKnowledge(query: string): Promise<KnowledgeEntry[]> {
  const q = norm(query);
  const all = await load();
  return all.filter((e) => {
    if (norm(e.topic).includes(q) || q.includes(norm(e.topic))) return true;
    return e.keywords
      .split(',')
      .map((k) => norm(k.trim()))
      .filter(Boolean)
      .some((k) => q.includes(k) || k.includes(q));
  });
}

// Assuntos que casam com o texto da mensagem (para o agente saber que existem)
export async function topicsMatching(text: string): Promise<KnowledgeEntry[]> {
  const t = norm(text);
  const all = await load();
  return all.filter((e) =>
    e.keywords
      .split(',')
      .map((k) => norm(k.trim()))
      .filter((k) => k.length > 2)
      .some((k) => t.includes(k))
  );
}
