import { NextRequest } from 'next/server';

const BOT_SECRET = process.env.BOT_SECRET || '4x4bot2025';

export function isBotAuthed(request: NextRequest): boolean {
  return request.headers.get('x-bot-secret') === BOT_SECRET;
}
