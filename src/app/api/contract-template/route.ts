import { NextRequest, NextResponse } from 'next/server';
import { getTermTemplate, saveTermTemplate } from '@/lib/contractsStore';
import { TERM_VERSION } from '@/lib/imageRightsTerm';

// GET /api/contract-template -> template editável do termo + cidade de assinatura.
export async function GET() {
  const tpl = await getTermTemplate();
  return NextResponse.json({ ...tpl, version: TERM_VERSION });
}

// POST /api/contract-template -> salva alterações do termo.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const saved = await saveTermTemplate({
      template: typeof body.template === 'string' ? body.template : undefined,
      signCity: typeof body.signCity === 'string' ? body.signCity : undefined,
    });
    return NextResponse.json({ ok: true, ...saved });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao salvar termo' },
      { status: 500 }
    );
  }
}
