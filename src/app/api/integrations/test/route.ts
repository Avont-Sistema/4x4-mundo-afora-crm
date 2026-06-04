import { NextRequest, NextResponse } from 'next/server';
import { resolve } from '@/lib/integrationsStore';

// Testa a conexão de uma integração específica.
// body: { target: 'anthropic' | 'asaas' | 'whatsapp' }
export async function POST(request: NextRequest) {
  const { target } = await request.json();
  const r = resolve();

  try {
    if (target === 'anthropic') {
      if (!r.anthropicApiKey) return NextResponse.json({ ok: false, message: 'Chave não configurada' });
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 'x-api-key': r.anthropicApiKey, 'anthropic-version': '2023-06-01' },
      });
      return NextResponse.json({
        ok: res.ok,
        message: res.ok ? 'Chave válida ✓' : `Falhou (${res.status})`,
      });
    }

    if (target === 'asaas') {
      if (!r.asaasApiKey) return NextResponse.json({ ok: false, message: 'Chave não configurada' });
      const base =
        r.asaasEnv === 'production'
          ? 'https://api.asaas.com/v3'
          : 'https://api-sandbox.asaas.com/v3';
      const res = await fetch(`${base}/myAccount`, {
        headers: { access_token: r.asaasApiKey },
      });
      return NextResponse.json({
        ok: res.ok,
        message: res.ok ? `Conectado (${r.asaasEnv}) ✓` : `Falhou (${res.status})`,
      });
    }

    if (target === 'whatsapp') {
      if (!r.whatsappConnectorUrl)
        return NextResponse.json({ ok: false, message: 'URL do conector não configurada' });
      const res = await fetch(`${r.whatsappConnectorUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({
        ok: res.ok && data.connected,
        message: res.ok
          ? data.connected
            ? 'WhatsApp conectado ✓'
            : 'Conector online, WhatsApp não pareado (abra /qr)'
          : 'Conector inacessível',
        connected: !!data.connected,
      });
    }

    return NextResponse.json({ ok: false, message: 'Alvo desconhecido' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message || 'Erro no teste' });
  }
}
