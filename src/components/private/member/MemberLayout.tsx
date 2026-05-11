import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
  LayoutDashboardIcon,
  CalendarIcon,
  FolderKanbanIcon,
  ReceiptIcon,
  ServerIcon,
  LineChartIcon,
  LogOutIcon,
  ArrowLeftIcon,
  GlobeIcon,
  MenuIcon,
  XIcon,
  NewsIcon,
  UsersIcon,
} from '@icons';

import { useAuth } from '@/components/providers/AuthProvider';
import { getDashboardPath } from '@/utils/auth';
import sonnaLabLogo from '@/assets/logo/bSonnaLab.png';

interface NavItem { to: string; label: string; icon: React.ReactNode; end?: boolean }

/**
 * Authenticated shell — sidebar + topbar, native CSS only (no Tailwind).
 * Sidebar items are exclusive per role:
 *   user/staff → member nav
 *   admin      → admin nav
 */
export function MemberLayout() {
  const { t }       = useTranslation('member');
  const { t: tA }   = useTranslation('admin');
  const { i18n }    = useTranslation();
  const { user, isAdmin, signOut } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = () => setSidebarOpen(false);

  const memberNav: NavItem[] = [
    { to: '/dashboard',              end: true, label: t('nav.dashboard'),    icon: <LayoutDashboardIcon size={16} /> },
    { to: '/dashboard/appointments',            label: t('nav.appointments'), icon: <CalendarIcon        size={16} /> },
    { to: '/dashboard/projects',                label: t('nav.projects'),     icon: <FolderKanbanIcon    size={16} /> },
    { to: '/dashboard/billing',                 label: t('nav.billing'),      icon: <ReceiptIcon         size={16} /> },
  ];

  const adminNav: NavItem[] = [
    { to: '/admin/dashboard',      end: true, label: tA('nav.dashboard'),      icon: <LayoutDashboardIcon size={16} /> },
    { to: '/admin/infrastructure',            label: tA('nav.infrastructure'), icon: <ServerIcon          size={16} /> },
    { to: '/admin/tracking',                  label: tA('nav.tracking'),       icon: <LineChartIcon       size={16} /> },
    { to: '/admin/news',                      label: tA('nav.news'),           icon: <NewsIcon            size={16} /> },
    { to: '/admin/users',                     label: tA('nav.users'),          icon: <UsersIcon           size={16} /> },
    { to: '/dashboard/billing',               label: tA('nav.billing'),        icon: <ReceiptIcon         size={16} /> },
    { to: '/dashboard/projects',              label: tA('nav.projects'),       icon: <FolderKanbanIcon    size={16} /> },
  ];

  const navItems = isAdmin ? adminNav : memberNav;

  const currentLang = i18n.language?.slice(0, 2) || 'fr';
  const nextLang    = currentLang === 'fr' ? 'en' : 'fr';

  const initials = user?.first_name
    ? (user.first_name[0] + (user.last_name?.[0] || '')).toUpperCase()
    : (user?.email?.[0] || '?').toUpperCase();

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : user?.email ?? '';

  return (
    <div className="dash-shell">

      {/* ── Top bar ── */}
      <header className="dash-topbar">
        <div className="dash-topbar__left">
          <button
            className="dash-topbar__hamburger"
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Menu"
          >
            {sidebarOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
          </button>
          <Link to={getDashboardPath(user?.role)} className="dash-topbar__brand">
            <img src={sonnaLabLogo} alt="SonnaLab" className="dash-topbar__logo" />
          </Link>
        </div>

        <div className="dash-topbar__actions">
          <button
            className="dash-btn-ghost"
            onClick={() => i18n.changeLanguage(nextLang)}
            title={nextLang === 'fr' ? 'Passer en français' : 'Switch to English'}
          >
            <GlobeIcon size={14} />
            <span>{currentLang}</span>
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="dash-body">

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="dash-overlay dash-overlay--visible"
            onClick={closeSidebar}
          />
        )}

        {/* ── Sidebar ── */}
        <aside className={`dash-sidebar${sidebarOpen ? ' dash-sidebar--open' : ''}`}>
          <nav className="dash-sidebar__nav">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  'dash-nav-link' + (isActive ? ' active' : '')
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User info + actions */}
          <footer className="dash-sidebar__footer">
            <div className="dash-user-badge">
              <div className="dash-user-badge__avatar">{initials}</div>
              <div className="dash-user-badge__info">
                <div className="dash-user-badge__name">{displayName}</div>
                <div className="dash-user-badge__role">{user?.role}</div>
              </div>
            </div>

            <Link to="/" className="dash-footer-link" onClick={closeSidebar}>
              <ArrowLeftIcon size={15} />
              <span>{t('nav.backToSite')}</span>
            </Link>

            <button onClick={signOut} className="dash-footer-link dash-footer-link--signout">
              <LogOutIcon size={15} />
              <span>{t('nav.signOut')}</span>
            </button>
          </footer>
        </aside>

        {/* ── Main content ── */}
        <main className="dash-main">
          <div className="dash-main__inner">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  );
}

