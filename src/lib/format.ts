export function formatBRL(value: number | undefined | null): string {
  return (value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value.length <= 10 ? value + 'T12:00:00' : value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}
