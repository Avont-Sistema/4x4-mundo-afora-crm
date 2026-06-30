'use client';

import { useEffect, useState } from 'react';
import {
  Plus, Zap, Trash2, Play, ChevronDown, ChevronUp,
  MessageSquare, Clock, Image, Mic, ToggleLeft, ToggleRight, X, Save,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
type StepType = 'text' | 'delay' | 'image' | 'audio';
type TriggerType = 'new_lead' | 'keyword' | 'manual';

interface Step {
  order: number;
  type: StepType;
  content?: string;
  delayMin?: number;
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
};

const STEP_ICONS: Record<StepType, React.ReactNode> = {
  text: <MessageSquare size={14} />,
  delay: <Clock size={14} />,
  image: <Image size={14} />,
  audio: <Mic size={14} />,
};

const STEP_COLORS: Record<StepType, string> = {
  text: 'bg-blue-50 border-blue-200',
  delay: 'bg-yellow-50 border-yellow-200',
  image: 'bg-green-50 border-green-200',
  audio: 'bg-purple-50 border-purple-200',
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

                  {(step.type === 'image' || step.type === 'audio') && (
                    <input
                      type="url"
                      className={`w-full text-sm border rounded p-2 focus:outline-none bg-white ${
                        step.type === 'image'
                          ? 'border-green-200 focus:ring-1 focus:ring-green-400'
                          : 'border-purple-200 focus:ring-1 focus:ring-purple-400'
                      }`}
                      placeholder={
                        step.type === 'image'
                          ? 'URL da imagem (https://...)'
                          : 'URL do arquivo de áudio .ogg (https://...)'
                      }
                      value={step.content || ''}
                      onChange={(e) => updateStep(idx, { content: e.target.value })}
                    />
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

  async function handleTrigger() {
    if (!phone.trim()) return alert('Telefone obrigatório');
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch(`/api/flows/${flow.id}/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), vars: { nome: nome.trim() || phone.trim() } }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(`✓ Fluxo iniciado! Run ID: ${data.run?.id}`);
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
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Telefone (ex: 5555996567019)</label>
          <input className="input w-full" placeholder="55DDD9XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
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

// ── Flow card ─────────────────────────────────────────────────────────────────
function FlowCard({
  flow,
  onEdit,
  onDelete,
  onToggle,
  onTrigger,
}: {
  flow: Flow;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onTrigger: () => void;
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
                 step.type === 'image' ? 'Imagem' : 'Áudio'}
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
    </div>
  );
}
