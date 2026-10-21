import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { apiService, type ActivityEntry } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/common/Modal';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DataTable, DataTableBody, DataTableEmpty, DataTableHead, DataTableRow, DataTableTd, DataTableTh } from '@/components/common/DataTable';
import { ActivityIcon, ChevronLeftIcon, ChevronRightIcon, SearchIcon } from '@icons';
import { formatDateTime } from './format';

const KINDS = ['all', 'auth', 'admin', 'site', 'jobs', 'mails', 'errors'] as const;
type Kind = typeof KINDS[number];
const PER_PAGE = 30;

// « controller#action » with a label of its own (others: verb · resource).
const NAMED: Record<string, string> = {
  'api/v1/auth/sessions#create': 'signIn',
  'api/v1/auth/sessions#destroy': 'signOut',
  'api/v1/auth/registrations#create': 'signUp',
  'api/v1/auth/passwords#create': 'passwordForgot',
  'api/v1/auth/passwords#update': 'passwordReset',
  'api/v1/auth/confirmations#create': 'confirmResend',
  'api/v1/admin/users#impersonate': 'impersonate',
  'api/v1/project_requests#create': 'projectRequest',
};

/** « Création · devis/facture », « Connexion », « Tâche planifiée · sauvegarde de la base »… */
export function activityLabel(key: string, t: TFunction): string {
  if (NAMED[key]) return t(`infrastructure.activity.named.${NAMED[key]}`);
  if (key.startsWith('mail:')) {
    const [mailer, email = ''] = key.slice(5).split('#');
    const group = t(`mails.groups.${mailer}`, { defaultValue: mailer });
    return `${t('infrastructure.activity.named.mail')} · ${group} · ${t(`mails.emails.${email}`, { defaultValue: email.replace(/_/g, ' ') })}`;
  }
  if (key.startsWith('cron:')) {
    const job = key.slice(5);
    return `${t('infrastructure.activity.named.cron')} · ${t(`infrastructure.cron.jobs.${job}`, { defaultValue: job })}`;
  }
  const [controller, action] = key.split('#');
  const resource = controller.split('/').pop() ?? controller;
  const verb = t(`infrastructure.activity.verbs.${action}`, { defaultValue: action });
  return `${verb} · ${t(`infrastructure.activity.resources.${resource}`, { defaultValue: resource })}`;
}

/** Everything done on the platform, newest first: who, what, where from, outcome. */
export function ActivitiesTab() {
  const { t, i18n } = useTranslation('admin');
  const [kind, setKind] = useState<Kind>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ActivityEntry[] | null>(null);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState<ActivityEntry | null>(null);
  const locale = i18n.language;

  const load = useCallback(() => {
    setRows(null);
    apiService.adminInfraActivities({ q: q || undefined, kind: kind === 'all' ? undefined : kind, page, per_page: PER_PAGE })
      .then((res) => { setRows(res.activities); setPages(res.meta.pages || 1); setTotal(res.meta.total); })
      .catch(() => setRows([]));
  }, [q, kind, page]);

  useEffect(() => {
    const id = window.setTimeout(load, q ? 300 : 0);
    return () => window.clearTimeout(id);
  }, [load, q]);

  return (
    <div className="infra-stack">
      <div className="infra-toolbar">
        <div className="adm-search">
          <SearchIcon size={15} />
          <input className="adm-search__input" value={q} placeholder={t('infrastructure.activity.search')}
                 onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <div className="infra-chips" role="group">
          {KINDS.map((k) => (
            <button key={k} type="button" className={kind === k ? 'is-active' : ''} onClick={() => { setKind(k); setPage(1); }}>
              {t(`infrastructure.activity.kinds.${k}`)}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden gap-0">
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableTh>{t('infrastructure.activity.when')}</DataTableTh>
              <DataTableTh>{t('infrastructure.activity.who')}</DataTableTh>
              <DataTableTh>{t('infrastructure.activity.what')}</DataTableTh>
              <DataTableTh>IP</DataTableTh>
              <DataTableTh>{t('infrastructure.activity.outcome')}</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {rows === null && <DataTableEmpty label={t('common.loading')} />}
            {rows?.length === 0 && <DataTableEmpty icon={<ActivityIcon size={28} />} label={t('infrastructure.activity.empty')} />}
            {rows?.map((row) => (
              <DataTableRow key={row.id} onClick={() => setOpen(row)}>
                <DataTableTd className="trv-num">{formatDateTime(row.created_at, locale)}</DataTableTd>
                <DataTableTd>
                  {row.actor_role === 'system' ? (
                    <span className="trv-muted">{t('infrastructure.activity.system')}</span>
                  ) : (
                    <>
                      <span className="trv-client-cell__name">{row.actor_name || row.actor_email || t('infrastructure.activity.anonymous')}</span>
                      {row.actor_name && <span className="infra-sub">{row.actor_email}</span>}
                      {row.impersonated && <span className="infra-sub infra-sub--warn">{t('infrastructure.activity.impersonated')}</span>}
                    </>
                  )}
                </DataTableTd>
                <DataTableTd>
                  {activityLabel(row.action_key, t)}
                  {row.path && <span className="infra-sub infra-mono">{row.http_method} {row.path}</span>}
                  {row.action_key.startsWith('mail:') && Array.isArray(row.details?.to) && (
                    <span className="infra-sub">{t('infrastructure.activity.mailTo', { to: (row.details.to as string[]).join(', ') })}</span>
                  )}
                </DataTableTd>
                <DataTableTd className="infra-mono">{row.ip || '—'}</DataTableTd>
                <DataTableTd>
                  <StatusBadge label={String(row.status ?? '—')} variant={(row.status ?? 0) >= 400 ? 'danger' : 'success'} />
                </DataTableTd>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
        <div className="trk-pagination">
          <span className="trv-muted">{t('infrastructure.activity.total', { count: total })}</span>
          <button type="button" className="trk-pagination__btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeftIcon size={14} /></button>
          <span className="trk-pagination__page">{page} / {pages}</span>
          <button type="button" className="trk-pagination__btn" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}><ChevronRightIcon size={14} /></button>
        </div>
      </Card>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? activityLabel(open.action_key, t) : ''} size="md">
        {open && (
          <div className="adm-form">
            <dl className="trk-modal-dl">
              <dt>{t('infrastructure.activity.when')}</dt><dd>{formatDateTime(open.created_at, locale)}</dd>
              <dt>{t('infrastructure.activity.who')}</dt><dd>{open.actor_email || '—'} {open.actor_role ? `(${open.actor_role})` : ''}</dd>
              <dt>{t('infrastructure.activity.request')}</dt><dd className="infra-mono">{open.http_method} {open.path}</dd>
              <dt>{t('infrastructure.activity.outcome')}</dt><dd>{open.status}</dd>
              <dt>IP</dt><dd className="infra-mono">{open.ip}</dd>
            </dl>
            <pre className="infra-json">{JSON.stringify(open.details, null, 2)}</pre>
          </div>
        )}
      </Modal>
    </div>
  );
}
