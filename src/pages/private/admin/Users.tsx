import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { apiService, type AdminUser, type AdminUsersOverview, type AuthRole } from '@/services/api';
import { useAuth } from '@/components/providers/AuthProvider';
import { getDashboardPath } from '@/utils/auth';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/common/Tabs';
import { PageHeader } from '@/components/private/common/PageHeader';
import { StatCard, StatRow } from '@/components/private/common/StatRow';
import { Modal } from '@/components/common/Modal';
import {
  DataTable, DataTableHead, DataTableBody, DataTableRow, DataTableTh, DataTableTd, DataTableEmpty,
} from '@/components/common/DataTable';
import {
  UsersIcon, LayoutDashboardIcon, ShieldIcon, UserIcon, CheckCircleIcon, LockIcon,
  SearchIcon, EyeIcon, ArrowUpRightIcon, ChevronLeftIcon, ChevronRightIcon, TrendingUpIcon,
  HotelIcon, PenLineIcon, PlusIcon, TrafficConeIcon,
} from '@icons';
import type { TravauxClient } from '@/types/travaux';
import { ClientAvatar } from './travaux/ClientAvatar';
import { ClientDetailModal } from './travaux/ClientDetailModal';
import { ClientFormModal } from './travaux/ClientFormModal';

const PER_PAGE = 20;

function fmt(date: string | null | undefined) {
  if (!date) return '—';
  return new Date(date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function Pagination({
  page, hasMore, onPrev, onNext,
}: { page: number; hasMore: boolean; onPrev(): void; onNext(): void }) {
  return (
    <div className="trk-pagination">
      <button className="trk-pagination__btn" disabled={page <= 1} onClick={onPrev}>
        <ChevronLeftIcon size={14} />
      </button>
      <span className="trk-pagination__page">{page}</span>
      <button className="trk-pagination__btn" disabled={!hasMore} onClick={onNext}>
        <ChevronRightIcon size={14} />
      </button>
    </div>
  );
}

// ── Utilisateurs (table) ─────────────────────────────────────────────────────

/** The accounts table; the page's tab picks the role, the companies' teams or the acquisition. */
function UsersListTab({ role = '', withClient = false, segment }: { role?: AuthRole | ''; withClient?: boolean; segment?: 'active' | 'acquisition' }) {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const { user: currentUser, impersonate } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  const load = useCallback((p: number, q: string, r: AuthRole | '') => {
    setLoading(true);
    setErr(false);
    apiService.adminUsersList({ page: p, per_page: PER_PAGE, q: q || undefined, role: r || undefined, with_client: withClient ? 'true' : undefined, segment })
      .then((res) => { setUsers(res.users); setTotal(res.meta.total); })
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, [withClient, segment]);

  useEffect(() => { load(page, search, role); }, [page, load]); // eslint-disable-line react-hooks/exhaustive-deps

  const applySearch = (q: string) => {
    setSearch(q);
    setPage(1);
    load(1, q, role);
  };

  const handleImpersonate = async (target: AdminUser) => {
    setImpersonatingId(target.id);
    try {
      await impersonate(target.id);
      toast.success(t('users.impersonateSuccess', { name: target.full_name || target.email }));
      navigate(getDashboardPath(target.role));
    } catch (e: any) {
      toast.error(e?.response?.data?.error || t('users.impersonateError'));
    } finally {
      setImpersonatingId(null);
    }
  };

  const roleLabel = (r: AuthRole) => t(`users.roles.${r}`);

  if (err) return <p className="trk-empty">{t('tracking.loadError')}</p>;

  return (
    <div className="trk-tab space-y-4">
      <div className="adm-toolbar">
        <div className="adm-toolbar__search-group">
          <div className="adm-search">
            <SearchIcon size={15} />
            <input
              type="text"
              className="adm-search__input"
              placeholder={t('users.searchPlaceholder')}
              value={search}
              onChange={(e) => applySearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <p className="trk-loading">…</p>
      ) : (
        <Card className="overflow-hidden gap-0">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableTh>{t('users.table.name')}</DataTableTh>
                <DataTableTh>{t('users.table.email')}</DataTableTh>
                <DataTableTh>{t('users.table.company')}</DataTableTh>
                <DataTableTh>{t('users.table.role')}</DataTableTh>
                <DataTableTh>{t('users.table.status')}</DataTableTh>
                <DataTableTh>{t('users.table.createdAt')}</DataTableTh>
                <DataTableTh>{t('users.table.actions')}</DataTableTh>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {users.length === 0 ? (
                <DataTableEmpty icon={<UsersIcon size={28} />} label={withClient ? t('users.teamsEmpty') : segment === 'acquisition' ? t('users.acquisitionEmpty') : t('users.empty')} />
              ) : users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const canImpersonate = !isSelf && u.role !== 'admin' && !u.locked;
                return (
                  <DataTableRow key={u.id}>
                    <DataTableTd>{u.full_name || '—'}</DataTableTd>
                    <DataTableTd className="text-xs">{u.email}</DataTableTd>
                    <DataTableTd>{u.client_name || '—'}</DataTableTd>
                    <DataTableTd>
                      <span className={`adm-badge adm-badge--${u.role === 'admin' ? 'info' : u.role === 'staff' ? 'default' : 'muted'}`}>
                        {roleLabel(u.role)}
                      </span>
                    </DataTableTd>
                    <DataTableTd>
                      {u.locked ? (
                        <span className="adm-badge adm-badge--danger">{t('users.status.locked')}</span>
                      ) : u.confirmed ? (
                        <span className="adm-badge adm-badge--success">{t('users.status.confirmed')}</span>
                      ) : (
                        <span className="adm-badge adm-badge--warning">{t('users.status.unconfirmed')}</span>
                      )}
                    </DataTableTd>
                    <DataTableTd className="text-xs">{fmt(u.created_at)}</DataTableTd>
                    <DataTableTd>
                      <div className="adm-table__actions">
                        <button
                          type="button"
                          className="adm-btn adm-btn--ghost adm-btn--xs"
                          onClick={() => setSelected(u)}
                          title={t('tracking.viewDetails')}
                        >
                          <EyeIcon size={13} />
                        </button>
                        <button
                          type="button"
                          className="adm-btn adm-btn--ghost adm-btn--xs"
                          onClick={() => handleImpersonate(u)}
                          disabled={!canImpersonate || impersonatingId === u.id}
                          title={isSelf ? t('users.cantImpersonateSelf') : u.role === 'admin' ? t('users.cantImpersonateAdmin') : t('users.impersonate')}
                        >
                          <ArrowUpRightIcon size={13} />
                        </button>
                      </div>
                    </DataTableTd>
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          </DataTable>
          <Pagination
            page={page}
            hasMore={page * PER_PAGE < total}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        </Card>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.full_name || selected?.email || '—'} size="sm">
        {selected && (
          <dl className="trk-modal-dl">
            <dt>{t('users.table.email')}</dt><dd>{selected.email}</dd>
            <dt>{t('users.table.role')}</dt><dd>{roleLabel(selected.role)}</dd>
            <dt>{t('users.detail.phone')}</dt><dd>{selected.phone || '—'}</dd>
            <dt>{t('users.detail.company')}</dt><dd>{selected.company || '—'}</dd>
            <dt>{t('users.detail.signInCount')}</dt><dd>{selected.sign_in_count ?? '—'}</dd>
            <dt>{t('users.detail.lastSignIn')}</dt><dd>{fmt(selected.last_sign_in_at)}</dd>
            <dt>{t('users.table.createdAt')}</dt><dd>{fmt(selected.created_at)}</dd>
            <dt>{t('users.table.status')}</dt>
            <dd>
              {selected.locked
                ? t('users.status.locked')
                : selected.confirmed ? t('users.status.confirmed') : t('users.status.unconfirmed')}
            </dd>
          </dl>
        )}
      </Modal>
    </div>
  );
}

// ── Clients : the companies (Travaux clients) ────────────────────────────────

function CompaniesTab({ reloadKey, onEdit }: { reloadKey: number; onEdit: (id: string) => void }) {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const [clients, setClients] = useState<TravauxClient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewId, setViewId] = useState<string | null>(null);

  const load = useCallback((p: number, q: string) => {
    setLoading(true);
    apiService.adminTravauxClients({ page: p, per_page: PER_PAGE, q: q || undefined })
      .then((res) => { setClients(res.clients); setTotal(res.meta.total); })
      .catch(() => toast.error(t('travaux.clients.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => { load(page, search); }, [page, load, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const referentOf = (c: TravauxClient) => [c.referent_first_name, c.referent_last_name].filter(Boolean).join(' ');

  return (
    <div className="trk-tab space-y-4">
      <div className="adm-toolbar">
        <div className="adm-toolbar__search-group">
          <div className="adm-search">
            <SearchIcon size={15} />
            <input
              type="text"
              className="adm-search__input"
              placeholder={t('travaux.clients.search')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); load(1, e.target.value); }}
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
              <DataTableTh className="trv-col-num">{t('travaux.clients.table.members')}</DataTableTh>
              <DataTableTh className="trv-col-num">{t('travaux.clients.table.projects')}</DataTableTh>
              <DataTableTh>{t('users.table.actions')}</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {loading && <DataTableEmpty label={t('common.loading')} />}
            {!loading && clients.length === 0 && <DataTableEmpty icon={<UsersIcon size={28} />} label={t('travaux.clients.empty')} />}
            {!loading && clients.map((c) => (
              <DataTableRow key={c.id} onClick={() => setViewId(c.id)}>
                <DataTableTd className="trv-col-logo"><ClientAvatar client={c} /></DataTableTd>
                <DataTableTd><span className="trv-client-cell__name">{c.name}</span></DataTableTd>
                <DataTableTd>{referentOf(c) || '—'}</DataTableTd>
                <DataTableTd className="trv-col-num trv-num">{c.stats?.members_count ?? 0}</DataTableTd>
                <DataTableTd className="trv-col-num trv-num">{c.stats?.projects_count ?? 0}</DataTableTd>
                <DataTableTd onClick={(e) => e.stopPropagation()}>
                  <div className="adm-table__actions">
                    <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" title={t('travaux.clients.actions.view')} onClick={() => setViewId(c.id)}>
                      <EyeIcon size={13} />
                    </button>
                    <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" title={t('travaux.clients.actions.edit')} onClick={() => onEdit(c.id)}>
                      <PenLineIcon size={13} />
                    </button>
                    <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" title={t('travaux.clients.actions.travaux')} onClick={() => navigate(`/admin/travaux/${c.id}`)}>
                      <TrafficConeIcon size={13} />
                    </button>
                  </div>
                </DataTableTd>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
        <Pagination
          page={page}
          hasMore={page * PER_PAGE < total}
          onPrev={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      </Card>

      <ClientDetailModal clientId={viewId} onClose={() => setViewId(null)} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TAB_KEYS = ['all', 'admins', 'clients', 'teams', 'acquisition'] as const;
type UsersTab = typeof TAB_KEYS[number];

export default function AdminUsers() {
  const { t } = useTranslation('admin');
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') as UsersTab | null;
  const tab: UsersTab = urlTab && TAB_KEYS.includes(urlTab) ? urlTab : 'all';
  const setTab = (next: string) => setSearchParams((prev) => {
    const params = new URLSearchParams(prev);
    params.set('tab', next);
    return params;
  }, { replace: true });
  const [kpis, setKpis] = useState<AdminUsersOverview | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editClient, setEditClient] = useState<TravauxClient | null>(null);

  const loadKpis = useCallback(() => {
    apiService.adminUsersOverview().then(setKpis).catch(() => setKpis(null));
  }, []);
  useEffect(() => { loadKpis(); }, [loadKpis]);

  async function openEdit(id: string) {
    try {
      // The list has no member accounts: the form needs the full record.
      setEditClient((await apiService.adminTravauxClient(id)).client);
      setFormOpen(true);
    } catch {
      toast.error(t('common.error'));
    }
  }
  const saved = () => { setFormOpen(false); setReloadKey((k) => k + 1); loadKpis(); };

  return (
    <div className="dash-page">
      <PageHeader
        title={t('users.heading')}
        description={t('users.subtitle')}
        actions={tab === 'clients' && (
          <button type="button" className="adm-btn adm-btn--primary" onClick={() => { setEditClient(null); setFormOpen(true); }}>
            <PlusIcon size={14} /> {t('travaux.clients.new')}
          </button>
        )}
      />

      <StatRow>
        <StatCard icon={<UsersIcon size={18} />} label={t('users.kpis.total')} value={kpis?.total ?? '—'} />
        <StatCard icon={<CheckCircleIcon size={18} />} label={t('users.kpis.confirmed')} value={kpis?.confirmed ?? '—'} />
        <StatCard icon={<LockIcon size={18} />} label={t('users.kpis.locked')} value={kpis?.locked ?? '—'} tone={kpis?.locked ? 'danger' : undefined} />
        <StatCard icon={<UserIcon size={18} />} label={t('users.kpis.new7d')} value={kpis?.new_last_7_days ?? '—'} />
        <StatCard icon={<UserIcon size={18} />} label={t('users.kpis.new30d')} value={kpis?.new_last_30_days ?? '—'} />
      </StatRow>

      {/* Clients are the companies; Équipes, the accounts belonging to them;
          Acquisition, the sign-ups no company holds yet (not active clients). */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all" icon={<UsersIcon size={14} />} count={kpis ? kpis.total - kpis.acquisition : undefined}>{t('users.tabs.all')}</TabsTrigger>
          <TabsTrigger value="admins" icon={<ShieldIcon size={14} />} count={kpis?.admins}>{t('users.kpis.admins')}</TabsTrigger>
          <TabsTrigger value="clients" icon={<HotelIcon size={14} />} count={kpis?.companies}>{t('users.tabs.companies')}</TabsTrigger>
          <TabsTrigger value="teams" icon={<LayoutDashboardIcon size={14} />} count={kpis?.company_members}>{t('users.tabs.teams')}</TabsTrigger>
          <TabsTrigger value="acquisition" icon={<TrendingUpIcon size={14} />} count={kpis?.acquisition}>{t('users.tabs.acquisition')}</TabsTrigger>
        </TabsList>
        {tab === 'all' && <UsersListTab key="all" segment="active" />}
        {tab === 'acquisition' && <UsersListTab key="acquisition" segment="acquisition" />}
        {tab === 'admins' && <UsersListTab key="admins" role="admin" />}
        {tab === 'teams' && <UsersListTab key="teams" withClient />}
        {tab === 'clients' && <CompaniesTab reloadKey={reloadKey} onEdit={openEdit} />}
      </Tabs>

      <ClientFormModal open={formOpen} client={editClient} onClose={() => setFormOpen(false)} onSaved={saved} onDeleted={saved} />
    </div>
  );
}
