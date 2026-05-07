import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import bLogo from '@/assets/logo/bSonnaLab.png';
import wLogo from '@/assets/logo/wSonnaLab.png';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Shell visuel pour les pages d'authentification.
 * Fond animé + carte glassmorphisme — sans Header/Footer global.
 */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  const { t } = useTranslation('auth');

  return (
    <div className="auth-page">

      {/* Fond animé */}
      <div className="auth-bg" aria-hidden="true">
        <div className="auth-bg__grid" />
        <div className="auth-bg__blob auth-bg__blob--1" />
        <div className="auth-bg__blob auth-bg__blob--2" />
        <div className="auth-bg__blob auth-bg__blob--3" />
        <div className="auth-bg__blob auth-bg__blob--4" />
        <div className="auth-bg__dots" />
        <div className="auth-bg__line auth-bg__line--1" />
        <div className="auth-bg__line auth-bg__line--2" />
        <span className="auth-bg__sym auth-bg__sym--1" aria-hidden="true">✚</span>
        <span className="auth-bg__sym auth-bg__sym--2" aria-hidden="true">⌁</span>
        <span className="auth-bg__sym auth-bg__sym--3" aria-hidden="true">◈</span>
        <div className="auth-bg__corner auth-bg__corner--tl" />
        <div className="auth-bg__corner auth-bg__corner--br" />
        <div className="auth-bg__corner auth-bg__corner--tr" />
        <div className="auth-bg__corner auth-bg__corner--bl" />
      </div>

      {/* Bouton retour */}
      <Link to="/" className="auth-back">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
        </svg>
        {t('back')}
      </Link>

      {/* Carte principale */}
      <div className="auth-card">

        {/* Logo */}
        <img src={bLogo} alt="SonnaLab" className="auth-card__logo auth-card__logo--light" />
        <img src={wLogo} alt="SonnaLab" className="auth-card__logo auth-card__logo--dark" />

        {/* Badge sécurité */}
        <div className="auth-card__badge">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          {t('badge')}
        </div>

        {/* En-tête */}
        <h1 className="auth-card__title">{title}</h1>
        {subtitle && <p className="auth-card__sub">{subtitle}</p>}

        {/* Contenu du formulaire */}
        <div className="auth-card__body">{children}</div>

        {/* Pied de carte */}
        {footer && <div className="auth-card__footer">{footer}</div>}
      </div>
    </div>
  );
}
