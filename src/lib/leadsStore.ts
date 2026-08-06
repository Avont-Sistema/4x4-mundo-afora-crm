import { kvLoadVersioned, kvSaveVersioned } from './kvStore';

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
// Persistência via kvStore (Supabase em produção, .data/leads.json em dev).
// ---------------------------------------------------------------------------

const KEY = 'leads';

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

// Sem cache em memória, e toda escrita usa compare-and-swap (retry se outra
// requisição concorrente gravou primeiro) — ver jsonCollection.ts para os
// detalhes e o porquê (registro "sumindo" sem motivo aparente).
async function load(): Promise<Lead[]> {
  const loaded = await kvLoadVersioned<Lead[]>(KEY);
  if (loaded) return loaded.value;
  const seeded = seedLeads();
  await kvSaveVersioned(KEY, seeded, null);
  return seeded;
}

async function withRetry<R>(
  mutate: (arr: Lead[]) => { found: boolean; result: R }
): Promise<R> {
  const maxAttempts = 8;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const loaded = await kvLoadVersioned<Lead[]>(KEY);
    const arr = loaded ? loaded.value : seedLeads();
    const version = loaded ? loaded.version : null;
    const { found, result } = mutate(arr);
    if (!found) return result;
    const ok = await kvSaveVersioned(KEY, arr, version);
    if (ok) return result;
  }
  throw new Error(`leadsStore: não foi possível salvar após ${maxAttempts} tentativas (concorrência muito alta)`);
}

// ---------------------------------------------------------------------------
// API do store
// ---------------------------------------------------------------------------

export async function getLeads(): Promise<Lead[]> {
  return [...(await load())].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getLead(id: string): Promise<Lead | undefined> {
  return (await load()).find((l) => l.id === id);
}

// Normaliza telefone para comparação (só dígitos)
function normalizePhone(phone?: string): string {
  return (phone || '').replace(/\D/g, '');
}

export async function findLeadByPhone(phone?: string): Promise<Lead | undefined> {
  const target = normalizePhone(phone);
  if (!target) return undefined;
  return (await load()).find(
    (l) =>
      normalizePhone(l.phone) === target || normalizePhone(l.whatsapp) === target
  );
}

export async function findLeadByEmail(email?: string): Promise<Lead | undefined> {
  if (!email) return undefined;
  const target = email.trim().toLowerCase();
  return (await load()).find((l) => (l.email || '').trim().toLowerCase() === target);
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

export async function createLead(input: CreateLeadInput): Promise<Lead> {
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
  return withRetry((leads) => {
    leads.push(lead);
    return { found: true, result: lead };
  });
}

export async function updateLead(
  id: string,
  patch: Partial<Lead>
): Promise<Lead | undefined> {
  return withRetry((leads) => {
    const idx = leads.findIndex((l) => l.id === id);
    if (idx === -1) return { found: false, result: undefined };
    const { id: _ignore, createdAt: _ignore2, ...rest } = patch;
    leads[idx] = { ...leads[idx], ...rest, updatedAt: nowISO() };
    return { found: true, result: leads[idx] };
  });
}

export async function deleteLead(id: string): Promise<boolean> {
  return withRetry((leads) => {
    const idx = leads.findIndex((l) => l.id === id);
    if (idx === -1) return { found: false, result: false };
    leads.splice(idx, 1);
    return { found: true, result: true };
  });
}

// Cria ou atualiza um lead a partir de um contato (usado pelo bot do WhatsApp
// e pelos webhooks de anúncios). Faz deduplicação por telefone/email.
export async function upsertLeadFromContact(input: CreateLeadInput): Promise<{
  lead: Lead;
  created: boolean;
}> {
  const existing =
    (await findLeadByPhone(input.phone || input.whatsapp)) ||
    (await findLeadByEmail(input.email));

  if (existing) {
    const patch: Partial<Lead> = { lastMessage: input.lastMessage };
    // completa dados que faltavam
    if (!existing.email && input.email) patch.email = input.email;
    if (!existing.interest && input.interest) patch.interest = input.interest;
    const lead = (await updateLead(existing.id, patch))!;
    return { lead, created: false };
  }

  const lead = await createLead(input);
  return { lead, created: true };
}
