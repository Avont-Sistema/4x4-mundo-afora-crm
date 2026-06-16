import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { parseControle, type ImportComitiva } from '@/lib/importControle';
import {
  clientsStore,
  findClientByIdentity,
  mergeFamily,
  type Client,
  type FamilyMember,
} from '@/lib/clientsStore';
import { expeditionsStore, enrollClient } from '@/lib/expeditionsStore';

function fill<T>(existing: T | undefined | null | '', incoming: T | undefined): T | undefined {
  const empty = existing === undefined || existing === null || existing === '';
  return (empty ? incoming : existing) as T | undefined;
}

function companionsToFamily(c: ImportComitiva): FamilyMember[] {
  return c.companions
    .filter((p) => p.name.trim())
    .map((p) => ({
      id: crypto.randomUUID(),
      name: p.name,
      relation: p.isChild ? 'filho' : 'outro',
      birthDate: p.birthDate,
      document: p.cpf,
      job: p.job,
      isChild: p.isChild,
      shirtSize: p.shirtSize,
    }));
}

function comitivaShirts(c: ImportComitiva): string[] {
  const sizes = [c.driver.shirtSize, ...c.companions.map((p) => p.shirtSize)].filter(
    (s): s is string => !!s
  );
  return Array.from(new Set(sizes));
}

function comitivaObs(c: ImportComitiva): string {
  return [
    'Importado da planilha de controle.',
    c.driver.room ? `Quarto: ${c.driver.room}` : '',
    comitivaShirts(c).length ? `Camisetas: ${comitivaShirts(c).join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

// POST /api/expeditions/:id/import  (multipart: file)
//   ?preview=1 -> só analisa e devolve as comitivas detectadas (não grava)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const preview = searchParams.get('preview') === '1';

    const exp = await expeditionsStore.get(id);
    if (!exp) {
      return NextResponse.json({ error: 'Expedição não encontrada' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });
    }

    const buf = Buffer.from(await (file as File).arrayBuffer());
    const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
    const sheet =
      wb.Sheets['CONTROLE'] ||
      wb.Sheets[wb.SheetNames.find((n) => n.toUpperCase().includes('CONTROLE')) || wb.SheetNames[0]];
    if (!sheet) {
      return NextResponse.json({ error: 'Aba CONTROLE não encontrada na planilha' }, { status: 400 });
    }
    // datas já vêm como Date (cellDates no XLSX.read); raw padrão preserva o tipo
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, {
      header: 1,
      defval: '',
    });

    const parsed = parseControle(rows);
    if (parsed.comitivas.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma comitiva encontrada na planilha.', warnings: parsed.warnings },
        { status: 400 }
      );
    }

    // marca cada comitiva como cliente novo ou já existente (por CPF)
    const enriched = await Promise.all(
      parsed.comitivas.map(async (c) => {
        const existing = await findClientByIdentity({
          cpf: c.driver.cpf,
          phone: c.driver.phone,
        });
        return {
          driverName: c.driver.name,
          cpf: c.driver.cpf,
          car: c.driver.carModel,
          plate: c.driver.plate,
          adults: c.adults,
          children: c.children,
          companions: c.companions.map((p) => ({ name: p.name, isChild: p.isChild, age: p.age })),
          existing: !!existing,
        };
      })
    );

    if (preview) {
      return NextResponse.json({
        preview: true,
        eventTitle: parsed.eventTitle,
        totalPeople: parsed.totalPeople,
        totalCars: parsed.totalCars,
        comitivas: enriched,
        warnings: parsed.warnings,
      });
    }

    // ---- importação efetiva ----
    let created = 0;
    let mergedCount = 0;
    let enrolled = 0;
    let skipped = 0;

    for (const c of parsed.comitivas) {
      const d = c.driver;
      const incomingFamily = companionsToFamily(c);
      const shirtSizes = comitivaShirts(c);

      const existing = await findClientByIdentity({ cpf: d.cpf, phone: d.phone });

      let client: Client;
      if (existing) {
        mergedCount++;
        const family = mergeFamily(existing.family || [], incomingFamily);
        const hasVehicle = existing.vehicle && (existing.vehicle.model || existing.vehicle.plate);
        client = (await clientsStore.update(existing.id, {
          phone: fill(existing.phone, d.phone),
          whatsapp: fill(existing.whatsapp, d.phone),
          cpf: fill(existing.cpf, d.cpf),
          email: fill(existing.email, d.email),
          birthDate: fill(existing.birthDate, d.birthDate),
          job: fill(existing.job, d.job),
          address: fill(existing.address, d.address),
          city: fill(existing.city, d.city),
          state: fill(existing.state, d.state),
          roomConfig: fill(existing.roomConfig, d.room),
          shirtSizes: Array.from(new Set([...(existing.shirtSizes || []), ...shirtSizes])),
          vehicle: hasVehicle ? existing.vehicle : { model: d.carModel, plate: d.plate },
          family,
        }))!;
      } else {
        created++;
        client = await clientsStore.create({
          name: d.name,
          phone: d.phone,
          whatsapp: d.phone,
          cpf: d.cpf,
          email: d.email,
          birthDate: d.birthDate,
          job: d.job,
          address: d.address,
          city: d.city,
          state: d.state,
          roomConfig: d.room,
          shirtSizes,
          vehicle: d.carModel || d.plate ? { model: d.carModel, plate: d.plate } : undefined,
          family: incomingFamily,
          origin: 'importacao',
        });
      }

      const result = await enrollClient(exp, client, {
        adults: c.adults,
        children: c.children,
        observations: comitivaObs(c),
      });
      if (result.enrollment) enrolled++;
      else skipped++;
    }

    return NextResponse.json({
      ok: true,
      created,
      merged: mergedCount,
      enrolled,
      skipped,
      totalCars: parsed.totalCars,
      totalPeople: parsed.totalPeople,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao importar planilha' },
      { status: 500 }
    );
  }
}

// evita parsing automático do body (usamos formData)
export const dynamic = 'force-dynamic';
