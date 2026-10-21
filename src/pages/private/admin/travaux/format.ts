/** Montant entier en euros, espace comme séparateur de milliers (même rendu que le PDF). */
export function formatEuros(euros: number | null | undefined): string {
  if (euros == null || Number.isNaN(euros)) return '—';
  return `${Math.round(euros).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} €`;
}

export function formatCents(cents: number | null | undefined): string {
  return cents == null ? '—' : formatEuros(cents / 100);
}

/** "2026-11-05" → "05/11/2026". */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** "2026-10-21T14:32:00+02:00" → "21/10/2026 14:32" (local time). */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Colour of a due date: past (red) or within a week (amber), unless the
 * work is done. */
export function dueTone(dueOn: string | null | undefined, done: boolean): 'late' | 'soon' | 'ok' {
  if (!dueOn || done) return 'ok';
  const today = todayIso();
  if (dueOn < today) return 'late';
  return dueOn <= addDaysIso(7) ? 'soon' : 'ok';
}

export function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Message d'erreur API (`{ error, details[] }`) pour un toast, sinon le libellé de repli. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { error?: string; details?: string[] } } })?.response?.data;
  if (data?.details?.length) return data.details.join(' ');
  return data?.error || fallback;
}
