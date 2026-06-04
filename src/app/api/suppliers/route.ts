import { NextRequest, NextResponse } from 'next/server';
import { suppliersStore, type SupplierType } from '@/lib/suppliersStore';

export async function GET() {
  return NextResponse.json({ suppliers: suppliersStore.all() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }
    const supplier = suppliersStore.create({
      name: body.name,
      type: (body.type as SupplierType) || 'outro',
      email: body.email,
      phone: body.phone,
      address: body.address,
      costPerPerson: Number(body.costPerPerson) || 0,
      costPerChild: Number(body.costPerChild) || 0,
      rating: Number(body.rating) || 0,
      notes: body.notes,
    });
    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao criar fornecedor' },
      { status: 500 }
    );
  }
}
