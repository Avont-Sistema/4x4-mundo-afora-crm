import { createCollection, type BaseRecord } from './jsonCollection';
import { kvLoad, kvSave } from './kvStore';
import { DEFAULT_IMAGE_RIGHTS_TERM, DEFAULT_SIGN_CITY } from './imageRightsTerm';

// Contrato digital assinado (termo de uso de imagem + rubrica + trilha de auditoria).
export interface SignParty {
  name: string;
  cpf?: string;
}

export interface Contract extends BaseRecord {
  clientId: string;
  clientName: string;
  signerCpf?: string;
  expeditionId?: string;
  expeditionName?: string;
  termVersion: string;
  termSnapshot: string; // texto integral do termo no momento da assinatura
  signLine?: string; // "Cidade/UF, dd de mês de aaaa."
  signatureDataUrl: string; // PNG (data URL) da rubrica desenhada
  party: SignParty[]; // titular + acompanhantes cobertos pela autorização
  signedAt: string; // ISO
  ip?: string;
  userAgent?: string;
  hash: string; // SHA-256 da prova (termo + cpf + data + assinatura)
}

export const contractsStore = createCollection<Contract>('contracts', () => []);

// ---- Template editável do termo (persistido no kvStore / Supabase) ----
const TEMPLATE_KEY = 'image_rights_term';

export interface TermTemplate {
  template: string;
  signCity: string;
}

export async function getTermTemplate(): Promise<TermTemplate> {
  const saved = await kvLoad<Partial<TermTemplate>>(TEMPLATE_KEY);
  return {
    template: saved?.template || DEFAULT_IMAGE_RIGHTS_TERM,
    signCity: saved?.signCity || DEFAULT_SIGN_CITY,
  };
}

export async function saveTermTemplate(patch: Partial<TermTemplate>): Promise<TermTemplate> {
  const current = await getTermTemplate();
  const next: TermTemplate = {
    template: patch.template ?? current.template,
    signCity: patch.signCity ?? current.signCity,
  };
  await kvSave(TEMPLATE_KEY, next);
  return next;
}
