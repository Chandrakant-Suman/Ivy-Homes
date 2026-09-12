// INR formatting (Indian digit grouping) and a compact lakh/crore form.
const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatINR(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return inr.format(n);
}

// 8540000 -> "₹85.4 L", 21400000 -> "₹2.14 Cr"
export function formatINRShort(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  return inr.format(n);
}

export function formatDate(iso) {
  if (!iso) return '—';
  // treat the wall-clock as IST (the API stamps a UTC Z but its clock is IST)
  const d = new Date(iso.replace('Z', '') + '+05:30');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function titleCase(s) {
  if (!s) return '';
  return String(s).replace(/\b\w/g, (c) => c.toUpperCase());
}
