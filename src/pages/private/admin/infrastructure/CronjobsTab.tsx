import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { apiService, type InfraCronjob } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/common/Modal';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  DataTable, DataTableAction, DataTableBody, DataTableEmpty, DataTableHead, DataTableRow, DataTableSearch, DataTableSelectionBar,
  DataTableSelectTd, DataTableSelectTh, DataTableTd, DataTableTh, DataTableToolbar, exportRowsCsv, filterRows, useRowSelection,
} from '@/components/common/DataTable';
import { ClockIcon, EyeIcon, ZapIcon } from '@icons';
import { cronLabel, formatDateTime, nextCronRunUtc } from './format';

/** A Celery beat entry of Lesankofa (ai.sonnalab.com), as /admin/lesankofa/tasks returns it. */
interface LesankofaTask {
  name: string;
  task: string;
  schedule: string | null;
  kwargs: Record<string, unknown>;
  last_run_at: string | null;
  status: string; // running | success | error | idle
}

/** One table for both schedulers: Sidekiq-cron (api.sonnalab.com) and Celery beat (Lesankofa). */
type Row =
  | { key: string; platform: 'SonnaLab'; job: InfraCronjob }
  | { key: string; platform: 'Lesankofa'; task: LesankofaTask; nextRunAt: string | null };

type Outcome = 'ok' | 'failed' | 'running' | null;

const LESANKOFA_OUTCOME: Record<string, Outcome> = { success: 'ok', error: 'failed', running: 'running' };
const outcomeOf = (row: Row): Outcome => (row.platform === 'SonnaLab' ? row.job.last_status : LESANKOFA_OUTCOME[row.task.status] ?? null);
const lastRunOf = (row: Row) => (row.platform === 'SonnaLab' ? row.job.last_run_at : row.task.last_run_at);
const nextRunOf = (row: Row) => (row.platform === 'SonnaLab' ? row.job.next_run_at : row.nextRunAt);
const cronOf = (row: Row) => (row.platform === 'SonnaLab' ? row.job.cron : row.task.schedule);

/** The scheduled jobs of every platform: when they run, how the last run went, and « Lancer ». */
export function CronjobsTab() {
  const { t, i18n } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const [jobs, setJobs] = useState<InfraCronjob[] | null>(null);
  const [tasks, setTasks] = useState<LesankofaTask[] | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<LesankofaTask | null>(null);
  const locale = i18n.language;

  const loadJobs = () => apiService.adminInfraCronjobs().then((r) => setJobs(r.jobs)).catch(() => setJobs([]));
  const loadTasks = () => apiService.adminLesankofaTasks()
    .then((r: { tasks?: LesankofaTask[] }) => setTasks(r.tasks ?? []))
    .catch(() => setTasks([]));
  useEffect(() => { loadJobs(); loadTasks(); }, []);

  const jobName = (name: string) => t(`infrastructure.cron.jobs.${name}`, { defaultValue: name });
  const labelOf = (row: Row) => jobName(row.platform === 'SonnaLab' ? row.job.name : row.task.name);
  const subOf = (row: Row) => (row.platform === 'SonnaLab'
    ? `${row.job.job_class} · ${row.job.queue}`
    : `${row.task.task.split('.').pop()} · Celery`);
  const scheduleOf = (row: Row) => {
    const label = cronLabel(cronOf(row), t);
    return row.platform === 'Lesankofa' && cronOf(row) ? `${label} (UTC)` : label;
  };
  const outcomeLabel = (o: Outcome) => (o === 'running'
    ? t('infrastructure.cron.running')
    : t(o === 'ok' ? 'infrastructure.cron.ok' : 'infrastructure.cron.failed'));

  const allRows = useMemo<Row[]>(() => [
    ...(jobs ?? []).map((job): Row => ({ key: `sonnalab:${job.name}`, platform: 'SonnaLab', job })),
    ...(tasks ?? []).map((task): Row => ({
      key: `lesankofa:${task.name}`, platform: 'Lesankofa', task, nextRunAt: nextCronRunUtc(task.schedule),
    })),
  ], [jobs, tasks]);

  const rows = filterRows(allRows, query, (r) => [
    labelOf(r), r.platform, r.key, subOf(r), cronOf(r), scheduleOf(r),
  ]);
  const selection = useRowSelection(rows, (r) => r.key);
  const runnable = selection.selectedRows.flatMap((r) => (r.platform === 'SonnaLab' ? [r.job] : []));

  async function run(job: InfraCronjob) {
    setRunning(job.name);
    try {
      await apiService.adminInfraRunCronjob(job.name);
      toast.success(t('infrastructure.cron.queued', { name: jobName(job.name) }));
      window.setTimeout(loadJobs, 4000);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setRunning(null);
    }
  }

  // Bulk: queue every selected SonnaLab job (Lesankofa tasks run on Celery beat's schedule only).
  async function bulkRun() {
    setRunning('bulk');
    const results = await Promise.allSettled(runnable.map((job) => apiService.adminInfraRunCronjob(job.name)));
    setRunning(null);
    if (results.some((r) => r.status === 'rejected')) toast.error(tc('table.bulkFailed'));
    else toast.success(tc('table.bulkDone', { count: results.length }));
    selection.clear();
    window.setTimeout(loadJobs, 4000);
  }

  function exportSelection() {
    exportRowsCsv('taches-planifiees', [
      [t('infrastructure.cron.job'), (r) => labelOf(r)],
      [t('infrastructure.cron.platform'), (r) => r.platform],
      ['Job', (r) => subOf(r)],
      [t('infrastructure.cron.schedule'), (r) => `${scheduleOf(r)} (${cronOf(r) ?? ''})`],
      [t('infrastructure.cron.lastRun'), (r) => (lastRunOf(r) ? formatDateTime(lastRunOf(r), locale) : t('infrastructure.cron.never'))],
      [t('travaux.common.status'), (r) => (outcomeOf(r) ? outcomeLabel(outcomeOf(r)) : '')],
      [t('infrastructure.cron.nextRun'), (r) => formatDateTime(nextRunOf(r), locale)],
    ], selection.selectedRows);
  }

  const loading = jobs === null || tasks === null;

  return (
    <div className="infra-stack">
      <DataTableToolbar>
        <DataTableSearch value={query} onChange={setQuery} />
      </DataTableToolbar>

      <DataTableSelectionBar count={selection.count} onClear={selection.clear} onExport={exportSelection}>
        {runnable.length > 0 && (
          <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" disabled={running === 'bulk'} onClick={bulkRun}>
            <ZapIcon size={13} /> {t('infrastructure.cron.run')}
          </button>
        )}
      </DataTableSelectionBar>

      <Card className="overflow-hidden gap-0">
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableSelectTh checked={selection.allChecked} indeterminate={selection.someChecked} onChange={selection.toggleAll} ariaLabel={tc('table.selectAll')} />
              <DataTableTh>{t('infrastructure.cron.job')}</DataTableTh>
              <DataTableTh>{t('infrastructure.cron.platform')}</DataTableTh>
              <DataTableTh>{t('infrastructure.cron.schedule')}</DataTableTh>
              <DataTableTh>{t('infrastructure.cron.lastRun')}</DataTableTh>
              <DataTableTh>{t('infrastructure.cron.nextRun')}</DataTableTh>
              <DataTableTh>{t('users.table.actions')}</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {loading && rows.length === 0 && <DataTableEmpty label={t('common.loading')} />}
            {!loading && rows.length === 0 && (
              <DataTableEmpty icon={<ClockIcon size={28} />} label={query ? tc('table.noResults', { query }) : t('infrastructure.cron.empty')} />
            )}
            {rows.map((row) => {
              const outcome = outcomeOf(row);
              const lastRun = lastRunOf(row);
              return (
                <DataTableRow key={row.key}>
                  <DataTableSelectTd checked={selection.isSelected(row.key)} onChange={(checked) => selection.toggle(row.key, checked)} ariaLabel={tc('table.selectRow')} />
                  <DataTableTd>
                    <span className="trv-client-cell__name">{labelOf(row)}</span>
                    <span className="infra-sub">{subOf(row)}</span>
                  </DataTableTd>
                  <DataTableTd>
                    <StatusBadge label={row.platform} variant={row.platform === 'SonnaLab' ? 'muted' : 'info'} />
                  </DataTableTd>
                  <DataTableTd>
                    {scheduleOf(row)}
                    <span className="infra-sub infra-mono">{cronOf(row) ?? '—'}</span>
                  </DataTableTd>
                  <DataTableTd>
                    {lastRun ? (
                      <>
                        {outcome && (
                          <>
                            <StatusBadge
                              label={outcomeLabel(outcome)}
                              variant={outcome === 'ok' ? 'success' : outcome === 'running' ? 'info' : 'danger'}
                            />{' '}
                          </>
                        )}
                        <span className="trv-num">{formatDateTime(lastRun, locale)}</span>
                        {row.platform === 'SonnaLab' && (
                          <span className="infra-sub" title={row.job.last_message ?? ''}>
                            {row.job.last_duration_ms != null ? `${(row.job.last_duration_ms / 1000).toFixed(1)} s` : ''}{row.job.last_message ? ` · ${row.job.last_message}` : ''}
                          </span>
                        )}
                      </>
                    ) : <span className="trv-muted">{t('infrastructure.cron.never')}</span>}
                  </DataTableTd>
                  <DataTableTd className="trv-num">{formatDateTime(nextRunOf(row), locale)}</DataTableTd>
                  <DataTableTd>
                    <div className="adm-table__actions">
                      {row.platform === 'SonnaLab' ? (
                        <DataTableAction icon={ZapIcon} label={t('infrastructure.cron.run')} variant="success" disabled={running === row.job.name} onClick={() => run(row.job)} />
                      ) : (
                        <DataTableAction icon={EyeIcon} label={t('infrastructure.cron.details')} onClick={() => setSelected(row.task)} />
                      )}
                    </div>
                  </DataTableTd>
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      </Card>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? jobName(selected.name) : ''}
        subtitle={selected ? `Lesankofa · ${cronLabel(selected.schedule, t)}${selected.schedule ? ' (UTC)' : ''}` : undefined}
        size="md"
      >
        {selected && (
          <div className="rounded-lg bg-zinc-950 text-zinc-200 font-mono text-xs p-4 space-y-0.5 overflow-y-auto max-h-60 overflow-x-hidden">
            <div>{t('infrastructure.cron.function')} : {selected.task}</div>
            <div>Entry : {selected.name}</div>
            <div>Cron : {selected.schedule ?? '—'}</div>
            <div>{t('infrastructure.cron.lastRun')} : {selected.last_run_at ? formatDateTime(selected.last_run_at, locale) : t('infrastructure.cron.never')}</div>
            <div>{t('infrastructure.cron.nextRun')} : {formatDateTime(nextCronRunUtc(selected.schedule), locale)}</div>
            <div>Status : {selected.status}</div>
            {Object.keys(selected.kwargs ?? {}).length > 0 && <div>kwargs : {JSON.stringify(selected.kwargs)}</div>}
            {selected.status === 'error' && <div className="text-red-400">{t('infrastructure.cron.failed')}</div>}
          </div>
        )}
      </Modal>
    </div>
  );
}
