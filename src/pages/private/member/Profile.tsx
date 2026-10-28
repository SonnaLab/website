import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CheckCircleIcon, ChevronDownIcon, LockIcon, ReceiptIcon, Trash2Icon, UserIcon, XCircleIcon } from '@icons';

import { useAuth } from '@/components/providers/AuthProvider';
import { apiService, type MyBilling, type ProfilePayload } from '@/services/api';
import { Breadcrumbs } from '@/components/private/common/Breadcrumbs';
import { PageHeader } from '@/components/private/common/PageHeader';
import { Modal } from '@/components/common/Modal';
import { getDashboardPath, roleKey } from '@/utils/auth';
import { LANGUAGE_CODES } from '@/i18n/languages';


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
  const [open, setOpen] = useState<string | null>('details');
  const toggle = (key: string) => setOpen((current) => (current === key ? null : key));

  return (
    <div className="dash-page co-profile-page">
      {/* Reached from the avatar menu: the way back to the dashboard. */}
      <Breadcrumbs items={[{ label: t('nav.dashboard'), to: getDashboardPath(user?.role) }, { label: t('profile.title') }]} />
      <PageHeader
        badge={{ icon: UserIcon, label: t('nav.account') }}
        title={t('profile.heading')}
        description={t('profile.subtitle')}
      />
      {/* One card open at a time; the others stay collapsed to their header. */}
      <DetailsSection open={open === 'details'} onToggle={() => toggle('details')} />
      <PasswordSection open={open === 'password'} onToggle={() => toggle('password')} />
      <BillingSection open={open === 'billing'} onToggle={() => toggle('billing')} />
      <DangerSection open={open === 'delete'} onToggle={() => toggle('delete')} />
    </div>
  );
}

interface SectionProps {
  icon: typeof UserIcon;
  title: string;
  text: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  tone?: 'danger';
}

/** A card: a header that opens/collapses it, its body, and a footer for its actions. */
function Section({ icon: Icon, title, text, open, onToggle, children, footer, onSubmit, tone }: SectionProps) {
  const Tag = onSubmit ? 'form' : 'section';
  return (
    <Tag className={`co-card${tone ? ` co-card--${tone}` : ''}${open ? ' is-open' : ''}`} onSubmit={onSubmit}>
      <button type="button" className="co-card__head" aria-expanded={open} onClick={onToggle}>
        <span className="co-card__icon"><Icon size={16} /></span>
        <span className="co-card__titles">
          <span className="co-card__title">{title}</span>
          <span className="co-card__text">{text}</span>
        </span>
        <ChevronDownIcon size={18} className="co-card__chevron" />
      </button>
      {open && (
        <>
          <div className="co-card__body">{children}</div>
          {footer && <div className="co-card__foot">{footer}</div>}
        </>
      )}
    </Tag>
  );
}

type CardProps = { open: boolean; onToggle: () => void };

function DetailsSection({ open, onToggle }: CardProps) {
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
    <Section
      icon={UserIcon} title={t('profile.sections.details.title')} text={t('profile.sections.details.text')}
      open={open} onToggle={onToggle} onSubmit={submit}
      footer={
        <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
          {saving ? t('profile.saving') : t('profile.save')}
        </button>
      }
    >
      <div className="adm-form">
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
              {LANGUAGE_CODES.map((lang) => <option key={lang} value={lang}>{t(`profile.languages.${lang}`)}</option>)}
            </select>
          </div>
        </div>
      </div>
    </Section>
  );
}

function PasswordSection({ open, onToggle }: CardProps) {
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
    <Section
      icon={LockIcon} title={t('profile.sections.password.title')} text={t('profile.sections.password.text')}
      open={open} onToggle={onToggle} onSubmit={submit}
      footer={
        <button type="submit" className="adm-btn adm-btn--primary" disabled={saving || mismatch || !current || !next}>
          {t('profile.password.submit')}
        </button>
      }
    >
      <div className="adm-form">
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
      </div>
    </Section>
  );
}

function BillingSection({ open, onToggle }: CardProps) {
  const { t } = useTranslation('member');
  const { user } = useAuth();
  const [billing, setBilling] = useState<MyBilling | null | undefined>(undefined);
  useEffect(() => { apiService.myBilling().then((r) => setBilling(r.billing)).catch(() => setBilling(null)); }, []);

  const tiles: Array<[string, string | null | undefined]> = billing ? [
    [t('profile.billing.siret'), billing.siret],
    [t('profile.billing.vat'), billing.vat_number],
    [t('profile.billing.contact'), billing.contact_email],
    [t('profile.billing.referent'), [billing.referent, billing.referent_email].filter(Boolean).join(' · ')],
  ] : [];
  const initials = (billing?.company ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  return (
    <Section
      icon={ReceiptIcon} title={t('profile.sections.billing.title')} text={t('profile.sections.billing.text')}
      open={open} onToggle={onToggle}
      footer={billing && (
        <>
          <span className="co-card__note">{t('profile.billing.changeHint')}</span>
          {user?.company_admin
            ? <Link to="/dashboard/entreprise" className="adm-btn adm-btn--ghost">{t('profile.billing.edit')}</Link>
            : <a href="mailto:contact@sonnalab.com" className="adm-btn adm-btn--ghost">{t('profile.billing.contactUs')}</a>}
        </>
      )}
    >
      {billing === undefined ? <p className="co-profile__muted">…</p> : billing ? (
        <div className="co-billing">
          <div className="co-billing__company">
            <span className="co-billing__avatar">{initials || '—'}</span>
            <div>
              <p className="co-billing__name">{billing.company}</p>
              <p className="co-billing__address">{billing.address.length ? billing.address.join(', ') : t('profile.billing.noAddress')}</p>
            </div>
          </div>
          <dl className="co-billing__grid">
            {tiles.map(([label, value]) => (
              <div key={label} className="co-billing__tile"><dt>{label}</dt><dd>{value || '—'}</dd></div>
            ))}
          </dl>
        </div>
      ) : (
        <p className="co-profile__muted">{t('profile.billing.none')}</p>
      )}
    </Section>
  );
}

function DangerSection({ open, onToggle }: CardProps) {
  const { t } = useTranslation('member');
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [modal, setModal] = useState(false);
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
    <Section
      icon={Trash2Icon} title={t('profile.sections.delete.title')} text={t('profile.sections.delete.short')}
      open={open} onToggle={onToggle} tone="danger"
      footer={isAdmin ? <span className="co-card__note">{t('profile.delete.admin')}</span> : (
        <button type="button" className="adm-btn adm-btn--danger" onClick={() => { setPassword(''); setModal(true); }}>
          <Trash2Icon size={14} /> {t('profile.delete.cta')}
        </button>
      )}
    >
      <ul className="co-consequences">
        <li className="co-consequences__item co-consequences__item--removed">
          <XCircleIcon size={16} /><span><strong>{t('profile.delete.removedTitle')}</strong>{t('profile.delete.removedText')}</span>
        </li>
        <li className="co-consequences__item co-consequences__item--kept">
          <CheckCircleIcon size={16} /><span><strong>{t('profile.delete.keptTitle')}</strong>{t('profile.delete.keptText')}</span>
        </li>
        <li className="co-consequences__item">
          <LockIcon size={16} /><span><strong>{t('profile.delete.mailTitle')}</strong>{t('profile.delete.mailText')}</span>
        </li>
      </ul>
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={t('profile.delete.confirmTitle')}
        subtitle={t('profile.delete.confirmText')}
        size="sm"
        footer={
          <>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setModal(false)}>{t('profile.delete.cancel')}</button>
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
