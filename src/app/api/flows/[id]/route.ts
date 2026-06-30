import { NextRequest, NextResponse } from 'next/server';
import { getFlow, updateFlow, deleteFlow } from '@/lib/flowsStore';

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const flow = await getFlow(id);
  if (!flow) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  return NextResponse.json({ flow });
}

export async function PUT(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const body = await req.json();
  const flow = await updateFlow(id, body);
  return NextResponse.json({ flow });
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  await deleteFlow(id);
  return NextResponse.json({ ok: true });
}
