import { NextRequest, NextResponse } from 'next/server';
import { payablesStore } from '@/lib/payablesStore';
import { expeditionsStore, computeFinance } from '@/lib/expeditionsStore';
import { suppliersStore, supplierCost } from '@/lib/suppliersStore';

// Gera contas a pagar (pendentes) a partir dos fornecedores de uma expedição,
// com base nos participantes atuais (adultos/crianças). Evita duplicar
// fornecedores que já têm conta gerada para essa expedição.
export async function POST(request: NextRequest) {
  try {
    const { expeditionId } = await request.json();
    const exp = expeditionsStore.get(expeditionId);
    if (!exp) {
      return NextResponse.json({ error: 'Expedição não encontrada' }, { status: 404 });
    }
    const suppliers = suppliersStore.all();
    const fin = computeFinance(exp, suppliers);
    const cars = exp.enrollments.filter((e) => e.status !== 'cancelado').length;
    const ctx = { adults: fin.totalAdults, children: fin.totalChildren, cars, rooms: cars };
    const existing = payablesStore
      .all()
      .filter((p) => p.expeditionId === exp.id && p.supplierId);

    let created = 0;
    for (const s of suppliers) {
      if (!exp.supplierIds.includes(s.id)) continue;
      if (existing.some((p) => p.supplierId === s.id)) continue; // já gerado
      const amount = supplierCost(s, ctx);
      if (amount <= 0) continue;
      payablesStore.create({
        description: `${s.name} — ${exp.routeName}`,
        amount,
        type: 'fornecedor',
        status: 'pendente',
        dueDate: exp.startDate,
        expeditionId: exp.id,
        expeditionName: exp.routeName,
        supplierId: s.id,
        supplierName: s.name,
      });
      created++;
    }

    return NextResponse.json({ created, payables: payablesStore.all() });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao gerar contas' },
      { status: 500 }
    );
  }
}
