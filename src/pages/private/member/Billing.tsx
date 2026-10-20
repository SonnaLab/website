import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { apiService, saveBlob } from '@/services/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/common/Tabs';
import { DataTable, DataTableHead, DataTableBody, DataTableRow, DataTableTh, DataTableTd, DataTableEmpty } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
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
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    apiService.listBillingDocuments()
      .then((res) => setDocuments(res.documents || []))
      .catch(() => toast.error(t('billing.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  const quotes   = documents.filter((d) => d.kind === 'quote');
  const invoices = documents.filter((d) => d.kind === 'invoice');
  const sum = (rows: TravauxInvoice[]) => rows.reduce((total, d) => total + d.amount_cents, 0);
  const toPay = sum(invoices.filter((d) => d.status === 'sent' || d.status === 'overdue'));
  const paid  = sum(invoices.filter((d) => d.status === 'paid'));

  const fmtMoney = (cents: number) =>
    new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(cents / 100);
  const fmtDate = (iso?: string | null) => iso
    ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(`${iso}T00:00:00`))
    : '—';

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

  function variant(status: InvoiceStatus) {
    if (status === 'paid' || status === 'accepted') return 'success' as const;
    if (status === 'overdue')                       return 'danger'  as const;
    if (status === 'sent')                          return 'info'    as const;
    if (status === 'cancelled')                     return 'muted'   as const;
    return 'default' as const;
  }

  function table(rows: TravauxInvoice[], empty: string, emptyIcon: React.ReactNode) {
    return (
      <DataTable>
        <DataTableHead>
          <DataTableRow>
            <DataTableTh>{t('billing.number')}</DataTableTh>
            <DataTableTh>{t('billing.label')}</DataTableTh>
            <DataTableTh>{t('billing.status')}</DataTableTh>
            <DataTableTh>{t('billing.dueOn')}</DataTableTh>
            <DataTableTh>{t('billing.total')}</DataTableTh>
            <DataTableTh>{t('billing.download')}</DataTableTh>
          </DataTableRow>
        </DataTableHead>
        <DataTableBody>
          {loading && <DataTableEmpty label="…" />}
          {!loading && rows.length === 0 && <DataTableEmpty icon={emptyIcon} label={empty} />}
          {rows.map((doc) => (
            <DataTableRow key={doc.id}>
              <DataTableTd className="font-mono text-sm">{doc.printed_number}</DataTableTd>
              <DataTableTd>{doc.title || '—'}</DataTableTd>
              <DataTableTd><StatusBadge label={t(`billing.statuses.${doc.status}`)} variant={variant(doc.status)} /></DataTableTd>
              <DataTableTd>{fmtDate(doc.due_on)}</DataTableTd>
              <DataTableTd>{fmtMoney(doc.amount_cents)}</DataTableTd>
              <DataTableTd>
                <button
                  type="button"
                  className="adm-btn adm-btn--ghost adm-btn--xs"
                  disabled={downloading === doc.id}
                  onClick={() => download(doc)}
                  title={t('billing.download')}
                >
                  <DownloadIcon size={13} /> PDF
                </button>
              </DataTableTd>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    );
  }

  return (
    <div className="dash-page">
      <PageHeader icon={<FileTextIcon size={26} />} title={t('billing.heading')} description={t('billing.subtitle')} />

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

        <TabsContent value="invoices">{table(invoices, t('billing.noInvoices'), <ReceiptIcon size={16} />)}</TabsContent>
        <TabsContent value="quotes">{table(quotes, t('billing.noQuotes'), <FileTextIcon size={16} />)}</TabsContent>
      </Tabs>
    </div>
  );
}
