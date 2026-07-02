import { NextRequest, NextResponse } from 'next/server';
import { botFetch } from '@/lib/botProxy';
import { appendMessage, findConversationByAnyPhone, setModeByAnyPhone } from '@/lib/conversationsStore';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const { phone: phoneRaw } = await params;
  const phone = decodeURIComponent(phoneRaw);
  const { text } = await request.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: 'text obrigatório' }, { status: 400 });
  }
  try {
    const res = await botFetch('/api/send', {
      method: 'POST',
      body: JSON.stringify({ phone, text }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.error || 'Falha ao enviar' }, { status: res.status });
    }

    // Persiste a mensagem do operador no CRM (o histórico do bot é só memória)
    // e move a conversa para "Aguardando Equipe" — operador respondeu, bot pausa.
    const existing = await findConversationByAnyPhone(phone);
    const convPhone = existing?.phone ?? phone;
    await appendMessage(convPhone, { role: 'assistant', content: `[Operador] ${text}`, via: 'human' });
    if (!existing || existing.mode === 'bot') {
      await setModeByAnyPhone(convPhone, 'human');
      try {
        await botFetch('/api/bot-toggle', {
          method: 'POST',
          body: JSON.stringify({ phone, bot_active: 0 }),
        });
      } catch { /* não crítico */ }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Bot offline' }, { status: 503 });
  }
}
