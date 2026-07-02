/**
 * 4x4 Bot — Broadcast Addon
 *
 * Registrado pelo index.js:
 *   const { registerBroadcastRoutes } = require('./broadcast-addon');
 *   registerBroadcastRoutes(app, () => sock, { botSecret, resolveJid });
 *
 * O CRM chama POST /api/broadcast/send com a lista completa de destinatários;
 * o bot envia em background respeitando o intervalo e notifica o CRM por
 * destinatário via callbackUrl (endpoint /api/broadcasts/[id]/callback).
 */

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// Fallback de validação caso o index.js não injete resolveJid.
// Verifica se o número existe no WhatsApp (variantes com/sem o nono dígito BR).
async function fallbackResolveJid(sock, rawPhone) {
  const digits = String(rawPhone).split('@')[0].replace(/\D/g, '');
  if (!digits) return { ok: false, error: 'Número vazio' };

  const candidates = [digits];
  if (digits.startsWith('55')) {
    if (digits.length === 13) candidates.push(digits.slice(0, 4) + digits.slice(5));
    if (digits.length === 12) candidates.push(digits.slice(0, 4) + '9' + digits.slice(4));
  }

  for (const cand of candidates) {
    try {
      const results = await sock.onWhatsApp(cand);
      if (results?.[0]?.exists && results[0].jid) {
        return { ok: true, jid: results[0].jid };
      }
    } catch (_) { /* tenta o próximo */ }
  }
  return { ok: false, error: `Número ${digits} não encontrado no WhatsApp` };
}

function registerBroadcastRoutes(app, getSock, opts = {}) {
  const { botSecret, resolveJid } = opts;

  /**
   * POST /api/broadcast/send  (requer header x-bot-secret)
   *
   * Body:
   *   broadcastId   string           — ID do disparo no CRM
   *   message       string           — texto com {nome} e {telefone}
   *   mediaUrl?     string           — URL da mídia (opcional)
   *   mediaType?    'image'|'video'|'audio'|'document'
   *   intervalMs    number           — intervalo entre envios (padrão 5000ms)
   *   callbackUrl?  string           — CRM endpoint para notificar por destinatário
   *   callbackSecret? string         — valor para header x-bot-secret no callback
   *   recipients    Array<{ id, phone, name? }>
   *
   * Responde imediatamente com { ok: true, total: N } e processa em background.
   * Números que não existem no WhatsApp são reportados como falha ao CRM
   * (antes eram enviados às cegas e o envio "sumia" sem erro).
   */
  app.post('/api/broadcast/send', async (req, res) => {
    if (botSecret && req.headers['x-bot-secret'] !== botSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      broadcastId,
      message,
      mediaUrl,
      mediaType,
      intervalMs = 5000,
      callbackUrl,
      callbackSecret,
      recipients,
    } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'recipients é obrigatório' });
    }
    if (!message && !mediaUrl) {
      return res.status(400).json({ error: 'message ou mediaUrl é obrigatório' });
    }

    const sock = typeof getSock === 'function' ? getSock() : getSock;
    if (!sock) {
      return res.status(503).json({ error: 'WhatsApp não conectado' });
    }

    // Responde imediatamente — processa em background
    res.json({ ok: true, broadcastId, total: recipients.length });

    const callbackHeaders = {
      'Content-Type': 'application/json',
      ...(callbackSecret ? { 'x-bot-secret': callbackSecret } : {}),
    };

    async function notifyCRM(payload) {
      if (!callbackUrl) return;
      try {
        await fetch(callbackUrl, {
          method: 'POST',
          headers: callbackHeaders,
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error('[broadcast] Erro ao notificar CRM:', err.message);
      }
    }

    (async () => {
      let sentCount = 0;
      let failCount = 0;

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];

        // Valida e resolve o JID real. Não existe => reporta falha, não envia às cegas.
        const resolved = resolveJid
          ? await resolveJid(recipient.phone)
          : await fallbackResolveJid(sock, recipient.phone);

        if (!resolved.ok) {
          failCount++;
          console.error(`[broadcast] ✗ ${recipient.phone}: ${resolved.error}`);
          await notifyCRM({ recipientId: recipient.id, success: false, error: resolved.error });
          continue;
        }
        const phone = resolved.jid;

        const personalized = (message || '')
          .replace(/\{nome\}/gi, recipient.name || '')
          .replace(/\{telefone\}/gi, recipient.phone);

        let success = false;
        let error = null;

        try {
          if (mediaUrl && mediaType) {
            const payload = {};
            if (mediaType === 'image') {
              payload.image = { url: mediaUrl };
              if (personalized) payload.caption = personalized;
            } else if (mediaType === 'video') {
              payload.video = { url: mediaUrl };
              if (personalized) payload.caption = personalized;
            } else if (mediaType === 'audio') {
              payload.audio = { url: mediaUrl };
              payload.mimetype = 'audio/mp4';
              payload.ptt = false;
            } else if (mediaType === 'document') {
              payload.document = { url: mediaUrl };
              if (personalized) payload.caption = personalized;
            } else {
              payload.image = { url: mediaUrl };
              if (personalized) payload.caption = personalized;
            }
            await sock.sendMessage(phone, payload);
            // Áudio não tem caption — texto vai em mensagem separada
            if (mediaType === 'audio' && personalized) {
              await sock.sendMessage(phone, { text: personalized });
            }
          } else {
            await sock.sendMessage(phone, { text: personalized });
          }
          success = true;
          sentCount++;
          console.log(`[broadcast] ✓ enviado → ${phone}`);
        } catch (err) {
          error = err.message || 'Erro desconhecido ao enviar';
          failCount++;
          console.error(`[broadcast] Falha ao enviar para ${phone}:`, err.message);
        }

        await notifyCRM({ recipientId: recipient.id, success, error });

        // Aguarda intervalo (exceto após o último)
        if (i < recipients.length - 1) {
          await delay(Math.max(intervalMs, 1000));
        }
      }

      // Callback final de conclusão
      await notifyCRM({ broadcastId, done: true, sentCount, failCount });
      console.log(`[broadcast] Concluído ${broadcastId}: ${sentCount} enviados, ${failCount} falhas`);
    })().catch((err) => {
      console.error('[broadcast] Erro crítico no worker:', err);
    });
  });
}

module.exports = { registerBroadcastRoutes };
