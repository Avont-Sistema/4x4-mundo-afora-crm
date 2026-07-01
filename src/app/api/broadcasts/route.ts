import { NextRequest, NextResponse } from 'next/server';
import { listBroadcasts, createBroadcast, getBroadcastStats } from '@/lib/broadcastStore';

export async function GET() {
  const broadcasts = await listBroadcasts();

  const result = await Promise.all(broadcasts.map(async (b) => ({
    ...b,
    customPhones: undefined, // don't expose stored phones in list
    stats: await getBroadcastStats(b.id),
  })));

  return NextResponse.json({ broadcasts: result });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, message, mediaUrl, mediaType, recipientSource, customPhones, intervalSec, scheduledAt } = body;

    if (!name?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'name e message são obrigatórios' }, { status: 400 });
    }

    // Parse custom phones from textarea (one per line)
    let phones: string[] | undefined;
    if (recipientSource === 'custom' && customPhones) {
      phones = (customPhones as string)
        .split('\n')
        .map((p: string) => p.trim())
        .filter(Boolean);
    }

    const broadcast = await createBroadcast({
      name: name.trim(),
      message: message.trim(),
      mediaUrl: mediaUrl || undefined,
      mediaType: mediaType || undefined,
      recipientSource: recipientSource || 'custom',
      customPhones: phones,
      intervalSec: intervalSec ?? 10,
      scheduledAt: scheduledAt || undefined,
    });

    return NextResponse.json({ broadcast }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
