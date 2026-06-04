import { NextRequest, NextResponse } from 'next/server';
import { createCharge } from '@/lib/payments';

// POST /api/payments/charge
// body: { clientName, phone, email, cpf, value, installments, billingType,
//         description, expeditionId, enrollmentId }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.value || Number(body.value) <= 0) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
    }
    const result = await createCharge({
      clientName: body.clientName || 'Cliente',
      phone: body.phone,
      email: body.email,
      cpf: body.cpf,
      value: Number(body.value),
      installments: body.installments ? Number(body.installments) : undefined,
      billingType: body.billingType,
      description: body.description,
      expeditionId: body.expeditionId,
      enrollmentId: body.enrollmentId,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('charge error:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao gerar cobrança' },
      { status: 500 }
    );
  }
}
