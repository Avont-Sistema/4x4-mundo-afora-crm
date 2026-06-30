import { NextRequest, NextResponse } from 'next/server';
import {
  upsertLeadFromContact,
  type LeadSource,
  type CreateLeadInput,
} from '@/lib/leadsStore';
import { resolve } from '@/lib/integrationsStore';

/**
 * Webhook unificado de captação de leads.
 *
 * Uso:
 *   POST /api/leads/webhook?source=google_ads
 *   POST /api/leads/webhook?source=meta_ads
 *   POST /api/leads/webhook?source=whatsapp
 *
 * Aceita 3 formatos de payload e normaliza todos para um Lead:
 *
 * 1) Normalizado (qualquer integração / teste):
 *    { "name": "...", "email": "...", "phone": "...", "interest": "...", "value": 0 }
 *
 * 2) Meta Lead Ads (campo field_data):
 *    { "field_data": [ { "name": "full_name", "values": ["..."] }, ... ] }
 *
 * 3) Google Ads Lead Form (campo user_column_data):
 *    { "user_column_data": [ { "column_id": "FULL_NAME", "string_value": "..." }, ... ] }
 */

// Token de verificação (configurável em Configurações → Integrações).
// Envie o mesmo valor no header "x-webhook-token" a partir da plataforma de anúncios.
const token = async () => (await resolve()).leadsWebhookToken;

function parseMetaLeadAds(body: any): Partial<CreateLeadInput> {
  const out: Partial<CreateLeadInput> = {};
  const fields: any[] = body.field_data || [];
  for (const f of fields) {
    const key = (f.name || '').toLowerCase();
    const value = Array.isArray(f.values) ? f.values[0] : f.value;
    if (!value) continue;
    if (key.includes('name')) out.name = value;
    else if (key.includes('email')) out.email = value;
    else if (key.includes('phone')) out.phone = value;
    else if (key.includes('city') || key.includes('interest')) out.interest = value;
  }
  return out;
}

function parseGoogleLeadForm(body: any): Partial<CreateLeadInput> {
  const out: Partial<CreateLeadInput> = {};
  const cols: any[] = body.user_column_data || [];
  for (const c of cols) {
    const key = (c.column_id || '').toUpperCase();
    const value = c.string_value;
    if (!value) continue;
    if (key === 'FULL_NAME' || key === 'NAME') out.name = value;
    else if (key === 'EMAIL') out.email = value;
    else if (key === 'PHONE_NUMBER' || key === 'PHONE') out.phone = value;
    else if (key === 'CITY' || key === 'POSTAL_CODE') out.interest = value;
  }
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = (searchParams.get('source') as LeadSource) || 'other';

    // Verificação de token (opcional — só valida se o token estiver configurado)
    const WEBHOOK_TOKEN = await token();
    if (WEBHOOK_TOKEN) {
      const headerToken = request.headers.get('x-webhook-token');
      if (headerToken !== WEBHOOK_TOKEN) {
        return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
      }
    }

    const body = await request.json();

    // Detecta o formato e normaliza
    let data: Partial<CreateLeadInput> = {};
    if (Array.isArray(body.field_data)) {
      data = parseMetaLeadAds(body);
    } else if (Array.isArray(body.user_column_data)) {
      data = parseGoogleLeadForm(body);
    } else {
      data = {
        name: body.name,
        email: body.email,
        phone: body.phone || body.whatsapp,
        whatsapp: body.whatsapp,
        interest: body.interest,
        value: body.value ? Number(body.value) : undefined,
      };
    }

    if (!data.name && !data.email && !data.phone) {
      return NextResponse.json(
        { error: 'Payload sem dados de contato (name/email/phone)' },
        { status: 400 }
      );
    }

    const { lead, created } = await upsertLeadFromContact({
      name: data.name || data.email || data.phone || 'Lead',
      email: data.email,
      phone: data.phone,
      whatsapp: data.whatsapp || data.phone,
      source,
      stage: 'novo',
      handledBy: 'manual',
      interest: data.interest,
      value: data.value,
      notes: `Lead captado via ${source}`,
    });

    return NextResponse.json(
      { success: true, created, lead },
      { status: created ? 201 : 200 }
    );
  } catch (error: any) {
    console.error('Lead webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao processar webhook' },
      { status: 500 }
    );
  }
}

// Verificação de webhook (Meta exige um GET de verificação com hub.challenge)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('hub.challenge');
  const verifyToken = searchParams.get('hub.verify_token');

  const WEBHOOK_TOKEN = await token();
  if (challenge && (!WEBHOOK_TOKEN || verifyToken === WEBHOOK_TOKEN)) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ status: 'leads webhook online' });
}
