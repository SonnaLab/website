import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { apiService } from '@/services/api';
import { Card } from '@/components/ui/card';
import {
  DataTable,
  DataTableBody,
  DataTableEmpty,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from '@/components/common/DataTable';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PenLineIcon,
  PlusIcon,
  SearchIcon,
  TrafficConeIcon,
  UsersIcon,
  HotelIcon,
} from '@icons';
import type { TravauxClient } from '@/types/travaux';
import { ClientAvatar } from './ClientAvatar';
import { ClientDetailModal } from './ClientDetailModal';
import { ClientFormModal } from './ClientFormModal';
import { formatCents } from './format';

const PER_PAGE = 20;

/**
 * Travaux — point d'entrée : tableau des clients (entreprises). Par client,
 * l'œil ouvre sa fiche, le plot entre dans ses travaux (livrables, tâches,
 * devis/factures, contrats, paiements), le crayon l'édite.
 */
export default function AdminTravauxClients() {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const [clients, setClients] = useState<TravauxClient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewId, setViewId] = useState<string | null>(null);
  const [editClient, setEditClient] = useState<TravauxClient | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback((p: number, q: string) => {
    setLoading(true);
    apiService.adminTravauxClients({ page: p, per_page: PER_PAGE, q: q || undefined })
      .then((res) => { setClients(res.clients); setTotal(res.meta.total); })
      .catch(() => toast.error(t('travaux.clients.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => { load(page, search); }, [page, load]); // eslint-disable-line react-hooks/exhaustive-deps

  const applySearch = (q: string) => { setSearch(q); setPage(1); load(1, q); };

  async function openEdit(id: string) {
    try {
      // La liste n'embarque pas les comptes membres : on charge la fiche complète.
      setEditClient((await apiService.adminTravauxClient(id)).client);
      setFormOpen(true);
    } catch {
      toast.error(t('common.error'));
    }
  }

  const referentOf = (c: TravauxClient) => [c.referent_first_name, c.referent_last_name].filter(Boolean).join(' ');

  return (
    <div className="trv-page">
      <div className="trv-header-row">
        <header className="admin-news__header">
          <div className="admin-news__header-title">
            <TrafficConeIcon size={22} />
            <h1>{t('travaux.title')}</h1>
          </div>
          <p className="admin-news__header-sub">{t('travaux.subtitle')}</p>
        </header>
        <div className="trv-header-actions">
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => navigate('/admin/entreprise')}>
            <HotelIcon size={14} /> {t('travaux.clients.issuer')}
          </button>
          <button type="button" className="adm-btn adm-btn--primary" onClick={() => { setEditClient(null); setFormOpen(true); }}>
            <PlusIcon size={14} /> {t('travaux.clients.new')}
          </button>
        </div>
      </div>

      <div className="adm-toolbar">
        <div className="adm-toolbar__search-group">
          <div className="adm-search">
            <SearchIcon size={15} />
            <input
              className="adm-search__input"
              value={search}
              onChange={(e) => applySearch(e.target.value)}
              placeholder={t('travaux.clients.search')}
            />
          </div>
        </div>
      </div>

      <Card className="overflow-hidden gap-0">
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableTh className="trv-col-logo">{t('travaux.clients.table.logo')}</DataTableTh>
              <DataTableTh>{t('travaux.clients.table.company')}</DataTableTh>
              <DataTableTh>{t('travaux.clients.table.referent')}</DataTableTh>
              <DataTableTh>{t('nav.travaux')}</DataTableTh>
              <DataTableTh>{t('travaux.clients.table.actions')}</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {loading && <DataTableEmpty label={t('common.loading')} />}
            {!loading && clients.length === 0 && <DataTableEmpty icon={<UsersIcon size={28} />} label={t('travaux.clients.empty')} />}
            {!loading && clients.map((c) => (
              // The whole row opens the client's Travaux (but its actions).
              <DataTableRow key={c.id} onClick={() => navigate(`/admin/travaux/${c.id}`)}>
                <DataTableTd className="trv-col-logo">
                  <ClientAvatar client={c} />
                </DataTableTd>
                <DataTableTd>
                  <span className="trv-client-cell__name">{c.name}</span>
                </DataTableTd>
                <DataTableTd>{referentOf(c) || '—'}</DataTableTd>
                <DataTableTd>
                  {/* Projects, deliverables in progress, invoiced, paid — on one line. */}
                  <div className="trv-inline-stats">
                    {[
                      [t('travaux.clients.table.projects'), c.stats?.projects_count ?? 0],
                      [t('travaux.clients.table.inProgress'), c.stats?.objectives_in_progress ?? 0],
                      [t('travaux.clients.table.invoiced'), formatCents(c.stats?.invoiced_cents)],
                      [t('travaux.clients.table.paid'), formatCents(c.stats?.paid_cents)],
                    ].map(([label, value]) => (
                      <span key={String(label)} className="trv-inline-stats__item">
                        <span className="trv-inline-stats__label">{label}</span>
                        <strong className="trv-num">{value}</strong>
                      </span>
                    ))}
                  </div>
                </DataTableTd>
                <DataTableTd onClick={(e) => e.stopPropagation()}>
                  <div className="adm-table__actions">
                    <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" title={t('travaux.clients.actions.view')} onClick={() => setViewId(c.id)}>
                      <EyeIcon size={13} />
                    </button>
                    <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" title={t('travaux.clients.actions.travaux')} onClick={() => navigate(`/admin/travaux/${c.id}`)}>
                      <TrafficConeIcon size={13} />
                    </button>
                    <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" title={t('travaux.clients.actions.edit')} onClick={() => openEdit(c.id)}>
                      <PenLineIcon size={13} />
                    </button>
                  </div>
                </DataTableTd>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
        {total > PER_PAGE && (
          <div className="trk-pagination">
            <button type="button" className="trk-pagination__btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeftIcon size={14} />
            </button>
            <span className="trk-pagination__page">{page}</span>
            <button type="button" className="trk-pagination__btn" disabled={page * PER_PAGE >= total} onClick={() => setPage((p) => p + 1)}>
              <ChevronRightIcon size={14} />
            </button>
          </div>
        )}
      </Card>

      <ClientDetailModal clientId={viewId} onClose={() => setViewId(null)} />
      <ClientFormModal
        open={formOpen}
        client={editClient}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); load(page, search); }}
        onDeleted={() => { setFormOpen(false); load(page, search); }}
      />
    </div>
  );
}
