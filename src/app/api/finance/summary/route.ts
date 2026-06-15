import { NextRequest, NextResponse } from 'next/server';
import { buildFinanceSummary } from '@/lib/finance';

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get('month') || undefined;
  return NextResponse.json(await buildFinanceSummary({ month }));
}
