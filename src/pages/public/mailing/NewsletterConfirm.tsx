import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { SEO } from '@/components/seo';
import { AuthLayout } from '@/components/private/auth/AuthLayout';
import { apiService } from '@/services/api';

/** The newsletter's double opt-in: the link of the confirmation e-mail. */
export default function NewsletterConfirmPage() {
  const { t } = useTranslation('common');
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState<'confirming' | 'done' | 'error'>('confirming');
  const [prefsToken, setPrefsToken] = useState('');

  useEffect(() => {
    if (!token) { setState('error'); return; }
    let cancelled = false;
    apiService.confirmNewsletter(token)
      .then((r) => { if (!cancelled) { setPrefsToken(r.preferences_token); setState('done'); } })
      .catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <AuthLayout badge={t('emailPreferences.badge')} title={t(state === 'error' ? 'emailPreferences.confirmErrorTitle' : 'emailPreferences.confirmTitle')}>
      <SEO title={t('emailPreferences.confirmTitle')} noindex />
      <div className="mprefs">
        {state === 'confirming' && <p className="mprefs__text">{t('emailPreferences.confirming')}</p>}
        {state === 'done' && (
          <>
            <p className="mprefs__text">{t('emailPreferences.confirmText')}</p>
            <Link className="adm-btn adm-btn--primary mprefs__wide" to="/blog">{t('emailPreferences.readBlog')}</Link>
            <Link className="adm-btn adm-btn--ghost mprefs__wide" to={`/preferences?token=${encodeURIComponent(prefsToken)}`}>{t('emailPreferences.manage')}</Link>
          </>
        )}
        {state === 'error' && <p className="mprefs__text">{t('emailPreferences.invalid')}</p>}
      </div>
    </AuthLayout>
  );
}
