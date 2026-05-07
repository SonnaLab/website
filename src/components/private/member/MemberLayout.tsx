import { ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
  LayoutDashboardIcon,
  CalendarIcon,
  FolderKanbanIcon,
  ReceiptIcon,
  ServerIcon,
  LineChartIcon,
  BotIcon,
  SearchIcon,
  LogOutIcon,
  ArrowLeftIcon,
  UserIcon,
  GlobeIcon,
} from '@icons';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavItem { to: string; label: string; icon: ReactNode; end?: boolean }

/**
 * Authenticated shell: top **navbar** + left **sidebar** (the SaaS combo
 * requested by the user). Sidebar holds section navigation, navbar holds
 * brand + language + user menu (sign-out, back to public site).
 */
export function MemberLayout() {
  const { t }                      = useTranslation('member');
  const { t: tAdmin }              = useTranslation('admin');
  const { i18n }                   = useTranslation();
  const { user, isAdmin, signOut } = useAuth();

  const memberNav: NavItem[] = [
    { to: '/member',              end: true, label: t('nav.dashboard'),    icon: <LayoutDashboardIcon size={16} /> },
    { to: '/member/appointments',            label: t('nav.appointments'), icon: <CalendarIcon         size={16} /> },
    { to: '/member/projects',                label: t('nav.projects'),     icon: <FolderKanbanIcon     size={16} /> },
    { to: '/member/billing',                 label: t('nav.billing'),      icon: <ReceiptIcon          size={16} /> },
  ];
  const adminNav: NavItem[] = [
    { to: '/admin/infrastructure', label: tAdmin('nav.infrastructure'), icon: <ServerIcon    size={16} /> },
    { to: '/admin/tracking',       label: tAdmin('nav.tracking'),       icon: <LineChartIcon size={16} /> },
    { to: '/admin/ouou',           label: tAdmin('nav.ouou'),           icon: <BotIcon       size={16} /> },
    { to: '/admin/seo',            label: tAdmin('nav.seo'),            icon: <SearchIcon    size={16} /> },
  ];

  const switchLanguage = (lng: string) => i18n.changeLanguage(lng);

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* === Top navbar === */}
      <header className="sticky top-0 z-30 h-14 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6">
        <Link to="/member" className="text-base font-semibold text-foreground">
          SonnaLab
        </Link>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <GlobeIcon size={16} />
                <span className="uppercase">{i18n.language?.slice(0, 2)}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => switchLanguage('fr')}>Français</DropdownMenuItem>
              <DropdownMenuItem onClick={() => switchLanguage('en')}>English</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <UserIcon size={16} />
                <span className="hidden sm:inline truncate max-w-[140px]">
                  {user?.first_name || user?.email}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.email}
                </p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/" className="flex items-center gap-2">
                  <ArrowLeftIcon size={16} /> {t('nav.backToSite')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut} className="flex items-center gap-2">
                <LogOutIcon size={16} /> {t('nav.signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* === Combo: left sidebar + main === */}
      <div className="flex-1 flex min-h-0">
        <aside className="hidden md:flex w-60 shrink-0 flex-col bg-card border-r border-border">
          <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
            {memberNav.map((item) => <SideLink key={item.to} item={item} />)}
            {isAdmin && (
              <>
                <div className="mt-6 mb-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                  Admin
                </div>
                {adminNav.map((item) => <SideLink key={item.to} item={item} />)}
              </>
            )}
          </nav>
        </aside>

        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-10 overflow-x-hidden">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function SideLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
        ].join(' ')
      }
    >
      {item.icon}
      <span>{item.label}</span>
    </NavLink>
  );
}
