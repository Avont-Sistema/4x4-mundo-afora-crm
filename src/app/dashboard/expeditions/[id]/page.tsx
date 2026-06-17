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
  Link2,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Unlock,
  Download,
  FileSpreadsheet,
  Upload,
  FileText,
  Loader,
  Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatBRL, formatDate } from '@/lib/format';
import { generateContractPdf } from '@/lib/contractPdf';

// ---- tipos (resumidos do detail do backend) ----
interface Payment { id: string; date: string; amount: number; method: string; description?: string }
interface Enrollment {
  id: string; clientId: string; clientName: string; adults: number; children: number;
  agreedPrice: number; payments: Payment[]; observations?: string; status: string;
  paid: number; balance: number; progress: number;
}
interface Supplier { id: string; name: string; type: string; costPerPerson: number; costPerChild: number }
interface Finance {
  totalAdults: number; totalChildren: number; totalParticipants: number;
  cars: number; slotsAvailable: number; avgTicketPerCar: number;
  revenueGoal: number; contractedRevenue: number; totalPaid: number; totalPending: number;
  supplierCost: number; manualCostTotal: number; totalCost: number; profit: number;
  profitMargin: number; paymentProgress: number;
}
interface ManualCost { id: string; label: string; amount: number; date: string }
interface SupplierBilling {
  id: string; name: string; type: string; billingMode: string;
  billingLabel: string; exportFieldCount: number; amount: number;
}
interface Expedition {
  id: string; routeName: string; sector?: string; description?: string; location?: string;
  startDate?: string; endDate?: string; slots: number; pricePerPerson: number;
  pricePerChild: number; revenueGoal: number; status: string; closedAt?: string; supplierIds: string[];
  suppliers: Supplier[]; manualCosts: ManualCost[]; enrollments: Enrollment[];
  finance: Finance; supplierBilling: SupplierBilling[];
}
interface ClientLite { id: string; name: string; phone?: string }

const enrollmentStatusColor: Record<string, string> = {
  reservado: 'bg-amber-100 text-amber-700',
  confirmado: 'bg-emerald-100 text-emerald-700',
  cancelado: 'bg-rose-100 text-rose-700',
};

const expStatusColor: Record<string, string> = {
  planejamento: 'bg-gray-100 text-gray-700',
  aberta: 'bg-yellow-100 text-amber-700',
  em_andamento: 'bg-amber-100 text-amber-700',
  fechada: 'bg-emerald-100 text-emerald-700',
  finalizada: 'bg-purple-100 text-purple-700',
};
const expStatusLabel: Record<string, string> = {
  planejamento: 'Planejamento',
  aberta: 'Aberta',
  em_andamento: 'Em Andamento',
  fechada: 'Fechada',
  finalizada: 'Finalizada',
};

export default function ExpeditionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [exp, setExp] = useState<Expedition | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'clientes' | 'fornecedores' | 'custos' | 'fechamento'>('clientes');
  const [selectedEnrollment, setSelectedEnrollment] = useState<string | null>(null);
  const [showLink, setShowLink] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

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

  const removeExpedition = async () => {
    if (!exp) return;
    if (!confirm(`Excluir a expedição "${exp.routeName}"? Esta ação não pode ser desfeita.`)) return;
    const res = await fetch(`/api/expeditions/${exp.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Expedição excluída');
      router.push('/dashboard/expeditions');
    } else {
      toast.error('Erro ao excluir');
    }
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
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">{exp.routeName}</h1>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${expStatusColor[exp.status] || expStatusColor.planejamento}`}>
              {expStatusLabel[exp.status] || exp.status}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {exp.location ? `${exp.location} · ` : ''}
            {formatDate(exp.startDate)} – {formatDate(exp.endDate)} ·{' '}
            {f.cars}/{exp.slots} carros · {f.totalParticipants} pessoas
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowEdit(true)} className="btn btn-secondary flex items-center gap-2">
            <Pencil size={16} /> Editar
          </button>
          <button onClick={() => setShowLink(true)} className="btn btn-secondary flex items-center gap-2">
            <Link2 size={16} /> Link de Formulário
          </button>
          <button
            onClick={removeExpedition}
            className="btn flex items-center gap-2 bg-rose-50 text-rose-600 hover:bg-rose-100"
          >
            <Trash2 size={16} /> Excluir
          </button>
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
          { k: 'fechamento', label: 'Fechamento', icon: FileSpreadsheet },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as typeof tab)}
            className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors ${
              tab === t.k
                ? 'text-amber-600 border-b-2 border-yellow-400'
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
      {tab === 'fechamento' && <FechamentoTab exp={exp} onApply={apply} />}

      {/* Drawer financeiro do cliente */}
      {selected && (
        <ClientDrawer
          exp={exp}
          enrollment={selected}
          onClose={() => setSelectedEnrollment(null)}
          onApply={apply}
        />
      )}

      {/* Modal: link do formulário de inscrição desta expedição */}
      {showLink && <FormLinkModal expId={exp.id} expName={exp.routeName} onClose={() => setShowLink(false)} />}

      {/* Modal: editar dados da expedição */}
      {showEdit && (
        <EditExpeditionModal
          exp={exp}
          onClose={() => setShowEdit(false)}
          onSaved={(d) => { apply(d); setShowEdit(false); }}
        />
      )}
    </div>
  );
}

// ===========================================================================
// Modal: Editar Expedição
// ===========================================================================
function EditExpeditionModal({
  exp,
  onClose,
  onSaved,
}: {
  exp: Expedition;
  onClose: () => void;
  onSaved: (d: { expedition?: Expedition; error?: string }) => void;
}) {
  const [form, setForm] = useState({
    routeName: exp.routeName || '',
    sector: exp.sector || '',
    description: exp.description || '',
    location: exp.location || '',
    startDate: (exp.startDate || '').slice(0, 10),
    endDate: (exp.endDate || '').slice(0, 10),
    slots: exp.slots ?? 0,
    pricePerPerson: exp.pricePerPerson ?? 0,
    pricePerChild: exp.pricePerChild ?? 0,
    revenueGoal: exp.revenueGoal ?? 0,
    status: exp.status || 'planejamento',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.routeName.trim()) { toast.error('Informe o nome da rota'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/expeditions/${exp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');
      toast.success('Expedição atualizada');
      onSaved(data);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const num = (k: 'slots' | 'pricePerPerson' | 'pricePerChild' | 'revenueGoal', v: string) =>
    setForm((f) => ({ ...f, [k]: Number(v) }));

  return (
    <ModalShell title="Editar Expedição" onClose={onClose}>
      <div className="grid md:grid-cols-2 gap-4">
        <input className="input md:col-span-2" placeholder="Nome da rota *" value={form.routeName} onChange={(e) => setForm({ ...form, routeName: e.target.value })} />
        <input className="input" placeholder="Setor (ex: Expedições 4x4)" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} />
        <input className="input" placeholder="Local" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <div>
          <label className="text-xs text-gray-500">Início</label>
          <input type="date" className="input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Fim</label>
          <input type="date" className="input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Vagas (carros)</label>
          <input type="number" className="input" value={form.slots} onChange={(e) => num('slots', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Status</label>
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Expedition['status'] })}>
            {Object.entries(expStatusLabel).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Preço por adulto (R$)</label>
          <input type="number" className="input" value={form.pricePerPerson} onChange={(e) => num('pricePerPerson', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Preço por criança (R$)</label>
          <input type="number" className="input" value={form.pricePerChild} onChange={(e) => num('pricePerChild', e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-gray-500">Meta de faturamento (R$)</label>
          <input type="number" className="input" value={form.revenueGoal} onChange={(e) => num('revenueGoal', e.target.value)} />
        </div>
        <textarea className="input md:col-span-2 h-20" placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="md:col-span-2 flex gap-2">
          <button onClick={save} disabled={saving} className="btn btn-primary">{saving ? 'Salvando...' : 'Salvar'}</button>
          <button onClick={onClose} className="btn btn-secondary">Cancelar</button>
        </div>
      </div>
    </ModalShell>
  );
}

// ===========================================================================
// Modal: Link de Formulário (específico da expedição)
// ===========================================================================
function FormLinkModal({ expId, expName, onClose }: { expId: string; expName: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? `${window.location.origin}/cadastro?exp=${expId}` : '';
  const whatsappText = encodeURIComponent(
    `Olá! Para confirmar sua participação na expedição "${expName}", preencha o formulário de inscrição: ${url}`
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  return (
    <ModalShell title="Link de Formulário da Expedição" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Compartilhe este link com os clientes. Tudo que eles preencherem entra automaticamente
          como cliente <strong>e já é matriculado nesta expedição</strong>. Se o cliente já existir
          (mesmo CPF, e-mail ou telefone), os dados são anexados ao cadastro dele.
        </p>

        <div className="flex gap-2">
          <input className="input flex-1 bg-gray-50 text-sm" readOnly value={url} onFocus={(e) => e.target.select()} />
          <button onClick={copy} className="btn btn-primary flex items-center gap-2 flex-shrink-0">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary flex items-center gap-2 text-sm">
            <ExternalLink size={15} /> Abrir formulário
          </a>
          <a
            href={`https://wa.me/?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn flex items-center gap-2 text-sm bg-green-500 text-white hover:bg-green-600"
          >
            <ExternalLink size={15} /> Enviar por WhatsApp
          </a>
        </div>
      </div>
    </ModalShell>
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
  const [showImport, setShowImport] = useState(false);
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [clientId, setClientId] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [price, setPrice] = useState('');
  const [contracts, setContracts] = useState<Record<string, { id: string; signedAt: string }>>({});

  useEffect(() => {
    if (showAdd) {
      fetch('/api/clients')
        .then((r) => r.json())
        .then((d) => setClients(d.clients || []));
    }
  }, [showAdd]);

  const loadContracts = useCallback(() => {
    fetch(`/api/contracts?expeditionId=${exp.id}`)
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, { id: string; signedAt: string }> = {};
        (d.contracts || []).forEach((c: any) => {
          map[c.clientId] = { id: c.id, signedAt: c.signedAt };
        });
        setContracts(map);
      })
      .catch(() => {});
  }, [exp.id]);

  useEffect(() => { loadContracts(); }, [loadContracts]);

  const downloadContract = async (contractId: string) => {
    try {
      const r = await fetch(`/api/contracts/${contractId}`);
      const d = await r.json();
      if (!r.ok || !d.contract) throw new Error('Contrato não encontrado');
      generateContractPdf(d.contract);
    } catch {
      toast.error('Erro ao baixar contrato');
    }
  };

  const handleImported = async () => {
    setShowImport(false);
    try {
      const r = await fetch(`/api/expeditions/${exp.id}`);
      onApply(await r.json());
    } catch { /* ignore */ }
    loadContracts();
  };

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
      <div className="flex justify-end gap-2 mb-4">
        <button onClick={() => setShowImport(true)} className="btn btn-secondary flex items-center gap-2">
          <Upload size={18} /> Importar planilha
        </button>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary flex items-center gap-2">
          <UserPlus size={18} /> Adicionar Cliente
        </button>
      </div>

      <div className="space-y-3">
        {exp.enrollments.map((e) => {
          const contract = contracts[e.clientId];
          return (
            <div key={e.id} className="flex items-center gap-2">
              <button
                onClick={() => onOpen(e.id)}
                className="card flex-1 min-w-0 text-left hover:shadow-md transition-shadow flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{e.clientName}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${enrollmentStatusColor[e.status]}`}>
                      {e.status}
                    </span>
                    {contract && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                        <FileText size={10} /> termo assinado
                      </span>
                    )}
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
                    <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(e.progress, 100)}%` }} />
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </button>
              {contract ? (
                <button
                  onClick={() => downloadContract(contract.id)}
                  title="Baixar contrato (termo de uso de imagem) assinado"
                  className="p-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex-shrink-0"
                >
                  <Download size={16} />
                </button>
              ) : (
                <span title="Termo de imagem ainda não assinado" className="p-2.5 text-gray-300 flex-shrink-0">
                  <FileText size={16} />
                </span>
              )}
            </div>
          );
        })}
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
                <a href="/dashboard/clients" className="text-amber-600">
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

      {showImport && (
        <ImportPlanModal
          expId={exp.id}
          onClose={() => setShowImport(false)}
          onImported={handleImported}
        />
      )}
    </div>
  );
}

// ===========================================================================
// Modal: Importar planilha de Controle Interno (.xlsx)
// ===========================================================================
interface ImportPreviewComitiva {
  driverName: string;
  cpf?: string;
  car?: string;
  plate?: string;
  adults: number;
  children: number;
  companions: { name: string; isChild: boolean; age?: number }[];
  existing: boolean;
}

function ImportPlanModal({
  expId,
  onClose,
  onImported,
}: {
  expId: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<{
    totalPeople: number;
    totalCars: number;
    comitivas: ImportPreviewComitiva[];
    warnings: string[];
  } | null>(null);

  const send = async (mode: 'preview' | 'confirm') => {
    if (!file) { toast.error('Selecione o arquivo .xlsx'); return; }
    const setBusy = mode === 'preview' ? setLoading : setImporting;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(
        `/api/expeditions/${expId}/import${mode === 'preview' ? '?preview=1' : ''}`,
        { method: 'POST', body: fd }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao processar planilha');

      if (mode === 'preview') {
        setPreview({
          totalPeople: data.totalPeople,
          totalCars: data.totalCars,
          comitivas: data.comitivas,
          warnings: data.warnings || [],
        });
      } else {
        toast.success(
          `Importado: ${data.created} novo(s), ${data.merged} atualizado(s), ${data.enrolled} matriculado(s)` +
            (data.skipped ? ` · ${data.skipped} já estavam na expedição` : '')
        );
        onImported();
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro na importação');
    } finally {
      setBusy(false);
    }
  };

  const newCount = preview?.comitivas.filter((c) => !c.existing).length ?? 0;
  const existingCount = preview?.comitivas.filter((c) => c.existing).length ?? 0;

  return (
    <ModalShell title="Importar planilha de Controle Interno" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Selecione o arquivo <strong>.xlsx</strong> de controle interno. O sistema lê a aba{' '}
          <strong>CONTROLE</strong>, agrupa cada carro (motorista + acompanhantes), identifica
          crianças e cadastra/matricula automaticamente nesta expedição.
        </p>

        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => { setFile(e.target.files?.[0] || null); setPreview(null); }}
          className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-900 file:text-white file:text-sm file:font-semibold hover:file:bg-black"
        />

        {!preview && (
          <button
            onClick={() => send('preview')}
            disabled={!file || loading}
            className="btn btn-primary flex items-center gap-2"
          >
            {loading ? <Loader size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
            {loading ? 'Analisando...' : 'Analisar planilha'}
          </button>
        )}

        {preview && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="px-3 py-1 rounded-full bg-gray-100 font-medium">{preview.totalCars} carro(s)</span>
              <span className="px-3 py-1 rounded-full bg-gray-100 font-medium">{preview.totalPeople} pessoa(s)</span>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">{newCount} novo(s)</span>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">{existingCount} já cadastrado(s)</span>
            </div>

            {preview.warnings.length > 0 && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                {preview.warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
              </div>
            )}

            <div className="max-h-72 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-100">
              {preview.comitivas.map((c, i) => (
                <div key={i} className="p-3 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{i + 1}. {c.driverName}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.existing ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {c.existing ? 'já cadastrado' : 'novo'}
                    </span>
                    <span className="text-xs text-gray-400">{c.adults}A{c.children > 0 ? ` · ${c.children}C` : ''}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {c.car || 'carro não informado'}{c.plate ? ` · ${c.plate}` : ''}
                    {c.companions.length > 0 && <> · {c.companions.map((p) => p.name).join(', ')}</>}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => send('confirm')} disabled={importing} className="btn btn-primary flex items-center gap-2">
                {importing ? <Loader size={16} className="animate-spin" /> : <Check size={16} />}
                {importing ? 'Importando...' : `Confirmar importação (${preview.totalCars})`}
              </button>
              <button onClick={() => setPreview(null)} className="btn btn-secondary">Trocar arquivo</button>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
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
                active ? 'ring-2 ring-yellow-400 bg-yellow-50' : 'hover:shadow-md'
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
              <p className={`text-xs mt-2 font-medium ${active ? 'text-amber-600' : 'text-gray-400'}`}>
                {active ? '✓ Incluído no projeto' : 'Clique para incluir'}
              </p>
            </button>
          );
        })}
        {all.length === 0 && (
          <div className="col-span-full text-center py-8 text-gray-400">
            Nenhum fornecedor cadastrado.{' '}
            <a href="/dashboard/suppliers" className="text-amber-600">
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
// Aba FECHAMENTO (fechar expedição + planilhas e contas a pagar por fornecedor)
// ===========================================================================
function FechamentoTab({ exp, onApply }: { exp: Expedition; onApply: (d: any) => void }) {
  const [closing, setClosing] = useState(false);
  const isClosed = exp.status === 'fechada';
  const billing = exp.supplierBilling || [];
  const grandTotal = billing.reduce((a, b) => a + b.amount, 0);

  const download = (supplierId: string) => {
    const a = document.createElement('a');
    a.href = `/api/expeditions/${exp.id}/export?supplierId=${supplierId}`;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const downloadAll = () => billing.forEach((b, i) => setTimeout(() => download(b.id), i * 400));

  const close = async () => {
    if (
      !confirm(
        'Fechar a expedição? Serão geradas as contas a pagar de cada fornecedor e as planilhas ficam disponíveis para download.'
      )
    )
      return;
    setClosing(true);
    try {
      const res = await fetch(`/api/expeditions/${exp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'fechada', closedAt: new Date().toISOString().split('T')[0] }),
      });
      const gen = await fetch('/api/payables/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expeditionId: exp.id }),
      });
      const genData = await gen.json();
      onApply(await res.json());
      toast.success(`Expedição fechada! ${genData.created || 0} conta(s) a pagar gerada(s).`);
    } catch {
      toast.error('Erro ao fechar expedição');
    } finally {
      setClosing(false);
    }
  };

  const reopen = async () => {
    const res = await fetch(`/api/expeditions/${exp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'em_andamento' }),
    });
    onApply(await res.json());
    toast.success('Expedição reaberta');
  };

  return (
    <div className="space-y-5">
      {/* painel de status / fechar */}
      <div
        className={`card flex flex-wrap items-center justify-between gap-4 ${
          isClosed ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
        }`}
      >
        <div className="flex items-center gap-3">
          {isClosed ? (
            <Lock className="text-emerald-600" size={22} />
          ) : (
            <Unlock className="text-amber-600" size={22} />
          )}
          <div>
            <p className="font-bold">{isClosed ? 'Expedição fechada' : 'Expedição em andamento'}</p>
            <p className="text-xs text-gray-500">
              {isClosed
                ? `Fechada em ${formatDate(exp.closedAt)} · planilhas e contas a pagar geradas`
                : 'Cadastre os clientes e, quando lotar as vagas (ou quando quiser), feche a expedição.'}
            </p>
          </div>
        </div>
        {isClosed ? (
          <button onClick={reopen} className="btn btn-secondary flex items-center gap-2">
            <Unlock size={16} /> Reabrir
          </button>
        ) : (
          <button
            onClick={close}
            disabled={closing}
            className="btn flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Lock size={16} /> {closing ? 'Fechando...' : 'Fechar Expedição'}
          </button>
        )}
      </div>

      {/* planilhas + total a pagar por fornecedor */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold flex items-center gap-2">
            <FileSpreadsheet size={18} /> Planilhas por fornecedor
          </h3>
          {billing.length > 0 && (
            <button onClick={downloadAll} className="btn btn-secondary text-sm flex items-center gap-2">
              <Download size={15} /> Baixar todas
            </button>
          )}
        </div>
        {billing.length === 0 ? (
          <p className="text-sm text-gray-400">
            Nenhum fornecedor incluído nesta expedição. Adicione na aba <strong>Fornecedores</strong>.
          </p>
        ) : (
          <div className="space-y-2">
            {billing.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 rounded-lg p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium">{b.name}</p>
                  <p className="text-xs text-gray-500">
                    {b.billingLabel} · {b.exportFieldCount} coluna(s) configurada(s)
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-rose-600">{formatBRL(b.amount)}</span>
                  <button onClick={() => download(b.id)} className="btn btn-secondary text-sm flex items-center gap-2">
                    <Download size={15} /> Planilha
                  </button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3 border-t border-gray-200 mt-2">
              <span className="font-bold">Total a pagar (fornecedores)</span>
              <span className="font-bold text-rose-600 text-lg">{formatBRL(grandTotal)}</span>
            </div>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">
          As planilhas (CSV) trazem uma pessoa por linha (titular + acompanhantes/passageiros) com as
          colunas configuradas no cadastro de cada fornecedor, mais o total a pagar.
        </p>
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
