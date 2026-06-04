import { NextRequest, NextResponse } from 'next/server';
import { suppliersStore } from '@/lib/suppliersStore';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const patch = await request.json();
    if (patch.costPerPerson !== undefined) patch.costPerPerson = Number(patch.costPerPerson);
    if (patch.costPerChild !== undefined) patch.costPerChild = Number(patch.costPerChild);
    if (patch.rating !== undefined) patch.rating = Number(patch.rating);
    const supplier = suppliersStore.update(id, patch);
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
  const ok = suppliersStore.remove(id);
  if (!ok) {
    return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
