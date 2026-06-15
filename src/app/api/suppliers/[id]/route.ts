import { NextRequest, NextResponse } from 'next/server';
import { suppliersStore } from '@/lib/suppliersStore';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const patch = await request.json();
    ['costPerPerson', 'costPerChild', 'costPerCar', 'costPerRoom', 'flatFee', 'rating'].forEach((k) => {
      if (patch[k] !== undefined) patch[k] = Number(patch[k]);
    });
    const supplier = await suppliersStore.update(id, patch);
    if (!supplier) {
      return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ supplier });
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
  const ok = await suppliersStore.remove(id);
  if (!ok) {
    return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
