import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Minimal centered shell for auth pages (sign-in / sign-up / reset / confirm).
 * No global Header/Footer — keeps the focus on the form.
 */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  const { t } = useTranslation('member');

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <Link to="/" className="text-base font-semibold text-foreground">SonnaLab</Link>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← {t('nav.backToSite')}
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-card rounded-2xl border border-border p-8">
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 pt-6 border-t border-border text-sm text-muted-foreground">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
