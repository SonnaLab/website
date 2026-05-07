import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { apiService } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Appointment {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  kind: string;
  status: string;
  location?: string;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary', confirmed: 'default', completed: 'outline',
  cancelled: 'destructive', no_show: 'destructive',
};

export default function MemberAppointments() {
  const { t, i18n } = useTranslation('member');
  const [items, setItems]     = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = () =>
    apiService.listAppointments()
      .then((res) => setItems(res.appointments || []))
      .finally(() => setLoading(false));

  useEffect(() => { reload(); }, []);

  const cancel = async (id: string) => {
    if (!confirm(t('appointments.confirmCancel'))) return;
    try { await apiService.cancelAppointment(id); reload(); }
    catch { toast.error(t('appointments.confirmCancel')); }
  };

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">{t('appointments.title')}</h1>
      </header>

      <Card className="overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">{t('appointments.empty')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('appointments.scheduledAt')}</TableHead>
                <TableHead>{t('appointments.kind')}</TableHead>
                <TableHead>{t('appointments.duration')}</TableHead>
                <TableHead>{t('appointments.location')}</TableHead>
                <TableHead>{t('appointments.status')}</TableHead>
                <TableHead className="text-right">{t('appointments.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{fmtDate(a.scheduled_at)}</TableCell>
                  <TableCell className="capitalize">{a.kind}</TableCell>
                  <TableCell>{a.duration_minutes} min</TableCell>
                  <TableCell>{a.location || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[a.status] || 'secondary'}>{a.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {(a.status === 'pending' || a.status === 'confirmed') && (
                      <Button size="sm" variant="ghost" onClick={() => cancel(a.id)}>
                        {t('appointments.cancel')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
