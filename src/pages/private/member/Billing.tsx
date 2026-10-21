import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { apiService, saveBlob } from '@/services/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/common/Tabs';
import {
  DataTable, DataTableAction, DataTableBody, DataTableEmpty, DataTableHead, DataTableRow, DataTableSearch, DataTableSelectionBar,
  DataTableSelectTd, DataTableSelectTh, DataTableTd, DataTableTh, DataTableToolbar, exportRowsCsv, filterRows, useRowSelection,
} from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PaymentGauge } from '@/components/private/common/PaymentGauge';
import { CheckCircleIcon, ClockIcon, DownloadIcon, EyeIcon, ReceiptIcon, FileTextIcon, SendIcon, WalletIcon, XCircleIcon } from '@icons';
import { Modal } from '@/components/common/Modal';
import { useAuth } from '@/components/providers/AuthProvider';
import { PageHeader } from '@/components/private/common/PageHeader';
import { StatCard, StatRow } from '@/components/private/common/StatRow';
import { DECLINE_REASONS, type DeclineReason, type InvoiceStatus, type TravauxInvoice } from '@/types/travaux';

/**
 * Espace membre — devis et factures (module Travaux) du client auquel le
 * compte est rattaché, en PDF ; les brouillons ne remontent pas. Un devis
 * envoyé attend la réponse du client : accepté, sa facture est générée et
 * envoyée ; décliné, son retour (motif, budget, précisions) part à l'équipe.
 */
export default function MemberBilling() {
  const { t, i18n } = useTranslation('member');
  const [tab, setTab]             = useState('invoices');
  const [documents, setDocuments] = useState<TravauxInvoice[]>([]);
  const [loading, setLoading]     = useState(true);

  const load = () => apiService.listBillingDocuments()
    .then((res) => setDocuments(res.documents || []))
    .catch(() => toast.error(t('billing.loadError')))
    .finally(() => setLoading(false));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const quotes   = documents.filter((d) => d.kind === 'quote');
  const invoices = documents.filter((d) => d.kind === 'invoice');
  // Payments settle invoices: what's paid is what they received, the rest is due.
  const paidOf = (d: TravauxInvoice) => (d.status === 'paid' ? d.amount_cents : Math.min(d.paid_cents ?? 0, d.amount_cents));
  const toPay = invoices
    .filter((d) => d.status === 'sent' || d.status === 'overdue')
    .reduce((total, d) => total + d.amount_cents - paidOf(d), 0);
  const paid = invoices.reduce((total, d) => total + paidOf(d), 0);

  const fmtMoney = (cents: number) =>
    new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(cents / 100);
  const fmtDate = (iso?: string | null) => iso
    ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(`${iso}T00:00:00`))
    : '—';

  return (
    <div className="dash-page">
      <PageHeader title={t('billing.heading')} description={t('billing.subtitle')} />

      <StatRow>
        <StatCard icon={<ReceiptIcon size={18} />} label={t('billing.invoices')} value={invoices.length} loading={loading} />
        <StatCard icon={<FileTextIcon size={18} />} label={t('billing.quotes')} value={quotes.length} loading={loading} />
        <StatCard icon={<WalletIcon size={18} />} label={t('billing.stats.toPay')} value={fmtMoney(toPay)} loading={loading} tone={toPay ? 'warning' : undefined} />
        <StatCard icon={<CheckCircleIcon size={18} />} label={t('billing.stats.paid')} value={fmtMoney(paid)} loading={loading} tone={paid ? 'success' : undefined} />
      </StatRow>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="invoices" icon={<ReceiptIcon  size={14} />} count={invoices.length}>{t('billing.invoices')}</TabsTrigger>
          <TabsTrigger value="quotes"   icon={<FileTextIcon size={14} />} count={quotes.length}>{t('billing.quotes')}</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <BillingTable rows={invoices} loading={loading} kind="factures" empty={t('billing.noInvoices')} emptyIcon={<ReceiptIcon size={16} />}
                        paidOf={paidOf} fmtMoney={fmtMoney} fmtDate={fmtDate} onChanged={load} />
        </TabsContent>
        <TabsContent value="quotes">
          <BillingTable rows={quotes} loading={loading} kind="devis" empty={t('billing.noQuotes')} emptyIcon={<FileTextIcon size={16} />}
                        paidOf={paidOf} fmtMoney={fmtMoney} fmtDate={fmtDate} onChanged={load} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// A sent quote waits for the client's answer: « À valider ».
const awaiting = (d: TravauxInvoice) => d.kind === 'quote' && d.status === 'sent';
const statusKey = (d: TravauxInvoice) => (awaiting(d) ? 'awaiting' : d.status);

function variant(status: InvoiceStatus) {
  if (status === 'paid' || status === 'accepted') return 'success' as const;
  if (status === 'overdue')                       return 'danger'  as const;
  if (status === 'declined')                      return 'warning' as const;
  if (status === 'sent')                          return 'info'    as const;
  if (status === 'cancelled')                     return 'muted'   as const;
  return 'default' as const;
}

interface BillingTableProps {
  rows: TravauxInvoice[];
  loading: boolean;
  /** CSV file name. */
  kind: string;
  empty: string;
  emptyIcon: ReactNode;
  paidOf: (d: TravauxInvoice) => number;
  fmtMoney: (cents: number) => string;
  fmtDate: (iso?: string | null) => string;
  /** After an answer to a quote: the list (and the new invoice) reloads. */
  onChanged: () => void;
}

/** One tab's documents: search, selection (PDFs + CSV), icon-only download. */
function BillingTable({ rows, loading, kind, empty, emptyIcon, paidOf, fmtMoney, fmtDate, onChanged }: BillingTableProps) {
  const { t } = useTranslation('member');
  const { t: tc } = useTranslation('common');
  const [q, setQ] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [preview, setPreview] = useState<TravauxInvoice | null>(null);

  const visible = useMemo(
    () => filterRows(rows, q, (d) => [d.printed_number, d.title, t(`billing.statuses.${statusKey(d)}`), d.due_on]),
    [rows, q, t],
  );
  const selection = useRowSelection(visible, (d) => d.id);

  async function download(doc: TravauxInvoice) {
    setDownloading(doc.id);
    try {
      const { blob, filename } = await apiService.downloadBillingDocumentPdf(doc.id);
      saveBlob(blob, filename);
    } catch {
      toast.error(t('billing.downloadError'));
    } finally {
      setDownloading(null);
    }
  }

  // One PDF after the other: browsers drop simultaneous downloads.
  async function downloadSelection() {
    setBulkBusy(true);
    let failed = 0;
    for (const doc of selection.selectedRows) {
      try {
        const { blob, filename } = await apiService.downloadBillingDocumentPdf(doc.id);
        saveBlob(blob, filename);
      } catch {
        failed += 1;
      }
    }
    setBulkBusy(false);
    if (failed) toast.error(tc('table.bulkFailed'));
    else toast.success(tc('table.bulkDone', { count: selection.count }));
    selection.clear();
  }

  function exportSelection() {
    exportRowsCsv(kind, [
      [t('billing.number'), (d) => d.printed_number],
      [t('billing.label'), (d) => d.title ?? ''],
      [t('billing.status'), (d) => t(`billing.statuses.${statusKey(d)}`)],
      [t('billing.dueOn'), (d) => d.due_on ?? ''],
      [t('billing.total'), (d) => (d.amount_cents / 100).toFixed(2)],
      [t('billing.stats.paid'), (d) => (paidOf(d) / 100).toFixed(2)],
    ], selection.selectedRows);
  }

  return (
    <>
      <DataTableToolbar>
        <DataTableSearch value={q} onChange={setQ} />
      </DataTableToolbar>

      <DataTableSelectionBar count={selection.count} onClear={selection.clear} onExport={exportSelection}>
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" disabled={bulkBusy} onClick={downloadSelection}>
          <DownloadIcon size={13} /> {t('billing.downloadPdfs')}
        </button>
      </DataTableSelectionBar>

      <DataTable>
        <DataTableHead>
          <DataTableRow>
            <DataTableSelectTh checked={selection.allChecked} indeterminate={selection.someChecked} onChange={selection.toggleAll} ariaLabel={tc('table.selectAll')} />
            <DataTableTh>{t('billing.number')}</DataTableTh>
            <DataTableTh>{t('billing.label')}</DataTableTh>
            <DataTableTh>{t('billing.status')}</DataTableTh>
            <DataTableTh>{t('billing.dueOn')}</DataTableTh>
            <DataTableTh>{t('billing.total')}</DataTableTh>
            <DataTableTh>{tc('table.actions')}</DataTableTh>
          </DataTableRow>
        </DataTableHead>
        <DataTableBody>
          {loading && <DataTableEmpty label="…" />}
          {!loading && visible.length === 0 && (
            <DataTableEmpty icon={emptyIcon} label={q ? tc('table.noResults', { query: q }) : empty} />
          )}
          {visible.map((doc) => (
            <DataTableRow key={doc.id}>
              <DataTableSelectTd checked={selection.isSelected(doc.id)} onChange={(checked) => selection.toggle(doc.id, checked)} ariaLabel={tc('table.selectRow')} />
              <DataTableTd className="font-mono text-sm">{doc.printed_number}</DataTableTd>
              <DataTableTd>{doc.title || '—'}</DataTableTd>
              <DataTableTd>
                {doc.kind === 'invoice'
                  ? <PaymentGauge status={doc.status} amountCents={doc.amount_cents} paidCents={paidOf(doc)} />
                  : <StatusBadge label={t(`billing.statuses.${statusKey(doc)}`)} variant={awaiting(doc) ? 'warning' : variant(doc.status)} />}
              </DataTableTd>
              <DataTableTd>{fmtDate(doc.due_on)}</DataTableTd>
              <DataTableTd>{fmtMoney(doc.amount_cents)}</DataTableTd>
              <DataTableTd>
                <div className="adm-table__actions">
                  <DataTableAction icon={EyeIcon} label={t('billing.preview')} onClick={() => setPreview(doc)} />
                </div>
              </DataTableTd>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      <DocumentModal
        doc={preview}
        downloading={!!preview && downloading === preview.id}
        onDownload={download}
        onClose={() => setPreview(null)}
        onDecided={(doc) => { setPreview(doc); onChanged(); }}
        fmtMoney={fmtMoney}
      />
    </>
  );
}

/**
 * The document as its PDF, with « Envoyer » (by e-mail, PDF attached — to
 * oneself by default) and « Télécharger ». A quote waiting for an answer
 * gets « Accepter » / « Décliner » above it.
 */
function DocumentModal({ doc, downloading, onDownload, onClose, onDecided, fmtMoney }: {
  doc: TravauxInvoice | null;
  downloading: boolean;
  onDownload: (doc: TravauxInvoice) => void;
  onClose: () => void;
  onDecided: (doc: TravauxInvoice) => void;
  fmtMoney: (cents: number) => string;
}) {
  const { t } = useTranslation('member');
  const { user } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [to, setTo] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!doc) return undefined;
    let objectUrl: string | null = null;
    setUrl(null); setFailed(false); setSendOpen(false); setTo(user?.email ?? '');
    apiService.downloadBillingDocumentPdf(doc.id)
      .then(({ blob }) => { objectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' })); setUrl(objectUrl); })
      .catch(() => setFailed(true));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [doc, user?.email]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!doc) return;
    setSending(true);
    try {
      const recipients = to.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
      const res = await apiService.sendBillingDocument(doc.id, recipients);
      toast.success(t('billing.send.done', { to: res.sent_to.join(', ') }));
      setSendOpen(false);
    } catch {
      toast.error(t('billing.send.error'));
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      open={!!doc}
      onClose={onClose}
      title={doc ? `${doc.title || t(doc.kind === 'quote' ? 'billing.quote' : 'billing.invoice')}` : ''}
      subtitle={doc?.printed_number}
      size="lg"
      footer={doc && (
        <>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setSendOpen((v) => !v)}>
            <SendIcon size={13} /> {t('billing.send.cta')}
          </button>
          <button type="button" className="adm-btn adm-btn--primary" disabled={downloading} onClick={() => onDownload(doc)}>
            <DownloadIcon size={13} /> {t('billing.downloadPdf')}
          </button>
        </>
      )}
    >
      {doc?.kind === 'quote' && <QuoteDecision doc={doc} onDecided={onDecided} fmtMoney={fmtMoney} />}
      {sendOpen && (
        <form className="mb-send" onSubmit={send}>
          <label className="adm-form__label" htmlFor="mb-send-to">{t('billing.send.to')}</label>
          <div className="mb-send__row">
            <input id="mb-send-to" className="adm-input" value={to} onChange={(e) => setTo(e.target.value)} placeholder="compta@entreprise.fr" />
            <button type="submit" className="adm-btn adm-btn--primary" disabled={sending || !to.trim()}>
              <SendIcon size={13} /> {t('billing.send.submit')}
            </button>
          </div>
          <p className="mb-send__hint">{t('billing.send.hint')}</p>
        </form>
      )}
      <div className="mb-pdf">
        {url ? <iframe title={doc?.printed_number ?? 'PDF'} src={url} className="mb-pdf__frame" /> : failed ? (
          <p className="mb-pdf__state">{t('billing.downloadError')}</p>
        ) : <PdfSkeleton />}
      </div>
    </Modal>
  );
}

/**
 * The client's answer to a quote. Waiting: accept (after a confirmation —
 * the invoice follows by e-mail) or decline (why, the budget in mind, what to
 * change). Answered: what was decided, when and by whom.
 */
function QuoteDecision({ doc, onDecided, fmtMoney }: {
  doc: TravauxInvoice;
  onDecided: (doc: TravauxInvoice) => void;
  fmtMoney: (cents: number) => string;
}) {
  const { t, i18n } = useTranslation('member');
  const [mode, setMode] = useState<'idle' | 'accept' | 'decline'>('idle');
  const [reason, setReason] = useState<DeclineReason | null>(null);
  const [budget, setBudget] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setMode('idle'); setReason(null); setBudget(''); setDetails(''); }, [doc.id]);

  const decidedOn = doc.decided_at
    ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(doc.decided_at))
    : null;

  if (doc.status === 'accepted') {
    return (
      <div className="mb-decision mb-decision--accepted">
        <CheckCircleIcon size={18} />
        <div className="mb-decision__body">
          <p className="mb-decision__title">{t('billing.decision.acceptedTitle')}</p>
          <p className="mb-decision__text">
            {decidedOn ? t('billing.decision.acceptedInfo', { date: decidedOn, name: doc.decided_by_name ?? '—' }) : t('billing.decision.acceptedShort')}
          </p>
        </div>
      </div>
    );
  }
  if (doc.status === 'declined') {
    return (
      <div className="mb-decision mb-decision--declined">
        <XCircleIcon size={18} />
        <div className="mb-decision__body">
          <p className="mb-decision__title">{t('billing.decision.declinedTitle')}</p>
          <p className="mb-decision__text">
            {t(`billing.decision.reasons.${doc.decline_reason ?? 'other'}`)}
            {doc.decline_budget_cents != null && ` · ${t('billing.decision.budget')} : ${fmtMoney(doc.decline_budget_cents)}`}
            {decidedOn && ` · ${decidedOn}`}
          </p>
          <p className="mb-decision__text">{t('billing.decision.declinedInfo')}</p>
        </div>
      </div>
    );
  }
  if (doc.status !== 'sent') return null;

  async function accept() {
    setBusy(true);
    try {
      const res = await apiService.acceptBillingQuote(doc.id);
      toast.success(t('billing.decision.acceptedDone', { number: res.invoice.printed_number }));
      onDecided(res.document);
    } catch {
      toast.error(t('billing.decision.error'));
    } finally {
      setBusy(false);
    }
  }

  async function decline(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;
    setBusy(true);
    try {
      const euros = Number(budget.replace(/\s/g, '').replace(',', '.'));
      const res = await apiService.declineBillingQuote(doc.id, {
        reason,
        budget_cents: budget.trim() && Number.isFinite(euros) ? Math.round(euros * 100) : null,
        details: details.trim(),
      });
      toast.success(t('billing.decision.declinedDone'));
      onDecided(res.document);
    } catch {
      toast.error(t('billing.decision.error'));
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'decline') {
    return (
      <form className="mb-decision mb-decision--form" onSubmit={decline}>
        <div className="mb-decision__body">
          <p className="mb-decision__title">{t('billing.decision.declineTitle')}</p>
          <p className="mb-decision__text">{t('billing.decision.declineText')}</p>

          <p className="adm-form__label">{t('billing.decision.reason')} *</p>
          <div className="mb-decision__reasons" role="radiogroup" aria-label={t('billing.decision.reason')}>
            {DECLINE_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={reason === r}
                className={['mb-decision__reason', reason === r ? 'is-active' : ''].filter(Boolean).join(' ')}
                onClick={() => setReason(r)}
              >
                {t(`billing.decision.reasons.${r}`)}
              </button>
            ))}
          </div>

          <div className="adm-form__row">
            <div className="adm-form__field">
              <label className="adm-form__label" htmlFor="mb-decline-budget">{t('billing.decision.budget')}</label>
              <input id="mb-decline-budget" className="adm-input" inputMode="decimal" placeholder={t('billing.decision.budgetPlaceholder')}
                     value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^\d\s,.]/g, ''))} />
              <p className="mb-send__hint">{t('billing.decision.budgetHint', { amount: fmtMoney(doc.amount_cents) })}</p>
            </div>
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="mb-decline-details">{t('billing.decision.details')}</label>
            <textarea id="mb-decline-details" className="adm-textarea" rows={3} maxLength={2000}
                      placeholder={t('billing.decision.detailsPlaceholder')} value={details} onChange={(e) => setDetails(e.target.value)} />
          </div>
        </div>
        <div className="mb-decision__actions">
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setMode('idle')}>{t('billing.decision.back')}</button>
          <button type="submit" className="adm-btn adm-btn--primary" disabled={busy || !reason}>
            <SendIcon size={13} /> {t('billing.decision.submit')}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="mb-decision mb-decision--waiting">
      <ClockIcon size={18} />
      <div className="mb-decision__body">
        <p className="mb-decision__title">
          {mode === 'accept' ? t('billing.decision.confirmTitle', { amount: fmtMoney(doc.amount_cents) }) : t('billing.decision.title')}
        </p>
        <p className="mb-decision__text">{mode === 'accept' ? t('billing.decision.confirmText') : t('billing.decision.text')}</p>
      </div>
      <div className="mb-decision__actions">
        {mode === 'accept' ? (
          <>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setMode('idle')}>{t('billing.decision.back')}</button>
            <button type="button" className="adm-btn adm-btn--primary" disabled={busy} onClick={accept}>
              <CheckCircleIcon size={13} /> {t('billing.decision.confirm')}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setMode('decline')}>{t('billing.decision.decline')}</button>
            <button type="button" className="adm-btn adm-btn--primary" onClick={() => setMode('accept')}>
              <CheckCircleIcon size={13} /> {t('billing.decision.accept')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** An A4 page taking shape while the PDF is fetched. */
function PdfSkeleton() {
  return (
    <div className="mb-pdf__skeleton" role="status" aria-busy="true">
      <div className="mb-pdf__page">
        <div className="mb-pdf__row">
          <span className="mailp-skel" style={{ width: 90, height: 34 }} />
          <span className="mailp-skel" style={{ width: 120, height: 12 }} />
        </div>
        <span className="mailp-skel" style={{ width: '40%', height: 14, margin: '28px auto 0' }} />
        <span className="mailp-skel" style={{ width: '60%', height: 20, margin: '10px auto 0' }} />
        <div className="mb-pdf__table">
          {[0, 1, 2, 3, 4].map((i) => <span key={i} className="mailp-skel" style={{ height: 14 }} />)}
        </div>
        <span className="mailp-skel" style={{ width: '30%', height: 16, margin: '18px 0 0 auto' }} />
        <span className="mailp-skel" style={{ width: '70%', height: 10, margin: '40px auto 0' }} />
        <span className="mailp-skel" style={{ width: '50%', height: 10, margin: '8px auto 0' }} />
      </div>
    </div>
  );
}
