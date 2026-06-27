import { NextResponse } from 'next/server';
import { botFetch } from '@/lib/botProxy';

export async function GET() {
  try {
    const res = await botFetch('/api/qr');
    if (!res.ok) return NextResponse.json({ connected: false, qr: null });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ connected: false, qr: null, offline: true });
  }
}
