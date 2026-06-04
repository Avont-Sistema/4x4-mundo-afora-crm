import { NextRequest, NextResponse } from 'next/server';
import { appendMessage } from '@/lib/conversationsStore';

const CONNECTOR_URL = process.env.WHATSAPP_CONNECTOR_URL || '';
const CONNECTOR_TOKEN = process.env.WHATSAPP_CONNECTOR_TOKEN || '';

// Envio manual pela equipe (handoff humano).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone: rawPhone } = await params;
    const phone = decodeURIComponent(rawPhone);
    const { text } = await request.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: 'text obrigatório' }, { status: 400 });
    }

    // entrega via conector (se configurado); em dev/simulador apenas registra
    let delivered = false;
    if (CONNECTOR_URL) {
      try {
        const res = await fetch(`${CONNECTOR_URL}/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-connector-token': CONNECTOR_TOKEN,
          },
          body: JSON.stringify({ phone, text }),
        });
        delivered = res.ok;
      } catch {
        delivered = false;
      }
    }

    const conv = appendMessage(phone, { role: 'assistant', content: text, via: 'human' });
    return NextResponse.json({ success: true, delivered, conversation: conv });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao enviar' },
      { status: 500 }
    );
  }
}
