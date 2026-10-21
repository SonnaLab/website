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
import { CheckCircleIcon, DownloadIcon, ReceiptIcon, FileTextIcon, WalletIcon } from '@icons';
import { PageHeader } from '@/components/private/common/PageHeader';
import { StatCard, StatRow } from '@/components/private/common/StatRow';
import type { InvoiceStatus, TravauxInvoice } from '@/types/travaux';

/**
 * Espace membre — devis et factures (module Travaux) du client auquel le
 * compte est rattaché. Lecture seule + PDF ; les brouillons ne remontent pas.
 */
export default function MemberBilling() {
  const { t, i18n } = useTranslation('member');
  const [tab, setTab]             = useState('invoices');
  const [documents, setDocuments] = useState<TravauxInvoice[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    apiService.listBillingDocuments()
      .then((res) => setDocuments(res.documents || []))
      .catch(() => toast.error(t('billing.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

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
                        paidOf={paidOf} fmtMoney={fmtMoney} fmtDate={fmtDate} />
        </TabsContent>
        <TabsContent value="quotes">
          <BillingTable rows={quotes} loading={loading} kind="devis" empty={t('billing.noQuotes')} emptyIcon={<FileTextIcon size={16} />}
                        paidOf={paidOf} fmtMoney={fmtMoney} fmtDate={fmtDate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function variant(status: InvoiceStatus) {
  if (status === 'paid' || status === 'accepted') return 'success' as const;
  if (status === 'overdue')                       return 'danger'  as const;
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
}

/** One tab's documents: search, selection (PDFs + CSV), icon-only download. */
function BillingTable({ rows, loading, kind, empty, emptyIcon, paidOf, fmtMoney, fmtDate }: BillingTableProps) {
  const { t } = useTranslation('member');
  const { t: tc } = useTranslation('common');
  const [q, setQ] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const visible = useMemo(
    () => filterRows(rows, q, (d) => [d.printed_number, d.title, t(`billing.statuses.${d.status}`), d.due_on]),
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
      [t('billing.status'), (d) => t(`billing.statuses.${d.status}`)],
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
                  : <StatusBadge label={t(`billing.statuses.${doc.status}`)} variant={variant(doc.status)} />}
              </DataTableTd>
              <DataTableTd>{fmtDate(doc.due_on)}</DataTableTd>
              <DataTableTd>{fmtMoney(doc.amount_cents)}</DataTableTd>
              <DataTableTd>
                <div className="adm-table__actions">
                  <DataTableAction icon={DownloadIcon} label={t('billing.downloadPdf')} disabled={downloading === doc.id} onClick={() => download(doc)} />
                </div>
              </DataTableTd>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </>
  );
}
