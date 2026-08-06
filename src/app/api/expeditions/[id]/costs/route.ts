import { NextRequest, NextResponse } from 'next/server';
import { expeditionsStore, buildExpeditionDetail } from '@/lib/expeditionsStore';

// POST -> lançar custo avulso no projeto
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const exp = await expeditionsStore.get(id);
    if (!exp) {
      return NextResponse.json({ error: 'Expedição não encontrada' }, { status: 404 });
    }
    const body = await request.json();
    const amount = Number(body.amount);
    if (!body.label || !amount) {
      return NextResponse.json(
        { error: 'Descrição e valor são obrigatórios' },
        { status: 400 }
      );
    }
    const updated = await expeditionsStore.touchWith(id, (fresh) => {
      fresh.manualCosts.push({
        id: crypto.randomUUID(),
        label: body.label,
        amount,
        date: body.date || new Date().toISOString().split('T')[0],
      });
    });
    if (!updated) {
      return NextResponse.json({ error: 'Expedição não encontrada' }, { status: 404 });
    }
    return NextResponse.json(
      { expedition: await buildExpeditionDetail(updated) },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao lançar custo' },
      { status: 500 }
    );
  }
}

// DELETE ?costId=  -> remover custo avulso
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const costId = searchParams.get('costId');
  const updated = await expeditionsStore.touchWith(id, (fresh) => {
    fresh.manualCosts = fresh.manualCosts.filter((c) => c.id !== costId);
  });
  if (!updated) {
    return NextResponse.json({ error: 'Expedição não encontrada' }, { status: 404 });
  }
  return NextResponse.json({ expedition: await buildExpeditionDetail(updated) });
}
