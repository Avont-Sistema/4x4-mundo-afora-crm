import { kvLoadVersioned, kvSaveVersioned } from './kvStore';

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
  // Donos/admins: recebem notificações do sistema no WhatsApp e, quando mandam
  // mensagem para o bot, caem no chat de treinamento (não viram lead).
  diegoPhone: string;
  michellePhone: string;
}

const KV_KEY = 'settings';

const DEFAULTS: Settings = {
  botPaused: false,
  operatorNotes: '',
  businessHoursEnabled: false,
  typingDelaySeconds: 2,
  diegoPhone: '',
  michellePhone: '+5547992195320',
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

// Sem cache em memória entre chamadas, e escrita com compare-and-swap — ver
// jsonCollection.ts para o porquê.
async function load(): Promise<Settings> {
  try {
    const loaded = await kvLoadVersioned<Partial<Settings>>(KV_KEY);
    return loaded ? { ...DEFAULTS, ...loaded.value } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function getSettings(): Promise<Settings> {
  return load();
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const maxAttempts = 8;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let loaded;
    try {
      loaded = await kvLoadVersioned<Partial<Settings>>(KV_KEY);
    } catch {
      loaded = null;
    }
    const current = loaded ? { ...DEFAULTS, ...loaded.value } : { ...DEFAULTS };
    const version = loaded ? loaded.version : null;
    const updated = { ...current, ...patch };
    try {
      if (await kvSaveVersioned(KV_KEY, updated, version)) return updated;
    } catch (err) {
      console.error('Erro ao escrever settings:', err);
      return updated;
    }
  }
  throw new Error(`settingsStore: não foi possível salvar após ${maxAttempts} tentativas`);
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
