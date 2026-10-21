import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { apiService, type AdminUser, type AdminUsersOverview, type AuthRole } from '@/services/api';
import { useAuth } from '@/components/providers/AuthProvider';
import { getDashboardPath, roleKey } from '@/utils/auth';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/common/Tabs';
import { PageHeader } from '@/components/private/common/PageHeader';
import { StatCard, StatRow } from '@/components/private/common/StatRow';
import { Modal } from '@/components/common/Modal';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useConfirm } from '@/components/common/ConfirmDialog';
import {
  DataTable, DataTableAction, DataTableBody, DataTableEmpty, DataTableHead, DataTableRow, DataTableSearch, DataTableSelectionBar,
  DataTableSelectTd, DataTableSelectTh, DataTableTd, DataTableTh, DataTableToolbar, exportRowsCsv, useRowSelection,
} from '@/components/common/DataTable';
import {
  UsersIcon, LayoutDashboardIcon, ShieldIcon, UserIcon, CheckCircleIcon, LockIcon,
  EyeIcon, ArrowUpRightIcon, ChevronLeftIcon, ChevronRightIcon, TrendingUpIcon,
  HotelIcon, PenLineIcon, PlusIcon, TrafficConeIcon, Trash2Icon,
} from '@icons';
import type { TravauxClient } from '@/types/travaux';
import { ClientAvatar } from './travaux/ClientAvatar';
import { ClientDetailModal } from './travaux/ClientDetailModal';
import { DetailHead, DetailSection, initialsOf } from './travaux/DetailCard';
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

// ── Fiche utilisateur (action « œil ») ───────────────────────────────────────

const ROLE_VARIANT: Record<AuthRole, 'info' | 'default' | 'muted'> = { admin: 'info', staff: 'default', user: 'muted' };

function UserDetailModal({
  user, onClose, canImpersonate, canLock, impersonating, onImpersonate, onLockChange,
}: {
  user: AdminUser | null;
  onClose: () => void;
  canImpersonate: boolean;
  canLock: boolean;
  impersonating: boolean;
  onImpersonate: (u: AdminUser) => void;
  onLockChange: (u: AdminUser) => Promise<void>;
}) {
  const { t } = useTranslation('admin');
  const [busy, setBusy] = useState(false);

  const toggleLock = async (u: AdminUser) => {
    setBusy(true);
    try { await onLockChange(u); } finally { setBusy(false); }
  };

  const statusLabel = (u: AdminUser) => u.locked ? t('users.status.locked') : u.confirmed ? t('users.status.confirmed') : t('users.status.unconfirmed');

  const footer = user && (
    <>
      {canLock && (
        <button type="button" className="adm-btn adm-btn--ghost" disabled={busy} onClick={() => toggleLock(user)}>
          {user.locked ? <CheckCircleIcon size={14} /> : <LockIcon size={14} />} {user.locked ? t('users.unlock') : t('users.lock')}
        </button>
      )}
      <button
        type="button"
        className="adm-btn adm-btn--primary"
        disabled={!canImpersonate || impersonating}
        title={!canImpersonate && user.role === 'admin' ? t('users.cantImpersonateAdmin') : undefined}
        onClick={() => onImpersonate(user)}
      >
        <ArrowUpRightIcon size={14} /> {t('users.impersonate')}
      </button>
    </>
  );

  return (
    <Modal open={!!user} onClose={onClose} title={t('users.detail.title')} size="md" footer={footer}>
      {user && (
        <div className="dm-card">
          <DetailHead
            avatar={<ClientAvatar client={{ name: user.full_name || user.email, initials: initialsOf(user.full_name, user.email), logo_path: null }} size="lg" />}
            name={user.full_name || user.email}
            subtitle={user.full_name ? user.email : user.client_name}
            pills={(
              <>
                <StatusBadge label={t(`users.roles.${roleKey(user)}`)} variant={ROLE_VARIANT[user.role]} />
                <StatusBadge label={statusLabel(user)} variant={user.locked ? 'danger' : user.confirmed ? 'success' : 'warning'} />
                {user.client_name && <StatusBadge label={user.client_name} variant="default" />}
              </>
            )}
          />

          <DetailSection
            title={t('common.detailSections.identity')}
            tiles={[
              { label: t('users.detail.firstName'), value: user.first_name },
              { label: t('users.detail.lastName'), value: user.last_name },
              { label: t('users.table.role'), value: t(`users.roles.${roleKey(user)}`) },
              { label: t('users.detail.language'), value: user.language?.toUpperCase() },
            ]}
          />

          <DetailSection
            title={t('common.detailSections.contact')}
            tiles={[
              { label: t('users.table.email'), value: user.email, copy: user.email },
              { label: t('users.detail.phone'), value: user.phone, copy: user.phone },
            ]}
          />

          <DetailSection
            title={t('common.detailSections.organization')}
            tiles={[
              { label: t('users.table.company'), value: user.client_name },
              { label: t('users.detail.company'), value: user.company },
            ]}
          />

          <DetailSection
            title={t('common.detailSections.activity')}
            tiles={[
              { label: t('users.table.status'), value: statusLabel(user) },
              { label: t('users.detail.signInCount'), value: user.sign_in_count, num: true },
              { label: t('users.detail.lastSignIn'), value: user.last_sign_in_at ? fmt(user.last_sign_in_at) : null },
              { label: t('users.table.createdAt'), value: fmt(user.created_at) },
            ]}
          />
        </div>
      )}
    </Modal>
  );
}

// ── Utilisateurs (table) ─────────────────────────────────────────────────────

const idOf = (row: { id: string }) => row.id;

/** Bulk: one request per row, then a single toast. */
async function runBulk<T>(rows: T[], action: (row: T) => Promise<unknown>, tc: (key: string, opts?: Record<string, unknown>) => string) {
  const results = await Promise.allSettled(rows.map(action));
  if (results.some((r) => r.status === 'rejected')) toast.error(tc('table.bulkFailed'));
  else toast.success(tc('table.bulkDone', { count: results.length }));
}

/** The accounts table; the page's tab picks the role, the companies' teams or the acquisition. */
function UsersListTab({ role = '', withClient = false, segment, onChanged }: { role?: AuthRole | ''; withClient?: boolean; segment?: 'active' | 'acquisition'; onChanged?: () => void }) {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
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

  const load = useCallback(() => {
    setLoading(true);
    setErr(false);
    apiService.adminUsersList({ page, per_page: PER_PAGE, q: search || undefined, role: role || undefined, with_client: withClient ? 'true' : undefined, segment })
      .then((res) => { setUsers(res.users); setTotal(res.meta.total); })
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, [page, search, role, withClient, segment]);

  // Server-side search, debounced while typing.
  useEffect(() => { const id = window.setTimeout(load, search ? 300 : 0); return () => window.clearTimeout(id); }, [load, search]);

  const selection = useRowSelection(users, idOf);

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

  async function bulk(rows: AdminUser[], action: (u: AdminUser) => Promise<unknown>) {
    await runBulk(rows, action, tc);
    selection.clear(); load(); onChanged?.();
  }

  // Never lock one's own account.
  const bulkLock = () => bulk(selection.selectedRows.filter((u) => u.id !== currentUser?.id && !u.locked), (u) => apiService.adminUserLock(u.id));
  const bulkUnlock = () => bulk(selection.selectedRows.filter((u) => u.locked), (u) => apiService.adminUserUnlock(u.id));

  const roleLabel = (u: AdminUser) => t(`users.roles.${roleKey(u)}`);
  const statusLabel = (u: AdminUser) => u.locked ? t('users.status.locked') : u.confirmed ? t('users.status.confirmed') : t('users.status.unconfirmed');

  function exportSelection() {
    exportRowsCsv('utilisateurs', [
      [t('users.table.name'), (u) => u.full_name ?? ''],
      [t('users.table.email'), (u) => u.email],
      [t('users.table.company'), (u) => u.client_name ?? ''],
      [t('users.table.role'), (u) => roleLabel(u)],
      [t('users.table.status'), statusLabel],
      [t('users.table.createdAt'), (u) => fmt(u.created_at)],
    ], selection.selectedRows);
  }

  if (err) return <p className="trk-empty">{t('tracking.loadError')}</p>;

  const emptyLabel = search
    ? tc('table.noResults', { query: search })
    : withClient ? t('users.teamsEmpty') : segment === 'acquisition' ? t('users.acquisitionEmpty') : t('users.empty');

  return (
    <div className="trk-tab space-y-4">
      <DataTableToolbar>
        <DataTableSearch value={search} placeholder={t('users.searchPlaceholder')} onChange={(value) => { setSearch(value); setPage(1); }} />
      </DataTableToolbar>

      <DataTableSelectionBar count={selection.count} onClear={selection.clear} onExport={exportSelection}>
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={bulkLock}>
          <LockIcon size={13} /> {t('users.lock')}
        </button>
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={bulkUnlock}>
          <CheckCircleIcon size={13} /> {t('users.unlock')}
        </button>
      </DataTableSelectionBar>

      {loading ? (
        <p className="trk-loading">…</p>
      ) : (
        <Card className="overflow-hidden gap-0">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableSelectTh checked={selection.allChecked} indeterminate={selection.someChecked} onChange={selection.toggleAll} ariaLabel={tc('table.selectAll')} />
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
                <DataTableEmpty icon={<UsersIcon size={28} />} label={emptyLabel} />
              ) : users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const canImpersonate = !isSelf && u.role !== 'admin' && !u.locked;
                return (
                  <DataTableRow key={u.id}>
                    <DataTableSelectTd checked={selection.isSelected(u.id)} onChange={(checked) => selection.toggle(u.id, checked)} ariaLabel={tc('table.selectRow')} />
                    <DataTableTd>{u.full_name || '—'}</DataTableTd>
                    <DataTableTd>{u.email}</DataTableTd>
                    <DataTableTd>{u.client_name || '—'}</DataTableTd>
                    <DataTableTd>
                      <span className={`adm-badge adm-badge--${u.role === 'admin' ? 'info' : u.role === 'staff' ? 'default' : 'muted'}`}>
                        {roleLabel(u)}
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
                    <DataTableTd>{fmt(u.created_at)}</DataTableTd>
                    <DataTableTd>
                      <div className="adm-table__actions">
                        <DataTableAction icon={EyeIcon} label={t('tracking.viewDetails')} onClick={() => setSelected(u)} />
                        <DataTableAction
                          icon={ArrowUpRightIcon}
                          label={isSelf ? t('users.cantImpersonateSelf') : u.role === 'admin' ? t('users.cantImpersonateAdmin') : t('users.impersonate')}
                          disabled={!canImpersonate || impersonatingId === u.id}
                          onClick={() => handleImpersonate(u)}
                        />
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

      <UserDetailModal
        user={selected}
        onClose={() => setSelected(null)}
        canImpersonate={!!selected && selected.id !== currentUser?.id && selected.role !== 'admin' && !selected.locked}
        canLock={!!selected && selected.id !== currentUser?.id}
        impersonating={!!selected && impersonatingId === selected.id}
        onImpersonate={handleImpersonate}
        onLockChange={async (u) => {
          try {
            const res = u.locked ? await apiService.adminUserUnlock(u.id) : await apiService.adminUserLock(u.id);
            setSelected(res.user);
            load(); onChanged?.();
          } catch {
            toast.error(t('common.error'));
          }
        }}
      />
    </div>
  );
}

// ── Clients : the companies (Travaux clients) ────────────────────────────────

function CompaniesTab({ reloadKey, onEdit, onChanged }: { reloadKey: number; onEdit: (id: string) => void; onChanged?: () => void }) {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [clients, setClients] = useState<TravauxClient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewId, setViewId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    apiService.adminTravauxClients({ page, per_page: PER_PAGE, q: search || undefined })
      .then((res) => { setClients(res.clients); setTotal(res.meta.total); })
      .catch(() => toast.error(t('travaux.clients.loadError')))
      .finally(() => setLoading(false));
  }, [page, search, t]);

  // Server-side search, debounced while typing.
  useEffect(() => { const id = window.setTimeout(load, search ? 300 : 0); return () => window.clearTimeout(id); }, [load, search, reloadKey]);

  const selection = useRowSelection(clients, idOf);

  const referentOf = (c: TravauxClient) => [c.referent_first_name, c.referent_last_name].filter(Boolean).join(' ');

  async function bulkDelete() {
    if (!(await confirm({ title: tc('table.bulkDeleteTitle', { count: selection.count }), message: tc('table.bulkDeleteMessage') }))) return;
    await runBulk(selection.selectedRows, (c) => apiService.adminTravauxDeleteClient(c.id), tc);
    selection.clear(); load(); onChanged?.();
  }

  function exportSelection() {
    exportRowsCsv('clients', [
      [t('travaux.clients.table.company'), (c) => c.name],
      [t('travaux.clients.fields.siret'), (c) => c.siret ?? ''],
      [t('travaux.clients.table.referent'), referentOf],
      [t('travaux.clients.fields.referentEmail'), (c) => c.referent_email ?? ''],
      [t('travaux.clients.fields.contactEmail'), (c) => c.contact_email ?? ''],
      [t('travaux.clients.table.members'), (c) => c.stats?.members_count ?? 0],
      [t('travaux.clients.table.projects'), (c) => c.stats?.projects_count ?? 0],
    ], selection.selectedRows);
  }

  return (
    <div className="trk-tab space-y-4">
      <DataTableToolbar>
        <DataTableSearch value={search} placeholder={t('users.companies.search')} onChange={(value) => { setSearch(value); setPage(1); }} />
      </DataTableToolbar>

      <DataTableSelectionBar count={selection.count} onClear={selection.clear} onExport={exportSelection}>
        <button type="button" className="adm-btn adm-btn--danger adm-btn--sm" onClick={bulkDelete}>
          <Trash2Icon size={13} /> {tc('table.delete')}
        </button>
      </DataTableSelectionBar>

      <Card className="overflow-hidden gap-0">
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableSelectTh checked={selection.allChecked} indeterminate={selection.someChecked} onChange={selection.toggleAll} ariaLabel={tc('table.selectAll')} />
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
            {!loading && clients.length === 0 && (
              <DataTableEmpty icon={<UsersIcon size={28} />} label={search ? tc('table.noResults', { query: search }) : t('travaux.clients.empty')} />
            )}
            {!loading && clients.map((c) => (
              <DataTableRow key={c.id} onClick={() => setViewId(c.id)}>
                {/* Select cell: keep the click from opening the detail. */}
                <DataTableTd className="adm-table__td--select" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selection.isSelected(c.id)} aria-label={tc('table.selectRow')} onChange={(e) => selection.toggle(c.id, e.target.checked)} />
                </DataTableTd>
                <DataTableTd className="trv-col-logo"><ClientAvatar client={c} /></DataTableTd>
                <DataTableTd><span className="trv-client-cell__name">{c.name}</span></DataTableTd>
                <DataTableTd>{referentOf(c) || '—'}</DataTableTd>
                <DataTableTd className="trv-col-num trv-num">{c.stats?.members_count ?? 0}</DataTableTd>
                <DataTableTd className="trv-col-num trv-num">{c.stats?.projects_count ?? 0}</DataTableTd>
                <DataTableTd>
                  <div className="adm-table__actions">
                    <DataTableAction icon={EyeIcon} label={t('travaux.clients.actions.view')} onClick={() => setViewId(c.id)} />
                    <DataTableAction icon={PenLineIcon} label={t('travaux.clients.actions.edit')} onClick={() => onEdit(c.id)} />
                    <DataTableAction icon={TrafficConeIcon} label={t('travaux.clients.actions.travaux')} onClick={() => navigate(`/admin/travaux/${c.id}`)} />
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

      <ClientDetailModal clientId={viewId} onClose={() => setViewId(null)} onEdit={(id) => { setViewId(null); onEdit(id); }} />
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
            <PlusIcon size={14} /> {t('users.companies.new')}
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
        {tab === 'all' && <UsersListTab key="all" segment="active" onChanged={loadKpis} />}
        {tab === 'acquisition' && <UsersListTab key="acquisition" segment="acquisition" onChanged={loadKpis} />}
        {tab === 'admins' && <UsersListTab key="admins" role="admin" onChanged={loadKpis} />}
        {tab === 'teams' && <UsersListTab key="teams" withClient onChanged={loadKpis} />}
        {tab === 'clients' && <CompaniesTab reloadKey={reloadKey} onEdit={openEdit} onChanged={loadKpis} />}
      </Tabs>

      <ClientFormModal open={formOpen} client={editClient} onClose={() => setFormOpen(false)} onSaved={saved} onDeleted={saved} />
    </div>
  );
}
