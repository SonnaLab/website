import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { apiService, type MailingCampaign } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/common/Modal';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { DataTable, DataTableBody, DataTableEmpty, DataTableHead, DataTableRow, DataTableTd, DataTableTh } from '@/components/common/DataTable';
import { EyeIcon, MegaphoneIcon, PenLineIcon, SendIcon, Trash2Icon } from '@icons';

const CATEGORIES = ['newsletter', 'updates', 'events'] as const;
const AUDIENCES = ['subscribers', 'clients', 'all'] as const;
const HEROES = ['newsletter', 'welcome', 'request', 'appointment', 'quote', 'invoice', 'payment', 'invitation', 'security'] as const;
const STATUS_VARIANT = { draft: 'default', sending: 'info', sent: 'success', failed: 'danger' } as const;
const FIELDS = ['subject', 'preheader', 'title', 'body', 'cta_label'] as const;

type Draft = Partial<MailingCampaign> & Record<string, unknown>;

/** Campaigns: drafts to edit, preview and test, then send; sent ones with their figures. */
export function CampaignsTab({ creating, onCreated, onChange }: { creating: boolean; onCreated: () => void; onChange: () => void }) {
  const { t, i18n } = useTranslation('admin');
  const confirm = useConfirm();
  const [campaigns, setCampaigns] = useState<MailingCampaign[] | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [previewing, setPreviewing] = useState<MailingCampaign | null>(null);

  const load = useCallback(() => {
    apiService.adminMailingCampaigns().then((r) => setCampaigns(r.campaigns)).catch(() => setCampaigns([]));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (creating) { setEditing({ category: 'newsletter', audience: 'subscribers', hero: 'newsletter' }); onCreated(); }
  }, [creating, onCreated]);

  async function edit(campaign: MailingCampaign) {
    const { campaign: full } = await apiService.adminMailingCampaign(campaign.id);
    setEditing(full as Draft);
  }

  async function send(campaign: MailingCampaign) {
    const ok = await confirm({
      title: t('mailing.campaigns.sendTitle', { name: campaign.name }),
      message: t('mailing.campaigns.sendMessage', { count: campaign.audience_count ?? 0 }),
      confirmLabel: t('mailing.campaigns.send'),
      danger: false,
    });
    if (!ok) return;
    try {
      await apiService.adminMailingSendCampaign(campaign.id);
      toast.success(t('mailing.campaigns.sending'));
      load(); onChange();
      window.setTimeout(() => { load(); onChange(); }, 5000);
    } catch {
      toast.error(t('common.error'));
    }
  }

  async function remove(campaign: MailingCampaign) {
    if (!(await confirm({ title: t('travaux.common.confirmDelete'), message: campaign.name }))) return;
    await apiService.adminMailingDeleteCampaign(campaign.id).catch(() => toast.error(t('common.error')));
    load(); onChange();
  }

  const date = (iso: string | null) => (iso ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)) : '—');

  return (
    <>
      <Card className="overflow-hidden gap-0">
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableTh>{t('mailing.campaigns.name')}</DataTableTh>
              <DataTableTh>{t('mailing.campaigns.category')}</DataTableTh>
              <DataTableTh>{t('mailing.campaigns.audience')}</DataTableTh>
              <DataTableTh>{t('travaux.common.status')}</DataTableTh>
              <DataTableTh>{t('mailing.campaigns.results')}</DataTableTh>
              <DataTableTh>{t('users.table.actions')}</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {campaigns === null && <DataTableEmpty label={t('common.loading')} />}
            {campaigns?.length === 0 && <DataTableEmpty icon={<MegaphoneIcon size={28} />} label={t('mailing.campaigns.empty')} />}
            {campaigns?.map((c) => (
              <DataTableRow key={c.id} onClick={() => setPreviewing(c)}>
                <DataTableTd>
                  <span className="trv-client-cell__name">{c.name}</span>
                  <span className="infra-sub">{c.subject_fr}</span>
                </DataTableTd>
                <DataTableTd>{t(`mailing.categories.${c.category}`)}</DataTableTd>
                <DataTableTd>
                  {t(`mailing.audiences.${c.audience}`)}
                  {c.status === 'draft' && <span className="infra-sub">{t('mailing.campaigns.reach', { count: c.audience_count ?? 0 })}</span>}
                </DataTableTd>
                <DataTableTd><StatusBadge label={t(`mailing.campaigns.statuses.${c.status}`)} variant={STATUS_VARIANT[c.status]} /></DataTableTd>
                <DataTableTd>
                  {c.status === 'draft' ? '—' : (
                    <>
                      <span className="trv-num">{t('mailing.campaigns.delivered', { count: c.delivered_count, total: c.recipients_count })}</span>
                      <span className="infra-sub">{c.failed_count ? t('mailing.campaigns.failed', { count: c.failed_count }) + ' · ' : ''}{date(c.sent_at)}</span>
                    </>
                  )}
                </DataTableTd>
                <DataTableTd onClick={(e) => e.stopPropagation()}>
                  <div className="adm-table__actions">
                    <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" title={t('mailing.campaigns.preview')} onClick={() => setPreviewing(c)}><EyeIcon size={13} /></button>
                    {c.status === 'draft' && (
                      <>
                        <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" title={t('common.edit')} onClick={() => edit(c)}><PenLineIcon size={13} /></button>
                        <button type="button" className="adm-btn adm-btn--primary adm-btn--xs" onClick={() => send(c)}><SendIcon size={13} /> {t('mailing.campaigns.send')}</button>
                        <button type="button" className="adm-btn adm-btn--danger adm-btn--xs" title={t('common.delete')} onClick={() => remove(c)}><Trash2Icon size={13} /></button>
                      </>
                    )}
                  </div>
                </DataTableTd>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </Card>

      <CampaignFormModal draft={editing} onClose={() => setEditing(null)} onSaved={(c) => { setEditing(null); load(); onChange(); setPreviewing(c); }} />
      <CampaignPreviewModal campaign={previewing} onClose={() => setPreviewing(null)} />
    </>
  );
}

function CampaignFormModal({ draft, onClose, onSaved }: { draft: Draft | null; onClose: () => void; onSaved: (c: MailingCampaign) => void }) {
  const { t } = useTranslation('admin');
  const [form, setForm] = useState<Draft>({});
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (draft) { setForm(draft); setLang('fr'); } }, [draft]);
  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const value = (key: string) => (form[key] as string | null | undefined) ?? '';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: Record<string, unknown> = {
      name: form.name, category: form.category, audience: form.audience, hero: form.hero || 'newsletter', cta_url: form.cta_url || null,
    };
    FIELDS.forEach((f) => ['fr', 'en'].forEach((l) => { payload[`${f}_${l}`] = value(`${f}_${l}`) || null; }));
    try {
      const { campaign } = await apiService.adminMailingSaveCampaign(payload as Partial<MailingCampaign>, form.id as string | undefined);
      toast.success(t('mailing.campaigns.saved'));
      onSaved(campaign);
    } catch (err) {
      const details = (err as { response?: { data?: { details?: string[] } } })?.response?.data?.details;
      toast.error(details?.join(' ') || t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={!!draft}
      onClose={onClose}
      size="lg"
      title={form.id ? t('mailing.campaigns.edit') : t('mailing.campaigns.new')}
      subtitle={t('mailing.campaigns.formHint')}
      footer={
        <>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" form="mailing-campaign-form" className="adm-btn adm-btn--primary" disabled={saving}>{t('common.save')}</button>
        </>
      }
    >
      <form id="mailing-campaign-form" className="adm-form" onSubmit={submit}>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="cmp-name">{t('mailing.campaigns.name')} *</label>
          <input id="cmp-name" className="adm-input" required value={value('name')} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="adm-form__row">
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="cmp-category">{t('mailing.campaigns.category')}</label>
            <select id="cmp-category" className="adm-select" value={value('category')} onChange={(e) => set('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{t(`mailing.categories.${c}`)}</option>)}
            </select>
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="cmp-audience">{t('mailing.campaigns.audience')}</label>
            <select id="cmp-audience" className="adm-select" value={value('audience')} onChange={(e) => set('audience', e.target.value)}>
              {AUDIENCES.map((a) => <option key={a} value={a}>{t(`mailing.audiences.${a}`)}</option>)}
            </select>
          </div>
        </div>
        <div className="adm-form__row">
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="cmp-hero">{t('mailing.campaigns.hero')}</label>
            <select id="cmp-hero" className="adm-select" value={value('hero')} onChange={(e) => set('hero', e.target.value)}>
              {HEROES.map((h) => <option key={h} value={h}>{t(`mailing.heroes.${h}`)}</option>)}
            </select>
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="cmp-url">{t('mailing.campaigns.ctaUrl')}</label>
            <input id="cmp-url" type="url" className="adm-input" placeholder="https://sonnalab.com/…" value={value('cta_url')} onChange={(e) => set('cta_url', e.target.value)} />
          </div>
        </div>

        <div className="mailp-toggle" role="group">
          {(['fr', 'en'] as const).map((l) => (
            <button key={l} type="button" className={lang === l ? 'is-active' : ''} onClick={() => setLang(l)}>{t(`mailing.campaigns.version.${l}`)}</button>
          ))}
        </div>
        {FIELDS.map((f) => (
          <div key={`${f}_${lang}`} className="adm-form__field">
            <label className="adm-form__label" htmlFor={`cmp-${f}`}>
              {t(`mailing.campaigns.fields.${f}`)}{lang === 'fr' && ['subject', 'title', 'body'].includes(f) ? ' *' : ''}
            </label>
            {f === 'body' ? (
              <textarea id={`cmp-${f}`} className="adm-textarea" rows={7} required={lang === 'fr'} value={value(`${f}_${lang}`)}
                        onChange={(e) => set(`${f}_${lang}`, e.target.value)} placeholder={t('mailing.campaigns.bodyHint')} />
            ) : (
              <input id={`cmp-${f}`} className="adm-input" required={lang === 'fr' && ['subject', 'title'].includes(f)} value={value(`${f}_${lang}`)}
                     onChange={(e) => set(`${f}_${lang}`, e.target.value)} />
            )}
          </div>
        ))}
        {lang === 'en' && <p className="trv-info">{t('mailing.campaigns.englishHint')}</p>}
      </form>
    </Modal>
  );
}

function CampaignPreviewModal({ campaign, onClose }: { campaign: MailingCampaign | null; onClose: () => void }) {
  const { t } = useTranslation('admin');
  const [locale, setLocale] = useState<'fr' | 'en'>('fr');
  const [mail, setMail] = useState<{ subject: string; html: string } | null>(null);
  const [to, setTo] = useState('');
  const [sending, setSending] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!campaign) return;
    setMail(null);
    apiService.adminMailingPreviewCampaign(campaign.id, locale).then(setMail).catch(() => toast.error(t('common.error')));
  }, [campaign, locale, t]);

  const fit = () => {
    const doc = frame.current?.contentDocument;
    if (frame.current && doc) frame.current.style.height = `${doc.documentElement.scrollHeight}px`;
  };

  async function sendTest(e: React.FormEvent) {
    e.preventDefault();
    if (!campaign) return;
    setSending(true);
    try {
      await apiService.adminMailingTestCampaign(campaign.id, to.trim(), locale);
      toast.success(t('mails.sent', { to: to.trim() }));
    } catch {
      toast.error(t('mails.sendError'));
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal open={!!campaign} onClose={onClose} size="xl" title={campaign?.name ?? ''} subtitle={mail?.subject}>
      <div className="infra-stack">
        <div className="infra-toolbar">
          <div className="mailp-toggle" role="group">
            {(['fr', 'en'] as const).map((l) => (
              <button key={l} type="button" className={locale === l ? 'is-active' : ''} onClick={() => setLocale(l)}>{l.toUpperCase()}</button>
            ))}
          </div>
          <form className="mailp-send" onSubmit={sendTest}>
            <input type="email" required className="adm-input" placeholder={t('mails.to')} value={to} onChange={(e) => setTo(e.target.value)} />
            <button type="submit" className="adm-btn adm-btn--primary" disabled={sending || !to.trim()}><SendIcon size={14} /> {t('mails.sendTest')}</button>
          </form>
        </div>
        <div className="mailp-stage">
          {mail
            ? <iframe ref={frame} title={mail.subject} srcDoc={mail.html.replace('<head>', '<head><base target="_blank">')} className="mailp-frame mailp-frame--desktop"
                      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" onLoad={fit} />
            : <p className="trk-loading">{t('common.loading')}</p>}
        </div>
      </div>
    </Modal>
  );
}
