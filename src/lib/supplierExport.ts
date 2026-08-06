import { clientsStore, ageFrom } from './clientsStore';
import {
  type Supplier,
  type SupplierCategoryQuantities,
  type SupplierCostContext,
  resolveCategory,
  categoryPrice,
  PRICE_CATEGORY_LABELS,
  HOTEL_SUPPLIER_TYPES,
  DEFAULT_SENIOR_MIN_AGE,
} from './suppliersStore';
import { type Expedition, resolveSupplierCost, classifyChildAge, compositionParty } from './expeditionsStore';
import {
  BILLING_LABELS,
  EXPORT_FIELDS,
  DEFAULT_EXPORT_FIELDS,
  type PersonRow,
} from './supplierFields';

export { EXPORT_FIELDS, DEFAULT_EXPORT_FIELDS, type PersonRow };

const CATEGORY_LABELS: Record<keyof SupplierCategoryQuantities, string> = {
  perPerson: 'Por pessoa',
  casal: 'Casal',
  child0to5: 'Criança 0-5',
  child5to10: 'Criança até 10',
  above10: 'Acima de 10',
  senior: 'Idoso',
  single: 'Single',
  triplo: 'Triplo',
  quadruplo: 'Quadruplo',
  familia: 'Família',
  adicional: 'Adicional',
};

function bracketKey(age: number | null): 'child0to5' | 'child5to10' | 'above10' {
  const bracket = classifyChildAge(age ?? 999);
  if (bracket === 'upTo5') return 'child0to5';
  if (bracket === '5to10') return 'child5to10';
  return 'above10';
}

// Sugere as quantidades de cada categoria a partir das matrículas ativas da
// expedição (composição do carro + idade real de titular/família) — ponto de
// partida editável, não o valor final (a equipe confere e ajusta pra bater
// com a fatura real do fornecedor).
export async function suggestSupplierQuantities(
  exp: Expedition,
  supplier: Supplier
): Promise<SupplierCategoryQuantities> {
  const active = exp.enrollments.filter((e) => e.status !== 'cancelado');
  const q: SupplierCategoryQuantities = {};
  const add = (k: keyof SupplierCategoryQuantities, n = 1) => {
    if (n <= 0) return;
    q[k] = (q[k] || 0) + n;
  };

  if (HOTEL_SUPPLIER_TYPES.includes(supplier.type)) {
    for (const enr of active) {
      const { adults, children } = compositionParty(enr.composition);
      const total = adults + children;
      if (total <= 1) add('single');
      else if (total === 2) add('casal');
      else if (total === 3) add('triplo');
      else if (total === 4) add('quadruplo');
      else add('familia');
    }
    return q;
  }

  const seniorMin = supplier.seniorMinAge ?? DEFAULT_SENIOR_MIN_AGE;
  for (const enr of active) {
    const c = await clientsStore.get(enr.clientId);
    if (!c) continue;
    const people = [
      { age: ageFrom(c.birthDate), isChild: false, isTitular: true },
      ...(c.family || []).map((m) => ({ age: ageFrom(m.birthDate), isChild: Boolean(m.isChild), isTitular: false })),
    ];

    const seniors = people.filter((p) => p.age != null && p.age >= seniorMin);
    add('senior', seniors.length);
    const rest = people.filter((p) => !(p.age != null && p.age >= seniorMin));
    const titular = rest.find((p) => p.isTitular);
    const companions = rest.filter((p) => !p.isTitular);

    if (titular) {
      const partnerIdx = companions.findIndex((p) => !p.isChild);
      if (partnerIdx >= 0) add('casal');
      else add('perPerson');
      companions.forEach((p, idx) => {
        if (idx === partnerIdx) return;
        add(bracketKey(p.age));
      });
    } else {
      // titular era idoso (já contado em "senior") — sem par pra fechar
      // casal, cada acompanhante conta individualmente
      companions.forEach((p) => {
        if (!p.isChild) add('perPerson');
        else add(bracketKey(p.age));
      });
    }
  }
  return q;
}

const RELATION_LABEL: Record<string, string> = {
  conjuge: 'Cônjuge',
  filho: 'Filho(a)',
  filha: 'Filha',
  pai: 'Pai',
  mae: 'Mãe',
  amigo: 'Amigo(a)',
  outro: 'Acompanhante',
};

function ageFromBirth(birthDate?: string): string {
  if (!birthDate) return '';
  const d = new Date(birthDate.length <= 10 ? birthDate + 'T12:00:00' : birthDate);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return String(a);
}

// ---------------------------------------------------------------------------
// Constrói as linhas (titular + acompanhantes/passageiros) de uma expedição
// ---------------------------------------------------------------------------
export async function buildExportRows(exp: Expedition): Promise<PersonRow[]> {
  const rows: PersonRow[] = [];
  const active = exp.enrollments.filter((e) => e.status !== 'cancelado');

  for (const enr of active) {
    const c = await clientsStore.get(enr.clientId);
    if (!c) continue;

    const shared = {
      phone: c.phone || c.whatsapp || '',
      email: c.email || '',
      cityState: [c.city, c.state].filter(Boolean).join('/'),
      address: [c.address, c.addressNumber, c.neighborhood, c.cep].filter(Boolean).join(', '),
      job: c.job || '',
      vehicle: c.vehicle?.model || '',
      plate: c.vehicle?.plate || '',
      roomConfig: c.roomConfig || '',
      pet: c.petInfo || '',
      emergency: c.emergencyContact?.name
        ? `${c.emergencyContact.name}${c.emergencyContact.phone ? ` (${c.emergencyContact.phone})` : ''}`
        : '',
      responsible: c.name,
    };

    // Titular
    rows.push({
      name: c.name,
      role: 'Titular',
      document: c.cpf || '',
      age: ageFromBirth(c.birthDate),
      birthDate: c.birthDate || '',
      shirt: (c.shirtSizes || []).join(' / '),
      notes: c.notes || '',
      passport: c.passportNumber || '',
      nationality: c.nationality || '',
      isChild: false,
      priceCategory: c.priceCategory,
      ...shared,
    });

    // Família (acompanhante + passageiros)
    for (const m of c.family || []) {
      rows.push({
        name: m.name,
        role: RELATION_LABEL[m.relation] || 'Acompanhante',
        document: m.document || '',
        age: ageFromBirth(m.birthDate),
        birthDate: m.birthDate || '',
        shirt: m.shirtSize || '',
        notes: '',
        passport: m.passportNumber || '',
        nationality: m.nationality || '',
        isChild: Boolean(m.isChild),
        priceCategory: m.priceCategory,
        ...shared,
      });
    }
  }

  return rows;
}

// Contexto de custo a partir da expedição
export function costContext(exp: Expedition): SupplierCostContext {
  const active = exp.enrollments.filter((e) => e.status !== 'cancelado');
  const adults = active.reduce((a, e) => a + e.adults, 0);
  const children = active.reduce((a, e) => a + e.children, 0);
  const cars = active.length;
  return { adults, children, cars, rooms: cars };
}

// ---------------------------------------------------------------------------
// Geração de CSV (uma pessoa por linha) + total a pagar ao fornecedor
// ---------------------------------------------------------------------------
function csvCell(v: string): string {
  const s = String(v ?? '');
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

export async function buildSupplierCSV(
  exp: Expedition,
  supplier: Supplier
): Promise<{ csv: string; filename: string; total: number; peopleCount: number }> {
  const fieldIds = (supplier.exportFields?.length ? supplier.exportFields : DEFAULT_EXPORT_FIELDS) as (keyof PersonRow)[];
  const cols = fieldIds
    .map((id) => EXPORT_FIELDS.find((f) => f.id === id))
    .filter((f): f is { id: keyof PersonRow; label: string } => Boolean(f));

  const rows = await buildExportRows(exp);
  const ctx = costContext(exp);

  // No modo "por pessoa" (legado), mostramos o valor que cada um paga (por
  // categoria) e o total = soma das linhas. No modo "por categoria", o total
  // vem das quantidades lançadas na expedição (mesma fonte do financeiro —
  // ver resolveSupplierCost). Nos demais modos, o total segue a regra do modo.
  const perPerson = supplier.billingMode === 'per_person';
  const perCategory = supplier.billingMode === 'per_category';
  const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const rowValue = (r: (typeof rows)[number]): { category: string; value: number } => {
    const cat = resolveCategory(supplier, {
      priceCategory: r.priceCategory,
      age: r.age ? Number(r.age) : null,
      isChild: r.isChild,
    });
    return { category: PRICE_CATEGORY_LABELS[cat], value: categoryPrice(supplier, cat) };
  };

  let total = resolveSupplierCost(supplier, exp, ctx);
  if (perPerson) total = rows.reduce((sum, r) => sum + rowValue(r).value, 0);

  const lines: string[] = [];
  // Cabeçalho de identificação
  lines.push([csvCell(`Fornecedor: ${supplier.name}`)].join(';'));
  lines.push([csvCell(`Expedição: ${exp.routeName}`)].join(';'));
  lines.push('');

  // Modo por categoria: mostra a quantidade × preço de cada categoria
  // contratada antes da lista de pessoas — é o que efetivamente compõe o
  // total (a lista de pessoas abaixo é só a relação/rooming list).
  if (perCategory) {
    const q = exp.supplierQuantities?.[supplier.id] || {};
    const isHotel = HOTEL_SUPPLIER_TYPES.includes(supplier.type);
    const pricing = isHotel ? supplier.hotelPricing : supplier.commonPricing;
    const keys = (isHotel
      ? ['single', 'casal', 'triplo', 'quadruplo', 'familia', 'adicional']
      : ['perPerson', 'casal', 'child0to5', 'child5to10', 'above10', 'senior']
    ) as (keyof SupplierCategoryQuantities)[];
    lines.push(['Categoria', 'Quantidade', 'Valor unit. (R$)', 'Subtotal (R$)'].map(csvCell).join(';'));
    for (const k of keys) {
      const qty = q[k] || 0;
      if (!qty) continue;
      const unit = (pricing as any)?.[k] || 0;
      lines.push(
        [CATEGORY_LABELS[k], String(qty), brl(unit), brl(qty * unit)].map(csvCell).join(';')
      );
    }
    lines.push('');
  }

  // Cabeçalho de colunas (+ Categoria/Valor no modo por pessoa legado)
  const header = cols.map((c) => c.label);
  if (perPerson) header.push('Categoria', 'Valor (R$)');
  lines.push(header.map(csvCell).join(';'));
  // Linhas de pessoas
  for (const r of rows) {
    const cells = cols.map((c) => String(r[c.id] ?? ''));
    if (perPerson) {
      const { category, value } = rowValue(r);
      cells.push(category, brl(value));
    }
    lines.push(cells.map(csvCell).join(';'));
  }
  // Totais
  lines.push('');
  lines.push([csvCell('Total de pessoas:'), csvCell(String(rows.length))].join(';'));
  lines.push(
    [
      csvCell(
        perPerson
          ? 'Valor total a pagar (soma por pessoa):'
          : `Valor total a pagar (${BILLING_LABELS[supplier.billingMode] || 'por pessoa'}):`
      ),
      csvCell(brl(total)),
    ].join(';')
  );

  // BOM para o Excel reconhecer UTF-8 (acentos)
  const csv = '﻿' + lines.join('\r\n');
  const filename = `${slug(supplier.name)}__${slug(exp.routeName)}.csv`;
  return { csv, filename, total, peopleCount: rows.length };
}
