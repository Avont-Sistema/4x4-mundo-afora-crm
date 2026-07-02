'use client';

import { useEffect, useState } from 'react';
import {
  Plus, Zap, Trash2, Play, ChevronDown, ChevronUp,
  MessageSquare, Clock, Image, Mic, ToggleLeft, ToggleRight, X, Save,
  Eye, Video,
} from 'lucide-react';
import FileOrUrlInput from '@/components/FileOrUrlInput';

// ── Types ─────────────────────────────────────────────────────────────────────
type StepType = 'text' | 'delay' | 'image' | 'audio' | 'video';
type TriggerType = 'new_lead' | 'keyword' | 'manual' | 'no_response';

interface Step {
  order: number;
  type: StepType;
  content?: string;
  delayMin?: number;
  typingDelaySec?: number;
}

interface Flow {
  id: string;
  name: string;
  description?: string;
  trigger: TriggerType;
  triggerData?: Record<string, string>;
  active: boolean;
  steps: Step[];
  _count?: { runs: number };
  createdAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const TRIGGER_LABELS: Record<TriggerType, string> = {
  new_lead: 'Novo Lead',
  keyword: 'Palavra-chave',
  manual: 'Manual',
  no_response: 'Sem resposta (follow-up)',
};

const STEP_ICONS: Record<StepType, React.ReactNode> = {
  text: <MessageSquare size={14} />,
  delay: <Clock size={14} />,
  image: <Image size={14} />,
  audio: <Mic size={14} />,
  video: <Video size={14} />,
};

const STEP_COLORS: Record<StepType, string> = {
  text: 'bg-blue-50 border-blue-200',
  delay: 'bg-yellow-50 border-yellow-200',
  image: 'bg-green-50 border-green-200',
  audio: 'bg-purple-50 border-purple-200',
  video: 'bg-red-50 border-red-200',
};

const EMPTY_FLOW = (): Omit<Flow, 'id' | 'createdAt' | '_count'> => ({
  name: '',
  description: '',
  trigger: 'manual',
  triggerData: {},
  active: true,
  steps: [],
});

// ── Editor modal ──────────────────────────────────────────────────────────────
function FlowEditor({
  initial,
  onSave,
  onClose,
}: {
  initial: Omit<Flow, 'id' | 'createdAt' | '_count'>;
  onSave: (data: Omit<Flow, 'id' | 'createdAt' | '_count'>) => Promise<void>;
  onClose: () => void;
}) {
  const [data, setData] = useState(initial);
  const [saving, setSaving] = useState(false);

  function setField<K extends keyof typeof data>(k: K, v: typeof data[K]) {
    setData((d) => ({ ...d, [k]: v }));
  }

  function addStep(type: StepType) {
    const next: Step = {
      order: data.steps.length,
      type,
      content: type === 'text' ? '' : undefined,
      delayMin: type === 'delay' ? 30 : undefined,
    };
    setField('steps', [...data.steps, next]);
  }

  function updateStep(idx: number, patch: Partial<Step>) {
    setField(
      'steps',
      data.steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    );
  }

  function removeStep(idx: number) {
    const updated = data.steps
      .filter((_, i) => i !== idx)
      .map((s, i) => ({ ...s, order: i }));
    setField('steps', updated);
  }

  function moveStep(idx: number, dir: -1 | 1) {
    const arr = [...data.steps];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setField('steps', arr.map((s, i) => ({ ...s, order: i })));
  }

  async function handleSave() {
    if (!data.name.trim()) return alert('Nome do fluxo é obrigatório');
    setSaving(true);
    try {
      await onSave(data);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            {initial.name ? `Editar: ${initial.name}` : 'Novo Fluxo'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Name + description */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input
                className="input w-full"
                placeholder="Ex: Boas-vindas ao novo lead"
                value={data.name}
                onChange={(e) => setField('name', e.target.value)}
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Trigger</label>
              <select
                className="input w-full"
                value={data.trigger}
                onChange={(e) => setField('trigger', e.target.value as TriggerType)}
              >
                <option value="new_lead">Novo Lead (automático)</option>
                <option value="keyword">Palavra-chave</option>
                <option value="manual">Manual</option>
                <option value="no_response">Sem resposta (follow-up automático)</option>
              </select>
            </div>
          </div>

          {data.trigger === 'keyword' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Palavras-chave (separadas por vírgula)</label>
              <input
                className="input w-full"
                placeholder="Ex: preço, valor, quanto custa"
                value={data.triggerData?.keywords || ''}
                onChange={(e) =>
                  setField('triggerData', { ...data.triggerData, keywords: e.target.value })
                }
              />
            </div>
          )}

          {data.trigger === 'no_response' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Disparar após quantas horas sem resposta?
              </label>
              <input
                type="number"
                min={1}
                className="input w-full"
                placeholder="24"
                value={data.triggerData?.hours || ''}
                onChange={(e) =>
                  setField('triggerData', { ...data.triggerData, hours: e.target.value })
                }
              />
              <p className="text-xs text-gray-400 mt-1">
                Dispara quando o bot respondeu e o cliente ficou em silêncio por esse tempo
                (conversas em atendimento humano ou finalizadas não recebem). Máximo 1x por
                semana por contato.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <input
              className="input w-full"
              placeholder="Descrição opcional"
              value={data.description || ''}
              onChange={(e) => setField('description', e.target.value)}
            />
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Etapas do Fluxo</h3>
              <span className="text-xs text-gray-400">{data.steps.length} etapa(s)</span>
            </div>

            {data.steps.length === 0 && (
              <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                Nenhuma etapa ainda. Adicione abaixo.
              </div>
            )}

            <div className="space-y-2">
              {data.steps.map((step, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg p-3 ${STEP_COLORS[step.type]}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center gap-1 text-xs font-medium text-gray-600">
                      {STEP_ICONS[step.type]}
                      {step.type === 'text' && 'Texto'}
                      {step.type === 'delay' && 'Espera'}
                      {step.type === 'image' && 'Imagem'}
                      {step.type === 'audio' && 'Áudio (voz)'}
                      {step.type === 'video' && 'Vídeo'}
                    </span>
                    <span className="ml-auto flex items-center gap-1">
                      <button
                        onClick={() => moveStep(idx, -1)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Mover para cima"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => moveStep(idx, 1)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Mover para baixo"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        onClick={() => removeStep(idx)}
                        className="p-1 text-red-400 hover:text-red-600"
                        title="Remover"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  </div>

                  {step.type === 'text' && (
                    <textarea
                      rows={3}
                      className="w-full text-sm border border-blue-200 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white resize-none"
                      placeholder="Mensagem... Use {nome}, {expedição}, {link}"
                      value={step.content || ''}
                      onChange={(e) => updateStep(idx, { content: e.target.value })}
                    />
                  )}

                  {step.type === 'delay' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        className="w-24 text-sm border border-yellow-200 rounded p-2 focus:outline-none focus:ring-1 focus:ring-yellow-400 bg-white"
                        value={step.delayMin ?? 30}
                        onChange={(e) => updateStep(idx, { delayMin: Number(e.target.value) })}
                      />
                      <span className="text-sm text-gray-600">minutos de espera</span>
                    </div>
                  )}

                  {(step.type === 'image' || step.type === 'audio' || step.type === 'video') && (
                    <FileOrUrlInput
                      type={step.type}
                      value={step.content || ''}
                      onChange={(url) => updateStep(idx, { content: url })}
                    />
                  )}

                  {step.type !== 'delay' && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/60">
                      <Clock size={11} className="text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-400">Esperar</span>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        className="w-14 text-xs border border-gray-200 rounded px-2 py-0.5 text-center bg-white focus:outline-none focus:ring-1 focus:ring-gray-300"
                        value={step.typingDelaySec ?? 0}
                        onChange={(e) => updateStep(idx, { typingDelaySec: Math.max(0, Number(e.target.value)) })}
                      />
                      <span className="text-xs text-gray-400">seg antes de enviar esta mensagem</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add step buttons */}
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => addStep('text')}
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full hover:bg-blue-100"
              >
                <MessageSquare size={12} /> Texto
              </button>
              <button
                onClick={() => addStep('delay')}
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full hover:bg-yellow-100"
              >
                <Clock size={12} /> Espera
              </button>
              <button
                onClick={() => addStep('image')}
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full hover:bg-green-100"
              >
                <Image size={12} /> Imagem
              </button>
              <button
                onClick={() => addStep('audio')}
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full hover:bg-purple-100"
              >
                <Mic size={12} /> Áudio (voz)
              </button>
              <button
                onClick={() => addStep('video')}
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-full hover:bg-red-100"
              >
                <Video size={12} /> Vídeo
              </button>
            </div>

            <p className="text-xs text-gray-400 mt-2">
              Variáveis disponíveis: <code className="bg-gray-100 px-1 rounded">{'{nome}'}</code>{' '}
              <code className="bg-gray-100 px-1 rounded">{'{expedição}'}</code>{' '}
              <code className="bg-gray-100 px-1 rounded">{'{telefone}'}</code>{' '}
              <code className="bg-gray-100 px-1 rounded">{'{link}'}</code>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={data.active}
              onChange={(e) => setField('active', e.target.checked)}
              className="rounded"
            />
            Fluxo ativo
          </label>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn btn-secondary text-sm">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary text-sm flex items-center gap-2">
              <Save size={14} />
              {saving ? 'Salvando...' : 'Salvar Fluxo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Manual trigger modal ──────────────────────────────────────────────────────
function TriggerModal({
  flow,
  onClose,
}: {
  flow: Flow;
  onClose: () => void;
}) {
  const [phone, setPhone] = useState('');
  const [nome, setNome] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // Normaliza para JID do WhatsApp: remove não-numéricos e adiciona sufixo
  function toJid(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return raw;
    return digits.includes('@') ? raw.trim() : `${digits}@s.whatsapp.net`;
  }

  async function handleTrigger() {
    if (!phone.trim()) return alert('Telefone obrigatório');
    const jid = toJid(phone);
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch(`/api/flows/${flow.id}/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: jid, vars: { nome: nome.trim() || phone.trim(), telefone: jid } }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(`✓ Disparado para ${jid} — aguarde até 30s para receber.`);
      } else {
        setResult(`Erro: ${data.error}`);
      }
    } catch (e: unknown) {
      setResult(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Disparar: {flow.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
          Este disparo <strong>ignora o cooldown</strong> — ideal para testes repetidos.
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Telefone</label>
          <input
            className="input w-full"
            placeholder="55DDD9XXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">Ex: 5551999887766 (sem espaços ou traços)</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Nome (opcional)</label>
          <input className="input w-full" placeholder="Nome do contato" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        {result && (
          <p className={`text-sm p-2 rounded ${result.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {result}
          </p>
        )}
        <button onClick={handleTrigger} disabled={running} className="btn btn-primary w-full flex items-center justify-center gap-2">
          <Play size={14} />
          {running ? 'Disparando...' : 'Disparar Agora'}
        </button>
      </div>
    </div>
  );
}

// ── Simulate modal ────────────────────────────────────────────────────────────
function SimulateModal({ flow, onClose }: { flow: Flow; onClose: () => void }) {
  const nonDelaySteps = flow.steps.filter((s) => s.type !== 'delay');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden" style={{ height: '85vh' }}>
        {/* WhatsApp header */}
        <div className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-3 shrink-0">
          <button onClick={onClose} className="text-white/80 hover:text-white mr-1">
            <X size={18} />
          </button>
          <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center text-xs font-bold shrink-0">
            4x4
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm leading-tight truncate">4x4 Mundo Afora Bot</p>
            <p className="text-xs text-white/70">Simulação — nenhuma mensagem enviada</p>
          </div>
        </div>

        {/* Chat area */}
        <div
          className="flex-1 overflow-y-auto p-3 space-y-1"
          style={{ background: '#ECE5DD url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3C/svg%3E")' }}
        >
          {/* Trigger info */}
          <div className="flex justify-center mb-2">
            <span className="text-xs bg-white/80 text-gray-600 px-3 py-1 rounded-full shadow-sm">
              {flow.trigger === 'new_lead' && '👤 Fluxo inicia quando novo lead entra'}
              {flow.trigger === 'keyword' && `🔑 Dispara quando cliente menciona: ${flow.triggerData?.keywords || '(sem palavras)'}`}
              {flow.trigger === 'manual' && '▶ Fluxo disparado manualmente'}
            </span>
          </div>

          {flow.steps.length === 0 && (
            <div className="text-center text-gray-400 text-sm mt-8">Nenhuma etapa neste fluxo</div>
          )}

          {flow.steps.map((step, i) => {
            if (step.type === 'delay') {
              return (
                <div key={i} className="flex justify-center my-2">
                  <span className="text-xs bg-white/70 text-gray-500 px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                    <Clock size={11} />
                    {(step.delayMin ?? 0) >= 60
                      ? `${((step.delayMin ?? 0) / 60).toFixed(1)}h depois`
                      : `${step.delayMin} min depois`}
                  </span>
                </div>
              );
            }

            return (
              <div key={i} className="flex justify-start">
                <div
                  className="max-w-[85%] bg-white rounded-2xl rounded-tl-sm shadow-sm overflow-hidden"
                  style={{ minWidth: 80 }}
                >
                  {step.type === 'text' && (
                    <div className="px-3 py-2">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                        {step.content || <span className="text-gray-400 italic">Mensagem vazia</span>}
                      </p>
                      <p className="text-[10px] text-gray-400 text-right mt-1">agora ✓✓</p>
                    </div>
                  )}

                  {step.type === 'image' && step.content && (
                    <div>
                      <img
                        src={step.content}
                        alt="imagem"
                        className="w-full max-h-48 object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect fill="%23eee" width="200" height="100"/><text x="50%" y="50%" text-anchor="middle" fill="%23aaa" dy=".3em">Imagem</text></svg>'; }}
                      />
                      <p className="text-[10px] text-gray-400 text-right px-2 py-1">agora ✓✓</p>
                    </div>
                  )}

                  {step.type === 'audio' && (
                    <div className="px-3 py-2">
                      <div className="flex items-center gap-2 bg-[#f0f0f0] rounded-xl px-3 py-2">
                        <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
                          <Mic size={14} className="text-white" />
                        </div>
                        {step.content ? (
                          <audio controls src={step.content} className="h-8" style={{ minWidth: 140 }} />
                        ) : (
                          <div className="text-xs text-gray-400">Áudio não definido</div>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 text-right mt-1">agora ✓✓</p>
                    </div>
                  )}

                  {(step.type as string) === 'video' && (
                    <div>
                      {step.content ? (
                        <video src={step.content} controls className="w-full max-h-48 object-cover" />
                      ) : (
                        <div className="bg-gray-200 h-24 flex items-center justify-center text-gray-400 text-sm">Vídeo não definido</div>
                      )}
                      <p className="text-[10px] text-gray-400 text-right px-2 py-1">agora ✓✓</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="bg-[#F0F2F5] px-4 py-3 shrink-0 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {nonDelaySteps.length} mensagem(s) • visualização somente
          </span>
          <button onClick={onClose} className="text-xs bg-[#075E54] text-white px-3 py-1.5 rounded-full hover:bg-[#064e46]">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Flow card ─────────────────────────────────────────────────────────────────
function FlowCard({
  flow,
  onEdit,
  onDelete,
  onToggle,
  onTrigger,
  onSimulate,
}: {
  flow: Flow;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onTrigger: () => void;
  onSimulate: () => void;
}) {
  const steps = flow.steps || [];
  const textSteps = steps.filter((s) => s.type !== 'delay').length;
  const totalDelay = steps.filter((s) => s.type === 'delay').reduce((a, s) => a + (s.delayMin || 0), 0);

  return (
    <div className={`card border transition-all ${flow.active ? 'border-blue-200' : 'border-gray-200 opacity-60'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-800 truncate">{flow.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              flow.trigger === 'new_lead' ? 'bg-green-100 text-green-700' :
              flow.trigger === 'keyword' ? 'bg-orange-100 text-orange-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {TRIGGER_LABELS[flow.trigger]}
            </span>
            {!flow.active && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Pausado</span>
            )}
          </div>
          {flow.description && (
            <p className="text-sm text-gray-500 mt-0.5 truncate">{flow.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span>{steps.length} etapa(s)</span>
            <span>{textSteps} mensagem(s)</span>
            {totalDelay > 0 && <span>{totalDelay >= 60 ? `${(totalDelay / 60).toFixed(1)}h` : `${totalDelay}min`} de delay</span>}
            <span>{flow._count?.runs ?? 0} execuções</span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onToggle}
            title={flow.active ? 'Pausar' : 'Ativar'}
            className="p-2 text-gray-400 hover:text-blue-600"
          >
            {flow.active ? <ToggleRight size={20} className="text-blue-500" /> : <ToggleLeft size={20} />}
          </button>
          <button onClick={onSimulate} title="Simular fluxo" className="p-2 text-gray-400 hover:text-purple-600">
            <Eye size={16} />
          </button>
          <button onClick={onTrigger} title="Disparar manualmente" className="p-2 text-gray-400 hover:text-green-600">
            <Play size={16} />
          </button>
          <button onClick={onEdit} title="Editar" className="p-2 text-gray-400 hover:text-blue-600">
            <Zap size={16} />
          </button>
          <button onClick={onDelete} title="Excluir" className="p-2 text-gray-400 hover:text-red-500">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Step preview */}
      {steps.length > 0 && (
        <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-1 shrink-0">
              <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${STEP_COLORS[step.type]}`}>
                {STEP_ICONS[step.type]}
                {step.type === 'delay' ? `${step.delayMin}min` :
                 step.type === 'text' ? (step.content?.slice(0, 20) + (step.content && step.content.length > 20 ? '…' : '') || 'vazio') :
                 step.type === 'image' ? 'Imagem' : step.type === 'video' ? 'Vídeo' : 'Áudio'}
              </span>
              {i < steps.length - 1 && <span className="text-gray-300">→</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FlowsPage() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFlow, setEditingFlow] = useState<Flow | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [triggeringFlow, setTriggeringFlow] = useState<Flow | null>(null);
  const [simulatingFlow, setSimulatingFlow] = useState<Flow | null>(null);

  async function loadFlows() {
    try {
      const res = await fetch('/api/flows');
      const data = await res.json();
      setFlows(data.flows || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadFlows(); }, []);

  async function handleCreate(data: Omit<Flow, 'id' | 'createdAt' | '_count'>) {
    const res = await fetch('/api/flows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setCreatingNew(false);
      loadFlows();
    }
  }

  async function handleUpdate(id: string, data: Omit<Flow, 'id' | 'createdAt' | '_count'>) {
    const res = await fetch(`/api/flows/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setEditingFlow(null);
      loadFlows();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este fluxo? Esta ação não pode ser desfeita.')) return;
    await fetch(`/api/flows/${id}`, { method: 'DELETE' });
    loadFlows();
  }

  async function handleToggle(flow: Flow) {
    await fetch(`/api/flows/${flow.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...flow, active: !flow.active }),
    });
    loadFlows();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editor de Fluxos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure sequências automáticas de mensagens para o WhatsApp
          </p>
        </div>
        <button
          onClick={() => setCreatingNew(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Novo Fluxo
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
        <strong>Como funciona:</strong> Fluxos com trigger <em>Novo Lead</em> disparam automaticamente quando um novo contato manda mensagem.
        Fluxos <em>Manuais</em> podem ser disparados pelo botão ▶.
        O bot processa as mensagens agendadas a cada 30 segundos — delays são respeitados mesmo após reinicializações.
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando fluxos...</div>
      ) : flows.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <Zap size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhum fluxo criado ainda</p>
          <p className="text-sm text-gray-400 mt-1">Crie seu primeiro fluxo de boas-vindas para novos leads</p>
          <button onClick={() => setCreatingNew(true)} className="btn btn-primary mt-4 flex items-center gap-2 mx-auto">
            <Plus size={14} /> Criar primeiro fluxo
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {flows.map((flow) => (
            <FlowCard
              key={flow.id}
              flow={flow}
              onEdit={() => setEditingFlow(flow)}
              onDelete={() => handleDelete(flow.id)}
              onToggle={() => handleToggle(flow)}
              onTrigger={() => setTriggeringFlow(flow)}
              onSimulate={() => setSimulatingFlow(flow)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {creatingNew && (
        <FlowEditor
          initial={EMPTY_FLOW()}
          onSave={handleCreate}
          onClose={() => setCreatingNew(false)}
        />
      )}

      {/* Edit modal */}
      {editingFlow && (
        <FlowEditor
          initial={editingFlow}
          onSave={(data) => handleUpdate(editingFlow.id, data)}
          onClose={() => setEditingFlow(null)}
        />
      )}

      {/* Trigger modal */}
      {triggeringFlow && (
        <TriggerModal
          flow={triggeringFlow}
          onClose={() => setTriggeringFlow(null)}
        />
      )}

      {/* Simulate modal */}
      {simulatingFlow && (
        <SimulateModal
          flow={simulatingFlow}
          onClose={() => setSimulatingFlow(null)}
        />
      )}
    </div>
  );
}
