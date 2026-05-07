import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { apiService } from '../../services/api';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';

export default function AdminTracking() {
  const { t } = useTranslation('admin');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">{t('tracking.title')}</h1>
        <p className="mt-1 text-muted-foreground text-sm">{t('tracking.subtitle')}</p>
      </header>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t('tracking.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="realtime">{t('tracking.tabs.realtime')}</TabsTrigger>
          <TabsTrigger value="sessions">{t('tracking.tabs.sessions')}</TabsTrigger>
          <TabsTrigger value="funnel">{t('tracking.tabs.funnel')}</TabsTrigger>
          <TabsTrigger value="geo">{t('tracking.tabs.geo')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4"><OverviewTab /></TabsContent>
        <TabsContent value="realtime" className="mt-4"><RealtimeTab /></TabsContent>
        <TabsContent value="sessions" className="mt-4"><SessionsTab /></TabsContent>
        <TabsContent value="funnel"   className="mt-4"><FunnelTab /></TabsContent>
        <TabsContent value="geo"      className="mt-4"><GeoTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { apiService.adminTrackingOverview().then(setData); }, []);
  if (!data) return <p className="text-sm text-muted-foreground">…</p>;
  const { overview = {}, traffic = {}, engagement = {}, conversions = {} } = data;
  const cells: Array<[string, any]> = [
    ['Sessions',     overview.total_sessions ?? traffic.sessions ?? '—'],
    ['Page views',   overview.page_views ?? traffic.page_views ?? '—'],
    ['Unique users', overview.unique_users ?? '—'],
    ['Bounce rate',  engagement.bounce_rate != null ? `${engagement.bounce_rate}%` : '—'],
    ['Avg session',  engagement.avg_session_duration != null ? `${engagement.avg_session_duration}s` : '—'],
    ['Conversions',  conversions.total ?? '—'],
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cells.map(([label, value]) => (
        <Card key={label} className="p-5">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
        </Card>
      ))}
    </div>
  );
}

function RealtimeTab() {
  const { t, i18n } = useTranslation('admin');
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    const reload = () => apiService.adminTrackingRealtime().then(setData);
    reload();
    const id = setInterval(reload, 10_000);
    return () => clearInterval(id);
  }, []);
  if (!data) return <p className="text-sm text-muted-foreground">…</p>;
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <p className="text-sm text-muted-foreground">{t('tracking.activeNow')}</p>
        <p className="mt-2 text-3xl font-semibold text-foreground">{data.active_count}</p>
      </Card>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('tracking.device')}</TableHead>
              <TableHead>{t('tracking.country')}</TableHead>
              <TableHead>{t('tracking.duration')}</TableHead>
              <TableHead>Start</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data.sessions || []).map((s: any) => (
              <TableRow key={s.id}>
                <TableCell>{s.device_type || '—'}</TableCell>
                <TableCell>{s.country_code || '—'}</TableCell>
                <TableCell>{s.duration_seconds ? `${s.duration_seconds}s` : '—'}</TableCell>
                <TableCell>{s.start_time ? new Intl.DateTimeFormat(i18n.language, { timeStyle: 'medium' }).format(new Date(s.start_time)) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function SessionsTab() {
  const { t } = useTranslation('admin');
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  useEffect(() => { apiService.adminTrackingSessions({ page, per_page: 25 }).then(setData); }, [page]);
  if (!data) return <p className="text-sm text-muted-foreground">…</p>;
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>{t('tracking.device')}</TableHead>
            <TableHead>{t('tracking.country')}</TableHead>
            <TableHead>{t('tracking.consented')}</TableHead>
            <TableHead>{t('tracking.duration')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data.sessions || []).map((s: any) => (
            <TableRow key={s.id}>
              <TableCell className="font-mono text-xs">{s.external_id?.slice(0, 8) || s.id.slice(0, 8)}</TableCell>
              <TableCell>{s.device_type || '—'}</TableCell>
              <TableCell>{s.country_code || '—'}</TableCell>
              <TableCell>{s.consented ? '✓' : '—'}</TableCell>
              <TableCell>{s.duration_seconds ? `${s.duration_seconds}s` : '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between p-4 text-sm text-muted-foreground">
        <span>{data.total} sessions</span>
        <div className="space-x-2">
          <button className="hover:text-foreground" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>←</button>
          <span>{page}</span>
          <button className="hover:text-foreground" disabled={(data.sessions?.length ?? 0) < data.per_page} onClick={() => setPage((p) => p + 1)}>→</button>
        </div>
      </div>
    </Card>
  );
}

function FunnelTab() {
  const { t } = useTranslation('admin');
  const [data, setData] = useState<any>(null);
  useEffect(() => { apiService.adminTrackingFunnel().then(setData); }, []);
  if (!data) return <p className="text-sm text-muted-foreground">…</p>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-5">
        <h3 className="font-medium text-foreground mb-3">Events</h3>
        <ul className="space-y-1 text-sm">
          {Object.entries(data.events_by_type || {}).map(([k, v]: any) => (
            <li key={k} className="flex justify-between">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-mono text-foreground">{v}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="p-5">
        <h3 className="font-medium text-foreground mb-3">Top {t('tracking.page')}</h3>
        <ul className="space-y-1 text-sm">
          {Object.entries(data.top_pages || {}).map(([k, v]: any) => (
            <li key={k} className="flex justify-between gap-3">
              <span className="text-muted-foreground truncate">{k}</span>
              <span className="font-mono text-foreground shrink-0">{v}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function GeoTab() {
  const { t } = useTranslation('admin');
  const [data, setData] = useState<any>(null);
  useEffect(() => { apiService.adminTrackingGeo().then(setData); }, []);
  if (!data) return <p className="text-sm text-muted-foreground">…</p>;
  const block = (title: string, entries: Record<string, number>) => (
    <Card className="p-5">
      <h3 className="font-medium text-foreground mb-3">{title}</h3>
      <ul className="space-y-1 text-sm max-h-72 overflow-auto">
        {Object.entries(entries || {}).map(([k, v]) => (
          <li key={k} className="flex justify-between">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-mono text-foreground">{v}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {block(t('tracking.country'),  data.by_country)}
      {block(t('tracking.city'),     data.by_city)}
      {block(t('tracking.device'),   data.by_device)}
      {block(t('tracking.language'), data.by_language)}
    </div>
  );
}
