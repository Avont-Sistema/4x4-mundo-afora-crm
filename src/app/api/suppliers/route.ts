import { NextRequest, NextResponse } from 'next/server';
import { suppliersStore, type SupplierType, type BillingMode } from '@/lib/suppliersStore';

export async function GET() {
  return NextResponse.json({ suppliers: await suppliersStore.all() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }
    const supplier = await suppliersStore.create({
      name: body.name,
      type: (body.type as SupplierType) || 'outro',
      email: body.email,
      phone: body.phone,
      address: body.address,
      billingMode: (body.billingMode as BillingMode) || 'per_category',
      commonPricing: body.commonPricing ? {
        perPerson: Number(body.commonPricing.perPerson) || 0,
        casal: Number(body.commonPricing.casal) || 0,
        child0to5: Number(body.commonPricing.child0to5) || 0,
        child5to10: Number(body.commonPricing.child5to10) || 0,
        above10: Number(body.commonPricing.above10) || 0,
        senior: Number(body.commonPricing.senior) || 0,
      } : undefined,
      hotelPricing: body.hotelPricing ? {
        single: Number(body.hotelPricing.single) || 0,
        casal: Number(body.hotelPricing.casal) || 0,
        triplo: Number(body.hotelPricing.triplo) || 0,
        quadruplo: Number(body.hotelPricing.quadruplo) || 0,
        familia: Number(body.hotelPricing.familia) || 0,
        adicional: Number(body.hotelPricing.adicional) || 0,
      } : undefined,
      costPerPerson: Number(body.costPerPerson) || 0,
      costPerChild: Number(body.costPerChild) || 0,
      costPerStudent: Number(body.costPerStudent) || 0,
      costPerSenior: Number(body.costPerSenior) || 0,
      childMaxAge: body.childMaxAge !== undefined ? Number(body.childMaxAge) : 12,
      seniorMinAge: body.seniorMinAge !== undefined ? Number(body.seniorMinAge) : 60,
      costPerCar: Number(body.costPerCar) || 0,
      costPerRoom: Number(body.costPerRoom) || 0,
      flatFee: Number(body.flatFee) || 0,
      exportFields: Array.isArray(body.exportFields) ? body.exportFields : [],
      rating: Number(body.rating) || 0,
      notes: body.notes,
    });
    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao criar fornecedor' },
      { status: 500 }
    );
  }
}
