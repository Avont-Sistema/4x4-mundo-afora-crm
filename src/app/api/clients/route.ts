import { NextRequest, NextResponse } from 'next/server';
import { clientsStore, type FamilyMember } from '@/lib/clientsStore';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.toLowerCase();
  let clients = clientsStore.all();
  if (q) {
    clients = clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        (c.cpf || '').includes(q)
    );
  }
  return NextResponse.json({ clients });
}

function normalizeFamily(family: any[]): FamilyMember[] {
  if (!Array.isArray(family)) return [];
  return family.map((m) => ({
    id: m.id || crypto.randomUUID(),
    name: m.name || '',
    relation: m.relation || 'outro',
    birthDate: m.birthDate,
    document: m.document,
    isChild: Boolean(m.isChild),
    weight: m.weight ? Number(m.weight) : undefined,
    height: m.height ? Number(m.height) : undefined,
  }));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }
    const client = clientsStore.create({
      name: body.name,
      email: body.email,
      phone: body.phone,
      whatsapp: body.whatsapp || body.phone,
      cpf: body.cpf,
      birthDate: body.birthDate,
      address: body.address,
      city: body.city,
      state: body.state,
      job: body.job,
      company: body.company,
      weight: body.weight ? Number(body.weight) : undefined,
      height: body.height ? Number(body.height) : undefined,
      family: normalizeFamily(body.family),
      vehicle: body.vehicle,
      notes: body.notes,
      origin: body.origin || 'manual',
    });
    return NextResponse.json({ client }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao criar cliente' },
      { status: 500 }
    );
  }
}
