import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  SearchIcon, EyeIcon, ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon,
} from '@icons';

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

/** The accounts table; the page's tabs pick the role. */
function UsersListTab({ role }: { role: AuthRole | '' }) {
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
    apiService.adminUsersList({ page: p, per_page: PER_PAGE, q: q || undefined, role: r || undefined })
      .then((res) => { setUsers(res.users); setTotal(res.meta.total); })
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(page, search, role); }, [page, load]); // eslint-disable-line react-hooks/exhaustive-deps

  // Another tab (role): back to its first page.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    setPage(1);
    load(1, search, role);
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

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
                <DataTableTh>{t('users.table.role')}</DataTableTh>
                <DataTableTh>{t('users.table.status')}</DataTableTh>
                <DataTableTh>{t('users.table.createdAt')}</DataTableTh>
                <DataTableTh>{t('users.table.actions')}</DataTableTh>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {users.length === 0 ? (
                <DataTableEmpty icon={<UsersIcon size={28} />} label={t('users.empty')} />
              ) : users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const canImpersonate = !isSelf && u.role !== 'admin' && !u.locked;
                return (
                  <DataTableRow key={u.id}>
                    <DataTableTd>{u.full_name || '—'}</DataTableTd>
                    <DataTableTd className="text-xs">{u.email}</DataTableTd>
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
                          <ArrowRightIcon size={13} />
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

// ── Page ──────────────────────────────────────────────────────────────────────

const ROLE_TABS: { key: string; role: AuthRole | '' }[] = [
  { key: 'all', role: '' },
  { key: 'admins', role: 'admin' },
  { key: 'staff', role: 'staff' },
  { key: 'clients', role: 'user' },
];

export default function AdminUsers() {
  const { t } = useTranslation('admin');
  const [tab, setTab] = useState('all');
  const [kpis, setKpis] = useState<AdminUsersOverview | null>(null);

  useEffect(() => {
    apiService.adminUsersOverview().then(setKpis).catch(() => setKpis(null));
  }, []);

  const count: Record<string, number | undefined> = {
    all: kpis?.total, admins: kpis?.admins, staff: kpis?.staff, clients: kpis?.clients,
  };
  const role = ROLE_TABS.find((r) => r.key === tab)?.role ?? '';

  return (
    <div className="dash-page">
      <PageHeader icon={<ShieldIcon size={26} />} title={t('users.heading')} description={t('users.subtitle')} />

      <StatRow>
        <StatCard icon={<UsersIcon size={18} />} label={t('users.kpis.total')} value={kpis?.total ?? '—'} />
        <StatCard icon={<CheckCircleIcon size={18} />} label={t('users.kpis.confirmed')} value={kpis?.confirmed ?? '—'} />
        <StatCard icon={<LockIcon size={18} />} label={t('users.kpis.locked')} value={kpis?.locked ?? '—'} tone={kpis?.locked ? 'danger' : undefined} />
        <StatCard icon={<UserIcon size={18} />} label={t('users.kpis.new7d')} value={kpis?.new_last_7_days ?? '—'} />
        <StatCard icon={<UserIcon size={18} />} label={t('users.kpis.new30d')} value={kpis?.new_last_30_days ?? '—'} />
      </StatRow>

      {/* One tab per role; the table below follows it. */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all" icon={<UsersIcon size={14} />} count={count.all}>{t('users.tabs.all')}</TabsTrigger>
          <TabsTrigger value="admins" icon={<ShieldIcon size={14} />} count={count.admins}>{t('users.kpis.admins')}</TabsTrigger>
          <TabsTrigger value="staff" icon={<LayoutDashboardIcon size={14} />} count={count.staff}>{t('users.kpis.staff')}</TabsTrigger>
          <TabsTrigger value="clients" icon={<UserIcon size={14} />} count={count.clients}>{t('users.kpis.clients')}</TabsTrigger>
        </TabsList>
        <UsersListTab role={role} />
      </Tabs>
    </div>
  );
}
