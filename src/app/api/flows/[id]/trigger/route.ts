import { NextRequest, NextResponse } from 'next/server';
import { triggerFlow } from '@/lib/flowsStore';

type Params = Promise<{ id: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const { phone, vars } = await req.json();
  if (!phone) return NextResponse.json({ error: 'phone obrigatório' }, { status: 400 });
  const run = await triggerFlow(id, phone, vars || {});
  if (!run) return NextResponse.json({ error: 'Flow não encontrado ou inativo' }, { status: 404 });
  return NextResponse.json({ run });
}
