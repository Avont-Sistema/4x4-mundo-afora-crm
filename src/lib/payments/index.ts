import QRCode from 'qrcode';
import {
  isAsaasEnabled,
  createCustomer,
  createPayment,
  type BillingType,
} from './asaas';
import { buildPixPayload } from './pix';
import { expeditionsStore } from '@/lib/expeditionsStore';
import { clientsStore } from '@/lib/clientsStore';
import { upsertLeadFromContact } from '@/lib/leadsStore';
import { resolve } from '@/lib/integrationsStore';

export interface ChargeInput {
  clientName: string;
  phone?: string;
  email?: string;
  cpf?: string;
  value: number;
  installments?: number;
  billingType?: BillingType;
  description?: string;
  expeditionId?: string;
  enrollmentId?: string;
}

export interface ChargeResult {
  provider: 'asaas' | 'pix' | 'none';
  url?: string; // página de pagamento (Asaas: PIX/cartão/parcelado)
  pixPayload?: string; // copia e cola
  qrDataUrl?: string; // imagem do QR
  value: number;
  installments?: number;
  message?: string;
}

function buildExternalRef(input: ChargeInput): string {
  if (input.enrollmentId) return `enrollment:${input.enrollmentId}`;
  return `lead:${input.phone || ''}|exp:${input.expeditionId || ''}`;
}

export async function createCharge(input: ChargeInput): Promise<ChargeResult> {
  // Asaas exige CPF/CNPJ. Com chave + CPF => fluxo completo (PIX/cartão/parcelado, auto-confirma).
  if ((await isAsaasEnabled()) && input.cpf) {
    const customerId = await createCustomer({
      name: input.clientName,
      cpfCnpj: input.cpf.replace(/\D/g, ''),
      email: input.email,
      mobilePhone: (input.phone || '').replace(/\D/g, '') || undefined,
      externalReference: input.phone || undefined,
    });
    const payment = await createPayment({
      customerId,
      value: input.value,
      description: input.description,
      externalReference: buildExternalRef(input),
      billingType: input.billingType || 'UNDEFINED',
      installmentCount: input.installments,
    });
    return {
      provider: 'asaas',
      url: payment.invoiceUrl,
      pixPayload: payment.pix?.payload,
      qrDataUrl: payment.pix?.encodedImage
        ? `data:image/png;base64,${payment.pix.encodedImage}`
        : undefined,
      value: input.value,
      installments: input.installments,
    };
  }

  // Fallback grátis: PIX copia-e-cola com a sua chave (confirmação manual)
  const r = await resolve();
  if (r.pixKey) {
    const payload = buildPixPayload({
      key: r.pixKey,
      merchantName: r.pixMerchantName,
      merchantCity: r.pixMerchantCity,
      amount: input.value,
      description: input.description,
    });
    const qrDataUrl = await QRCode.toDataURL(payload);
    return {
      provider: 'pix',
      pixPayload: payload,
      qrDataUrl,
      value: input.value,
      message:
        input.installments && input.installments > 1
          ? 'Parcelamento e cartão requerem Asaas; gerei PIX à vista.'
          : undefined,
    };
  }

  return {
    provider: 'none',
    value: input.value,
    message: 'Pagamento não configurado. Defina PIX_KEY (grátis) ou ASAAS_API_KEY.',
  };
}

// Chamado pelo webhook do Asaas quando o pagamento é confirmado.
export async function recordConfirmedPayment(
  externalReference: string,
  amount: number,
  method = 'pix'
): Promise<{ ok: boolean }> {
  if (!externalReference) return { ok: false };

  // Caso 1: pagamento ligado a uma matrícula existente
  if (externalReference.startsWith('enrollment:')) {
    const enrId = externalReference.split(':')[1];
    for (const exp of await expeditionsStore.all()) {
      const enr = exp.enrollments.find((e) => e.id === enrId);
      if (enr) {
        enr.payments.push({
          id: crypto.randomUUID(),
          date: new Date().toISOString().split('T')[0],
          amount,
          method,
          description: 'Pagamento confirmado automaticamente',
        });
        enr.status = 'confirmado';
        enr.updatedAt = new Date().toISOString();
        await expeditionsStore.touch(exp.id);
        return { ok: true };
      }
    }
    return { ok: false };
  }

  // Caso 2: pagamento iniciado pelo bot (lead:<phone>|exp:<expId>)
  const m = externalReference.match(/^lead:([^|]*)\|exp:(.*)$/);
  if (m) {
    const phone = m[1];
    const expId = m[2];
    const exp = expId ? await expeditionsStore.get(expId) : undefined;
    if (!exp) return { ok: false };

    const n = phone.replace(/\D/g, '');
    let client = (await clientsStore.all()).find(
      (c) => (c.phone || '').replace(/\D/g, '') === n
    );
    if (!client) {
      client = await clientsStore.create({
        name: phone || 'Cliente WhatsApp',
        phone,
        whatsapp: phone,
        family: [],
        origin: 'whatsapp_bot',
      });
    }
    await upsertLeadFromContact({ name: client.name, phone, source: 'whatsapp', stage: 'finalizado' });

    let enr = exp.enrollments.find(
      (e) => e.clientId === client!.id && e.status !== 'cancelado'
    );
    if (!enr) {
      enr = {
        id: crypto.randomUUID(),
        clientId: client.id,
        clientName: client.name,
        adults: 1,
        children: 0,
        agreedPrice: amount,
        payments: [],
        observations: 'Matriculado via pagamento confirmado (Asaas)',
        status: 'confirmado',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      exp.enrollments.push(enr);
    }
    enr.payments.push({
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      amount,
      method,
      description: 'Pagamento confirmado automaticamente',
    });
    enr.status = 'confirmado';
    enr.updatedAt = new Date().toISOString();
    await expeditionsStore.touch(exp.id);
    return { ok: true };
  }

  return { ok: false };
}
