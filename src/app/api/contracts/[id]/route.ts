import { NextRequest, NextResponse } from 'next/server';
import { contractsStore } from '@/lib/contractsStore';

// GET /api/contracts/:id -> contrato completo (inclui termo e rubrica) para gerar o PDF.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const contract = await contractsStore.get(id);
  if (!contract) {
    return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });
  }
  return NextResponse.json({ contract });
}
