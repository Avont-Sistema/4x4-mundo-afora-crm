export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { botFetch } from '@/lib/botProxy';

export async function GET() {
  try {
    const botRes = await botFetch('/events', { cache: 'no-store' } as RequestInit);

    if (!botRes.ok || !botRes.body) {
      return new Response('data: {"type":"offline"}\n\n', {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      });
    }

    return new Response(botRes.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch {
    return new Response('data: {"type":"offline"}\n\n', {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  }
}
