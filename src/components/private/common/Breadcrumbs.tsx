import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon, ChevronRightIcon } from '@icons';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

/**
 * The page's trail (« Travaux › SARL DU CONSULTING »), as in Élance VAE's
 * staff app: a back arrow, then each level, the current one in bold. The
 * arrow and the parent go back in history when there is one, so the list
 * comes back as it was (tab, search); otherwise they link to the parent.
 */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const parentIndex = items.length > 1 ? items.length - 2 : -1;
  const parent = parentIndex >= 0 ? items[parentIndex] : undefined;
  // Prerendered pages have no window: no history to go back to there.
  const canGoBack = typeof window !== 'undefined' && (window.history.state?.idx ?? 0) > 0;

  return (
    <nav className="dash-crumbs" aria-label={t('breadcrumb', { defaultValue: "Fil d'Ariane" })}>
      {parent?.to &&
        (canGoBack ? (
          <button type="button" className="dash-crumbs__back" onClick={() => navigate(-1)} aria-label={parent.label}>
            <ArrowLeftIcon size={14} />
          </button>
        ) : (
          <Link to={parent.to} className="dash-crumbs__back" aria-label={parent.label}>
            <ArrowLeftIcon size={14} />
          </Link>
        ))}
      <ol className="dash-crumbs__list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="dash-crumbs__item">
              {index > 0 && <ChevronRightIcon size={13} className="dash-crumbs__sep" />}
              {item.to && !isLast ? (
                index === parentIndex && canGoBack ? (
                  <button type="button" className="dash-crumbs__link" onClick={() => navigate(-1)} title={item.label}>
                    {item.label}
                  </button>
                ) : (
                  <Link to={item.to} className="dash-crumbs__link" title={item.label}>
                    {item.label}
                  </Link>
                )
              ) : (
                <span className={isLast ? 'dash-crumbs__current' : 'dash-crumbs__link'} title={item.label} aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
