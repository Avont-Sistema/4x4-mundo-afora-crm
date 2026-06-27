import { NextRequest, NextResponse } from 'next/server';
import { isBotAuthed } from '@/lib/botAuth';
import { getLead, updateLead } from '@/lib/leadsStore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isBotAuthed(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
  return NextResponse.json({ lead });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isBotAuthed(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const lead = await updateLead(id, body);
  if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
  return NextResponse.json({ lead });
}
