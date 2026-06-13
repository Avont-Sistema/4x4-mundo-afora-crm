import { createCollection, type BaseRecord } from './jsonCollection';

export type FamilyRelation = 'conjuge' | 'filho' | 'filha' | 'outro';

export interface FamilyMember {
  id: string;
  name: string;
  relation: FamilyRelation;
  birthDate?: string;
  document?: string;
  isChild: boolean; // conta como "criança" no cálculo de custos/preço
  weight?: number; // kg — usado em cadastros de fornecedores
  height?: number; // cm
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
  city?: string;
  state?: string;
  job?: string; // emprego / profissão
  company?: string; // empresa
  weight?: number; // kg — dados físicos do titular
  height?: number; // cm
  family: FamilyMember[]; // cônjuge, filhos, etc.
  vehicle?: Vehicle; // carro
  notes?: string;
  // origem (quando criado a partir de um lead / bot)
  origin?: string;
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
