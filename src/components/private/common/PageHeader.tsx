import type { ComponentType, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

import type { IconProps } from '@icons';
import { navEntryFor } from '@/components/private/member/navigation';

export interface PageBadge {
  icon: ComponentType<IconProps>;
  label: string;
}

/**
 * Every back-office page opens the same way (as on Élance):
 *   [ menu badge ]                       ← black tag: the menu's icon + name
 *   Icon  Big title                      [ CTA buttons ]
 *   description
 * then, in the page itself, the stat row (StatRow) and the tabs.
 * The badge comes from the sidebar entry of the current route; pass `badge`
 * for a page outside the menus, or `badge={null}` to drop it.
 */
export function PageHeader({
  icon,
  title,
  description,
  actions,
  badge,
  documentTitle,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  badge?: PageBadge | null;
  /** The browser tab's title when `title` is not plain text (else the title, else the menu). */
  documentTitle?: string;
}) {
  const section = useSectionBadge();
  const shown = badge === undefined ? section : badge;
  const BadgeIcon = shown?.icon;
  const tabTitle = documentTitle ?? (typeof title === 'string' ? title : shown?.label);
  return (
    <header className="dash-page-header">
      {/* « Gestion de l'infrastructure | SonnaLab »; private pages are never indexed. */}
      {tabTitle && (
        <Helmet>
          <title>{`${tabTitle} | SonnaLab`}</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
      )}
      <div className="dash-page-header__main">
        {shown && BadgeIcon && (
          <span className="dash-page-header__badge">
            <BadgeIcon size={14} aria-hidden="true" />
            {shown.label}
          </span>
        )}
        <div className="dash-page-header__title">
          {icon && <span className="dash-page-header__icon" aria-hidden="true">{icon}</span>}
          <h1>{title}</h1>
        </div>
        {description && <p className="dash-page-header__desc">{description}</p>}
      </div>
      {actions && <div className="dash-page-header__actions">{actions}</div>}
    </header>
  );
}

/** The sidebar entry (icon + label) of the current route, if any. */
export function useSectionBadge(): PageBadge | undefined {
  const { pathname } = useLocation();
  const { t } = useTranslation('admin');
  const { t: tM } = useTranslation('member');
  const entry = navEntryFor(pathname);
  if (!entry) return undefined;
  return { icon: entry.icon, label: entry.ns === 'admin' ? t(entry.labelKey) : tM(entry.labelKey) };
}
