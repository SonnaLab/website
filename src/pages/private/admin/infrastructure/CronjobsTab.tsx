import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { apiService, type InfraCronjob } from '@/services/api';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  DataTable, DataTableAction, DataTableBody, DataTableEmpty, DataTableHead, DataTableRow, DataTableSearch, DataTableSelectionBar,
  DataTableSelectTd, DataTableSelectTh, DataTableTd, DataTableTh, DataTableToolbar, exportRowsCsv, filterRows, useRowSelection,
} from '@/components/common/DataTable';
import { ClockIcon, ZapIcon } from '@icons';
import { cronLabel, formatDateTime } from './format';

const idOf = (job: InfraCronjob) => job.name;

/** The scheduled jobs: when they run, how the last run went, and « Lancer ». */
export function CronjobsTab() {
  const { t, i18n } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const [jobs, setJobs] = useState<InfraCronjob[] | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const locale = i18n.language;

  const load = () => apiService.adminInfraCronjobs().then((r) => setJobs(r.jobs)).catch(() => setJobs([]));
  useEffect(() => { load(); }, []);

  const jobLabel = (job: InfraCronjob) => t(`infrastructure.cron.jobs.${job.name}`, { defaultValue: job.name });

  const rows = useMemo(
    () => filterRows(jobs ?? [], query, (j) => [
      t(`infrastructure.cron.jobs.${j.name}`, { defaultValue: j.name }), j.name, j.job_class, j.queue, j.cron, cronLabel(j.cron, t),
    ]),
    [jobs, query, t],
  );
  const selection = useRowSelection(rows, idOf);

  async function run(job: InfraCronjob) {
    setRunning(job.name);
    try {
      await apiService.adminInfraRunCronjob(job.name);
      toast.success(t('infrastructure.cron.queued', { name: jobLabel(job) }));
      window.setTimeout(load, 4000);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setRunning(null);
    }
  }

  // Bulk: queue every selected job, then reload once they had time to run.
  async function bulkRun() {
    setRunning('bulk');
    const results = await Promise.allSettled(selection.selectedRows.map((job) => apiService.adminInfraRunCronjob(job.name)));
    setRunning(null);
    if (results.some((r) => r.status === 'rejected')) toast.error(tc('table.bulkFailed'));
    else toast.success(tc('table.bulkDone', { count: results.length }));
    selection.clear();
    window.setTimeout(load, 4000);
  }

  function exportSelection() {
    exportRowsCsv('taches-planifiees', [
      [t('infrastructure.cron.job'), (j) => jobLabel(j)],
      ['Job', (j) => `${j.job_class} · ${j.queue}`],
      [t('infrastructure.cron.schedule'), (j) => `${cronLabel(j.cron, t)} (${j.cron})`],
      [t('infrastructure.cron.lastRun'), (j) => (j.last_run_at ? formatDateTime(j.last_run_at, locale) : t('infrastructure.cron.never'))],
      [t('travaux.common.status'), (j) => (j.last_status ? t(j.last_status === 'ok' ? 'infrastructure.cron.ok' : 'infrastructure.cron.failed') : '')],
      [t('infrastructure.cron.nextRun'), (j) => formatDateTime(j.next_run_at, locale)],
    ], selection.selectedRows);
  }

  return (
    <div className="infra-stack">
      <DataTableToolbar>
        <DataTableSearch value={query} onChange={setQuery} />
      </DataTableToolbar>

      <DataTableSelectionBar count={selection.count} onClear={selection.clear} onExport={exportSelection}>
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" disabled={running === 'bulk'} onClick={bulkRun}>
          <ZapIcon size={13} /> {t('infrastructure.cron.run')}
        </button>
      </DataTableSelectionBar>

      <Card className="overflow-hidden gap-0">
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableSelectTh checked={selection.allChecked} indeterminate={selection.someChecked} onChange={selection.toggleAll} ariaLabel={tc('table.selectAll')} />
              <DataTableTh>{t('infrastructure.cron.job')}</DataTableTh>
              <DataTableTh>{t('infrastructure.cron.schedule')}</DataTableTh>
              <DataTableTh>{t('infrastructure.cron.lastRun')}</DataTableTh>
              <DataTableTh>{t('infrastructure.cron.nextRun')}</DataTableTh>
              <DataTableTh>{t('users.table.actions')}</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {jobs === null && <DataTableEmpty label={t('common.loading')} />}
            {jobs !== null && rows.length === 0 && (
              <DataTableEmpty icon={<ClockIcon size={28} />} label={query ? tc('table.noResults', { query }) : t('infrastructure.cron.empty')} />
            )}
            {rows.map((job) => (
              <DataTableRow key={job.name}>
                <DataTableSelectTd checked={selection.isSelected(job.name)} onChange={(checked) => selection.toggle(job.name, checked)} ariaLabel={tc('table.selectRow')} />
                <DataTableTd>
                  <span className="trv-client-cell__name">{jobLabel(job)}</span>
                  <span className="infra-sub">{job.job_class} · {job.queue}</span>
                </DataTableTd>
                <DataTableTd>
                  {cronLabel(job.cron, t)}
                  <span className="infra-sub infra-mono">{job.cron}</span>
                </DataTableTd>
                <DataTableTd>
                  {job.last_run_at ? (
                    <>
                      <StatusBadge
                        label={t(job.last_status === 'ok' ? 'infrastructure.cron.ok' : 'infrastructure.cron.failed')}
                        variant={job.last_status === 'ok' ? 'success' : 'danger'}
                      />{' '}
                      <span className="trv-num">{formatDateTime(job.last_run_at, locale)}</span>
                      <span className="infra-sub" title={job.last_message ?? ''}>
                        {job.last_duration_ms != null ? `${(job.last_duration_ms / 1000).toFixed(1)} s` : ''}{job.last_message ? ` · ${job.last_message}` : ''}
                      </span>
                    </>
                  ) : <span className="trv-muted">{t('infrastructure.cron.never')}</span>}
                </DataTableTd>
                <DataTableTd className="trv-num">{formatDateTime(job.next_run_at, locale)}</DataTableTd>
                <DataTableTd>
                  <div className="adm-table__actions">
                    <DataTableAction icon={ZapIcon} label={t('infrastructure.cron.run')} variant="success" disabled={running === job.name} onClick={() => run(job)} />
                  </div>
                </DataTableTd>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </Card>
    </div>
  );
}
