// Constantes/tipos puros (sem acesso a fs) — podem ser importados tanto no
// servidor quanto em componentes client ('use client').

export type BillingMode = 'per_person' | 'per_car' | 'flat' | 'per_room';

export const BILLING_LABELS: Record<BillingMode, string> = {
  per_person: 'Por pessoa (adulto/criança)',
  per_car: 'Por carro/veículo',
  flat: 'Valor fixo (flat)',
  per_room: 'Por quarto/diária',
};

// Linha "uma pessoa por linha" usada na planilha do fornecedor
export interface PersonRow {
  name: string;
  role: string;
  document: string;
  age: string;
  birthDate: string;
  shirt: string;
  phone: string;
  email: string;
  cityState: string;
  address: string;
  job: string;
  vehicle: string;
  plate: string;
  roomConfig: string;
  pet: string;
  emergency: string;
  responsible: string;
  notes: string;
  isChild: boolean;
}

// Campos que cada fornecedor pode escolher exportar
export const EXPORT_FIELDS: { id: keyof PersonRow; label: string }[] = [
  { id: 'name', label: 'Nome' },
  { id: 'role', label: 'Tipo' },
  { id: 'document', label: 'CPF' },
  { id: 'age', label: 'Idade' },
  { id: 'birthDate', label: 'Nascimento' },
  { id: 'shirt', label: 'Camiseta' },
  { id: 'phone', label: 'Telefone' },
  { id: 'email', label: 'E-mail' },
  { id: 'cityState', label: 'Cidade/UF' },
  { id: 'address', label: 'Endereço' },
  { id: 'job', label: 'Profissão' },
  { id: 'vehicle', label: 'Veículo' },
  { id: 'plate', label: 'Placa' },
  { id: 'roomConfig', label: 'Config. Quarto' },
  { id: 'pet', label: 'Pet' },
  { id: 'emergency', label: 'Contato Emergência' },
  { id: 'responsible', label: 'Responsável (carro)' },
  { id: 'notes', label: 'Observações' },
];

export const DEFAULT_EXPORT_FIELDS: (keyof PersonRow)[] = [
  'name',
  'role',
  'document',
  'responsible',
];
