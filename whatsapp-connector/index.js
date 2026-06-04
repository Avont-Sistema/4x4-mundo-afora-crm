import 'dotenv/config';
import express from 'express';
import QRCode from 'qrcode';
import channel from './channels/index.js';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const CRM_URL = process.env.CRM_URL || 'http://localhost:3030';
const TOKEN = process.env.WHATSAPP_CONNECTOR_TOKEN || '';

// ── Recebe mensagem do WhatsApp → manda pro cérebro no CRM → responde ───────
channel.onMessage(async ({ phone, text, contactName }) => {
  try {
    console.log(`[msg] ${phone} (${contactName || 'sem nome'}): ${text.slice(0, 60)}`);

    if (text.trim() === '/reset') {
      await channel.sendText(phone, 'Histórico reiniciado! Como posso ajudar? 👋');
      return;
    }

    if (channel.sendTyping) channel.sendTyping(phone).catch(() => {});

    const res = await fetch(`${CRM_URL}/api/whatsapp/inbound`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-connector-token': TOKEN,
      },
      body: JSON.stringify({ phone, text, contactName }),
    });

    if (!res.ok) {
      console.error('[crm] inbound falhou:', res.status);
      return;
    }

    const data = await res.json();
    // reply=null => bot pausado / modo humano / fora do horário sem msg
    if (data.reply) {
      await channel.sendText(phone, data.reply);
    }
  } catch (err) {
    console.error('[erro]', err.message);
  }
});

// ── QR code (Baileys) ───────────────────────────────────────────────────────
app.get('/qr', async (_req, res) => {
  if (channel.isConnected()) {
    return res.send('<h2 style="font-family:sans-serif;text-align:center;padding:60px">✅ WhatsApp conectado!</h2>');
  }
  const qr = channel.getQR?.();
  if (!qr) {
    return res.send('<html><head><meta http-equiv="refresh" content="3"></head><body style="font-family:sans-serif;text-align:center;padding:60px"><h2>⏳ Aguardando QR...</h2></body></html>');
  }
  const img = await QRCode.toDataURL(qr);
  res.send(`<html><head><meta http-equiv="refresh" content="30"></head><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>📱 Escaneie no WhatsApp</h2><img src="${img}" style="width:280px"/><p style="color:#666">WhatsApp → Aparelhos conectados → Conectar aparelho</p></body></html>`);
});

// ── Envio manual (handoff humano): CRM chama este endpoint ──────────────────
app.post('/send', async (req, res) => {
  if (TOKEN && req.headers['x-connector-token'] !== TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const { phone, text } = req.body;
  if (!phone || !text) return res.status(400).json({ error: 'phone e text obrigatórios' });
  try {
    await channel.sendText(phone, text);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Webhook da Meta (quando CHANNEL=meta) ───────────────────────────────────
app.get('/webhook', (req, res) => {
  const verifyToken = process.env.META_VERIFY_TOKEN || '';
  if (req.query['hub.verify_token'] === verifyToken) {
    return res.send(req.query['hub.challenge']);
  }
  res.sendStatus(403);
});
app.post('/webhook', (req, res) => {
  if (channel.handleWebhook) channel.handleWebhook(req.body);
  res.sendStatus(200);
});

app.get('/health', (_req, res) =>
  res.json({ ok: true, channel: channel.name, connected: channel.isConnected() })
);

app.listen(PORT, () => {
  console.log(`[connector] :${PORT} → CRM ${CRM_URL}`);
  console.log(`[connector] QR em /qr`);
});

channel.connect().catch((err) => console.error('[connector] erro ao conectar:', err.message));
