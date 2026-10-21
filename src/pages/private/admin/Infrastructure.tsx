import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ActivityIcon, AlertTriangleIcon, ClockIcon, LayersIcon, PlusIcon, RefreshCwIcon, ServerIcon, ZapIcon } from '@icons';
import { toast } from 'sonner';

import { apiService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/private/common/PageHeader';
import { StatCard, StatRow } from '@/components/private/common/StatRow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/common/Tabs';
import { OverviewTab } from './infrastructure/OverviewTab';
import { DatabaseTab } from './infrastructure/DatabaseTab';
import { CronjobsTab } from './infrastructure/CronjobsTab';
import { BackupsTab } from './infrastructure/BackupsTab';
import { ActivitiesTab } from './infrastructure/ActivitiesTab';
import type { InfraResponse } from './infrastructure/types';

const TABS = ['overview', 'database', 'cronjobs', 'backups', 'activities'] as const;
type TabKey = typeof TABS[number];

export default function AdminInfrastructure() {
  const { t } = useTranslation('admin');
  const [data, setData]       = useState<InfraResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') as TabKey | null;
  const tab: TabKey = urlTab && TABS.includes(urlTab) ? urlTab : 'overview';
  const setTab = (next: string) => setSearchParams((prev) => {
    const params = new URLSearchParams(prev);
    params.set('tab', next);
    return params;
  }, { replace: true });

  const reload = () => {
    setLoading(true);
    apiService.adminInfrastructure().then(setData).finally(() => setLoading(false));
  };
  useEffect(() => {
    reload();
    const id = setInterval(reload, 15_000);
    return () => clearInterval(id);
  }, []);

  // « Sauvegarder maintenant » (Backups tab): a manual backup, then the list reloads.
  const [backingUp, setBackingUp] = useState(false);
  const [backupsKey, setBackupsKey] = useState(0);
  async function backupNow() {
    setBackingUp(true);
    try {
      await apiService.adminInfraCreateBackup();
      toast.success(t('infrastructure.backups.queued'));
      window.setTimeout(() => setBackupsKey((k) => k + 1), 6000);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setBackingUp(false);
    }
  }

  return (
    <div className="dash-page">
      <PageHeader
        title={t('infrastructure.heading')}
        description={t('infrastructure.subtitle')}
        actions={tab === 'backups' ? (
          <button type="button" className="adm-btn adm-btn--primary" disabled={backingUp} onClick={backupNow}>
            <PlusIcon size={14} /> {t('infrastructure.backups.now')}
          </button>
        ) : (
          <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
            <RefreshCwIcon className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('infrastructure.refresh')}
          </Button>
        )}
      />

      <StatRow>
        <StatCard icon={<ServerIcon size={18} />} label={t('infrastructure.stats.environment')} value={data?.app.env ?? '—'} loading={!data} />
        <StatCard icon={<ZapIcon size={18} />} label={t('infrastructure.uptime')} value={data ? `${Math.round(data.app.uptime_seconds / 60)} min` : '—'} loading={!data} />
        <StatCard
          icon={<ActivityIcon size={18} />}
          label={t('infrastructure.stats.dbLatency')}
          value={data?.database.latency_ms != null ? `${data.database.latency_ms} ms` : '—'}
          tone={data && data.database.status !== 'up' ? 'danger' : undefined}
          loading={!data}
        />
        <StatCard
          icon={<LayersIcon size={18} />}
          label={t('infrastructure.redis')}
          value={data ? (data.redis.status === 'up' ? t('infrastructure.statusUp') : t('infrastructure.statusDown')) : '—'}
          tone={data ? (data.redis.status === 'up' ? 'success' : 'danger') : undefined}
          loading={!data}
        />
        <StatCard
          icon={<AlertTriangleIcon size={18} />}
          label={t('infrastructure.stats.failedJobs')}
          value={data?.sidekiq.failed ?? '—'}
          tone={data?.sidekiq.failed ? 'warning' : undefined}
          loading={!data}
        />
      </StatRow>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview" icon={<ServerIcon size={14} />}>{t('infrastructure.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="database" icon={<LayersIcon size={14} />}>{t('infrastructure.tabs.database')}</TabsTrigger>
          <TabsTrigger value="cronjobs" icon={<ClockIcon size={14} />}>{t('infrastructure.tabs.cronjobs')}</TabsTrigger>
          <TabsTrigger value="backups" icon={<RefreshCwIcon size={14} />}>{t('infrastructure.tabs.backups')}</TabsTrigger>
          <TabsTrigger value="activities" icon={<ActivityIcon size={14} />}>{t('infrastructure.tabs.activities')}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><OverviewTab data={data} /></TabsContent>
        <TabsContent value="database"><DatabaseTab /></TabsContent>
        <TabsContent value="cronjobs"><CronjobsTab /></TabsContent>
        <TabsContent value="backups"><BackupsTab reloadKey={backupsKey} /></TabsContent>
        <TabsContent value="activities"><ActivitiesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
