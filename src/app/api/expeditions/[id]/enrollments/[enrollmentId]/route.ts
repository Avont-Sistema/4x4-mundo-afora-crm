import { NextRequest, NextResponse } from 'next/server';
import { expeditionsStore, buildExpeditionDetail } from '@/lib/expeditionsStore';

// PATCH -> editar matrícula (observações, status, valor, adultos/crianças)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; enrollmentId: string }> }
) {
  try {
    const { id, enrollmentId } = await params;
    const exp = await expeditionsStore.get(id);
    if (!exp) {
      return NextResponse.json({ error: 'Expedição não encontrada' }, { status: 404 });
    }
    const enr = exp.enrollments.find((e) => e.id === enrollmentId);
    if (!enr) {
      return NextResponse.json({ error: 'Matrícula não encontrada' }, { status: 404 });
    }
    const body = await request.json();
    const updated = await expeditionsStore.touchWith(id, (fresh) => {
      const freshEnr = fresh.enrollments.find((e) => e.id === enrollmentId);
      if (!freshEnr) return;
      if (body.observations !== undefined) freshEnr.observations = body.observations;
      if (body.status !== undefined) freshEnr.status = body.status;
      if (body.agreedPrice !== undefined) freshEnr.agreedPrice = Number(body.agreedPrice);
      if (body.adults !== undefined) freshEnr.adults = Number(body.adults);
      if (body.children !== undefined) freshEnr.children = Number(body.children);
      if (body.composition !== undefined) {
        freshEnr.composition = {
          carType: body.composition.carType,
          secondCoupleSeparateSuite: Boolean(body.composition.secondCoupleSeparateSuite),
          extraChildUpTo5: Number(body.composition.extraChildUpTo5) || 0,
          extraChild5to10: Number(body.composition.extraChild5to10) || 0,
          extraAbove10: Number(body.composition.extraAbove10) || 0,
        };
      }
    });
    if (!updated) {
      return NextResponse.json({ error: 'Expedição não encontrada' }, { status: 404 });
    }
    return NextResponse.json({ expedition: await buildExpeditionDetail(updated) });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao atualizar matrícula' },
      { status: 500 }
    );
  }
}

// DELETE -> remover cliente do projeto
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; enrollmentId: string }> }
) {
  const { id, enrollmentId } = await params;
  const exp = await expeditionsStore.get(id);
  if (!exp) {
    return NextResponse.json({ error: 'Expedição não encontrada' }, { status: 404 });
  }
  if (!exp.enrollments.some((e) => e.id === enrollmentId)) {
    return NextResponse.json({ error: 'Matrícula não encontrada' }, { status: 404 });
  }
  const updated = await expeditionsStore.touchWith(id, (fresh) => {
    fresh.enrollments = fresh.enrollments.filter((e) => e.id !== enrollmentId);
  });
  if (!updated) {
    return NextResponse.json({ error: 'Expedição não encontrada' }, { status: 404 });
  }
  return NextResponse.json({ expedition: await buildExpeditionDetail(updated) });
}
