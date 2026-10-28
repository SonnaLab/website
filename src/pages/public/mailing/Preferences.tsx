import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { SEO } from '@/components/seo';
import { AuthLayout } from '@/components/private/auth/AuthLayout';
import { apiService, type EmailPreferences } from '@/services/api';
import { LANGUAGES } from '@/i18n/languages';

const CATEGORIES = ['newsletter', 'updates', 'events'] as const;

/**
 * Communication preferences (link in every marketing e-mail): what one
 * agrees to receive, their language, unsubscribing from everything — at any
 * time, without an account. Account and project e-mails aren't concerned.
 */
export default function PreferencesPage() {
  const { t } = useTranslation('common');
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [prefs, setPrefs] = useState<EmailPreferences | null>(null);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) { setError(true); return; }
    apiService.emailPreferences(token).then(setPrefs).catch(() => setError(true));
  }, [token]);

  async function save(next: EmailPreferences) {
    setSaving(true);
    try {
      setPrefs(await apiService.updateEmailPreferences(token, { preferences: next.preferences, language: next.language }));
      toast.success(t('emailPreferences.saved'));
    } catch {
      toast.error(t('emailPreferences.error'));
    } finally {
      setSaving(false);
    }
  }

  async function subscription(subscribe: boolean) {
    setSaving(true);
    try {
      setPrefs(await (subscribe ? apiService.resubscribeEmail(token) : apiService.unsubscribeEmail(token)));
    } catch {
      toast.error(t('emailPreferences.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthLayout badge={t('emailPreferences.badge')} title={t('emailPreferences.title')} subtitle={prefs ? t('emailPreferences.for', { email: prefs.email }) : undefined}>
      <SEO title={t('emailPreferences.title')} noindex />
      {error && <p className="text-sm text-muted-foreground">{t('emailPreferences.invalid')}</p>}
      {prefs && (
        <div className="mprefs">
          {!prefs.subscribed && (
            <div className="mprefs__notice">
              <p>{t('emailPreferences.unsubscribedNotice')}</p>
              <button type="button" className="adm-btn adm-btn--primary" disabled={saving} onClick={() => subscription(true)}>{t('emailPreferences.resubscribe')}</button>
            </div>
          )}
          <fieldset className="mprefs__list" disabled={!prefs.subscribed || saving}>
            {CATEGORIES.map((c) => (
              <label key={c} className="mprefs__item">
                <span>
                  <strong>{t(`emailPreferences.categories.${c}.title`)}</strong>
                  <small>{t(`emailPreferences.categories.${c}.text`)}</small>
                </span>
                <input
                  type="checkbox"
                  className="mprefs__switch"
                  checked={prefs.subscribed && prefs.preferences[c]}
                  onChange={(e) => save({ ...prefs, preferences: { ...prefs.preferences, [c]: e.target.checked } })}
                />
              </label>
            ))}
            <label className="mprefs__item">
              <span><strong>{t('emailPreferences.language')}</strong></span>
              <select className="adm-select mprefs__lang" value={prefs.language} onChange={(e) => save({ ...prefs, language: e.target.value })}>
                {LANGUAGES.map((lang) => <option key={lang.code} value={lang.code}>{lang.label}</option>)}
              </select>
            </label>
          </fieldset>
          <p className="mprefs__service">{t('emailPreferences.service')}</p>
          {prefs.subscribed && (
            <button type="button" className="mprefs__unsubscribe" disabled={saving} onClick={() => subscription(false)}>
              {t('emailPreferences.unsubscribeAll')}
            </button>
          )}
        </div>
      )}
      <p className="mprefs__back"><Link to="/">← {t('emailPreferences.backHome')}</Link></p>
    </AuthLayout>
  );
}
