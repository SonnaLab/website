import type { TFunction } from 'i18next';

/** « 12,4 Mo ». */
export function formatBytes(bytes: number | null | undefined, locale: string): string {
  if (bytes == null) return '—';
  const units = ['o', 'Ko', 'Mo', 'Go', 'To'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: unit ? 1 : 0 }).format(value);
  return `${n} ${locale.startsWith('en') ? units[unit].replace('o', 'B') : units[unit]}`;
}

export function formatDateTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

export function formatNumber(n: number | null | undefined, locale: string): string {
  return n == null ? '—' : new Intl.NumberFormat(locale).format(n);
}

/** « m h * * * » → « Tous les jours à 02:30 »; « m h * * d » → weekly; else the raw cron. */
export function cronLabel(cron: string | null, t: TFunction): string {
  if (!cron) return '—';
  const [m, h, dom, mon, dow] = cron.split(/\s+/);
  const time = /^\d+$/.test(m) && /^\d+$/.test(h) ? `${h.padStart(2, '0')}:${m.padStart(2, '0')}` : null;
  if (time && dom === '*' && mon === '*' && dow === '*') return t('infrastructure.cron.daily', { time });
  if (time && dom === '*' && mon === '*' && /^\d$/.test(dow)) {
    return t('infrastructure.cron.weekly', { time, day: t(`infrastructure.cron.days.${dow}`) });
  }
  if (time && dom === '1' && dow === '*') {
    if (mon === '*') return t('infrastructure.cron.monthly', { time });
    const months = mon.split(',').map((n) => t(`infrastructure.cron.months.${n}`));
    return months.length === 1
      ? t('infrastructure.cron.yearly', { time, month: months[0] })
      : t('infrastructure.cron.someMonths', { time, months: months.join(', ') });
  }
  if (/^\d+$/.test(m) && h === '*' && dom === '*') return t('infrastructure.cron.hourly', { minute: m.padStart(2, '0') });
  return cron;
}
