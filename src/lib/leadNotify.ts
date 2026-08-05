import { botFetch } from './botProxy';
import type { Lead } from './leadsStore';

// Notifica Diego/Michele no WhatsApp quando um lead NOVO entra pelo formulário
// público de anúncios (POST /api/leads/webhook). Só deve ser chamado dali —
// upsertLeadFromContact é compartilhado com o bot de atendimento e outros
// fluxos, então a notificação fica na rota do webhook, não no store.
// Falha de envio nunca quebra o cadastro do lead.

export async function notifyNewLead(lead: Lead): Promise<void> {
  const phones = (process.env.LEAD_NOTIFY_PHONES || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (phones.length === 0) return;

  const text = [
    'Novo lead pelo formulário 🚙',
    `Nome: ${lead.name}`,
    `Telefone: ${lead.phone || lead.whatsapp || 'não informado'}`,
    lead.interest ? `Interesse: ${lead.interest}` : null,
    `Origem: ${lead.source}`,
  ].filter(Boolean).join('\n');

  await Promise.all(
    phones.map((phone) =>
      botFetch('/api/send', {
        method: 'POST',
        body: JSON.stringify({ phone: `${phone}@s.whatsapp.net`, text }),
      }).catch((e) => {
        console.warn('[leadNotify] falha ao notificar', phone, (e as Error).message);
      })
    )
  );
}
