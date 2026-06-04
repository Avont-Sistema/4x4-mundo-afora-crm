import { NextRequest, NextResponse } from 'next/server';
import { maskedView, updateIntegrations } from '@/lib/integrationsStore';

export async function GET() {
  return NextResponse.json({ integrations: maskedView() });
}

export async function POST(request: NextRequest) {
  try {
    const patch = await request.json();
    const integrations = updateIntegrations(patch);
    return NextResponse.json({ integrations });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao salvar integrações' },
      { status: 500 }
    );
  }
}
