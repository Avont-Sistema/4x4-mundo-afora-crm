// Cliente da API Asaas (PIX taxa fixa baixa, cartão à vista/parcelado, boleto).
// Docs: https://docs.asaas.com
import { resolve } from '@/lib/integrationsStore';

async function apiKey() {
  return (await resolve()).asaasApiKey;
}
async function baseUrl() {
  return (await resolve()).asaasEnv === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://api-sandbox.asaas.com/v3';
}

export const isAsaasEnabled = async () => Boolean(await apiKey());

async function asaas(path: string, init?: RequestInit) {
  const [key, base] = await Promise.all([apiKey(), baseUrl()]);
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      access_token: key,
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.errors?.[0]?.description || `Asaas ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export interface AsaasCustomer {
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  externalReference?: string;
}

export async function createCustomer(c: AsaasCustomer): Promise<string> {
  // tenta reaproveitar por externalReference (telefone)
  if (c.externalReference) {
    const found = await asaas(
      `/customers?externalReference=${encodeURIComponent(c.externalReference)}`
    ).catch(() => null);
    if (found?.data?.[0]?.id) return found.data[0].id;
  }
  const created = await asaas('/customers', {
    method: 'POST',
    body: JSON.stringify(c),
  });
  return created.id;
}

export type BillingType = 'PIX' | 'CREDIT_CARD' | 'BOLETO' | 'UNDEFINED';

export interface CreatePaymentInput {
  customerId: string;
  value: number; // valor total
  description?: string;
  externalReference?: string;
  billingType?: BillingType; // UNDEFINED = cliente escolhe na página
  installmentCount?: number; // > 1 = parcelado
  dueDate?: string; // YYYY-MM-DD
}

export interface AsaasPayment {
  id: string;
  invoiceUrl: string;
  value: number;
  installmentCount?: number;
  pix?: { payload?: string; encodedImage?: string };
}

export async function createPayment(
  input: CreatePaymentInput
): Promise<AsaasPayment> {
  const due =
    input.dueDate ||
    new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

  const body: Record<string, unknown> = {
    customer: input.customerId,
    billingType: input.billingType || 'UNDEFINED',
    description: input.description,
    externalReference: input.externalReference,
    dueDate: due,
  };

  if (input.installmentCount && input.installmentCount > 1) {
    body.installmentCount = input.installmentCount;
    body.totalValue = input.value;
  } else {
    body.value = input.value;
  }

  const payment = await asaas('/payments', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  // busca o QR PIX (quando aplicável)
  let pix;
  try {
    pix = await asaas(`/payments/${payment.id}/pixQrCode`);
  } catch {
    pix = undefined;
  }

  return {
    id: payment.id,
    invoiceUrl: payment.invoiceUrl,
    value: payment.value || input.value,
    installmentCount: payment.installmentCount,
    pix: pix ? { payload: pix.payload, encodedImage: pix.encodedImage } : undefined,
  };
}
