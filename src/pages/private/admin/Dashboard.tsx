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
  key: string;
  to: string;
  icon: ComponentType<IconProps>;
}

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
          <p className="admin-dashboard__hint">{t('dashboard.hint')}</p>
        </div>

        <div className="admin-dashboard__widget-stack">
          {adminWidgetRows.map((row, rowIndex) => (
            <div
              key={`admin-widget-row-${rowIndex}`}
              className={`admin-dashboard__widget-row admin-dashboard__widget-row--${row.length}`}
            >
              {row.map(({ key, to, icon: Icon }) => (
                <article key={key} className="admin-action-widget">
                  <div className="admin-action-widget__top">
                    <span className="admin-action-widget__icon" aria-hidden="true">
                      <Icon size={20} />
                    </span>
                    <span className="admin-action-widget__status">
                      {t(`dashboard.widgets.${key}.status`)}
                    </span>
                  </div>

                  <div className="admin-action-widget__body">
                    <h2>{t(`dashboard.widgets.${key}.title`)}</h2>
                    <p>{t(`dashboard.widgets.${key}.description`)}</p>
                  </div>

                  <div className="admin-action-widget__preview">
                    <span>{t('dashboard.lastAction')}</span>
                    <p>{t(`dashboard.widgets.${key}.lastAction`)}</p>
                    <small>{t(`dashboard.widgets.${key}.meta`)}</small>
                  </div>

                  <Link className="admin-action-widget__link" to={to}>
                    {t('dashboard.viewMore')}
                    <ArrowUpRightIcon size={15} />
                  </Link>
                </article>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
