// Parser de respostas do Google Forms (o formulário espelha as mesmas
// perguntas do /cadastro: Motorista Principal, Acompanhante, até 4
// Passageiros Adicionais). Cada linha da planilha exportada é uma resposta.
//
// Diferente da planilha de Controle Interno (importControle.ts), aqui o
// cabeçalho é o texto literal de cada pergunta do formulário — variável e às
// vezes com ruído (ex.: nome de exemplo colado na pergunta). Por isso o
// mapeamento de colunas é por palavra-chave (fuzzy), não por nome exato, e
// tudo que não for reconhecível com confiança vira aviso para conferência
// manual em vez de ser importado errado silenciosamente.

export interface GFPerson {
  name: string;
  cpf?: string;
  birthDate?: string; // YYYY-MM-DD
  age?: number;
  isChild: boolean;
  job?: string;
}

export interface GFDriver extends GFPerson {
  address?: string;
  addressNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  phone?: string;
  car?: string;
  plate?: string;
}

export interface GFResponse {
  rowNumber: number;
  timestamp?: string;
  email?: string;
  driver: GFDriver;
  companion?: GFPerson;
  additionalPassengers: GFPerson[];
  roomConfig?: string;
  shirtSizesRaw?: string;
  petInfo?: string;
  emergencyContact?: string;
  notes?: string;
}

export interface ParseGFResult {
  responses: GFResponse[];
  missingColumns: string[];
  warnings: string[];
}

type Cell = string | number | Date | null | undefined;
type Row = Cell[];

function str(v: Cell): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

function cell(row: Row, i: number): string {
  return i >= 0 && i < row.length ? str(row[i]) : '';
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function ageFromBirth(birthDate?: string): number | undefined {
  if (!birthDate) return undefined;
  const d = new Date(birthDate + 'T12:00:00');
  if (isNaN(d.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const mo = now.getMonth() - d.getMonth();
  if (mo < 0 || (mo === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

// Separa "Porto Alegre RS" / "Porto Alegre - RS" / "Porto Alegre/RS" -> partes
function splitCityState(s: string): { city?: string; state?: string } {
  const t = s.trim().replace(/\s+/g, ' ');
  if (!t) return {};
  const m = t.match(/^(.*?)[\s/-]+([A-Za-z]{2})$/);
  if (m) return { city: m[1].trim(), state: m[2].toUpperCase() };
  return { city: t };
}

const PT_MONTHS: Record<string, number> = {
  jan: 1, janeiro: 1,
  fev: 2, fevereiro: 2,
  mar: 3, marco: 3,
  abr: 4, abril: 4,
  mai: 5, maio: 5,
  jun: 6, junho: 6,
  jul: 7, julho: 7,
  ago: 8, agosto: 8,
  set: 9, setembro: 9,
  out: 10, outubro: 10,
  nov: 11, novembro: 11,
  dez: 12, dezembro: 12,
};

const ACCENT_MAP: Record<string, string> = {
  á: 'a', à: 'a', â: 'a', ã: 'a', ä: 'a',
  é: 'e', è: 'e', ê: 'e', ë: 'e',
  í: 'i', ì: 'i', î: 'i', ï: 'i',
  ó: 'o', ò: 'o', ô: 'o', õ: 'o', ö: 'o',
  ú: 'u', ù: 'u', û: 'u', ü: 'u',
  ç: 'c',
};

function stripAccents(s: string): string {
  return s.replace(/[áàâãäéèêëíìîïóòôõöúùûüç]/g, (c) => ACCENT_MAP[c] ?? c);
}

// Datas digitadas livremente pelo respondente são inconsistentes ("21/01/1987",
// "2maio 1955", "27abril 1961"...). Tenta os formatos comuns; se não reconhecer,
// devolve undefined (o chamador registra aviso para conferência manual em vez
// de adivinhar).
function parseFlexibleDate(v: Cell): string | undefined {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${v.getFullYear()}-${pad2(v.getMonth() + 1)}-${pad2(v.getDate())}`;
  }
  const s = str(v);
  if (!s) return undefined;

  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = (Number(y) > 30 ? '19' : '20') + y;
    return `${y}-${pad2(Number(mo))}-${pad2(Number(d))}`;
  }

  const norm = stripAccents(s.toLowerCase())
    .replace(/\bde\b/g, ' ')
    .replace(/(\d)([a-z])/g, '$1 $2') // "2maio" -> "2 maio"
    .replace(/\s+/g, ' ')
    .trim();
  m = norm.match(/^(\d{1,2})\s+([a-z]+)\.?\s+(\d{4})$/);
  if (m) {
    const [, d, monthName, y] = m;
    const mon = PT_MONTHS[monthName];
    if (mon) return `${y}-${pad2(mon)}-${pad2(Number(d))}`;
  }
  return undefined;
}

// Ano de nascimento fora de um intervalo plausível é quase sempre erro de
// digitação (ex.: "12/05/1067" em vez de "1967") — não vale a pena importar
// uma data assim (geraria idade absurda no cálculo de preço), melhor deixar
// em branco e avisar do que confiar cegamente no que foi digitado.
function isPlausibleBirthDate(birthDate?: string): boolean {
  if (!birthDate) return true;
  const y = Number(birthDate.slice(0, 4));
  return y >= 1900 && y <= new Date().getFullYear();
}

// "Passageiro Adicional N" é um campo de texto livre único (o formulário pede
// "Nome completo, CPF, Idade, Data de Nascimento" numa linha só, mas na
// prática as pessoas separam por vírgula, barra, underline ou nada). Em vez
// de dividir por um delimitador fixo (frágil — datas também usam "/"), varre
// o texto inteiro procurando CPF (11 dígitos), data e idade em qualquer
// posição, remove o que reconheceu e o que sobrar vira o nome.
function parseAdditionalPassenger(raw: string): { person: GFPerson; warnings: string[] } | null {
  const s = raw.trim();
  if (!s) return null;

  let working = s;
  const notes: string[] = [];

  let cpf: string | undefined;
  const cpfMatch = working.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/);
  if (cpfMatch) {
    cpf = digitsOnly(cpfMatch[0]);
    working = working.replace(cpfMatch[0], ' ');
  }

  let birthDate: string | undefined;
  const dateMatch = working.match(/\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b/);
  if (dateMatch) {
    const parsed = parseFlexibleDate(dateMatch[0]);
    working = working.replace(dateMatch[0], ' ');
    if (parsed && isPlausibleBirthDate(parsed)) {
      birthDate = parsed;
    } else if (parsed) {
      notes.push(`data de nascimento "${dateMatch[0]}" parece errada — não importei essa data`);
    }
  }

  let age: number | undefined;
  const ageMatch =
    working.match(/idade[:\s]*(\d{1,2})\b/i) || working.match(/\b(\d{1,2})\s*anos?\b/i);
  if (ageMatch) {
    age = Number(ageMatch[1]);
    working = working.replace(ageMatch[0], ' ');
  } else {
    const bare = working.match(/\b\d{1,2}\b/);
    if (bare) {
      age = Number(bare[0]);
      working = working.replace(bare[0], ' ');
    }
  }

  const name = working
    .replace(/\b(cpf|idade|anos?|data\s*de\s*nascimento|nascimento)\b/gi, ' ')
    .replace(/\d{2,}/g, ' ') // sobra de CPF/data que não foi reconhecida junto (não é nome)
    .replace(/[.,;/_|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (age === undefined) age = ageFromBirth(birthDate);
  const isChild = age !== undefined ? age < 18 : true; // sem idade/nascimento, assume o pior caso (evita cobrar como adulto por engano)

  if (!name) notes.push(`não consegui identificar o nome em "${raw}"`);
  else if (!birthDate && age === undefined) notes.push(`sem idade/data de nascimento reconhecida para "${name}" (texto original: "${raw}")`);

  return { person: { name: name || raw, cpf, birthDate, age, isChild }, warnings: notes.map((n) => `${n} — confira manualmente`) };
}

interface GFColMap {
  timestamp: number;
  email: number;
  driverName: number;
  driverAge: number;
  driverCpf: number;
  driverBirth: number;
  driverJob: number;
  address: number;
  addressNumber: number;
  neighborhood: number;
  cityState: number;
  cep: number;
  phone: number;
  car: number;
  plate: number;
  companionName: number;
  companionCpf: number;
  companionAge: number;
  companionBirth: number;
  companionJob: number;
  additionalPassengers: number[]; // índice 0 = "Passageiro Adicional 1", etc.
  pet: number;
  emergencyContact: number;
  roomConfig: number;
  shirtSizes: number;
  notes: number;
}

function buildColMap(header: Row): GFColMap {
  const h = header.map((c) => stripAccents(str(c).toLowerCase()));
  const find = (pred: (s: string) => boolean) => h.findIndex(pred);

  const additionalPassengers: number[] = [];
  h.forEach((s, i) => {
    const m = s.match(/passageiro adicional\s*(\d+)/);
    if (m && !s.includes('existe')) additionalPassengers[Number(m[1]) - 1] = i;
  });

  return {
    timestamp: find((s) => s.includes('carimbo')),
    email: find((s) => s.includes('mail')),
    driverName: find((s) => s.includes('motorista') && s.includes('nome')),
    driverAge: find((s) => s.includes('motorista') && s.includes('idade')),
    driverCpf: find((s) => s.includes('motorista') && s.includes('cpf')),
    driverBirth: find((s) => s.includes('motorista') && s.includes('nascimento')),
    driverJob: find((s) => s.includes('motorista') && s.includes('profiss')),
    address: find((s) => s.includes('endereco residencial') || (s.includes('endereco') && !s.includes('mail'))),
    addressNumber: find((s) => s.includes('numero') && s.includes('complemento')),
    neighborhood: find((s) => s.startsWith('bairro')),
    cityState: find((s) => s.includes('cidade') && s.includes('estado')),
    cep: find((s) => s.trim() === 'cep' || s.startsWith('cep')),
    phone: find((s) => s.includes('contato') && (s.includes('telefone') || s.includes('whats'))),
    car: find((s) => s.includes('carro') && !s.includes('placa')),
    plate: find((s) => s.includes('placa')),
    companionName: find((s) => s.includes('acompanhante') && s.includes('nome')),
    companionCpf: find((s) => s.includes('acompanhante') && s.includes('cpf')),
    companionAge: find((s) => s.includes('acompanhante') && s.includes('idade')),
    companionBirth: find((s) => s.includes('acompanhante') && s.includes('nascimento')),
    companionJob: find((s) => s.includes('acompanhante') && s.includes('profiss')),
    additionalPassengers,
    pet: find((s) => s.includes('pet')),
    emergencyContact: find((s) => s.includes('emergencia')),
    roomConfig: find((s) => s.includes('quarto')),
    shirtSizes: find((s) => s.includes('camiseta') || s.includes('tamanho')),
    notes: find((s) => s.startsWith('observa')),
  };
}

// Idade digitada à mão discordando bastante da data de nascimento é o mesmo
// tipo de erro que gerava preço errado no /cadastro público (ver bug do
// "filho de 17 anos cobrado como 5") — aqui não dá pra corrigir na hora
// (não é um formulário nosso), só avisar para conferência manual.
function checkBirthAndAge(
  label: string,
  birthDateRaw: string,
  birthDate: string | undefined,
  typedAge: number | undefined,
  warnings: string[]
): void {
  if (birthDateRaw && !birthDate) {
    warnings.push(`${label}: não entendi a data de nascimento "${birthDateRaw}" — confira manualmente.`);
    return;
  }
  if (!birthDate) return;
  if (!isPlausibleBirthDate(birthDate)) {
    warnings.push(`${label}: data de nascimento "${birthDateRaw}" parece errada — não importei essa data, confira manualmente.`);
    return;
  }
  if (typedAge !== undefined) {
    const fromBirth = ageFromBirth(birthDate);
    if (fromBirth !== undefined && Math.abs(fromBirth - typedAge) > 1) {
      warnings.push(
        `${label}: idade informada (${typedAge}) não bate com a data de nascimento "${birthDateRaw}" (~${fromBirth} anos) — confira qual está certo.`
      );
    }
  }
}

// Respondentes às vezes escrevem "Ninguém"/"N/A" no campo do acompanhante
// quando viajam sozinhos, em vez de deixar em branco — sem isso viraria um
// acompanhante fantasma chamado "NINGUEM".
function isNonePlaceholder(s: string): boolean {
  const n = stripAccents(s.trim().toLowerCase()).replace(/[.!?]/g, '');
  return ['ninguem', 'nenhum', 'nenhuma', 'n/a', 'na', '-', 'nao tem', 'sem acompanhante', 'nao ha', 'nao possui', 'nao vai ter'].includes(n);
}

function buildResponse(row: Row, cols: GFColMap, rowNumber: number): { response: GFResponse; warnings: string[] } {
  const warnings: string[] = [];
  const driverName = cell(row, cols.driverName);

  const driverBirthRaw = cell(row, cols.driverBirth);
  let driverBirth = parseFlexibleDate(row[cols.driverBirth]);
  if (driverBirth && !isPlausibleBirthDate(driverBirth)) driverBirth = undefined;
  const driverAgeStr = cell(row, cols.driverAge);
  const driverAgeTyped = /^\d{1,3}$/.test(driverAgeStr) ? Number(driverAgeStr) : undefined;
  const driverAge = driverAgeTyped ?? ageFromBirth(driverBirth);
  if (driverName) checkBirthAndAge(`Motorista ${driverName}`, driverBirthRaw, driverBirth, driverAgeTyped, warnings);

  const { city, state } = splitCityState(cell(row, cols.cityState));

  const driver: GFDriver = {
    name: driverName,
    cpf: digitsOnly(cell(row, cols.driverCpf)) || undefined,
    birthDate: driverBirth,
    age: driverAge,
    isChild: false,
    job: cell(row, cols.driverJob) || undefined,
    address: cell(row, cols.address) || undefined,
    addressNumber: cell(row, cols.addressNumber) || undefined,
    neighborhood: cell(row, cols.neighborhood) || undefined,
    city,
    state,
    cep: cell(row, cols.cep) || undefined,
    phone: cell(row, cols.phone) || undefined,
    car: cell(row, cols.car) || undefined,
    plate: cell(row, cols.plate).toUpperCase() || undefined,
  };

  let companion: GFPerson | undefined;
  const companionNameRaw = cell(row, cols.companionName);
  if (companionNameRaw && !isNonePlaceholder(companionNameRaw)) {
    const companionBirthRaw = cell(row, cols.companionBirth);
    let companionBirth = parseFlexibleDate(row[cols.companionBirth]);
    if (companionBirth && !isPlausibleBirthDate(companionBirth)) companionBirth = undefined;
    const companionAgeStr = cell(row, cols.companionAge);
    const companionAgeTyped = /^\d{1,3}$/.test(companionAgeStr) ? Number(companionAgeStr) : undefined;
    const companionAge = companionAgeTyped ?? ageFromBirth(companionBirth);
    checkBirthAndAge(`Acompanhante ${companionNameRaw}`, companionBirthRaw, companionBirth, companionAgeTyped, warnings);
    companion = {
      name: companionNameRaw,
      cpf: digitsOnly(cell(row, cols.companionCpf)) || undefined,
      birthDate: companionBirth,
      age: companionAge,
      isChild: companionAge !== undefined && companionAge < 18,
      job: cell(row, cols.companionJob) || undefined,
    };
  }

  const additionalPassengers: GFPerson[] = [];
  for (const idx of cols.additionalPassengers) {
    if (idx === undefined || idx < 0) continue;
    const raw = cell(row, idx);
    if (!raw) continue;
    const parsed = parseAdditionalPassenger(raw);
    if (!parsed) continue;
    additionalPassengers.push(parsed.person);
    for (const w of parsed.warnings) {
      warnings.push(`${driverName || `linha ${rowNumber}`}: passageiro adicional ${w}`);
    }
  }

  const petRaw = cell(row, cols.pet);
  const hasPet = !!petRaw && !/^n[aã]o\b/i.test(petRaw);

  return {
    response: {
      rowNumber,
      timestamp: cell(row, cols.timestamp) || undefined,
      email: cell(row, cols.email) || undefined,
      driver,
      companion,
      additionalPassengers,
      roomConfig: cell(row, cols.roomConfig) || undefined,
      shirtSizesRaw: cell(row, cols.shirtSizes) || undefined,
      petInfo: hasPet ? petRaw : undefined,
      emergencyContact: cell(row, cols.emergencyContact) || undefined,
      notes: cell(row, cols.notes) || undefined,
    },
    warnings,
  };
}

const REQUIRED_COLUMNS: { key: keyof GFColMap; label: string }[] = [
  { key: 'driverName', label: 'Nome Completo do Motorista Principal' },
  { key: 'driverBirth', label: 'Data de Nascimento do Motorista Principal' },
];

export function parseGoogleForms(rows: Row[]): ParseGFResult {
  if (rows.length === 0) {
    return { responses: [], missingColumns: [], warnings: ['Planilha vazia.'] };
  }
  const cols = buildColMap(rows[0]);
  const missingColumns = REQUIRED_COLUMNS.filter((r) => cols[r.key] as number < 0).map((r) => r.label);
  if (missingColumns.length > 0) {
    return { responses: [], missingColumns, warnings: [] };
  }

  const responses: GFResponse[] = [];
  const warnings: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every((c) => !str(c))) continue; // linha em branco
    const { response, warnings: rowWarnings } = buildResponse(row, cols, i + 1);
    if (!response.driver.name) continue; // resposta sem nome do motorista, ignora
    responses.push(response);
    warnings.push(...rowWarnings);
  }

  return { responses, missingColumns: [], warnings };
}
