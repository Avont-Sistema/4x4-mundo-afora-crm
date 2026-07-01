import { kvLoad, kvSave } from './kvStore';

// Configurações globais do agente/atendimento, persistidas via kvStore.

export interface BusinessHour {
  day: number; // 0=domingo ... 6=sábado
  open: string; // "08:30"
  close: string; // "18:00"
  enabled: boolean;
}

export interface Settings {
  botPaused: boolean;
  operatorNotes: string;
  businessHoursEnabled: boolean;
  businessHours: BusinessHour[];
  outOfHoursMessage: string;
  typingDelaySeconds: number; // segundos de "digitando..." antes de responder (0 = desativado)
}

const KV_KEY = 'settings';

const DEFAULTS: Settings = {
  botPaused: false,
  operatorNotes: '',
  businessHoursEnabled: false,
  typingDelaySeconds: 2,
  businessHours: [
    { day: 1, open: '08:00', close: '18:00', enabled: true },
    { day: 2, open: '08:00', close: '18:00', enabled: true },
    { day: 3, open: '08:00', close: '18:00', enabled: true },
    { day: 4, open: '08:00', close: '18:00', enabled: true },
    { day: 5, open: '08:00', close: '18:00', enabled: true },
    { day: 6, open: '08:00', close: '12:00', enabled: false },
    { day: 0, open: '08:00', close: '12:00', enabled: false },
  ],
  outOfHoursMessage:
    'Olá! No momento estamos fora do horário de atendimento, mas já já retornamos por aqui. 😊',
};

let cache: Settings | null = null;

async function load(): Promise<Settings> {
  if (cache) return cache;
  try {
    const stored = await kvLoad<Partial<Settings>>(KV_KEY);
    cache = stored ? { ...DEFAULTS, ...stored } : { ...DEFAULTS };
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache;
}

async function persist(): Promise<void> {
  try {
    await kvSave(KV_KEY, cache ?? DEFAULTS);
  } catch (err) {
    console.error('Erro ao escrever settings:', err);
  }
}

export async function getSettings(): Promise<Settings> {
  return load();
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  cache = { ...(await load()), ...patch };
  await persist();
  return cache;
}

export async function isWithinBusinessHours(date = new Date()): Promise<boolean> {
  const s = await load();
  if (!s.businessHoursEnabled) return true;
  const day = date.getDay();
  const rule = s.businessHours.find((h) => h.day === day);
  if (!rule || !rule.enabled) return false;
  const mins = date.getHours() * 60 + date.getMinutes();
  const [oh, om] = rule.open.split(':').map(Number);
  const [ch, cm] = rule.close.split(':').map(Number);
  return mins >= oh * 60 + om && mins <= ch * 60 + cm;
}
