import fs from 'fs';
import path from 'path';

// Configurações globais do agente/atendimento, em .data/settings.json

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
}

const DATA_DIR = path.join(process.cwd(), '.data');
const FILE = path.join(DATA_DIR, 'settings.json');

const DEFAULTS: Settings = {
  botPaused: false,
  operatorNotes: '',
  businessHoursEnabled: false,
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

function load(): Settings {
  if (cache) return cache;
  try {
    if (fs.existsSync(FILE)) {
      cache = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(FILE, 'utf-8')) };
      return cache!;
    }
  } catch (err) {
    console.error('Erro ao ler settings.json:', err);
  }
  cache = { ...DEFAULTS };
  persist();
  return cache;
}

function persist() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(cache ?? DEFAULTS, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao escrever settings.json:', err);
  }
}

export function getSettings(): Settings {
  return load();
}

export function updateSettings(patch: Partial<Settings>): Settings {
  cache = { ...load(), ...patch };
  persist();
  return cache;
}

export function isWithinBusinessHours(date = new Date()): boolean {
  const s = load();
  if (!s.businessHoursEnabled) return true;
  const day = date.getDay();
  const rule = s.businessHours.find((h) => h.day === day);
  if (!rule || !rule.enabled) return false;
  const mins = date.getHours() * 60 + date.getMinutes();
  const [oh, om] = rule.open.split(':').map(Number);
  const [ch, cm] = rule.close.split(':').map(Number);
  return mins >= oh * 60 + om && mins <= ch * 60 + cm;
}
