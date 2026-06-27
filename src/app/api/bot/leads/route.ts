import { NextRequest, NextResponse } from 'next/server';
import { isBotAuthed } from '@/lib/botAuth';
import { getLeads, upsertLeadFromContact, type LeadSource } from '@/lib/leadsStore';

export async function GET(request: NextRequest) {
  if (!isBotAuthed(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const leads = await getLeads();
  return NextResponse.json({ leads });
}

export async function POST(request: NextRequest) {
  if (!isBotAuthed(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  if (!body.name) return NextResponse.json({ error: 'name é obrigatório' }, { status: 400 });

  const { lead, created } = await upsertLeadFromContact({
    name: body.name,
    phone: body.phone,
    whatsapp: body.whatsapp || body.phone,
    email: body.email,
    source: (body.source as LeadSource) || 'whatsapp',
    stage: body.stage || 'novo',
    handledBy: 'ia',
    interest: body.interest,
    notes: body.notes,
    lastMessage: body.lastMessage,
  });

  return NextResponse.json({ lead, created }, { status: created ? 201 : 200 });
}
