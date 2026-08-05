import { NextRequest, NextResponse } from 'next/server';
import { clientsStore, type FamilyMember } from '@/lib/clientsStore';
import { expeditionsStore } from '@/lib/expeditionsStore';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.toLowerCase();
  let clients = await clientsStore.all();
  if (q) {
    clients = clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        (c.cpf || '').includes(q)
    );
  }

  // Para cada cliente: última expedição (ou a que está em andamento agora,
  // sinalizada como "ao vivo") + lista de expedições para permitir filtrar.
  const expeditions = await expeditionsStore.all();
  type Candidate = { id: string; name: string; startDate?: string; isLive: boolean };
  const byClient = new Map<string, Candidate[]>();
  for (const exp of expeditions) {
    for (const enr of exp.enrollments) {
      if (enr.status === 'cancelado') continue;
      const list = byClient.get(enr.clientId) || [];
      list.push({
        id: exp.id,
        name: exp.routeName,
        startDate: exp.startDate,
        isLive: exp.status === 'em_andamento',
      });
      byClient.set(enr.clientId, list);
    }
  }

  const clientsWithExpeditions = clients.map((c) => {
    const candidates = byClient.get(c.id) || [];
    const live = candidates.find((x) => x.isLive);
    let lastExpedition: { id: string; name: string; isLive: boolean } | null = null;
    if (live) {
      lastExpedition = { id: live.id, name: live.name, isLive: true };
    } else if (candidates.length > 0) {
      const sorted = [...candidates].sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
      lastExpedition = { id: sorted[0].id, name: sorted[0].name, isLive: false };
    }
    return {
      ...c,
      lastExpedition,
      expeditionIds: candidates.map((x) => x.id),
    };
  });

  return NextResponse.json({ clients: clientsWithExpeditions });
}

function normalizeFamily(family: any[]): FamilyMember[] {
  if (!Array.isArray(family)) return [];
  return family.map((m) => ({
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }
    const client = await clientsStore.create({
      name: body.name,
      email: body.email,
      phone: body.phone,
      whatsapp: body.whatsapp || body.phone,
      cpf: body.cpf,
      birthDate: body.birthDate,
      address: body.address,
      addressNumber: body.addressNumber,
      neighborhood: body.neighborhood,
      cep: body.cep,
      city: body.city,
      state: body.state,
      job: body.job,
      company: body.company,
      weight: body.weight ? Number(body.weight) : undefined,
      height: body.height ? Number(body.height) : undefined,
      shirtSizes: body.shirtSizes,
      roomConfig: body.roomConfig,
      priceCategory: body.priceCategory || undefined,
      emergencyContact: body.emergencyContact,
      petInfo: body.petInfo,
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
