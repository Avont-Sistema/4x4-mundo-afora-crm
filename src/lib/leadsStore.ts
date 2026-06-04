import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

// Estágios do funil de leads (colunas do Kanban)
export type LeadStage =
  | 'novo' // Novos Leads
  | 'em_atendimento' // Em Atendimento
  | 'proposta_enviada' // Proposta Enviada
  | 'sem_resposta' // Sem Resposta
  | 'finalizado'; // Finalizado

// Quem está conduzindo o atendimento
export type HandledBy = 'ia' | 'manual';

// Origem do lead
export type LeadSource =
  | 'whatsapp'
  | 'google_ads'
  | 'meta_ads'
  | 'instagram'
  | 'website'
  | 'referral'
  | 'manual'
  | 'other';

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  source: LeadSource;
  stage: LeadStage;
  handledBy: HandledBy;
  interest?: string; // expedição de interesse
  value?: number; // valor estimado do negócio
  notes?: string;
  lastMessage?: string; // última mensagem (quando vem do WhatsApp)
  createdAt: string;
  updatedAt: string;
}

export const LEAD_STAGES: { key: LeadStage; label: string }[] = [
  { key: 'novo', label: 'Novos Leads' },
  { key: 'em_atendimento', label: 'Em Atendimento' },
  { key: 'proposta_enviada', label: 'Proposta Enviada' },
  { key: 'sem_resposta', label: 'Sem Resposta' },
  { key: 'finalizado', label: 'Finalizado' },
];

export const LEAD_SOURCES: { key: LeadSource; label: string }[] = [
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'google_ads', label: 'Google Ads' },
  { key: 'meta_ads', label: 'Meta Ads' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'website', label: 'Website' },
  { key: 'referral', label: 'Indicação' },
  { key: 'manual', label: 'Manual' },
  { key: 'other', label: 'Outro' },
];

// ---------------------------------------------------------------------------
// Persistência (arquivo JSON em .data/leads.json)
// Mantém um cache em memória e escreve no disco a cada mutação.
// Em produção (Vercel) isto deve ser trocado por um banco real.
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'leads.json');

let cache: Lead[] | null = null;

function nowISO() {
  return new Date().toISOString();
}

function seedLeads(): Lead[] {
  const ts = nowISO();
  return [
    {
      id: crypto.randomUUID(),
      name: 'João Silva',
      email: 'joao@email.com',
      phone: '+5511999990001',
      whatsapp: '+5511999990001',
      source: 'whatsapp',
      stage: 'novo',
      handledBy: 'ia',
      interest: 'Lençóis Maranhenses',
      value: 5000,
      lastMessage: 'Olá, queria saber sobre a expedição dos Lençóis',
      notes: 'Lead recebido pelo bot do WhatsApp',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: crypto.randomUUID(),
      name: 'Maria Santos',
      email: 'maria@email.com',
      phone: '+5521988880002',
      whatsapp: '+5521988880002',
      source: 'meta_ads',
      stage: 'em_atendimento',
      handledBy: 'manual',
      interest: 'Vale da Lua',
      value: 3600,
      notes: 'Veio de campanha no Instagram (Meta Ads)',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: crypto.randomUUID(),
      name: 'Pedro Costa',
      email: 'pedro@email.com',
      phone: '+5531977770003',
      source: 'google_ads',
      stage: 'proposta_enviada',
      handledBy: 'manual',
      interest: 'Cachoeira do Riachão',
      value: 2400,
      notes: 'Clicou no anúncio "expedição offroad" no Google',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: crypto.randomUUID(),
      name: 'Ana Oliveira',
      phone: '+5541966660004',
      whatsapp: '+5541966660004',
      source: 'whatsapp',
      stage: 'sem_resposta',
      handledBy: 'ia',
      interest: 'Lençóis Maranhenses',
      lastMessage: 'Vou pensar e te aviso',
      createdAt: ts,
      updatedAt: ts,
    },
  ];
}

function load(): Lead[] {
  if (cache) return cache;
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      cache = JSON.parse(raw) as Lead[];
      return cache;
    }
  } catch (err) {
    console.error('Falha ao ler leads.json, recriando seed:', err);
  }
  cache = seedLeads();
  persist();
  return cache;
}

function persist() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(cache ?? [], null, 2), 'utf-8');
  } catch (err) {
    console.error('Falha ao escrever leads.json:', err);
  }
}

// ---------------------------------------------------------------------------
// API do store
// ---------------------------------------------------------------------------

export function getLeads(): Lead[] {
  return [...load()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getLead(id: string): Lead | undefined {
  return load().find((l) => l.id === id);
}

// Normaliza telefone para comparação (só dígitos)
function normalizePhone(phone?: string): string {
  return (phone || '').replace(/\D/g, '');
}

export function findLeadByPhone(phone?: string): Lead | undefined {
  const target = normalizePhone(phone);
  if (!target) return undefined;
  return load().find(
    (l) =>
      normalizePhone(l.phone) === target || normalizePhone(l.whatsapp) === target
  );
}

export function findLeadByEmail(email?: string): Lead | undefined {
  if (!email) return undefined;
  const target = email.trim().toLowerCase();
  return load().find((l) => (l.email || '').trim().toLowerCase() === target);
}

export interface CreateLeadInput {
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  source: LeadSource;
  stage?: LeadStage;
  handledBy?: HandledBy;
  interest?: string;
  value?: number;
  notes?: string;
  lastMessage?: string;
}

export function createLead(input: CreateLeadInput): Lead {
  const leads = load();
  const ts = nowISO();
  const lead: Lead = {
    id: crypto.randomUUID(),
    name: input.name?.trim() || 'Lead sem nome',
    email: input.email,
    phone: input.phone,
    whatsapp: input.whatsapp,
    source: input.source,
    stage: input.stage || 'novo',
    handledBy: input.handledBy || 'manual',
    interest: input.interest,
    value: input.value,
    notes: input.notes,
    lastMessage: input.lastMessage,
    createdAt: ts,
    updatedAt: ts,
  };
  leads.push(lead);
  cache = leads;
  persist();
  return lead;
}

export function updateLead(id: string, patch: Partial<Lead>): Lead | undefined {
  const leads = load();
  const idx = leads.findIndex((l) => l.id === id);
  if (idx === -1) return undefined;
  const { id: _ignore, createdAt: _ignore2, ...rest } = patch;
  leads[idx] = { ...leads[idx], ...rest, updatedAt: nowISO() };
  cache = leads;
  persist();
  return leads[idx];
}

export function deleteLead(id: string): boolean {
  const leads = load();
  const next = leads.filter((l) => l.id !== id);
  if (next.length === leads.length) return false;
  cache = next;
  persist();
  return true;
}

// Cria ou atualiza um lead a partir de um contato (usado pelo bot do WhatsApp
// e pelos webhooks de anúncios). Faz deduplicação por telefone/email.
export function upsertLeadFromContact(input: CreateLeadInput): {
  lead: Lead;
  created: boolean;
} {
  const existing = findLeadByPhone(input.phone || input.whatsapp) ||
    findLeadByEmail(input.email);

  if (existing) {
    const patch: Partial<Lead> = { lastMessage: input.lastMessage };
    // completa dados que faltavam
    if (!existing.email && input.email) patch.email = input.email;
    if (!existing.interest && input.interest) patch.interest = input.interest;
    const lead = updateLead(existing.id, patch)!;
    return { lead, created: false };
  }

  const lead = createLead(input);
  return { lead, created: true };
}
