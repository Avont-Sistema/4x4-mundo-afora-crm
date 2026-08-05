import { NextRequest, NextResponse } from 'next/server';
import {
  expeditionsStore,
  buildExpeditionDetail,
  enrollClient,
  type CarComposition,
} from '@/lib/expeditionsStore';
import { clientsStore } from '@/lib/clientsStore';

// POST /api/expeditions/:id/enrollments  -> adiciona um cliente ao projeto
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const exp = await expeditionsStore.get(id);
    if (!exp) {
      return NextResponse.json({ error: 'Expedição não encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const client = await clientsStore.get(body.clientId);
    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const composition: Partial<CarComposition> | undefined = body.composition
      ? {
          carType: body.composition.carType,
          secondCoupleSeparateSuite: Boolean(body.composition.secondCoupleSeparateSuite),
          extraChildUpTo5: Number(body.composition.extraChildUpTo5) || 0,
          extraChild5to10: Number(body.composition.extraChild5to10) || 0,
          extraAbove10: Number(body.composition.extraAbove10) || 0,
        }
      : undefined;

    const result = await enrollClient(exp, client, {
      composition,
      agreedPrice: body.agreedPrice !== undefined ? Number(body.agreedPrice) : undefined,
      observations: body.observations,
    });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json(
      { expedition: await buildExpeditionDetail(exp) },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao adicionar cliente' },
      { status: 500 }
    );
  }
}
