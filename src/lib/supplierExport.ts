import { clientsStore } from './clientsStore';
import { type Supplier, supplierCost, type SupplierCostContext } from './suppliersStore';
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
export function buildExportRows(exp: Expedition): PersonRow[] {
  const rows: PersonRow[] = [];
  const active = exp.enrollments.filter((e) => e.status !== 'cancelado');

  for (const enr of active) {
    const c = clientsStore.get(enr.clientId);
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

export function buildSupplierCSV(
  exp: Expedition,
  supplier: Supplier
): { csv: string; filename: string; total: number; peopleCount: number } {
  const fieldIds = (supplier.exportFields?.length ? supplier.exportFields : DEFAULT_EXPORT_FIELDS) as (keyof PersonRow)[];
  const cols = fieldIds
    .map((id) => EXPORT_FIELDS.find((f) => f.id === id))
    .filter((f): f is { id: keyof PersonRow; label: string } => Boolean(f));

  const rows = buildExportRows(exp);
  const ctx = costContext(exp);
  const total = supplierCost(supplier, ctx);

  const lines: string[] = [];
  // Cabeçalho de identificação
  lines.push([csvCell(`Fornecedor: ${supplier.name}`)].join(';'));
  lines.push([csvCell(`Expedição: ${exp.routeName}`)].join(';'));
  lines.push('');
  // Cabeçalho de colunas
  lines.push(cols.map((c) => csvCell(c.label)).join(';'));
  // Linhas de pessoas
  for (const r of rows) {
    lines.push(cols.map((c) => csvCell(String(r[c.id] ?? ''))).join(';'));
  }
  // Totais
  lines.push('');
  lines.push([csvCell('Total de pessoas:'), csvCell(String(rows.length))].join(';'));
  lines.push(
    [
      csvCell(`Valor total a pagar (${BILLING_LABELS[supplier.billingMode] || 'por pessoa'}):`),
      csvCell(
        total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      ),
    ].join(';')
  );

  // BOM para o Excel reconhecer UTF-8 (acentos)
  const csv = '﻿' + lines.join('\r\n');
  const filename = `${slug(supplier.name)}__${slug(exp.routeName)}.csv`;
  return { csv, filename, total, peopleCount: rows.length };
}
