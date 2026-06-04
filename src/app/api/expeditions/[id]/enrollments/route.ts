import { NextRequest, NextResponse } from 'next/server';
import { expeditionsStore, buildExpeditionDetail } from '@/lib/expeditionsStore';
import { clientsStore, countParty } from '@/lib/clientsStore';

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

    if (exp.enrollments.some((e) => e.clientId === client.id && e.status !== 'cancelado')) {
      return NextResponse.json(
        { error: 'Cliente já está nesta expedição' },
        { status: 409 }
      );
    }

    // adultos/crianças: usa o informado ou calcula pela família do cliente
    const party = countParty(client);
    const adults = body.adults !== undefined ? Number(body.adults) : party.adults;
    const children = body.children !== undefined ? Number(body.children) : party.children;

    // valor acordado: usa o informado ou calcula pelo preço da expedição
    const agreedPrice =
      body.agreedPrice !== undefined
        ? Number(body.agreedPrice)
        : adults * exp.pricePerPerson + children * exp.pricePerChild;

    exp.enrollments.push({
      id: crypto.randomUUID(),
      clientId: client.id,
      clientName: client.name,
      adults,
      children,
      agreedPrice,
      payments: [],
      observations: body.observations || '',
      status: 'reservado',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expeditionsStore.touch(exp.id);

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
