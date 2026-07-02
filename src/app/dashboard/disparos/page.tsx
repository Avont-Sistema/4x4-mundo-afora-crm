'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Send, Plus, Pause, Play, X, Trash2, Users, CheckCircle2,
  XCircle, Clock, AlertCircle, ChevronDown, ChevronUp,
  MessageSquare, Image, Mic, RefreshCw, Eye,
} from 'lucide-react';
import FileOrUrlInput from '@/components/FileOrUrlInput';

// ── Types ────────────────────────────────────────────────────────────────────

type BroadcastStatus = 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
type RecipientSource = 'all_leads' | 'all_clients' | 'custom';

interface BroadcastStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

interface Broadcast {
  id: string;
  name: string;
  message: string;
  mediaUrl?: string;
  mediaType?: string;
  status: BroadcastStatus;
  recipientSource: RecipientSource;
  intervalSec: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  stats: BroadcastStats;
}

interface Recipient {
  id: string;
  phone: string;
  name?: string;
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  scheduledAt: string;
  sentAt?: string;
  error?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<BroadcastStatus, string> = {
  draft: 'Rascunho',
  running: 'Enviando',
  paused: 'Pausado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const STATUS_COLOR: Record<BroadcastStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  running: 'bg-blue-100 text-blue-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const SOURCE_LABEL: Record<RecipientSource, string> = {
  all_leads: 'Todos os Leads',
  all_clients: 'Todos os Clientes',
  custom: 'Lista personalizada',
};

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function progressPct(stats: BroadcastStats): number {
  if (stats.total === 0) return 0;
  return Math.round(((stats.sent + stats.failed) / stats.total) * 100);
}

// ── Form defaults ─────────────────────────────────────────────────────────────

function emptyForm() {
  return {
    name: '',
    message: '',
    mediaUrl: '',
    mediaType: '' as '' | 'image' | 'audio' | 'video',
    recipientSource: 'all_leads' as RecipientSource,
    customPhones: '',
    intervalSec: 10,
    scheduleType: 'now' as 'now' | 'later',
    scheduledAt: '',
  };
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DisparosPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/broadcasts');
    const data = await res.json();
    setBroadcasts(data.broadcasts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 8000);
    return () => clearInterval(iv);
  }, [load]);

  // Verifica progresso/conclusão dos disparos em execução a cada 15s.
  // O envio em si é feito pelo bot (push ou poll) — esta chamada não envia nada.
  useEffect(() => {
    const processRunning = async () => {
      const running = broadcasts.filter((b) => b.status === 'running');
      for (const b of running) {
        await fetch(`/api/broadcasts/${b.id}/process`, { method: 'POST' }).catch(() => {});
      }
      if (running.length > 0) await load();
    };
    if (broadcasts.some((b) => b.status === 'running')) {
      processRunning();
      const iv = setInterval(processRunning, 15000);
      return () => clearInterval(iv);
    }
    return undefined;
  }, [broadcasts.map((b) => b.id + b.status).join(','), load]);

  const loadRecipients = async (id: string) => {
    setLoadingRecipients(true);
    const res = await fetch(`/api/broadcasts/${id}`);
    const data = await res.json();
    setRecipients(data.broadcast?.recipients ?? []);
    setLoadingRecipients(false);
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setRecipients([]);
    } else {
      setExpandedId(id);
      loadRecipients(id);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.message.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        message: form.message.trim(),
        recipientSource: form.recipientSource,
        intervalSec: form.intervalSec,
        mediaUrl: form.mediaUrl.trim() || null,
        mediaType: form.mediaType || null,
        scheduledAt: form.scheduleType === 'later' && form.scheduledAt ? form.scheduledAt : null,
        customPhones: form.recipientSource === 'custom' ? form.customPhones : '',
      };

      const res = await fetch('/api/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowCreate(false);
      setForm(emptyForm());
      await load();
    } catch (e) {
      alert('Erro: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleStart = async (broadcast: Broadcast) => {
    setActionLoading(broadcast.id + ':start');
    try {
      const body: Record<string, unknown> = {};
      // For custom source, we'd need phones — but since we're starting from an existing broadcast,
      // the phones should already be loaded or we need to handle custom separately
      const res = await fetch(`/api/broadcasts/${broadcast.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.invalid > 0) {
        alert(
          `Disparo iniciado com ${data.count} destinatário(s). ` +
          `${data.invalid} número(s) inválido(s) foram marcados como falha — ` +
          `provavelmente são IDs internos do WhatsApp (@lid) ou números mal formatados. ` +
          `Veja os detalhes expandindo o disparo.`
        );
      }
      await load();
    } catch (e) {
      alert('Erro: ' + (e as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePause = async (id: string) => {
    setActionLoading(id + ':pause');
    try {
      const res = await fetch(`/api/broadcasts/${id}/pause`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await load();
    } catch (e) {
      alert('Erro: ' + (e as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (id: string) => {
    setActionLoading(id + ':resume');
    try {
      const res = await fetch(`/api/broadcasts/${id}/resume`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await load();
    } catch (e) {
      alert('Erro: ' + (e as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancelar este disparo? Os pendentes não serão enviados.')) return;
    setActionLoading(id + ':cancel');
    try {
      const res = await fetch(`/api/broadcasts/${id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await load();
    } catch (e) {
      alert('Erro: ' + (e as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deletar este disparo permanentemente?')) return;
    setActionLoading(id + ':delete');
    try {
      const res = await fetch(`/api/broadcasts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (expandedId === id) setExpandedId(null);
      await load();
    } catch (e) {
      alert('Erro: ' + (e as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Stats summary ──────────────────────────────────────────────────────────

  const totalSent = broadcasts.reduce((s, b) => s + b.stats.sent, 0);
  const totalFailed = broadcasts.reduce((s, b) => s + b.stats.failed, 0);
  const runningCount = broadcasts.filter((b) => b.status === 'running').length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disparos em Massa</h1>
          <p className="text-sm text-gray-500 mt-1">
            Envie mensagens WhatsApp para múltiplos contatos com cadência automática
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={18} />
          Novo Disparo
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-lg">
              <Send size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Em execução</p>
              <p className="text-2xl font-bold text-gray-900">{runningCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-green-50 p-2 rounded-lg">
              <CheckCircle2 size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total enviados</p>
              <p className="text-2xl font-bold text-gray-900">{totalSent}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-red-50 p-2 rounded-lg">
              <XCircle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Com falha</p>
              <p className="text-2xl font-bold text-gray-900">{totalFailed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading && (
          <div className="text-center py-12 text-gray-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
            Carregando...
          </div>
        )}

        {!loading && broadcasts.length === 0 && (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center">
            <Send size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Nenhum disparo criado ainda</p>
            <p className="text-gray-400 text-sm mt-1">
              Clique em <strong>Novo Disparo</strong> para começar
            </p>
          </div>
        )}

        {broadcasts.map((b) => {
          const pct = progressPct(b.stats);
          const isExpanded = expandedId === b.id;

          return (
            <div key={b.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Card header */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 truncate">{b.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[b.status]}`}>
                        {STATUS_LABEL[b.status]}
                      </span>
                    </div>

                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{b.message}</p>

                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {SOURCE_LABEL[b.recipientSource]}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {b.intervalSec}s entre mensagens
                      </span>
                      {b.startedAt && (
                        <span>Iniciado {fmtDate(b.startedAt)}</span>
                      )}
                    </div>

                    {/* Progress bar */}
                    {b.stats.total > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>
                            {b.stats.sent} enviados · {b.stats.failed} falhas · {b.stats.pending} pendentes
                          </span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              b.status === 'completed' ? 'bg-green-500' :
                              b.status === 'cancelled' ? 'bg-gray-400' : 'bg-blue-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {b.status === 'draft' && (
                      <button
                        onClick={() => handleStart(b)}
                        disabled={actionLoading === b.id + ':start'}
                        className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Send size={14} />
                        {actionLoading === b.id + ':start' ? 'Iniciando...' : 'Iniciar'}
                      </button>
                    )}

                    {b.status === 'running' && (
                      <button
                        onClick={() => handlePause(b.id)}
                        disabled={actionLoading === b.id + ':pause'}
                        className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Pause size={14} />
                        {actionLoading === b.id + ':pause' ? '...' : 'Pausar'}
                      </button>
                    )}

                    {b.status === 'paused' && (
                      <button
                        onClick={() => handleResume(b.id)}
                        disabled={actionLoading === b.id + ':resume'}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Play size={14} />
                        {actionLoading === b.id + ':resume' ? '...' : 'Retomar'}
                      </button>
                    )}

                    {['running', 'paused'].includes(b.status) && (
                      <button
                        onClick={() => handleCancel(b.id)}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1 text-red-500 hover:text-red-700 disabled:opacity-50 text-sm px-2 py-1.5 rounded transition-colors"
                        title="Cancelar"
                      >
                        <X size={16} />
                      </button>
                    )}

                    {['draft', 'completed', 'cancelled'].includes(b.status) && (
                      <button
                        onClick={() => handleDelete(b.id)}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1 text-gray-400 hover:text-red-500 disabled:opacity-50 text-sm px-2 py-1.5 rounded transition-colors"
                        title="Deletar"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}

                    {b.stats.total > 0 && (
                      <button
                        onClick={() => toggleExpand(b.id)}
                        className="flex items-center gap-1 text-gray-400 hover:text-gray-700 text-sm px-2 py-1.5 rounded transition-colors"
                        title="Ver destinatários"
                      >
                        <Eye size={16} />
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Recipients detail */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50 p-4">
                  {loadingRecipients ? (
                    <div className="flex items-center gap-2 text-gray-400 text-sm py-4 justify-center">
                      <RefreshCw size={16} className="animate-spin" /> Carregando...
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-500 uppercase">
                            <th className="text-left pb-2">Nome</th>
                            <th className="text-left pb-2">Telefone</th>
                            <th className="text-left pb-2">Status</th>
                            <th className="text-left pb-2">Agendado</th>
                            <th className="text-left pb-2">Enviado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {recipients.map((r) => (
                            <tr key={r.id}>
                              <td className="py-1.5 pr-3 text-gray-700">{r.name || '—'}</td>
                              <td className="py-1.5 pr-3 text-gray-600 font-mono text-xs">{r.phone}</td>
                              <td className="py-1.5 pr-3">
                                <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                  r.status === 'sent' ? 'bg-green-100 text-green-700' :
                                  r.status === 'failed' ? 'bg-red-100 text-red-700' :
                                  r.status === 'skipped' ? 'bg-gray-100 text-gray-500' :
                                  'bg-blue-50 text-blue-600'
                                }`}>
                                  {r.status === 'sent' && <CheckCircle2 size={10} />}
                                  {r.status === 'failed' && <XCircle size={10} />}
                                  {r.status === 'pending' && <Clock size={10} />}
                                  {r.status === 'skipped' && <AlertCircle size={10} />}
                                  {r.status === 'sent' ? 'Enviado' :
                                   r.status === 'failed' ? (r.error ? `Falha: ${r.error}` : 'Falha') :
                                   r.status === 'skipped' ? 'Ignorado' : 'Pendente'}
                                </span>
                              </td>
                              <td className="py-1.5 pr-3 text-gray-400 text-xs">{fmtDate(r.scheduledAt)}</td>
                              <td className="py-1.5 text-gray-400 text-xs">{fmtDate(r.sentAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-900">Novo Disparo em Massa</h2>
              <button
                onClick={() => { setShowCreate(false); setForm(emptyForm()); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nome da campanha <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Lançamento expedição Lençóis"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mensagem <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  rows={5}
                  placeholder="Olá {nome}! Temos uma novidade incrível para você..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Variáveis disponíveis: <code className="bg-gray-100 px-1 rounded">{'{nome}'}</code>{' '}
                  <code className="bg-gray-100 px-1 rounded">{'{telefone}'}</code>
                </p>
              </div>

              {/* Media (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mídia (opcional)
                </label>
                <div className="flex gap-2 mb-2">
                  {(['', 'image', 'audio', 'video'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm((f) => ({ ...f, mediaType: t, mediaUrl: t ? f.mediaUrl : '' }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        form.mediaType === t
                          ? 'border-yellow-400 bg-yellow-50 text-yellow-800 font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {t === '' && <MessageSquare size={14} />}
                      {t === 'image' && <Image size={14} />}
                      {t === 'audio' && <Mic size={14} />}
                      {t === 'video' && <Play size={14} />}
                      {t === '' ? 'Só texto' : t === 'image' ? 'Imagem' : t === 'audio' ? 'Áudio' : 'Vídeo'}
                    </button>
                  ))}
                </div>
                {form.mediaType && (
                  <FileOrUrlInput
                    type={form.mediaType}
                    value={form.mediaUrl}
                    onChange={(url) => setForm((f) => ({ ...f, mediaUrl: url }))}
                    folder="broadcasts"
                  />
                )}
              </div>

              {/* Recipients */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Destinatários
                </label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {(['all_leads', 'all_clients', 'custom'] as const).map((src) => (
                    <button
                      key={src}
                      onClick={() => setForm((f) => ({ ...f, recipientSource: src }))}
                      className={`px-3 py-2 rounded-lg text-sm border transition-colors text-center ${
                        form.recipientSource === src
                          ? 'border-yellow-400 bg-yellow-50 text-yellow-800 font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {SOURCE_LABEL[src]}
                    </button>
                  ))}
                </div>

                {form.recipientSource === 'custom' && (
                  <textarea
                    value={form.customPhones}
                    onChange={(e) => setForm((f) => ({ ...f, customPhones: e.target.value }))}
                    rows={4}
                    placeholder="Um número por linha:&#10;11999887766&#10;21988776655&#10;+55 31 98765-4321"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none font-mono"
                  />
                )}
              </div>

              {/* Interval */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Intervalo entre mensagens: <strong>{form.intervalSec}s</strong>
                </label>
                <input
                  type="range"
                  min={5}
                  max={120}
                  step={5}
                  value={form.intervalSec}
                  onChange={(e) => setForm((f) => ({ ...f, intervalSec: Number(e.target.value) }))}
                  className="w-full accent-yellow-400"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>5s (mais rápido)</span>
                  <span>120s (mais seguro)</span>
                </div>
                {form.intervalSec < 15 && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Intervalos muito curtos aumentam risco de bloqueio no WhatsApp
                  </p>
                )}
              </div>

              {/* Schedule */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Quando enviar?
                </label>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setForm((f) => ({ ...f, scheduleType: 'now' }))}
                    className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                      form.scheduleType === 'now'
                        ? 'border-yellow-400 bg-yellow-50 text-yellow-800 font-medium'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    Agora ao iniciar
                  </button>
                  <button
                    onClick={() => setForm((f) => ({ ...f, scheduleType: 'later' }))}
                    className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                      form.scheduleType === 'later'
                        ? 'border-yellow-400 bg-yellow-50 text-yellow-800 font-medium'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    Agendar
                  </button>
                </div>
                {form.scheduleType === 'later' && (
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => { setShowCreate(false); setForm(emptyForm()); }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.name.trim() || !form.message.trim()}
                className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-black font-semibold px-5 py-2 rounded-lg transition-colors"
              >
                <Plus size={16} />
                {saving ? 'Criando...' : 'Criar Disparo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
