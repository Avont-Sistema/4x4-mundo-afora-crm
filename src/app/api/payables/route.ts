import { NextRequest, NextResponse } from 'next/server';
import { payablesStore, type PayableType } from '@/lib/payablesStore';

export async function GET() {
  return NextResponse.json({ payables: await payablesStore.all() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.description || !body.amount) {
      return NextResponse.json(
        { error: 'Descrição e valor são obrigatórios' },
        { status: 400 }
      );
    }
    const payable = await payablesStore.create({
      description: body.description,
      amount: Number(body.amount),
      type: (body.type as PayableType) || 'despesa',
      status: body.status === 'pago' ? 'pago' : 'pendente',
      dueDate: body.dueDate,
      paidAt: body.status === 'pago' ? body.paidAt || new Date().toISOString().split('T')[0] : undefined,
      expeditionId: body.expeditionId,
      expeditionName: body.expeditionName,
      supplierId: body.supplierId,
      supplierName: body.supplierName,
      category: body.category,
    });
    return NextResponse.json({ payable }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao criar conta' },
      { status: 500 }
    );
  }
}
