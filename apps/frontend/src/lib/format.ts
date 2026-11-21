// Change CURRENCY / LOCALE here to switch the whole app (e.g. 'INR' + 'en-IN').
const CURRENCY = 'GBP';
const LOCALE = 'en-GB';

export const CURRENCY_CODE = CURRENCY;

const moneyFormatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY });
const compactFormatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, notation: 'compact', maximumFractionDigits: 1 });

export const money = (value: number | string | null | undefined) => moneyFormatter.format(Number(value ?? 0));
export const moneyCompact = (value: number | string | null | undefined) => compactFormatter.format(Number(value ?? 0));

export const formatDate = (value: string | null | undefined) => {
  if (!value) return '-';
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  return date.toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' });
};

export const shortDay = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString(LOCALE, { day: '2-digit', month: 'short' });
};

export const timeAgo = (iso: string) => {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} d ago`;
};

export const daysUntil = (value: string | null | undefined) => {
  if (!value) return null;
  const target = new Date(`${value}T00:00:00`).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today.getTime()) / 86400000);
};
