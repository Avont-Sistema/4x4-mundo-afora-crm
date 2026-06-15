'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, MapPin, Users, X, TrendingUp, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatBRL, formatDate } from '@/lib/format';

interface Finance {
  totalParticipants: number;
  contractedRevenue: number;
  revenueGoal: number;
  totalPaid: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
  paymentProgress: number;
}
interface Expedition {
  id: string;
  routeName: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  slots: number;
  pricePerPerson: number;
  pricePerChild: number;
  revenueGoal: number;
  status: string;
  finance: Finance;
}

const statusColors: Record<string, string> = {
  planejamento: 'bg-gray-100 text-gray-700',
  aberta: 'bg-yellow-100 text-amber-700',
  em_andamento: 'bg-amber-100 text-amber-700',
  fechada: 'bg-emerald-100 text-emerald-700',
  finalizada: 'bg-purple-100 text-purple-700',
};
const statusLabels: Record<string, string> = {
  planejamento: 'Planejamento',
  aberta: 'Aberta',
  em_andamento: 'Em Andamento',
  fechada: 'Fechada',
  finalizada: 'Finalizada',
};

const emptyForm = {
  routeName: '',
  sector: '',
  description: '',
  location: '',
  startDate: '',
  endDate: '',
  slots: 12,
  pricePerPerson: 0,
  pricePerChild: 0,
  revenueGoal: 0,
  status: 'planejamento',
};

export default function ExpeditionsPage() {
  const [expeditions, setExpeditions] = useState<Expedition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchExpeditions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/expeditions');
      const data = await res.json();
      setExpeditions(data.expeditions || []);
    } catch {
      toast.error('Erro ao carregar expedições');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpeditions();
  }, [fetchExpeditions]);

  const projectedRevenue =
    form.revenueGoal > 0 ? form.revenueGoal : form.slots * form.pricePerPerson;

  const create = async () => {
    if (!form.routeName.trim()) {
      toast.error('Informe o nome do roteiro');
      return;
    }
    try {
      const res = await fetch('/api/expeditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setExpeditions((e) => [data.expedition, ...e]);
        setShowForm(false);
        setForm(emptyForm);
        toast.success('Expedição criada!');
      } else {
        toast.error(data.error || 'Erro ao criar');
      }
    } catch {
      toast.error('Erro ao criar expedição');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-bold">Expedições</h1>
          <p className="text-gray-500 text-sm mt-1">
            Projetos com faturamento, custos, lucro e clientes
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchExpeditions} className="btn btn-secondary flex items-center gap-2">
            <RefreshCw size={18} /> Atualizar
          </button>
          <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
            <Plus size={18} /> Nova Expedição
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" />
          Carregando...
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {expeditions.map((exp) => {
            const f = exp.finance;
            return (
              <Link
                key={exp.id}
                href={`/dashboard/expeditions/${exp.id}`}
                className="card hover:shadow-lg transition-shadow block"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold leading-tight">{exp.routeName}</h3>
                  <span
                    className={`text-[10px] font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                      statusColors[exp.status] || statusColors.planejamento
                    }`}
                  >
                    {statusLabels[exp.status] || exp.status}
                  </span>
                </div>

                <div className="space-y-1 text-sm text-gray-500 mb-4">
                  {exp.location && (
                    <p className="flex items-center gap-1">
                      <MapPin size={14} /> {exp.location}
                    </p>
                  )}
                  <p className="flex items-center gap-1">
                    <Users size={14} /> {f.totalParticipants}/{exp.slots} vagas
                  </p>
                  {exp.startDate && (
                    <p className="text-xs">
                      {formatDate(exp.startDate)} – {formatDate(exp.endDate)}
                    </p>
                  )}
                </div>

                {/* Barra de progressão de pagamento */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Pago</span>
                    <span className="font-semibold text-emerald-600">
                      {f.paymentProgress.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${Math.min(f.paymentProgress, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100 text-sm">
                  <div>
                    <p className="text-[10px] uppercase text-gray-400">Faturamento</p>
                    <p className="font-bold text-gray-800">
                      {formatBRL(f.contractedRevenue || f.revenueGoal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-gray-400">Lucro ({f.profitMargin.toFixed(0)}%)</p>
                    <p className={`font-bold ${f.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatBRL(f.profit)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}

          {expeditions.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-400">
              <MapPin size={48} className="mx-auto mb-4 opacity-40" />
              <p>Nenhuma expedição. Crie a primeira!</p>
            </div>
          )}
        </div>
      )}

      {/* Modal criar */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-bold">Nova Expedição (Projeto)</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  className="input md:col-span-2"
                  placeholder="Nome do roteiro *"
                  value={form.routeName}
                  onChange={(e) => setForm({ ...form, routeName: e.target.value })}
                />
                <input
                  className="input md:col-span-2"
                  placeholder="Setor / categoria (ex: Expedições 4x4) — opcional"
                  value={form.sector}
                  onChange={(e) => setForm({ ...form, sector: e.target.value })}
                />
                <textarea
                  className="input md:col-span-2 h-16"
                  placeholder="Descrição"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Local"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="planejamento">Planejamento</option>
                  <option value="aberta">Aberta</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="finalizada">Finalizada</option>
                </select>
                <div>
                  <label className="text-xs text-gray-500">Data início</label>
                  <input
                    type="date"
                    className="input"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Data fim</label>
                  <input
                    type="date"
                    className="input"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Vagas</label>
                  <input
                    type="number"
                    className="input"
                    value={form.slots}
                    onChange={(e) => setForm({ ...form, slots: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Meta de faturamento (R$)</label>
                  <input
                    type="number"
                    className="input"
                    value={form.revenueGoal}
                    onChange={(e) => setForm({ ...form, revenueGoal: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Preço por pessoa (R$)</label>
                  <input
                    type="number"
                    className="input"
                    value={form.pricePerPerson}
                    onChange={(e) => setForm({ ...form, pricePerPerson: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Preço por criança (R$)</label>
                  <input
                    type="number"
                    className="input"
                    value={form.pricePerChild}
                    onChange={(e) => setForm({ ...form, pricePerChild: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Prévia */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4 flex items-center gap-2 text-sm">
                <TrendingUp size={16} className="text-amber-600" />
                <span>
                  Faturamento projetado:{' '}
                  <strong>{formatBRL(projectedRevenue)}</strong>{' '}
                  ({form.slots} vagas × {formatBRL(form.pricePerPerson)})
                </span>
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={create} className="btn btn-primary">
                  Criar Expedição
                </button>
                <button onClick={() => setShowForm(false)} className="btn btn-secondary">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
