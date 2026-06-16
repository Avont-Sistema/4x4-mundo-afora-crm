// Parser da aba "CONTROLE" das planilhas de Controle Interno da 4x4 Mundo Afora.
// Cada linha é uma pessoa. Um "motorista" (linha com CARRO preenchido) abre uma
// comitiva/carro; as linhas seguintes sem carro são acompanhantes dessa comitiva.
//
// Mapeamento é feito pelo cabeçalho (linha que contém "AVENTUREIRO") para tolerar
// pequenas variações de coluna entre planilhas.

export interface ImportPerson {
  name: string;
  cpf?: string;
  birthDate?: string; // YYYY-MM-DD
  age?: number;
  isChild: boolean;
  shirtSize?: string;
  job?: string;
}

export interface ImportDriver extends ImportPerson {
  address?: string;
  city?: string;
  state?: string;
  carModel?: string;
  plate?: string;
  room?: string;
  phone?: string;
  email?: string;
}

export interface ImportComitiva {
  driver: ImportDriver;
  companions: ImportPerson[];
  adults: number;
  children: number;
}

export interface ParseResult {
  eventTitle?: string;
  comitivas: ImportComitiva[];
  totalPeople: number;
  totalCars: number;
  warnings: string[];
}

type Cell = string | number | Date | null | undefined;
type Row = Cell[];

function str(v: Cell): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// Aceita Date, "1974-06-08", "08/06/1974", "8/6/1974" -> "YYYY-MM-DD"
function parseBirth(v: Cell): string | undefined {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${v.getFullYear()}-${pad2(v.getMonth() + 1)}-${pad2(v.getDate())}`;
  }
  const s = str(v);
  if (!s) return undefined;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (br) {
    let [, d, m, y] = br;
    if (y.length === 2) y = (Number(y) > 30 ? '19' : '20') + y;
    return `${y}-${pad2(Number(m))}-${pad2(Number(d))}`;
  }
  return undefined;
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

const ADULT_SHIRTS = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'G1', 'G2', 'G3'];

function looksLikeShirt(s: string): boolean {
  const u = s.toUpperCase();
  if (ADULT_SHIRTS.includes(u)) return true;
  if (/^\d{1,2}$/.test(u)) return true; // infantil numérico (2..14)
  if (/infantil/i.test(s)) return true;
  return false;
}

function isChildShirt(s: string): boolean {
  return /^\d{1,2}$/.test(s.trim()) || /infantil/i.test(s);
}

// Separa "Porto Alegre RS" -> { city: "Porto Alegre", state: "RS" }
function splitCityState(s: string): { city?: string; state?: string } {
  const t = s.trim().replace(/\s+/g, ' ');
  if (!t) return {};
  const m = t.match(/^(.*?)[\s/-]+([A-Za-z]{2})$/);
  if (m) return { city: m[1].trim(), state: m[2].toUpperCase() };
  return { city: t };
}

interface ColMap {
  name: number;
  cpf: number;
  birth: number;
  age: number;
  address: number;
  city: number;
  car: number;
  plate: number;
  room: number;
  shirt: number;
  cars: number;
  phone: number;
  email: number;
}

function findHeader(rows: Row[]): { index: number; cols: ColMap } | null {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const idxOf = (pred: (c: string) => boolean) =>
      row.findIndex((c) => pred(str(c).toUpperCase()));
    const avt = idxOf((c) => c === 'AVENTUREIRO');
    const cpf = idxOf((c) => c === 'CPF');
    if (avt >= 0 && cpf >= 0) {
      return {
        index: i,
        cols: {
          name: avt + 1, // nome fica na coluna à direita de "AVENTUREIRO"
          cpf,
          birth: idxOf((c) => c === 'DN' || c.startsWith('DATA')),
          age: idxOf((c) => c.startsWith('IDADE')),
          address: idxOf((c) => c.includes('ENDERE')),
          city: idxOf((c) => c === 'CIDADE'),
          car: idxOf((c) => c === 'CARRO'),
          plate: idxOf((c) => c === 'PLACA'),
          room: idxOf((c) => c.includes('HOTEL') || c.includes('QUARTO')),
          shirt: idxOf((c) => c.includes('CAMISETA')),
          cars: idxOf((c) => c === 'CARROS'),
          phone: idxOf((c) => c.includes('TELEFONE') || c.includes('FONE')),
          email: idxOf((c) => c.includes('MAIL')),
        },
      };
    }
  }
  return null;
}

function cell(row: Row, i: number): string {
  return i >= 0 ? str(row[i]) : '';
}

function buildPerson(row: Row, cols: ColMap): ImportPerson {
  const name = cell(row, cols.name);
  const cpf = digitsOnly(cell(row, cols.cpf)) || undefined;
  const birthDate = parseBirth(row[cols.birth]);
  let age: number | undefined;
  const ageStr = cell(row, cols.age);
  if (/^\d{1,3}$/.test(ageStr)) age = Number(ageStr);
  if (age === undefined) age = ageFromBirth(birthDate);

  // camiseta: tolera deslocamento de 1 coluna em linhas de acompanhante
  let shirtSize = '';
  for (const i of [cols.shirt, cols.shirt - 1, cols.shirt + 1]) {
    const v = cell(row, i);
    if (v && looksLikeShirt(v)) { shirtSize = v.toUpperCase(); break; }
  }

  const isChild =
    (age !== undefined && age < 18) || (!!shirtSize && isChildShirt(shirtSize));

  return {
    name,
    cpf,
    birthDate,
    age,
    isChild,
    shirtSize: shirtSize || undefined,
  };
}

export function parseControle(rows: Row[]): ParseResult {
  const warnings: string[] = [];
  const header = findHeader(rows);
  if (!header) {
    return { comitivas: [], totalPeople: 0, totalCars: 0, warnings: ['Cabeçalho "AVENTUREIRO/CPF" não encontrado na aba CONTROLE.'] };
  }
  const { cols } = header;

  // título do evento: primeira linha não vazia antes do cabeçalho
  let eventTitle: string | undefined;
  for (let i = 0; i < header.index; i++) {
    const firstText = rows[i].map(str).find((v) => v.length > 3);
    if (firstText && !/CONTROLE INTERNO/i.test(firstText)) { eventTitle = firstText; break; }
  }

  const comitivas: ImportComitiva[] = [];
  let current: ImportComitiva | null = null;

  for (let i = header.index + 1; i < rows.length; i++) {
    const row = rows[i];
    const name = cell(row, cols.name);
    if (!name) break; // fim do bloco de pessoas (rodapé de prestadores etc.)
    // ignora linhas-rótulo eventuais
    if (/PRESTADOR|ROTA DO|VALOR|SALDO/i.test(name)) break;

    // Um novo carro/comitiva é detectado pela coluna CARRO (modelo) preenchida.
    // (A coluna CARROS é só um contador acumulado e às vezes incrementa para um
    // acompanhante com quarto próprio — por isso não é usada aqui.)
    const carModel = cell(row, cols.car);
    const isDriver = !!carModel;

    const person = buildPerson(row, cols);

    if (isDriver || !current) {
      const cs = splitCityState(cell(row, cols.city));
      const emailRaw = cell(row, cols.email);
      const isEmail = emailRaw.includes('@');
      const driver: ImportDriver = {
        ...person,
        isChild: false, // motorista é sempre adulto
        address: cell(row, cols.address) || undefined,
        city: cs.city,
        state: cs.state,
        carModel: carModel || undefined,
        plate: cell(row, cols.plate).toUpperCase() || undefined,
        room: cell(row, cols.room) || undefined,
        phone: cell(row, cols.phone) || undefined,
        email: isEmail ? emailRaw : undefined,
        job: !isEmail && emailRaw ? emailRaw : undefined,
      };
      current = { driver, companions: [], adults: 1, children: 0 };
      comitivas.push(current);
    } else {
      // acompanhante: profissão às vezes vai na coluna de e-mail
      const emailRaw = cell(row, cols.email);
      if (emailRaw && !emailRaw.includes('@')) person.job = emailRaw;
      current.companions.push(person);
      if (person.isChild) current.children++;
      else current.adults++;
    }
  }

  const totalPeople = comitivas.reduce((a, c) => a + 1 + c.companions.length, 0);
  if (comitivas.length === 0) warnings.push('Nenhuma comitiva encontrada.');

  return { eventTitle, comitivas, totalPeople, totalCars: comitivas.length, warnings };
}
