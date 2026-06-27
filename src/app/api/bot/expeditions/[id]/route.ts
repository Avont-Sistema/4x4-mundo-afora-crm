import { NextRequest, NextResponse } from 'next/server';
import { isBotAuthed } from '@/lib/botAuth';
import { expeditionsStore } from '@/lib/expeditionsStore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isBotAuthed(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const exp = await expeditionsStore.get(id);
  if (!exp) return NextResponse.json({ error: 'Expedição não encontrada' }, { status: 404 });

  const enrolled = exp.enrollments.filter((en) => en.status !== 'cancelado').length;
  const formUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/cadastro?exp=${exp.id}`;

  return NextResponse.json({
    expedition: {
      ...exp,
      spotsLeft: exp.slots - enrolled,
      formUrl,
    },
  });
}
