import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { SEO } from '@/components/seo';
import { AuthLayout } from '@/components/private/auth/AuthLayout';
import { apiService } from '@/services/api';

/**
 * Unsubscribe link of marketing e-mails. It asks for a click rather than
 * unsubscribing on load (mail scanners open links); mail clients' own
 * one-click button posts to the API directly.
 */
export default function UnsubscribePage() {
  const { t } = useTranslation('common');
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState<'ask' | 'done' | 'error'>(token ? 'ask' : 'error');
  const [busy, setBusy] = useState(false);

  async function unsubscribe() {
    setBusy(true);
    try {
      await apiService.unsubscribeEmail(token);
      setState('done');
    } catch {
      setState('error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout badge={t('emailPreferences.badge')} title={t(state === 'done' ? 'emailPreferences.unsubscribedTitle' : 'emailPreferences.unsubscribeTitle')}>
      <SEO title={t('emailPreferences.unsubscribeTitle')} noindex />
      <div className="mprefs">
        {state === 'ask' && (
          <>
            <p className="mprefs__text">{t('emailPreferences.unsubscribeText')}</p>
            <button type="button" className="adm-btn adm-btn--primary mprefs__wide" disabled={busy} onClick={unsubscribe}>
              {t('emailPreferences.unsubscribeConfirm')}
            </button>
            <Link className="adm-btn adm-btn--ghost mprefs__wide" to={`/preferences?token=${encodeURIComponent(token)}`}>{t('emailPreferences.chooseInstead')}</Link>
          </>
        )}
        {state === 'done' && (
          <>
            <p className="mprefs__text">{t('emailPreferences.unsubscribedText')}</p>
            <p className="mprefs__service">{t('emailPreferences.service')}</p>
            <Link className="adm-btn adm-btn--ghost mprefs__wide" to={`/preferences?token=${encodeURIComponent(token)}`}>{t('emailPreferences.manage')}</Link>
          </>
        )}
        {state === 'error' && <p className="mprefs__text">{t('emailPreferences.invalid')}</p>}
      </div>
    </AuthLayout>
  );
}
