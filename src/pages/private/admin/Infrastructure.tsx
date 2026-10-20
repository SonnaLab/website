import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIcon, AlertTriangleIcon, LayersIcon, RefreshCwIcon, ServerIcon, ZapIcon } from '@icons';

import { apiService } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/private/common/PageHeader';
import { StatCard, StatRow } from '@/components/private/common/StatRow';

interface InfraResponse {
  app:        { version: string; env: string; ruby: string; rails: string; uptime_seconds: number };
  database:   { status: string; latency_ms?: number; pool_size?: number; pool_busy?: number };
  redis:      { status: string; used_memory_human?: string; clients?: number };
  sidekiq:    { status: string; processed?: number; failed?: number; enqueued?: number;
                queues?: Record<string, number>; retries?: number; dead?: number; processes?: number };
  deployment: { slot?: string; commit?: string };
}

export default function AdminInfrastructure() {
  const { t } = useTranslation('admin');
  const [data, setData]       = useState<InfraResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    setLoading(true);
    apiService.adminInfrastructure().then(setData).finally(() => setLoading(false));
  };
  useEffect(() => {
    reload();
    const id = setInterval(reload, 15_000);
    return () => clearInterval(id);
  }, []);

  const statusBadge = (s?: string) =>
    s === 'up'
      ? <Badge variant="default">{t('infrastructure.statusUp')}</Badge>
      : <Badge variant="destructive">{t('infrastructure.statusDown')}</Badge>;

  return (
    <div className="dash-page">
      <PageHeader
        title={t('infrastructure.heading')}
        description={t('infrastructure.subtitle')}
        actions={
          <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
            <RefreshCwIcon className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('infrastructure.refresh')}
          </Button>
        }
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

      {data && (
        <div className="infra-grid">
          <Panel title={t('infrastructure.app')} badge={<Badge variant="outline">{data.app.env}</Badge>}>
            <Row label={t('infrastructure.version')} value={data.app.version} />
            <Row label={t('infrastructure.uptime')} value={`${Math.round(data.app.uptime_seconds / 60)} min`} />
            <Row label="Ruby"  value={data.app.ruby}  />
            <Row label="Rails" value={data.app.rails} />
          </Panel>

          <Panel title={t('infrastructure.database')} badge={statusBadge(data.database.status)}>
            <Row label={t('infrastructure.latency')} value={data.database.latency_ms != null ? `${data.database.latency_ms} ms` : '—'} />
            <Row label="Pool" value={`${data.database.pool_busy ?? 0} / ${data.database.pool_size ?? '—'}`} />
          </Panel>

          <Panel title={t('infrastructure.redis')} badge={statusBadge(data.redis.status)}>
            <Row label="Memory"  value={data.redis.used_memory_human || '—'} />
            <Row label="Clients" value={data.redis.clients ?? '—'} />
          </Panel>

          <Panel title={t('infrastructure.sidekiq')} badge={statusBadge(data.sidekiq.status)}>
            <Row label="Processed"            value={data.sidekiq.processed ?? '—'} />
            <Row label="Failed"               value={data.sidekiq.failed ?? '—'} />
            <Row label={t('infrastructure.retries')}    value={data.sidekiq.retries ?? '—'} />
            <Row label={t('infrastructure.dead')}       value={data.sidekiq.dead ?? '—'} />
            <Row label={t('infrastructure.processes')}  value={data.sidekiq.processes ?? '—'} />
          </Panel>

          <Panel title={t('infrastructure.deployment')} wide>
            <Row label={t('infrastructure.slot')}   value={data.deployment.slot   || '—'} />
            <Row label={t('infrastructure.commit')} value={data.deployment.commit ? data.deployment.commit.slice(0, 12) : '—'} />
          </Panel>
        </div>
      )}
    </div>
  );
}

function Panel({ title, badge, wide, children }: { title: string; badge?: React.ReactNode; wide?: boolean; children: React.ReactNode }) {
  return (
    <section className={wide ? 'infra-panel infra-panel--wide' : 'infra-panel'}>
      <header className="infra-panel__head">
        <h3>{title}</h3>
        {badge}
      </header>
      <dl className="infra-panel__rows">{children}</dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="infra-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
