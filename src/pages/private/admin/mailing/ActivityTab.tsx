import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { toast } from 'sonner';

import { apiService, type DeliveryStatus, type SentEmail, type SentEmailSummary } from '@/services/api';
import { DataTableSearch } from '@/components/common/DataTable';
import { ChevronLeftIcon, ChevronRightIcon, PaperclipIcon, SendIcon } from '@icons';
import { formatDateTime } from '../infrastructure/format';
import { MailSkeleton } from './TemplatesTab';

type Device = 'desktop' | 'mobile';

/** A sent e-mail's fate, as a tag: delivered, refused, still retried, on its way. */
function DeliveryTag({ status }: { status: DeliveryStatus }) {
  const { t } = useTranslation('admin');
  if (status === 'unknown') return null;
  return <span className={`ma-delivery ma-delivery--${status}`}>{t(`mailing.activity.delivery.${status}`)}</span>;
}

/**
 * « Activité »: every e-mail that left (ne-pas-repondre@ / do-not-reply@ and
 * the others), newest first and paged on the left, exactly as it was sent on
 * the right — the Templates layout, on real e-mails. Each one shows whether
 * it reached its recipients; a refused one can be sent again to a corrected
 * address (which can also replace the old one in the account and company).
 */
export function ActivityTab() {
  const { t, i18n } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<SentEmailSummary[] | null>(null);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [mail, setMail] = useState<SentEmail | null>(null);
  const [painted, setPainted] = useState(false);
  const [device, setDevice] = useState<Device>('desktop');
  const [resend, setResend] = useState<{ to: string; replace: string; updateContact: boolean } | null>(null);
  const [resending, setResending] = useState(false);
  const [reload, setReload] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const locale = i18n.language;

  useEffect(() => {
    const id = window.setTimeout(() => {
      apiService.adminMailingSent({ q: query || undefined, page })
        .then((res) => {
          setRows(res.emails); setPages(res.meta.pages || 1); setTotal(res.meta.total);
          setSelected((current) => current ?? res.emails[0]?.id ?? null);
        })
        .catch(() => setRows([]));
    }, query ? 300 : 0);
    return () => window.clearTimeout(id);
  }, [query, page, reload]);

  useEffect(() => {
    if (!selected) return;
    setMail(null); setPainted(false); setResend(null);
    apiService.adminMailingSentEmail(selected).then(setMail).catch(() => setMail(null));
  }, [selected]);

  // A refused e-mail opens « Renvoyer » on the refused address, ready to correct.
  function openResend() {
    if (!mail) return;
    const refused = mail.to.find((address) => mail.deliveries[address.toLowerCase()]?.status === 'bounced') ?? mail.to[0] ?? '';
    setResend({ to: refused, replace: refused, updateContact: true });
  }

  async function submitResend(e: React.FormEvent) {
    e.preventDefault();
    if (!mail || !resend) return;
    setResending(true);
    try {
      const res = await apiService.adminMailingResend(mail.id, {
        to: resend.to.trim(), replace: resend.replace, update_contact: resend.updateContact && resend.to.trim().toLowerCase() !== resend.replace.toLowerCase(),
      });
      toast.success(t('mailing.activity.resend.done', { to: res.sent_to }));
      if (res.updated.length) toast.success(t('mailing.activity.resend.updated', { count: res.updated.length }));
      setResend(null);
      window.setTimeout(() => setReload((n) => n + 1), 1500);
    } catch {
      toast.error(t('mailing.activity.resend.error'));
    } finally {
      setResending(false);
    }
  }

  const html = mail?.html?.replace('<head>', '<head><base target="_blank">') ?? '';
  const fit = () => {
    const doc = frame.current?.contentDocument;
    if (frame.current && doc) frame.current.style.height = `${doc.documentElement.scrollHeight}px`;
  };
  useEffect(fit, [device]);

  const label = (key: string) => {
    const [mailer, email = ''] = key.split('#');
    return `${t(`mails.groups.${mailer}`, { defaultValue: mailer })} · ${t(`mails.emails.${email}`, { defaultValue: email.replace(/_/g, ' ') })}`;
  };

  return (
    <div className="infra-stack">
      <div className="infra-toolbar mailp-toolbar">
        <DataTableSearch value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder={t('mailing.activity.search')} />
        <div className="mailp-toggle" role="group" aria-label={t('mails.device.label')}>
          {(['desktop', 'mobile'] as Device[]).map((d) => (
            <button key={d} type="button" className={device === d ? 'is-active' : ''} onClick={() => setDevice(d)}>{t(`mails.device.${d}`)}</button>
          ))}
        </div>
      </div>

      <div className="mailp">
        <nav className="mailp-list ma-list" aria-label={t('mailing.tabs.activity')}>
          {rows === null && <p className="trv-muted">{t('common.loading')}</p>}
          {rows?.length === 0 && <p className="trv-muted">{query ? tc('table.noResults', { query }) : t('mailing.activity.empty')}</p>}
          {rows?.map((row) => (
            <button
              key={row.id}
              type="button"
              className={`mailp-list__item ma-item${selected === row.id ? ' is-active' : ''}`}
              onClick={() => setSelected(row.id)}
            >
              <span className="ma-item__top">
                <time className="ma-item__at" dateTime={row.sent_at}>{formatDateTime(row.sent_at, locale)}</time>
                <span className="ma-item__tags">
                  <DeliveryTag status={row.delivery_status} />
                  {row.locale && <span className="ma-item__lang">{row.locale.toUpperCase()}</span>}
                </span>
              </span>
              <span className="ma-item__subject">{row.subject || '—'}</span>
              <span className="ma-item__to">{row.to.join(', ')}</span>
            </button>
          ))}
          {rows && rows.length > 0 && (
            <div className="ma-pager">
              <button type="button" className="trk-pagination__btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeftIcon size={14} /></button>
              <span className="trv-muted">{page} / {pages} · {t('mailing.activity.total', { count: total })}</span>
              <button type="button" className="trk-pagination__btn" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}><ChevronRightIcon size={14} /></button>
            </div>
          )}
        </nav>

        <section className="mailp-view">
          {mail && (
            <dl className="mailp-meta">
              <div><dt>{t('mails.subject')}</dt><dd className="mailp-meta__subject">{mail.subject}</dd></div>
              <div><dt>{t('mailing.activity.type')}</dt><dd>{label(mail.mail_key)}</dd></div>
              <div><dt>{t('mails.from')}</dt><dd>{mail.from ?? '—'}</dd></div>
              <div><dt>{t('mails.to')}</dt><dd>{mail.to.join(', ')}</dd></div>
              <div>
                <dt>{t('mailing.activity.delivery.label')}</dt>
                <dd className="ma-delivery-detail">
                  {mail.delivery_status === 'unknown' ? (
                    <span className="trv-muted">{t('mailing.activity.delivery.untracked')}</span>
                  ) : mail.to.map((address) => {
                    const verdict = mail.deliveries[address.toLowerCase()];
                    const status: DeliveryStatus = verdict ? (verdict.status === 'sent' ? 'delivered' : verdict.status) : 'pending';
                    return (
                      <span key={address} className="ma-delivery-detail__row">
                        <DeliveryTag status={status} /> {address}
                        {verdict && verdict.status !== 'sent' && <small className="ma-delivery-detail__why">{verdict.dsn} · {verdict.detail}</small>}
                      </span>
                    );
                  })}
                  {mail.resent.map((r) => (
                    <span key={r.id} className="ma-delivery-detail__row">
                      <DeliveryTag status={r.delivery_status} /> {t('mailing.activity.resend.resentTo', { to: r.to.join(', '), date: formatDateTime(r.sent_at, locale) })}
                    </span>
                  ))}
                  {mail.resendable && !resend && (
                    <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm ma-delivery-detail__resend" onClick={openResend}>
                      <SendIcon size={13} /> {t('mailing.activity.resend.cta')}
                    </button>
                  )}
                  {resend && (
                    <form className="ma-resend" onSubmit={submitResend}>
                      <label className="adm-form__label" htmlFor="ma-resend-to">{t('mailing.activity.resend.to')}</label>
                      <div className="ma-resend__row">
                        <input id="ma-resend-to" type="email" required className="adm-input" value={resend.to}
                               onChange={(e) => setResend({ ...resend, to: e.target.value })} />
                        <button type="submit" className="adm-btn adm-btn--primary" disabled={resending || !resend.to.trim()}>
                          <SendIcon size={13} /> {t('mailing.activity.resend.submit')}
                        </button>
                        <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setResend(null)}>{t('common.cancel')}</button>
                      </div>
                      {resend.to.trim().toLowerCase() !== resend.replace.toLowerCase() && (
                        <label className="ma-resend__check">
                          <input type="checkbox" checked={resend.updateContact}
                                 onChange={(e) => setResend({ ...resend, updateContact: e.target.checked })} />
                          {t('mailing.activity.resend.updateContact', { old: resend.replace })}
                        </label>
                      )}
                    </form>
                  )}
                </dd>
              </div>
              {mail.bcc.length > 0 && <div><dt>{t('mailing.activity.bcc')}</dt><dd>{mail.bcc.join(', ')}</dd></div>}
              <div><dt>{t('mailing.activity.sentAt')}</dt><dd>{formatDateTime(mail.sent_at, locale)}{mail.locale ? ` · ${mail.locale.toUpperCase()}` : ''}</dd></div>
              <div>
                <dt>{t('mails.attachments')}</dt>
                <dd>
                  {mail.attachments.length ? mail.attachments.map((a) => (
                    <span key={a.filename} className="mailp-meta__file"><PaperclipIcon size={12} /> {a.filename} · {Math.ceil(a.size / 1024)} Ko</span>
                  )) : t('mails.none')}
                </dd>
              </div>
            </dl>
          )}
          <div className="mailp-stage">
            {mail?.html && (
              <iframe
                ref={frame}
                title={mail.subject ?? ''}
                srcDoc={html}
                className={`mailp-frame mailp-frame--${device}${painted ? '' : ' is-loading'}`}
                sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                onLoad={() => { fit(); setPainted(true); }}
              />
            )}
            {mail && !mail.html && <pre className="ma-text">{mail.text}</pre>}
            {selected && !(mail && (painted || !mail.html)) && <MailSkeleton device={device} label={t('common.loading')} />}
          </div>
        </section>
      </div>
    </div>
  );
}
