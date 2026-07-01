import { NextRequest, NextResponse } from 'next/server';
import { pauseBroadcast } from '@/lib/broadcastStore';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await pauseBroadcast(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
