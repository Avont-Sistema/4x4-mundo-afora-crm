import { NextRequest, NextResponse } from 'next/server';
import { listFlows, createFlow } from '@/lib/flowsStore';

export async function GET() {
  const flows = await listFlows();
  return NextResponse.json({ flows });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const flow = await createFlow(body);
  return NextResponse.json({ flow }, { status: 201 });
}
