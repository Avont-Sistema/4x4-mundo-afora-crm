'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users, MapPin, TrendingUp, TrendingDown, AlertTriangle,
  Bell, CheckSquare, Square, Plus, X, RefreshCw, ArrowRight,
  Clock, CreditCard, UserCheck,
} from 'lucide-react';
import { formatBRL, formatDate } from '@/lib/format';

// ── Types ─────────────────────────────────────────────────────────────────
interface Finance {
  totalParticipants: number;
  slotsAvailable: number;
  contractedRevenue: number;
  revenueGoal: number;
  totalPaid: number;
  totalPending: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
  paymentProgress: number;
}

interface Payment { id: string; date: string; amount: number; method: string; }
interface Enrollment {
  id: string;
  clientId: string;
  clientName: string;
  agreedPrice: number;
  paid: number;
  balance: number;
  status: string;
  createdAt: string;
  payments: Payment[];
}

interface ExpCard {
  id: string;
  routeName: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  slots: number;
  status: string;
  closedAt?: string;
  supplierIds: string[];
  finance: Finance;
  enrollments: Enrollment[];
}

interface KPIs {
  totalClientes: number;
  ativas: number;
  totalContratado: number;
  totalCusto: number;
  totalLucro: number;
  margemMedia: number;
}

interface CheckItem { id: string; text: string; done: boolean; }

// ── Helpers ───────────────────────────────────────────────────────────────
const CHECKLIST_KEY = '4x4_checklist_v1';

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr.length <= 10 ? dateStr + 'T12:00:00' : dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${Math.max(m, 1)}m atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

const STATUS_COLORS: Record<string, string> = {
  planejamento: 'bg-gray-100 text-gray-700',
  aberta: 'bg-yellow-100 text-amber-700',
  em_andamento: 'bg-amber-100 text-amber-700',
  fechada: 'bg-emerald-100 text-emerald-700',
  finalizada: 'bg-purple-100 text-purple-700',
};
const STATUS_LABELS: Record<string, string> = {
  planejamento: 'Planejamento',
  aberta: 'Aberta',
  em_andamento: 'Em Andamento',
  fechada: 'Fechada',
  finalizada: 'Finalizada',
};

// ── Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [expeditions, setExpeditions] = useState<ExpCard[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState<CheckItem[]>([]);
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHECKLIST_KEY);
      if (saved) setChecklist(JSON.parse(saved));
    } catch {}
  }, []);

  const saveChecklist = (items: CheckItem[]) => {
    setChecklist(items);
    try { localStorage.setItem(CHECKLIST_KEY, JSON.stringify(items)); } catch {}
  };

  const addCheckItem = () => {
    if (!newItem.trim()) return;
    saveChecklist([...checklist, { id: crypto.randomUUID(), text: newItem.trim(), done: false }]);
    setNewItem('');
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([fetch('/api/expeditions'), fetch('/api/statistics')]);
      const d1 = await r1.json();
      const d2 = await r2.json();
      setExpeditions(d1.expeditions || []);
      setKpis(d2.kpis || null);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const inProgress = expeditions.filter(e => ['aberta', 'em_andamento'].includes(e.status));

  const upcoming = expeditions
    .filter(e => {
      const d = daysUntil(e.startDate);
      return d !== null && d >= 0 && e.status !== 'finalizada';
    })
    .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
    .slice(0, 5);

  // ── Warnings ─────────────────────────────────────────────────────────────
  const warnings: { type: 'urgent' | 'warning' | 'info'; text: string; link: string }[] = [];

  for (const exp of expeditions) {
    const days = daysUntil(exp.startDate);
    const notClosed = !['fechada', 'finalizada'].includes(exp.status);

    if (days !== null && days >= 0 && days <= 14 && notClosed) {
      const label = days === 0 ? 'hoje' : `em ${days} dia${days !== 1 ? 's' : ''}`;
      warnings.push({
        type: days <= 3 ? 'urgent' : 'warning',
        text: `"${exp.routeName}" começa ${label} e ainda não foi fechada`,
        link: `/dashboard/expeditions/${exp.id}`,
      });
    }

    if (exp.status === 'em_andamento' && !exp.closedAt && exp.supplierIds.length > 0) {
      warnings.push({
        type: 'warning',
        text: `"${exp.routeName}" está em andamento – envie os dados para os fornecedores`,
        link: `/dashboard/expeditions/${exp.id}`,
      });
    }

    const openSlots = exp.finance.slotsAvailable;
    if (openSlots > 0 && ['aberta', 'em_andamento'].includes(exp.status)) {
      warnings.push({
        type: 'info',
        text: `"${exp.routeName}" tem ${openSlots} vaga${openSlots !== 1 ? 's' : ''} disponíve${openSlots !== 1 ? 'is' : 'l'}`,
        link: `/dashboard/expeditions/${exp.id}`,
      });
    }

    const unpaid = exp.enrollments.filter(e => e.status !== 'cancelado' && e.balance > 0);
    if (unpaid.length > 0 && ['aberta', 'em_andamento'].includes(exp.status)) {
      warnings.push({
        type: 'warning',
        text: `${unpaid.length} cliente${unpaid.length !== 1 ? 's' : ''} com pagamento pendente em "${exp.routeName}"`,
        link: `/dashboard/expeditions/${exp.id}`,
      });
    }
  }

  // ── Notifications ─────────────────────────────────────────────────────────
  const events: { kind: string; text: string; sortKey: string; timeLabel: string }[] = [];
  for (const exp of expeditions) {
    for (const enr of exp.enrollments) {
      events.push({
        kind: 'enroll',
        text: `${enr.clientName} inscrito em "${exp.routeName}"`,
        sortKey: enr.createdAt,
        timeLabel: relativeTime(enr.createdAt),
      });
      for (const p of enr.payments) {
        const isoDate = p.date.length <= 10 ? p.date + 'T12:00:00' : p.date;
        events.push({
          kind: 'payment',
          text: `${formatBRL(p.amount)} recebido de ${enr.clientName} (${exp.routeName})`,
          sortKey: isoDate,
          timeLabel: formatDate(p.date),
        });
      }
    }
  }
  events.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  const recentEvents = events.slice(0, 6);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Visão geral da operação</p>
        </div>
        <button onClick={load} className="btn btn-secondary flex items-center gap-2">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          label="Clientes Ativos"
          value={kpis ? String(kpis.totalClientes) : '–'}
          icon={<Users className="w-8 h-8 text-amber-600 opacity-80" />}
          bg="bg-yellow-50"
        />
        <KPICard
          label="Expedições Ativas"
          value={kpis ? String(kpis.ativas) : '–'}
          icon={<MapPin className="w-8 h-8 text-amber-500 opacity-80" />}
          bg="bg-amber-50"
        />
        <KPICard
          label="Previsão Faturamento"
          value={kpis ? formatBRL(kpis.totalContratado) : '–'}
          icon={<TrendingUp className="w-8 h-8 text-emerald-500 opacity-80" />}
          bg="bg-emerald-50"
          sub={kpis ? `${kpis.margemMedia.toFixed(0)}% de margem` : undefined}
        />
        <KPICard
          label="Previsão Custos"
          value={kpis ? formatBRL(kpis.totalCusto) : '–'}
          icon={<TrendingDown className="w-8 h-8 text-rose-500 opacity-80" />}
          bg="bg-rose-50"
          sub={kpis ? `Lucro: ${formatBRL(kpis.totalLucro)}` : undefined}
        />
      </div>

      {/* Avisos + Notificações */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Avisos */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-amber-500" />
            <h2 className="text-lg font-bold">Avisos Importantes</h2>
            {warnings.length > 0 && (
              <span className="ml-auto text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                {warnings.length}
              </span>
            )}
          </div>
          {warnings.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhum aviso no momento ✓</p>
          ) : (
            <div className="space-y-1">
              {warnings.map((w, i) => (
                <Link
                  key={i}
                  href={w.link}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    w.type === 'urgent' ? 'bg-rose-500' :
                    w.type === 'warning' ? 'bg-amber-500' : 'bg-yellow-400'
                  }`} />
                  <span className={`text-sm flex-1 ${w.type === 'urgent' ? 'text-rose-700 font-medium' : 'text-gray-700'}`}>
                    {w.text}
                  </span>
                  <ArrowRight size={13} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Notificações */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={18} className="text-amber-600" />
            <h2 className="text-lg font-bold">Últimas Atividades</h2>
          </div>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Sem atividade recente</p>
          ) : (
            <div className="space-y-3">
              {recentEvents.map((ev, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    ev.kind === 'payment' ? 'bg-emerald-100' : 'bg-yellow-100'
                  }`}>
                    {ev.kind === 'payment'
                      ? <CreditCard size={13} className="text-emerald-600" />
                      : <UserCheck size={13} className="text-amber-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 leading-snug">{ev.text}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{ev.timeLabel}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expedições em andamento – atalhos */}
      {inProgress.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-bold mb-3 flex items-center gap-2 text-gray-700">
            <MapPin size={16} className="text-amber-500" /> Expedições em Andamento
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {inProgress.map(exp => (
              <Link
                key={exp.id}
                href={`/dashboard/expeditions/${exp.id}`}
                className="card py-3 px-4 hover:shadow-md transition-shadow flex flex-col gap-2 group"
              >
                <div className="flex justify-between items-start gap-2">
                  <p className="font-semibold text-sm leading-tight group-hover:text-amber-600 transition-colors">
                    {exp.routeName}
                  </p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${
                    STATUS_COLORS[exp.status] || ''
                  }`}>
                    {STATUS_LABELS[exp.status] || exp.status}
                  </span>
                </div>
                {exp.location && (
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <MapPin size={10} /> {exp.location}
                  </p>
                )}
                <div className="mt-1">
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>{exp.finance.totalParticipants}/{exp.slots} vagas</span>
                    <span className="text-emerald-600 font-medium">
                      {exp.finance.paymentProgress.toFixed(0)}% pago
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${Math.min(exp.finance.paymentProgress, 100)}%` }}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Próximas expedições + Checklist */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Próximas */}
        <div className="lg:col-span-3 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold flex items-center gap-2 text-gray-700">
              <Clock size={16} className="text-amber-600" /> Próximas Expedições
            </h2>
            <Link href="/dashboard/expeditions" className="text-xs text-amber-600 hover:underline flex items-center gap-1">
              Ver todas <ArrowRight size={11} />
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhuma expedição agendada</p>
          ) : (
            <div className="space-y-1">
              {upcoming.map(exp => {
                const days = daysUntil(exp.startDate);
                const urgent = days !== null && days <= 7;
                return (
                  <Link
                    key={exp.id}
                    href={`/dashboard/expeditions/${exp.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center text-center flex-shrink-0 ${
                      urgent ? 'bg-rose-100 text-rose-700' : 'bg-yellow-50 text-amber-700'
                    }`}>
                      <span className="text-base font-bold leading-none">{days}</span>
                      <span className="text-[9px] uppercase leading-none mt-0.5">dias</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm group-hover:text-amber-600 truncate">{exp.routeName}</p>
                      <p className="text-xs text-gray-400">
                        {formatDate(exp.startDate)}{exp.location ? ` · ${exp.location}` : ''}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-800">
                        {formatBRL(exp.finance.contractedRevenue || exp.finance.revenueGoal || 0)}
                      </p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[exp.status] || ''}`}>
                        {STATUS_LABELS[exp.status] || exp.status}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Checklist */}
        <div className="lg:col-span-2 card flex flex-col">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2 text-gray-700">
            <CheckSquare size={16} className="text-purple-500" /> Anotações / Checklist
          </h2>
          <div className="flex gap-2 mb-3">
            <input
              className="input flex-1 text-sm py-1.5"
              placeholder="Nova anotação..."
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCheckItem()}
            />
            <button onClick={addCheckItem} className="btn btn-primary px-3 py-1.5">
              <Plus size={15} />
            </button>
          </div>
          {checklist.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhuma anotação ainda</p>
          ) : (
            <div className="space-y-2 flex-1 overflow-y-auto max-h-72">
              {checklist.map(item => (
                <div key={item.id} className="flex items-center gap-2 group">
                  <button onClick={() => saveChecklist(checklist.map(i => i.id === item.id ? { ...i, done: !i.done } : i))}>
                    {item.done
                      ? <CheckSquare size={17} className="text-emerald-500 flex-shrink-0" />
                      : <Square size={17} className="text-gray-300 hover:text-amber-500 flex-shrink-0" />}
                  </button>
                  <span className={`flex-1 text-sm ${item.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {item.text}
                  </span>
                  <button
                    onClick={() => saveChecklist(checklist.filter(i => i.id !== item.id))}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-rose-50 rounded transition-opacity"
                  >
                    <X size={12} className="text-rose-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {checklist.some(i => i.done) && (
            <button
              onClick={() => saveChecklist(checklist.filter(i => !i.done))}
              className="mt-3 text-xs text-gray-400 hover:text-rose-500 self-end transition-colors"
            >
              Limpar concluídos
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────
function KPICard({
  label, value, icon, bg, sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  bg: string;
  sub?: string;
}) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 mb-0.5 truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-800 leading-none truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}
