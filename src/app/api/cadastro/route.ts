import { NextRequest, NextResponse } from 'next/server';
import {
  clientsStore,
  findClientByIdentity,
  mergeFamily,
  type Client,
  type FamilyMember,
} from '@/lib/clientsStore';
import { expeditionsStore, enrollClient } from '@/lib/expeditionsStore';
import { getTermTemplate } from '@/lib/contractsStore';
import { renderTerm, formatSignLine, TERM_VERSION } from '@/lib/imageRightsTerm';

function normalizeFamily(family: any[]): FamilyMember[] {
  if (!Array.isArray(family)) return [];
  return family.map((m) => ({
    id: m.id || crypto.randomUUID(),
    name: m.name || '',
    relation: m.relation || 'outro',
    birthDate: m.birthDate || undefined,
    document: m.document || undefined,
    job: m.job || undefined,
    isChild: Boolean(m.isChild),
    weight: m.weight ? Number(m.weight) : undefined,
    height: m.height ? Number(m.height) : undefined,
    shirtSize: m.shirtSize || undefined,
  }));
}

// mantém o valor existente se já preenchido; senão usa o novo
function fill<T>(existing: T | undefined | null | '', incoming: T | undefined): T | undefined {
  const empty = existing === undefined || existing === null || existing === '';
  return (empty ? incoming : existing) as T | undefined;
}

// GET /api/cadastro?exp=<id> -> informações públicas da expedição (banner do formulário)
// + o termo de uso de imagem já renderizado com os dados do evento (para a assinatura).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const expId = searchParams.get('exp');

  const { template, signCity } = await getTermTemplate();
  const exp = expId ? await expeditionsStore.get(expId) : null;

  const term = {
    text: renderTerm(template, {
      eventName: exp?.routeName,
      startDate: exp?.startDate,
      endDate: exp?.endDate,
      location: exp?.location,
    }),
    signLine: formatSignLine(signCity),
    version: TERM_VERSION,
  };

  return NextResponse.json({
    expedition: exp
      ? {
          id: exp.id,
          routeName: exp.routeName,
          location: exp.location,
          startDate: exp.startDate,
          endDate: exp.endDate,
        }
      : null,
    term,
  });
}

// POST /api/cadastro -> recebe o formulário público:
//   1. identifica cliente existente (CPF/email/telefone) ou cria um novo
//   2. anexa/mescla os dados ao cliente
//   3. (opcional) matricula o cliente na expedição informada
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const incomingFamily = normalizeFamily(body.family);

    const incoming = {
      name: body.name as string,
      email: body.email || undefined,
      phone: body.phone || undefined,
      whatsapp: body.whatsapp || body.phone || undefined,
      cpf: body.cpf || undefined,
      birthDate: body.birthDate || undefined,
      job: body.job || undefined,
      address: body.address || undefined,
      addressNumber: body.addressNumber || undefined,
      neighborhood: body.neighborhood || undefined,
      cep: body.cep || undefined,
      city: body.city || undefined,
      state: body.state || undefined,
      vehicle: body.vehicle || undefined,
      shirtSizes: Array.isArray(body.shirtSizes) ? (body.shirtSizes as string[]) : [],
      roomConfig: body.roomConfig || undefined,
      emergencyContact: body.emergencyContact || undefined, // string "nome e telefone"
      petInfo: body.petInfo || undefined,
      notes: body.notes || undefined,
    };

    const existing = await findClientByIdentity({
      cpf: incoming.cpf,
      email: incoming.email,
      phone: incoming.phone,
    });

    let client: Client;
    let merged = false;

    if (existing) {
      merged = true;
      const family = mergeFamily(existing.family || [], incomingFamily);
      const shirtSizes = Array.from(
        new Set([...(existing.shirtSizes || []), ...incoming.shirtSizes])
      );
      const hasVehicle =
        existing.vehicle && (existing.vehicle.model || existing.vehicle.plate);
      const patch: Partial<Client> = {
        email: fill(existing.email, incoming.email),
        phone: fill(existing.phone, incoming.phone),
        whatsapp: fill(existing.whatsapp, incoming.whatsapp),
        cpf: fill(existing.cpf, incoming.cpf),
        birthDate: fill(existing.birthDate, incoming.birthDate),
        job: fill(existing.job, incoming.job),
        address: fill(existing.address, incoming.address),
        addressNumber: fill(existing.addressNumber, incoming.addressNumber),
        neighborhood: fill(existing.neighborhood, incoming.neighborhood),
        cep: fill(existing.cep, incoming.cep),
        city: fill(existing.city, incoming.city),
        state: fill(existing.state, incoming.state),
        vehicle: hasVehicle ? existing.vehicle : incoming.vehicle,
        shirtSizes,
        roomConfig: fill(existing.roomConfig, incoming.roomConfig),
        emergencyContact: existing.emergencyContact?.name
          ? existing.emergencyContact
          : incoming.emergencyContact
            ? { name: incoming.emergencyContact, phone: '' }
            : existing.emergencyContact,
        petInfo: fill(existing.petInfo, incoming.petInfo),
        family,
      };
      client = (await clientsStore.update(existing.id, patch))!;
    } else {
      client = await clientsStore.create({
        name: incoming.name,
        email: incoming.email,
        phone: incoming.phone,
        whatsapp: incoming.whatsapp,
        cpf: incoming.cpf,
        birthDate: incoming.birthDate,
        job: incoming.job,
        address: incoming.address,
        addressNumber: incoming.addressNumber,
        neighborhood: incoming.neighborhood,
        cep: incoming.cep,
        city: incoming.city,
        state: incoming.state,
        vehicle: incoming.vehicle,
        shirtSizes: incoming.shirtSizes,
        roomConfig: incoming.roomConfig,
        emergencyContact: incoming.emergencyContact
          ? { name: incoming.emergencyContact, phone: '' }
          : undefined,
        petInfo: incoming.petInfo,
        family: incomingFamily,
        notes: incoming.notes,
        origin: 'formulario',
      });
    }

    // Matrícula na expedição (se o link era específico de uma expedição)
    let enrolled = false;
    let alreadyEnrolled = false;
    let expeditionName: string | undefined;
    if (body.expeditionId) {
      const exp = await expeditionsStore.get(body.expeditionId);
      if (exp) {
        expeditionName = exp.routeName;
        // comitiva desta inscrição (não usa a família acumulada de outras expedições)
        const adults = 1 + incomingFamily.filter((m) => !m.isChild).length;
        const children = incomingFamily.filter((m) => m.isChild).length;
        const obs = [
          'Inscrição recebida via formulário.',
          incoming.roomConfig ? `Quarto: ${incoming.roomConfig}` : '',
          incoming.shirtSizes.length ? `Camisetas: ${incoming.shirtSizes.join(', ')}` : '',
          incoming.petInfo ? `Pet: ${incoming.petInfo}` : '',
          incoming.emergencyContact ? `Emergência: ${incoming.emergencyContact}` : '',
          incoming.notes ? `Obs.: ${incoming.notes}` : '',
        ]
          .filter(Boolean)
          .join('\n');
        const result = await enrollClient(exp, client, { adults, children, observations: obs });
        if (result.enrollment) enrolled = true;
        else if (result.error) alreadyEnrolled = true;
      }
    }

    return NextResponse.json(
      { ok: true, clientId: client.id, merged, enrolled, alreadyEnrolled, expeditionName },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Falha ao cadastrar' },
      { status: 500 }
    );
  }
}
