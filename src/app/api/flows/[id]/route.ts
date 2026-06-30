import { NextRequest, NextResponse } from 'next/server';
import { getFlow, updateFlow, deleteFlow } from '@/lib/flowsStore';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const flow = await getFlow(params.id);
  if (!flow) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  return NextResponse.json({ flow });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const flow = await updateFlow(params.id, body);
  return NextResponse.json({ flow });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await deleteFlow(params.id);
  return NextResponse.json({ ok: true });
}
