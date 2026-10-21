import { Fragment, useState, useRef, useEffect } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
  LineChartIcon,
  LogOutIcon,
  ArrowRightIcon,
  LanguagesIcon,
  MenuIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowRightFromLineIcon,
  EyeIcon,
  UserIcon,
  HotelIcon,
} from '@icons';

import { useAuth } from '@/components/providers/AuthProvider';
import { ConfirmProvider } from '@/components/common/ConfirmDialog';
import { getDashboardPath } from '@/utils/auth';
import { ADMIN_NAV, MEMBER_NAV } from './navigation';
import sonnaLabLogo from '@/assets/logo/bSonnaLab.png';

export function MemberLayout() {
  const { t }    = useTranslation('member');
  const { t: tA } = useTranslation('admin');
  const { i18n } = useTranslation();
  const { user, isAdmin, signOut, impersonatingAdmin, stopImpersonating } = useAuth();

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

  const navItems = (isAdmin ? ADMIN_NAV : MEMBER_NAV).map((item) => ({
    ...item,
    label: item.ns === 'admin' ? tA(item.labelKey) : t(item.labelKey),
  }));

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
      data-impersonating={impersonatingAdmin ? 'true' : undefined}
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
              src="/favicon/android-chrome-192x192.png"
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
            <LanguagesIcon size={16} />
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

                <Link to="/dashboard/profile" className="dash-avatar-menu-item" onClick={() => setAvatarOpen(false)}>
                  <UserIcon size={14} />
                  {t('nav.profile')}
                </Link>
                {(isAdmin || user?.company_admin) && (
                  <Link to={isAdmin ? '/admin/entreprise' : '/dashboard/entreprise'} className="dash-avatar-menu-item" onClick={() => setAvatarOpen(false)}>
                    <HotelIcon size={14} />
                    {tA('nav.company')}
                  </Link>
                )}
                <div className="dash-avatar-menu-sep" />

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
            {navItems.map((item, i) => (
              <Fragment key={item.to}>
                {i > 0 && <div className="dash-nav-sep" aria-hidden="true" />}
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={closeSidebar}
                  title={sidebarExpanded ? undefined : item.label}
                  className={({ isActive }) =>
                    'dash-nav-link' + (isActive ? ' active' : '')
                  }
                >
                  <span className="dash-nav-icon"><item.icon size={20} /></span>
                  <span className="dash-nav-label">{item.label}</span>
                </NavLink>
              </Fragment>
            ))}
          </nav>

          <div className="dash-sidebar__footer">
            <Link
              to="/"
              className="dash-footer-link"
              onClick={closeSidebar}
              title={sidebarExpanded ? undefined : t('nav.backToSite')}
            >
              <span className="dash-nav-label">{t('nav.backToSite')}</span>
              <ArrowRightIcon size={16} />
            </Link>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="dash-main">
          {/* ── Impersonation banner: under the top bar, beside the sidebar ── */}
          {impersonatingAdmin && (
            <div className="dash-impersonation-banner">
              <EyeIcon size={14} />
              <span className="dash-impersonation-banner__text">{tA('impersonation.banner', { name: displayName || user?.email })}</span>
              <button type="button" className="dash-impersonation-banner__btn" onClick={stopImpersonating} title={tA('impersonation.stop')}>
                <span className="dash-impersonation-banner__label">{tA('impersonation.stop')}</span> <ArrowRightFromLineIcon size={14} />
              </button>
            </div>
          )}
          <div className="dash-main__inner">
            <ConfirmProvider>
              <Outlet />
            </ConfirmProvider>
          </div>
        </main>
      </div>
    </div>
  );
}
