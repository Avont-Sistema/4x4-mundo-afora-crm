import { createCollection, type BaseRecord } from './jsonCollection';
import { type BillingMode, BILLING_LABELS } from './supplierFields';
import type { PriceCategory } from './clientsStore';

// re-exporta para manter compatibilidade com quem importa daqui
export { BILLING_LABELS };
export type { BillingMode };

export type SupplierType =
  | 'hotel'
  | 'restaurante'
  | 'transporte'
  | 'guia'
  | 'passeio'
  | 'outro';

export interface Supplier extends BaseRecord {
  name: string;
  type: SupplierType;
  email?: string;
  phone?: string;
  address?: string;
  // Regra de pagamento e custos pré-configurados que alimentam o custo das expedições
  billingMode: BillingMode;
  costPerPerson: number; // custo por adulto (modo per_person)
  costPerChild: number; // custo por criança (modo per_person)
  costPerStudent?: number; // custo por estudante (modo per_person)
  costPerSenior?: number; // custo por idoso (modo per_person)
  childMaxAge?: number; // criança: idade até (anos). Default 12
  seniorMinAge?: number; // idoso: idade a partir de (anos). Default 60
  costPerCar: number; // custo por carro (modo per_car)
  costPerRoom: number; // custo por quarto (modo per_room)
  flatFee: number; // valor fixo da expedição (modo flat)
  // Quais colunas de dados dos clientes vão na planilha deste fornecedor
  exportFields: string[];
  rating: number;
  notes?: string;
}

// Contexto da expedição para calcular quanto se deve a um fornecedor
export interface SupplierCostContext {
  adults: number;
  children: number;
  cars: number; // nº de matrículas (carros) ativas
  rooms: number; // nº de quartos reservados (simplificado: 1 por matrícula)
}

export const DEFAULT_CHILD_MAX_AGE = 12;
export const DEFAULT_SENIOR_MIN_AGE = 60;

export const PRICE_CATEGORY_LABELS: Record<PriceCategory, string> = {
  adulto: 'Adulto',
  crianca: 'Criança',
  estudante: 'Estudante',
  idoso: 'Idoso',
};

// Preço do tarifário (modo per_person) para uma categoria
export function categoryPrice(s: Supplier, cat: PriceCategory): number {
  switch (cat) {
    case 'crianca':
      return s.costPerChild || 0;
    case 'estudante':
      return s.costPerStudent || 0;
    case 'idoso':
      return s.costPerSenior || 0;
    case 'adulto':
    default:
      return s.costPerPerson || 0;
  }
}

// Resolve a categoria de uma pessoa: usa a categoria manual se houver; senão
// deduz por idade (criança até childMaxAge, idoso a partir de seniorMinAge).
export function resolveCategory(
  s: Supplier,
  opts: { priceCategory?: PriceCategory; age?: number | null; isChild?: boolean }
): PriceCategory {
  if (opts.priceCategory) return opts.priceCategory;
  if (opts.isChild) return 'crianca';
  const childMax = s.childMaxAge ?? DEFAULT_CHILD_MAX_AGE;
  const seniorMin = s.seniorMinAge ?? DEFAULT_SENIOR_MIN_AGE;
  if (opts.age != null && !Number.isNaN(opts.age)) {
    if (opts.age <= childMax) return 'crianca';
    if (opts.age >= seniorMin) return 'idoso';
  }
  return 'adulto';
}

// Quanto se deve a um fornecedor numa expedição, conforme a regra de pagamento dele
export function supplierCost(s: Supplier, ctx: SupplierCostContext): number {
  switch (s.billingMode) {
    case 'per_car':
      return (s.costPerCar || 0) * ctx.cars;
    case 'flat':
      return s.flatFee || 0;
    case 'per_room':
      return (s.costPerRoom || 0) * ctx.rooms;
    case 'per_person':
    default:
      return (s.costPerPerson || 0) * ctx.adults + (s.costPerChild || 0) * ctx.children;
  }
}

function seed(): Supplier[] {
  const ts = new Date().toISOString();
  return [
    {
      id: crypto.randomUUID(),
      name: 'Hotel Lençol Branco',
      type: 'hotel',
      email: 'reservas@lencolbranco.com',
      phone: '+5598999990001',
      address: 'Barreirinhas, MA',
      billingMode: 'per_person',
      costPerPerson: 350,
      costPerChild: 180,
      costPerCar: 0,
      costPerRoom: 0,
      flatFee: 0,
      exportFields: ['name', 'role', 'document', 'age', 'roomConfig', 'responsible'],
      rating: 4.8,
      notes: 'Diária com café da manhã incluso',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: crypto.randomUUID(),
      name: 'Restaurante Sabor do Sertão',
      type: 'restaurante',
      phone: '+5598988880002',
      billingMode: 'per_person',
      costPerPerson: 90,
      costPerChild: 45,
      costPerCar: 0,
      costPerRoom: 0,
      flatFee: 0,
      exportFields: ['name', 'role', 'age', 'notes'],
      rating: 4.5,
      notes: 'Almoço e jantar',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: crypto.randomUUID(),
      name: 'Transporte 4x4 Aventura',
      type: 'transporte',
      phone: '+5598977770003',
      billingMode: 'per_car',
      costPerPerson: 0,
      costPerChild: 0,
      costPerCar: 600,
      costPerRoom: 0,
      flatFee: 0,
      exportFields: ['name', 'role', 'vehicle', 'plate', 'responsible'],
      rating: 4.9,
      notes: 'Traslado em veículos 4x4',
      createdAt: ts,
      updatedAt: ts,
    },
  ];
}

export const suppliersStore = createCollection<Supplier>('suppliers', seed);
