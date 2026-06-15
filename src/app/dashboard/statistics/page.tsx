'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Percent,
  Users,
  Target,
  Gauge,
  Ticket,
  Wallet,
} from 'lucide-react';
import { formatBRL } from '@/lib/format';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];

export default function StatisticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await fetch('/api/statistics').then((r) => r.json());
    setData(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !data) {
    return (
      <div className="text-center py-20 text-gray-400">
        <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" /> Carregando estatísticas...
      </div>
    );
  }

  const k = data.kpis;

  return (
    <div>
      <Link
        href="/dashboard/financial"
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4"
      >
        <ArrowLeft size={16} /> Voltar para Financeiro
      </Link>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-bold">Estatísticas</h1>
          <p className="text-gray-500 text-sm mt-1">Indicadores de gestão das expedições</p>
        </div>
        <button onClick={load} className="btn btn-secondary flex items-center gap-2">
          <RefreshCw size={18} /> Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Kpi icon={<DollarSign className="text-sky-600" />} label="Faturamento" value={formatBRL(k.totalContratado)} />
        <Kpi icon={<TrendingUp className="text-emerald-600" />} label="Lucro total" value={formatBRL(k.totalLucro)} />
        <Kpi icon={<Percent className="text-amber-600" />} label="Margem média" value={`${k.margemMedia.toFixed(1)}%`} />
        <Kpi icon={<Ticket className="text-violet-600" />} label="Ticket médio" value={formatBRL(k.ticketMedio)} />
        <Kpi icon={<Gauge className="text-pink-600" />} label="Ocupação média" value={`${k.ocupacaoMedia.toFixed(0)}%`} sub={`${k.totalCarros}/${k.totalVagas} carros · ${k.totalParticipantes} pessoas`} />
        <Kpi icon={<Target className="text-teal-600" />} label="Conversão de leads" value={`${k.taxaConversao.toFixed(0)}%`} sub={`${k.convertidos}/${k.totalLeads}`} />
        <Kpi icon={<Wallet className="text-amber-600" />} label="% Recebido" value={`${k.percentualRecebido.toFixed(0)}%`} sub={formatBRL(k.totalRecebido)} />
        <Kpi icon={<Users className="text-amber-600" />} label="Clientes" value={String(k.totalClientes)} sub={`${k.totalMatriculas} matrículas`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Faturamento mensal */}
        <Card title="Faturamento mensal" full>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip formatter={(v: number) => formatBRL(v)} />
              <Legend />
              <Bar dataKey="contratado" name="Contratado" fill="#0ea5e9" />
              <Bar dataKey="recebido" name="Recebido" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Top lucro */}
        <Card title="Expedições com maior lucro">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.topProfit} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatBRL(v)} />
              <Bar dataKey="lucro" name="Lucro" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Top custo */}
        <Card title="Expedições com maior custo">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.topCost} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatBRL(v)} />
              <Bar dataKey="custo" name="Custo" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Receita por setor */}
        <Card title="Receita por setor">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.sectorRevenue} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e: any) => e.name}>
                {data.sectorRevenue.map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatBRL(v)} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Recebido x a receber */}
        <Card title="Recebido x A Receber">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.paymentSplit} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} label={(e: any) => `${e.name}`}>
                <Cell fill="#10b981" />
                <Cell fill="#f59e0b" />
              </Pie>
              <Tooltip formatter={(v: number) => formatBRL(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Funil de leads */}
        <Card title="Funil de leads (por estágio)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.leadsByStage}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="Leads" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Leads por fonte */}
        <Card title="Leads por fonte">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.leadsBySource} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e: any) => e.name}>
                {data.leadsBySource.map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Ocupação por expedição */}
        <Card title="Taxa de ocupação por expedição">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.occupancyRanking} margin={{ left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis unit="%" />
              <Tooltip formatter={(v: number) => `${v.toFixed(0)}%`} />
              <Bar dataKey="occupancy" name="Ocupação" fill="#14b8a6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Margem por expedição (linha) */}
        <Card title="Margem de lucro por expedição">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.topProfit}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis unit="%" />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Line type="monotone" dataKey="margem" name="Margem" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Status das expedições */}
        <Card title="Expedições por status">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.expeditionsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e: any) => `${e.name} (${e.value})`}>
                {data.expeditionsByStatus.map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, sub }: any) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
        {icon}
      </div>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function Card({ title, children, full }: any) {
  return (
    <div className={`card ${full ? 'lg:col-span-2' : ''}`}>
      <h3 className="font-bold mb-4">{title}</h3>
      {children}
    </div>
  );
}
