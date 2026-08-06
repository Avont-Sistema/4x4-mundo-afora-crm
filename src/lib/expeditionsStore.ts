import { createCollection, type BaseRecord } from './jsonCollection';
import {
  suppliersStore,
  supplierCost as calcSupplierCost,
  categoryCost,
  BILLING_LABELS,
  type Supplier,
  type SupplierCategoryQuantities,
} from './suppliersStore';
import { type Client } from './clientsStore';

export type ExpeditionStatus =
  | 'planejamento'
  | 'aberta'
  | 'em_andamento'
  | 'fechada'
  | 'finalizada'
  | 'cancelada';

export type EnrollmentStatus = 'reservado' | 'confirmado' | 'cancelado';

export interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string; // pix, cartao, dinheiro, transferencia, link
  description?: string;
}

// Composição de uma matrícula (carro): base single/casal + passageiros
// adicionais no mesmo veículo, cobrados só pela faixa de idade (não importa
// o parentesco — amigo, pai/mãe, filho maior de 10 pagam a mesma faixa).
export type CarType = 'single' | 'casal';

export interface CarComposition {
  carType: CarType;
  // 2º casal inteiro dividindo o mesmo carro, com suíte própria (pacote fechado)
  secondCoupleSeparateSuite: boolean;
  extraChildUpTo5: number; // passageiros adicionais com menos de 5 anos
  extraChild5to10: number; // passageiros adicionais de 5 a 9 anos
  extraAbove10: number; // passageiros adicionais com 10 anos ou mais (qualquer parentesco)
}

export const emptyComposition: CarComposition = {
  carType: 'casal',
  secondCoupleSeparateSuite: false,
  extraChildUpTo5: 0,
  extraChild5to10: 0,
  extraAbove10: 0,
};

// Classifica a idade de um passageiro adicional na faixa de preço (ao
// completar o aniversário já entra na faixa de cima).
export function classifyChildAge(age: number): 'upTo5' | '5to10' | 'above10' {
  if (age < 5) return 'upTo5';
  if (age < 10) return '5to10';
  return 'above10';
}

export interface Enrollment {
  id: string;
  clientId: string;
  clientName: string; // desnormalizado para exibição rápida
  adults: number; // total de adultos (p/ custo de fornecedores)
  children: number; // total de crianças (p/ custo de fornecedores)
  composition: CarComposition; // base do cálculo de agreedPrice
  agreedPrice: number; // valor acordado para essa comitiva
  payments: Payment[];
  observations?: string;
  status: EnrollmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ManualCost {
  id: string;
  label: string;
  amount: number;
  date: string;
}

export interface Expedition extends BaseRecord {
  routeName: string; // nome do roteiro
  sector?: string; // setor/categoria para agrupar receitas (ex: "Expedições 4x4")
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  slots: number; // vagas
  // Tabela de preços por carro (ver CarComposition) — substitui o antigo
  // pricePerPerson/pricePerChild único.
  priceSingle: number; // individual (1 pessoa no carro)
  priceCouple: number; // casal/dupla (2 pessoas no carro) — valor fechado, não é single + adicional
  priceChildUpTo5: number; // passageiro adicional até 5 anos
  priceChild5to10: number; // passageiro adicional de 5 a 10 anos
  priceAbove10: number; // passageiro adicional acima de 10 anos (qualquer parentesco)
  priceSecondCoupleSuite: number; // adicional 2º casal no mesmo carro + suíte separada
  revenueGoal: number; // meta de faturamento total (manual, usada só antes de haver matrículas)
  status: ExpeditionStatus;
  closedAt?: string; // data de fechamento da expedição
  supplierIds: string[]; // fornecedores configurados no projeto
  // Quantidades por categoria (billingMode 'per_category'), lançadas uma vez
  // pra expedição inteira — ver SupplierCategoryQuantities. Chave = supplier.id.
  supplierQuantities?: Record<string, SupplierCategoryQuantities>;
  manualCosts: ManualCost[]; // custos avulsos
  enrollments: Enrollment[]; // clientes do projeto
}

// Calcula o valor de um carro a partir da tabela de preços da expedição.
export function computeCarPrice(exp: Expedition, c: CarComposition): number {
  let total = c.carType === 'single' ? exp.priceSingle : exp.priceCouple;
  if (c.secondCoupleSeparateSuite) total += exp.priceSecondCoupleSuite;
  total += c.extraChildUpTo5 * exp.priceChildUpTo5;
  total += c.extraChild5to10 * exp.priceChild5to10;
  total += c.extraAbove10 * exp.priceAbove10;
  return total;
}

// Totais de adultos/crianças da composição, usados para custo de
// fornecedores (que cobram por adulto/criança, não pelas 6 faixas).
export function compositionParty(c: CarComposition): { adults: number; children: number } {
  const baseAdults = c.carType === 'single' ? 1 : 2;
  const secondCoupleAdults = c.secondCoupleSeparateSuite ? 2 : 0;
  return {
    adults: baseAdults + secondCoupleAdults + c.extraAbove10,
    children: c.extraChildUpTo5 + c.extraChild5to10,
  };
}

// Converte uma contagem simples (adultos/crianças, sem idade individual) numa
// CarComposition best-effort — usado por fluxos que ainda não coletam a
// composição detalhada (bot de WhatsApp, agente IA, importação de planilha).
// Crianças sem idade conhecida caem na faixa intermediária (5 a 10) como
// estimativa razoável; a equipe pode ajustar o valor depois pelo dashboard.
export function compositionFromCounts(adults: number, children: number): CarComposition {
  return {
    carType: adults >= 2 ? 'casal' : 'single',
    secondCoupleSeparateSuite: false,
    extraChildUpTo5: 0,
    extraChild5to10: children,
    extraAbove10: Math.max(0, adults - 2),
  };
}

// Mesma ideia, mas quando se conhece a idade de cada acompanhante (ex.:
// importação de planilha) — o primeiro acompanhante não-criança preenche a
// vaga do casal; os demais (e crianças antes disso) viram passageiro
// adicional pela faixa de idade.
export function compositionFromPeople(
  companions: { age?: number; isChild?: boolean }[]
): CarComposition {
  const comp: CarComposition = {
    carType: 'single',
    secondCoupleSeparateSuite: false,
    extraChildUpTo5: 0,
    extraChild5to10: 0,
    extraAbove10: 0,
  };
  let usedCoupleSlot = false;
  for (const p of companions) {
    if (!usedCoupleSlot && !p.isChild) {
      comp.carType = 'casal';
      usedCoupleSlot = true;
      continue;
    }
    if (p.age === undefined) {
      comp.extraAbove10++;
      continue;
    }
    const bracket = classifyChildAge(p.age);
    if (bracket === 'upTo5') comp.extraChildUpTo5++;
    else if (bracket === '5to10') comp.extraChild5to10++;
    else comp.extraAbove10++;
  }
  return comp;
}

function seed(): Expedition[] {
  const ts = new Date().toISOString();
  return [
    {
      id: crypto.randomUUID(),
      routeName: 'Lençóis Maranhenses — Travessia Completa',
      description: 'Expedição de 6 dias pelos lençóis, lagoas e dunas.',
      location: 'Barreirinhas, MA',
      startDate: '2026-07-15',
      endDate: '2026-07-20',
      slots: 12,
      priceSingle: 2999,
      priceCouple: 4699,
      priceChildUpTo5: 599,
      priceChild5to10: 899,
      priceAbove10: 999,
      priceSecondCoupleSuite: 3599,
      revenueGoal: 30000,
      status: 'aberta',
      supplierIds: [],
      manualCosts: [],
      enrollments: [],
      createdAt: ts,
      updatedAt: ts,
    },
  ];
}

export const expeditionsStore = createCollection<Expedition>('expeditions', seed);

// Matricula um cliente numa expedição (reutilizado pela API e pelo formulário público).
// Calcula agreedPrice a partir da composição do carro, salvo se vier um valor manual.
export async function enrollClient(
  exp: Expedition,
  client: Client,
  opts: {
    composition?: Partial<CarComposition>;
    agreedPrice?: number;
    observations?: string;
  } = {}
): Promise<{ enrollment?: Enrollment; error?: string }> {
  const composition: CarComposition = { ...emptyComposition, ...opts.composition };
  const { adults, children } = compositionParty(composition);
  const agreedPrice = opts.agreedPrice ?? computeCarPrice(exp, composition);
  const now = new Date().toISOString();
  const enrollment: Enrollment = {
    id: crypto.randomUUID(),
    clientId: client.id,
    clientName: client.name,
    adults,
    children,
    composition,
    agreedPrice,
    payments: [],
    observations: opts.observations || '',
    status: 'reservado',
    createdAt: now,
    updatedAt: now,
  };

  // A checagem de "já matriculado" e a inserção acontecem dentro do
  // touchWith, sobre o registro mais recente do banco — evita que duas
  // inscrições concorrentes (ex.: dois clientes no mesmo formulário quase ao
  // mesmo tempo) se percam uma pisando na outra.
  let duplicate = false;
  const updated = await expeditionsStore.touchWith(exp.id, (fresh) => {
    if (fresh.enrollments.some((e) => e.clientId === client.id && e.status !== 'cancelado')) {
      duplicate = true;
      return;
    }
    fresh.enrollments.push(enrollment);
  });
  if (duplicate) return { error: 'Cliente já está nesta expedição' };
  if (!updated) return { error: 'Expedição não encontrada' };
  return { enrollment };
}

// ---------------------------------------------------------------------------
// Cálculos financeiros do projeto
// ---------------------------------------------------------------------------

export interface ExpeditionFinance {
  totalAdults: number;
  totalChildren: number;
  totalParticipants: number;
  cars: number; // carros matriculados (1 matrícula = 1 carro/comitiva)
  slotsAvailable: number; // vagas (carros) ainda livres
  avgTicketPerCar: number; // ticket médio por carro (faturamento contratado / carros)
  // faturamento
  revenueGoal: number; // meta manual
  contractedRevenue: number; // soma dos valores acordados (matrículas ativas)
  // recebimentos
  totalPaid: number;
  totalPending: number;
  // custos
  supplierCost: number;
  manualCostTotal: number;
  totalCost: number;
  // lucro
  profit: number;
  profitMargin: number; // %
  // progressão de pagamento do projeto (sobre o faturamento contratado)
  paymentProgress: number; // %
}

// Decide entre o cálculo legado (ctx agregado: adultos/crianças/carros/quartos)
// e o cálculo por categoria (quantidades lançadas na expedição para este
// fornecedor) — fonte única usada por computeFinance, geração de contas a
// pagar e planilha do fornecedor, pra nunca divergir entre as telas.
export function resolveSupplierCost(
  s: Supplier,
  exp: Expedition,
  ctx: { adults: number; children: number; cars: number; rooms: number }
): number {
  if (s.billingMode === 'per_category') {
    return categoryCost(s, exp.supplierQuantities?.[s.id] || {});
  }
  return calcSupplierCost(s, ctx);
}

export function computeFinance(
  exp: Expedition,
  suppliers: Supplier[]
): ExpeditionFinance {
  const active = exp.enrollments.filter((e) => e.status !== 'cancelado');

  const totalAdults = active.reduce((a, e) => a + e.adults, 0);
  const totalChildren = active.reduce((a, e) => a + e.children, 0);
  const totalParticipants = totalAdults + totalChildren;

  // cada matrícula = 1 carro/comitiva. As vagas da expedição são em carros.
  const cars = active.length;

  const contractedRevenue = active.reduce((a, e) => a + e.agreedPrice, 0);
  const avgTicketPerCar = cars > 0 ? contractedRevenue / cars : 0;
  const totalPaid = exp.enrollments.reduce(
    (a, e) => a + e.payments.reduce((s, p) => s + p.amount, 0),
    0
  );

  // base de faturamento usada para lucro/progressão:
  // usa o faturamento contratado se já houver matrículas; senão a meta manual
  const revenueBase =
    contractedRevenue > 0 ? contractedRevenue : exp.revenueGoal;

  const ctx = { adults: totalAdults, children: totalChildren, cars, rooms: cars };
  const used = suppliers.filter((s) => exp.supplierIds.includes(s.id));
  const supplierCost = used.reduce((a, s) => a + resolveSupplierCost(s, exp, ctx), 0);
  const manualCostTotal = exp.manualCosts.reduce((a, c) => a + c.amount, 0);
  const totalCost = supplierCost + manualCostTotal;

  const profit = revenueBase - totalCost;
  const profitMargin = revenueBase > 0 ? (profit / revenueBase) * 100 : 0;
  const paymentProgress =
    revenueBase > 0 ? (totalPaid / revenueBase) * 100 : 0;

  return {
    totalAdults,
    totalChildren,
    totalParticipants,
    cars,
    slotsAvailable: exp.slots - cars,
    avgTicketPerCar,
    revenueGoal: exp.revenueGoal,
    contractedRevenue,
    totalPaid,
    totalPending: Math.max(revenueBase - totalPaid, 0),
    supplierCost,
    manualCostTotal,
    totalCost,
    profit,
    profitMargin,
    paymentProgress,
  };
}

// Detalhe completo (expedição + fornecedores resolvidos + finanças + por-cliente)
export async function buildExpeditionDetail(exp: Expedition) {
  const allSuppliers = await suppliersStore.all();
  const finance = computeFinance(exp, allSuppliers);
  const suppliers = allSuppliers.filter((s) => exp.supplierIds.includes(s.id));

  const enrollments = exp.enrollments.map((e) => {
    const paid = e.payments.reduce((s, p) => s + p.amount, 0);
    return {
      ...e,
      paid,
      balance: Math.max(e.agreedPrice - paid, 0),
      progress: e.agreedPrice > 0 ? (paid / e.agreedPrice) * 100 : 0,
    };
  });

  // quanto se deve a cada fornecedor do projeto (conforme a regra de pagamento dele)
  const cars = exp.enrollments.filter((e) => e.status !== 'cancelado').length;
  const ctx = {
    adults: finance.totalAdults,
    children: finance.totalChildren,
    cars,
    rooms: cars,
  };
  const supplierBilling = suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    billingMode: s.billingMode || 'per_category',
    billingLabel: BILLING_LABELS[s.billingMode] || 'Por categoria',
    exportFieldCount: (s.exportFields || []).length,
    amount: resolveSupplierCost(s, exp, ctx),
  }));

  return { ...exp, suppliers, finance, enrollments, supplierBilling };
}
