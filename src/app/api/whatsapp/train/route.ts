import { NextRequest, NextResponse } from 'next/server';
import {
  runTraining,
  loadTrainingHistory,
  saveTrainingHistory,
  type TrainAttachment,
} from '@/lib/training';

// Estúdio "Treinar o Bot" — a lógica vive em lib/training.ts, também usada pelo
// chat de treinamento via WhatsApp dos donos (inbound admin).

export async function GET() {
  const history = await loadTrainingHistory();
  return NextResponse.json({ history });
}

export async function DELETE() {
  await saveTrainingHistory([]);
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { message, attachments = [] }: { message: string; attachments: TrainAttachment[] } = body;

  if (!message?.trim() && attachments.length === 0) {
    return NextResponse.json({ error: 'message ou attachments obrigatório' }, { status: 400 });
  }

  try {
    const { reply, actionsCreated } = await runTraining(message, attachments);
    return NextResponse.json({ reply, actionsCreated });
  } catch (err) {
    const msg = (err as Error).message;
    const status = msg.includes('não configurada') ? 503 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
