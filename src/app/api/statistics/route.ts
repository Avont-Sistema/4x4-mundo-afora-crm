import { NextResponse } from 'next/server';
import { buildStatistics } from '@/lib/statistics';

export async function GET() {
  return NextResponse.json(await buildStatistics());
}
