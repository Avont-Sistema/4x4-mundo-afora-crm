import { clientsStore } from './clientsStore';
import {
  type Supplier,
  supplierCost,
  type SupplierCostContext,
  resolveCategory,
  categoryPrice,
  PRICE_CATEGORY_LABELS,
} from './suppliersStore';
import { type Expedition } from './expeditionsStore';
import {
  BILLING_LABELS,
  EXPORT_FIELDS,
  DEFAULT_EXPORT_FIELDS,
  type PersonRow,
} from './supplierFields';

export { EXPORT_FIELDS, DEFAULT_EXPORT_FIELDS, type PersonRow };

const RELATION_LABEL: Record<string, string> = {
  conjuge: 'Cônjuge',
  filho: 'Filho(a)',
  filha: 'Filha',
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

  // No modo "por pessoa", mostramos o valor que cada um paga (por categoria) e
  // o total = soma das linhas. Nos demais modos, o total segue a regra do modo.
  const perPerson = !supplier.billingMode || supplier.billingMode === 'per_person';
  const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const rowValue = (r: (typeof rows)[number]): { category: string; value: number } => {
    const cat = resolveCategory(supplier, {
      priceCategory: r.priceCategory,
      age: r.age ? Number(r.age) : null,
      isChild: r.isChild,
    });
    return { category: PRICE_CATEGORY_LABELS[cat], value: categoryPrice(supplier, cat) };
  };

  let total = supplierCost(supplier, ctx);
  if (perPerson) total = rows.reduce((sum, r) => sum + rowValue(r).value, 0);

  const lines: string[] = [];
  // Cabeçalho de identificação
  lines.push([csvCell(`Fornecedor: ${supplier.name}`)].join(';'));
  lines.push([csvCell(`Expedição: ${exp.routeName}`)].join(';'));
  lines.push('');
  // Cabeçalho de colunas (+ Categoria/Valor quando por pessoa)
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
