import { NextRequest, NextResponse } from 'next/server';
import { processInbound } from '@/lib/agent/inbound';

// Endpoint usado pelo chat de teste do dashboard.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, phone, contactName } = body;
    if (!message) {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
    }
    const result = await processInbound(phone || 'teste-dashboard', message, contactName);
    return NextResponse.json({
      success: true,
      message: result.reply,
      leadCreated: result.leadCreated,
      aiEnabled: result.aiEnabled,
      mode: result.mode,
      reason: result.reason,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('WhatsApp message error:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao processar mensagem' },
      { status: 500 }
    );
  }
}
