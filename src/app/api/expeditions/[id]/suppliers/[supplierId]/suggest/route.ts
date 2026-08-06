import { NextResponse } from 'next/server';
import { expeditionsStore } from '@/lib/expeditionsStore';
import { suppliersStore } from '@/lib/suppliersStore';
import { suggestSupplierQuantities } from '@/lib/supplierExport';

// GET /api/expeditions/:id/suppliers/:supplierId/suggest
//   -> quantidades sugeridas por categoria a partir das matrículas ativas
//   (ponto de partida editável, não grava nada)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; supplierId: string }> }
) {
  const { id, supplierId } = await params;
  const exp = await expeditionsStore.get(id);
  if (!exp) {
    return NextResponse.json({ error: 'Expedição não encontrada' }, { status: 404 });
  }
  const supplier = await suppliersStore.get(supplierId);
  if (!supplier) {
    return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 });
  }
  const suggested = await suggestSupplierQuantities(exp, supplier);
  return NextResponse.json({ suggested });
}
