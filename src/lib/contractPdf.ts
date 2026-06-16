import { jsPDF } from 'jspdf';
import { TERM_TITLE } from './imageRightsTerm';

// Dados mínimos para montar o PDF (compatível com Contract do contractsStore).
export interface ContractPdfData {
  clientName: string;
  signerCpf?: string;
  expeditionName?: string;
  termSnapshot: string;
  signLine?: string;
  signatureDataUrl: string;
  party?: { name: string; cpf?: string }[];
  signedAt: string;
  ip?: string;
  userAgent?: string;
  hash: string;
  termVersion?: string;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// Gera (e baixa) o contrato digital em PDF a partir dos dados assinados.
// Usado tanto na tela pública (após assinar) quanto no CRM.
export function generateContractPdf(data: ContractPdfData): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Cabeçalho
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  const titleLines = doc.splitTextToSize(TERM_TITLE, contentW);
  doc.text(titleLines, pageW / 2, y, { align: 'center' });
  y += titleLines.length * 6 + 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text('4x4 Mundo Afora', pageW / 2, y, { align: 'center' });
  y += 8;
  doc.setTextColor(0);

  // Corpo do termo (parágrafos)
  doc.setFontSize(10);
  const paragraphs = data.termSnapshot.split(/\n{2,}/);
  for (const para of paragraphs) {
    const lines = doc.splitTextToSize(para.trim(), contentW);
    ensureSpace(lines.length * 4.6 + 3);
    doc.text(lines, margin, y);
    y += lines.length * 4.6 + 3;
  }

  // Linha de local/data
  if (data.signLine) {
    ensureSpace(10);
    y += 4;
    doc.text(data.signLine, margin, y);
    y += 8;
  }

  // Bloco do signatário
  ensureSpace(50);
  y += 2;
  doc.setDrawColor(200);
  doc.line(margin, y, pageW - margin, y);
  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Signatário', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Nome: ${data.clientName}`, margin, y);
  y += 5;
  if (data.signerCpf) {
    doc.text(`CPF: ${data.signerCpf}`, margin, y);
    y += 5;
  }
  if (data.expeditionName) {
    doc.text(`Evento: ${data.expeditionName}`, margin, y);
    y += 5;
  }
  const others = (data.party || []).filter((p) => p.name && p.name !== data.clientName);
  if (others.length) {
    const comp = others.map((p) => (p.cpf ? `${p.name} (${p.cpf})` : p.name)).join('; ');
    const compLines = doc.splitTextToSize(`Comitiva autorizada: ${comp}`, contentW);
    ensureSpace(compLines.length * 5);
    doc.text(compLines, margin, y);
    y += compLines.length * 5;
  }

  // Rubrica (imagem)
  ensureSpace(36);
  y += 4;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('Assinatura (rubrica):', margin, y);
  doc.setTextColor(0);
  y += 2;
  try {
    doc.addImage(data.signatureDataUrl, 'PNG', margin, y, 70, 28);
  } catch {
    // ignora se a imagem falhar
  }
  doc.setDrawColor(180);
  doc.line(margin, y + 30, margin + 70, y + 30);
  y += 34;

  // Rodapé de auditoria (assinatura eletrônica simples)
  ensureSpace(28);
  doc.setDrawColor(200);
  doc.line(margin, y, pageW - margin, y);
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(110);
  const audit = [
    `Assinado eletronicamente em ${formatDateTime(data.signedAt)}.`,
    `IP: ${data.ip || 'n/d'} · Dispositivo: ${(data.userAgent || 'n/d').slice(0, 90)}`,
    `Versão do termo: ${data.termVersion || 'n/d'}`,
    `Código de verificação (SHA-256): ${data.hash}`,
    'Assinatura eletrônica nos termos da MP 2.200-2/2001 (ICP-Brasil) e da LGPD (Lei 13.709/18).',
  ];
  for (const line of audit) {
    const lines = doc.splitTextToSize(line, contentW);
    doc.text(lines, margin, y);
    y += lines.length * 3.8;
  }
  doc.setTextColor(0);

  const safeName = (data.clientName || 'contrato').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 40);
  doc.save(`contrato-uso-imagem-${safeName}.pdf`);
}
