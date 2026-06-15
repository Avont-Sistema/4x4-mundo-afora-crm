import { NextRequest, NextResponse } from 'next/server';
import { expeditionsStore, buildExpeditionDetail } from '@/lib/expeditionsStore';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const exp = await expeditionsStore.get(id);
  if (!exp) {
    return NextResponse.json({ error: 'Expedição não encontrada' }, { status: 404 });
  }
  return NextResponse.json({ expedition: await buildExpeditionDetail(exp) });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const patch = await request.json();
    // sanitiza campos numéricos
    ['slots', 'pricePerPerson', 'pricePerChild', 'revenueGoal'].forEach((k) => {
      if (patch[k] !== undefined) patch[k] = Number(patch[k]);
    });
    const exp = await expeditionsStore.update(id, patch);
    if (!exp) {
      return NextResponse.json({ error: 'Expedição não encontrada' }, { status: 404 });
    }
    return NextResponse.json({ expedition: await buildExpeditionDetail(exp) });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao atualizar' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = await expeditionsStore.remove(id);
  if (!ok) {
    return NextResponse.json({ error: 'Expedição não encontrada' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
