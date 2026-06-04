import { NextRequest, NextResponse } from 'next/server';
import { getConversation, setMode, type ConvMode } from '@/lib/conversationsStore';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const { phone } = await params;
  const conv = getConversation(decodeURIComponent(phone));
  if (!conv) {
    return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
  }
  return NextResponse.json({ conversation: conv });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const { phone } = await params;
  const body = await request.json();
  const mode = body.mode as ConvMode;
  if (!['bot', 'human', 'resolved'].includes(mode)) {
    return NextResponse.json({ error: 'mode inválido' }, { status: 400 });
  }
  const conv = setMode(decodeURIComponent(phone), mode);
  if (!conv) {
    return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
  }
  return NextResponse.json({ conversation: conv });
}
