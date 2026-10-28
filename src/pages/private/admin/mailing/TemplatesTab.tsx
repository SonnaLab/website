import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { apiService, type MailPreview } from '@/services/api';
import { PaperclipIcon, SendIcon } from '@icons';
import { LANGUAGE_CODES, type LanguageCode } from '@/i18n/languages';

type Locale = LanguageCode;
type Device = 'desktop' | 'mobile';

// The order of the client's journey, not the alphabet.
const ORDER = [
  // The groups, in this order…
  'auth_mailer', 'team_mailer', 'billing_mailer', 'appointment_mailer', 'contact_mailer',
  'newsletter_mailer', 'campaign_mailer', 'staff_mailer', 'mailbox_mailer',
  // …and the e-mails within each, along the journey (`welcome` sits between
  // the account's and the newsletter's neighbours).
  'confirmation', 'confirm_subscription', 'welcome', 'reset_password', 'password_changed', 'account_locked', 'account_deleted', 'goodbye',
  'invitation', 'invitation_existing', 'invitation_team', 'company_welcome',
  'quote_sent', 'quote_corrected', 'quote_reminder', 'quote_accepted', 'quote_declined', 'invoice_sent', 'invoice_corrected', 'invoice_sent_after_deposit', 'payment_reminder_upcoming', 'payment_reminder_overdue',
  'payment_received_deposit', 'payment_received_settled',
  'appointment_requested', 'appointment_confirmed', 'appointment_rescheduled', 'appointment_cancelled',
  'appointment_reminder', 'appointment_reminder_staff',
  'confirm_submission', 'notify_team',
  'campaign',
  'new_account', 'staff_appointment_requested', 'staff_appointment_rescheduled', 'staff_appointment_cancelled',
  'staff_quote_accepted', 'staff_quote_declined',
  'setup',
];
const rank = (key: string) => (ORDER.indexOf(key) + 1 || ORDER.length + 1);
const byJourney = (a: string, b: string) => rank(a) - rank(b);

/**
 * Mailing › Templates: every SonnaLab e-mail rendered by the API on
 * fictional data — nothing is sent unless « Envoyer un test ». Pick one on
 * the left; in any of the app's languages, desktop or phone width.
 */
export function TemplatesTab() {
  const { t } = useTranslation('admin');
  const [mailers, setMailers] = useState<{ key: string; emails: string[] }[]>([]);
  const [selected, setSelected] = useState<{ mailer: string; email: string } | null>(null);
  const [locale, setLocale] = useState<Locale>('fr');
  const [device, setDevice] = useState<Device>('desktop');
  const [mail, setMail] = useState<MailPreview | null>(null);
  // The skeleton stays until the e-mail and its images are painted (iframe load).
  const [painted, setPainted] = useState(false);
  const [error, setError] = useState(false);
  // Who a test goes to: the sample's address until changed.
  const [to, setTo] = useState('');
  const [sending, setSending] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    apiService.adminMailPreviews()
      .then(({ mailers: unsorted }) => {
        const list = unsorted
          .map((m) => ({ ...m, emails: [...m.emails].sort(byJourney) }))
          .sort((a, b) => byJourney(a.key, b.key));
        setMailers(list);
        const first = list.find((m) => m.emails.length);
        if (first) setSelected({ mailer: first.key, email: first.emails[0] });
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setMail(null);
    setError(false);
    apiService.adminMailPreview(selected.mailer, selected.email, locale).then(setMail).catch(() => setError(true));
  }, [selected, locale]);

  useEffect(() => { if (mail && !to) setTo(mail.to?.[0] ?? ''); }, [mail]); // eslint-disable-line react-hooks/exhaustive-deps

  async function sendTest(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSending(true);
    try {
      const res = await apiService.adminMailPreviewDeliver(selected.mailer, selected.email, locale, to.trim());
      toast.success(t('mails.sent', { to: res.to }));
    } catch {
      toast.error(t('mails.sendError'));
    } finally {
      setSending(false);
    }
  }

  // Links open in a new tab; the frame grows to the e-mail's height.
  const html = mail?.html.replace('<head>', '<head><base target="_blank">') ?? '';
  useEffect(() => { setPainted(false); }, [html]);
  const fit = () => {
    const doc = frame.current?.contentDocument;
    if (frame.current && doc) frame.current.style.height = `${doc.documentElement.scrollHeight}px`;
  };
  useEffect(fit, [device]);

  const label = (mailer: string, email: string) => t(`mails.emails.${email}`, { defaultValue: `${mailer} · ${email}` });

  return (
    <div className="infra-stack">
      <div className="infra-toolbar mailp-toolbar">
        <div className="mailp-toggle" role="group" aria-label={t('mails.locale')}>
          {LANGUAGE_CODES.map((code) => (
            <button key={code} type="button" className={locale === code ? 'is-active' : ''} onClick={() => setLocale(code)}>{code.toUpperCase()}</button>
          ))}
        </div>
        <div className="mailp-toggle" role="group" aria-label={t('mails.device.label')}>
          {(['desktop', 'mobile'] as Device[]).map((d) => (
            <button key={d} type="button" className={device === d ? 'is-active' : ''} onClick={() => setDevice(d)}>{t(`mails.device.${d}`)}</button>
          ))}
        </div>
      </div>

      <div className="mailp">
        <nav className="mailp-list" aria-label={t('mails.heading')}>
          {mailers.map((m) => (
            <div key={m.key} className="mailp-list__group">
              <p className="mailp-list__title">{t(`mails.groups.${m.key}`, { defaultValue: m.key })}</p>
              {m.emails.map((email) => (
                <button
                  key={email}
                  type="button"
                  className={`mailp-list__item${selected?.mailer === m.key && selected.email === email ? ' is-active' : ''}`}
                  onClick={() => setSelected({ mailer: m.key, email })}
                >
                  {label(m.key, email)}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <section className="mailp-view">
          {error && <p className="trv-error">{t('common.error')}</p>}
          {!mail && !error && (
            <div className="mailp-meta" aria-hidden="true">
              {[38, 30, 46, 22].map((w, i) => (
                <div key={i}><span className="mailp-skel mailp-skel--line" style={{ width: 70 }} /><span className="mailp-skel mailp-skel--line" style={{ width: `${w}%` }} /></div>
              ))}
            </div>
          )}
          {mail && (
            <dl className="mailp-meta">
              <div><dt>{t('mails.subject')}</dt><dd className="mailp-meta__subject">{mail.subject}</dd></div>
              <div><dt>{t('mails.from')}</dt><dd>{mail.from}</dd></div>
              <div>
                <dt>{t('mails.to')}</dt>
                <dd>
                  {/* A real send of this sample, to this address only (subject « [Test] »). */}
                  <form className="mailp-send" onSubmit={sendTest}>
                    <input type="email" required className="adm-input" value={to} onChange={(e) => setTo(e.target.value)} aria-label={t('mails.to')} />
                    <button type="submit" className="adm-btn adm-btn--primary" disabled={sending || !to.trim()}>
                      <SendIcon size={14} /> {sending ? t('mails.sending') : t('mails.sendTest')}
                    </button>
                  </form>
                </dd>
              </div>
              {mail.reply_to && <div><dt>{t('mails.replyTo')}</dt><dd>{mail.reply_to.join(', ')}</dd></div>}
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
            {mail && (
              <iframe
                ref={frame}
                title={mail.subject}
                srcDoc={html}
                className={`mailp-frame mailp-frame--${device}${painted ? '' : ' is-loading'}`}
                sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                onLoad={() => { fit(); setPainted(true); }}
              />
            )}
            {!error && !painted && <MailSkeleton device={device} label={t('common.loading')} />}
          </div>
        </section>
      </div>
    </div>
  );
}

/** The shape of an e-mail (logo, title, text, button, phone, grid) while it loads. */
export function MailSkeleton({ device, label }: { device: string; label: string }) {
  return (
    <div className={`mailp-skeleton mailp-frame--${device}`} role="status" aria-label={label}>
      <div className="mailp-skeleton__card">
        <span className="mailp-skel" style={{ width: 120, height: 26, margin: '0 auto' }} />
        <span className="mailp-skel" style={{ width: 80, height: 10, margin: '26px auto 0' }} />
        <span className="mailp-skel" style={{ width: '70%', height: 28, margin: '14px auto 0' }} />
        <span className="mailp-skel" style={{ width: '50%', height: 28, margin: '8px auto 0' }} />
        <span className="mailp-skel" style={{ width: '84%', height: 12, margin: '22px auto 0' }} />
        <span className="mailp-skel" style={{ width: '64%', height: 12, margin: '8px auto 0' }} />
        <span className="mailp-skel" style={{ width: 190, height: 46, margin: '26px auto 0', borderRadius: 14 }} />
        <span className="mailp-skel" style={{ width: '100%', height: 220, margin: '30px 0 0', borderRadius: 0 }} />
        <div className="mailp-skeleton__grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <span className="mailp-skel" style={{ width: 44, height: 44, margin: '0 auto', borderRadius: 12 }} />
              <span className="mailp-skel" style={{ width: '60%', height: 12, margin: '12px auto 0' }} />
              <span className="mailp-skel" style={{ width: '80%', height: 10, margin: '8px auto 0' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
