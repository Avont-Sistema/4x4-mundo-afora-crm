import { NextRequest, NextResponse } from 'next/server';
import { listKnowledge, createKnowledge } from '@/lib/knowledgeStore';

export async function GET() {
  return NextResponse.json({ entries: await listKnowledge() });
}

export async function POST(req: NextRequest) {
  try {
    const { topic, keywords, content, links } = await req.json();
    if (!topic?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'topic e content são obrigatórios' }, { status: 400 });
    }
    const entry = await createKnowledge({
      topic: topic.trim(),
      keywords: (keywords || topic).trim(),
      content: content.trim(),
      links: Array.isArray(links) ? links.filter(Boolean) : undefined,
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
