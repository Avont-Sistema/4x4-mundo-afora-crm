import { NextRequest, NextResponse } from 'next/server';
import {
  getLeads,
  createLead,
  type LeadSource,
  type LeadStage,
  type HandledBy,
} from '@/lib/leadsStore';

// GET /api/leads?stage=&source=&handledBy=&q=
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const stage = searchParams.get('stage');
  const source = searchParams.get('source');
  const handledBy = searchParams.get('handledBy');
  const q = searchParams.get('q')?.toLowerCase();

  let leads = getLeads();

  if (stage) leads = leads.filter((l) => l.stage === stage);
  if (source) leads = leads.filter((l) => l.source === source);
  if (handledBy) leads = leads.filter((l) => l.handledBy === handledBy);
  if (q) {
    leads = leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        (l.phone || '').includes(q) ||
        (l.whatsapp || '').includes(q) ||
        (l.interest || '').toLowerCase().includes(q)
    );
  }

  return NextResponse.json({ leads });
}

// POST /api/leads  (cadastro manual pelo painel)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const lead = createLead({
      name: body.name,
      email: body.email,
      phone: body.phone,
      whatsapp: body.whatsapp,
      source: (body.source as LeadSource) || 'manual',
      stage: (body.stage as LeadStage) || 'novo',
      handledBy: (body.handledBy as HandledBy) || 'manual',
      interest: body.interest,
      value: body.value ? Number(body.value) : undefined,
      notes: body.notes,
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao criar lead' },
      { status: 500 }
    );
  }
}
