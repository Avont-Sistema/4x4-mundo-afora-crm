import { NextRequest, NextResponse } from 'next/server';
import { botFetch } from '@/lib/botProxy';

export async function GET() {
  try {
    const res = await botFetch('/api/settings');
    if (!res.ok) return NextResponse.json({}, { status: res.status });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ offline: true }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  try {
    const res = await botFetch('/api/settings', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: 'Bot offline' }, { status: 503 });
  }
}
