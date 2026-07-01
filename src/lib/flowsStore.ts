import { kvLoad, kvSave } from './kvStore';

export type StepType = 'text' | 'delay' | 'image' | 'audio' | 'video';
export type TriggerType = 'new_lead' | 'keyword' | 'manual';

export interface FlowStep {
  id: string;
  order: number;
  type: StepType;
  content?: string;
  delayMin?: number;
  typingDelaySec?: number; // segundos de "digitando..." antes de enviar esta mensagem
}

export interface Flow {
  id: string;
  name: string;
  description?: string;
  trigger: TriggerType;
  triggerData?: Record<string, string>;
  active: boolean;
  steps: FlowStep[];
  createdAt: string;
  updatedAt: string;
}

export interface FlowRun {
  id: string;
  flowId: string;
  phone: string;
  status: 'running' | 'completed' | 'cancelled';
  startedAt: string;
  updatedAt: string;
}

export interface FlowMessage {
  id: string;
  runId: string;
  stepOrder: number;
  type: string;
  content?: string;
  typingDelaySec?: number;
  scheduledAt: string;
  sentAt?: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  error?: string;
  createdAt: string;
  run?: FlowRun;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

async function loadFlowsRaw(): Promise<Flow[]> {
  return (await kvLoad<Flow[]>('flows')) ?? [];
}
async function saveFlows(flows: Flow[]) {
  await kvSave('flows', flows);
}

async function loadRuns(): Promise<FlowRun[]> {
  return (await kvLoad<FlowRun[]>('flow_runs')) ?? [];
}
async function saveRuns(runs: FlowRun[]) {
  await kvSave('flow_runs', runs);
}

async function loadMessages(): Promise<FlowMessage[]> {
  return (await kvLoad<FlowMessage[]>('flow_messages')) ?? [];
}
async function saveMessages(msgs: FlowMessage[]) {
  await kvSave('flow_messages', msgs);
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function listFlows(): Promise<Flow[]> {
  const flows = await loadFlowsRaw();
  return flows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getFlow(id: string): Promise<Flow | null> {
  const flows = await loadFlowsRaw();
  return flows.find((f) => f.id === id) ?? null;
}

export async function createFlow(data: Omit<Flow, 'id' | 'createdAt' | 'updatedAt'>): Promise<Flow> {
  const flows = await loadFlowsRaw();
  const now = new Date().toISOString();
  const flow: Flow = {
    ...data,
    id: uid(),
    steps: (data.steps ?? []).map((s, i) => ({ ...s, id: uid(), order: i })),
    createdAt: now,
    updatedAt: now,
  };
  await saveFlows([...flows, flow]);
  return flow;
}

export async function updateFlow(id: string, data: Omit<Flow, 'id' | 'createdAt' | 'updatedAt'>): Promise<Flow> {
  const flows = await loadFlowsRaw();
  const idx = flows.findIndex((f) => f.id === id);
  if (idx === -1) throw new Error('Flow não encontrado');
  const updated: Flow = {
    ...flows[idx],
    ...data,
    id,
    steps: (data.steps ?? []).map((s, i) => ({ ...s, id: s.id || uid(), order: i })),
    updatedAt: new Date().toISOString(),
  };
  flows[idx] = updated;
  await saveFlows(flows);
  return updated;
}

export async function deleteFlow(id: string): Promise<void> {
  const flows = await loadFlowsRaw();
  await saveFlows(flows.filter((f) => f.id !== id));
}

// ── Runner ────────────────────────────────────────────────────────────────────

export async function triggerFlow(
  flowId: string,
  phone: string,
  vars: Record<string, string> = {}
): Promise<FlowRun | null> {
  const flow = await getFlow(flowId);
  if (!flow || !flow.active) return null;

  const now = new Date();

  // Cancela runs anteriores deste flow para este telefone
  const runs = await loadRuns();
  const msgs = await loadMessages();

  const prevRunIds = runs
    .filter((r) => r.flowId === flowId && r.phone === phone && r.status === 'running')
    .map((r) => r.id);

  const updatedRuns = runs.map((r) =>
    prevRunIds.includes(r.id) ? { ...r, status: 'cancelled' as const, updatedAt: now.toISOString() } : r
  );
  const updatedMsgs = msgs.map((m) =>
    prevRunIds.includes(m.runId) && m.status === 'pending'
      ? { ...m, status: 'cancelled' as const }
      : m
  );

  // Cria novo FlowRun
  const run: FlowRun = {
    id: uid(),
    flowId,
    phone,
    status: 'running',
    startedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  // Calcula scheduledAt acumulando delays
  let cumDelaySec = 0;
  const newMsgs: FlowMessage[] = [];

  for (const step of flow.steps) {
    if (step.type === 'delay') {
      cumDelaySec += (step.delayMin ?? 0) * 60;
      continue;
    }
    const scheduledAt = new Date(now.getTime() + cumDelaySec * 1000).toISOString();
    newMsgs.push({
      id: uid(),
      runId: run.id,
      stepOrder: step.order,
      type: step.type,
      content: step.content ? interpolate(step.content, vars) : undefined,
      typingDelaySec: step.typingDelaySec ?? 0,
      scheduledAt,
      status: 'pending',
      createdAt: now.toISOString(),
    });
  }

  await saveRuns([...updatedRuns, run]);
  await saveMessages([...updatedMsgs, ...newMsgs]);

  return run;
}

export async function cancelFlowsForPhone(phone: string): Promise<void> {
  const now = new Date().toISOString();
  const runs = await loadRuns();
  const msgs = await loadMessages();

  const runIds = runs
    .filter((r) => r.phone === phone && r.status === 'running')
    .map((r) => r.id);

  await saveRuns(
    runs.map((r) => runIds.includes(r.id) ? { ...r, status: 'cancelled' as const, updatedAt: now } : r)
  );
  await saveMessages(
    msgs.map((m) => runIds.includes(m.runId) && m.status === 'pending' ? { ...m, status: 'cancelled' as const } : m)
  );
}

// ── Queue (bot polling) ───────────────────────────────────────────────────────

export async function getPendingMessages(): Promise<FlowMessage[]> {
  const now = new Date().toISOString();
  const msgs = await loadMessages();
  const runs = await loadRuns();

  const runningIds = new Set(runs.filter((r) => r.status === 'running').map((r) => r.id));

  return msgs
    .filter((m) => m.status === 'pending' && m.scheduledAt <= now && runningIds.has(m.runId))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .slice(0, 20)
    .map((m) => ({ ...m, run: runs.find((r) => r.id === m.runId) }));
}

export async function markMessageSent(id: string): Promise<void> {
  const msgs = await loadMessages();
  await saveMessages(
    msgs.map((m) => m.id === id ? { ...m, status: 'sent' as const, sentAt: new Date().toISOString() } : m)
  );
}

export async function markMessageFailed(id: string, error: string): Promise<void> {
  const msgs = await loadMessages();
  await saveMessages(
    msgs.map((m) => m.id === id ? { ...m, status: 'failed' as const, error } : m)
  );
}

export async function completeRunIfDone(runId: string): Promise<void> {
  const msgs = await loadMessages();
  const pending = msgs.filter((m) => m.runId === runId && m.status === 'pending');
  if (pending.length === 0) {
    const runs = await loadRuns();
    await saveRuns(
      runs.map((r) => r.id === runId ? { ...r, status: 'completed' as const, updatedAt: new Date().toISOString() } : r)
    );
  }
}

// ── Trigger lookup ────────────────────────────────────────────────────────────

export async function getFlowsForTrigger(trigger: TriggerType): Promise<Flow[]> {
  const flows = await loadFlowsRaw();
  return flows.filter((f) => f.trigger === trigger && f.active);
}

// Retorna true se o fluxo foi disparado para este telefone nos últimos X minutos
export async function wasFlowRecentlyTriggered(
  flowId: string,
  phone: string,
  withinMinutes = 60
): Promise<boolean> {
  const runs = await loadRuns();
  const cutoff = new Date(Date.now() - withinMinutes * 60 * 1000).toISOString();
  return runs.some(
    (r) => r.flowId === flowId && r.phone === phone && r.startedAt >= cutoff
  );
}
