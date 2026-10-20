import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** The figures under a page header, above its tabs. */
export function StatRow({ children }: { children: ReactNode }) {
  return <div className="dash-stats">{children}</div>;
}

/**
 * One figure: an icon tile, the value, its label (Élance's CompactStatCard).
 * `to` makes the whole tile a link; `tone` colours the value.
 */
export function StatCard({
  icon,
  label,
  value,
  loading,
  tone,
  to,
}: {
  icon?: ReactNode;
  label: ReactNode;
  value: ReactNode;
  loading?: boolean;
  tone?: 'danger' | 'success' | 'warning';
  to?: string;
}) {
  const className = ['dash-stat', tone && `dash-stat--${tone}`, to && 'dash-stat--link'].filter(Boolean).join(' ');
  const content = (
    <>
      {icon && <span className="dash-stat__icon" aria-hidden="true">{icon}</span>}
      <span className="dash-stat__body">
        <span className="dash-stat__value">{loading ? '—' : value}</span>
        <span className="dash-stat__label">{label}</span>
      </span>
    </>
  );
  return to ? <Link to={to} className={className}>{content}</Link> : <div className={className}>{content}</div>;
}
