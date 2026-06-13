import { NextResponse } from 'next/server';
import { buildFinanceSummary } from '@/lib/finance';

export async function GET() {
  return NextResponse.json(buildFinanceSummary());
}
