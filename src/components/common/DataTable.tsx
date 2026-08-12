import { useEffect, useRef, type ReactNode } from 'react';

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
export function DataTableTd({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  return <td className={['adm-table__td', className].filter(Boolean).join(' ')} title={title}>{children}</td>;
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
    <td className="adm-table__td adm-table__td--select">
      <input type="checkbox" checked={checked} aria-label={ariaLabel} onChange={(e) => onChange(e.target.checked)} />
    </td>
  );
}

/* ── Empty state ── */
export function DataTableEmpty({ icon, label }: { icon?: ReactNode; label: string }) {
  return (
    <tr>
      <td colSpan={100} className="adm-table__empty">
        {icon && <span className="adm-table__empty-icon">{icon}</span>}
        <span>{label}</span>
      </td>
    </tr>
  );
}
