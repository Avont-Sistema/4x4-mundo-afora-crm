import { NextRequest, NextResponse } from 'next/server';
import { recordConfirmedPayment } from '@/lib/payments';

// Webhook do Asaas. Configure em: Asaas → Integrações → Webhooks
// URL: https://<seu-dominio>/api/payments/asaas/webhook
// Opcional: defina ASAAS_WEBHOOK_TOKEN e o header "asaas-access-token".
const TOKEN = process.env.ASAAS_WEBHOOK_TOKEN || '';

export async function POST(request: NextRequest) {
  try {
    if (TOKEN) {
      const t = request.headers.get('asaas-access-token');
      if (t !== TOKEN) {
        return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
      }
    }

    const body = await request.json();
    const event = body.event as string;
    const payment = body.payment;

    // Confirma quando o dinheiro entra de fato
    if (
      payment &&
      (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED')
    ) {
      const result = recordConfirmedPayment(
        payment.externalReference,
        Number(payment.value) || 0,
        (payment.billingType || 'asaas').toLowerCase()
      );
      console.log('[asaas] pagamento confirmado', {
        ref: payment.externalReference,
        registrado: result.ok,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Asaas webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'asaas webhook online' });
}
