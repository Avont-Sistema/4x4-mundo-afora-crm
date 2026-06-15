'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Bot,
  User,
  MessageCircle,
  RefreshCw,
  Plug,
  Copy,
  X,
  GripVertical,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ---- Tipos (espelham src/lib/leadsStore.ts) -------------------------------
type LeadStage =
  | 'novo'
  | 'em_atendimento'
  | 'proposta_enviada'
  | 'sem_resposta'
  | 'finalizado';
type HandledBy = 'ia' | 'manual';
type LeadSource =
  | 'whatsapp'
  | 'google_ads'
  | 'meta_ads'
  | 'instagram'
  | 'website'
  | 'referral'
  | 'manual'
  | 'other';

interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  source: LeadSource;
  stage: LeadStage;
  handledBy: HandledBy;
  interest?: string;
  value?: number;
  notes?: string;
  lastMessage?: string;
  createdAt: string;
  updatedAt: string;
}

const STAGES: { key: LeadStage; label: string; color: string }[] = [
  { key: 'novo', label: 'Novos Leads', color: 'border-t-blue-500' },
  { key: 'em_atendimento', label: 'Em Atendimento', color: 'border-t-purple-500' },
  { key: 'proposta_enviada', label: 'Proposta Enviada', color: 'border-t-amber-500' },
  { key: 'sem_resposta', label: 'Sem Resposta', color: 'border-t-orange-500' },
  { key: 'finalizado', label: 'Finalizado', color: 'border-t-green-500' },
];

const SOURCES: { key: LeadSource; label: string; badge: string }[] = [
  { key: 'whatsapp', label: 'WhatsApp', badge: 'bg-green-100 text-green-800' },
  { key: 'google_ads', label: 'Google Ads', badge: 'bg-red-100 text-red-800' },
  { key: 'meta_ads', label: 'Meta Ads', badge: 'bg-yellow-100 text-amber-800' },
  { key: 'instagram', label: 'Instagram', badge: 'bg-pink-100 text-pink-800' },
  { key: 'website', label: 'Website', badge: 'bg-cyan-100 text-cyan-800' },
  { key: 'referral', label: 'Indicação', badge: 'bg-emerald-100 text-emerald-800' },
  { key: 'manual', label: 'Manual', badge: 'bg-gray-100 text-gray-800' },
  { key: 'other', label: 'Outro', badge: 'bg-gray-100 text-gray-800' },
];

const sourceMeta = (s: LeadSource) =>
  SOURCES.find((x) => x.key === s) || SOURCES[SOURCES.length - 1];

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  whatsapp: '',
  source: 'manual' as LeadSource,
  stage: 'novo' as LeadStage,
  handledBy: 'manual' as HandledBy,
  interest: '',
  value: '',
  notes: '',
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<LeadSource | 'all'>('all');
  const [handledFilter, setHandledFilter] = useState<HandledBy | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);
  const [showIntegrations, setShowIntegrations] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      setLeads(data.leads || []);
    } catch {
      toast.error('Erro ao carregar leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // ---- Filtros ----
  const visible = leads.filter((l) => {
    if (sourceFilter !== 'all' && l.source !== sourceFilter) return false;
    if (handledFilter !== 'all' && l.handledBy !== handledFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.name.toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        (l.phone || '').includes(q) ||
        (l.whatsapp || '').includes(q) ||
        (l.interest || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const leadsByStage = (stage: LeadStage) =>
    visible.filter((l) => l.stage === stage);

  // ---- Mutations ----
  const moveLead = async (id: string, stage: LeadStage) => {
    const prev = leads;
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, stage } : l)));
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setLeads(prev);
      toast.error('Não foi possível mover o lead');
    }
  };

  const toggleHandledBy = async (lead: Lead) => {
    const next: HandledBy = lead.handledBy === 'ia' ? 'manual' : 'ia';
    setLeads((ls) =>
      ls.map((l) => (l.id === lead.id ? { ...l, handledBy: next } : l))
    );
    try {
      await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handledBy: next }),
      });
      toast.success(
        next === 'ia' ? 'Atendimento atribuído à IA' : 'Atendimento manual assumido'
      );
    } catch {
      toast.error('Erro ao alterar atendimento');
    }
  };

  const removeLead = async (id: string) => {
    if (!confirm('Excluir este lead?')) return;
    const prev = leads;
    setLeads((ls) => ls.filter((l) => l.id !== id));
    try {
      await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      toast.success('Lead excluído');
    } catch {
      setLeads(prev);
      toast.error('Erro ao excluir');
    }
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (lead: Lead) => {
    setEditingId(lead.id);
    setForm({
      name: lead.name,
      email: lead.email || '',
      phone: lead.phone || '',
      whatsapp: lead.whatsapp || '',
      source: lead.source,
      stage: lead.stage,
      handledBy: lead.handledBy,
      interest: lead.interest || '',
      value: lead.value ? String(lead.value) : '',
      notes: lead.notes || '',
    });
    setShowForm(true);
  };

  const saveLead = async () => {
    if (!form.name.trim()) {
      toast.error('Informe o nome do lead');
      return;
    }
    const payload = {
      ...form,
      value: form.value ? Number(form.value) : undefined,
    };
    try {
      if (editingId) {
        const res = await fetch(`/api/leads/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        setLeads((ls) => ls.map((l) => (l.id === editingId ? data.lead : l)));
        toast.success('Lead atualizado');
      } else {
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        setLeads((ls) => [data.lead, ...ls]);
        toast.success('Lead criado');
      }
      setShowForm(false);
    } catch {
      toast.error('Erro ao salvar lead');
    }
  };

  // ---- Drag & Drop ----
  const onDrop = (stage: LeadStage) => {
    if (draggedId) {
      const lead = leads.find((l) => l.id === draggedId);
      if (lead && lead.stage !== stage) moveLead(draggedId, stage);
    }
    setDraggedId(null);
    setDragOverStage(null);
  };

  const iaCount = leads.filter((l) => l.handledBy === 'ia').length;
  const manualCount = leads.filter((l) => l.handledBy === 'manual').length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="text-4xl font-bold">Leads</h1>
          <p className="text-gray-500 text-sm mt-1">
            {leads.length} leads · {iaCount} com IA · {manualCount} manuais
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowIntegrations(true)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Plug size={18} /> Integrações
          </button>
          <button
            onClick={fetchLeads}
            className="btn btn-secondary flex items-center gap-2"
          >
            <RefreshCw size={18} /> Atualizar
          </button>
          <button onClick={openNew} className="btn btn-primary flex items-center gap-2">
            <Plus size={18} /> Novo Lead
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-6 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, email, telefone, interesse..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as LeadSource | 'all')}
          className="input w-auto"
        >
          <option value="all">Todas as fontes</option>
          {SOURCES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Toggle IA / Manual */}
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          {(['all', 'ia', 'manual'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setHandledFilter(opt)}
              className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1 ${
                handledFilter === opt
                  ? 'bg-yellow-400 text-black'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {opt === 'ia' && <Bot size={14} />}
              {opt === 'manual' && <User size={14} />}
              {opt === 'all' ? 'Todos' : opt === 'ia' ? 'IA' : 'Manual'}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban */}
      {loading ? (
        <div className="text-center py-20 text-gray-500">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" />
          Carregando leads...
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const items = leadsByStage(stage.key);
            return (
              <div
                key={stage.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStage(stage.key);
                }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={() => onDrop(stage.key)}
                className={`flex-shrink-0 w-72 bg-gray-100 rounded-lg border-t-4 ${
                  stage.color
                } ${dragOverStage === stage.key ? 'ring-2 ring-blue-400' : ''}`}
              >
                <div className="p-3 flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{stage.label}</h3>
                  <span className="bg-white text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    {items.length}
                  </span>
                </div>

                <div className="px-2 pb-3 space-y-2 min-h-[120px]">
                  {items.map((lead) => {
                    const sm = sourceMeta(lead.source);
                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => setDraggedId(lead.id)}
                        onDragEnd={() => setDraggedId(null)}
                        className={`bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                          draggedId === lead.id ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1 min-w-0">
                            <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
                            <p className="font-semibold text-sm truncate">{lead.name}</p>
                          </div>
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${sm.badge}`}
                          >
                            {sm.label}
                          </span>
                        </div>

                        {lead.interest && (
                          <p className="text-xs text-gray-600 mt-1.5">🎯 {lead.interest}</p>
                        )}
                        {lead.value ? (
                          <p className="text-xs font-semibold text-amber-600 mt-1">
                            R$ {lead.value.toLocaleString('pt-BR')}
                          </p>
                        ) : null}
                        {lead.phone && (
                          <p className="text-xs text-gray-500 mt-1">{lead.phone}</p>
                        )}
                        {lead.lastMessage && (
                          <p className="text-xs text-gray-400 italic mt-1.5 line-clamp-2">
                            “{lead.lastMessage}”
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => toggleHandledBy(lead)}
                            title="Alternar IA / Manual"
                            className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded ${
                              lead.handledBy === 'ia'
                                ? 'bg-yellow-50 text-amber-700'
                                : 'bg-gray-50 text-gray-700'
                            }`}
                          >
                            {lead.handledBy === 'ia' ? (
                              <>
                                <Bot size={12} /> IA
                              </>
                            ) : (
                              <>
                                <User size={12} /> Manual
                              </>
                            )}
                          </button>
                          <div className="flex gap-1">
                            <button
                              onClick={() => openEdit(lead)}
                              className="p-1 hover:bg-yellow-50 rounded"
                              title="Editar"
                            >
                              <Edit2 size={14} className="text-amber-600" />
                            </button>
                            <button
                              onClick={() => removeLead(lead.id)}
                              className="p-1 hover:bg-red-50 rounded"
                              title="Excluir"
                            >
                              <Trash2 size={14} className="text-red-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {items.length === 0 && (
                    <div className="text-center text-xs text-gray-400 py-6 border-2 border-dashed border-gray-200 rounded-lg">
                      Arraste leads para cá
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Lead */}
      {showForm && (
        <Modal title={editingId ? 'Editar Lead' : 'Novo Lead'} onClose={() => setShowForm(false)}>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              className="input md:col-span-2"
              placeholder="Nome completo *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="input"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              className="input"
              placeholder="Telefone / WhatsApp"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value, whatsapp: e.target.value })}
            />
            <select
              className="input"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value as LeadSource })}
            >
              {SOURCES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={form.stage}
              onChange={(e) => setForm({ ...form, stage: e.target.value as LeadStage })}
            >
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={form.handledBy}
              onChange={(e) => setForm({ ...form, handledBy: e.target.value as HandledBy })}
            >
              <option value="manual">Atendimento Manual</option>
              <option value="ia">Atendimento IA</option>
            </select>
            <input
              className="input"
              placeholder="Expedição de interesse"
              value={form.interest}
              onChange={(e) => setForm({ ...form, interest: e.target.value })}
            />
            <input
              className="input"
              type="number"
              placeholder="Valor estimado (R$)"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
            <textarea
              className="input md:col-span-2 h-20"
              placeholder="Observações"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={saveLead} className="btn btn-primary">
              {editingId ? 'Salvar alterações' : 'Criar Lead'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn btn-secondary">
              Cancelar
            </button>
          </div>
        </Modal>
      )}

      {/* Modal de Integrações */}
      {showIntegrations && (
        <IntegrationsModal onClose={() => setShowIntegrations(false)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componentes auxiliares
// ---------------------------------------------------------------------------

function Modal({
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function IntegrationsModal({ onClose }: { onClose: () => void }) {
  const [origin, setOrigin] = useState('');
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const integrations = [
    {
      icon: <MessageCircle className="text-green-600" />,
      name: 'WhatsApp',
      desc: 'Cada nova conversa que o bot identifica vira um lead automaticamente (atendimento IA).',
      url: `${origin}/api/whatsapp/message`,
      active: true,
    },
    {
      icon: <span className="text-red-600 font-bold text-lg">G</span>,
      name: 'Google Ads',
      desc: 'Cole esta URL no webhook do "Formulário de Lead" (Lead Form Extension) do Google Ads.',
      url: `${origin}/api/leads/webhook?source=google_ads`,
      active: false,
    },
    {
      icon: <span className="text-amber-600 font-bold text-lg">f</span>,
      name: 'Meta Ads (Facebook/Instagram)',
      desc: 'Cole esta URL como Callback URL do Lead Ads no Meta Business / Gerenciador de Anúncios.',
      url: `${origin}/api/leads/webhook?source=meta_ads`,
      active: false,
    },
  ];

  return (
    <Modal title="Fontes de Leads / Integrações" onClose={onClose}>
      <p className="text-sm text-gray-600 mb-4">
        Conecte seus canais de captação. Os leads chegam direto no quadro, na coluna{' '}
        <strong>Novos Leads</strong>.
      </p>
      <div className="space-y-4">
        {integrations.map((it) => (
          <div key={it.name} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-lg">
                  {it.icon}
                </span>
                <h3 className="font-semibold">{it.name}</h3>
              </div>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  it.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {it.active ? 'Ativo' : 'Configurar'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-3">{it.desc}</p>
            <div className="flex gap-2">
              <code className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 text-xs overflow-x-auto whitespace-nowrap">
                {it.url}
              </code>
              <button
                onClick={() => copy(it.url)}
                className="btn btn-secondary flex items-center gap-1 px-3"
              >
                <Copy size={14} /> Copiar
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-gray-700">
        💡 Dica: para proteger os webhooks, defina <code>LEADS_WEBHOOK_TOKEN</code> no{' '}
        <code>.env.local</code> e envie o mesmo valor no header{' '}
        <code>x-webhook-token</code>.
      </div>
    </Modal>
  );
}
