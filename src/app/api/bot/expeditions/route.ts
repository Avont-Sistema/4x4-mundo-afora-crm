import { NextRequest, NextResponse } from 'next/server';
import { isBotAuthed } from '@/lib/botAuth';
import { expeditionsStore } from '@/lib/expeditionsStore';

export async function GET(request: NextRequest) {
  if (!isBotAuthed(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const all = await expeditionsStore.all();
  const active = all
    .filter((e: any) => e.status === 'aberta' || e.status === 'em_andamento')
    .map((e: any) => ({
      id: e.id,
      routeName: e.routeName,
      description: e.description,
      location: e.location,
      startDate: e.startDate,
      endDate: e.endDate,
      slots: e.slots,
      pricePerPerson: e.pricePerPerson,
      pricePerChild: e.pricePerChild,
      status: e.status,
      spotsLeft: e.slots - (e.enrollments ?? []).filter((en: any) => en.status !== 'cancelado').length,
      formUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/cadastro?exp=${e.id}`,
    }));

  return NextResponse.json({ expeditions: active });
}
