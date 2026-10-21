import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import type { InfraResponse } from './types';

/** The services, one panel each: application, database, Redis, then Sidekiq and the deployment. */
export function OverviewTab({ data }: { data: InfraResponse | null }) {
  const { t } = useTranslation('admin');
  if (!data) return <p className="trk-loading">{t('common.loading')}</p>;

  const statusBadge = (s?: string) =>
    s === 'up'
      ? <Badge variant="default">{t('infrastructure.statusUp')}</Badge>
      : <Badge variant="destructive">{t('infrastructure.statusDown')}</Badge>;

  return (
    <div className="infra-grid infra-grid--overview">
      <Panel title={t('infrastructure.app')} badge={<Badge variant="outline">{data.app.env}</Badge>}>
        <Row label={t('infrastructure.version')} value={data.app.version} />
        <Row label={t('infrastructure.uptime')} value={`${Math.round(data.app.uptime_seconds / 60)} min`} />
        <Row label="Ruby" value={data.app.ruby} />
        <Row label="Rails" value={data.app.rails} />
      </Panel>

      <Panel title={t('infrastructure.database')} badge={statusBadge(data.database.status)}>
        <Row label={t('infrastructure.latency')} value={data.database.latency_ms != null ? `${data.database.latency_ms} ms` : '—'} />
        <Row label="Pool" value={`${data.database.pool_busy ?? 0} / ${data.database.pool_size ?? '—'}`} />
      </Panel>

      <Panel title={t('infrastructure.redis')} badge={statusBadge(data.redis.status)}>
        <Row label="Memory" value={data.redis.used_memory_human || '—'} />
        <Row label="Clients" value={data.redis.clients ?? '—'} />
      </Panel>

      <Panel title={t('infrastructure.sidekiq')} badge={statusBadge(data.sidekiq.status)} wide>
        <Row label="Processed" value={data.sidekiq.processed ?? '—'} />
        <Row label="Failed" value={data.sidekiq.failed ?? '—'} />
        <Row label={t('infrastructure.retries')} value={data.sidekiq.retries ?? '—'} />
        <Row label={t('infrastructure.dead')} value={data.sidekiq.dead ?? '—'} />
        <Row label={t('infrastructure.processes')} value={data.sidekiq.processes ?? '—'} />
      </Panel>

      <Panel title={t('infrastructure.deployment')} wide>
        <Row label={t('infrastructure.slot')} value={data.deployment.slot || '—'} />
        <Row label={t('infrastructure.commit')} value={data.deployment.commit ? data.deployment.commit.slice(0, 12) : '—'} />
      </Panel>
    </div>
  );
}

function Panel({ title, badge, wide, children }: { title: string; badge?: React.ReactNode; wide?: boolean; children: React.ReactNode }) {
  return (
    <section className={wide ? 'infra-panel infra-panel--half' : 'infra-panel'}>
      <header className="infra-panel__head">
        <h3>{title}</h3>
        {badge}
      </header>
      <dl className="infra-panel__rows">{children}</dl>
    </section>
  );
}

export function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="infra-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
