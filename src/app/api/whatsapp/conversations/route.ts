import { NextResponse } from 'next/server';
import { listConversations } from '@/lib/conversationsStore';

export async function GET() {
  const conversations = listConversations().map((c) => ({
    phone: c.phone,
    name: c.contactName || c.phone,
    mode: c.mode,
    lastMessage: c.lastMessage || '',
    lastAt: c.lastAt,
    count: c.messages.length,
  }));
  return NextResponse.json({ conversations });
}
