import { createCollection, type BaseRecord } from './jsonCollection';

export type FamilyRelation = 'conjuge' | 'filho' | 'filha' | 'outro';

// Categoria de preço/tarifário (ingressos do fornecedor). Quando ausente,
// o sistema deduz por idade (criança/idoso pela faixa do fornecedor; senão adulto).
export type PriceCategory = 'adulto' | 'crianca' | 'estudante' | 'idoso';

export interface FamilyMember {
  id: string;
  name: string;
  relation: FamilyRelation;
  birthDate?: string;
  document?: string; // CPF
  job?: string;
  isChild: boolean; // conta como "criança" no cálculo de custos/preço
  weight?: number; // kg
  height?: number; // cm
  shirtSize?: string;
  priceCategory?: PriceCategory; // sobrepõe a dedução por idade na planilha do fornecedor
}

export interface Vehicle {
  model?: string;
  plate?: string;
  year?: string;
  color?: string;
}

export interface Client extends BaseRecord {
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  cpf?: string;
  birthDate?: string;
  address?: string;
  addressNumber?: string; // número e complemento
  neighborhood?: string; // bairro
  cep?: string;
  city?: string;
  state?: string;
  job?: string;
  company?: string;
  weight?: number; // kg
  height?: number; // cm
  shirtSizes?: string[]; // tamanhos da comitiva inteira
  roomConfig?: string;  // configuração do quarto
  priceCategory?: PriceCategory; // categoria de tarifário do titular (sobrepõe idade)
  emergencyContact?: { name: string; phone: string };
  petInfo?: string;
  family: FamilyMember[];
  vehicle?: Vehicle;
  notes?: string;
  origin?: string;
  howFound?: string; // como nos encontrou: instagram, meta_ads, google, site, indicacao, whatsapp, outro
  shirtSize?: string; // tamanho de camiseta do titular
}

function seed(): Client[] {
  const ts = new Date().toISOString();
  return [
    {
      id: crypto.randomUUID(),
      name: 'Carlos Mendes',
      email: 'carlos@email.com',
      phone: '+5511999991111',
      whatsapp: '+5511999991111',
      cpf: '123.456.789-00',
      birthDate: '1985-03-12',
      address: 'Rua das Palmeiras, 100',
      city: 'São Paulo',
      state: 'SP',
      job: 'Engenheiro',
      company: 'Construtora ABC',
      family: [
        {
          id: crypto.randomUUID(),
          name: 'Patrícia Mendes',
          relation: 'conjuge',
          birthDate: '1987-07-22',
          isChild: false,
        },
        {
          id: crypto.randomUUID(),
          name: 'Lucas Mendes',
          relation: 'filho',
          birthDate: '2015-01-10',
          isChild: true,
        },
      ],
      vehicle: {
        model: 'Jeep Wrangler',
        plate: 'ABC-1D23',
        year: '2022',
        color: 'Preto',
      },
      notes: 'Cliente recorrente, já fez 2 expedições',
      origin: 'manual',
      createdAt: ts,
      updatedAt: ts,
    },
  ];
}

export const clientsStore = createCollection<Client>('clients', seed);

// Idade em anos a partir da data de nascimento
export function ageFrom(birthDate?: string): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate.length <= 10 ? birthDate + 'T12:00:00' : birthDate);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

// Conta quantos adultos e crianças há na "comitiva" do cliente (titular + família)
export function countParty(client: Client): { adults: number; children: number } {
  let adults = 1; // o próprio titular
  let children = 0;
  for (const m of client.family || []) {
    if (m.isChild) children++;
    else adults++;
  }
  return { adults, children };
}

// Só dígitos (para comparar CPF / telefone independente de formatação)
export function digits(s?: string): string {
  return (s || '').replace(/\D/g, '');
}

// Encontra um cliente já existente pela identidade (prioridade: CPF > email > telefone).
// Usado pelo formulário público para "anexar" dados a um cliente que já temos.
export async function findClientByIdentity(opts: {
  cpf?: string;
  email?: string;
  phone?: string;
}): Promise<Client | undefined> {
  const cpf = digits(opts.cpf);
  const email = (opts.email || '').trim().toLowerCase();
  const phone = digits(opts.phone);
  const all = await clientsStore.all();

  if (cpf.length >= 11) {
    const byCpf = all.find((c) => digits(c.cpf) === cpf);
    if (byCpf) return byCpf;
  }
  if (email) {
    const byEmail = all.find((c) => (c.email || '').trim().toLowerCase() === email);
    if (byEmail) return byEmail;
  }
  if (phone.length >= 10) {
    const byPhone = all.find(
      (c) => digits(c.phone) === phone || digits(c.whatsapp) === phone
    );
    if (byPhone) return byPhone;
  }
  return undefined;
}

// Mescla membros de família evitando duplicados (compara por documento, senão por nome)
export function mergeFamily(
  existing: FamilyMember[],
  incoming: FamilyMember[]
): FamilyMember[] {
  const result = [...existing];
  const keyOf = (m: FamilyMember) =>
    digits(m.document) || m.name.trim().toLowerCase();
  for (const m of incoming) {
    if (!m.name.trim()) continue;
    const key = keyOf(m);
    const dup = result.some((e) => keyOf(e) === key && key !== '');
    if (!dup) result.push(m);
  }
  return result;
}
