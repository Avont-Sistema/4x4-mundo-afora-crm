import { NextRequest, NextResponse } from 'next/server';
import {
  expeditionsStore,
  buildExpeditionDetail,
  type ExpeditionStatus,
} from '@/lib/expeditionsStore';

export async function GET() {
  // lista com finanças resumidas de cada expedição
  const all = await expeditionsStore.all();
  const expeditions = await Promise.all(all.map((e) => buildExpeditionDetail(e)));
  return NextResponse.json({ expeditions });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.routeName) {
      return NextResponse.json(
        { error: 'Nome do roteiro é obrigatório' },
        { status: 400 }
      );
    }
    const expedition = await expeditionsStore.create({
      routeName: body.routeName,
      sector: body.sector,
      description: body.description,
      location: body.location,
      startDate: body.startDate,
      endDate: body.endDate,
      slots: Number(body.slots) || 0,
      priceSingle: Number(body.priceSingle) || 0,
      priceCouple: Number(body.priceCouple) || 0,
      priceChildUpTo5: Number(body.priceChildUpTo5) || 0,
      priceChild5to10: Number(body.priceChild5to10) || 0,
      priceAbove10: Number(body.priceAbove10) || 0,
      priceSecondCoupleSuite: Number(body.priceSecondCoupleSuite) || 0,
      revenueGoal: Number(body.revenueGoal) || 0,
      status: (body.status as ExpeditionStatus) || 'planejamento',
      supplierIds: Array.isArray(body.supplierIds) ? body.supplierIds : [],
      manualCosts: [],
      enrollments: [],
    });
    return NextResponse.json(
      { expedition: await buildExpeditionDetail(expedition) },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao criar expedição' },
      { status: 500 }
    );
  }
}
