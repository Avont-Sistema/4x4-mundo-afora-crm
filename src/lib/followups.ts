import { kvLoad, kvSave } from './kvStore';
import { listConversations } from './conversationsStore';
import { getFlowsForTrigger, triggerFlow, wasFlowRecentlyTriggered } from './flowsStore';

// Follow-up automático "sem resposta":
// Para cada fluxo ativo com trigger 'no_response' (triggerData.hours, padrão 24h),
// encontra conversas em modo bot onde a ÚLTIMA mensagem é do bot/assistente e o
// cliente está em silêncio há pelo menos N horas — e dispara o fluxo uma única vez
// por período de silêncio (cooldown de 7 dias por fluxo+telefone).
//
// É chamado de carona no GET /api/whatsapp/pending-messages (o bot chama a cada
// 30s), com throttle de 10 minutos — não precisa de cron do Vercel.

const CHECK_THROTTLE_MIN = 10;
const RETRIGGER_COOLDOWN_MIN = 7 * 24 * 60; // 1x por semana por fluxo+telefone

export async function checkNoResponseFollowups(): Promise<{ triggered: number } | null> {
  // Throttle: no máximo uma varredura a cada CHECK_THROTTLE_MIN
  const last = await kvLoad<string>('followups_last_check');
  if (last && Date.now() - new Date(last).getTime() < CHECK_THROTTLE_MIN * 60 * 1000) {
    return null;
  }
  await kvSave('followups_last_check', new Date().toISOString());

  const flows = await getFlowsForTrigger('no_response');
  if (flows.length === 0) return { triggered: 0 };

  const conversations = await listConversations();
  let triggered = 0;

  for (const flow of flows) {
    const hours = Math.max(1, Number(flow.triggerData?.hours) || 24);
    const cutoff = Date.now() - hours * 60 * 60 * 1000;

    for (const conv of conversations) {
      if (conv.mode !== 'bot') continue; // em atendimento humano/finalizada: não perturba
      if (conv.messages.length < 2) continue;

      const lastMsg = conv.messages[conv.messages.length - 1];
      if (lastMsg.role !== 'assistant') continue; // cliente falou por último — não é caso de follow-up

      const lastAt = new Date(conv.lastAt || conv.updatedAt).getTime();
      if (lastAt > cutoff) continue; // ainda dentro da janela de espera

      if (await wasFlowRecentlyTriggered(flow.id, conv.phone, RETRIGGER_COOLDOWN_MIN)) continue;

      const nome = conv.contactName && !conv.contactName.includes('@')
        ? conv.contactName
        : '';
      await triggerFlow(flow.id, conv.phone, {
        nome,
        telefone: conv.phone.split('@')[0],
      });
      triggered++;
      console.log(`[followup] fluxo "${flow.name}" disparado para ${conv.phone} (${hours}h sem resposta)`);
    }
  }

  return { triggered };
}
