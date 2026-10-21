import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Card } from '@/components/ui/card';
import { Modal } from '@/components/common/Modal';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  DataTable,
  DataTableBody,
  DataTableEmpty,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from '@/components/common/DataTable';
import { apiAssetUrl, apiService, saveBlob } from '@/services/api';
import { calculateDevis, dueDateCountdown } from '@/lib/devisCalc';
import { DownloadIcon, EyeIcon, FileTextIcon, PaperclipIcon, PenLineIcon, ReceiptIcon, SendIcon, Trash2Icon } from '@icons';
import type {
  InvoiceKind,
  InvoiceStatus,
  TravauxClient,
  TravauxInvoice,
  TravauxObjective,
  TravauxPayment,
  TravauxTask,
} from '@/types/travaux';
import type { TravauxResource } from './useTravauxData';
import type { TravauxTabHandle } from './tabHandle';
import { DocumentPreviewCard, type DocumentPreviewData } from './DocumentPreviewCard';
import { DocumentPreviewFrame } from './DocumentPreviewFrame';
import { FileDropzone } from './FileDropzone';
import { apiErrorMessage, dueTone, formatCents, formatDate, formatEuros, todayIso } from './format';
import { useConfirmDelete } from './useConfirmDelete';

const STATUSES: InvoiceStatus[] = ['draft', 'sent', 'accepted', 'paid', 'overdue', 'cancelled'];
const STATUS_VARIANT: Record<InvoiceStatus, 'default' | 'info' | 'success' | 'danger' | 'warning'> = {
  draft: 'default', sent: 'info', accepted: 'success', paid: 'success', overdue: 'danger', cancelled: 'warning',
};

// Past its due date, a document still waiting on the client shows in red.
const SETTLED: Record<InvoiceKind, InvoiceStatus[]> = {
  quote: ['accepted', 'cancelled'],
  invoice: ['paid', 'cancelled'],
};

interface InvoicesTabProps {
  /** Onglet Devis (quote) ou Factures (invoice). */
  kind: InvoiceKind;
  clientId: string;
  client: TravauxClient | null;
  issuer: TravauxClient | null;
  /** Tous les documents du client (devis et factures, pour les renvois). */
  invoices: TravauxInvoice[];
  objectives: TravauxObjective[];
  tasks: TravauxTask[];
  /** Pour la jauge de paiement des factures. */
  payments: TravauxPayment[];
  reload: (resources?: TravauxResource[]) => Promise<void>;
  /** Défini juste après « Générer un devis » / « Générer la facture » : ouvre son aperçu. */
  autoPreviewId: string | null;
  onAutoPreviewConsumed: () => void;
  /** La facture tirée d'un devis : la page passe à l'onglet Factures. */
  onInvoiceGenerated?: (invoice: TravauxInvoice) => void;
}

export const InvoicesTab = forwardRef<TravauxTabHandle, InvoicesTabProps>(function InvoicesTab(
  { kind, clientId, client, issuer, invoices, objectives, tasks, payments, reload, autoPreviewId, onAutoPreviewConsumed, onInvoiceGenerated },
  ref,
) {
  const { t } = useTranslation('admin');
  const confirmDelete = useConfirmDelete();
  const [newOpen, setNewOpen] = useState(false);
  const [preview, setPreview] = useState<TravauxInvoice | null>(null);
  const [edit, setEdit] = useState<TravauxInvoice | null>(null);
  const [send, setSend] = useState<TravauxInvoice | null>(null);
  const [generating, setGenerating] = useState(false);
  useImperativeHandle(ref, () => ({ openNew: () => setNewOpen(true) }));
  const rows = invoices.filter((i) => i.kind === kind);
  const paidCents = (invoice: TravauxInvoice) => payments
    .filter((p) => p.invoice_id === invoice.id && p.status === 'completed')
    .reduce((sum, p) => sum + p.amount_cents, 0);
  const byId = new Map(invoices.map((i) => [i.id, i]));

  useEffect(() => {
    if (!autoPreviewId) return;
    const invoice = invoices.find((i) => i.id === autoPreviewId && i.kind === kind);
    if (invoice) {
      setPreview(invoice);
      onAutoPreviewConsumed();
    }
  }, [autoPreviewId, invoices, kind, onAutoPreviewConsumed]);

  async function remove(invoice: TravauxInvoice) {
    if (!(await confirmDelete())) return;
    try {
      await apiService.adminTravauxDeleteInvoice(invoice.id);
      await reload(['invoices', 'payments', 'client']);
      setPreview(null);
      toast.success(t('travaux.invoices.deleted'));
    } catch (err) {
      toast.error(apiErrorMessage(err, t('common.error')));
    }
  }

  async function generateInvoice(quote: TravauxInvoice) {
    setGenerating(true);
    try {
      const { invoice } = await apiService.adminTravauxGenerateInvoice(quote.id);
      await reload(['invoices']);
      setPreview(null);
      toast.success(t('travaux.invoices.invoiceGenerated'));
      if (onInvoiceGenerated) onInvoiceGenerated(invoice);
      else setPreview(invoice);
    } catch (err) {
      toast.error(apiErrorMessage(err, t('travaux.invoices.generateInvoiceError')));
    } finally {
      setGenerating(false);
    }
  }

  const previewData = (invoice: TravauxInvoice): DocumentPreviewData => ({
    kindLabel: t(`travaux.invoices.kinds.${invoice.kind}`),
    printedNumber: invoice.printed_number,
    title: invoice.title,
    amount: invoice.amount_cents / 100,
    dueDate: invoice.due_on,
    issuedOn: invoice.issued_on,
    dailyRate: invoice.daily_rate_cents != null ? invoice.daily_rate_cents / 100 : null,
    objective: objectives.find((o) => o.id === invoice.objective_id) ?? null,
    tasks: tasks.filter((task) => task.objective_id === invoice.objective_id),
    issuer,
    client,
  });

  return (
    <div className="adm-form">
      <Card className="overflow-hidden gap-0">
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableTh>{t('travaux.invoices.number')}</DataTableTh>
              <DataTableTh>{t('travaux.common.title')}</DataTableTh>
              <DataTableTh>{t('travaux.invoices.amount')}</DataTableTh>
              <DataTableTh>{t('travaux.invoices.dueDate')}</DataTableTh>
              {kind === 'quote' && <DataTableTh>{t('travaux.common.status')}</DataTableTh>}
              <DataTableTh>{t(kind === 'quote' ? 'travaux.invoices.invoiceRef' : 'travaux.invoices.quoteRef')}</DataTableTh>
              {/* Invoices: how much is paid, in place of the attached document. */}
              <DataTableTh>{t(kind === 'quote' ? 'travaux.invoices.document' : 'travaux.common.status')}</DataTableTh>
              <DataTableTh>{t('travaux.clients.table.actions')}</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {rows.length === 0 && (
              <DataTableEmpty
                icon={<ReceiptIcon size={28} />}
                label={t(kind === 'quote' ? 'travaux.invoices.emptyQuotes' : 'travaux.invoices.emptyInvoices')}
                hint={kind === 'invoice' ? t('travaux.invoices.fromQuote') : undefined}
              />
            )}
            {rows.map((i) => {
              // Devis → sa facture ; facture → son devis d'origine.
              const linked = byId.get((kind === 'quote' ? i.generated_invoice_id : i.source_quote_id) ?? '');
              return (
                <DataTableRow key={i.id} onClick={() => setPreview(i)}>
                  <DataTableTd className="trv-num">{i.printed_number.replace(/V\d+$/, '')}<span className="trv-muted">V{i.current_version}</span></DataTableTd>
                  <DataTableTd><span className="trv-client-cell__name">{i.title}</span></DataTableTd>
                  <DataTableTd className="trv-num">{formatCents(i.amount_cents)}</DataTableTd>
                  <DataTableTd className="trv-num">
                    {i.due_on ? (
                      <>
                        {formatDate(i.due_on)}{' '}
                        <span className={dueTone(i.due_on, SETTLED[kind].includes(i.status)) === 'late' ? 'trv-due trv-due--late' : 'trv-muted'}>
                          ({dueDateCountdown(i.due_on)})
                        </span>
                      </>
                    ) : '—'}
                  </DataTableTd>
                  {kind === 'quote' && (
                    <DataTableTd><StatusBadge label={t(`travaux.invoices.statuses.${i.status}`)} variant={STATUS_VARIANT[i.status]} /></DataTableTd>
                  )}
                  <DataTableTd onClick={(e) => e.stopPropagation()}>
                    {linked ? (
                      <button type="button" className="trv-doc-ref" onClick={() => setPreview(linked)}>
                        {linked.printed_number.replace(/V\d+$/, '')}
                      </button>
                    ) : kind === 'quote' ? (
                      <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" disabled={generating} onClick={() => generateInvoice(i)}>
                        <FileTextIcon size={13} /> {t('travaux.invoices.generateInvoice')}
                      </button>
                    ) : (i.source_quote_number ?? '—')}
                  </DataTableTd>
                  <DataTableTd>
                    {kind === 'invoice' ? (
                      <PaymentGauge invoice={i} paidCents={paidCents(i)} />
                    ) : i.file_path ? (
                      <a className="trv-link" href={apiAssetUrl(i.file_path) ?? undefined} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title={i.file_name ?? ''}>
                        <PaperclipIcon size={13} />
                      </a>
                    ) : '—'}
                  </DataTableTd>
                  <DataTableTd onClick={(e) => e.stopPropagation()}>
                    <div className="adm-table__actions">
                      <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" title={t('travaux.common.view')} onClick={() => setPreview(i)}>
                        <EyeIcon size={13} />
                      </button>
                      <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" title={t('common.edit')} onClick={() => setEdit(i)}>
                        <PenLineIcon size={13} />
                      </button>
                      <button type="button" className="adm-btn adm-btn--danger adm-btn--xs" title={t('common.delete')} onClick={() => remove(i)}>
                        <Trash2Icon size={13} />
                      </button>
                    </div>
                  </DataTableTd>
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      </Card>

      <NewInvoiceModal
        open={newOpen}
        clientId={clientId}
        objectives={objectives}
        onClose={() => setNewOpen(false)}
        onCreated={async () => { await reload(['invoices']); setNewOpen(false); }}
      />
      <InvoicePreviewModal
        invoice={preview}
        data={preview ? previewData(preview) : null}
        generating={generating}
        onClose={() => setPreview(null)}
        onEdit={(i) => { setPreview(null); setEdit(i); }}
        onDelete={remove}
        onSend={(i) => { setPreview(null); setSend(i); }}
        onGenerateInvoice={generateInvoice}
      />
      <EditInvoiceModal
        invoice={edit}
        baseData={edit ? previewData(edit) : null}
        onClose={() => setEdit(null)}
        onSaved={async () => { await reload(['invoices', 'objectives', 'client']); setEdit(null); }}
      />
      <SendInvoiceModal
        invoice={send}
        clientName={client?.name ?? ''}
        onClose={() => setSend(null)}
        onSent={async () => { await reload(['invoices']); setSend(null); }}
      />
    </div>
  );
});

// ── Jauge de paiement d'une facture ─────────────────────────────────────────

/** Payée (pleine, verte), impayée (rouge) ou acompte : remplie au prorata. */
function PaymentGauge({ invoice, paidCents }: { invoice: TravauxInvoice; paidCents: number }) {
  const { t } = useTranslation('admin');
  if (invoice.status === 'draft' || invoice.status === 'cancelled') {
    return <span className="trv-pay trv-pay--muted">{t(`travaux.invoices.statuses.${invoice.status}`)}</span>;
  }
  const ratio = invoice.amount_cents > 0 ? Math.min(paidCents / invoice.amount_cents, 1) : 1;
  const detail = t('travaux.invoices.payment.detail', { paid: formatCents(paidCents), total: formatCents(invoice.amount_cents) });
  if (ratio >= 1) return <span className="trv-pay trv-pay--paid" title={detail}>{t('travaux.invoices.payment.paid')}</span>;
  if (ratio <= 0) return <span className="trv-pay trv-pay--unpaid" title={detail}>{t('travaux.invoices.payment.unpaid')}</span>;
  const percent = Math.round(ratio * 100);
  return (
    <span className="trv-pay trv-pay--partial" title={detail} role="meter" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <span className="trv-pay__fill" style={{ width: `${percent}%` }} />
      <span className="trv-pay__label">{t('travaux.invoices.payment.deposit')} · {percent} %</span>
    </span>
  );
}

// ── Nouveau devis ───────────────────────────────────────────────────────────

function NewInvoiceModal({
  open, clientId, objectives, onClose, onCreated,
}: {
  open: boolean;
  clientId: string;
  objectives: TravauxObjective[];
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const { t } = useTranslation('admin');
  const [objectiveId, setObjectiveId] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<InvoiceStatus>('draft');
  const [issuedOn, setIssuedOn] = useState('');
  const [dueOn, setDueOn] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setObjectiveId(''); setAmount(''); setStatus('draft'); setIssuedOn(''); setDueOn(''); setFile(null);
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiService.adminTravauxCreateInvoice({
        client_id: clientId,
        kind: 'quote',
        objective_id: objectiveId,
        amount_cents: Math.round(Number(amount || 0) * 100),
        status,
        issued_on: issuedOn || null,
        due_on: dueOn || null,
        file: file ?? undefined,
      });
      toast.success(t('travaux.invoices.created'));
      await onCreated();
    } catch (err) {
      toast.error(apiErrorMessage(err, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('travaux.invoices.new')}
      footer={
        <>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" form="trv-new-invoice" className="adm-btn adm-btn--primary" disabled={saving}>{t('common.create')}</button>
        </>
      }
    >
      <form id="trv-new-invoice" className="adm-form" onSubmit={submit}>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="trv-inv-objective">{t('travaux.invoices.livrable')} *</label>
          <select id="trv-inv-objective" className="adm-select" required value={objectiveId} onChange={(e) => setObjectiveId(e.target.value)}>
            <option value="">{t('travaux.common.none')}</option>
            {objectives.map((o) => <option key={o.id} value={o.id}>{o.title}{o.project_name ? ` — ${o.project_name}` : ''}</option>)}
          </select>
        </div>
        <div className="adm-form__row">
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-inv-amount">{t('travaux.invoices.amount')}</label>
            <div className="trv-input-suffix">
              <input id="trv-inv-amount" type="number" step="0.01" className="adm-input" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <span>€</span>
            </div>
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-inv-status">{t('travaux.common.status')}</label>
            <select id="trv-inv-status" className="adm-select" value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)}>
              {STATUSES.map((s) => <option key={s} value={s}>{t(`travaux.invoices.statuses.${s}`)}</option>)}
            </select>
          </div>
        </div>
        <div className="adm-form__row">
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-inv-issued">{t('travaux.invoices.issueDate')}</label>
            <input id="trv-inv-issued" type="date" className="adm-input" value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} />
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-inv-due">{t('travaux.invoices.dueDate')}</label>
            <input id="trv-inv-due" type="date" className="adm-input" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
          </div>
        </div>
        <div className="adm-form__field">
          <span className="adm-form__label">{t('travaux.invoices.document')}</span>
          <FileDropzone file={file} onChange={setFile} />
        </div>
      </form>
    </Modal>
  );
}

// ── Aperçu (lecture seule) ──────────────────────────────────────────────────

function InvoicePreviewModal({
  invoice, data, generating, onClose, onEdit, onDelete, onSend, onGenerateInvoice,
}: {
  invoice: TravauxInvoice | null;
  data: DocumentPreviewData | null;
  generating: boolean;
  onClose: () => void;
  onEdit: (i: TravauxInvoice) => void;
  onDelete: (i: TravauxInvoice) => void;
  onSend: (i: TravauxInvoice) => void;
  onGenerateInvoice: (i: TravauxInvoice) => void;
}) {
  const { t } = useTranslation('admin');
  const [downloading, setDownloading] = useState(false);

  async function download(i: TravauxInvoice) {
    setDownloading(true);
    try {
      const { blob, filename } = await apiService.adminTravauxDownloadInvoicePdf(i.id);
      saveBlob(blob, filename);
    } catch {
      toast.error(t('travaux.invoices.downloadError'));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Modal
      open={!!invoice}
      onClose={onClose}
      title={invoice?.title || t(`travaux.invoices.kinds.${invoice?.kind ?? 'quote'}`)}
      subtitle={invoice && <StatusBadge label={t(`travaux.invoices.statuses.${invoice.status}`)} variant={STATUS_VARIANT[invoice.status]} />}
      size="lg"
      footer={invoice && (
        <>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => onEdit(invoice)}><PenLineIcon size={13} /> {t('common.edit')}</button>
          <button type="button" className="adm-btn adm-btn--danger" onClick={() => onDelete(invoice)}><Trash2Icon size={13} /> {t('common.delete')}</button>
          {invoice.kind === 'quote' && !invoice.generated_invoice_id && (
            <button type="button" className="adm-btn adm-btn--ghost" disabled={generating} onClick={() => onGenerateInvoice(invoice)}>
              <FileTextIcon size={13} /> {t('travaux.invoices.generateInvoice')}
            </button>
          )}
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => onSend(invoice)}><SendIcon size={13} /> {t('travaux.invoices.send')}</button>
          <button type="button" className="adm-btn adm-btn--primary" disabled={downloading} onClick={() => download(invoice)}>
            <DownloadIcon size={13} /> {t('travaux.invoices.download')}
          </button>
        </>
      )}
    >
      {data && (
        <DocumentPreviewFrame>
          <DocumentPreviewCard data={data} />
        </DocumentPreviewFrame>
      )}
    </Modal>
  );
}

// ── Édition : formulaire à gauche, aperçu en direct à droite ────────────────

function EditInvoiceModal({
  invoice, baseData, onClose, onSaved,
}: {
  invoice: TravauxInvoice | null;
  baseData: DocumentPreviewData | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useTranslation('admin');
  const [dailyRate, setDailyRate] = useState('');
  const [issuedOn, setIssuedOn] = useState('');
  const [dueOn, setDueOn] = useState('');
  const [status, setStatus] = useState<InvoiceStatus>('draft');
  const [amount, setAmount] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!invoice) return;
    setDailyRate(invoice.daily_rate_cents != null ? String(invoice.daily_rate_cents / 100) : '');
    setIssuedOn(invoice.issued_on || todayIso());
    setDueOn(invoice.due_on ?? '');
    setStatus(invoice.status);
    setAmount(String(invoice.amount_cents / 100));
    setFile(null);
    setRemoveFile(false);
  }, [invoice]);

  // Avec un livrable dont les tâches sont notées, le montant est calculé (lecture seule).
  const calc = baseData?.objective ? calculateDevis(baseData.tasks, dueOn || null, dailyRate ? Number(dailyRate) : null, issuedOn || null) : null;
  const computedAmount = calc && calc.allocations.length > 0 ? calc.totalPrice : null;

  const liveData: DocumentPreviewData | null = baseData && invoice ? {
    ...baseData,
    dueDate: dueOn || null,
    issuedOn: issuedOn || null,
    dailyRate: dailyRate ? Number(dailyRate) : null,
    amount: computedAmount ?? (amount ? Number(amount) : invoice.amount_cents / 100),
  } : null;

  async function submit() {
    if (!invoice) return;
    setSaving(true);
    try {
      await apiService.adminTravauxUpdateInvoice(invoice.id, {
        daily_rate_cents: dailyRate ? Math.round(Number(dailyRate) * 100) : null,
        issued_on: issuedOn || null,
        due_on: dueOn || null,
        status,
        amount_cents: Math.round(Number(computedAmount ?? (amount || 0)) * 100),
        file: file ?? undefined,
        remove_file: removeFile && !file ? true : undefined,
      });
      toast.success(t('travaux.invoices.saved'));
      await onSaved();
    } catch (err) {
      toast.error(apiErrorMessage(err, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={!!invoice}
      onClose={onClose}
      title={invoice?.title || t(`travaux.invoices.kinds.${invoice?.kind ?? 'quote'}`)}
      size="xl"
      footer={
        <>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button type="button" className="adm-btn adm-btn--primary" onClick={submit} disabled={saving}>{t('common.save')}</button>
        </>
      }
    >
      {invoice && (
        <div className="trv-split">
          <div className="trv-split__form">
            <div>
              <p className="trv-fieldset-label">{t('travaux.invoices.terms')}</p>
              <div className="adm-form">
                <div className="adm-form__row">
                  <div className="adm-form__field">
                    <label className="adm-form__label" htmlFor="trv-edit-rate">{t('travaux.invoices.dailyRate')}</label>
                    <input id="trv-edit-rate" type="number" min={0} step="10" className="adm-input" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} />
                  </div>
                  <div className="adm-form__field">
                    <label className="adm-form__label" htmlFor="trv-edit-due">{t('travaux.invoices.dueDate')}</label>
                    <input id="trv-edit-due" type="date" className="adm-input" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
                  </div>
                </div>
                <div className="adm-form__row">
                  <div className="adm-form__field">
                    <label className="adm-form__label" htmlFor="trv-edit-issued">{t('travaux.invoices.issueDate')}</label>
                    <input id="trv-edit-issued" type="date" className="adm-input" value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} />
                  </div>
                  <div className="adm-form__field">
                    <label className="adm-form__label" htmlFor="trv-edit-status">{t('travaux.common.status')}</label>
                    <select id="trv-edit-status" className="adm-select" value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)}>
                      {STATUSES.map((s) => <option key={s} value={s}>{t(`travaux.invoices.statuses.${s}`)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="adm-form__field">
                  <label className="adm-form__label" htmlFor="trv-edit-amount">{t('travaux.invoices.amount')}</label>
                  {computedAmount != null ? (
                    <div className="trv-readonly">{formatEuros(computedAmount)}</div>
                  ) : (
                    <div className="trv-input-suffix">
                      <input id="trv-edit-amount" type="number" step="0.01" className="adm-input" value={amount} onChange={(e) => setAmount(e.target.value)} />
                      <span>€</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div>
              <p className="trv-fieldset-label">{t('travaux.invoices.document')}</p>
              <FileDropzone
                file={file}
                onChange={(f) => { setFile(f); setRemoveFile(false); }}
                existingUrl={removeFile ? null : apiAssetUrl(invoice.file_path)}
                existingName={invoice.file_name}
                onRemoveExisting={() => setRemoveFile(true)}
              />
            </div>
          </div>
          <div className="trv-split__preview">
            {liveData && (
              <DocumentPreviewFrame>
                <DocumentPreviewCard data={liveData} />
              </DocumentPreviewFrame>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Envoyer : passe le document au statut « envoyé » ────────────────────────

function SendInvoiceModal({
  invoice, clientName, onClose, onSent,
}: {
  invoice: TravauxInvoice | null;
  clientName: string;
  onClose: () => void;
  onSent: () => Promise<void>;
}) {
  const { t } = useTranslation('admin');
  const [sending, setSending] = useState(false);

  async function confirm() {
    if (!invoice) return;
    setSending(true);
    try {
      await apiService.adminTravauxUpdateInvoice(invoice.id, { status: 'sent' });
      toast.success(t('travaux.invoices.sentDone'));
      await onSent();
    } catch (err) {
      toast.error(apiErrorMessage(err, t('common.error')));
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      open={!!invoice}
      onClose={onClose}
      title={t('travaux.invoices.send')}
      size="sm"
      footer={
        <>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button type="button" className="adm-btn adm-btn--primary" onClick={confirm} disabled={sending}>
            <SendIcon size={13} /> {t('travaux.invoices.send')}
          </button>
        </>
      }
    >
      {invoice && (
        <div className="adm-form">
          <p className="trv-info">{t('travaux.invoices.sendConfirm', { title: invoice.title, client: clientName })}</p>
          <p className="trv-muted">{t('travaux.invoices.sendHint')}</p>
        </div>
      )}
    </Modal>
  );
}
