'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft, Send, Bot, PauseCircle, Wifi, WifiOff,
  AlertTriangle, RefreshCw, QrCode, Phone,
  Settings, X, Save, Trash2, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface BotConv {
  phone: string;
  name: string | null;
  stage: string;
  botActive: boolean;
  expeditionInterest: string | null;
  lastMessage: string;
  updatedAt: string;
  waitingMinutes: number | null;
  alertedOperator: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface WaStatus {
  connected: boolean;
  qr: boolean;
  offline?: boolean;
}

interface BotSettings {
  alertMinutes: number;
  followup1Hours: number;
  followup2Hours: number;
  followupMessage1: string;
  followupMessage2: string;
  diegoPhone: string;
  michellePhone: string;
  operatorNotes: string;
}

const DEFAULT_SETTINGS: BotSettings = {
  alertMinutes: 20,
  followup1Hours: 24,
  followup2Hours: 48,
  followupMessage1: 'Oi! 😊 Passando pra saber se ficou alguma dúvida sobre a expedição. Posso te ajudar?',
  followupMessage2: 'Oi! Ainda tem vagas disponíveis na expedição que você perguntou. Quer garantir a sua? 🚙',
  diegoPhone: '',
  michellePhone: '',
  operatorNotes: '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const STAGE_LABEL: Record<string, string> = {
  new: 'Novo',
  lead_qualified: 'Lead',
  human: 'Humano',
  cold: 'Frio',
  supplier: 'Fornecedor',
  finalizado: 'Concluído',
};

const STAGE_COLOR: Record<string, string> = {
  new: 'bg-gray-100 text-gray-600',
  lead_qualified: 'bg-blue-100 text-blue-700',
  human: 'bg-orange-100 text-orange-700',
  cold: 'bg-slate-100 text-slate-600',
  supplier: 'bg-purple-100 text-purple-700',
  finalizado: 'bg-green-100 text-green-700',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function WhatsAppPage() {
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [conversations, setConversations] = useState<BotConv[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [waStatus, setWaStatus] = useState<WaStatus>({ connected: false, qr: false });
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Config panel ──────────────────────────────────────────────────────────
  const [configOpen, setConfigOpen]       = useState(false);
  const [configTab, setConfigTab]         = useState<'rules' | 'chat'>('rules');
  const [settings, setSettings]           = useState<BotSettings>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [metaMessages, setMetaMessages]   = useState<Message[]>([]);
  const [metaInput, setMetaInput]         = useState('');
  const [metaLoading, setMetaLoading]     = useState(false);
  const metaEndRef = useRef<HTMLDivElement>(null);
  const [qrData, setQrData]               = useState<{ connected: boolean; qr: string | null; offline?: boolean } | null>(null);
  const [qrLoading, setQrLoading]         = useState(false);

  // ── Config: load / save / meta-chat ──────────────────────────────────────

  const loadSettings = useCallback(async () => {
    try {
      const [sr, mr] = await Promise.all([
        fetch('/api/whatsapp/bot-settings'),
        fetch('/api/whatsapp/meta-chat'),
      ]);
      if (sr.ok) setSettings(await sr.json());
      if (mr.ok) {
        const md = await mr.json();
        setMetaMessages(md.history || []);
        if (md.operatorNotes !== undefined) {
          setSettings((s) => ({ ...s, operatorNotes: md.operatorNotes }));
        }
      }
    } catch { /* bot offline */ }
  }, []);

  const loadQR = useCallback(async () => {
    setQrLoading(true);
    try {
      const res = await fetch('/api/whatsapp/qr');
      setQrData(res.ok ? await res.json() : { connected: false, qr: null });
    } catch {
      setQrData({ connected: false, qr: null, offline: true });
    } finally {
      setQrLoading(false);
    }
  }, []);

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await fetch('/api/whatsapp/bot-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      toast.success('Configurações salvas!');
    } catch { toast.error('Bot offline'); }
    finally { setSavingSettings(false); }
  };

  const sendMetaChat = async () => {
    const msg = metaInput.trim();
    if (!msg || metaLoading) return;
    setMetaInput('');
    setMetaLoading(true);
    setMetaMessages((m) => [...m, { role: 'user', content: msg }]);
    try {
      const res = await fetch('/api/whatsapp/meta-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Erro'); return; }
      setMetaMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
      setSettings((s) => ({ ...s, operatorNotes: data.operatorNotes }));
      setTimeout(() => metaEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch { toast.error('Bot offline'); }
    finally { setMetaLoading(false); }
  };

  const clearMetaChat = async () => {
    if (!confirm('Limpar histórico do chat com o agente?')) return;
    await fetch('/api/whatsapp/meta-chat', { method: 'DELETE' });
    setMetaMessages([]);
    toast.success('Histórico limpo');
  };

  // ── Fetch conversations ────────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/conversations');
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch { /* bot offline */ }
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/status');
      const data = await res.json();
      setWaStatus(data);
    } catch { setWaStatus({ connected: false, qr: false, offline: true }); }
  }, []);

  const loadThread = useCallback(async (phone: string) => {
    try {
      const res = await fetch(`/api/whatsapp/conversations/${encodeURIComponent(phone)}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch { /* ignore */ }
  }, []);

  // ── SSE realtime ──────────────────────────────────────────────────────────

  useEffect(() => {
    const es = new EventSource('/api/whatsapp/events');

    const onNewMessage = () => {
      loadConversations();
      if (selected) loadThread(selected);
    };
    const onAlert = () => loadConversations();

    es.addEventListener('new_message', onNewMessage);
    es.addEventListener('bot_reply', onNewMessage);
    es.addEventListener('operator_alert', onAlert);

    return () => es.close();
  }, [selected, loadConversations, loadThread]);

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    loadConversations();
    loadStatus();
    const si = setInterval(loadStatus, 20000);
    return () => clearInterval(si);
  }, [loadConversations, loadStatus]);

  useEffect(() => {
    if (configOpen) {
      loadSettings();
      loadQR();
    }
  }, [configOpen, loadSettings, loadQR]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const openConversation = (phone: string) => {
    setSelected(phone);
    setMobileView('chat');
    loadThread(phone);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const sendMessage = async () => {
    if (!text.trim() || !selected || sending) return;
    setSending(true);
    const t = text.trim();
    setText('');
    try {
      const res = await fetch(
        `/api/whatsapp/conversations/${encodeURIComponent(selected)}/send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: t }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Erro ao enviar');
        setText(t); // restore
      } else {
        await loadThread(selected);
        await loadConversations();
      }
    } catch {
      toast.error('Bot offline');
      setText(t);
    } finally {
      setSending(false);
    }
  };

  const toggleBot = async (phone: string, botActive: boolean) => {
    try {
      await fetch(`/api/whatsapp/conversations/${encodeURIComponent(phone)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_active: botActive ? 0 : 1 }),
      });
      toast.success(botActive ? 'Bot pausado — você assumiu' : 'Bot retomado');
      await loadConversations();
      if (selected === phone) await loadThread(phone);
    } catch { toast.error('Bot offline'); }
  };

  // ── Derivados ─────────────────────────────────────────────────────────────

  const selectedConv = conversations.find((c) => c.phone === selected);
  const alerts = conversations.filter(
    (c) => c.waitingMinutes !== null && c.waitingMinutes >= 20 && c.botActive
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    /* Escapa o padding do layout e usa altura total disponível */
    <div
      className="-mx-4 md:-mx-8 -mt-4 md:-mt-8 flex flex-col overflow-hidden bg-gray-50"
      style={{ height: 'calc(100dvh - 57px)' }}
    >

      {/* ── Status bar ────────────────────────────────────────────────────── */}
      <div className="bg-gray-900 text-white flex items-center gap-3 px-4 py-2 shrink-0">
        <span className="font-semibold text-sm text-yellow-400">WhatsApp IA</span>
        <div className="flex-1" />
        {waStatus.offline ? (
          <span className="flex items-center gap-1 text-red-400 text-xs">
            <WifiOff size={13} /> Bot offline
          </span>
        ) : waStatus.connected ? (
          <span className="flex items-center gap-1 text-green-400 text-xs">
            <Wifi size={13} /> Conectado
          </span>
        ) : waStatus.qr ? (
          <a
            href="/dashboard/whatsapp/qr"
            className="flex items-center gap-1 text-yellow-400 text-xs hover:underline"
          >
            <QrCode size={13} /> Escanear QR
          </a>
        ) : (
          <span className="flex items-center gap-1 text-gray-400 text-xs">
            <WifiOff size={13} /> Desconectado
          </span>
        )}
        <button
          onClick={() => { loadConversations(); loadStatus(); }}
          className="p-1 hover:bg-gray-700 rounded text-gray-400"
          title="Atualizar"
        >
          <RefreshCw size={14} />
        </button>
        <button
          onClick={() => setConfigOpen(true)}
          className="p-1 hover:bg-gray-700 rounded text-gray-400"
          title="Configurações"
        >
          <Settings size={14} />
        </button>
      </div>

      {/* ── Painel de configurações (overlay) ────────────────────────────── */}
      {configOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="flex-1 bg-black/40" onClick={() => setConfigOpen(false)} />
          <div className="w-full max-w-sm bg-white flex flex-col shadow-2xl">

            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-gray-900 text-white shrink-0">
              <Settings size={16} className="text-yellow-400" />
              <span className="font-semibold text-sm flex-1">Configurações do Bot</span>
              <button onClick={() => setConfigOpen(false)} className="p-1 hover:bg-gray-700 rounded">
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 shrink-0">
              {([['rules', 'Regras & Config'], ['chat', 'Falar com o agente']] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setConfigTab(k)}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors
                    ${configTab === k
                      ? 'text-yellow-600 border-b-2 border-yellow-400 bg-yellow-50'
                      : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── Aba: Regras & Config ────────────────────────────────────── */}
            {configTab === 'rules' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* WhatsApp connection */}
                <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                      <QrCode size={13} /> Conexão WhatsApp
                    </span>
                    <button
                      onClick={loadQR}
                      className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-0.5"
                    >
                      <RefreshCw size={10} className={qrLoading ? 'animate-spin' : ''} /> Atualizar
                    </button>
                  </div>
                  {qrLoading ? (
                    <div className="flex justify-center py-3">
                      <Loader2 size={22} className="animate-spin text-gray-400" />
                    </div>
                  ) : qrData?.connected ? (
                    <div className="flex items-center gap-2 text-green-600 text-sm py-1">
                      <Wifi size={15} />
                      <span className="font-medium">WhatsApp conectado</span>
                    </div>
                  ) : qrData?.offline ? (
                    <div className="flex items-center gap-2 text-red-500 text-sm py-1">
                      <WifiOff size={15} />
                      <span>Bot offline — inicie o servidor do bot</span>
                    </div>
                  ) : qrData?.qr ? (
                    <div className="flex flex-col items-center gap-2">
                      <img src={qrData.qr} alt="QR Code WhatsApp" className="w-48 h-48 rounded-lg border border-gray-200" />
                      <p className="text-[11px] text-gray-500 text-center">
                        Abra o WhatsApp → Menu → Dispositivos conectados → Conectar dispositivo
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400 text-sm py-1">
                      <WifiOff size={15} />
                      <span>Aguardando QR Code...</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Alerta sem resp. (min)</label>
                    <input
                      type="number" min={1}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
                      value={settings.alertMinutes}
                      onChange={(e) => setSettings((s) => ({ ...s, alertMinutes: +e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Follow-up 1 após (h)</label>
                    <input
                      type="number" min={1}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
                      value={settings.followup1Hours}
                      onChange={(e) => setSettings((s) => ({ ...s, followup1Hours: +e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Follow-up 2 após (h)</label>
                    <input
                      type="number" min={1}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
                      value={settings.followup2Hours}
                      onChange={(e) => setSettings((s) => ({ ...s, followup2Hours: +e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Mensagem follow-up 1
                    <span className="ml-1 text-gray-400">(enviada após {settings.followup1Hours}h sem resposta)</span>
                  </label>
                  <textarea
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-yellow-400"
                    value={settings.followupMessage1}
                    onChange={(e) => setSettings((s) => ({ ...s, followupMessage1: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Mensagem follow-up 2
                    <span className="ml-1 text-gray-400">(enviada após {settings.followup2Hours}h sem resposta)</span>
                  </label>
                  <textarea
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-yellow-400"
                    value={settings.followupMessage2}
                    onChange={(e) => setSettings((s) => ({ ...s, followupMessage2: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Telefone do Diego (para fornecedores)</label>
                  <input
                    type="text" placeholder="5511999999999"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
                    value={settings.diegoPhone}
                    onChange={(e) => setSettings((s) => ({ ...s, diegoPhone: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Telefone da Michelle (notificações)</label>
                  <input
                    type="text" placeholder="5511999999999"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
                    value={settings.michellePhone}
                    onChange={(e) => setSettings((s) => ({ ...s, michellePhone: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Instruções ativas do operador
                    <span className="ml-1 text-gray-400">(edite direto ou use o chat)</span>
                  </label>
                  <textarea
                    rows={8}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-yellow-400 font-mono"
                    placeholder={"• Serra Gaúcha tem 3 vagas restantes, criar urgência\n• Não oferecer desconto sem falar com Diego\n• ..."}
                    value={settings.operatorNotes}
                    onChange={(e) => setSettings((s) => ({ ...s, operatorNotes: e.target.value }))}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Estas instruções são injetadas no prompt do agente com prioridade máxima.
                  </p>
                </div>

                <button
                  onClick={saveSettings}
                  disabled={savingSettings}
                  className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500
                    disabled:opacity-50 text-black font-semibold py-2.5 rounded-lg transition-colors"
                >
                  {savingSettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {savingSettings ? 'Salvando...' : 'Salvar configurações'}
                </button>
              </div>
            )}

            {/* ── Aba: Chat com o agente ──────────────────────────────────── */}
            {configTab === 'chat' && (
              <div className="flex flex-col flex-1 min-h-0">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
                  {metaMessages.length === 0 && (
                    <div className="text-center text-gray-400 text-xs mt-4 space-y-1">
                      <Bot size={28} className="mx-auto opacity-30" />
                      <p className="font-medium text-gray-500">Fale com o agente</p>
                      <p>Dê instruções em linguagem natural.<br/>Ele confirma e aplica nas conversas com clientes.</p>
                      <div className="mt-3 space-y-1 text-left">
                        {[
                          'Serra Gaúcha tem 3 vagas, cria urgência',
                          'Não ofereça desconto, direcione pro Diego',
                          'Essa semana promoção especial: 5% à vista',
                          'Expedição Pantanal está suspensa',
                        ].map((tip) => (
                          <button
                            key={tip}
                            onClick={() => setMetaInput(tip)}
                            className="block w-full text-left text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-yellow-50 hover:border-yellow-300 transition-colors"
                          >
                            {tip}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {metaMessages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap
                        ${m.role === 'user'
                          ? 'bg-yellow-400 text-gray-900 rounded-tr-sm'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
                        }`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {metaLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-200 px-3 py-2 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2 text-sm text-gray-400">
                        <Loader2 size={14} className="animate-spin" /> Processando...
                      </div>
                    </div>
                  )}
                  <div ref={metaEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-gray-200 p-3 shrink-0 bg-white">
                  <div className="flex items-end gap-2">
                    <textarea
                      rows={2}
                      className="flex-1 resize-none border border-gray-300 rounded-xl px-3 py-2 text-sm
                        focus:outline-none focus:border-yellow-400 placeholder:text-gray-400"
                      placeholder="Ex: Serra Gaúcha tem 3 vagas, cria urgência..."
                      value={metaInput}
                      onChange={(e) => setMetaInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMetaChat(); }
                      }}
                      disabled={metaLoading}
                    />
                    <button
                      onClick={sendMetaChat}
                      disabled={!metaInput.trim() || metaLoading}
                      className="bg-yellow-400 hover:bg-yellow-500 disabled:opacity-40 text-black
                        rounded-full w-9 h-9 flex items-center justify-center shrink-0 transition-colors"
                    >
                      <Send size={15} />
                    </button>
                  </div>
                  {metaMessages.length > 0 && (
                    <button
                      onClick={clearMetaChat}
                      className="mt-2 flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={10} /> Limpar histórico
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Alertas de espera ─────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="bg-red-600 text-white px-4 py-2 shrink-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle size={15} />
            {alerts.length === 1
              ? `${alerts[0].name || alerts[0].phone} aguardando há ${alerts[0].waitingMinutes}min`
              : `${alerts.length} leads aguardando resposta`}
          </div>
          {alerts.length > 1 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {alerts.map((a) => (
                <button
                  key={a.phone}
                  onClick={() => openConversation(a.phone)}
                  className="text-xs bg-red-800 hover:bg-red-700 px-2 py-0.5 rounded"
                >
                  {a.name || a.phone} ({a.waitingMinutes}min)
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Área principal: lista + chat ───────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Lista de conversas ───────────────────────────────────────────── */}
        <div
          className={`
            flex flex-col bg-white border-r border-gray-200
            ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}
            w-full md:w-80 lg:w-96 shrink-0
          `}
        >
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Conversas ({conversations.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm gap-2">
                <Phone size={28} className="opacity-40" />
                <span>{waStatus.offline ? 'Bot offline' : 'Nenhuma conversa ainda'}</span>
              </div>
            ) : (
              conversations.map((conv) => (
                <ConvItem
                  key={conv.phone}
                  conv={conv}
                  selected={selected === conv.phone}
                  onOpen={() => openConversation(conv.phone)}
                  onToggleBot={() => toggleBot(conv.phone, conv.botActive)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Thread de chat ───────────────────────────────────────────────── */}
        <div
          className={`
            flex flex-col flex-1 min-w-0
            ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}
          `}
        >
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
              <Bot size={48} className="opacity-20 mb-3" />
              <p className="text-sm">Selecione uma conversa</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setMobileView('list')}
                  className="md:hidden p-1 -ml-1 text-gray-500 hover:text-gray-800 rounded"
                >
                  <ArrowLeft size={20} />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 truncate">
                      {selectedConv?.name || selected}
                    </span>
                    {selectedConv && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${STAGE_COLOR[selectedConv.stage] || 'bg-gray-100 text-gray-600'}`}>
                        {STAGE_LABEL[selectedConv.stage] || selectedConv.stage}
                      </span>
                    )}
                  </div>
                  {selectedConv?.expeditionInterest && (
                    <p className="text-xs text-gray-400 truncate">{selectedConv.expeditionInterest}</p>
                  )}
                </div>

                {selectedConv && (
                  <button
                    onClick={() => toggleBot(selected, selectedConv.botActive)}
                    className={`
                      flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors
                      ${selectedConv.botActive
                        ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700'
                        : 'bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700'
                      }
                    `}
                    title={selectedConv.botActive ? 'Pausar bot (assumir conversa)' : 'Retomar bot'}
                  >
                    {selectedConv.botActive
                      ? <><Bot size={13} /> Bot ativo</>
                      : <><PauseCircle size={13} /> Pausado</>
                    }
                  </button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm mt-8">Sem histórico</div>
                ) : (
                  messages.map((m, i) => (
                    <ChatBubble key={i} message={m} />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="bg-white border-t border-gray-200 p-3 flex items-end gap-2 shrink-0">
                <textarea
                  ref={inputRef}
                  rows={1}
                  className="flex-1 resize-none rounded-2xl border border-gray-300 px-4 py-2.5 text-sm
                    focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400
                    placeholder:text-gray-400 max-h-32 overflow-y-auto"
                  placeholder={
                    selectedConv?.botActive
                      ? 'Responder como operador (pausa o bot)…'
                      : 'Responder como operador…'
                  }
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    // Auto-resize
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={sending}
                />
                <button
                  onClick={sendMessage}
                  disabled={!text.trim() || sending}
                  className="bg-yellow-400 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed
                    text-black rounded-full w-10 h-10 flex items-center justify-center shrink-0 transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Componente: item da lista ─────────────────────────────────────────────────

function ConvItem({
  conv,
  selected,
  onOpen,
  onToggleBot,
}: {
  conv: BotConv;
  selected: boolean;
  onOpen: () => void;
  onToggleBot: () => void;
}) {
  const isWaiting = conv.waitingMinutes !== null && conv.waitingMinutes >= 20;

  return (
    <button
      onClick={onOpen}
      className={`w-full text-left flex items-start gap-3 px-4 py-3.5 border-b border-gray-50
        hover:bg-gray-50 active:bg-gray-100 transition-colors
        ${selected ? 'bg-yellow-50 border-l-2 border-l-yellow-400' : ''}
      `}
    >
      {/* Avatar */}
      <div className={`
        w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5
        ${isWaiting ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600'}
      `}>
        {(conv.name || conv.phone).slice(0, 1).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-sm text-gray-900 truncate flex-1">
            {conv.name || conv.phone}
          </span>
          <span className="text-[10px] text-gray-400 shrink-0">
            {relativeTime(conv.updatedAt)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mb-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STAGE_COLOR[conv.stage] || 'bg-gray-100 text-gray-600'}`}>
            {STAGE_LABEL[conv.stage] || conv.stage}
          </span>
          {conv.botActive ? (
            <span className="text-[10px] text-green-600 flex items-center gap-0.5">
              <Bot size={10} /> bot
            </span>
          ) : (
            <span className="text-[10px] text-orange-600 flex items-center gap-0.5">
              <PauseCircle size={10} /> pausado
            </span>
          )}
          {isWaiting && (
            <span className="text-[10px] text-red-600 flex items-center gap-0.5 font-medium">
              <AlertTriangle size={10} /> {conv.waitingMinutes}min
            </span>
          )}
        </div>

        <p className="text-xs text-gray-400 truncate">{conv.lastMessage || '—'}</p>
      </div>

      {/* Botão bot toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleBot(); }}
        className={`
          shrink-0 p-1.5 rounded-full mt-0.5 transition-colors
          ${conv.botActive
            ? 'text-green-600 hover:bg-red-50 hover:text-red-600'
            : 'text-red-500 hover:bg-green-50 hover:text-green-600'
          }
        `}
        title={conv.botActive ? 'Pausar bot' : 'Retomar bot'}
      >
        {conv.botActive ? <Bot size={16} /> : <PauseCircle size={16} />}
      </button>
    </button>
  );
}

// ── Componente: bolha de mensagem ─────────────────────────────────────────────

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const isOperator = message.role === 'assistant' &&
    typeof message.content === 'string' &&
    message.content.startsWith('[Operador]');

  const content = isOperator
    ? message.content.replace('[Operador] ', '')
    : message.content;

  return (
    <div className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`
          max-w-[78%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed
          ${isUser
            ? 'bg-white text-gray-900 rounded-tl-sm shadow-sm border border-gray-100'
            : isOperator
            ? 'bg-orange-500 text-white rounded-tr-sm'
            : 'bg-yellow-400 text-gray-900 rounded-tr-sm'
          }
        `}
      >
        {isOperator && (
          <p className="text-[9px] opacity-75 mb-0.5 font-semibold uppercase tracking-wide">Equipe</p>
        )}
        <p className="whitespace-pre-wrap break-words">{content}</p>
      </div>
    </div>
  );
}
