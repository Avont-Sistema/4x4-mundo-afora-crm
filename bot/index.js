'use strict';

const express = require('express');
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  jidNormalizedUser,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

// ── Configuração ──────────────────────────────────────────────────────────────
const PORT           = process.env.PORT           || 3001;
const CRM_URL        = process.env.CRM_URL        || 'http://localhost:3030';
const BOT_SECRET     = process.env.BOT_SECRET     || '4x4bot2025';
const CONNECTOR_TOKEN = process.env.CONNECTOR_TOKEN || '';

const app = express();
app.use(express.json());

// ── Store Baileys (resolve @lid → @s.whatsapp.net) ────────────────────────────
const store = makeInMemoryStore({ logger: pino({ level: 'silent' }) });

// ── Estado ────────────────────────────────────────────────────────────────────
let sock           = null;
let isConnected    = false;
let currentQrData  = null;   // string base64 data-URL do QR
let sseClients     = [];

// Conversas em memória: phone → { phone, name, stage, botActive, history, ... }
const conversations = new Map();

// Resolve @lid para o JID real de envio usando o store
function resolveSendJid(jid) {
  if (!jid.includes('@lid')) return jid;
  try {
    const contacts = store.contacts || {};
    for (const [contactJid, contact] of Object.entries(contacts)) {
      if (contact.lid === jid || contact.lid === jid.split('@')[0]) {
        return contactJid;
      }
    }
  } catch {}
  return jid; // fallback: tenta enviar mesmo assim
}

let settings = {
  alertMinutes:     20,
  followup1Hours:   24,
  followup2Hours:   48,
  followupMessage1: 'Oi! 😊 Passando pra saber se ficou alguma dúvida sobre a expedição. Posso te ajudar?',
  followupMessage2: 'Oi! Ainda tem vagas disponíveis na expedição que você perguntou. Quer garantir a sua? 🚙',
  diegoPhone:       '',
  michellePhone:    '',
  operatorNotes:    '',
};

let metaHistory = [];

// ── SSE helpers ───────────────────────────────────────────────────────────────
function sendSSE(data) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((res) => { try { res.write(msg); } catch {} });
}

// ── Baileys ───────────────────────────────────────────────────────────────────
async function connectWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(
    path.join(__dirname, 'auth')
  );
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'warn' }),
    printQRInTerminal: true,
    browser: ['4x4 Bot', 'Chrome', '1.0.0'],
  });

  store.bind(sock.ev); // mantém mapeamento @lid → @s.whatsapp.net

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQrData = await qrcode.toDataURL(qr);
      isConnected = false;
      sendSSE({ type: 'qr' });
      console.log('[bot] QR gerado — escaneie no WhatsApp');
    }

    if (connection === 'close') {
      isConnected = false;
      currentQrData = null;
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      sendSSE({ type: 'disconnected', code });
      console.log('[bot] Desconectado (código', code, ')');
      if (shouldReconnect) {
        console.log('[bot] Reconectando em 5s...');
        setTimeout(connectWhatsApp, 5000);
      } else {
        console.log('[bot] Sessão encerrada (logout). Delete a pasta auth/ e reinicie.');
      }
    } else if (connection === 'open') {
      isConnected = true;
      currentQrData = null;
      sendSSE({ type: 'connected' });
      console.log('[bot] WhatsApp conectado ✓');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages: msgs, type }) => {
    if (type !== 'notify') return;

    for (const msg of msgs) {
      if (!msg.message || msg.key.fromMe) continue;

      const rawJid = msg.key.remoteJid;
      if (!rawJid || rawJid.includes('@g.us')) continue; // ignora grupos

      // @lid é o novo formato interno do WhatsApp — normaliza para @s.whatsapp.net
      // usando o número do participante se disponível, senão mantém o @lid
      const phone = rawJid;

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        '';

      if (!text.trim()) continue;

      const contactName = msg.pushName || phone;

      // Garante que a conversa existe
      if (!conversations.has(phone)) {
        conversations.set(phone, {
          phone,
          name: contactName,
          stage: 'new',
          botActive: true,
          expeditionInterest: null,
          lastMessage: text,
          updatedAt: new Date().toISOString(),
          lastUserMessageAt: new Date().toISOString(),
          followup1SentAt: null,
          followup2SentAt: null,
          waitingMinutes: null,
          alertedOperator: false,
          history: [],
          lastReceivedMsg: null,
        });
      }

      const conv = conversations.get(phone);
      conv.name              = contactName || conv.name;
      conv.lastMessage       = text;
      conv.updatedAt         = new Date().toISOString();
      conv.lastUserMessageAt = new Date().toISOString();
      conv.lastReceivedMsg   = msg; // salva para usar como quoted no envio manual
      // cliente respondeu → reseta follow-ups para não enviar novamente
      conv.followup1SentAt   = null;
      conv.followup2SentAt   = null;
      conv.history.push({ role: 'user', content: text, ts: new Date().toISOString() });

      sendSSE({ type: 'message', phone, text, contactName });

      // Encaminha ao CRM apenas se bot ativo para esta conversa
      if (!conv.botActive) continue;

      try {
        const headers = { 'Content-Type': 'application/json' };
        if (CONNECTOR_TOKEN) headers['x-connector-token'] = CONNECTOR_TOKEN;

        const res = await fetch(`${CRM_URL}/api/whatsapp/inbound`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ phone, text, contactName }),
        });

        const data = await res.json();

        if (data.reply) {
          try {
            const sendJid = resolveSendJid(phone);
            await sock.sendMessage(sendJid, { text: data.reply }, { quoted: msg });
            conv.history.push({
              role: 'assistant',
              content: data.reply,
              ts: new Date().toISOString(),
              via: 'bot',
            });
            sendSSE({ type: 'reply_sent', phone, text: data.reply });
            console.log(`[bot] → ${phone}: ${data.reply.slice(0, 60)}...`);
          } catch (sendErr) {
            console.error('[bot] Erro ao enviar mensagem:', sendErr.message);
          }
        }
      } catch (err) {
        console.error('[bot] Erro ao chamar CRM:', err.message);
      }
    }
  });
}

// ── Scheduler de follow-up ────────────────────────────────────────────────────
async function runFollowupScheduler() {
  if (!isConnected || !sock) return;

  const now = Date.now();
  const fu1Ms = settings.followup1Hours * 60 * 60 * 1000;
  const fu2Ms = settings.followup2Hours * 60 * 60 * 1000;

  for (const conv of conversations.values()) {
    if (!conv.botActive || !conv.lastUserMessageAt) continue;

    const silentMs = now - new Date(conv.lastUserMessageAt).getTime();

    // Follow-up 1
    if (
      silentMs >= fu1Ms &&
      !conv.followup1SentAt &&
      settings.followupMessage1?.trim()
    ) {
      try {
        await sock.sendMessage(conv.phone, { text: settings.followupMessage1 });
        conv.followup1SentAt = new Date().toISOString();
        conv.history.push({
          role: 'assistant',
          content: settings.followupMessage1,
          ts: conv.followup1SentAt,
          via: 'followup1',
        });
        sendSSE({ type: 'followup_sent', phone: conv.phone, which: 1 });
        console.log(`[followup] Follow-up 1 enviado para ${conv.phone}`);
      } catch (err) {
        console.error(`[followup] Erro ao enviar follow-up 1 para ${conv.phone}:`, err.message);
      }
    }

    // Follow-up 2 (só após follow-up 1 já ter sido enviado)
    if (
      silentMs >= fu2Ms &&
      conv.followup1SentAt &&
      !conv.followup2SentAt &&
      settings.followupMessage2?.trim()
    ) {
      try {
        await sock.sendMessage(conv.phone, { text: settings.followupMessage2 });
        conv.followup2SentAt = new Date().toISOString();
        conv.history.push({
          role: 'assistant',
          content: settings.followupMessage2,
          ts: conv.followup2SentAt,
          via: 'followup2',
        });
        sendSSE({ type: 'followup_sent', phone: conv.phone, which: 2 });
        console.log(`[followup] Follow-up 2 enviado para ${conv.phone}`);
      } catch (err) {
        console.error(`[followup] Erro ao enviar follow-up 2 para ${conv.phone}:`, err.message);
      }
    }
  }
}

// ── Auth middleware ───────────────────────────────────────────────────────────
function auth(req, res, next) {
  if (req.headers['x-bot-secret'] !== BOT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ── Rotas ─────────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ ok: true, connected: isConnected });
});

app.get('/api/status', auth, (req, res) => {
  res.json({ connected: isConnected, qr: !!currentQrData });
});

app.get('/api/qr', auth, (req, res) => {
  res.json({ connected: isConnected, qr: currentQrData });
});

app.get('/api/conversations', auth, (req, res) => {
  const list = Array.from(conversations.values())
    .map(({ history: _h, ...c }) => c)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json({ conversations: list });
});

app.get('/api/history/:phone', auth, (req, res) => {
  const conv = conversations.get(decodeURIComponent(req.params.phone));
  res.json({ history: conv?.history || [] });
});

app.post('/api/send', auth, async (req, res) => {
  const { phone, text } = req.body;
  if (!phone || !text) return res.status(400).json({ error: 'phone e text obrigatórios' });
  if (!isConnected || !sock) return res.status(503).json({ error: 'WhatsApp não conectado' });

  try {
    let conv = conversations.get(phone);
    const quotedMsg = conv?.lastReceivedMsg;
    // usa quoted para garantir entrega em JIDs @lid
    const sendJid = resolveSendJid(phone);
    if (quotedMsg) {
      await sock.sendMessage(sendJid, { text }, { quoted: quotedMsg });
    } else {
      await sock.sendMessage(sendJid, { text });
    }

    if (!conv) {
      conv = {
        phone, name: phone, stage: 'human', botActive: false,
        expeditionInterest: null, lastMessage: text,
        updatedAt: new Date().toISOString(),
        waitingMinutes: null, alertedOperator: false, history: [], lastReceivedMsg: null,
      };
      conversations.set(phone, conv);
    }
    conv.lastMessage = text;
    conv.updatedAt   = new Date().toISOString();
    conv.history.push({ role: 'assistant', content: text, ts: new Date().toISOString(), via: 'operator' });

    sendSSE({ type: 'message_sent', phone, text });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bot-toggle', auth, (req, res) => {
  const { phone, bot_active } = req.body;
  const conv = conversations.get(phone);
  if (conv) conv.botActive = Boolean(bot_active);
  res.json({ ok: true });
});

app.get('/events', auth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  sseClients.push(res);

  const hb = setInterval(() => { try { res.write(':heartbeat\n\n'); } catch {} }, 25000);
  req.on('close', () => {
    clearInterval(hb);
    sseClients = sseClients.filter((c) => c !== res);
  });
});

app.get('/api/bot-settings', auth, (req, res) => {
  res.json(settings);
});

app.post('/api/bot-settings', auth, (req, res) => {
  settings = { ...settings, ...req.body };
  res.json({ ok: true });
});

app.get('/api/meta-chat', auth, (req, res) => {
  res.json({ history: metaHistory, operatorNotes: settings.operatorNotes });
});

app.post('/api/meta-chat', auth, (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'message obrigatório' });
  metaHistory.push({ role: 'user', content: message });
  // Interpreta instruções simples e atualiza operatorNotes
  settings.operatorNotes = (settings.operatorNotes ? settings.operatorNotes + '\n' : '') + message;
  const reply = `Anotado! Vou seguir essa instrução nas próximas respostas: "${message}"`;
  metaHistory.push({ role: 'assistant', content: reply });
  res.json({ reply, operatorNotes: settings.operatorNotes });
});

app.delete('/api/meta-chat', auth, (req, res) => {
  metaHistory = [];
  res.json({ ok: true });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[bot] Serviço rodando na porta ${PORT}`);
  connectWhatsApp();
  // Verifica follow-ups a cada 15 minutos
  setInterval(runFollowupScheduler, 15 * 60 * 1000);
});
