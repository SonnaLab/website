import type { ComponentType } from 'react';
import {
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
 * The sidebar menus. The page header's badge (PageHeader) reads the same
 * entries, so a menu's icon and label are defined once.
 * `group`: items of a group sit together; a separator marks the next group.
 */
export interface NavEntry {
  to: string;
  /** i18n key, in the `ns` namespace. */
  labelKey: string;
  ns: 'admin' | 'member';
  icon: ComponentType<IconProps>;
  end?: boolean;
  group: number;
}

export const MEMBER_NAV: NavEntry[] = [
  { to: '/dashboard',              end: true, labelKey: 'nav.dashboard',    ns: 'member', icon: LayoutDashboardIcon, group: 1 },
  { to: '/dashboard/appointments',            labelKey: 'nav.appointments', ns: 'member', icon: CalendarIcon,        group: 2 },
  { to: '/dashboard/billing',                 labelKey: 'nav.billing',      ns: 'member', icon: ReceiptIcon,         group: 2 },
];

// Pilotage · plateforme · contenus et comptes · activité client.
export const ADMIN_NAV: NavEntry[] = [
  { to: '/admin/dashboard',      end: true, labelKey: 'nav.dashboard',      ns: 'admin', icon: LayoutDashboardIcon, group: 1 },
  { to: '/admin/infrastructure',            labelKey: 'nav.infrastructure', ns: 'admin', icon: ServerIcon,          group: 2 },
  { to: '/admin/cookies',                   labelKey: 'nav.tracking',       ns: 'admin', icon: CookieIcon,          group: 2 },
  { to: '/admin/news',                      labelKey: 'nav.news',           ns: 'admin', icon: NewsIcon,            group: 3 },
  { to: '/admin/lesankofa',                 labelKey: 'nav.lesankofa',      ns: 'admin', icon: BrainIcon,           group: 3 },
  { to: '/admin/users',                     labelKey: 'nav.users',          ns: 'admin', icon: UsersIcon,           group: 3 },
  { to: '/admin/travaux',                   labelKey: 'nav.travaux',        ns: 'admin', icon: TrafficConeIcon,     group: 4 },
];

/** The menu a path belongs to (e.g. /admin/travaux/42 → Travaux). */
export function navEntryFor(pathname: string): NavEntry | undefined {
  return [...ADMIN_NAV, ...MEMBER_NAV].find((item) =>
    item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`),
  );
}
