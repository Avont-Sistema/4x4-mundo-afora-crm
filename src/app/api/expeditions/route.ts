import { NextRequest, NextResponse } from 'next/server';
import {
  expeditionsStore,
  buildExpeditionDetail,
  type ExpeditionStatus,
} from '@/lib/expeditionsStore';

export async function GET() {
  // lista com finanças resumidas de cada expedição
  const expeditions = expeditionsStore.all().map((e) => buildExpeditionDetail(e));
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
    const expedition = expeditionsStore.create({
      routeName: body.routeName,
      sector: body.sector,
      description: body.description,
      location: body.location,
      startDate: body.startDate,
      endDate: body.endDate,
      slots: Number(body.slots) || 0,
      pricePerPerson: Number(body.pricePerPerson) || 0,
      pricePerChild: Number(body.pricePerChild) || 0,
      revenueGoal: Number(body.revenueGoal) || 0,
      status: (body.status as ExpeditionStatus) || 'planejamento',
      supplierIds: Array.isArray(body.supplierIds) ? body.supplierIds : [],
      manualCosts: [],
      enrollments: [],
    });
    return NextResponse.json(
      { expedition: buildExpeditionDetail(expedition) },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao criar expedição' },
      { status: 500 }
    );
  }
}
