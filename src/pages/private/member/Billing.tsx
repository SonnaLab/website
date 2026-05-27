import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { apiService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/common/Tabs';
import { DataTable, DataTableHead, DataTableBody, DataTableRow, DataTableTh, DataTableTd, DataTableEmpty } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ReceiptIcon, FileTextIcon } from '@icons';

interface Money { cents: number; currency: string }
interface Quote   { id: string; number: string; status: string; total: Money; issued_on?: string; valid_until?: string }
interface Invoice { id: string; number: string; status: string; total: Money; amount_due: Money; due_on?: string }

export default function MemberBilling() {
  const { t, i18n } = useTranslation('member');
  const [tab, setTab]           = useState('invoices');
  const [quotes, setQuotes]     = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading]   = useState(true);

  const reload = () => {
    setLoading(true);
    Promise.all([apiService.listQuotes(), apiService.listInvoices()])
      .then(([q, i]) => { setQuotes(q.quotes || []); setInvoices(i.invoices || []); })
      .finally(() => setLoading(false));
  };
  useEffect(reload, []);

  const fmtMoney = (m?: Money) => {
    if (!m) return '—';
    return new Intl.NumberFormat(i18n.language, { style: 'currency', currency: m.currency || 'EUR' })
      .format((m.cents || 0) / 100);
  };
  const fmtDate = (iso?: string) => iso
    ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(iso))
    : '—';

  const accept = async (id: string) => { try { await apiService.acceptQuote(id); reload(); } catch { toast.error(t('billing.accept')); } };
  const reject = async (id: string) => { try { await apiService.rejectQuote(id); reload(); } catch { toast.error(t('billing.reject')); } };

  function invoiceVariant(status: string) {
    if (status === 'paid')                  return 'success' as const;
    if (status === 'overdue')               return 'danger'  as const;
    if (status === 'sent' || status === 'open') return 'info' as const;
    if (status === 'draft')                 return 'muted'   as const;
    return 'default' as const;
  }

  function quoteVariant(status: string) {
    if (status === 'accepted')  return 'success' as const;
    if (status === 'rejected')  return 'danger'  as const;
    if (status === 'sent')      return 'info'    as const;
    if (status === 'draft')     return 'muted'   as const;
    return 'default' as const;
  }

  return (
    <div className="admin-news">
      <header className="admin-news__header">
        <div className="admin-news__header-title">
          <ReceiptIcon size={22} />
          <h1>{t('billing.title')}</h1>
        </div>
        <p className="admin-news__header-sub">{t('billing.subtitle')}</p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="invoices" icon={<ReceiptIcon  size={14} />}>{t('billing.invoices')}</TabsTrigger>
          <TabsTrigger value="quotes"   icon={<FileTextIcon size={14} />}>{t('billing.quotes')}</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableTh>{t('billing.number')}</DataTableTh>
                <DataTableTh>{t('billing.status')}</DataTableTh>
                <DataTableTh>{t('billing.dueOn')}</DataTableTh>
                <DataTableTh className="text-right">{t('billing.total')}</DataTableTh>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {loading && <DataTableEmpty label="…" />}
              {!loading && invoices.length === 0 && <DataTableEmpty icon={<ReceiptIcon size={16} />} label={t('billing.noInvoices')} />}
              {invoices.map((inv) => (
                <DataTableRow key={inv.id}>
                  <DataTableTd className="font-mono text-sm">{inv.number}</DataTableTd>
                  <DataTableTd><StatusBadge label={inv.status} variant={invoiceVariant(inv.status)} /></DataTableTd>
                  <DataTableTd>{fmtDate(inv.due_on)}</DataTableTd>
                  <DataTableTd className="text-right">{fmtMoney(inv.total)}</DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </TabsContent>

        <TabsContent value="quotes">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableTh>{t('billing.number')}</DataTableTh>
                <DataTableTh>{t('billing.status')}</DataTableTh>
                <DataTableTh>{t('billing.issuedOn')}</DataTableTh>
                <DataTableTh>{t('billing.total')}</DataTableTh>
                <DataTableTh className="text-right">{t('appointments.actions')}</DataTableTh>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {loading && <DataTableEmpty label="…" />}
              {!loading && quotes.length === 0 && <DataTableEmpty icon={<FileTextIcon size={16} />} label={t('billing.noQuotes')} />}
              {quotes.map((q) => (
                <DataTableRow key={q.id}>
                  <DataTableTd className="font-mono text-sm">{q.number}</DataTableTd>
                  <DataTableTd><StatusBadge label={q.status} variant={quoteVariant(q.status)} /></DataTableTd>
                  <DataTableTd>{fmtDate(q.issued_on)}</DataTableTd>
                  <DataTableTd>{fmtMoney(q.total)}</DataTableTd>
                  <DataTableTd className="text-right space-x-2">
                    {q.status === 'sent' && (
                      <>
                        <Button size="sm" onClick={() => accept(q.id)}>{t('billing.accept')}</Button>
                        <Button size="sm" variant="ghost" onClick={() => reject(q.id)}>{t('billing.reject')}</Button>
                      </>
                    )}
                  </DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </TabsContent>
      </Tabs>
    </div>
  );
}
