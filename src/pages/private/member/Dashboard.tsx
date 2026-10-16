import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CalendarIcon, ReceiptIcon, FileTextIcon } from '@icons';

import { useAuth } from '@/components/providers/AuthProvider';
import { apiService } from '@/services/api';
import { Card } from '@/components/ui/card';

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

  const cards = [
    { to: '/dashboard/appointments', label: t('dashboard.appointments'), value: counts.appointments, icon: CalendarIcon     },
    { to: '/dashboard/billing',      label: t('dashboard.quotes'),       value: counts.quotes,       icon: FileTextIcon     },
    { to: '/dashboard/billing',      label: t('dashboard.invoices'),     value: counts.invoices,     icon: ReceiptIcon      },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">
          {t('dashboard.title', { name: user?.first_name || user?.email })}
        </h1>
        <p className="mt-1 text-muted-foreground">{t('dashboard.subtitle')}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ to, label, value, icon: Icon }) => (
          <Link key={label} to={to}>
            <Card className="p-5 hover:bg-secondary transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
                </div>
                <Icon className="size-5 text-muted-foreground" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
