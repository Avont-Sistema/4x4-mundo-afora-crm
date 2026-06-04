import { EventEmitter } from 'events';
import { createRequire } from 'module';
import pino from 'pino';

const require = createRequire(import.meta.url);
const baileys = require('@whiskeysockets/baileys');

const makeWASocket = baileys.default;
const { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = baileys;

const emitter = new EventEmitter();
let sock = null;
let qrCode = null;
let connected = false;

export const name = 'baileys';
export const getQR = () => qrCode;
export const isConnected = () => connected;
export const onMessage = (fn) => emitter.on('message', fn);

export async function connect() {
  // Sessão persistida em arquivos na pasta ./auth (use um volume no Railway/VPS)
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['4x4 Mundo Afora', 'Chrome', '120.0.0'],
    connectTimeoutMs: 60_000,
    keepAliveIntervalMs: 15_000,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      qrCode = qr;
      connected = false;
      console.log('[baileys] QR pronto → acesse /qr');
    }
    if (connection === 'open') {
      qrCode = null;
      connected = true;
      console.log('[baileys] conectado!');
    }
    if (connection === 'close') {
      connected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.log('[baileys] deslogado. Apague a pasta ./auth e reconecte.');
      } else {
        console.log('[baileys] reconectando...');
        setTimeout(connect, 3000);
      }
    }
  });

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      const phone = msg.key.remoteJid;
      if (!phone || phone.endsWith('@g.us')) continue; // ignora grupos
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        '';
      if (!text.trim()) continue;
      emitter.emit('message', {
        phone,
        text: text.trim(),
        contactName: msg.pushName?.trim() || null,
      });
    }
  });
}

export async function sendText(phone, text) {
  if (!sock) throw new Error('WhatsApp não conectado');
  await sock.sendMessage(phone, { text });
}

export async function sendTyping(phone) {
  try {
    await sock.sendPresenceUpdate('composing', phone);
    await new Promise((r) => setTimeout(r, 1500));
    await sock.sendPresenceUpdate('paused', phone);
  } catch {
    /* não crítico */
  }
}
