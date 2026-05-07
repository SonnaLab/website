import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCwIcon } from '@icons';

import { apiService } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">{t('infrastructure.title')}</h1>
          <p className="mt-1 text-muted-foreground text-sm">{t('infrastructure.subtitle')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
          <RefreshCwIcon className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t('infrastructure.refresh')}
        </Button>
      </header>

      {data && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">{t('infrastructure.app')}</h3>
              <Badge variant="outline">{data.app.env}</Badge>
            </div>
            <Row label={t('infrastructure.version')} value={data.app.version} />
            <Row label={t('infrastructure.uptime')} value={`${Math.round(data.app.uptime_seconds / 60)} min`} />
            <Row label="Ruby"  value={data.app.ruby}  />
            <Row label="Rails" value={data.app.rails} />
          </Card>

          <Card className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">{t('infrastructure.database')}</h3>
              {statusBadge(data.database.status)}
            </div>
            <Row label={t('infrastructure.latency')} value={data.database.latency_ms != null ? `${data.database.latency_ms} ms` : '—'} />
            <Row label="Pool" value={`${data.database.pool_busy ?? 0} / ${data.database.pool_size ?? '—'}`} />
          </Card>

          <Card className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">{t('infrastructure.redis')}</h3>
              {statusBadge(data.redis.status)}
            </div>
            <Row label="Memory"  value={data.redis.used_memory_human || '—'} />
            <Row label="Clients" value={data.redis.clients ?? '—'} />
          </Card>

          <Card className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">{t('infrastructure.sidekiq')}</h3>
              {statusBadge(data.sidekiq.status)}
            </div>
            <Row label="Processed"            value={data.sidekiq.processed ?? '—'} />
            <Row label="Failed"               value={data.sidekiq.failed ?? '—'} />
            <Row label={t('infrastructure.retries')}    value={data.sidekiq.retries ?? '—'} />
            <Row label={t('infrastructure.dead')}       value={data.sidekiq.dead ?? '—'} />
            <Row label={t('infrastructure.processes')}  value={data.sidekiq.processes ?? '—'} />
          </Card>

          <Card className="p-5 md:col-span-2 space-y-2">
            <h3 className="font-medium text-foreground">{t('infrastructure.deployment')}</h3>
            <Row label={t('infrastructure.slot')}   value={data.deployment.slot   || '—'} />
            <Row label={t('infrastructure.commit')} value={data.deployment.commit ? data.deployment.commit.slice(0, 12) : '—'} />
          </Card>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}
