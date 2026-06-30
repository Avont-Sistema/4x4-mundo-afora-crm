import { NextRequest, NextResponse } from 'next/server';
import { processInbound } from '@/lib/agent/inbound';
import { resolve } from '@/lib/integrationsStore';

/**
 * Endpoint canônico que o conector de WhatsApp (Baileys / Meta Cloud API) chama
 * para cada mensagem recebida. Protegido por token.
 *
 * Body: { "phone": "55...@s.whatsapp.net", "text": "...", "contactName": "..." }
 * Resposta: { "reply": "...", "mode": "bot" }  // reply=null => não enviar nada
 */
export async function POST(request: NextRequest) {
  try {
    const TOKEN = (await resolve()).whatsappConnectorToken;
    if (TOKEN) {
      const t = request.headers.get('x-connector-token');
      if (t !== TOKEN) {
        return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
      }
    }
    const body = await request.json();
    const { phone, text, contactName } = body;
    if (!phone || !text) {
      return NextResponse.json({ error: 'phone e text são obrigatórios' }, { status: 400 });
    }
    const result = await processInbound(phone, text, contactName);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('WhatsApp inbound error:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao processar' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'whatsapp inbound online' });
}
