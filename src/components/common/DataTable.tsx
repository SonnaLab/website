import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type MouseEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { DownloadIcon, SearchIcon, XIcon, type IconProps } from '@icons';

/* ── Table container ── */
interface DataTableProps {
  children: ReactNode;
  className?: string;
}

export function DataTable({ children, className }: DataTableProps) {
  return (
    <div className={['adm-table-wrap', className].filter(Boolean).join(' ')}>
      <table className="adm-table">{children}</table>
    </div>
  );
}

/* ── Head ── */
export function DataTableHead({ children }: { children: ReactNode }) {
  return <thead className="adm-table__head">{children}</thead>;
}

/* ── Body ── */
export function DataTableBody({ children }: { children: ReactNode }) {
  return <tbody className="adm-table__body">{children}</tbody>;
}

/* ── Header row ── */
export function DataTableRow({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <tr
      className={['adm-table__row', onClick ? 'adm-table__row--clickable' : '', className].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

/* ── Header cell ── */
export function DataTableTh({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={['adm-table__th', className].filter(Boolean).join(' ')}>{children}</th>;
}

/* ── Data cell ── */
export function DataTableTd({
  children,
  className,
  title,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  /** E.g. stop a clickable row from opening when its actions are used. */
  onClick?: (e: MouseEvent<HTMLTableCellElement>) => void;
}) {
  return <td className={['adm-table__td', className].filter(Boolean).join(' ')} title={title} onClick={onClick}>{children}</td>;
}

/* ── Bulk selection bar (2026-08-13, meme pattern que BaseTable.vue sur
   lecolt.com) : compte a gauche en bg-brand, actions a droite, pas de
   bouton "Deselectionner" (la case a cocher d'en-tete suffit). Rendu par
   le consommateur (ex: News.tsx) au-dessus de DataTable quand une
   selection est active -- DataTable ne possede pas les lignes (elles sont
   mappees par l'appelant), donc l'etat de selection vit cote consommateur,
   pas ici. ── */
export function DataTableBulkBar({ count, children }: { count: number; children: ReactNode }) {
  return (
    <div className="adm-bulk-bar">
      <span className="adm-bulk-count">{count}</span>
      <div className="adm-bulk-actions">{children}</div>
    </div>
  );
}

/* ── Select-all header checkbox ── */
interface DataTableSelectThProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
}

export function DataTableSelectTh({ checked, indeterminate, onChange, ariaLabel }: DataTableSelectThProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate;
  }, [indeterminate]);
  return (
    <th className="adm-table__th adm-table__th--select">
      <input ref={ref} type="checkbox" checked={checked} aria-label={ariaLabel} onChange={(e) => onChange(e.target.checked)} />
    </th>
  );
}

/* ── Row checkbox ── */
interface DataTableSelectTdProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
}

export function DataTableSelectTd({ checked, onChange, ariaLabel }: DataTableSelectTdProps) {
  return (
    // Ticking a box never opens the row (clickable rows).
    <td className="adm-table__td adm-table__td--select" onClick={(e) => e.stopPropagation()}>
      <input type="checkbox" checked={checked} aria-label={ariaLabel} onChange={(e) => onChange(e.target.checked)} />
    </td>
  );
}

/* ── Empty state ── */
export function DataTableEmpty({ icon, label, hint }: { icon?: ReactNode; label: string; hint?: string }) {
  return (
    <tr>
      <td colSpan={100} className="adm-table__empty">
        {icon && <span className="adm-table__empty-icon">{icon}</span>}
        <span>{label}</span>
        {hint && <span className="adm-table__empty-hint">{hint}</span>}
      </td>
    </tr>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   The table standard (every table of the back office and the client
   space): a search bar above, checkboxes for bulk actions, zebra rows,
   icon-only row actions. The helpers below keep each table short.
   ══════════════════════════════════════════════════════════════════════ */

/** Search box (icon + input) — filtering is dynamic, as you type. */
export function DataTableSearch({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  const { t } = useTranslation('common');
  return (
    <div className="adm-search adm-table-search">
      <SearchIcon size={15} />
      <input
        type="search"
        className="adm-search__input"
        value={value}
        placeholder={placeholder ?? t('table.search')}
        aria-label={placeholder ?? t('table.search')}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** Above a table: the search on the left, filters/buttons on the right. */
export function DataTableToolbar({ children, right }: { children?: ReactNode; right?: ReactNode }) {
  return (
    <div className="adm-table-toolbar">
      <div className="adm-table-toolbar__left">{children}</div>
      {right && <div className="adm-table-toolbar__right">{right}</div>}
    </div>
  );
}

/** A row action: always an icon, its label in the tooltip and for screen readers. */
export function DataTableAction({
  icon: Icon, label, onClick, variant = 'default', disabled, href,
}: {
  icon: ComponentType<IconProps>;
  label: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  variant?: 'default' | 'danger' | 'success';
  disabled?: boolean;
  href?: string;
}) {
  const className = `adm-icon-action adm-icon-action--${variant}`;
  if (href) {
    return <a className={className} href={href} title={label} aria-label={label} target="_blank" rel="noreferrer"><Icon size={14} /></a>;
  }
  return (
    <button
      type="button"
      className={className}
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
    >
      <Icon size={14} />
    </button>
  );
}

/** Rows whose listed fields contain the query (case and accents ignored). */
export function filterRows<T>(rows: T[], query: string, fields: (row: T) => Array<string | number | null | undefined>): T[] {
  const q = normalize(query);
  if (!q) return rows;
  return rows.filter((row) => fields(row).some((value) => value != null && normalize(String(value)).includes(q)));
}

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/**
 * Selection of the rows shown (by id): header checkbox state, toggles, and
 * the selected rows themselves. Changing the visible rows drops what is no
 * longer shown.
 */
export function useRowSelection<T>(rows: T[], idOf: (row: T) => string) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const visible = useMemo(() => new Set(rows.map(idOf)), [rows, idOf]);
  useEffect(() => {
    setIds((current) => {
      const kept = [...current].filter((id) => visible.has(id));
      return kept.length === current.size ? current : new Set(kept);
    });
  }, [visible]);

  const toggle = useCallback((id: string, checked: boolean) => setIds((current) => {
    const next = new Set(current);
    if (checked) next.add(id); else next.delete(id);
    return next;
  }), []);
  const toggleAll = useCallback((checked: boolean) => setIds(checked ? new Set(visible) : new Set()), [visible]);
  const clear = useCallback(() => setIds(new Set()), []);

  return {
    ids,
    count: ids.size,
    isSelected: (id: string) => ids.has(id),
    toggle,
    toggleAll,
    clear,
    allChecked: visible.size > 0 && [...visible].every((id) => ids.has(id)),
    someChecked: ids.size > 0 && ![...visible].every((id) => ids.has(id)),
    selectedRows: rows.filter((row) => ids.has(idOf(row))),
  };
}

/** The selected rows as a CSV file (Excel-friendly: « ; » and a BOM). Call from a handler only. */
export function exportRowsCsv<T>(filename: string, columns: Array<[string, (row: T) => unknown]>, rows: T[]) {
  const cell = (value: unknown) => {
    const text = value == null ? '' : String(value);
    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [columns.map(([label]) => cell(label)).join(';'), ...rows.map((row) => columns.map(([, get]) => cell(get(row))).join(';'))];
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: filename.endsWith('.csv') ? filename : `${filename}.csv` });
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Bulk bar with the selection count, the table's actions, CSV export and « clear ». */
export function DataTableSelectionBar({ count, onExport, onClear, children }: { count: number; onExport?: () => void; onClear: () => void; children?: ReactNode }) {
  const { t } = useTranslation('common');
  if (count === 0) return null;
  return (
    <div className="adm-bulk-bar adm-bulk-bar--floating" role="region" aria-label={t('table.selected', { count })}>
      <span className="adm-bulk-count">{count}</span>
      <span className="adm-bulk-label">{t('table.selected', { count })}</span>
      <div className="adm-bulk-actions">
        {children}
        {onExport && (
          <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={onExport}>
            <DownloadIcon size={13} /> {t('table.export')}
          </button>
        )}
        <button type="button" className="adm-icon-action" title={t('table.clear')} aria-label={t('table.clear')} onClick={onClear}>
          <XIcon size={14} />
        </button>
      </div>
    </div>
  );
}
