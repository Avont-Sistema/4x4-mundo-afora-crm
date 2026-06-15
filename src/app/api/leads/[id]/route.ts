import { NextRequest, NextResponse } from 'next/server';
import { getLead, updateLead, deleteLead } from '@/lib/leadsStore';

// GET /api/leads/:id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) {
    return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
  }
  return NextResponse.json({ lead });
}

// PATCH /api/leads/:id  (mover estágio, trocar atendimento, editar campos)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const patch = await request.json();
    const lead = await updateLead(id, patch);
    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ lead });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao atualizar lead' },
      { status: 500 }
    );
  }
}

// DELETE /api/leads/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = await deleteLead(id);
  if (!ok) {
    return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
