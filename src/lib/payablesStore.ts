import { createCollection, type BaseRecord } from './jsonCollection';

export type PayableType = 'fornecedor' | 'despesa' | 'comissao' | 'outro';
export type PayableStatus = 'pendente' | 'pago';

export interface Payable extends BaseRecord {
  description: string;
  amount: number;
  type: PayableType;
  status: PayableStatus;
  dueDate?: string;
  paidAt?: string;
  expeditionId?: string;
  expeditionName?: string;
  supplierId?: string;
  supplierName?: string;
  category?: string;
}

function seed(): Payable[] {
  return [];
}

export const payablesStore = createCollection<Payable>('payables', seed);
