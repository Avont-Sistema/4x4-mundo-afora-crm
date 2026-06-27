import { NextRequest, NextResponse } from 'next/server';
import { isBotAuthed } from '@/lib/botAuth';
import { expeditionsStore, enrollClient } from '@/lib/expeditionsStore';
import { clientsStore } from '@/lib/clientsStore';

export async function POST(request: NextRequest) {
  if (!isBotAuthed(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { expeditionId, clientId, adults = 1, children = 0, observations } = await request.json();
  if (!expeditionId || !clientId)
    return NextResponse.json({ error: 'expeditionId e clientId são obrigatórios' }, { status: 400 });

  const [exp, client] = await Promise.all([
    expeditionsStore.get(expeditionId),
    clientsStore.get(clientId),
  ]);

  if (!exp)    return NextResponse.json({ error: 'Expedição não encontrada' }, { status: 404 });
  if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });

  const result = await enrollClient(exp, client, { adults, children, observations });
  return NextResponse.json(result);
}
