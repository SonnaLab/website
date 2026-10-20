import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ComponentType } from 'react';
import {
  ServerIcon,
  LineChartIcon,
  CookieIcon,
  BotIcon,
  SearchIcon,
  NewsIcon,
  UsersIcon,
  ReceiptIcon,
  ArrowUpRightIcon,
  TrendingUpIcon,
  BriefcaseIcon,
  type IconProps,
} from '@icons';
import { useAuth } from '@/components/providers/AuthProvider';
import { HighlightText } from '@/components/utils/HighlightText';
import { PageHeader } from '@/components/private/common/PageHeader';
import { StatCard, StatRow } from '@/components/private/common/StatRow';
import { apiService } from '@/services/api';
import { formatCents } from './travaux/format';
import { useTravauxTotals } from './travaux/useTravauxTotals';

interface AdminWidget {
  key: WidgetKey;
  to: string;
  icon: ComponentType<IconProps>;
}

interface LatestItem {
  label: string;
  status: string;
}

type WidgetKey =
  | 'infrastructure'
  | 'tracking'
  | 'news'
  | 'users'
  | 'billing'
  | 'seo'
  | 'ouou';

const latestItemsByWidget: Partial<Record<WidgetKey, LatestItem[]>> = {};

const adminWidgetRows: AdminWidget[][] = [
  [
    { key: 'infrastructure', to: '/admin/infrastructure', icon: ServerIcon },
    { key: 'tracking',        to: '/admin/cookies',        icon: CookieIcon },
    { key: 'news',           to: '/admin/news',           icon: NewsIcon },
  ],
  [
    { key: 'users',   to: '/admin/users',       icon: UsersIcon },
    { key: 'billing', to: '/admin/travaux',     icon: ReceiptIcon },
  ],
  [
    { key: 'seo',      to: '/admin/seo',           icon: SearchIcon },
    { key: 'ouou',     to: '/admin/ouou',          icon: BotIcon },
  ],
];

export default function AdminDashboard() {
  const { t } = useTranslation('admin');
  const { user } = useAuth();
  const displayName = user?.first_name || user?.email || t('dashboard.fallbackName');
  const figures = useDashboardFigures();
  const travaux = useTravauxTotals();

  return (
    <div className="dash-page">
      <PageHeader
        icon={<TrendingUpIcon size={26} />}
        title={<HighlightText text={t('dashboard.title', { name: displayName })} />}
        description={t('dashboard.subtitle')}
      />

      {/* One figure per menu; each tile opens it. */}
      <StatRow>
        <StatCard to="/admin/cookies" icon={<CookieIcon size={18} />} label={t('tracking.visitorsToday')} value={figures.visitorsToday ?? '—'} />
        <StatCard to="/admin/news" icon={<NewsIcon size={18} />} label={t('news.overview.stats.published')} value={figures.published ?? '—'} />
        <StatCard to="/admin/users" icon={<UsersIcon size={18} />} label={t('users.kpis.total')} value={figures.users ?? '—'} />
        <StatCard to="/admin/travaux" icon={<BriefcaseIcon size={18} />} label={t('travaux.clients.stats.clients')} value={travaux?.clients ?? '—'} />
        <StatCard to="/admin/travaux" icon={<ReceiptIcon size={18} />} label={t('travaux.clients.table.invoiced')} value={travaux ? formatCents(travaux.invoicedCents) : '—'} />
      </StatRow>

      <section className="admin-dashboard__section" aria-label={t('dashboard.latest')}>
        <div className="admin-dashboard__section-head">
          <p className="admin-dashboard__eyebrow">{t('dashboard.latest')}</p>
        </div>

        <div className="admin-dashboard__widget-stack">
          {adminWidgetRows.map((row, rowIndex) => (
            <div
              key={`admin-widget-row-${rowIndex}`}
              className={`admin-dashboard__widget-row admin-dashboard__widget-row--${row.length}`}
            >
              {row.map(({ key, to, icon: Icon }) => {
                const latestItems = latestItemsByWidget[key] ?? [];

                return (
                  <article key={key} className="admin-action-widget">
                    <div className="admin-action-widget__top">
                      <div className="admin-action-widget__identity">
                        <span className="admin-action-widget__icon" aria-hidden="true">
                          <Icon size={20} />
                        </span>
                        <h2>{t(`dashboard.widgets.${key}.title`)}</h2>
                      </div>

                      <Link className="admin-action-widget__link" to={to}>
                        {t('dashboard.viewMore')}
                        <ArrowUpRightIcon size={15} />
                      </Link>
                    </div>

                    <div className="admin-action-widget__preview">
                      <span className="admin-action-widget__preview-title">{t('dashboard.lastAction')}</span>

                      {latestItems.length > 0 ? (
                        <ul className="admin-action-widget__activity-list">
                          {latestItems.map(item => (
                            <li key={`${key}-${item.label}`}>
                              <span className="admin-action-widget__activity-label">
                                {item.label}
                              </span>
                              <span className="admin-action-widget__activity-status">
                                {item.status}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="admin-action-widget__empty">
                          {t(`dashboard.widgets.${key}.empty`)}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Today's visitors, published articles and accounts (each from its menu's API). */
function useDashboardFigures() {
  const [figures, setFigures] = useState<{ visitorsToday?: number; published?: number; users?: number }>({});
  useEffect(() => {
    let alive = true;
    const set = (patch: typeof figures) => { if (alive) setFigures((f) => ({ ...f, ...patch })); };
    apiService.analyticsOverview('sonnalab.com').then((k) => set({ visitorsToday: k?.visitors_today })).catch(() => {});
    apiService.adminNewsStats().then((r) => {
      const stats = r?.stats ?? r ?? {};
      set({ published: stats.published ?? stats.published_articles });
    }).catch(() => {});
    apiService.adminUsersOverview().then((k) => set({ users: k.total })).catch(() => {});
    return () => { alive = false; };
  }, []);
  return figures;
}
