export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

const LONG_DATE_FORMATTER = new Intl.DateTimeFormat('es-EC', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * Convierte una fecha ISO corta (`YYYY-MM-DD`) en "16 de noviembre de 2026".
 * La fecha se arma con componentes locales a propósito: `new Date('2026-11-16')`
 * se interpreta como UTC y en Ecuador (UTC-5) mostraría el día anterior.
 */
export function formatLongDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const hasCompleteDate = Boolean(year) && Boolean(month) && Boolean(day);
  if (!hasCompleteDate) {
    return isoDate;
  }

  const date = new Date(year, month - 1, day);
  return LONG_DATE_FORMATTER.format(date);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}
