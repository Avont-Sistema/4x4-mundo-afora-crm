import { createCollection, type BaseRecord } from './jsonCollection';

export type SupplierType =
  | 'hotel'
  | 'restaurante'
  | 'transporte'
  | 'guia'
  | 'passeio'
  | 'outro';

export interface Supplier extends BaseRecord {
  name: string;
  type: SupplierType;
  email?: string;
  phone?: string;
  address?: string;
  // Custos pré-configurados que alimentam o custo dos projetos (expedições)
  costPerPerson: number; // custo por adulto
  costPerChild: number; // custo por criança
  rating: number;
  notes?: string;
}

function seed(): Supplier[] {
  const ts = new Date().toISOString();
  return [
    {
      id: crypto.randomUUID(),
      name: 'Hotel Lençol Branco',
      type: 'hotel',
      email: 'reservas@lencolbranco.com',
      phone: '+5598999990001',
      address: 'Barreirinhas, MA',
      costPerPerson: 350,
      costPerChild: 180,
      rating: 4.8,
      notes: 'Diária com café da manhã incluso',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: crypto.randomUUID(),
      name: 'Restaurante Sabor do Sertão',
      type: 'restaurante',
      phone: '+5598988880002',
      costPerPerson: 90,
      costPerChild: 45,
      rating: 4.5,
      notes: 'Almoço e jantar',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: crypto.randomUUID(),
      name: 'Transporte 4x4 Aventura',
      type: 'transporte',
      phone: '+5598977770003',
      costPerPerson: 220,
      costPerChild: 110,
      rating: 4.9,
      notes: 'Traslado em veículos 4x4',
      createdAt: ts,
      updatedAt: ts,
    },
  ];
}

export const suppliersStore = createCollection<Supplier>('suppliers', seed);
