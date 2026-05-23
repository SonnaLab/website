import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { apiService } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/common/Tabs';
import { CookieIcon, GlobeIcon, ZapIcon, UsersIcon, BotIcon, LayersIcon, FileTextIcon, TrendingUpIcon, LineChartIcon, CalendarIcon } from '@icons';

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

export default function AdminTracking() {
  const { t } = useTranslation('admin');
  const [tab, setTab] = useState('geo');
  const [kpis, setKpis] = useState<any>(null);

  useEffect(() => {
    apiService.analyticsOverview(SITE).then(setKpis).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <header className="trk-header">
        <div className="trk-header__title">
          <CookieIcon size={22} className="trk-header__icon" />
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">
            {t('tracking.title')}
          </h1>
        </div>
        <p className="mt-1 text-muted-foreground text-sm">{t('tracking.subtitle')}</p>
      </header>

      {/* ── 7 KPIs ── */}
      <div className="trk-kpi-row">
        <Card className="trk-kpi-card">
          <div className="trk-kpi-icon-wrap trk-kpi-icon-wrap--accent"><ZapIcon size={16} /></div>
          <p className="trk-kpi-value trk-kpi-value--accent">{kpis?.realtime_active ?? '—'}</p>
          <p className="trk-kpi-label">{t('tracking.activeNow')}</p>
        </Card>
        <Card className="trk-kpi-card">
          <div className="trk-kpi-icon-wrap"><UsersIcon size={16} /></div>
          <p className="trk-kpi-value">{kpis?.visitors_today ?? '—'}</p>
          <p className="trk-kpi-label">{t('tracking.visitorsToday')}</p>
        </Card>
        <Card className="trk-kpi-card">
          <div className="trk-kpi-icon-wrap"><LayersIcon size={16} /></div>
          <p className="trk-kpi-value">{kpis?.sessions_today ?? '—'}</p>
          <p className="trk-kpi-label">{t('tracking.sessionsToday')}</p>
        </Card>
        <Card className="trk-kpi-card">
          <div className="trk-kpi-icon-wrap"><FileTextIcon size={16} /></div>
          <p className="trk-kpi-value">{kpis?.pageviews_today ?? '—'}</p>
          <p className="trk-kpi-label">{t('tracking.pageviewsToday')}</p>
        </Card>
        <Card className="trk-kpi-card">
          <div className="trk-kpi-icon-wrap"><TrendingUpIcon size={16} /></div>
          <p className="trk-kpi-value">{kpis?.bounce_rate != null ? `${kpis.bounce_rate}%` : '—'}</p>
          <p className="trk-kpi-label">{t('tracking.bounceRate')}</p>
        </Card>
        <Card className="trk-kpi-card">
          <div className="trk-kpi-icon-wrap"><LineChartIcon size={16} /></div>
          <p className="trk-kpi-value">{fmt_dur(kpis?.avg_duration_seconds)}</p>
          <p className="trk-kpi-label">{t('tracking.avgDuration')}</p>
        </Card>
        <Card className="trk-kpi-card">
          <div className="trk-kpi-icon-wrap"><CalendarIcon size={16} /></div>
          <p className="trk-kpi-value">{kpis?.pageviews_7d ?? '—'}</p>
          <p className="trk-kpi-label">{t('tracking.pageviews7d')}</p>
        </Card>
      </div>

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
