import { NextRequest, NextResponse } from 'next/server';
import { botFetch } from '@/lib/botProxy';
import { appendMessage, findConversationByAnyPhone, setModeByAnyPhone } from '@/lib/conversationsStore';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const { phone: phoneRaw } = await params;
  const phone = decodeURIComponent(phoneRaw);
  const { text, mediaUrl, mediaType } = await request.json();
  if (!text?.trim() && !mediaUrl) {
    return NextResponse.json({ error: 'text ou mediaUrl obrigatório' }, { status: 400 });
  }
  try {
    const res = await botFetch('/api/send', {
      method: 'POST',
      body: JSON.stringify({ phone, text, mediaUrl, mediaType }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.error || 'Falha ao enviar' }, { status: res.status });
    }

    // Persiste a mensagem do operador no CRM (o histórico do bot é só memória)
    // e move a conversa para "Aguardando Equipe" — operador respondeu, bot pausa.
    const existing = await findConversationByAnyPhone(phone);
    const convPhone = existing?.phone ?? phone;
    const logged = text?.trim()
      ? `[Operador] ${text}`
      : `[Operador] [${mediaType === 'image' ? 'imagem' : mediaType === 'video' ? 'vídeo' : mediaType === 'audio' ? 'áudio' : 'arquivo'}] ${mediaUrl}`;
    await appendMessage(convPhone, { role: 'assistant', content: logged, via: 'human' });
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
