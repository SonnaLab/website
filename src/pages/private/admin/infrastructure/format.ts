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

const DOW_NAMES: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

/** One cron field (« * », « *\/15 », « 1-5 », « 0,30 », « sun ») → the allowed values. */
function cronField(field: string, min: number, max: number, names?: Record<string, number>): Set<number> | null {
  const out = new Set<number>();
  for (const part of field.toLowerCase().split(',')) {
    const [range, stepRaw] = part.split('/');
    const step = stepRaw ? Number(stepRaw) : 1;
    const value = (s: string) => (names && s.slice(0, 3) in names ? names[s.slice(0, 3)] : Number(s));
    let [lo, hi] = [min, max];
    if (range !== '*') {
      const [a, b] = range.split('-');
      lo = value(a);
      hi = b !== undefined ? value(b) : (stepRaw ? max : lo);
    }
    if ([lo, hi, step].some((n) => Number.isNaN(n)) || step < 1) return null;
    for (let n = lo; n <= hi; n += step) out.add(names && n === 7 ? 0 : n);
  }
  return out;
}

/** Next run of a Celery beat crontab (UTC, every field must match), within a year. */
export function nextCronRunUtc(cron: string | null, from: Date = new Date()): string | null {
  if (!cron) return null;
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [mins, hours, doms, mons, dows] = [
    cronField(parts[0], 0, 59), cronField(parts[1], 0, 23), cronField(parts[2], 1, 31),
    cronField(parts[3], 1, 12), cronField(parts[4], 0, 6, DOW_NAMES),
  ];
  if (!mins || !hours || !doms || !mons || !dows) return null;
  const sortedHours = [...hours].sort((a, b) => a - b);
  const sortedMins = [...mins].sort((a, b) => a - b);
  const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  for (let day = 0; day < 370; day += 1) {
    const d = new Date(start.getTime() + day * 86_400_000);
    if (!doms.has(d.getUTCDate()) || !mons.has(d.getUTCMonth() + 1) || !dows.has(d.getUTCDay())) continue;
    for (const h of sortedHours) {
      for (const m of sortedMins) {
        const at = new Date(d.getTime() + (h * 60 + m) * 60_000);
        if (at > from) return at.toISOString();
      }
    }
  }
  return null;
}
