const BOT_URL    = process.env.BOT_URL    || 'http://localhost:3001';
const BOT_SECRET = process.env.BOT_SECRET || '4x4bot2025';

export async function botFetch(path: string, init?: RequestInit) {
  return fetch(`${BOT_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-bot-secret': BOT_SECRET,
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
}
