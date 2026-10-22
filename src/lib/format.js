const inrFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const numFmt = new Intl.NumberFormat('en-IN');

export const inr = (n) => inrFmt.format(Number(n) || 0);
export const num = (n) => numFmt.format(Number(n) || 0);

// Compact amount for chart labels: ₹1.2L, ₹45K
export function inrShort(n) {
  n = Number(n) || 0;
  const a = Math.abs(n);
  if (a >= 1e7) return `₹${(n / 1e7).toFixed(1).replace(/\.0$/, '')}Cr`;
  if (a >= 1e5) return `₹${(n / 1e5).toFixed(1).replace(/\.0$/, '')}L`;
  if (a >= 1e3) return `₹${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
  return `₹${n}`;
}

export function fmtDate(iso, lang = 'en') {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function fmtDateTime(iso, lang = 'en') {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d - off).toISOString().slice(0, 10);
}

// Default date for a new entry: today in the current year, otherwise 1 Oct of the selected year.
export function defaultDate(year) {
  const t = todayISO();
  return t.startsWith(String(year)) ? t : `${year}-10-01`;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export const sum = (rows, key = 'amount') =>
  rows.reduce((s, r) => s + (Number(typeof key === 'function' ? key(r) : r[key]) || 0), 0);

export function groupSum(rows, keyFn, valKey = 'amount') {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    m.set(k, (m.get(k) || 0) + (Number(r[valKey]) || 0));
  }
  return m;
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

// Indian numbering system, e.g. 12501 -> "Twelve Thousand Five Hundred One"
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n) {
  if (n < 20) return ONES[n];
  return (TENS[Math.floor(n / 10)] + ' ' + ONES[n % 10]).trim();
}

export function amountInWords(amount) {
  let n = Math.floor(Number(amount) || 0);
  if (n === 0) return 'Zero';
  const parts = [];
  const crore = Math.floor(n / 1e7); n %= 1e7;
  const lakh = Math.floor(n / 1e5); n %= 1e5;
  const thousand = Math.floor(n / 1000); n %= 1000;
  const hundred = Math.floor(n / 100); n %= 100;
  if (crore) parts.push(amountInWords(crore) + ' Crore');
  if (lakh) parts.push(twoDigits(lakh) + ' Lakh');
  if (thousand) parts.push(twoDigits(thousand) + ' Thousand');
  if (hundred) parts.push(ONES[hundred] + ' Hundred');
  if (n) parts.push(twoDigits(n));
  return parts.join(' ');
}

export function phoneDigits(p = '') {
  const d = String(p).replace(/\D/g, '');
  if (d.length === 10) return '91' + d;
  return d;
}

export const telLink = (p) => `tel:${String(p).replace(/[^\d+]/g, '')}`;
export const waLink = (p, text = '') =>
  `https://wa.me/${phoneDigits(p)}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
