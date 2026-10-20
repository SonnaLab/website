import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { apiService } from '@/services/api';
import { PageHeader } from '@/components/private/common/PageHeader';
import { StatCard, StatRow } from '@/components/private/common/StatRow';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/common/Tabs';
import { CookieIcon, GlobeIcon, ZapIcon, UsersIcon, BotIcon, LayersIcon, FileTextIcon, TrendingUpIcon, LineChartIcon, ClockIcon } from '@icons';

import {
  GeoTab, RealtimeTab, VisitorsTab, BotsTab,
  SessionsTab, PagesTab, AcquisitionTab, ConsentsTab,
} from './TrackingTabs';

const SITE = 'sonnalab.com';

function fmt_dur(s: number | null | undefined) {
  if (s == null) return '—';
  if (s < 60) return `${Math.round(s)}s`;
  return `${Math.floor(s / 60)}m${Math.round(s % 60)}s`;
}

export default function AdminCookies() {
  const { t } = useTranslation('admin');
  const [tab, setTab] = useState('geo');
  const [kpis, setKpis] = useState<any>(null);

  useEffect(() => {
    const load = () => apiService.analyticsOverview(SITE).then(setKpis).catch(() => {});
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="dash-page">
      <PageHeader icon={<LineChartIcon size={26} />} title={t('tracking.heading')} description={t('tracking.subtitle')} />

      {/* The day's figures; sessions and 7-day page views are in their tabs. */}
      <StatRow>
        <StatCard icon={<ZapIcon size={18} />} label={t('tracking.activeNow')} value={kpis?.realtime_active ?? '—'} tone={kpis?.realtime_active ? 'success' : undefined} />
        <StatCard icon={<UsersIcon size={18} />} label={t('tracking.visitorsToday')} value={kpis?.visitors_today ?? '—'} />
        <StatCard icon={<FileTextIcon size={18} />} label={t('tracking.pageviewsToday')} value={kpis?.pageviews_today ?? '—'} />
        <StatCard icon={<TrendingUpIcon size={18} />} label={t('tracking.bounceRate')} value={kpis?.bounce_rate != null ? `${kpis.bounce_rate}%` : '—'} />
        <StatCard icon={<ClockIcon size={18} />} label={t('tracking.avgDuration')} value={fmt_dur(kpis?.avg_duration_seconds)} />
      </StatRow>

      {/* ── 8 Tabs ── */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="geo"         icon={<GlobeIcon       size={14} />}>{t('tracking.tabs.geo')}</TabsTrigger>
          <TabsTrigger value="realtime"    icon={<ZapIcon         size={14} />}>{t('tracking.tabs.realtime')}</TabsTrigger>
          <TabsTrigger value="visitors"    icon={<UsersIcon       size={14} />}>{t('tracking.tabs.visitors')}</TabsTrigger>
          <TabsTrigger value="bots"        icon={<BotIcon         size={14} />}>{t('tracking.tabs.bots')}</TabsTrigger>
          <TabsTrigger value="sessions"    icon={<LayersIcon      size={14} />}>{t('tracking.tabs.sessions')}</TabsTrigger>
          <TabsTrigger value="pages"       icon={<FileTextIcon    size={14} />}>{t('tracking.tabs.pages')}</TabsTrigger>
          <TabsTrigger value="acquisition" icon={<TrendingUpIcon  size={14} />}>{t('tracking.tabs.acquisition')}</TabsTrigger>
          <TabsTrigger value="consents"    icon={<CookieIcon      size={14} />}>{t('tracking.tabs.consents')}</TabsTrigger>
        </TabsList>

        <TabsContent value="geo"><GeoTab /></TabsContent>
        <TabsContent value="realtime"><RealtimeTab /></TabsContent>
        <TabsContent value="visitors"><VisitorsTab /></TabsContent>
        <TabsContent value="bots"><BotsTab /></TabsContent>
        <TabsContent value="sessions"><SessionsTab /></TabsContent>
        <TabsContent value="pages"><PagesTab /></TabsContent>
        <TabsContent value="acquisition"><AcquisitionTab /></TabsContent>
        <TabsContent value="consents"><ConsentsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
