// Gerador de PIX "copia e cola" (BR Code / EMV) — taxa ZERO, sem provedor.
// O cliente paga direto na sua chave PIX (ex: Nubank). Confirmação é manual.

function removeAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// CRC16-CCITT (0x1021), inicial 0xFFFF — exigido pelo padrão do BR Code
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Campo EMV: id + tamanho(2) + valor
function field(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

export interface PixParams {
  key: string; // chave PIX (cpf, email, telefone, aleatória)
  merchantName: string;
  merchantCity: string;
  amount?: number;
  txid?: string;
  description?: string;
}

export function buildPixPayload(p: PixParams): string {
  const name = removeAccents(p.merchantName).toUpperCase().slice(0, 25);
  const city = removeAccents(p.merchantCity).toUpperCase().slice(0, 15);

  // Merchant Account Information (26)
  let mai = field('00', 'br.gov.bcb.pix') + field('01', p.key);
  if (p.description) {
    mai += field('02', removeAccents(p.description).slice(0, 40));
  }

  // Additional Data Field (62) — txid
  const txid = (p.txid || '***').slice(0, 25);
  const adf = field('05', txid);

  let payload =
    field('00', '01') + // Payload Format Indicator
    field('01', '12') + // Point of Initiation — uso único (com valor)
    field('26', mai) +
    field('52', '0000') + // Merchant Category Code
    field('53', '986') + // Moeda BRL
    (p.amount ? field('54', p.amount.toFixed(2)) : '') +
    field('58', 'BR') + // País
    field('59', name) +
    field('60', city) +
    field('62', adf);

  payload += '6304'; // ID + tamanho do CRC
  payload += crc16(payload);
  return payload;
}
