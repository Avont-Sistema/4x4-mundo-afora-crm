// Utilidades de CPF: aceita qualquer formatação de entrada (pontos, hífen,
// espaços ou só números), normaliza para dígitos e valida.

export function cpfDigits(value?: string): string {
  return (value || '').replace(/\D/g, '').slice(0, 11);
}

export function formatCpf(value?: string): string {
  const d = cpfDigits(value);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// Valida o dígito verificador (algoritmo padrão do CPF).
export function isValidCpf(value?: string): boolean {
  const d = cpfDigits(value);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false; // todos os dígitos iguais

  const calcCheckDigit = (base: string) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      sum += Number(base[i]) * (base.length + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const d1 = calcCheckDigit(d.slice(0, 9));
  const d2 = calcCheckDigit(d.slice(0, 9) + d1);
  return d === d.slice(0, 9) + String(d1) + String(d2);
}

// Quantos dígitos ainda faltam para completar os 11 do CPF (0 se já completo).
export function cpfMissingDigits(value?: string): number {
  return Math.max(0, 11 - cpfDigits(value).length);
}

// Mensagem de erro para exibir no formulário, ou null se o CPF é válido.
export function cpfError(value?: string): string | null {
  const d = cpfDigits(value);
  if (!d) return null; // campo vazio: quem exige obrigatoriedade trata separado
  if (d.length < 11) return `CPF incompleto, faltam ${11 - d.length} dígito(s)`;
  if (!isValidCpf(d)) return 'CPF inválido, confira os números';
  return null;
}
