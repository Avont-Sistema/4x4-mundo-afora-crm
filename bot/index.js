'use strict';

const express = require('express');
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
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

// ── Estado ────────────────────────────────────────────────────────────────────
let sock           = null;
let isConnected    = false;
let currentQrData  = null;   // string base64 data-URL do QR
let sseClients     = [];

// Conversas em memória: phone → { phone, name, stage, botActive, history, ... }
const conversations = new Map();

// Mapeamento manual @lid → @s.whatsapp.net (populado ao receber mensagens)
const lidToJid = new Map();

// Resolve @lid para o JID real de envio
function resolveSendJid(jid) {
  if (!jid.includes('@lid')) return jid;
  return lidToJid.get(jid) || jid;
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
    connectTimeoutMs: 90_000,
    defaultQueryTimeoutMs: 90_000,
    keepAliveIntervalMs: 30_000,
  });

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
      sendSSE({ type: 'disconnected', code });
      console.log('[bot] Desconectado (código', code, ')');

      if (code === DisconnectReason.loggedOut) {
        // Sessão inválida: limpa arquivos e gera novo QR automaticamente
        console.log('[bot] Logout detectado — limpando sessão e gerando novo QR...');
        const authDir = path.join(__dirname, 'auth');
        try {
          for (const f of fs.readdirSync(authDir)) {
            fs.rmSync(path.join(authDir, f), { force: true });
          }
        } catch (e) {
          console.error('[bot] Erro ao limpar auth:', e.message);
        }
        setTimeout(connectWhatsApp, 2000);
      } else {
        console.log('[bot] Reconectando em 5s...');
        setTimeout(connectWhatsApp, 5000);
      }
    } else if (connection === 'open') {
      isConnected = true;
      currentQrData = null;
      sendSSE({ type: 'connected' });
      console.log('[bot] WhatsApp conectado ✓');
    }
  });

  // Diagnóstico: loga todos os eventos de contato para encontrar mapeamento @lid
  sock.ev.on('contacts.upsert', (contacts) => {
    console.log('[bot][diag] contacts.upsert:', JSON.stringify(contacts.slice(0, 3)));
    for (const c of contacts) {
      if (c.lid && c.id) {
        const lidKey = c.lid.includes('@') ? c.lid : `${c.lid}@lid`;
        lidToJid.set(lidKey, c.id);
        console.log(`[bot] LID mapeado: ${lidKey} → ${c.id}`);
      }
    }
  });
  sock.ev.on('contacts.update', (updates) => {
    console.log('[bot][diag] contacts.update:', JSON.stringify(updates.slice(0, 3)));
    for (const c of updates) {
      if (c.lid && c.id) {
        const lidKey = c.lid.includes('@') ? c.lid : `${c.lid}@lid`;
        lidToJid.set(lidKey, c.id);
      }
    }
  });
  sock.ev.on('messaging-history.set', ({ contacts, chats }) => {
    console.log('[bot][diag] messaging-history contacts sample:', JSON.stringify((contacts || []).slice(0, 3)));
    for (const c of (contacts || [])) {
      if (c.lid && c.id) {
        const lidKey = c.lid.includes('@') ? c.lid : `${c.lid}@lid`;
        lidToJid.set(lidKey, c.id);
        console.log(`[bot] LID via history: ${lidKey} → ${c.id}`);
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages: msgs, type }) => {
    if (type !== 'notify') return;

    for (const msg of msgs) {
      if (!msg.message || msg.key.fromMe) continue;

      const rawJid = msg.key.remoteJid;
      if (!rawJid || rawJid.includes('@g.us')) continue;

      // @lid: resolve JID real via senderPn + verificação onWhatsApp
      if (rawJid.includes('@lid') && msg.key.senderPn && !lidToJid.has(rawJid)) {
        const pn = msg.key.senderPn.split('@')[0];
        try {
          const results = await sock.onWhatsApp(pn);
          const found = results?.[0];
          if (found?.exists && found?.jid) {
            lidToJid.set(rawJid, found.jid);
            console.log(`[bot] @lid resolvido via onWhatsApp: ${rawJid} → ${found.jid}`);
          } else {
            // Tenta com dígito 9 extra (padrão BR pós-2015)
            const with9 = pn.startsWith('55') && pn.length === 12
              ? pn.slice(0, 4) + '9' + pn.slice(4)
              : null;
            const results2 = with9 ? await sock.onWhatsApp(with9) : null;
            const found2 = results2?.[0];
            const jid = found2?.exists ? found2.jid : msg.key.senderPn;
            lidToJid.set(rawJid, jid);
            console.log(`[bot] @lid fallback: ${rawJid} → ${jid}`);
          }
        } catch (e) {
          lidToJid.set(rawJid, msg.key.senderPn);
          console.log(`[bot] onWhatsApp erro, usando senderPn: ${e.message}`);
        }
      }

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
            // Para contas @lid: tenta LID primeiro (phone JID recebe 463 assíncrono e não lança exceção)
            const jidsToTry = phone.includes('@lid')
              ? [phone, resolveSendJid(phone)]            // LID primeiro, phone como fallback
              : [resolveSendJid(phone)];                  // phone normal

            const sendJidResolved = jidsToTry[0];

            // Mostra indicador "digitando..." pelo tempo configurado
            const typingMs = (data.typingDelay || 0) * 1000;
            if (typingMs > 0) {
              try {
                await sock.sendPresenceUpdate('composing', sendJidResolved);
                await new Promise(r => setTimeout(r, typingMs));
                await sock.sendPresenceUpdate('paused', sendJidResolved);
              } catch { /* não crítico */ }
            }

            for (const jid of jidsToTry) {
              console.log(`[bot] Tentando enviar → ${jid}`);
              try {
                await sock.sendMessage(jid, { text: data.reply });
                console.log(`[bot] ✓ enviado para ${jid}`);
                break;
              } catch (e) {
                console.error(`[bot] ✗ falhou ${jid}: ${e.message}`);
              }
            }

            conv.history.push({
              role: 'assistant',
              content: data.reply,
              ts: new Date().toISOString(),
              via: 'bot',
            });
            sendSSE({ type: 'reply_sent', phone, text: data.reply });
          } catch (sendErr) {
            console.error('[bot] Erro geral ao enviar:', sendErr.message);
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

// Endpoint de diagnóstico — testa vários JIDs e formatos
app.post('/api/test-jid', auth, async (req, res) => {
  const { text = 'Teste diagnóstico bot 4x4' } = req.body;
  if (!isConnected || !sock) return res.status(503).json({ error: 'não conectado' });

  const results = [];
  const jids = [];

  // Coleta todos os @lid conhecidos e seus mapeamentos
  for (const [lid, phone] of lidToJid.entries()) {
    jids.push({ label: 'phone via lidToJid', jid: phone });
    jids.push({ label: 'lid direto', jid: lid });
  }

  // Adiciona sessões conhecidas do auth
  const authDir = process.env.AUTH_DIR || '/app/auth';
  try {
    const files = fs.readdirSync(authDir).filter(f => f.startsWith('session-'));
    for (const f of files) {
      const num = f.replace('session-', '').replace(/\.\d+\.json$/, '');
      if (!num.includes('@')) {
        const jid = `${num}@s.whatsapp.net`;
        if (!jids.find(j => j.jid === jid)) {
          jids.push({ label: `session-file`, jid });
        }
      }
    }
  } catch {}

  for (const { label, jid } of jids.slice(0, 6)) {
    try {
      await sock.sendMessage(jid, { text: `[DIAG] ${text}` });
      results.push({ jid, label, ok: true });
    } catch (e) {
      results.push({ jid, label, ok: false, err: e.message });
    }
  }

  res.json({ results, botId: sock.user?.id });
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

// ── Flow message polling ──────────────────────────────────────────────────────
async function pollFlowMessages() {
  if (!isConnected || !sock) return;

  let messages;
  try {
    const res = await fetch(`${CRM_URL}/api/whatsapp/pending-messages`, {
      headers: { 'x-bot-secret': BOT_SECRET },
    });
    const data = await res.json();
    messages = data.messages || [];
  } catch (err) {
    console.error('[flow] Erro ao buscar mensagens pendentes:', err.message);
    return;
  }

  for (const msg of messages) {
    const phone = msg.run?.phone;
    if (!phone) continue;

    const sendJid = resolveSendJid(phone);
    let success = true;
    let errorMsg = null;

    try {
      // Mostra "digitando..." pelo tempo configurado na etapa
      const typingSec = msg.typingDelaySec || 0;
      if (typingSec > 0) {
        try {
          await sock.sendPresenceUpdate('composing', sendJid);
          await new Promise(r => setTimeout(r, typingSec * 1000));
          await sock.sendPresenceUpdate('paused', sendJid);
        } catch { /* não crítico */ }
      }

      if (msg.type === 'text') {
        await sock.sendMessage(sendJid, { text: msg.content || '' });
      } else if (msg.type === 'image') {
        // content é URL da imagem
        await sock.sendMessage(sendJid, {
          image: { url: msg.content },
          caption: '',
        });
      } else if (msg.type === 'audio') {
        // PTT exige 'audio/ogg; codecs=opus' — preserva o codec completo para OGG
        let detectedMime = 'audio/ogg; codecs=opus';
        try {
          const head = await fetch(msg.content, { method: 'HEAD' });
          const ct = (head.headers.get('content-type') || '').toLowerCase();
          if (ct.includes('ogg')) {
            detectedMime = 'audio/ogg; codecs=opus';
          } else if (ct.includes('mpeg') || ct.includes('mp3')) {
            detectedMime = 'audio/mpeg';
          } else if (ct && ct.includes('/')) {
            detectedMime = ct.split(';')[0].trim();
          }
        } catch { /* usa default */ }
        console.log(`[flow] audio mime: ${detectedMime} url: ${msg.content}`);
        try {
          // Tenta como PTT (nota de voz)
          await sock.sendMessage(sendJid, {
            audio: { url: msg.content },
            mimetype: detectedMime,
            ptt: true,
          });
        } catch (e1) {
          console.warn(`[flow] PTT falhou (${e1.message}), tentando audio normal`);
          // Fallback: envia como áudio normal (não PTT)
          await sock.sendMessage(sendJid, {
            audio: { url: msg.content },
            mimetype: detectedMime,
          });
        }
      } else if (msg.type === 'video') {
        await sock.sendMessage(sendJid, {
          video: { url: msg.content },
          caption: '',
        });
      }
      console.log(`[flow] ✓ msg ${msg.id} enviada → ${sendJid}`);
    } catch (err) {
      success = false;
      errorMsg = err.message;
      console.error(`[flow] ✗ msg ${msg.id} falhou: ${err.message}`);
    }

    // Reporta resultado ao CRM
    try {
      await fetch(`${CRM_URL}/api/whatsapp/pending-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-bot-secret': BOT_SECRET },
        body: JSON.stringify({ id: msg.id, runId: msg.runId, success, error: errorMsg }),
      });
    } catch (err) {
      console.error('[flow] Erro ao reportar resultado:', err.message);
    }
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[bot] Serviço rodando na porta ${PORT}`);
  connectWhatsApp();
  // Verifica follow-ups a cada 15 minutos
  setInterval(runFollowupScheduler, 15 * 60 * 1000);
  // Verifica mensagens de fluxo a cada 30 segundos
  setInterval(pollFlowMessages, 30 * 1000);
});
