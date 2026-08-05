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
    if (body.observations !== undefined) enr.observations = body.observations;
    if (body.status !== undefined) enr.status = body.status;
    if (body.agreedPrice !== undefined) enr.agreedPrice = Number(body.agreedPrice);
    if (body.adults !== undefined) enr.adults = Number(body.adults);
    if (body.children !== undefined) enr.children = Number(body.children);
    if (body.composition !== undefined) {
      enr.composition = {
        carType: body.composition.carType,
        secondCoupleSeparateSuite: Boolean(body.composition.secondCoupleSeparateSuite),
        extraChildUpTo5: Number(body.composition.extraChildUpTo5) || 0,
        extraChild5to10: Number(body.composition.extraChild5to10) || 0,
        extraAbove10: Number(body.composition.extraAbove10) || 0,
      };
    }
    enr.updatedAt = new Date().toISOString();
    await expeditionsStore.touch(exp.id);
    return NextResponse.json({ expedition: await buildExpeditionDetail(exp) });
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
  const before = exp.enrollments.length;
  exp.enrollments = exp.enrollments.filter((e) => e.id !== enrollmentId);
  if (exp.enrollments.length === before) {
    return NextResponse.json({ error: 'Matrícula não encontrada' }, { status: 404 });
  }
  await expeditionsStore.touch(exp.id);
  return NextResponse.json({ expedition: await buildExpeditionDetail(exp) });
}
