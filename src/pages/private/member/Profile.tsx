import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { UserIcon } from '@icons';

import { useAuth } from '@/components/providers/AuthProvider';
import { apiService, type ProfilePayload } from '@/services/api';
import { Card } from '@/components/ui/card';

const LANGUAGES = ['fr', 'en'] as const;

const toForm = (u: ReturnType<typeof useAuth>['user']): ProfilePayload => ({
  first_name: u?.first_name ?? '',
  last_name:  u?.last_name ?? '',
  phone:      u?.phone ?? '',
  company:    u?.company ?? '',
  language:   u?.language ?? '',
});

/** Profil du compte connecté (tous rôles) : PATCH /api/v1/me. */
export default function Profile() {
  const { t, i18n } = useTranslation('member');
  const { user, refreshMe } = useAuth();
  const [form, setForm] = useState<ProfilePayload>(() => toForm(user));
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(toForm(user)); }, [user]);

  const set = (key: keyof ProfilePayload, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await apiService.updateMe(form);
      await refreshMe();
      if (saved.language && saved.language !== i18n.language?.slice(0, 2)) i18n.changeLanguage(saved.language);
      toast.success(t('profile.saved'));
    } catch (err) {
      const details = (err as { response?: { data?: { details?: string[] } } })?.response?.data?.details;
      toast.error(details?.length ? details.join(' ') : t('profile.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="trk-header">
        <div className="trk-header__title">
          <UserIcon size={22} className="trk-header__icon" />
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">{t('profile.title')}</h1>
        </div>
        <p className="mt-1 text-muted-foreground text-sm">{t('profile.subtitle')}</p>
      </header>

      <Card className="p-6 co-profile">
        <form className="adm-form" onSubmit={submit}>
          <div className="adm-form__row">
            <div className="adm-form__field">
              <label className="adm-form__label" htmlFor="profile-email">{t('profile.fields.email')}</label>
              <input id="profile-email" className="adm-input" value={user?.email ?? ''} readOnly disabled />
            </div>
            <div className="adm-form__field">
              <label className="adm-form__label" htmlFor="profile-role">{t('profile.fields.role')}</label>
              <input id="profile-role" className="adm-input" value={user ? t(`profile.roles.${user.role}`) : ''} readOnly disabled />
            </div>
          </div>
          <div className="adm-form__row">
            <div className="adm-form__field">
              <label className="adm-form__label" htmlFor="profile-first">{t('profile.fields.firstName')}</label>
              <input id="profile-first" className="adm-input" maxLength={100} value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
            </div>
            <div className="adm-form__field">
              <label className="adm-form__label" htmlFor="profile-last">{t('profile.fields.lastName')}</label>
              <input id="profile-last" className="adm-input" maxLength={100} value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
            </div>
          </div>
          <div className="adm-form__row">
            <div className="adm-form__field">
              <label className="adm-form__label" htmlFor="profile-phone">{t('profile.fields.phone')}</label>
              <input id="profile-phone" type="tel" className="adm-input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div className="adm-form__field">
              <label className="adm-form__label" htmlFor="profile-company">{t('profile.fields.company')}</label>
              <input id="profile-company" className="adm-input" maxLength={200} value={form.company} onChange={(e) => set('company', e.target.value)} />
            </div>
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="profile-language">{t('profile.fields.language')}</label>
            <select id="profile-language" className="adm-select" value={form.language} onChange={(e) => set('language', e.target.value)}>
              <option value="">—</option>
              {LANGUAGES.map((lang) => <option key={lang} value={lang}>{t(`profile.languages.${lang}`)}</option>)}
            </select>
          </div>
          <div className="co-profile__actions">
            <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
              {saving ? t('profile.saving') : t('profile.save')}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
