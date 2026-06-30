import { NextRequest, NextResponse } from 'next/server';
import { maskedView, updateIntegrations } from '@/lib/integrationsStore';

export async function GET() {
  return NextResponse.json({ integrations: await maskedView() });
}

export async function POST(request: NextRequest) {
  try {
    const patch = await request.json();
    const integrations = await updateIntegrations(patch);
    return NextResponse.json({ integrations });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao salvar integrações' },
      { status: 500 }
    );
  }
}
