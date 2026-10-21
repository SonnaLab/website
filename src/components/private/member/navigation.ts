import type { ComponentType } from 'react';
import {
  AtSignIcon,
  BrainIcon,
  CalendarIcon,
  CookieIcon,
  LayoutDashboardIcon,
  NewsIcon,
  ReceiptIcon,
  ServerIcon,
  TrafficConeIcon,
  UsersIcon,
  type IconProps,
} from '@icons';

/**
 * The sidebar menus, a divider between each. The page header's badge
 * (PageHeader) reads the same entries, so a menu's icon and label are
 * defined once.
 */
export interface NavEntry {
  to: string;
  /** i18n key, in the `ns` namespace. */
  labelKey: string;
  ns: 'admin' | 'member';
  icon: ComponentType<IconProps>;
  end?: boolean;
}

export const MEMBER_NAV: NavEntry[] = [
  { to: '/dashboard',              end: true, labelKey: 'nav.dashboard',    ns: 'member', icon: LayoutDashboardIcon },
  { to: '/dashboard/appointments',            labelKey: 'nav.appointments', ns: 'member', icon: CalendarIcon },
  { to: '/dashboard/billing',                 labelKey: 'nav.billing',      ns: 'member', icon: ReceiptIcon },
];

export const ADMIN_NAV: NavEntry[] = [
  { to: '/admin/dashboard',      end: true, labelKey: 'nav.dashboard',      ns: 'admin', icon: LayoutDashboardIcon },
  { to: '/admin/infrastructure',            labelKey: 'nav.infrastructure', ns: 'admin', icon: ServerIcon },
  { to: '/admin/cookies',                   labelKey: 'nav.tracking',       ns: 'admin', icon: CookieIcon },
  { to: '/admin/news',                      labelKey: 'nav.news',           ns: 'admin', icon: NewsIcon },
  { to: '/admin/mailing',                   labelKey: 'nav.mailing',        ns: 'admin', icon: AtSignIcon },
  { to: '/admin/lesankofa',                 labelKey: 'nav.lesankofa',      ns: 'admin', icon: BrainIcon },
  { to: '/admin/users',                     labelKey: 'nav.users',          ns: 'admin', icon: UsersIcon },
  { to: '/admin/travaux',                   labelKey: 'nav.travaux',        ns: 'admin', icon: TrafficConeIcon },
];

/** The menu a path belongs to (e.g. /admin/travaux/42 → Travaux). */
export function navEntryFor(pathname: string): NavEntry | undefined {
  return [...ADMIN_NAV, ...MEMBER_NAV].find((item) =>
    item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`),
  );
}
