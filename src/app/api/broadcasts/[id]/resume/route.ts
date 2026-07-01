import { NextRequest, NextResponse } from 'next/server';
import { resumeBroadcast } from '@/lib/broadcastStore';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await resumeBroadcast(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
