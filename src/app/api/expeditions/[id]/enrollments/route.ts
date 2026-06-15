import { NextRequest, NextResponse } from 'next/server';
import { expeditionsStore, buildExpeditionDetail, enrollClient } from '@/lib/expeditionsStore';
import { clientsStore } from '@/lib/clientsStore';

// POST /api/expeditions/:id/enrollments  -> adiciona um cliente ao projeto
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const exp = expeditionsStore.get(id);
    if (!exp) {
      return NextResponse.json({ error: 'Expedição não encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const client = clientsStore.get(body.clientId);
    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const result = enrollClient(exp, client, {
      adults: body.adults !== undefined ? Number(body.adults) : undefined,
      children: body.children !== undefined ? Number(body.children) : undefined,
      agreedPrice: body.agreedPrice !== undefined ? Number(body.agreedPrice) : undefined,
      observations: body.observations,
    });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json(
      { expedition: buildExpeditionDetail(exp) },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao adicionar cliente' },
      { status: 500 }
    );
  }
}
