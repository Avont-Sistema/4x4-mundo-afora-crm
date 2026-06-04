'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Send,
  Loader,
  Bot,
  Inbox,
  Settings,
  FlaskConical,
  Pause,
  Play,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'inbox' | 'simulador' | 'config';

export default function WhatsAppPage() {
  const [tab, setTab] = useState<Tab>('inbox');
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [botPaused, setBotPaused] = useState(false);

  const loadStatus = useCallback(async () => {
    const res = await fetch('/api/whatsapp/settings');
    const data = await res.json();
    setBotPaused(data.settings.botPaused);
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const togglePause = async () => {
    const next = !botPaused;
    setBotPaused(next);
    await fetch('/api/whatsapp/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botPaused: next }),
    });
    toast.success(next ? 'Bot pausado' : 'Bot ativo');
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-4xl font-bold">WhatsApp IA</h1>
        <div className="flex items-center gap-3">
          {aiEnabled === false && (
            <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
              IA em modo demo (configure ANTHROPIC_API_KEY)
            </span>
          )}
          <button
            onClick={togglePause}
            className={`btn flex items-center gap-2 ${
              botPaused ? 'btn-danger' : 'btn-secondary'
            }`}
          >
            {botPaused ? <Play size={16} /> : <Pause size={16} />}
            {botPaused ? 'Bot pausado' : 'Pausar bot'}
          </button>
        </div>
      </div>

      <div className="flex gap-6 border-b border-gray-200 mb-6">
        {[
          { k: 'inbox', label: 'Inbox', icon: Inbox },
          { k: 'simulador', label: 'Simulador', icon: FlaskConical },
          { k: 'config', label: 'Configurações', icon: Settings },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as Tab)}
            className={`pb-3 text-sm font-medium flex items-center gap-2 ${
              tab === t.k
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'inbox' && <InboxTab />}
      {tab === 'simulador' && <SimulatorTab onAi={setAiEnabled} />}
      {tab === 'config' && <ConfigTab />}
    </div>
  );
}

// ===========================================================================
// INBOX — conversas reais + handoff humano
// ===========================================================================
interface ConvSummary {
  phone: string;
  name: string;
  mode: string;
  lastMessage: string;
  lastAt?: string;
  count: number;
}
interface ConvMessage {
  role: 'user' | 'assistant';
  content: string;
  at: string;
  via?: string;
}

const modeBadge: Record<string, string> = {
  bot: 'bg-indigo-100 text-indigo-700',
  human: 'bg-amber-100 text-amber-700',
  resolved: 'bg-gray-100 text-gray-600',
};

function InboxTab() {
  const [convs, setConvs] = useState<ConvSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConvMessage[]>([]);
  const [mode, setMode] = useState('bot');
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const loadConvs = useCallback(async () => {
    const res = await fetch('/api/whatsapp/conversations');
    const data = await res.json();
    setConvs(data.conversations || []);
  }, []);

  const loadThread = useCallback(async (phone: string) => {
    const res = await fetch(`/api/whatsapp/conversations/${encodeURIComponent(phone)}`);
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data.conversation.messages || []);
    setMode(data.conversation.mode);
  }, []);

  useEffect(() => {
    loadConvs();
    const i = setInterval(loadConvs, 5000);
    return () => clearInterval(i);
  }, [loadConvs]);

  useEffect(() => {
    if (!selected) return;
    loadThread(selected);
    const i = setInterval(() => loadThread(selected), 5000);
    return () => clearInterval(i);
  }, [selected, loadThread]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const changeMode = async (m: string) => {
    setMode(m);
    await fetch(`/api/whatsapp/conversations/${encodeURIComponent(selected!)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: m }),
    });
    toast.success(
      m === 'human' ? 'Você assumiu a conversa' : m === 'bot' ? 'Bot reassumiu' : 'Marcada como resolvida'
    );
  };

  const sendManual = async () => {
    if (!text.trim() || !selected) return;
    const t = text;
    setText('');
    await fetch(`/api/whatsapp/conversations/${encodeURIComponent(selected)}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: t }),
    });
    loadThread(selected);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-4 h-[600px]">
      {/* lista */}
      <div className="card overflow-y-auto p-0">
        {convs.length === 0 && (
          <div className="p-6 text-center text-sm text-gray-400">
            Nenhuma conversa ainda. Use o Simulador para testar.
          </div>
        )}
        {convs.map((c) => (
          <button
            key={c.phone}
            onClick={() => setSelected(c.phone)}
            className={`w-full text-left p-3 border-b border-gray-100 hover:bg-gray-50 ${
              selected === c.phone ? 'bg-blue-50' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm truncate">{c.name}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${modeBadge[c.mode]}`}>
                {c.mode}
              </span>
            </div>
            <p className="text-xs text-gray-400 truncate mt-0.5">{c.lastMessage}</p>
          </button>
        ))}
      </div>

      {/* thread */}
      <div className="card lg:col-span-2 flex flex-col p-0">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Selecione uma conversa
          </div>
        ) : (
          <>
            <div className="p-3 border-b border-gray-200 flex items-center justify-between">
              <span className="font-medium text-sm">{selected}</span>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs">
                {['bot', 'human', 'resolved'].map((m) => (
                  <button
                    key={m}
                    onClick={() => changeMode(m)}
                    className={`px-3 py-1 ${
                      mode === m ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'
                    }`}
                  >
                    {m === 'bot' ? 'Bot' : m === 'human' ? 'Humano' : 'Resolvido'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                      m.role === 'user'
                        ? 'bg-gray-200 text-gray-900'
                        : m.via === 'human'
                        ? 'bg-amber-500 text-white'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {m.via === 'human' && <p className="text-[9px] opacity-80 mb-0.5">Equipe</p>}
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            <div className="p-3 border-t border-gray-200 flex gap-2">
              <input
                className="input flex-1"
                placeholder={mode === 'bot' ? 'Assuma a conversa para responder...' : 'Responder como equipe...'}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendManual()}
              />
              <button onClick={sendManual} className="btn btn-primary">
                <Send size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// SIMULADOR — testa o agente sem número real
// ===========================================================================
function SimulatorTab({ onAi }: { onAi: (v: boolean) => void }) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    { role: 'assistant', content: 'Olá! 👋 Bem-vindo à 4x4 Mundo Afora! Como posso ajudar?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('+5511988887777');
  const [name, setName] = useState('');

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages((m) => [...m, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, phone, contactName: name || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.aiEnabled !== undefined) onAi(data.aiEnabled);
        if (data.message) {
          setMessages((m) => [...m, { role: 'assistant', content: data.message }]);
        } else {
          setMessages((m) => [
            ...m,
            { role: 'assistant', content: `(sem resposta automática — ${data.reason})` },
          ]);
        }
        if (data.leadCreated) toast.success('🎯 Novo lead cadastrado pela IA!');
      } else toast.error(data.error || 'Erro');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 card flex flex-col h-[560px]">
        <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-gray-100">
          <input
            className="input flex-1 min-w-[180px] !py-1.5 text-sm"
            placeholder="Telefone do contato"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            className="input flex-1 min-w-[140px] !py-1.5 text-sm"
            placeholder="Nome (opcional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 mb-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xs px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                  m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
                <Loader size={14} className="animate-spin" /> Digitando...
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Digite uma mensagem de teste..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && send()}
            disabled={loading}
          />
          <button onClick={send} disabled={loading} className="btn btn-primary">
            <Send size={18} />
          </button>
        </div>
      </div>

      <div className="card bg-blue-50 border-blue-200 h-fit">
        <h3 className="font-bold mb-2 flex items-center gap-2">
          <Bot size={18} /> O que o agente faz
        </h3>
        <ul className="text-sm space-y-1.5 text-gray-700">
          <li>✅ Consulta expedições reais (datas, vagas, preços)</li>
          <li>✅ Registra lead automaticamente</li>
          <li>✅ Gera link de pagamento</li>
          <li>✅ Cadastra cliente e matricula na expedição</li>
          <li>✅ Lança pagamento</li>
          <li>✅ Escala para humano quando necessário</li>
        </ul>
        <p className="text-xs text-gray-500 mt-3">
          Cada conversa do simulador aparece também no Inbox.
        </p>
      </div>
    </div>
  );
}

// ===========================================================================
// CONFIG — notas operacionais + horário comercial
// ===========================================================================
interface BusinessHour {
  day: number;
  open: string;
  close: string;
  enabled: boolean;
}
const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function ConfigTab() {
  const [notes, setNotes] = useState('');
  const [hoursEnabled, setHoursEnabled] = useState(false);
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [offMsg, setOffMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/whatsapp/settings')
      .then((r) => r.json())
      .then((d) => {
        setNotes(d.settings.operatorNotes || '');
        setHoursEnabled(d.settings.businessHoursEnabled);
        setHours(d.settings.businessHours || []);
        setOffMsg(d.settings.outOfHoursMessage || '');
      });
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch('/api/whatsapp/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operatorNotes: notes,
        businessHoursEnabled: hoursEnabled,
        businessHours: hours,
        outOfHoursMessage: offMsg,
      }),
    });
    setSaving(false);
    toast.success('Configurações salvas');
  };

  const updateHour = (day: number, patch: Partial<BusinessHour>) =>
    setHours((hs) => hs.map((h) => (h.day === day ? { ...h, ...patch } : h)));

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card">
        <h3 className="font-bold mb-1">Notas operacionais</h3>
        <p className="text-xs text-gray-500 mb-3">
          Esse texto é injetado no prompt do agente com prioridade máxima. Ex:
          “Essa semana promoção X”, “Expedição Y lotada, não oferecer”.
        </p>
        <textarea
          className="input h-48"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Instruções atuais para o agente..."
        />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">Horário de atendimento</h3>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hoursEnabled}
              onChange={(e) => setHoursEnabled(e.target.checked)}
            />
            Ativar
          </label>
        </div>
        <div className="space-y-1.5 mb-3">
          {hours.map((h) => (
            <div key={h.day} className="flex items-center gap-2 text-sm">
              <label className="flex items-center gap-1 w-16">
                <input
                  type="checkbox"
                  checked={h.enabled}
                  onChange={(e) => updateHour(h.day, { enabled: e.target.checked })}
                />
                {dayNames[h.day]}
              </label>
              <input
                type="time"
                className="input !py-1 text-xs w-28"
                value={h.open}
                onChange={(e) => updateHour(h.day, { open: e.target.value })}
                disabled={!h.enabled}
              />
              <span className="text-gray-400">às</span>
              <input
                type="time"
                className="input !py-1 text-xs w-28"
                value={h.close}
                onChange={(e) => updateHour(h.day, { close: e.target.value })}
                disabled={!h.enabled}
              />
            </div>
          ))}
        </div>
        <label className="text-xs text-gray-500">Mensagem fora do horário</label>
        <textarea
          className="input h-16"
          value={offMsg}
          onChange={(e) => setOffMsg(e.target.value)}
        />
      </div>

      <div className="lg:col-span-2">
        <button onClick={save} disabled={saving} className="btn btn-primary flex items-center gap-2">
          <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
}
