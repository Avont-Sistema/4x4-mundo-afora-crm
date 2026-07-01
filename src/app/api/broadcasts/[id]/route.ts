import { NextRequest, NextResponse } from 'next/server';
import { getBroadcast, updateBroadcast, deleteBroadcast, getBroadcastRecipients, getBroadcastStats } from '@/lib/broadcastStore';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const broadcast = await getBroadcast(id);
    if (!broadcast) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    const recipients = await getBroadcastRecipients(id);
    const stats = await getBroadcastStats(id);

    return NextResponse.json({ broadcast: { ...broadcast, recipients, stats } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const broadcast = await getBroadcast(id);
    if (!broadcast) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    if (broadcast.status !== 'draft') {
      return NextResponse.json({ error: 'Somente rascunhos podem ser editados' }, { status: 400 });
    }

    const body = await req.json();
    const updated = await updateBroadcast(id, body);
    return NextResponse.json({ broadcast: updated });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const broadcast = await getBroadcast(id);
    if (!broadcast) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    if (broadcast.status === 'running') {
      return NextResponse.json({ error: 'Cancele o disparo antes de deletar' }, { status: 400 });
    }

    await deleteBroadcast(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
