import { NextRequest, NextResponse } from 'next/server';
import { expeditionsStore, buildExpeditionDetail } from '@/lib/expeditionsStore';

// POST -> lançar pagamento manual para um cliente
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; enrollmentId: string }> }
) {
  try {
    const { id, enrollmentId } = await params;
    const exp = expeditionsStore.get(id);
    if (!exp) {
      return NextResponse.json({ error: 'Expedição não encontrada' }, { status: 404 });
    }
    const enr = exp.enrollments.find((e) => e.id === enrollmentId);
    if (!enr) {
      return NextResponse.json({ error: 'Matrícula não encontrada' }, { status: 404 });
    }
    const body = await request.json();
    const amount = Number(body.amount);
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
    }
    enr.payments.push({
      id: crypto.randomUUID(),
      date: body.date || new Date().toISOString().split('T')[0],
      amount,
      method: body.method || 'pix',
      description: body.description,
    });
    // confirma a matrícula automaticamente ao primeiro pagamento
    if (enr.status === 'reservado') enr.status = 'confirmado';
    enr.updatedAt = new Date().toISOString();
    expeditionsStore.touch(exp.id);
    return NextResponse.json(
      { expedition: buildExpeditionDetail(exp) },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao lançar pagamento' },
      { status: 500 }
    );
  }
}

// DELETE ?paymentId=  -> estornar/remover um pagamento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; enrollmentId: string }> }
) {
  const { id, enrollmentId } = await params;
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get('paymentId');
  const exp = expeditionsStore.get(id);
  if (!exp) {
    return NextResponse.json({ error: 'Expedição não encontrada' }, { status: 404 });
  }
  const enr = exp.enrollments.find((e) => e.id === enrollmentId);
  if (!enr) {
    return NextResponse.json({ error: 'Matrícula não encontrada' }, { status: 404 });
  }
  enr.payments = enr.payments.filter((p) => p.id !== paymentId);
  enr.updatedAt = new Date().toISOString();
  expeditionsStore.touch(exp.id);
  return NextResponse.json({ expedition: buildExpeditionDetail(exp) });
}
