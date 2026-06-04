import { NextRequest, NextResponse } from 'next/server';
import { appendMessage } from '@/lib/conversationsStore';
import { resolve } from '@/lib/integrationsStore';

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
    const { whatsappConnectorUrl, whatsappConnectorToken } = resolve();
    let delivered = false;
    if (whatsappConnectorUrl) {
      try {
        const res = await fetch(`${whatsappConnectorUrl}/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-connector-token': whatsappConnectorToken,
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
