import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { apiService, type MailingSubscriber } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/common/Modal';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { DataTable, DataTableBody, DataTableEmpty, DataTableHead, DataTableRow, DataTableTd, DataTableTh } from '@/components/common/DataTable';
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon, Trash2Icon, UsersIcon } from '@icons';

const STATUSES = ['all', 'confirmed', 'pending', 'unsubscribed'] as const;
const STATUS_VARIANT = { confirmed: 'success', pending: 'warning', unsubscribed: 'default' } as const;
const PREFERENCES = ['newsletter', 'updates', 'events'] as const;

/** The subscribers: who, what they agreed to receive, and how they came in. */
export function NewsletterTab({ creating, onCreated, onChange }: { creating: boolean; onCreated: () => void; onChange: () => void }) {
  const { t, i18n } = useTranslation('admin');
  const confirm = useConfirm();
  const [status, setStatus] = useState<typeof STATUSES[number]>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<MailingSubscriber[] | null>(null);
  const [pages, setPages] = useState(1);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    apiService.adminMailingSubscribers({ q: q || undefined, status: status === 'all' ? undefined : status, page })
      .then((r) => { setRows(r.subscribers); setPages(r.meta.pages || 1); })
      .catch(() => setRows([]));
  }, [q, status, page]);
  useEffect(() => { const id = window.setTimeout(load, q ? 300 : 0); return () => window.clearTimeout(id); }, [load, q]);
  useEffect(() => { if (creating) { setAdding(true); onCreated(); } }, [creating, onCreated]);

  async function toggle(s: MailingSubscriber) {
    await apiService.adminMailingUpdateSubscriber(s.id, s.status === 'unsubscribed' ? 'confirmed' : 'unsubscribed').catch(() => toast.error(t('common.error')));
    load(); onChange();
  }

  async function erase(s: MailingSubscriber) {
    if (!(await confirm({ title: t('mailing.subscribers.eraseTitle'), message: t('mailing.subscribers.eraseMessage', { email: s.email }) }))) return;
    await apiService.adminMailingDeleteSubscriber(s.id).catch(() => toast.error(t('common.error')));
    load(); onChange();
  }

  const date = (iso: string) => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short' }).format(new Date(iso));

  return (
    <div className="infra-stack">
      <div className="infra-toolbar">
        <div className="adm-search">
          <SearchIcon size={15} />
          <input className="adm-search__input" value={q} placeholder={t('mailing.subscribers.search')} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <div className="infra-chips" role="group">
          {STATUSES.map((s) => (
            <button key={s} type="button" className={status === s ? 'is-active' : ''} onClick={() => { setStatus(s); setPage(1); }}>
              {t(`mailing.subscribers.statuses.${s}`)}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden gap-0">
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableTh>{t('users.table.email')}</DataTableTh>
              <DataTableTh>{t('users.table.name')}</DataTableTh>
              <DataTableTh>{t('travaux.common.status')}</DataTableTh>
              <DataTableTh>{t('mailing.subscribers.preferences')}</DataTableTh>
              <DataTableTh>{t('mailing.subscribers.source')}</DataTableTh>
              <DataTableTh>{t('users.table.actions')}</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {rows === null && <DataTableEmpty label={t('common.loading')} />}
            {rows?.length === 0 && <DataTableEmpty icon={<UsersIcon size={28} />} label={t('mailing.subscribers.empty')} />}
            {rows?.map((s) => (
              <DataTableRow key={s.id}>
                <DataTableTd>
                  <span className="trv-client-cell__name">{s.email}</span>
                  <span className="infra-sub">{s.language.toUpperCase()} · {date(s.created_at)}</span>
                </DataTableTd>
                <DataTableTd>{[s.first_name, s.last_name].filter(Boolean).join(' ') || '—'}</DataTableTd>
                <DataTableTd><StatusBadge label={t(`mailing.subscribers.state.${s.status}`)} variant={STATUS_VARIANT[s.status]} /></DataTableTd>
                <DataTableTd>
                  <span className="mailing-prefs">
                    {PREFERENCES.map((p) => (
                      <span key={p} className={s.preferences[p] && s.status !== 'unsubscribed' ? 'is-on' : ''}>{t(`mailing.categories.${p}`)}</span>
                    ))}
                  </span>
                </DataTableTd>
                <DataTableTd>{t(`mailing.subscribers.sources.${s.source ?? 'site'}`, { defaultValue: s.source ?? '—' })}</DataTableTd>
                <DataTableTd>
                  <div className="adm-table__actions">
                    <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" onClick={() => toggle(s)}>
                      {s.status === 'unsubscribed' ? t('mailing.subscribers.resubscribe') : t('mailing.subscribers.unsubscribe')}
                    </button>
                    <button type="button" className="adm-btn adm-btn--danger adm-btn--xs" title={t('mailing.subscribers.eraseTitle')} onClick={() => erase(s)}><Trash2Icon size={13} /></button>
                  </div>
                </DataTableTd>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
        <div className="trk-pagination">
          <button type="button" className="trk-pagination__btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeftIcon size={14} /></button>
          <span className="trk-pagination__page">{page} / {pages}</span>
          <button type="button" className="trk-pagination__btn" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}><ChevronRightIcon size={14} /></button>
        </div>
      </Card>

      <AddSubscriberModal open={adding} onClose={() => setAdding(false)} onAdded={() => { setAdding(false); load(); onChange(); }} />
    </div>
  );
}

function AddSubscriberModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) {
  const { t } = useTranslation('admin');
  const [form, setForm] = useState({ email: '', first_name: '', last_name: '', language: 'fr' });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setForm({ email: '', first_name: '', last_name: '', language: 'fr' }); }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiService.adminMailingCreateSubscriber(form);
      toast.success(t('mailing.subscribers.added', { email: form.email }));
      onAdded();
    } catch (err) {
      const details = (err as { response?: { data?: { details?: string[] } } })?.response?.data?.details;
      toast.error(details?.join(' ') || t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('mailing.subscribers.new')}
      subtitle={t('mailing.subscribers.doubleOptIn')}
      footer={
        <>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" form="mailing-subscriber-form" className="adm-btn adm-btn--primary" disabled={saving}>{t('common.create')}</button>
        </>
      }
    >
      <form id="mailing-subscriber-form" className="adm-form" onSubmit={submit}>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="sub-email">{t('users.table.email')} *</label>
          <input id="sub-email" type="email" required className="adm-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="adm-form__row">
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="sub-first">{t('mailing.subscribers.firstName')}</label>
            <input id="sub-first" className="adm-input" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="sub-last">{t('mailing.subscribers.lastName')}</label>
            <input id="sub-last" className="adm-input" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
        </div>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="sub-lang">{t('mails.locale')}</label>
          <select id="sub-lang" className="adm-select" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}
