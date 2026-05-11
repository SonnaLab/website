type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

export function StatusBadge({ label, variant = 'default', className }: StatusBadgeProps) {
  return (
    <span className={['adm-badge', `adm-badge--${variant}`, className].filter(Boolean).join(' ')}>
      {label}
    </span>
  );
}
