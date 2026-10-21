import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { apiService, type InfraCronjob } from '@/services/api';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DataTable, DataTableBody, DataTableEmpty, DataTableHead, DataTableRow, DataTableTd, DataTableTh } from '@/components/common/DataTable';
import { ClockIcon, ZapIcon } from '@icons';
import { cronLabel, formatDateTime } from './format';

/** The scheduled jobs: when they run, how the last run went, and « Lancer ». */
export function CronjobsTab() {
  const { t, i18n } = useTranslation('admin');
  const [jobs, setJobs] = useState<InfraCronjob[] | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const locale = i18n.language;

  const load = () => apiService.adminInfraCronjobs().then((r) => setJobs(r.jobs)).catch(() => setJobs([]));
  useEffect(() => { load(); }, []);

  async function run(job: InfraCronjob) {
    setRunning(job.name);
    try {
      await apiService.adminInfraRunCronjob(job.name);
      toast.success(t('infrastructure.cron.queued', { name: t(`infrastructure.cron.jobs.${job.name}`, { defaultValue: job.name }) }));
      window.setTimeout(load, 4000);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setRunning(null);
    }
  }

  return (
    <Card className="overflow-hidden gap-0">
      <DataTable>
        <DataTableHead>
          <DataTableRow>
            <DataTableTh>{t('infrastructure.cron.job')}</DataTableTh>
            <DataTableTh>{t('infrastructure.cron.schedule')}</DataTableTh>
            <DataTableTh>{t('infrastructure.cron.lastRun')}</DataTableTh>
            <DataTableTh>{t('infrastructure.cron.nextRun')}</DataTableTh>
            <DataTableTh>{t('users.table.actions')}</DataTableTh>
          </DataTableRow>
        </DataTableHead>
        <DataTableBody>
          {jobs === null && <DataTableEmpty label={t('common.loading')} />}
          {jobs?.length === 0 && <DataTableEmpty icon={<ClockIcon size={28} />} label={t('infrastructure.cron.empty')} />}
          {jobs?.map((job) => (
            <DataTableRow key={job.name}>
              <DataTableTd>
                <span className="trv-client-cell__name">{t(`infrastructure.cron.jobs.${job.name}`, { defaultValue: job.name })}</span>
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
                <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" disabled={running === job.name} onClick={() => run(job)}>
                  <ZapIcon size={13} /> {t('infrastructure.cron.run')}
                </button>
              </DataTableTd>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </Card>
  );
}
