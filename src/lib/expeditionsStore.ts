import { createCollection, type BaseRecord } from './jsonCollection';
import { suppliersStore, type Supplier } from './suppliersStore';

export type ExpeditionStatus =
  | 'planejamento'
  | 'aberta'
  | 'em_andamento'
  | 'finalizada';

export type EnrollmentStatus = 'reservado' | 'confirmado' | 'cancelado';

export interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string; // pix, cartao, dinheiro, transferencia, link
  description?: string;
}

export interface Enrollment {
  id: string;
  clientId: string;
  clientName: string; // desnormalizado para exibição rápida
  adults: number;
  children: number;
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
  pricePerPerson: number; // preço por adulto
  pricePerChild: number; // preço por criança
  revenueGoal: number; // meta de faturamento total (manual)
  status: ExpeditionStatus;
  supplierIds: string[]; // fornecedores configurados no projeto
  manualCosts: ManualCost[]; // custos avulsos
  enrollments: Enrollment[]; // clientes do projeto
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
      pricePerPerson: 2500,
      pricePerChild: 1500,
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

// ---------------------------------------------------------------------------
// Cálculos financeiros do projeto
// ---------------------------------------------------------------------------

export interface ExpeditionFinance {
  totalAdults: number;
  totalChildren: number;
  totalParticipants: number;
  slotsAvailable: number;
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

export function computeFinance(
  exp: Expedition,
  suppliers: Supplier[]
): ExpeditionFinance {
  const active = exp.enrollments.filter((e) => e.status !== 'cancelado');

  const totalAdults = active.reduce((a, e) => a + e.adults, 0);
  const totalChildren = active.reduce((a, e) => a + e.children, 0);
  const totalParticipants = totalAdults + totalChildren;

  const contractedRevenue = active.reduce((a, e) => a + e.agreedPrice, 0);
  const totalPaid = exp.enrollments.reduce(
    (a, e) => a + e.payments.reduce((s, p) => s + p.amount, 0),
    0
  );

  // base de faturamento usada para lucro/progressão:
  // usa o faturamento contratado se já houver matrículas; senão a meta manual
  const revenueBase =
    contractedRevenue > 0 ? contractedRevenue : exp.revenueGoal;

  const used = suppliers.filter((s) => exp.supplierIds.includes(s.id));
  const supplierCost = used.reduce(
    (a, s) => a + s.costPerPerson * totalAdults + s.costPerChild * totalChildren,
    0
  );
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
    slotsAvailable: exp.slots - totalParticipants,
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
export function buildExpeditionDetail(exp: Expedition) {
  const allSuppliers = suppliersStore.all();
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

  return { ...exp, suppliers, finance, enrollments };
}
