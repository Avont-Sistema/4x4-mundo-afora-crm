import prisma from '@/lib/prisma';

export type StepType = 'text' | 'delay' | 'image' | 'audio';
export type TriggerType = 'new_lead' | 'keyword' | 'manual';

export interface FlowStepInput {
  order: number;
  type: StepType;
  content?: string;
  delayMin?: number;
}

export interface FlowInput {
  name: string;
  description?: string;
  trigger: TriggerType;
  triggerData?: Record<string, string>;
  active?: boolean;
  steps: FlowStepInput[];
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function listFlows() {
  return prisma.flow.findMany({
    include: { steps: { orderBy: { order: 'asc' } }, _count: { select: { runs: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getFlow(id: string) {
  return prisma.flow.findUnique({
    where: { id },
    include: { steps: { orderBy: { order: 'asc' } } },
  });
}

export async function createFlow(data: FlowInput) {
  const { steps, triggerData, ...rest } = data;
  return prisma.flow.create({
    data: {
      ...rest,
      triggerData: triggerData ? JSON.stringify(triggerData) : null,
      steps: { create: steps },
    },
    include: { steps: { orderBy: { order: 'asc' } } },
  });
}

export async function updateFlow(id: string, data: FlowInput) {
  const { steps, triggerData, ...rest } = data;
  await prisma.flowStep.deleteMany({ where: { flowId: id } });
  return prisma.flow.update({
    where: { id },
    data: {
      ...rest,
      triggerData: triggerData ? JSON.stringify(triggerData) : null,
      steps: { create: steps },
    },
    include: { steps: { orderBy: { order: 'asc' } } },
  });
}

export async function deleteFlow(id: string) {
  return prisma.flow.delete({ where: { id } });
}

// ── Flow Runner ───────────────────────────────────────────────────────────────

// Interpola variáveis: {nome}, {expedição}, {link}
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export async function triggerFlow(
  flowId: string,
  phone: string,
  vars: Record<string, string> = {}
) {
  const flow = await getFlow(flowId);
  if (!flow || !flow.active) return null;

  // Cancela runs anteriores deste flow para este telefone
  await prisma.flowRun.updateMany({
    where: { flowId, phone, status: 'running' },
    data: { status: 'cancelled' },
  });
  await prisma.flowMessage.updateMany({
    where: {
      run: { flowId, phone },
      status: 'pending',
    },
    data: { status: 'cancelled' },
  });

  // Cria novo FlowRun
  const run = await prisma.flowRun.create({ data: { flowId, phone } });

  // Calcula scheduledAt para cada step com base nos delays acumulados
  const now = new Date();
  let cumDelaySec = 0;
  const messages: {
    runId: string; stepOrder: number; type: string;
    content: string | null; scheduledAt: Date;
  }[] = [];

  for (const step of flow.steps) {
    if (step.type === 'delay') {
      cumDelaySec += (step.delayMin ?? 0) * 60;
      continue;
    }
    const scheduledAt = new Date(now.getTime() + cumDelaySec * 1000);
    messages.push({
      runId: run.id,
      stepOrder: step.order,
      type: step.type,
      content: step.content ? interpolate(step.content, vars) : null,
      scheduledAt,
    });
  }

  if (messages.length > 0) {
    await prisma.flowMessage.createMany({ data: messages });
  }

  return run;
}

export async function cancelFlowsForPhone(phone: string) {
  await prisma.flowRun.updateMany({
    where: { phone, status: 'running' },
    data: { status: 'cancelled' },
  });
  await prisma.flowMessage.updateMany({
    where: { run: { phone }, status: 'pending' },
    data: { status: 'cancelled' },
  });
}

// ── Pending Messages (chamado pelo bot) ───────────────────────────────────────

export async function getPendingMessages() {
  return prisma.flowMessage.findMany({
    where: {
      status: 'pending',
      scheduledAt: { lte: new Date() },
      run: { status: 'running' },
    },
    include: { run: true },
    orderBy: { scheduledAt: 'asc' },
    take: 20,
  });
}

export async function markMessageSent(id: string) {
  return prisma.flowMessage.update({
    where: { id },
    data: { status: 'sent', sentAt: new Date() },
  });
}

export async function markMessageFailed(id: string, error: string) {
  await prisma.flowMessage.update({
    where: { id },
    data: { status: 'failed', error },
  });
  // Verifica se há mais mensagens pendentes — se não houver, completa o run
  const pending = await prisma.flowMessage.count({
    where: { runId: (await prisma.flowMessage.findUnique({ where: { id } }))!.runId, status: 'pending' },
  });
  if (pending === 0) {
    const msg = await prisma.flowMessage.findUnique({ where: { id } });
    if (msg) await prisma.flowRun.update({ where: { id: msg.runId }, data: { status: 'completed' } });
  }
}

export async function completeRunIfDone(runId: string) {
  const pending = await prisma.flowMessage.count({
    where: { runId, status: 'pending' },
  });
  if (pending === 0) {
    await prisma.flowRun.update({ where: { id: runId }, data: { status: 'completed' } });
  }
}

// ── Flows ativos por trigger ──────────────────────────────────────────────────

export async function getFlowsForTrigger(trigger: TriggerType) {
  return prisma.flow.findMany({
    where: { trigger, active: true },
    include: { steps: { orderBy: { order: 'asc' } } },
  });
}
