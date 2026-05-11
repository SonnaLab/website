import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ComponentType } from 'react';
import {
  ServerIcon,
  LineChartIcon,
  BotIcon,
  SearchIcon,
  NewsIcon,
  UsersIcon,
  ReceiptIcon,
  FolderKanbanIcon,
  ArrowUpRightIcon,
  type IconProps,
} from '@icons';
import { useAuth } from '@/components/providers/AuthProvider';
import { HighlightText } from '@/components/utils/HighlightText';

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
  | 'projects'
  | 'seo'
  | 'ouou';

const latestItemsByWidget: Partial<Record<WidgetKey, LatestItem[]>> = {};

const adminWidgetRows: AdminWidget[][] = [
  [
    { key: 'infrastructure', to: '/admin/infrastructure', icon: ServerIcon },
    { key: 'tracking',       to: '/admin/tracking',       icon: LineChartIcon },
    { key: 'news',           to: '/admin/news',           icon: NewsIcon },
  ],
  [
    { key: 'users',   to: '/admin/users',       icon: UsersIcon },
    { key: 'billing', to: '/dashboard/billing', icon: ReceiptIcon },
  ],
  [
    { key: 'projects', to: '/dashboard/projects', icon: FolderKanbanIcon },
    { key: 'seo',      to: '/admin/seo',           icon: SearchIcon },
    { key: 'ouou',     to: '/admin/ouou',          icon: BotIcon },
  ],
];

export default function AdminDashboard() {
  const { t } = useTranslation('admin');
  const { user } = useAuth();
  const displayName = user?.first_name || user?.email || t('dashboard.fallbackName');

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard__header">
        <h1 className="admin-dashboard__title">
          <HighlightText text={t('dashboard.title', { name: displayName })} />
        </h1>
        <p className="admin-dashboard__subtitle">{t('dashboard.subtitle')}</p>
      </header>

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
