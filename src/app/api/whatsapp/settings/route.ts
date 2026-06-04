import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/settingsStore';

export async function GET() {
  return NextResponse.json({ settings: getSettings() });
}

export async function POST(request: NextRequest) {
  try {
    const patch = await request.json();
    const allowed = [
      'botPaused',
      'operatorNotes',
      'businessHoursEnabled',
      'businessHours',
      'outOfHoursMessage',
    ];
    const clean: any = {};
    for (const k of allowed) if (patch[k] !== undefined) clean[k] = patch[k];
    const settings = updateSettings(clean);
    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao salvar' },
      { status: 500 }
    );
  }
}
