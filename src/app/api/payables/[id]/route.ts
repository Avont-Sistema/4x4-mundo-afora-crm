import { NextRequest, NextResponse } from 'next/server';
import { payablesStore } from '@/lib/payablesStore';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const patch = await request.json();
    if (patch.amount !== undefined) patch.amount = Number(patch.amount);
    // ao marcar como pago, registra a data
    if (patch.status === 'pago' && !patch.paidAt) {
      patch.paidAt = new Date().toISOString().split('T')[0];
    }
    if (patch.status === 'pendente') patch.paidAt = undefined;
    const payable = payablesStore.update(id, patch);
    if (!payable) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }
    return NextResponse.json({ payable });
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
  const ok = payablesStore.remove(id);
  if (!ok) {
    return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
