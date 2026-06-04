// Adaptador para a API oficial WhatsApp Cloud API (Meta).
// Stub deixado pronto para quando o volume justificar a migração (4000+ leads/mês).
// Implementa a MESMA interface do adaptador Baileys, então o index.js não muda.
//
// Para ativar: CHANNEL=meta no .env e preencher META_TOKEN / META_PHONE_ID /
// META_VERIFY_TOKEN. O recebimento de mensagens passa a ser por webhook
// (Meta chama uma URL pública); aqui exporíamos um handler que o index.js
// pluga na rota /webhook. Ver: https://developers.facebook.com/docs/whatsapp/cloud-api
import { EventEmitter } from 'events';

const emitter = new EventEmitter();
const GRAPH = 'https://graph.facebook.com/v21.0';
const TOKEN = process.env.META_TOKEN || '';
const PHONE_ID = process.env.META_PHONE_ID || '';

export const name = 'meta';
export const getQR = () => null; // não usa QR
export const isConnected = () => Boolean(TOKEN && PHONE_ID);
export const onMessage = (fn) => emitter.on('message', fn);

export async function connect() {
  if (!TOKEN || !PHONE_ID) {
    console.warn('[meta] META_TOKEN/META_PHONE_ID ausentes — configure para usar a API oficial.');
  }
  console.log('[meta] pronto (recebimento via webhook /webhook).');
}

// O index.js deve encaminhar o body do webhook da Meta para cá.
export function handleWebhook(body) {
  try {
    const entry = body.entry?.[0]?.changes?.[0]?.value;
    const msg = entry?.messages?.[0];
    if (!msg) return;
    const phone = msg.from;
    const text = msg.text?.body || msg.button?.text || '';
    const contactName = entry.contacts?.[0]?.profile?.name || null;
    if (text.trim()) emitter.emit('message', { phone, text: text.trim(), contactName });
  } catch (err) {
    console.error('[meta] erro no webhook:', err.message);
  }
}

export async function sendText(phone, text) {
  const res = await fetch(`${GRAPH}/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body: text },
    }),
  });
  if (!res.ok) throw new Error(`Meta send falhou: ${res.status}`);
}

export async function sendTyping() {
  /* a Cloud API não expõe "digitando" */
}
