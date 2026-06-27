import { NextResponse } from 'next/server';
import { botFetch } from '@/lib/botProxy';

export async function GET() {
  try {
    const res = await botFetch('/api/status');
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ connected: false, qr: false, offline: true });
  }
}
