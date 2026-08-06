import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { parseGoogleForms, type GFResponse, type GFPerson } from '@/lib/importGoogleForms';
import {
  clientsStore,
  findClientByIdentity,
  mergeFamily,
  ageFrom,
  type Client,
  type FamilyMember,
} from '@/lib/clientsStore';
import { expeditionsStore, enrollClient, compositionFromPeople } from '@/lib/expeditionsStore';

function fill<T>(existing: T | undefined | null | '', incoming: T | undefined): T | undefined {
  const empty = existing === undefined || existing === null || existing === '';
  return (empty ? incoming : existing) as T | undefined;
}

function personToFamilyMember(p: GFPerson): FamilyMember {
  return {
    id: crypto.randomUUID(),
    name: p.name,
    relation: p.isChild ? 'filho' : 'outro',
    birthDate: p.birthDate,
    document: p.cpf,
    job: p.job,
    isChild: p.isChild,
  };
}

function responseFamily(r: GFResponse): FamilyMember[] {
  const family: FamilyMember[] = [];
  if (r.companion) family.push(personToFamilyMember(r.companion));
  for (const p of r.additionalPassengers) family.push(personToFamilyMember(p));
  return family;
}

function responseShirtSizes(r: GFResponse): string[] {
  if (!r.shirtSizesRaw) return [];
  return Array.from(new Set(r.shirtSizesRaw.split(',').map((s) => s.trim()).filter(Boolean)));
}

// "2º casal + suíte separada" não é uma pergunta própria no Google Forms — só
// dá pra inferir da configuração de quarto escolhida, igual ao /cadastro.
function inferSecondCoupleSuite(roomConfig: string): boolean {
  return /segundo quarto|2\s*su[ií]tes?|2\s*quartos/i.test(roomConfig);
}

function responseObs(r: GFResponse): string {
  return [
    'Importado de resposta do Google Forms.',
    r.roomConfig ? `Quarto: ${r.roomConfig}` : '',
    responseShirtSizes(r).length ? `Camisetas: ${responseShirtSizes(r).join(', ')}` : '',
    r.petInfo ? `Pet: ${r.petInfo}` : '',
    r.emergencyContact ? `Emergência: ${r.emergencyContact}` : '',
    r.notes ? `Obs.: ${r.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

// POST /api/expeditions/:id/import-google-forms  (multipart: file — .csv ou .xlsx)
//   ?preview=1 -> só analisa e devolve as respostas detectadas (não grava)
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
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) {
      return NextResponse.json({ error: 'Não consegui ler nenhuma aba no arquivo.' }, { status: 400 });
    }
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });

    const parsed = parseGoogleForms(rows);
    if (parsed.missingColumns.length > 0) {
      return NextResponse.json(
        {
          error:
            `Não encontrei estas colunas no cabeçalho: ${parsed.missingColumns.join(', ')}. ` +
            'Confira se é mesmo a planilha de respostas do formulário certo.',
        },
        { status: 400 }
      );
    }
    if (parsed.responses.length === 0) {
      return NextResponse.json({ error: 'Nenhuma resposta encontrada na planilha.' }, { status: 400 });
    }

    // marca cada resposta como cliente novo ou já existente (por CPF/telefone/email)
    const enriched = await Promise.all(
      parsed.responses.map(async (r) => {
        const existing = await findClientByIdentity({
          cpf: r.driver.cpf,
          phone: r.driver.phone,
          email: r.email,
        });
        const companions = [
          ...(r.companion ? [r.companion] : []),
          ...r.additionalPassengers,
        ];
        return {
          rowNumber: r.rowNumber,
          driverName: r.driver.name,
          cpf: r.driver.cpf,
          car: r.driver.car,
          plate: r.driver.plate,
          adults: 1 + companions.filter((p) => !p.isChild).length,
          children: companions.filter((p) => p.isChild).length,
          companions: companions.map((p) => ({ name: p.name, isChild: p.isChild, age: p.age })),
          roomConfig: r.roomConfig,
          existing: !!existing,
        };
      })
    );

    if (preview) {
      return NextResponse.json({
        preview: true,
        totalResponses: parsed.responses.length,
        responses: enriched,
        warnings: parsed.warnings,
      });
    }

    // ---- importação efetiva ----
    let created = 0;
    let mergedCount = 0;
    let enrolled = 0;
    let skipped = 0;

    for (const r of parsed.responses) {
      const d = r.driver;
      const incomingFamily = responseFamily(r);
      const shirtSizes = responseShirtSizes(r);

      const existing = await findClientByIdentity({ cpf: d.cpf, phone: d.phone, email: r.email });

      let client: Client;
      if (existing) {
        mergedCount++;
        const family = mergeFamily(existing.family || [], incomingFamily);
        const hasVehicle = existing.vehicle && (existing.vehicle.model || existing.vehicle.plate);
        client = (await clientsStore.update(existing.id, {
          email: fill(existing.email, r.email),
          phone: fill(existing.phone, d.phone),
          whatsapp: fill(existing.whatsapp, d.phone),
          cpf: fill(existing.cpf, d.cpf),
          birthDate: fill(existing.birthDate, d.birthDate),
          job: fill(existing.job, d.job),
          address: fill(existing.address, d.address),
          addressNumber: fill(existing.addressNumber, d.addressNumber),
          neighborhood: fill(existing.neighborhood, d.neighborhood),
          cep: fill(existing.cep, d.cep),
          city: fill(existing.city, d.city),
          state: fill(existing.state, d.state),
          roomConfig: fill(existing.roomConfig, r.roomConfig),
          shirtSizes: Array.from(new Set([...(existing.shirtSizes || []), ...shirtSizes])),
          vehicle: hasVehicle ? existing.vehicle : { model: d.car, plate: d.plate },
          emergencyContact: existing.emergencyContact?.name
            ? existing.emergencyContact
            : r.emergencyContact
              ? { name: r.emergencyContact, phone: '' }
              : existing.emergencyContact,
          petInfo: fill(existing.petInfo, r.petInfo),
          family,
        }))!;
      } else {
        created++;
        client = await clientsStore.create({
          name: d.name,
          email: r.email,
          phone: d.phone,
          whatsapp: d.phone,
          cpf: d.cpf,
          birthDate: d.birthDate,
          job: d.job,
          address: d.address,
          addressNumber: d.addressNumber,
          neighborhood: d.neighborhood,
          cep: d.cep,
          city: d.city,
          state: d.state,
          roomConfig: r.roomConfig,
          shirtSizes,
          vehicle: d.car || d.plate ? { model: d.car, plate: d.plate } : undefined,
          emergencyContact: r.emergencyContact ? { name: r.emergencyContact, phone: '' } : undefined,
          petInfo: r.petInfo,
          family: incomingFamily,
          origin: 'google_forms',
        });
      }

      const companionsForComposition = [
        ...(r.companion ? [r.companion] : []),
        ...r.additionalPassengers,
      ];
      const composition = compositionFromPeople(
        companionsForComposition.map((p) => ({ age: ageFrom(p.birthDate) ?? p.age, isChild: p.isChild }))
      );
      composition.secondCoupleSeparateSuite = inferSecondCoupleSuite(r.roomConfig || '');

      const result = await enrollClient(exp, client, {
        composition,
        observations: responseObs(r),
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
      totalResponses: parsed.responses.length,
      warnings: parsed.warnings,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao importar respostas do Google Forms' },
      { status: 500 }
    );
  }
}

// evita parsing automático do body (usamos formData)
export const dynamic = 'force-dynamic';
