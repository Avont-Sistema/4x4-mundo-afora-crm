import { NextRequest, NextResponse } from 'next/server';
import { expeditionsStore } from '@/lib/expeditionsStore';
import { suppliersStore } from '@/lib/suppliersStore';
import { buildSupplierCSV } from '@/lib/supplierExport';

// GET /api/expeditions/:id/export?supplierId=xxx
// Gera o CSV (planilha) daquele fornecedor para download.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const supplierId = searchParams.get('supplierId');

  const exp = await expeditionsStore.get(id);
  if (!exp) {
    return NextResponse.json({ error: 'Expedição não encontrada' }, { status: 404 });
  }
  if (!supplierId) {
    return NextResponse.json({ error: 'supplierId é obrigatório' }, { status: 400 });
  }
  const supplier = await suppliersStore.get(supplierId);
  if (!supplier) {
    return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 });
  }

  const { csv, filename } = await buildSupplierCSV(exp, supplier);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
