// Seleciona o canal de WhatsApp pelo env CHANNEL (baileys | meta).
// Ambos expõem a mesma interface: connect, onMessage, sendText, getQR, isConnected.
const channelName = (process.env.CHANNEL || 'baileys').toLowerCase();

let channel;
if (channelName === 'meta') {
  channel = await import('./meta.js');
} else {
  channel = await import('./baileys.js');
}

console.log(`[connector] canal ativo: ${channel.name}`);

export default channel;
