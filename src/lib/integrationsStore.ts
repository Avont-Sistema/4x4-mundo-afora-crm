import fs from 'fs';
import path from 'path';

// Configuração de integrações editável pela UI (Configurações → Integrações).
// Persistida em .data/integrations.json. Cada campo: usa o valor salvo na UI
// e, se vazio, faz fallback para a variável de ambiente correspondente.
//
// Observação de segurança: em produção (Vercel) o ideal é usar variáveis de
// ambiente. Este arquivo fica em .data/ (gitignored) e é single-tenant.

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

const DATA_DIR = path.join(process.cwd(), '.data');
const FILE = path.join(DATA_DIR, 'integrations.json');

let cache: Partial<Integrations> | null = null;

function load(): Partial<Integrations> {
  if (cache) return cache;
  try {
    if (fs.existsSync(FILE)) {
      cache = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
      return cache!;
    }
  } catch (err) {
    console.error('Erro ao ler integrations.json:', err);
  }
  cache = {};
  return cache;
}

function persist() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(cache ?? {}, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao escrever integrations.json:', err);
  }
}

// Valor efetivo de um campo: UI salva > env > default
export function getValue(key: keyof Integrations): string {
  const stored = load()[key];
  if (stored !== undefined && stored !== '') return stored;
  const env = process.env[ENV_MAP[key]];
  if (env) return env;
  return (DEFAULTS[key] as string) || '';
}

// Config resolvida completa (uso interno pelos consumidores)
export function resolve(): Integrations {
  const out = {} as Integrations;
  (Object.keys(ENV_MAP) as (keyof Integrations)[]).forEach((k) => {
    out[k] = getValue(k);
  });
  return out;
}

// Atualiza campos. Segredos vazios são ignorados (não apagam o existente).
export function updateIntegrations(patch: Partial<Integrations>) {
  const cur = load();
  for (const [k, v] of Object.entries(patch) as [keyof Integrations, string][]) {
    if (!(k in ENV_MAP)) continue;
    if (SECRET_FIELDS.includes(k) && (v === undefined || v === '')) continue; // mantém segredo
    cur[k] = v;
  }
  cache = cur;
  persist();
  return maskedView();
}

function mask(value: string): string {
  if (!value) return '';
  if (value.length <= 4) return '••••';
  return `••••${value.slice(-4)}`;
}

// Visão para a UI: segredos mascarados + flag de origem (UI ou env)
export function maskedView() {
  const stored = load();
  const view: Record<string, any> = {};
  (Object.keys(ENV_MAP) as (keyof Integrations)[]).forEach((k) => {
    const effective = getValue(k);
    const isSecret = SECRET_FIELDS.includes(k);
    const fromEnv = (stored[k] === undefined || stored[k] === '') && !!process.env[ENV_MAP[k]];
    view[k] = {
      value: isSecret ? mask(effective) : effective,
      set: !!effective,
      secret: isSecret,
      fromEnv,
    };
  });
  return view;
}
