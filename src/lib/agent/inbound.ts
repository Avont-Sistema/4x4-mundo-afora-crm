import { appendMessage, toClaudeHistory, type Conversation } from '@/lib/conversationsStore';
import { getSettings, isWithinBusinessHours } from '@/lib/settingsStore';
import { findLeadByPhone, upsertLeadFromContact, updateLead, type Lead } from '@/lib/leadsStore';
import { runAgent, aiEnabled } from './brain';
import { getFlowsForTrigger, triggerFlow, wasFlowRecentlyTriggered } from '@/lib/flowsStore';
import { clientsStore } from '@/lib/clientsStore';
import { expeditionsStore } from '@/lib/expeditionsStore';

export interface InboundResult {
  reply: string | null; // null = não responder automaticamente
  mode: string;
  leadCreated: boolean;
  aiEnabled: boolean;
  typingDelay: number; // segundos que o bot deve esperar antes de enviar (mostrando "digitando...")
  reason?: string;
}

// Detecta interesse simples para enriquecer o lead
function detectInterest(text: string): string | undefined {
  const m = text.toLowerCase();
  if (m.includes('lenç') || m.includes('lenc')) return 'Lençóis Maranhenses';
  return undefined;
}

// Monta um resumo do que o CRM já sabe sobre quem está falando — injetado no
// system prompt para o bot não perguntar de novo o que já sabe e retomar contexto.
async function buildClientContext(phone: string, lead: Lead | undefined, conv: Conversation): Promise<string> {
  const parts: string[] = [];

  parts.push(
    `Data/hora atual: ${new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'full',
      timeStyle: 'short',
    })}`
  );

  if (lead) {
    let l = `É um lead registrado: ${lead.name} (estágio: ${lead.stage})`;
    if (lead.interest) l += `, interesse: ${lead.interest}`;
    parts.push(l);
    if (lead.notes) parts.push(`Observações do lead: ${lead.notes}`);
  }

  try {
    const digits = phone.split('@')[0].replace(/\D/g, '');
    const client = (await clientsStore.all()).find(
      (c) =>
        (c.phone || '').replace(/\D/g, '') === digits ||
        (c.whatsapp || '').replace(/\D/g, '') === digits
    );
    if (client) {
      parts.push(`Já é CLIENTE cadastrado: ${client.name}`);
      const enrolled = (await expeditionsStore.all()).filter((e) =>
        (e.enrollments ?? []).some((en) => en.clientId === client.id && en.status !== 'cancelado')
      );
      if (enrolled.length > 0) {
        parts.push(`Matriculado nas expedições: ${enrolled.map((e) => e.routeName).join(', ')}`);
      }
    }
  } catch { /* contexto de cliente é opcional — não bloqueia a resposta */ }

  if (conv.messages.length > 1) {
    parts.push(
      `Conversa iniciada em ${new Date(conv.createdAt).toLocaleDateString('pt-BR')} — ${conv.messages.length} mensagens até agora.`
    );
  }

  // Base de conhecimento: lista os assuntos cadastrados e injeta na íntegra os
  // que casam com a mensagem atual (a tool consultar_contexto busca os demais).
  try {
    const { listKnowledge, topicsMatching } = await import('@/lib/knowledgeStore');
    const all = await listKnowledge();
    if (all.length > 0) {
      parts.push(`CONTEXTOS DISPONÍVEIS (use consultar_contexto): ${all.map((e) => e.topic).join(', ')}`);
      const lastUserMsg = [...conv.messages].reverse().find((m) => m.role === 'user')?.content ?? '';
      const matched = await topicsMatching(lastUserMsg);
      for (const e of matched.slice(0, 2)) {
        parts.push(`\nCONTEXTO "${e.topic}" (informação oficial — use como fonte):\n${e.content}${
          e.links?.length ? `\nLinks: ${e.links.join(' ')}` : ''
        }`);
      }
    }
  } catch { /* base de conhecimento é opcional */ }

  return parts.join('\n');
}

export async function processInbound(
  phone: string,
  text: string,
  contactName?: string,
  lid?: string
): Promise<InboundResult> {
  const settings = await getSettings();

  // 1. registra a mensagem recebida
  let conv = await appendMessage(phone, { role: 'user', content: text }, contactName);

  // 1a. conversa finalizada + cliente mandou mensagem => reabre para o bot
  // (senão a conversa ficaria muda para sempre depois de "Finalizar")
  if (conv.mode === 'resolved') {
    const { setMode } = await import('@/lib/conversationsStore');
    conv = (await setMode(phone, 'bot')) ?? conv;
  }

  // 1b. auto-correção: leads antigos foram salvos com o LID (ID interno do WhatsApp)
  // no lugar do telefone. Se o bot mandou o LID junto e existe um lead com esse LID
  // como telefone, atualiza para o número real — sem isso o disparo nunca o alcança.
  const leadPhone = phone.includes('@lid') ? phone : phone.split('@')[0];
  if (lid && !phone.includes('@lid')) {
    const leadByLid = await findLeadByPhone(lid);
    if (leadByLid) {
      await updateLead(leadByLid.id, { phone: leadPhone, whatsapp: leadPhone });
    }
    // Também funde a conversa-fantasma registrada pelo @lid na conversa real
    const { mergeConversationInto } = await import('@/lib/conversationsStore');
    await mergeConversationInto(lid, phone);
  }

  // 2. auto-cadastro de lead (telefone novo => novo lead atendido pela IA)
  let leadCreated = false;
  const existingLead = await findLeadByPhone(leadPhone);
  const up = await upsertLeadFromContact({
    name: contactName || existingLead?.name || leadPhone,
    phone: leadPhone,
    whatsapp: leadPhone,
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

  // 2c. dispara fluxos de keyword se a mensagem contém uma palavra-chave
  // Cooldown: não re-dispara o mesmo fluxo para o mesmo número nos últimos 60 min
  let keywordFlowTriggered = false;
  const keywordFlows = await getFlowsForTrigger('keyword');
  for (const flow of keywordFlows) {
    const keywords = (flow.triggerData?.keywords ?? '')
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    const msgLower = text.toLowerCase();
    if (keywords.some((kw) => msgLower.includes(kw))) {
      const recentlyTriggered = await wasFlowRecentlyTriggered(flow.id, phone, 60);
      if (!recentlyTriggered) {
        await triggerFlow(flow.id, phone, {
          nome: contactName || phone,
          telefone: phone,
        });
        keywordFlowTriggered = true;
      }
    }
  }

  // 3. bot pausado ou conversa em modo humano/resolvido => não responde
  const ai = await aiEnabled();

  // Se um fluxo de keyword foi disparado, não roda a IA por cima
  if (keywordFlowTriggered) {
    return { reply: null, mode: conv.mode, leadCreated, aiEnabled: ai, typingDelay: 0, reason: 'keyword_flow' };
  }

  const typingDelay = settings.typingDelaySeconds ?? 2;

  if (settings.botPaused) {
    return { reply: null, mode: conv.mode, leadCreated, aiEnabled: ai, typingDelay: 0, reason: 'bot_paused' };
  }
  if (conv.mode !== 'bot') {
    return { reply: null, mode: conv.mode, leadCreated, aiEnabled: ai, typingDelay: 0, reason: 'human_mode' };
  }

  // 4. fora do horário comercial => resposta automática fixa
  if (!(await isWithinBusinessHours())) {
    const msg = settings.outOfHoursMessage;
    await appendMessage(phone, { role: 'assistant', content: msg, via: 'bot' });
    return { reply: msg, mode: conv.mode, leadCreated, aiEnabled: ai, typingDelay, reason: 'out_of_hours' };
  }

  // 5. roda o agente (com histórico maior + contexto do CRM sobre o cliente)
  const history = toClaudeHistory(conv, 30);
  const clientContext = await buildClientContext(phone, up.lead ?? existingLead, conv);
  const { reply } = await runAgent(phone, history, settings.operatorNotes, clientContext);

  await appendMessage(phone, { role: 'assistant', content: reply, via: 'bot' });

  return { reply, mode: conv.mode, leadCreated, aiEnabled: ai, typingDelay };
}
