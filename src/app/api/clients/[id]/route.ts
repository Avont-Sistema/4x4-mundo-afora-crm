import { NextRequest, NextResponse } from 'next/server';
import { clientsStore } from '@/lib/clientsStore';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = clientsStore.get(id);
  if (!client) {
    return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
  }
  return NextResponse.json({ client });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const patch = await request.json();
    if (Array.isArray(patch.family)) {
      patch.family = patch.family.map((m: any) => ({
        id: m.id || crypto.randomUUID(),
        name: m.name || '',
        relation: m.relation || 'outro',
        birthDate: m.birthDate,
        document: m.document,
        isChild: Boolean(m.isChild),
      }));
    }
    const client = clientsStore.update(id, patch);
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
  const ok = clientsStore.remove(id);
  if (!ok) {
    return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
