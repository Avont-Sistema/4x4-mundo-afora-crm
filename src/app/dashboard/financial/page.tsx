'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  RefreshCw,
  Plus,
  Check,
  Trash2,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatBRL, formatDate } from '@/lib/format';

type Tab = 'geral' | 'receber' | 'pagar' | 'fluxo' | 'setor';
type Period = 'geral' | 'mes';

const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function nowMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function shiftMonth(m: string, delta: number): string {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function labelMonth(m: string): string {
  const [y, mo] = m.split('-').map(Number);
  return `${MONTHS_SHORT[mo - 1]} ${y}`;
}

export default function FinancialPage() {
  const [tab, setTab] = useState<Tab>('geral');
  const [period, setPeriod] = useState<Period>('geral');
  const [month, setMonth] = useState(nowMonth);
  const [data, setData] = useState<any>(null);
  const [payables, setPayables] = useState<any[]>([]);
  const [expeditions, setExpeditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = period === 'mes' ? `?month=${month}` : '';
    const [s, p, e] = await Promise.all([
      fetch(`/api/finance/summary${qs}`).then((r) => r.json()),
      fetch('/api/payables').then((r) => r.json()),
      fetch('/api/expeditions').then((r) => r.json()),
    ]);
    setData(s);
    setPayables(p.payables || []);
    setExpeditions(e.expeditions || []);
    setLoading(false);
  }, [period, month]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !data) {
    return (
      <div className="text-center py-20 text-gray-400">
        <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" /> Carregando financeiro...
      </div>
    );
  }

  const k = data.kpis;

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-4xl font-bold">Financeiro</h1>
          <p className="text-gray-500 text-sm mt-1">
            {period === 'mes'
              ? `Expedições de ${labelMonth(month)}`
              : 'Visão geral de todas as expedições'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Período */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(['geral', 'mes'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  period === p ? 'bg-yellow-400 text-black' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {p === 'geral' ? 'Geral' : 'Por Mês'}
              </button>
            ))}
          </div>

          {/* Navegação de mês */}
          {period === 'mes' && (
            <div className="flex items-center gap-1 border border-gray-200 rounded-lg bg-white">
              <button
                onClick={() => setMonth((m) => shiftMonth(m, -1))}
                className="p-1.5 hover:bg-gray-50 rounded-l-lg"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 text-sm font-medium w-20 text-center">{labelMonth(month)}</span>
              <button
                onClick={() => setMonth((m) => shiftMonth(m, 1))}
                className="p-1.5 hover:bg-gray-50 rounded-r-lg"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          <Link href="/dashboard/statistics" className="btn btn-primary flex items-center gap-2">
            <BarChart3 size={18} /> Estatísticas
          </Link>
          <button onClick={load} className="btn btn-secondary flex items-center gap-2">
            <RefreshCw size={18} /> Atualizar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi
          title="A Receber"
          value={formatBRL(k.aReceber)}
          icon={<Wallet className="text-amber-600" />}
          sub={k.vencido > 0 ? `${formatBRL(k.vencido)} vencido` : 'em dia'}
          subColor={k.vencido > 0 ? 'text-rose-600' : 'text-emerald-600'}
          highlight
        />
        <Kpi title="Recebido" value={formatBRL(k.recebido)} icon={<TrendingUp className="text-emerald-600" />} />
        <Kpi title="A Pagar" value={formatBRL(k.aPagar)} icon={<TrendingDown className="text-rose-600" />} />
        <Kpi
          title="Previsão Faturamento"
          value={formatBRL(k.previsaoTotal)}
          icon={<Target className="text-amber-600" />}
          sub={`${formatBRL(k.contratado)} contratado`}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-200 mb-6 overflow-x-auto">
        {[
          { k: 'geral', label: 'Visão Geral' },
          { k: 'receber', label: 'A Receber' },
          { k: 'pagar', label: 'A Pagar' },
          { k: 'fluxo', label: 'Fluxo de Caixa' },
          { k: 'setor', label: 'Por Setor' },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as Tab)}
            className={`pb-3 text-sm font-medium whitespace-nowrap ${
              tab === t.k ? 'text-amber-600 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'geral' && <GeralTab data={data} />}
      {tab === 'receber' && <ReceberTab data={data} onRefresh={load} />}
      {tab === 'pagar' && (
        <PagarTab payables={payables} expeditions={expeditions} onRefresh={load} />
      )}
      {tab === 'fluxo' && <FluxoTab data={data} />}
      {tab === 'setor' && <SetorTab data={data} />}
    </div>
  );
}

function Kpi({ title, value, icon, sub, subColor, highlight }: any) {
  return (
    <div className={`card ${highlight ? 'ring-2 ring-blue-200' : ''}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wide text-gray-400">{title}</p>
        {icon}
      </div>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className={`text-xs mt-1 ${subColor || 'text-gray-400'}`}>{sub}</p>}
    </div>
  );
}

// ── Visão Geral ──────────────────────────────────────────────────────────
function GeralTab({ data }: any) {
  const k = data.kpis;
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card">
        <h3 className="font-bold mb-4">Resumo de recebíveis</h3>
        <div className="space-y-3 text-sm">
          <Row label="Faturamento contratado" value={formatBRL(k.contratado)} />
          <Row label="Já recebido" value={formatBRL(k.recebido)} color="text-emerald-600" />
          <Row label="A receber" value={formatBRL(k.aReceber)} color="text-amber-600" />
          <Row label="Vencido" value={formatBRL(k.vencido)} color="text-rose-600" />
        </div>
      </div>
      <div className="card">
        <h3 className="font-bold mb-4">Resultado previsto</h3>
        <div className="space-y-3 text-sm">
          <Row label="Custo previsto" value={formatBRL(k.custoPrevisto)} color="text-rose-600" />
          <Row label="A pagar (pendente)" value={formatBRL(k.aPagar)} color="text-rose-600" />
          <hr />
          <Row label="Lucro previsto" value={formatBRL(k.lucroPrevisto)} color="text-amber-600" bold />
          <Row label="Potencial de vagas livres" value={formatBRL(k.previsaoPotencial)} color="text-gray-500" />
          <Row label="Previsão total de faturamento" value={formatBRL(k.previsaoTotal)} bold />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, color, bold }: any) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`${color || ''} ${bold ? 'font-bold' : 'font-medium'}`}>{value}</span>
    </div>
  );
}

// ── A Receber ───────────────────────────────────────────────────────────
function ReceberTab({ data, onRefresh }: any) {
  const [filter, setFilter] = useState<'todos' | 'vencido' | 'a_vencer'>('todos');
  const rows = data.receivables.filter((r: any) => {
    if (filter === 'todos') return r.saldo > 0;
    return r.status === filter;
  });

  const receber = async (r: any) => {
    const valor = prompt(`Receber de ${r.clientName}\nSaldo: ${formatBRL(r.saldo)}\n\nValor recebido:`, String(r.saldo));
    if (!valor) return;
    const res = await fetch(`/api/expeditions/${r.expeditionId}/enrollments/${r.enrollmentId}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(valor), method: 'pix' }),
    });
    if (res.ok) {
      toast.success('Recebimento registrado');
      onRefresh();
    } else toast.error('Erro ao registrar');
  };

  const statusBadge: Record<string, string> = {
    vencido: 'bg-rose-100 text-rose-700',
    a_vencer: 'bg-amber-100 text-amber-700',
    pago: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(['todos', 'vencido', 'a_vencer'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              filter === f ? 'bg-yellow-400 text-black' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {f === 'todos' ? 'Em aberto' : f === 'vencido' ? 'Vencidos' : 'A vencer'}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">Expedição</th>
              <th className="px-4 py-3 font-semibold">Vencimento</th>
              <th className="px-4 py-3 font-semibold text-right">Valor</th>
              <th className="px-4 py-3 font-semibold text-right">Pago</th>
              <th className="px-4 py-3 font-semibold text-right">Saldo</th>
              <th className="px-4 py-3 font-semibold text-center">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.enrollmentId} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{r.clientName}</td>
                <td className="px-4 py-3 text-gray-500">{r.expeditionName}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(r.dueDate)}</td>
                <td className="px-4 py-3 text-right">{formatBRL(r.total)}</td>
                <td className="px-4 py-3 text-right text-emerald-600">{formatBRL(r.paid)}</td>
                <td className="px-4 py-3 text-right font-bold">{formatBRL(r.saldo)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusBadge[r.status]}`}>
                    {r.status === 'a_vencer' ? 'a vencer' : r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => receber(r)} className="btn btn-primary text-xs px-3 py-1">
                    Receber
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-10 text-gray-400">
                  Nada a receber neste filtro 🎉
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── A Pagar ─────────────────────────────────────────────────────────────
function PagarTab({ payables, expeditions, onRefresh }: any) {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [type, setType] = useState('despesa');
  const [genExp, setGenExp] = useState('');

  const add = async () => {
    if (!desc || !amount) {
      toast.error('Preencha descrição e valor');
      return;
    }
    const res = await fetch('/api/payables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: desc, amount: Number(amount), dueDate, type }),
    });
    if (res.ok) {
      setDesc('');
      setAmount('');
      setDueDate('');
      toast.success('Conta lançada');
      onRefresh();
    } else toast.error('Erro');
  };

  const togglePaid = async (p: any) => {
    await fetch(`/api/payables/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: p.status === 'pago' ? 'pendente' : 'pago' }),
    });
    onRefresh();
  };

  const remove = async (id: string) => {
    await fetch(`/api/payables/${id}`, { method: 'DELETE' });
    onRefresh();
  };

  const generate = async () => {
    if (!genExp) {
      toast.error('Escolha a expedição');
      return;
    }
    const res = await fetch('/api/payables/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expeditionId: genExp }),
    });
    const d = await res.json();
    if (res.ok) {
      toast.success(`${d.created} conta(s) de fornecedor gerada(s)`);
      onRefresh();
    } else toast.error(d.error || 'Erro');
  };

  const pendentes = payables.filter((p: any) => p.status === 'pendente');
  const pagos = payables.filter((p: any) => p.status === 'pago');

  return (
    <div className="space-y-5">
      {/* nova conta + gerar */}
      <div className="card flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs text-gray-500">Descrição</label>
          <input className="input" placeholder="Ex: Combustível, hotel..." value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="w-32">
          <label className="text-xs text-gray-500">Valor</label>
          <input type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="w-40">
          <label className="text-xs text-gray-500">Vencimento</label>
          <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="w-36">
          <label className="text-xs text-gray-500">Tipo</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="despesa">Despesa</option>
            <option value="fornecedor">Fornecedor</option>
            <option value="comissao">Comissão</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <button onClick={add} className="btn btn-primary flex items-center gap-1">
          <Plus size={16} /> Lançar
        </button>
      </div>

      <div className="card flex flex-wrap items-end gap-3 bg-yellow-50 border-yellow-200">
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs text-gray-600">Gerar contas dos fornecedores de uma expedição</label>
          <select className="input" value={genExp} onChange={(e) => setGenExp(e.target.value)}>
            <option value="">Selecione a expedição...</option>
            {expeditions.map((e: any) => (
              <option key={e.id} value={e.id}>
                {e.routeName}
              </option>
            ))}
          </select>
        </div>
        <button onClick={generate} className="btn btn-secondary">
          Gerar contas
        </button>
      </div>

      {/* pendentes */}
      <PayableTable title="Pendentes" rows={pendentes} onToggle={togglePaid} onRemove={remove} />
      {pagos.length > 0 && (
        <PayableTable title="Pagas" rows={pagos} onToggle={togglePaid} onRemove={remove} paid />
      )}
    </div>
  );
}

function PayableTable({ title, rows, onToggle, onRemove, paid }: any) {
  return (
    <div className="card p-0 overflow-x-auto">
      <h3 className="font-bold px-4 pt-4 pb-2">{title} ({rows.length})</h3>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-y border-gray-200 text-left">
          <tr>
            <th className="px-4 py-2 font-semibold">Descrição</th>
            <th className="px-4 py-2 font-semibold">Tipo</th>
            <th className="px-4 py-2 font-semibold">Vencimento</th>
            <th className="px-4 py-2 font-semibold text-right">Valor</th>
            <th className="px-4 py-2 text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p: any) => (
            <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-2 font-medium">{p.description}</td>
              <td className="px-4 py-2 text-gray-500">{p.type}</td>
              <td className="px-4 py-2 text-gray-500">{formatDate(p.dueDate)}</td>
              <td className="px-4 py-2 text-right font-bold text-rose-600">{formatBRL(p.amount)}</td>
              <td className="px-4 py-2">
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => onToggle(p)}
                    title={paid ? 'Marcar pendente' : 'Marcar como pago'}
                    className={`p-1 rounded ${paid ? 'text-gray-400 hover:bg-gray-100' : 'text-emerald-600 hover:bg-emerald-50'}`}
                  >
                    <Check size={16} />
                  </button>
                  <button onClick={() => onRemove(p.id)} className="p-1 hover:bg-rose-50 rounded">
                    <Trash2 size={16} className="text-rose-500" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center py-6 text-gray-400">Nenhuma conta</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Fluxo de Caixa ─────────────────────────────────────────────────────────
function FluxoTab({ data }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.cashflow.map((m: any) => (
          <div key={m.month} className="card">
            <p className="text-xs text-gray-400 uppercase">{m.label}</p>
            <div className="mt-2 space-y-1 text-sm">
              <Row label="Entradas" value={formatBRL(m.entradas)} color="text-emerald-600" />
              <Row label="Saídas" value={formatBRL(m.saidas)} color="text-rose-600" />
              <Row label="Saldo" value={formatBRL(m.saldo)} color={m.saldo >= 0 ? 'text-amber-600' : 'text-rose-600'} bold />
            </div>
          </div>
        ))}
        {data.cashflow.length === 0 && (
          <div className="col-span-full text-center py-8 text-gray-400">Sem movimentações ainda</div>
        )}
      </div>

      <div className="card p-0 overflow-x-auto">
        <h3 className="font-bold px-4 pt-4 pb-2">Recebimentos recentes</h3>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-y border-gray-200 text-left">
            <tr>
              <th className="px-4 py-2 font-semibold">Data</th>
              <th className="px-4 py-2 font-semibold">Pagador</th>
              <th className="px-4 py-2 font-semibold">Expedição</th>
              <th className="px-4 py-2 font-semibold">Forma</th>
              <th className="px-4 py-2 font-semibold text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {data.income.map((i: any, idx: number) => (
              <tr key={idx} className="border-b border-gray-100">
                <td className="px-4 py-2">{formatDate(i.date)}</td>
                <td className="px-4 py-2 font-medium">{i.payer}</td>
                <td className="px-4 py-2 text-gray-500">{i.expeditionName}</td>
                <td className="px-4 py-2 text-gray-500">{i.method}</td>
                <td className="px-4 py-2 text-right text-emerald-600 font-medium">{formatBRL(i.amount)}</td>
              </tr>
            ))}
            {data.income.length === 0 && (
              <tr><td colSpan={5} className="text-center py-6 text-gray-400">Nenhum recebimento ainda</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Por Setor ────────────────────────────────────────────────────────────
function SetorTab({ data }: any) {
  return (
    <div className="space-y-6">
      {/* resumo por setor */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.sectors.map((s: any) => (
          <div key={s.sector} className="card">
            <p className="font-semibold mb-2">{s.sector}</p>
            <div className="space-y-1 text-sm">
              <Row label="Contratado" value={formatBRL(s.contratado)} />
              <Row label="Recebido" value={formatBRL(s.recebido)} color="text-emerald-600" />
              <Row label="Custo" value={formatBRL(s.custo)} color="text-rose-600" />
              <Row label="Lucro" value={formatBRL(s.lucro)} color="text-amber-600" bold />
            </div>
          </div>
        ))}
      </div>

      <div className="card p-0 overflow-x-auto">
        <h3 className="font-bold px-4 pt-4 pb-2">Resultado por expedição</h3>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-y border-gray-200 text-left">
            <tr>
              <th className="px-4 py-2 font-semibold">Expedição</th>
              <th className="px-4 py-2 font-semibold">Setor</th>
              <th className="px-4 py-2 font-semibold text-right">Contratado</th>
              <th className="px-4 py-2 font-semibold text-right">Recebido</th>
              <th className="px-4 py-2 font-semibold text-right">A Receber</th>
              <th className="px-4 py-2 font-semibold text-right">Custo</th>
              <th className="px-4 py-2 font-semibold text-right">Lucro</th>
              <th className="px-4 py-2 font-semibold text-right">Margem</th>
            </tr>
          </thead>
          <tbody>
            {data.expeditionRevenue.map((e: any) => (
              <tr key={e.expeditionId} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{e.expeditionName}</td>
                <td className="px-4 py-2 text-gray-500">{e.sector}</td>
                <td className="px-4 py-2 text-right">{formatBRL(e.contratado)}</td>
                <td className="px-4 py-2 text-right text-emerald-600">{formatBRL(e.recebido)}</td>
                <td className="px-4 py-2 text-right text-amber-600">{formatBRL(e.aReceber)}</td>
                <td className="px-4 py-2 text-right text-rose-600">{formatBRL(e.custo)}</td>
                <td className={`px-4 py-2 text-right font-bold ${e.lucro >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {formatBRL(e.lucro)}
                </td>
                <td className="px-4 py-2 text-right">{e.margem.toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
