import { useState, useRef, useEffect } from 'react';
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
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@icons';

import { useAuth } from '@/components/providers/AuthProvider';
import { getDashboardPath } from '@/utils/auth';
import sonnaLabLogo from '@/assets/logo/bSonnaLab.png';

interface NavItem { to: string; label: string; icon: React.ReactNode; end?: boolean }

export function MemberLayout() {
  const { t }    = useTranslation('member');
  const { t: tA } = useTranslation('admin');
  const { i18n } = useTranslation();
  const { user, isAdmin, signOut } = useAuth();

  const [collapsed, setCollapsed]       = useState(true);
  const [sidebarHover, setSidebarHover] = useState(false);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [avatarOpen, setAvatarOpen]     = useState(false);
  const avatarRef                       = useRef<HTMLDivElement>(null);

  // Close avatar dropdown on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

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

  const sidebarExpanded = !collapsed || sidebarHover || sidebarOpen;

  return (
    <div
      className="dash-shell"
      data-collapsed={collapsed ? 'true' : 'false'}
      data-sidebar-expanded={sidebarExpanded ? 'true' : 'false'}
    >

      {/* ── Top bar ── */}
      <header className="dash-topbar">
        <div className="dash-topbar__left">
          {/* Mobile hamburger */}
          <button
            className="dash-topbar__hamburger"
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Menu"
          >
            {sidebarOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
          </button>

          {/* Brand — lines up with sidebar width */}
          <Link
            to={getDashboardPath(user?.role)}
            className="dash-topbar__brand"
            onMouseEnter={() => setSidebarHover(true)}
            onMouseLeave={() => setSidebarHover(false)}
          >
            <img
              src="/favicon/favicon-32x32.png"
              alt="SonnaLab"
              className="dash-topbar__favicon"
            />
            <img
              src={sonnaLabLogo}
              alt="SonnaLab"
              className="dash-topbar__logo-full"
            />
          </Link>
        </div>

        <div className="dash-topbar__right">
          {/* Language toggle */}
          <button
            className="dash-btn-lang"
            onClick={() => i18n.changeLanguage(nextLang)}
          >
            <GlobeIcon size={13} />
            <span>{currentLang}</span>
          </button>

          {/* Avatar + dropdown */}
          <div className="dash-avatar-wrap" ref={avatarRef}>
            <button
              className="dash-avatar-btn"
              onClick={() => setAvatarOpen(o => !o)}
              aria-label="Compte"
            >
              {initials}
            </button>

            {avatarOpen && (
              <div className="dash-avatar-dropdown">
                <div className="dash-avatar-info">
                  <span className="dash-avatar-info__name">{displayName}</span>
                  <span className="dash-avatar-info__role">{user?.role}</span>
                </div>

                <Link
                  to="/"
                  className="dash-avatar-menu-item"
                  onClick={() => setAvatarOpen(false)}
                >
                  <ArrowLeftIcon size={14} />
                  {t('nav.backToSite')}
                </Link>

                <button
                  className="dash-avatar-menu-item dash-avatar-menu-item--danger"
                  onClick={() => { setAvatarOpen(false); signOut(); }}
                >
                  <LogOutIcon size={14} />
                  {t('nav.signOut')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="dash-body">

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="dash-overlay dash-overlay--visible" onClick={closeSidebar} />
        )}

        {/* ── Sidebar ── */}
        <aside
          className={`dash-sidebar${sidebarOpen ? ' dash-sidebar--open' : ''}`}
          onMouseEnter={() => setSidebarHover(true)}
          onMouseLeave={() => setSidebarHover(false)}
        >
          <nav className="dash-sidebar__nav">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={closeSidebar}
                title={sidebarExpanded ? undefined : item.label}
                className={({ isActive }) =>
                  'dash-nav-link' + (isActive ? ' active' : '')
                }
              >
                {item.icon}
                <span className="dash-nav-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Collapse toggle */}
          <button
            className="dash-sidebar__toggle"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Déplier la sidebar' : 'Réduire la sidebar'}
          >
            {collapsed ? <ChevronRightIcon size={15} /> : <ChevronLeftIcon size={15} />}
          </button>
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
