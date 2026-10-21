import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { LockIcon, ReceiptIcon, Trash2Icon, UserIcon } from '@icons';

import { useAuth } from '@/components/providers/AuthProvider';
import { apiService, type MyBilling, type ProfilePayload } from '@/services/api';
import { Breadcrumbs } from '@/components/private/common/Breadcrumbs';
import { PageHeader } from '@/components/private/common/PageHeader';
import { Modal } from '@/components/common/Modal';
import { getDashboardPath, roleKey } from '@/utils/auth';

const LANGUAGES = ['fr', 'en'] as const;

const toForm = (u: ReturnType<typeof useAuth>['user']): ProfilePayload => ({
  first_name: u?.first_name ?? '',
  last_name:  u?.last_name ?? '',
  phone:      u?.phone ?? '',
  company:    u?.company ?? '',
  language:   u?.language ?? '',
});

const apiError = (err: unknown) => (err as { response?: { data?: { error?: string; details?: string[] } } })?.response?.data;

/**
 * « Gestion du profil » (every role): personal details, password, the
 * company's billing details, and deleting the account.
 */
export default function Profile() {
  const { t } = useTranslation('member');
  const { user } = useAuth();

  return (
    <div className="dash-page co-profile-page">
      {/* Reached from the avatar menu: the way back to the dashboard. */}
      <Breadcrumbs items={[{ label: t('nav.dashboard'), to: getDashboardPath(user?.role) }, { label: t('profile.title') }]} />
      <PageHeader
        badge={{ icon: UserIcon, label: t('nav.account') }}
        title={t('profile.heading')}
        description={t('profile.subtitle')}
      />
      <DetailsSection />
      <PasswordSection />
      <BillingSection />
      <DangerSection />
    </div>
  );
}

function Section({ icon: Icon, title, text, children, tone }: { icon: typeof UserIcon; title: string; text: string; children: React.ReactNode; tone?: 'danger' }) {
  return (
    <section className={`co-profile-section${tone ? ` co-profile-section--${tone}` : ''}`}>
      <header className="co-profile-section__head">
        <span className="co-profile-section__icon"><Icon size={16} /></span>
        <div>
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function DetailsSection() {
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
      const details = apiError(err)?.details;
      toast.error(details?.length ? details.join(' ') : t('profile.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section icon={UserIcon} title={t('profile.sections.details.title')} text={t('profile.sections.details.text')}>
      <form className="adm-form" onSubmit={submit}>
        <div className="adm-form__row">
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="profile-email">{t('profile.fields.email')}</label>
            <input id="profile-email" className="adm-input" value={user?.email ?? ''} readOnly disabled />
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="profile-role">{t('profile.fields.role')}</label>
            <input id="profile-role" className="adm-input" value={user ? t(`profile.roles.${roleKey(user)}`) : ''} readOnly disabled />
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
            <label className="adm-form__label" htmlFor="profile-language">{t('profile.fields.language')}</label>
            <select id="profile-language" className="adm-select" value={form.language} onChange={(e) => set('language', e.target.value)}>
              <option value="">—</option>
              {LANGUAGES.map((lang) => <option key={lang} value={lang}>{t(`profile.languages.${lang}`)}</option>)}
            </select>
          </div>
        </div>
        <div className="co-profile__actions">
          <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
            {saving ? t('profile.saving') : t('profile.save')}
          </button>
        </div>
      </form>
    </Section>
  );
}

function PasswordSection() {
  const { t } = useTranslation('member');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const mismatch = !!confirm && next !== confirm;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mismatch) return;
    setSaving(true);
    try {
      await apiService.changeMyPassword(current, next);
      toast.success(t('profile.password.done'));
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err) {
      const data = apiError(err);
      toast.error(data?.error === 'invalid_password' ? t('profile.password.wrong') : data?.details?.join(' ') || t('profile.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section icon={LockIcon} title={t('profile.sections.password.title')} text={t('profile.sections.password.text')}>
      <form className="adm-form" onSubmit={submit}>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="pw-current">{t('profile.password.current')}</label>
          <input id="pw-current" type="password" autoComplete="current-password" required className="adm-input" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div className="adm-form__row">
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="pw-new">{t('profile.password.new')}</label>
            <input id="pw-new" type="password" autoComplete="new-password" required minLength={8} className="adm-input" value={next} onChange={(e) => setNext(e.target.value)} />
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="pw-confirm">{t('profile.password.confirm')}</label>
            <input id="pw-confirm" type="password" autoComplete="new-password" required className="adm-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {mismatch && <p className="co-profile__error">{t('profile.password.mismatch')}</p>}
          </div>
        </div>
        <div className="co-profile__actions">
          <button type="submit" className="adm-btn adm-btn--primary" disabled={saving || mismatch || !current || !next}>
            {t('profile.password.submit')}
          </button>
        </div>
      </form>
    </Section>
  );
}

function BillingSection() {
  const { t } = useTranslation('member');
  const [billing, setBilling] = useState<MyBilling | null | undefined>(undefined);
  useEffect(() => { apiService.myBilling().then((r) => setBilling(r.billing)).catch(() => setBilling(null)); }, []);

  const rows: Array<[string, string | null | undefined]> = billing ? [
    [t('profile.billing.company'), billing.company],
    [t('profile.billing.siret'), billing.siret],
    [t('profile.billing.vat'), billing.vat_number],
    [t('profile.billing.address'), billing.address.join(', ')],
    [t('profile.billing.contact'), billing.contact_email],
    [t('profile.billing.referent'), [billing.referent, billing.referent_email, billing.referent_phone].filter(Boolean).join(' · ')],
  ] : [];

  return (
    <Section icon={ReceiptIcon} title={t('profile.sections.billing.title')} text={t('profile.sections.billing.text')}>
      {billing === undefined ? <p className="co-profile__muted">…</p> : billing ? (
        <dl className="co-profile__dl">
          {rows.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>
          ))}
        </dl>
      ) : (
        <p className="co-profile__muted">{t('profile.billing.none')}</p>
      )}
    </Section>
  );
}

function DangerSection() {
  const { t } = useTranslation('member');
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const isAdmin = user?.role === 'admin';

  async function remove() {
    setDeleting(true);
    try {
      await apiService.deleteMe(password);
      toast.success(t('profile.delete.done'));
      await signOut().catch(() => {});
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(apiError(err)?.error === 'invalid_password' ? t('profile.password.wrong') : t('profile.saveError'));
      setDeleting(false);
    }
  }

  return (
    <Section icon={Trash2Icon} title={t('profile.sections.delete.title')} text={t('profile.sections.delete.text')} tone="danger">
      {isAdmin ? (
        <p className="co-profile__muted">{t('profile.delete.admin')}</p>
      ) : (
        <div className="co-profile__actions">
          <button type="button" className="adm-btn adm-btn--danger" onClick={() => { setPassword(''); setOpen(true); }}>
            <Trash2Icon size={14} /> {t('profile.delete.cta')}
          </button>
        </div>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('profile.delete.confirmTitle')}
        subtitle={t('profile.delete.confirmText')}
        size="sm"
        footer={
          <>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setOpen(false)}>{t('profile.delete.cancel')}</button>
            <button type="button" className="adm-btn adm-btn--danger" disabled={!password || deleting} onClick={remove}>
              <Trash2Icon size={14} /> {t('profile.delete.cta')}
            </button>
          </>
        }
      >
        <div className="adm-form">
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="delete-password">{t('profile.password.current')}</label>
            <input id="delete-password" type="password" autoComplete="current-password" className="adm-input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
      </Modal>
    </Section>
  );
}
