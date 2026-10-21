import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { apiService } from '@/services/api';
import { PageHeader } from '@/components/private/common/PageHeader';
import { StatCard, StatRow } from '@/components/private/common/StatRow';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { useModal } from '@/components/providers/ModalProvider';
import {
  DataTable, DataTableAction, DataTableBody, DataTableEmpty, DataTableHead, DataTableRow, DataTableSearch, DataTableSelectionBar,
  DataTableSelectTd, DataTableSelectTh, DataTableTd, DataTableTh, DataTableToolbar, exportRowsCsv, filterRows, useRowSelection,
} from '@/components/common/DataTable';
import { CalendarIcon, CheckCircleIcon, PlusIcon, XCircleIcon } from '@icons';

interface Appointment {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  kind: string;
  status: string;
  location?: string;
}

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  pending: 'warning', confirmed: 'success', completed: 'default', cancelled: 'danger', no_show: 'danger',
};
const cancellable = (a: Appointment) => a.status === 'pending' || a.status === 'confirmed';

export default function MemberAppointments() {
  const { t, i18n } = useTranslation('member');
  const { t: tc } = useTranslation('common');
  const confirm = useConfirm();
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const { openConsultationModal } = useModal();

  const reload = () =>
    apiService.listAppointments()
      .then((res) => setItems(res.appointments || []))
      .finally(() => setLoading(false));

  useEffect(() => { reload(); }, []);

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  const kindLabel = (a: Appointment) => t(`appointments.kinds.${a.kind}`, { defaultValue: a.kind });
  const statusLabel = (a: Appointment) => t(`appointments.statuses.${a.status}`, { defaultValue: a.status });

  const rows = filterRows(items, query, (a) => [fmtDate(a.scheduled_at), kindLabel(a), statusLabel(a), a.location]);
  const selection = useRowSelection(rows, (a) => a.id);

  const cancel = async (a: Appointment) => {
    if (!(await confirm({ title: t('appointments.confirmCancel') }))) return;
    try { await apiService.cancelAppointment(a.id); reload(); }
    catch { toast.error(tc('table.bulkFailed')); }
  };

  // Only the appointments that can still be cancelled are.
  const cancelSelected = async () => {
    const targets = selection.selectedRows.filter(cancellable);
    if (!targets.length || !(await confirm({ title: t('appointments.confirmCancel') }))) return;
    const results = await Promise.allSettled(targets.map((a) => apiService.cancelAppointment(a.id)));
    if (results.some((r) => r.status === 'rejected')) toast.error(tc('table.bulkFailed'));
    else toast.success(tc('table.bulkDone', { count: results.length }));
    selection.clear(); reload();
  };

  const exportSelection = () => exportRowsCsv('rendez-vous', [
    [t('appointments.scheduledAt'), (a) => fmtDate(a.scheduled_at)],
    [t('appointments.kind'), kindLabel],
    [t('appointments.duration'), (a) => `${a.duration_minutes} min`],
    [t('appointments.location'), (a) => a.location ?? ''],
    [t('appointments.status'), statusLabel],
  ], selection.selectedRows);

  const now = Date.now();
  const isCancelled = (a: Appointment) => a.status === 'cancelled' || a.status === 'no_show';
  const cancelled = items.filter(isCancelled).length;
  const upcoming = items.filter((a) => !isCancelled(a) && a.status !== 'completed' && new Date(a.scheduled_at).getTime() >= now).length;
  const past = items.length - cancelled - upcoming;

  return (
    <div className="dash-page">
      <PageHeader
        title={t('appointments.heading')}
        description={t('appointments.subtitle')}
        actions={
          <button type="button" className="adm-btn adm-btn--primary" onClick={() => openConsultationModal()}>
            <PlusIcon size={14} /> {t('appointments.newButton')}
          </button>
        }
      />

      <StatRow>
        <StatCard icon={<CalendarIcon size={18} />} label={t('appointments.stats.upcoming')} value={upcoming} loading={loading} />
        <StatCard icon={<CheckCircleIcon size={18} />} label={t('appointments.stats.past')} value={past} loading={loading} />
        <StatCard icon={<XCircleIcon size={18} />} label={t('appointments.stats.cancelled')} value={cancelled} loading={loading} />
      </StatRow>

      <div>
        <DataTableToolbar>
          <DataTableSearch value={query} onChange={setQuery} />
        </DataTableToolbar>

        <DataTableSelectionBar count={selection.count} onClear={selection.clear} onExport={exportSelection}>
          {selection.selectedRows.some(cancellable) && (
            <button type="button" className="adm-btn adm-btn--danger adm-btn--sm" onClick={cancelSelected}>
              <XCircleIcon size={13} /> {t('appointments.cancel')}
            </button>
          )}
        </DataTableSelectionBar>

        {/* The table is always there, with its empty state when there is nothing yet. */}
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableSelectTh checked={selection.allChecked} indeterminate={selection.someChecked} onChange={selection.toggleAll} ariaLabel={tc('table.selectAll')} />
              <DataTableTh>{t('appointments.scheduledAt')}</DataTableTh>
              <DataTableTh>{t('appointments.kind')}</DataTableTh>
              <DataTableTh>{t('appointments.duration')}</DataTableTh>
              <DataTableTh>{t('appointments.location')}</DataTableTh>
              <DataTableTh>{t('appointments.status')}</DataTableTh>
              <DataTableTh>{t('appointments.actions')}</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {loading && <DataTableEmpty label="…" />}
            {!loading && rows.length === 0 && (
              <DataTableEmpty
                icon={<CalendarIcon size={28} />}
                label={query ? tc('table.noResults', { query }) : t('appointments.empty')}
              />
            )}
            {!loading && rows.map((a) => (
              <DataTableRow key={a.id}>
                <DataTableSelectTd checked={selection.isSelected(a.id)} onChange={(checked) => selection.toggle(a.id, checked)} ariaLabel={tc('table.selectRow')} />
                <DataTableTd>{fmtDate(a.scheduled_at)}</DataTableTd>
                <DataTableTd>{kindLabel(a)}</DataTableTd>
                <DataTableTd>{a.duration_minutes} min</DataTableTd>
                <DataTableTd>{a.location || '—'}</DataTableTd>
                <DataTableTd><StatusBadge label={statusLabel(a)} variant={STATUS_VARIANT[a.status] ?? 'default'} /></DataTableTd>
                <DataTableTd>
                  <div className="adm-table__actions">
                    {cancellable(a) && (
                      <DataTableAction icon={XCircleIcon} label={t('appointments.cancel')} variant="danger" onClick={() => cancel(a)} />
                    )}
                  </div>
                </DataTableTd>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </div>
    </div>
  );
}
