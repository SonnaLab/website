import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarIcon, ReceiptIcon, FileTextIcon, TrendingUpIcon } from '@icons';

import { useAuth } from '@/components/providers/AuthProvider';
import { apiService } from '@/services/api';
import { PageHeader } from '@/components/private/common/PageHeader';
import { StatCard, StatRow } from '@/components/private/common/StatRow';

interface Counters {
  appointments: number;
  invoices:     number;
  quotes:       number;
}

export default function MemberDashboard() {
  const { t } = useTranslation('member');
  const { user } = useAuth();
  const [counts, setCounts] = useState<Counters>({ appointments: 0, invoices: 0, quotes: 0 });

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      apiService.listAppointments(),
      apiService.listBillingDocuments(),
    ]).then((res) => {
      if (cancelled) return;
      const value = (i: number, key: string) =>
        res[i].status === 'fulfilled' ? ((res[i] as PromiseFulfilledResult<any>).value?.[key]?.length ?? 0) : 0;
      // Devis et factures arrivent dans une seule liste (documents Travaux du client).
      const documents = res[1].status === 'fulfilled' ? res[1].value.documents : [];
      setCounts({
        appointments: value(0, 'appointments'),
        invoices:     documents.filter((d) => d.kind === 'invoice').length,
        quotes:       documents.filter((d) => d.kind === 'quote').length,
      });
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="dash-page">
      <PageHeader
        icon={<TrendingUpIcon size={26} />}
        title={t('dashboard.title', { name: user?.first_name || user?.email })}
        description={t('dashboard.subtitle')}
      />

      <StatRow>
        <StatCard to="/dashboard/appointments" icon={<CalendarIcon size={18} />} label={t('dashboard.appointments')} value={counts.appointments} />
        <StatCard to="/dashboard/billing" icon={<FileTextIcon size={18} />} label={t('dashboard.quotes')} value={counts.quotes} />
        <StatCard to="/dashboard/billing" icon={<ReceiptIcon size={18} />} label={t('dashboard.invoices')} value={counts.invoices} />
      </StatRow>
    </div>
  );
}
