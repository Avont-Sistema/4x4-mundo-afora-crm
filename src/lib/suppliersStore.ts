import { createCollection, type BaseRecord } from './jsonCollection';
import { type BillingMode, BILLING_LABELS } from './supplierFields';
import type { PriceCategory } from './clientsStore';

// re-exporta para manter compatibilidade com quem importa daqui
export { BILLING_LABELS };
export type { BillingMode };

export type SupplierType =
  | 'hotel'
  | 'hotel_internacional'
  | 'restaurante'
  | 'transporte'
  | 'guia'
  | 'passeio'
  | 'outro';

// Tipos de fornecedor que contam como "hotel" para fins de formulário
// dinâmico (pedir configuração de quarto) — Feature 3.
export const HOTEL_SUPPLIER_TYPES: SupplierType[] = ['hotel', 'hotel_internacional'];

// Tarifário por categoria — fornecedor "comum" (restaurante, transporte, guia,
// passeio...). Mesmas faixas etárias já usadas na composição do carro da
// expedição (upTo5/5to10/above10, ver classifyChildAge em expeditionsStore),
// mais "casal" (par fechado, não é 2x por pessoa) e "idoso" (pela idade real).
export interface CommonCategoryPricing {
  perPerson: number; // avulso/single
  casal: number; // par (titular + acompanhante) — valor fechado
  child0to5: number;
  child5to10: number;
  above10: number;
  senior: number; // idoso, pela idade real (ver seniorMinAge)
}

// Tarifário por categoria — fornecedor tipo hotel: preço por quarto conforme
// ocupação, não por pessoa/idade.
export interface HotelCategoryPricing {
  single: number;
  casal: number;
  triplo: number;
  quadruplo: number;
  familia: number;
  adicional: number; // pessoa extra além da ocupação do pacote escolhido
}

export const EMPTY_COMMON_PRICING: CommonCategoryPricing = {
  perPerson: 0, casal: 0, child0to5: 0, child5to10: 0, above10: 0, senior: 0,
};
export const EMPTY_HOTEL_PRICING: HotelCategoryPricing = {
  single: 0, casal: 0, triplo: 0, quadruplo: 0, familia: 0, adicional: 0,
};

// Quantidade de cada categoria contratada numa expedição (billingMode
// 'per_category'), lançada uma vez para a expedição inteira — sugerida
// automaticamente a partir das matrículas, mas editável pela equipe pra bater
// com a fatura real do fornecedor. As chaves usadas dependem do tipo do
// fornecedor (comum usa perPerson/casal/child.../senior; hotel usa
// single/casal/triplo/quadruplo/familia/adicional — "casal" é compartilhado
// mas tem preço próprio em cada tarifário).
export interface SupplierCategoryQuantities {
  perPerson?: number;
  casal?: number;
  child0to5?: number;
  child5to10?: number;
  above10?: number;
  senior?: number;
  single?: number;
  triplo?: number;
  quadruplo?: number;
  familia?: number;
  adicional?: number;
}

export interface Supplier extends BaseRecord {
  name: string;
  type: SupplierType;
  email?: string;
  phone?: string;
  address?: string;
  // Regra de pagamento e custos pré-configurados que alimentam o custo das expedições
  billingMode: BillingMode;
  // Tarifário por categoria (modo per_category) — só um dos dois é usado,
  // conforme HOTEL_SUPPLIER_TYPES.includes(type)
  commonPricing?: CommonCategoryPricing;
  hotelPricing?: HotelCategoryPricing;
  costPerPerson: number; // custo por adulto (modo per_person, legado)
  costPerChild: number; // custo por criança (modo per_person, legado)
  costPerStudent?: number; // custo por estudante (modo per_person, legado)
  costPerSenior?: number; // custo por idoso (modo per_person, legado)
  childMaxAge?: number; // criança: idade até (anos). Default 12
  seniorMinAge?: number; // idoso: idade a partir de (anos). Default 60
  costPerCar: number; // custo por carro (modo per_car)
  costPerRoom: number; // custo por quarto (modo per_room, legado)
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
// Quando a idade real é conhecida, ela manda — a flag "isChild" (que reflete
// parentesco, ex. "filho" de 17 anos) só é usada como fallback sem idade.
export function resolveCategory(
  s: Supplier,
  opts: { priceCategory?: PriceCategory; age?: number | null; isChild?: boolean }
): PriceCategory {
  if (opts.priceCategory) return opts.priceCategory;
  const childMax = s.childMaxAge ?? DEFAULT_CHILD_MAX_AGE;
  const seniorMin = s.seniorMinAge ?? DEFAULT_SENIOR_MIN_AGE;
  if (opts.age != null && !Number.isNaN(opts.age)) {
    if (opts.age <= childMax) return 'crianca';
    if (opts.age >= seniorMin) return 'idoso';
    return 'adulto';
  }
  if (opts.isChild) return 'crianca';
  return 'adulto';
}

// Quanto se deve a um fornecedor numa expedição, conforme a regra de pagamento
// dele. Não cobre 'per_category' (precisa das quantidades lançadas na
// expedição, não cabem no ctx agregado) — ver resolveSupplierCost em
// expeditionsStore.ts, que é quem de fato decide entre este cálculo legado e
// categoryCost().
export function supplierCost(s: Supplier, ctx: SupplierCostContext): number {
  switch (s.billingMode) {
    case 'per_car':
      return (s.costPerCar || 0) * ctx.cars;
    case 'flat':
      return s.flatFee || 0;
    case 'per_room':
      return (s.costPerRoom || 0) * ctx.rooms;
    case 'per_category':
      return 0;
    case 'per_person':
    default:
      return (s.costPerPerson || 0) * ctx.adults + (s.costPerChild || 0) * ctx.children;
  }
}

// Custo por categoria (modo per_category) a partir das quantidades lançadas
// na expedição para este fornecedor. "casal" existe nos dois tarifários
// (comum e hotel) com preço próprio em cada um.
export function categoryCost(s: Supplier, q: SupplierCategoryQuantities): number {
  if (HOTEL_SUPPLIER_TYPES.includes(s.type)) {
    const p = s.hotelPricing || EMPTY_HOTEL_PRICING;
    return (
      (q.single || 0) * p.single +
      (q.casal || 0) * p.casal +
      (q.triplo || 0) * p.triplo +
      (q.quadruplo || 0) * p.quadruplo +
      (q.familia || 0) * p.familia +
      (q.adicional || 0) * p.adicional
    );
  }
  const p = s.commonPricing || EMPTY_COMMON_PRICING;
  return (
    (q.perPerson || 0) * p.perPerson +
    (q.casal || 0) * p.casal +
    (q.child0to5 || 0) * p.child0to5 +
    (q.child5to10 || 0) * p.child5to10 +
    (q.above10 || 0) * p.above10 +
    (q.senior || 0) * p.senior
  );
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
