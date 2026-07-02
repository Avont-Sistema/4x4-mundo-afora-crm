import { NextRequest, NextResponse } from 'next/server';
import { updateKnowledge, deleteKnowledge } from '@/lib/knowledgeStore';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const entry = await updateKnowledge(id, {
      topic: body.topic?.trim(),
      keywords: body.keywords?.trim(),
      content: body.content?.trim(),
      links: Array.isArray(body.links) ? body.links.filter(Boolean) : undefined,
    });
    return NextResponse.json({ entry });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteKnowledge(id);
  return NextResponse.json({ ok: true });
}
