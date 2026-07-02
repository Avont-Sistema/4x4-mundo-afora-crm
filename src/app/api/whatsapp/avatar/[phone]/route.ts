import { NextRequest, NextResponse } from 'next/server';
import { botFetch } from '@/lib/botProxy';

// Foto de perfil do contato via bot (Baileys profilePictureUrl).
// Cache no navegador por 6h para não bater no bot a cada render.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const { phone } = await params;
  try {
    const res = await botFetch(`/api/avatar/${encodeURIComponent(phone)}`);
    if (!res.ok) return NextResponse.json({ url: null });
    const data = await res.json();
    return NextResponse.json(
      { url: data.url ?? null },
      { headers: { 'Cache-Control': 'public, max-age=21600' } }
    );
  } catch {
    return NextResponse.json({ url: null });
  }
}
