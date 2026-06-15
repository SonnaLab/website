import type { ReactNode } from 'react';

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
