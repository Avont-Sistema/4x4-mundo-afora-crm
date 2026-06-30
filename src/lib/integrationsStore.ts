// Configuração de integrações editável pela UI (Configurações → Integrações).
// Persistida via kvStore (Supabase em produção, .data/ em dev local).
// Cada campo usa: valor salvo na UI → variável de ambiente → default.

export interface Integrations {
  // IA
  deepseekApiKey: string;
  agentModel: string;
  // Pagamentos — PIX grátis
  pixKey: string;
  pixMerchantName: string;
  pixMerchantCity: string;
  // Pagamentos — Asaas
  asaasApiKey: string;
  asaasEnv: string; // sandbox | production
  asaasWebhookToken: string;
  // WhatsApp (conector)
  whatsappConnectorUrl: string;
  whatsappConnectorToken: string;
  // Captação de leads (Google/Meta Ads)
  leadsWebhookToken: string;
  // E-mail (SMTP)
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassword: string;
}

// Quais campos são segredos (mascarados ao devolver pra UI)
export const SECRET_FIELDS: (keyof Integrations)[] = [
  'deepseekApiKey',
  'asaasApiKey',
  'asaasWebhookToken',
  'whatsappConnectorToken',
  'leadsWebhookToken',
  'smtpPassword',
];

const ENV_MAP: Record<keyof Integrations, string> = {
  deepseekApiKey: 'DEEPSEEK_API_KEY',
  agentModel: 'AGENT_MODEL',
  pixKey: 'PIX_KEY',
  pixMerchantName: 'PIX_MERCHANT_NAME',
  pixMerchantCity: 'PIX_MERCHANT_CITY',
  asaasApiKey: 'ASAAS_API_KEY',
  asaasEnv: 'ASAAS_ENV',
  asaasWebhookToken: 'ASAAS_WEBHOOK_TOKEN',
  whatsappConnectorUrl: 'WHATSAPP_CONNECTOR_URL',
  whatsappConnectorToken: 'WHATSAPP_CONNECTOR_TOKEN',
  leadsWebhookToken: 'LEADS_WEBHOOK_TOKEN',
  smtpHost: 'SMTP_HOST',
  smtpPort: 'SMTP_PORT',
  smtpUser: 'SMTP_USER',
  smtpPassword: 'SMTP_PASSWORD',
};

const DEFAULTS: Partial<Integrations> = {
  agentModel: 'deepseek-chat',
  asaasEnv: 'sandbox',
  pixMerchantName: '4x4 Mundo Afora',
  pixMerchantCity: 'SAO PAULO',
};

import { kvLoad, kvSave } from './kvStore';

const KV_KEY = 'integrations';
let cache: Partial<Integrations> | null = null;

async function load(): Promise<Partial<Integrations>> {
  if (cache) return cache;
  try {
    cache = (await kvLoad<Partial<Integrations>>(KV_KEY)) ?? {};
  } catch {
    cache = {};
  }
  return cache;
}

async function persist() {
  try {
    await kvSave(KV_KEY, cache ?? {});
  } catch (err) {
    console.error('Erro ao salvar integrations:', err);
  }
}

// Valor efetivo de um campo: UI salva > env > default
export async function getValue(key: keyof Integrations): Promise<string> {
  const stored = (await load())[key];
  if (stored !== undefined && stored !== '') return stored;
  const env = process.env[ENV_MAP[key]];
  if (env) return env;
  return (DEFAULTS[key] as string) || '';
}

// Config resolvida completa (uso interno pelos consumidores)
export async function resolve(): Promise<Integrations> {
  const out = {} as Integrations;
  await Promise.all(
    (Object.keys(ENV_MAP) as (keyof Integrations)[]).map(async (k) => {
      out[k] = await getValue(k);
    })
  );
  return out;
}

// Atualiza campos. Segredos vazios são ignorados (não apagam o existente).
export async function updateIntegrations(patch: Partial<Integrations>) {
  const cur = await load();
  for (const [k, v] of Object.entries(patch) as [keyof Integrations, string][]) {
    if (!(k in ENV_MAP)) continue;
    if (SECRET_FIELDS.includes(k) && (v === undefined || v === '')) continue;
    cur[k] = v;
  }
  cache = cur;
  await persist();
  return maskedView();
}

function mask(value: string): string {
  if (!value) return '';
  if (value.length <= 4) return '••••';
  return `••••${value.slice(-4)}`;
}

// Visão para a UI: segredos mascarados + flag de origem (UI ou env)
export async function maskedView() {
  const stored = await load();
  const view: Record<string, unknown> = {};
  await Promise.all(
    (Object.keys(ENV_MAP) as (keyof Integrations)[]).map(async (k) => {
      const effective = await getValue(k);
      const isSecret = SECRET_FIELDS.includes(k);
      const fromEnv = (stored[k] === undefined || stored[k] === '') && !!process.env[ENV_MAP[k]];
      view[k] = { value: isSecret ? mask(effective) : effective, set: !!effective, secret: isSecret, fromEnv };
    })
  );
  return view;
}
