import { ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  FolderKanban,
  Receipt,
  LayoutDashboard,
  LogOut,
  ArrowLeft,
  Server,
  LineChart,
  Bot,
  Search,
} from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { Button } from '../ui/button';

interface NavItem {
  to: string;
  labelKey: string;
  icon: ReactNode;
  end?: boolean;
}

/**
 * Member-area shell: sober sidebar + main panel, no global Header/Footer.
 * Admin-only items are appended dynamically when the current user is admin.
 */
export function MemberLayout() {
  const { t }            = useTranslation('member');
  const { t: tAdmin }    = useTranslation('admin');
  const { user, isAdmin, signOut } = useAuth();

  const memberNav: NavItem[] = [
    { to: '/member',              end: true, labelKey: t('nav.dashboard'),    icon: <LayoutDashboard className="size-4" /> },
    { to: '/member/appointments',            labelKey: t('nav.appointments'), icon: <Calendar         className="size-4" /> },
    { to: '/member/projects',                labelKey: t('nav.projects'),     icon: <FolderKanban     className="size-4" /> },
    { to: '/member/billing',                 labelKey: t('nav.billing'),      icon: <Receipt          className="size-4" /> },
  ];

  const adminNav: NavItem[] = [
    { to: '/admin/infrastructure', labelKey: tAdmin('nav.infrastructure'), icon: <Server    className="size-4" /> },
    { to: '/admin/tracking',       labelKey: tAdmin('nav.tracking'),       icon: <LineChart className="size-4" /> },
    { to: '/admin/ouou',           labelKey: tAdmin('nav.ouou'),           icon: <Bot       className="size-4" /> },
    { to: '/admin/seo',            labelKey: tAdmin('nav.seo'),            icon: <Search    className="size-4" /> },
  ];

  return (
    <div className="min-h-screen bg-secondary flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-card border-r border-border">
        <div className="px-6 py-5 border-b border-border">
          <Link to="/" className="text-base font-semibold text-foreground">SonnaLab</Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
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

        <div className="px-3 py-4 border-t border-border space-y-2">
          <div className="px-3">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.first_name || user?.email}
            </p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="w-full justify-start">
            <Link to="/"><ArrowLeft className="size-4 mr-2" />{t('nav.backToSite')}</Link>
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
            <LogOut className="size-4 mr-2" />{t('nav.signOut')}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border">
          <Link to="/member" className="text-base font-semibold text-foreground">SonnaLab</Link>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="size-4" />
          </Button>
        </header>

        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-10">
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
      <span>{item.labelKey}</span>
    </NavLink>
  );
}
