import {
  expeditionsStore,
  computeFinance,
  type Expedition,
} from './expeditionsStore';
import { suppliersStore } from './suppliersStore';
import { payablesStore } from './payablesStore';

// ── Tipos de saída ──────────────────────────────────────────────────────────
export interface Receivable {
  expeditionId: string;
  expeditionName: string;
  sector: string;
  enrollmentId: string;
  clientName: string;
  total: number;
  paid: number;
  saldo: number;
  dueDate?: string;
  status: 'pago' | 'a_vencer' | 'vencido';
}

export interface IncomeEntry {
  date: string;
  payer: string;
  expeditionName: string;
  sector: string;
  amount: number;
  method: string;
}

export interface CashflowMonth {
  month: string; // YYYY-MM
  label: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

export interface SectorRevenue {
  sector: string;
  contratado: number;
  recebido: number;
  custo: number;
  lucro: number;
}

export interface ExpeditionRevenue {
  expeditionId: string;
  expeditionName: string;
  sector: string;
  status: string;
  contratado: number;
  recebido: number;
  aReceber: number;
  custo: number;
  lucro: number;
  margem: number;
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function sectorOf(e: Expedition): string {
  return e.sector?.trim() || e.routeName;
}

function monthKey(dateStr?: string): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr.length <= 10 ? dateStr + 'T12:00:00' : dateStr);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function buildFinanceSummary(opts: { month?: string } = {}) {
  const { month } = opts; // "YYYY-MM" or undefined for all-time
  const allExpeditions = await expeditionsStore.all();
  const suppliers = await suppliersStore.all();
  const allPayables = await payablesStore.all();
  const today = new Date();

  // When month is provided, scope to expeditions starting in that month
  const expeditions = month
    ? allExpeditions.filter((e) => e.startDate && monthKey(e.startDate) === month)
    : allExpeditions;

  // Payables filtered by due date month when scoped
  const payables = month
    ? allPayables.filter((p) => {
        const d = p.dueDate || p.paidAt;
        return d && monthKey(d) === month;
      })
    : allPayables;

  const receivables: Receivable[] = [];
  const income: IncomeEntry[] = [];
  const expeditionRevenue: ExpeditionRevenue[] = [];
  const sectorMap = new Map<string, SectorRevenue>();
  const cashflow = new Map<string, CashflowMonth>();

  let totalAReceber = 0;
  let totalRecebido = 0;
  let totalContratado = 0;
  let totalCustoPrevisto = 0;
  let totalVencido = 0;
  let previsaoPotencial = 0;

  function cf(key: string): CashflowMonth {
    if (!cashflow.has(key)) {
      const [y, m] = key.split('-');
      cashflow.set(key, {
        month: key,
        label: `${MONTHS[Number(m) - 1]}/${y.slice(2)}`,
        entradas: 0,
        saidas: 0,
        saldo: 0,
      });
    }
    return cashflow.get(key)!;
  }

  for (const exp of expeditions) {
    const fin = computeFinance(exp, suppliers);
    const sector = sectorOf(exp);
    const active = exp.enrollments.filter((e) => e.status !== 'cancelado');

    let expRecebido = 0;
    for (const enr of active) {
      const paid = enr.payments.reduce((s, p) => s + p.amount, 0);
      const saldo = Math.max(enr.agreedPrice - paid, 0);
      expRecebido += paid;

      // status do recebível
      const due = exp.startDate;
      let status: Receivable['status'] = 'a_vencer';
      if (saldo <= 0) status = 'pago';
      else if (due && new Date(due + 'T23:59:59') < today) status = 'vencido';

      receivables.push({
        expeditionId: exp.id,
        expeditionName: exp.routeName,
        sector,
        enrollmentId: enr.id,
        clientName: enr.clientName,
        total: enr.agreedPrice,
        paid,
        saldo,
        dueDate: due,
        status,
      });

      if (saldo > 0) totalAReceber += saldo;
      if (status === 'vencido') totalVencido += saldo;

      // entradas (income) por pagamento
      for (const p of enr.payments) {
        income.push({
          date: p.date,
          payer: enr.clientName,
          expeditionName: exp.routeName,
          sector,
          amount: p.amount,
          method: p.method,
        });
        const mk = monthKey(p.date);
        if (mk) cf(mk).entradas += p.amount;
      }
    }

    totalRecebido += expRecebido;
    totalContratado += fin.contractedRevenue;
    totalCustoPrevisto += fin.totalCost;

    // previsão: potencial das vagas (carros) ainda livres.
    // Não há valor fixo por vaga — cada carro negocia o próprio preço com nº
    // variável de acompanhantes. Estimamos pelo ticket médio por carro já
    // contratado nesta expedição (0 enquanto não houver matrículas).
    if (exp.status !== 'finalizada') {
      previsaoPotencial += Math.max(fin.slotsAvailable, 0) * fin.avgTicketPerCar;
    }

    // saídas: custos avulsos (com data) entram no fluxo de caixa
    for (const c of exp.manualCosts) {
      const mk = monthKey(c.date);
      if (mk) cf(mk).saidas += c.amount;
    }

    // receita por expedição
    expeditionRevenue.push({
      expeditionId: exp.id,
      expeditionName: exp.routeName,
      sector,
      status: exp.status,
      contratado: fin.contractedRevenue,
      recebido: expRecebido,
      aReceber: Math.max(fin.contractedRevenue - expRecebido, 0),
      custo: fin.totalCost,
      lucro: fin.contractedRevenue - fin.totalCost,
      margem:
        fin.contractedRevenue > 0
          ? ((fin.contractedRevenue - fin.totalCost) / fin.contractedRevenue) * 100
          : 0,
    });

    // por setor
    const s = sectorMap.get(sector) || {
      sector,
      contratado: 0,
      recebido: 0,
      custo: 0,
      lucro: 0,
    };
    s.contratado += fin.contractedRevenue;
    s.recebido += expRecebido;
    s.custo += fin.totalCost;
    s.lucro += fin.contractedRevenue - fin.totalCost;
    sectorMap.set(sector, s);
  }

  // contas a pagar (ledger) → saídas no fluxo de caixa quando pagas
  let totalAPagar = 0;
  let totalPagoFornecedores = 0;
  for (const pay of payables) {
    if (pay.status === 'pendente') {
      totalAPagar += pay.amount;
    } else if (pay.status === 'pago') {
      totalPagoFornecedores += pay.amount;
      const mk = monthKey(pay.paidAt || pay.dueDate);
      if (mk) cf(mk).saidas += pay.amount;
    }
  }

  // ordena e calcula saldo do fluxo
  const cashflowArr = [...cashflow.values()].sort((a, b) => a.month.localeCompare(b.month));
  let running = 0;
  for (const m of cashflowArr) {
    m.saldo = m.entradas - m.saidas;
    running += m.saldo;
  }

  receivables.sort((a, b) => {
    const order = { vencido: 0, a_vencer: 1, pago: 2 };
    return order[a.status] - order[b.status] || b.saldo - a.saldo;
  });
  income.sort((a, b) => (a.date < b.date ? 1 : -1));

  return {
    kpis: {
      aReceber: totalAReceber,
      vencido: totalVencido,
      recebido: totalRecebido,
      aPagar: totalAPagar,
      pagoFornecedores: totalPagoFornecedores,
      contratado: totalContratado,
      custoPrevisto: totalCustoPrevisto,
      previsaoPotencial,
      previsaoTotal: totalContratado + previsaoPotencial,
      lucroPrevisto: totalContratado - totalCustoPrevisto,
      saldoCaixa: running,
    },
    receivables,
    income: income.slice(0, 100),
    cashflow: cashflowArr,
    sectors: [...sectorMap.values()].sort((a, b) => b.contratado - a.contratado),
    expeditionRevenue: expeditionRevenue.sort((a, b) => b.contratado - a.contratado),
  };
}
