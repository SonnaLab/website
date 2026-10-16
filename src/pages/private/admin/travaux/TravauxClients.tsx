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
  const [issuerOpen, setIssuerOpen] = useState(false);
  const [issuer, setIssuer] = useState<TravauxClient | null>(null);

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

  async function openIssuer() {
    try {
      setIssuer((await apiService.adminTravauxIssuer()).issuer);
      setIssuerOpen(true);
    } catch {
      toast.error(t('common.error'));
    }
  }

  const referentOf = (c: TravauxClient) => [c.referent_first_name, c.referent_last_name].filter(Boolean).join(' ');

  return (
    <div className="space-y-6">
      <div className="trv-header-row">
        <header className="trk-header">
          <div className="trk-header__title">
            <TrafficConeIcon size={22} className="trk-header__icon" />
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">{t('travaux.title')}</h1>
          </div>
          <p className="mt-1 text-muted-foreground text-sm">{t('travaux.subtitle')}</p>
        </header>
        <div className="trv-header-actions">
          <button type="button" className="adm-btn adm-btn--ghost" onClick={openIssuer}>{t('travaux.clients.issuer')}</button>
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
              <DataTableTh>{t('travaux.clients.table.client')}</DataTableTh>
              <DataTableTh>{t('travaux.clients.table.referent')}</DataTableTh>
              <DataTableTh>{t('travaux.clients.table.projects')}</DataTableTh>
              <DataTableTh>{t('travaux.clients.table.inProgress')}</DataTableTh>
              <DataTableTh>{t('travaux.clients.table.invoiced')}</DataTableTh>
              <DataTableTh>{t('travaux.clients.table.paid')}</DataTableTh>
              <DataTableTh>{t('travaux.clients.table.actions')}</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {loading && <DataTableEmpty label={t('common.loading')} />}
            {!loading && clients.length === 0 && <DataTableEmpty icon={<UsersIcon size={28} />} label={t('travaux.clients.empty')} />}
            {!loading && clients.map((c) => (
              <DataTableRow key={c.id}>
                <DataTableTd>
                  <div className="trv-client-cell">
                    <ClientAvatar client={c} />
                    <div>
                      <div className="trv-client-cell__name">{c.name}</div>
                      {c.siret && <div className="trv-muted">SIRET {c.siret}</div>}
                    </div>
                  </div>
                </DataTableTd>
                <DataTableTd>
                  <div>{referentOf(c) || '—'}</div>
                  {(c.referent_email || c.contact_email) && <div className="trv-muted">{c.referent_email || c.contact_email}</div>}
                </DataTableTd>
                <DataTableTd className="trv-num">{c.stats?.projects_count ?? 0}</DataTableTd>
                <DataTableTd className="trv-num">{c.stats?.objectives_in_progress ?? 0}</DataTableTd>
                <DataTableTd className="trv-num">{formatCents(c.stats?.invoiced_cents)}</DataTableTd>
                <DataTableTd className="trv-num">{formatCents(c.stats?.paid_cents)}</DataTableTd>
                <DataTableTd>
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
      <ClientFormModal
        open={issuerOpen}
        client={issuer}
        issuer
        onClose={() => setIssuerOpen(false)}
        onSaved={() => setIssuerOpen(false)}
      />
    </div>
  );
}
