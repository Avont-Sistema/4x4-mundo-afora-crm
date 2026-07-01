import { appendMessage, toClaudeHistory } from '@/lib/conversationsStore';
import { getSettings, isWithinBusinessHours } from '@/lib/settingsStore';
import { findLeadByPhone, upsertLeadFromContact } from '@/lib/leadsStore';
import { runAgent, aiEnabled } from './brain';
import { getFlowsForTrigger, triggerFlow } from '@/lib/flowsStore';

export interface InboundResult {
  reply: string | null; // null = não responder automaticamente
  mode: string;
  leadCreated: boolean;
  aiEnabled: boolean;
  reason?: string;
}

// Detecta interesse simples para enriquecer o lead
function detectInterest(text: string): string | undefined {
  const m = text.toLowerCase();
  if (m.includes('lenç') || m.includes('lenc')) return 'Lençóis Maranhenses';
  return undefined;
}

export async function processInbound(
  phone: string,
  text: string,
  contactName?: string
): Promise<InboundResult> {
  const settings = await getSettings();

  // 1. registra a mensagem recebida
  const conv = await appendMessage(phone, { role: 'user', content: text }, contactName);

  // 2. auto-cadastro de lead (telefone novo => novo lead atendido pela IA)
  let leadCreated = false;
  const existingLead = await findLeadByPhone(phone);
  const up = await upsertLeadFromContact({
    name: contactName || existingLead?.name || phone,
    phone,
    whatsapp: phone,
    source: 'whatsapp',
    stage: existingLead?.stage || 'novo',
    handledBy: 'ia',
    interest: detectInterest(text),
    lastMessage: text,
    notes: existingLead ? undefined : 'Lead criado pelo agente do WhatsApp',
  });
  leadCreated = up.created;

  // 2b. dispara fluxos de novo_lead automaticamente
  if (leadCreated) {
    const flows = await getFlowsForTrigger('new_lead');
    for (const flow of flows) {
      await triggerFlow(flow.id, phone, {
        nome: contactName || phone,
        telefone: phone,
      });
    }
  }

  // 3. bot pausado ou conversa em modo humano/resolvido => não responde
  const ai = await aiEnabled();

  if (settings.botPaused) {
    return { reply: null, mode: conv.mode, leadCreated, aiEnabled: ai, reason: 'bot_paused' };
  }
  if (conv.mode !== 'bot') {
    return { reply: null, mode: conv.mode, leadCreated, aiEnabled: ai, reason: 'human_mode' };
  }

  // 4. fora do horário comercial => resposta automática fixa
  if (!(await isWithinBusinessHours())) {
    const msg = settings.outOfHoursMessage;
    await appendMessage(phone, { role: 'assistant', content: msg, via: 'bot' });
    return { reply: msg, mode: conv.mode, leadCreated, aiEnabled: ai, reason: 'out_of_hours' };
  }

  // 5. roda o agente
  const history = toClaudeHistory(conv);
  const { reply } = await runAgent(phone, history, settings.operatorNotes);

  await appendMessage(phone, { role: 'assistant', content: reply, via: 'bot' });

  return { reply, mode: conv.mode, leadCreated, aiEnabled: ai };
}
