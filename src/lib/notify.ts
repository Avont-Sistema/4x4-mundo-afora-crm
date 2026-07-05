import { botFetch } from './botProxy';
import { getSettings } from './settingsStore';

// Notificações do sistema no WhatsApp dos donos (Diego/Michelle).
// Configure os telefones em WhatsApp IA → ⚙️ → Regras & Config.
// Falha de envio nunca quebra o fluxo principal — é melhor perder uma
// notificação do que travar um atendimento.

export function ownerJid(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  const withCountry = digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`;
  return `${withCountry}@s.whatsapp.net`;
}

export async function getOwnerPhones(): Promise<string[]> {
  const s = await getSettings();
  return [s.diegoPhone, s.michellePhone].filter((p) => (p || '').replace(/\D/g, '').length >= 10);
}

export async function notifyOwners(text: string): Promise<void> {
  try {
    const owners = await getOwnerPhones();
    for (const phone of owners) {
      try {
        await botFetch('/api/send', {
          method: 'POST',
          body: JSON.stringify({ phone: ownerJid(phone), text }),
        });
      } catch (e) {
        console.warn('[notify] falha ao notificar', phone, (e as Error).message);
      }
    }
  } catch (e) {
    console.warn('[notify] erro:', (e as Error).message);
  }
}
