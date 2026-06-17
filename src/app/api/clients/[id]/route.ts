import { NextRequest, NextResponse } from 'next/server';
import { clientsStore } from '@/lib/clientsStore';
import { buildClientDetail } from '@/lib/clientDetail';

// GET -> detalhe completo (cliente + expedições + pagamentos + atividades)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const detail = await buildClientDetail(id);
  if (!detail) {
    return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
  }
  return NextResponse.json({ detail });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const patch = await request.json();
    if (patch.weight !== undefined) patch.weight = patch.weight ? Number(patch.weight) : undefined;
    if (patch.height !== undefined) patch.height = patch.height ? Number(patch.height) : undefined;
    if (Array.isArray(patch.family)) {
      patch.family = patch.family.map((m: any) => ({
        id: m.id || crypto.randomUUID(),
        name: m.name || '',
        relation: m.relation || 'outro',
        birthDate: m.birthDate,
        document: m.document,
        job: m.job,
        isChild: Boolean(m.isChild),
        weight: m.weight ? Number(m.weight) : undefined,
        height: m.height ? Number(m.height) : undefined,
        shirtSize: m.shirtSize,
        priceCategory: m.priceCategory || undefined,
      }));
    }
    const client = await clientsStore.update(id, patch);
    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ client });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao atualizar' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = await clientsStore.remove(id);
  if (!ok) {
    return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
