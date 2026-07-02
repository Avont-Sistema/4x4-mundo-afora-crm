import { NextRequest, NextResponse } from 'next/server';
import { botFetch } from '@/lib/botProxy';
import { findConversationByAnyPhone, setModeByAnyPhone, type ConvMode } from '@/lib/conversationsStore';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const { phone } = await params;

  // Histórico em tempo real do bot; se vazio (bot reiniciou e perdeu a memória),
  // cai para o histórico persistente do CRM.
  try {
    const res = await botFetch(`/api/history/${encodeURIComponent(phone)}`);
    if (res.ok) {
      const data = await res.json();
      if ((data.history || []).length > 0) {
        return NextResponse.json({ messages: data.history });
      }
    }
  } catch { /* bot offline — usa CRM */ }

  const conv = await findConversationByAnyPhone(decodeURIComponent(phone));
  const messages = (conv?.messages ?? []).map((m) => ({
    role: m.role,
    content: m.via === 'human' && !m.content.startsWith('[Operador]')
      ? `[Operador] ${m.content}`
      : m.content,
  }));
  return NextResponse.json({ messages });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const { phone: phoneRaw } = await params;
  const phone = decodeURIComponent(phoneRaw);
  const body = await request.json();

  // Mudança de aba/modo (bot | human | resolved) — persistida no CRM.
  // O botActive do bot é sincronizado: só responde automaticamente em modo 'bot'.
  if (body.mode) {
    const mode = body.mode as ConvMode;
    if (!['bot', 'human', 'resolved'].includes(mode)) {
      return NextResponse.json({ error: 'mode inválido' }, { status: 400 });
    }
    await setModeByAnyPhone(phone, mode);
    try {
      await botFetch('/api/bot-toggle', {
        method: 'POST',
        body: JSON.stringify({ phone, bot_active: mode === 'bot' ? 1 : 0 }),
      });
    } catch { /* bot offline — o modo do CRM já bloqueia respostas do bot */ }
    return NextResponse.json({ ok: true, mode });
  }

  // Toggle simples do bot (comportamento existente)
  try {
    await botFetch('/api/bot-toggle', {
      method: 'POST',
      body: JSON.stringify({ phone, bot_active: body.bot_active }),
    });
    // Mantém o modo do CRM coerente com o toggle
    await setModeByAnyPhone(phone, body.bot_active ? 'bot' : 'human');
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Bot offline' }, { status: 503 });
  }
}
