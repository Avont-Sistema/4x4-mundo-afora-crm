'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  Truck,
  DollarSign,
  Plus,
  X,
  Trash2,
  TrendingUp,
  Wallet,
  Receipt,
  UserPlus,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatBRL, formatDate } from '@/lib/format';

// ---- tipos (resumidos do detail do backend) ----
interface Payment { id: string; date: string; amount: number; method: string; description?: string }
interface Enrollment {
  id: string; clientId: string; clientName: string; adults: number; children: number;
  agreedPrice: number; payments: Payment[]; observations?: string; status: string;
  paid: number; balance: number; progress: number;
}
interface Supplier { id: string; name: string; type: string; costPerPerson: number; costPerChild: number }
interface Finance {
  totalAdults: number; totalChildren: number; totalParticipants: number; slotsAvailable: number;
  revenueGoal: number; contractedRevenue: number; totalPaid: number; totalPending: number;
  supplierCost: number; manualCostTotal: number; totalCost: number; profit: number;
  profitMargin: number; paymentProgress: number;
}
interface ManualCost { id: string; label: string; amount: number; date: string }
interface Expedition {
  id: string; routeName: string; description?: string; location?: string;
  startDate?: string; endDate?: string; slots: number; pricePerPerson: number;
  pricePerChild: number; revenueGoal: number; status: string; supplierIds: string[];
  suppliers: Supplier[]; manualCosts: ManualCost[]; enrollments: Enrollment[]; finance: Finance;
}
interface ClientLite { id: string; name: string; phone?: string }

const enrollmentStatusColor: Record<string, string> = {
  reservado: 'bg-amber-100 text-amber-700',
  confirmado: 'bg-emerald-100 text-emerald-700',
  cancelado: 'bg-rose-100 text-rose-700',
};

export default function ExpeditionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [exp, setExp] = useState<Expedition | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'clientes' | 'fornecedores' | 'custos'>('clientes');
  const [selectedEnrollment, setSelectedEnrollment] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/expeditions/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setExp(data.expedition);
    } catch {
      toast.error('Erro ao carregar expedição');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const apply = (data: { expedition?: Expedition; error?: string }) => {
    if (data.expedition) setExp(data.expedition);
    else if (data.error) toast.error(data.error);
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Carregando...</div>;
  }
  if (!exp) {
    return <div className="text-center py-20 text-gray-500">Expedição não encontrada.</div>;
  }

  const f = exp.finance;
  const selected = exp.enrollments.find((e) => e.id === selectedEnrollment) || null;

  return (
    <div>
      {/* topo */}
      <button
        onClick={() => router.push('/dashboard/expeditions')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4"
      >
        <ArrowLeft size={16} /> Voltar para Expedições
      </button>

      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">{exp.routeName}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {exp.location ? `${exp.location} · ` : ''}
            {formatDate(exp.startDate)} – {formatDate(exp.endDate)} ·{' '}
            {f.totalParticipants}/{exp.slots} vagas
          </p>
        </div>
      </div>

      {/* cabeçalho financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">
            Faturamento {f.contractedRevenue > 0 ? '(contratado)' : '(meta)'}
          </p>
          <p className="text-2xl font-bold text-gray-800">
            {formatBRL(f.contractedRevenue || f.revenueGoal)}
          </p>
          {f.revenueGoal > 0 && f.contractedRevenue > 0 && (
            <p className="text-xs text-gray-400 mt-1">Meta: {formatBRL(f.revenueGoal)}</p>
          )}
        </div>

        <div className="card relative overflow-hidden">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">
            Total Pago ({f.paymentProgress.toFixed(0)}%)
          </p>
          <p className="text-2xl font-bold text-emerald-600">{formatBRL(f.totalPaid)}</p>
          <div className="w-full bg-gray-200 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{ width: `${Math.min(f.paymentProgress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Falta: {formatBRL(f.totalPending)}</p>
        </div>

        <div className="card">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Custos Totais</p>
          <p className="text-2xl font-bold text-rose-600">{formatBRL(f.totalCost)}</p>
          <p className="text-xs text-gray-400 mt-1">
            Fornecedores {formatBRL(f.supplierCost)} · Avulsos {formatBRL(f.manualCostTotal)}
          </p>
        </div>

        <div className="card bg-gradient-to-br from-amber-50 to-transparent">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">
            Lucro Estimado ({f.profitMargin.toFixed(0)}%)
          </p>
          <p className={`text-2xl font-bold ${f.profit >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>
            {formatBRL(f.profit)}
          </p>
        </div>
      </div>

      {/* tabs */}
      <div className="flex gap-6 border-b border-gray-200 mb-6">
        {[
          { k: 'clientes', label: `Clientes (${exp.enrollments.length})`, icon: Users },
          { k: 'fornecedores', label: `Fornecedores (${exp.suppliers.length})`, icon: Truck },
          { k: 'custos', label: `Custos Avulsos (${exp.manualCosts.length})`, icon: Receipt },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as typeof tab)}
            className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors ${
              tab === t.k
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'clientes' && (
        <ClientsTab exp={exp} onApply={apply} onOpen={setSelectedEnrollment} />
      )}
      {tab === 'fornecedores' && <SuppliersTab exp={exp} onApply={apply} />}
      {tab === 'custos' && <CostsTab exp={exp} onApply={apply} />}

      {/* Drawer financeiro do cliente */}
      {selected && (
        <ClientDrawer
          exp={exp}
          enrollment={selected}
          onClose={() => setSelectedEnrollment(null)}
          onApply={apply}
        />
      )}
    </div>
  );
}

// ===========================================================================
// Aba CLIENTES
// ===========================================================================
function ClientsTab({
  exp,
  onApply,
  onOpen,
}: {
  exp: Expedition;
  onApply: (d: any) => void;
  onOpen: (id: string) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [clientId, setClientId] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (showAdd) {
      fetch('/api/clients')
        .then((r) => r.json())
        .then((d) => setClients(d.clients || []));
    }
  }, [showAdd]);

  const suggestedPrice = adults * exp.pricePerPerson + children * exp.pricePerChild;

  const add = async () => {
    if (!clientId) {
      toast.error('Selecione um cliente');
      return;
    }
    const res = await fetch(`/api/expeditions/${exp.id}/enrollments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        adults,
        children,
        agreedPrice: price ? Number(price) : suggestedPrice,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      onApply(data);
      setShowAdd(false);
      setClientId('');
      setAdults(1);
      setChildren(0);
      setPrice('');
      toast.success('Cliente adicionado à expedição');
    } else {
      toast.error(data.error || 'Erro ao adicionar');
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowAdd(true)} className="btn btn-primary flex items-center gap-2">
          <UserPlus size={18} /> Adicionar Cliente
        </button>
      </div>

      <div className="space-y-3">
        {exp.enrollments.map((e) => (
          <button
            key={e.id}
            onClick={() => onOpen(e.id)}
            className="card w-full text-left hover:shadow-md transition-shadow flex items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{e.clientName}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${enrollmentStatusColor[e.status]}`}>
                  {e.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {e.adults} adulto(s){e.children > 0 ? ` · ${e.children} criança(s)` : ''} ·{' '}
                Valor {formatBRL(e.agreedPrice)}
              </p>
            </div>
            <div className="w-40">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-emerald-600 font-medium">{formatBRL(e.paid)}</span>
                <span className="text-gray-400">{e.progress.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full"
                  style={{ width: `${Math.min(e.progress, 100)}%` }}
                />
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-300" />
          </button>
        ))}
        {exp.enrollments.length === 0 && (
          <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
            Nenhum cliente nesta expedição ainda.
          </div>
        )}
      </div>

      {showAdd && (
        <ModalShell title="Adicionar Cliente à Expedição" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500">Cliente *</label>
              <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Selecione...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Não está na lista?{' '}
                <a href="/dashboard/clients" className="text-blue-600">
                  Cadastre o cliente primeiro
                </a>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Adultos</label>
                <input
                  type="number"
                  min={1}
                  className="input"
                  value={adults}
                  onChange={(e) => setAdults(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Crianças</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={children}
                  onChange={(e) => setChildren(Number(e.target.value))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">
                Valor acordado (sugerido: {formatBRL(suggestedPrice)})
              </label>
              <input
                type="number"
                className="input"
                placeholder={String(suggestedPrice)}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={add} className="btn btn-primary">
                Adicionar
              </button>
              <button onClick={() => setShowAdd(false)} className="btn btn-secondary">
                Cancelar
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

// ===========================================================================
// Aba FORNECEDORES
// ===========================================================================
function SuppliersTab({ exp, onApply }: { exp: Expedition; onApply: (d: any) => void }) {
  const [all, setAll] = useState<Supplier[]>([]);

  useEffect(() => {
    fetch('/api/suppliers')
      .then((r) => r.json())
      .then((d) => setAll(d.suppliers || []));
  }, []);

  const toggle = async (supplierId: string) => {
    const has = exp.supplierIds.includes(supplierId);
    const supplierIds = has
      ? exp.supplierIds.filter((s) => s !== supplierId)
      : [...exp.supplierIds, supplierId];
    const res = await fetch(`/api/expeditions/${exp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplierIds }),
    });
    const data = await res.json();
    onApply(data);
  };

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Os custos por pessoa/criança de cada fornecedor selecionado alimentam
        automaticamente os <strong>custos do projeto</strong>. Custo atual de
        fornecedores: <strong>{formatBRL(exp.finance.supplierCost)}</strong> (
        {exp.finance.totalAdults} adultos, {exp.finance.totalChildren} crianças).
      </p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {all.map((s) => {
          const active = exp.supplierIds.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              className={`card text-left transition-all ${
                active ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold">{s.name}</h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {s.type}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Adulto: <strong>{formatBRL(s.costPerPerson)}</strong> · Criança:{' '}
                <strong>{formatBRL(s.costPerChild)}</strong>
              </p>
              <p className={`text-xs mt-2 font-medium ${active ? 'text-blue-600' : 'text-gray-400'}`}>
                {active ? '✓ Incluído no projeto' : 'Clique para incluir'}
              </p>
            </button>
          );
        })}
        {all.length === 0 && (
          <div className="col-span-full text-center py-8 text-gray-400">
            Nenhum fornecedor cadastrado.{' '}
            <a href="/dashboard/suppliers" className="text-blue-600">
              Cadastrar fornecedores
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// Aba CUSTOS AVULSOS
// ===========================================================================
function CostsTab({ exp, onApply }: { exp: Expedition; onApply: (d: any) => void }) {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');

  const add = async () => {
    if (!label || !amount) {
      toast.error('Preencha descrição e valor');
      return;
    }
    const res = await fetch(`/api/expeditions/${exp.id}/costs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, amount: Number(amount) }),
    });
    const data = await res.json();
    if (res.ok) {
      onApply(data);
      setLabel('');
      setAmount('');
      toast.success('Custo lançado');
    } else toast.error(data.error || 'Erro');
  };

  const remove = async (costId: string) => {
    const res = await fetch(`/api/expeditions/${exp.id}/costs?costId=${costId}`, {
      method: 'DELETE',
    });
    onApply(await res.json());
  };

  return (
    <div>
      <div className="card mb-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-gray-500">Descrição</label>
          <input
            className="input"
            placeholder="Ex: Combustível, pedágio..."
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div className="w-40">
          <label className="text-xs text-gray-500">Valor (R$)</label>
          <input
            type="number"
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <button onClick={add} className="btn btn-primary flex items-center gap-2">
          <Plus size={18} /> Lançar Custo
        </button>
      </div>

      <div className="space-y-2">
        {exp.manualCosts.map((c) => (
          <div key={c.id} className="card flex items-center justify-between py-3">
            <div>
              <p className="font-medium">{c.label}</p>
              <p className="text-xs text-gray-400">{formatDate(c.date)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-rose-600">{formatBRL(c.amount)}</span>
              <button onClick={() => remove(c.id)} className="p-1 hover:bg-rose-50 rounded">
                <Trash2 size={16} className="text-rose-600" />
              </button>
            </div>
          </div>
        ))}
        {exp.manualCosts.length === 0 && (
          <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
            Nenhum custo avulso. Os custos de fornecedores são calculados automaticamente.
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// Drawer financeiro do cliente
// ===========================================================================
function ClientDrawer({
  exp,
  enrollment,
  onClose,
  onApply,
}: {
  exp: Expedition;
  enrollment: Enrollment;
  onClose: () => void;
  onApply: (d: any) => void;
}) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('pix');
  const [desc, setDesc] = useState('');
  const [obs, setObs] = useState(enrollment.observations || '');
  const base = `/api/expeditions/${exp.id}/enrollments/${enrollment.id}`;

  const launchPayment = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error('Informe um valor válido');
      return;
    }
    const res = await fetch(`${base}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(amount), method, description: desc }),
    });
    const data = await res.json();
    if (res.ok) {
      onApply(data);
      setAmount('');
      setDesc('');
      toast.success('Pagamento lançado');
    } else toast.error(data.error || 'Erro');
  };

  const removePayment = async (paymentId: string) => {
    const res = await fetch(`${base}/payments?paymentId=${paymentId}`, { method: 'DELETE' });
    onApply(await res.json());
  };

  const saveObs = async () => {
    const res = await fetch(base, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ observations: obs }),
    });
    onApply(await res.json());
    toast.success('Observações salvas');
  };

  const changeStatus = async (status: string) => {
    const res = await fetch(base, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    onApply(await res.json());
  };

  const removeEnrollment = async () => {
    if (!confirm('Remover este cliente da expedição?')) return;
    const res = await fetch(base, { method: 'DELETE' });
    onApply(await res.json());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-end z-50">
      <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-xl">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold">{enrollment.clientName}</h2>
            <p className="text-xs text-gray-400">
              {enrollment.adults} adulto(s)
              {enrollment.children > 0 ? ` · ${enrollment.children} criança(s)` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* status */}
          <div>
            <label className="text-xs text-gray-500">Status da matrícula</label>
            <select
              className="input"
              value={enrollment.status}
              onChange={(e) => changeStatus(e.target.value)}
            >
              <option value="reservado">Reservado</option>
              <option value="confirmado">Confirmado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          {/* progressão financeira individual */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500 flex items-center gap-1">
                <Wallet size={14} /> Pago
              </span>
              <span className="font-bold text-emerald-600">
                {formatBRL(enrollment.paid)} / {formatBRL(enrollment.agreedPrice)}
              </span>
            </div>
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all"
                style={{ width: `${Math.min(enrollment.progress, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {enrollment.progress.toFixed(0)}% pago · Falta {formatBRL(enrollment.balance)}
            </p>
          </div>

          {/* lançar pagamento */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <DollarSign size={16} /> Lançar Pagamento
            </h3>
            <div className="space-y-2">
              <input
                type="number"
                className="input"
                placeholder="Valor (R$)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="pix">PIX</option>
                  <option value="cartao">Cartão</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="transferencia">Transferência</option>
                  <option value="link">Link</option>
                </select>
                <input
                  className="input"
                  placeholder="Descrição"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>
              <button onClick={launchPayment} className="btn btn-primary w-full">
                Adicionar Pagamento
              </button>
            </div>
          </div>

          {/* histórico de pagamentos */}
          <div>
            <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
              <TrendingUp size={16} /> Histórico Financeiro
            </h3>
            <div className="space-y-2">
              {enrollment.payments.length === 0 && (
                <p className="text-xs text-gray-400">Nenhum pagamento lançado.</p>
              )}
              {enrollment.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-emerald-600">{formatBRL(p.amount)}</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(p.date)} · {p.method}
                      {p.description ? ` · ${p.description}` : ''}
                    </p>
                  </div>
                  <button onClick={() => removePayment(p.id)} className="p-1 hover:bg-rose-50 rounded">
                    <Trash2 size={14} className="text-rose-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* observações */}
          <div>
            <h3 className="text-sm font-bold mb-2">Observações</h3>
            <textarea
              className="input h-24"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Restrições alimentares, preferências, pendências..."
            />
            <button onClick={saveObs} className="btn btn-secondary mt-2 w-full">
              Salvar Observações
            </button>
          </div>

          <button
            onClick={removeEnrollment}
            className="text-sm text-rose-600 hover:underline flex items-center gap-1"
          >
            <Trash2 size={14} /> Remover cliente da expedição
          </button>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Modal reutilizável
// ===========================================================================
function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
