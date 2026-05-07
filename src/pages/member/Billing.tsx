import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { apiService } from '../../services/api';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';

interface Money { cents: number; currency: string }
interface Quote   { id: string; number: string; status: string; total: Money; issued_on?: string; valid_until?: string }
interface Invoice { id: string; number: string; status: string; total: Money; amount_due: Money; due_on?: string }

export default function MemberBilling() {
  const { t, i18n } = useTranslation('member');
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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">{t('billing.title')}</h1>
      </header>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">{t('billing.invoices')}</TabsTrigger>
          <TabsTrigger value="quotes">{t('billing.quotes')}</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          <Card className="overflow-hidden">
            {loading ? <p className="p-6 text-sm text-muted-foreground">…</p>
              : invoices.length === 0 ? <p className="p-6 text-sm text-muted-foreground">{t('billing.noInvoices')}</p>
              : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('billing.number')}</TableHead>
                      <TableHead>{t('billing.status')}</TableHead>
                      <TableHead>{t('billing.dueOn')}</TableHead>
                      <TableHead className="text-right">{t('billing.total')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-mono text-sm">{i.number}</TableCell>
                        <TableCell><Badge variant="secondary">{i.status}</Badge></TableCell>
                        <TableCell>{fmtDate(i.due_on)}</TableCell>
                        <TableCell className="text-right">{fmtMoney(i.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
          </Card>
        </TabsContent>

        <TabsContent value="quotes" className="mt-4">
          <Card className="overflow-hidden">
            {loading ? <p className="p-6 text-sm text-muted-foreground">…</p>
              : quotes.length === 0 ? <p className="p-6 text-sm text-muted-foreground">{t('billing.noQuotes')}</p>
              : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('billing.number')}</TableHead>
                      <TableHead>{t('billing.status')}</TableHead>
                      <TableHead>{t('billing.issuedOn')}</TableHead>
                      <TableHead>{t('billing.total')}</TableHead>
                      <TableHead className="text-right">{t('appointments.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotes.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell className="font-mono text-sm">{q.number}</TableCell>
                        <TableCell><Badge variant="secondary">{q.status}</Badge></TableCell>
                        <TableCell>{fmtDate(q.issued_on)}</TableCell>
                        <TableCell>{fmtMoney(q.total)}</TableCell>
                        <TableCell className="text-right space-x-2">
                          {q.status === 'sent' && (
                            <>
                              <Button size="sm" onClick={() => accept(q.id)}>{t('billing.accept')}</Button>
                              <Button size="sm" variant="ghost" onClick={() => reject(q.id)}>{t('billing.reject')}</Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
