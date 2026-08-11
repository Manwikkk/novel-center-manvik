export function formatReportCurrency(n) {
  const v = Number(n) || 0;
  return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function formatReportMetric(m) {
  if (!m) return '';
  if (m.format === 'currency') return formatReportCurrency(m.value);
  if (m.format === 'number') return Number(m.value || 0).toLocaleString('en-IN');
  return String(m.value ?? '');
}

export function formatReportDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
