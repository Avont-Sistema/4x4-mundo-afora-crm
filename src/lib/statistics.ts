import { expeditionsStore, computeFinance } from './expeditionsStore';
import { suppliersStore } from './suppliersStore';
import { clientsStore } from './clientsStore';
import { getLeads } from './leadsStore';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function monthKey(dateStr?: string): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr.length <= 10 ? dateStr + 'T12:00:00' : dateStr);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return `${MONTHS[Number(m) - 1]}/${y.slice(2)}`;
}

export async function buildStatistics() {
  const expeditions = await expeditionsStore.all();
  const suppliers = await suppliersStore.all();
  const clients = await clientsStore.all();
  const leads = await getLeads();

  // ── Por expedição ──
  const perExp = expeditions.map((e) => {
    const f = computeFinance(e, suppliers);
    const lucro = f.contractedRevenue - f.totalCost;
    return {
      id: e.id,
      name: e.routeName,
      sector: e.sector?.trim() || e.routeName,
      status: e.status,
      slots: e.slots, // vagas = carros
      cars: f.cars,
      participants: f.totalParticipants, // pessoas (informativo)
      occupancy: e.slots > 0 ? (f.cars / e.slots) * 100 : 0,
      contratado: f.contractedRevenue,
      recebido: f.totalPaid,
      custo: f.totalCost,
      lucro,
      margem: f.contractedRevenue > 0 ? (lucro / f.contractedRevenue) * 100 : 0,
      clientes: f.cars,
    };
  });

  const sum = (arr: any[], k: string) => arr.reduce((a, x) => a + x[k], 0);

  const totalContratado = sum(perExp, 'contratado');
  const totalRecebido = sum(perExp, 'recebido');
  const totalCusto = sum(perExp, 'custo');
  const totalLucro = totalContratado - totalCusto;
  const totalMatriculas = sum(perExp, 'clientes'); // = carros matriculados
  const totalVagas = sum(perExp, 'slots'); // capacidade total em carros
  const totalCarros = sum(perExp, 'cars');
  const totalParticipantes = sum(perExp, 'participants'); // pessoas

  // ── Faturamento mensal (recebido por mês + contratado por mês de início) ──
  const monthly = new Map<string, { key: string; label: string; recebido: number; contratado: number }>();
  const mref = (key: string) => {
    if (!monthly.has(key)) monthly.set(key, { key, label: monthLabel(key), recebido: 0, contratado: 0 });
    return monthly.get(key)!;
  };
  for (const e of expeditions) {
    const mkStart = monthKey(e.startDate);
    const f = computeFinance(e, suppliers);
    if (mkStart) mref(mkStart).contratado += f.contractedRevenue;
    for (const enr of e.enrollments) {
      for (const p of enr.payments) {
        const mk = monthKey(p.date);
        if (mk) mref(mk).recebido += p.amount;
      }
    }
  }
  const monthlyRevenue = [...monthly.values()].sort((a, b) => a.key.localeCompare(b.key));

  // ── Leads ──
  const totalLeads = leads.length;
  const convertidos = leads.filter((l) => l.stage === 'finalizado').length;
  const bySourceMap = new Map<string, number>();
  const byStageMap = new Map<string, number>();
  let pipelineValue = 0;
  for (const l of leads) {
    bySourceMap.set(l.source, (bySourceMap.get(l.source) || 0) + 1);
    byStageMap.set(l.stage, (byStageMap.get(l.stage) || 0) + 1);
    if (l.stage !== 'finalizado') pipelineValue += l.value || 0;
  }
  const leadsBySource = [...bySourceMap.entries()].map(([name, value]) => ({ name, value }));
  const stageOrder = ['novo', 'em_atendimento', 'proposta_enviada', 'sem_resposta', 'finalizado'];
  const stageLabels: Record<string, string> = {
    novo: 'Novos',
    em_atendimento: 'Em Atendimento',
    proposta_enviada: 'Proposta Enviada',
    sem_resposta: 'Sem Resposta',
    finalizado: 'Finalizado',
  };
  const leadsByStage = stageOrder
    .map((s) => ({ stage: stageLabels[s], count: byStageMap.get(s) || 0 }))
    .filter((x) => x.count > 0);

  // ── Receita por setor ──
  const sectorMap = new Map<string, number>();
  for (const e of perExp) sectorMap.set(e.sector, (sectorMap.get(e.sector) || 0) + e.contratado);
  const sectorRevenue = [...sectorMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // ── Status das expedições ──
  const statusMap = new Map<string, number>();
  for (const e of expeditions) statusMap.set(e.status, (statusMap.get(e.status) || 0) + 1);
  const statusLabels: Record<string, string> = {
    planejamento: 'Planejamento',
    aberta: 'Aberta',
    em_andamento: 'Em Andamento',
    finalizada: 'Finalizada',
  };
  const expeditionsByStatus = [...statusMap.entries()].map(([s, value]) => ({
    name: statusLabels[s] || s,
    value,
  }));

  // ── Rankings ──
  const topProfit = [...perExp].sort((a, b) => b.lucro - a.lucro).slice(0, 6);
  const topCost = [...perExp].sort((a, b) => b.custo - a.custo).slice(0, 6);
  const occupancyRanking = [...perExp]
    .filter((e) => e.slots > 0)
    .sort((a, b) => b.occupancy - a.occupancy)
    .slice(0, 8);

  // ── Clientes ──
  const totalClientes = clients.length;
  const comFamilia = clients.filter((c) => (c.family?.length || 0) > 0).length;

  return {
    kpis: {
      totalExpeditions: expeditions.length,
      ativas: expeditions.filter((e) => e.status === 'aberta' || e.status === 'em_andamento').length,
      finalizadas: expeditions.filter((e) => e.status === 'finalizada').length,
      totalContratado,
      totalRecebido,
      totalCusto,
      totalLucro,
      margemMedia: totalContratado > 0 ? (totalLucro / totalContratado) * 100 : 0,
      ticketMedio: totalMatriculas > 0 ? totalContratado / totalMatriculas : 0,
      totalMatriculas,
      ocupacaoMedia: totalVagas > 0 ? (totalCarros / totalVagas) * 100 : 0,
      totalCarros,
      totalParticipantes,
      totalVagas,
      totalLeads,
      convertidos,
      taxaConversao: totalLeads > 0 ? (convertidos / totalLeads) * 100 : 0,
      pipelineValue,
      totalClientes,
      comFamilia,
      percentualRecebido: totalContratado > 0 ? (totalRecebido / totalContratado) * 100 : 0,
    },
    monthlyRevenue,
    topProfit,
    topCost,
    occupancyRanking,
    sectorRevenue,
    leadsBySource,
    leadsByStage,
    expeditionsByStatus,
    paymentSplit: [
      { name: 'Recebido', value: totalRecebido },
      { name: 'A Receber', value: Math.max(totalContratado - totalRecebido, 0) },
    ],
  };
}
