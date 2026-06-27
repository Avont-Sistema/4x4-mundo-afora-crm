import { NextRequest, NextResponse } from 'next/server';
import { isBotAuthed } from '@/lib/botAuth';
import { clientsStore, findClientByIdentity } from '@/lib/clientsStore';

export async function GET(request: NextRequest) {
  if (!isBotAuthed(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone') || undefined;
  const cpf   = searchParams.get('cpf')   || undefined;
  const email  = searchParams.get('email') || undefined;

  if (phone || cpf || email) {
    const client = await findClientByIdentity({ phone, cpf, email });
    return NextResponse.json({ client: client ?? null });
  }

  const clients = await clientsStore.all();
  return NextResponse.json({ clients });
}

export async function POST(request: NextRequest) {
  if (!isBotAuthed(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  if (!body.name) return NextResponse.json({ error: 'name é obrigatório' }, { status: 400 });

  const client = await clientsStore.create({
    name: body.name,
    phone: body.phone,
    whatsapp: body.whatsapp || body.phone,
    email: body.email,
    cpf: body.cpf,
    family: [],
    origin: 'whatsapp_bot',
    howFound: 'whatsapp',
    notes: body.notes,
  });

  return NextResponse.json({ client }, { status: 201 });
}
