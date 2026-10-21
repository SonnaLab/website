/**
 * TrackingTabs — sub-tab components for the Cookies & consentement page.
 * Each tab handles its own data fetching, pagination and detail modal.
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { apiService } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/common/Modal';
import {
  DataTable, DataTableAction, DataTableBody, DataTableEmpty, DataTableHead, DataTableRow, DataTableSearch, DataTableSelectionBar,
  DataTableSelectTd, DataTableSelectTh, DataTableTd, DataTableTh, DataTableToolbar, exportRowsCsv, filterRows, useRowSelection,
} from '@/components/common/DataTable';
import { ChevronLeftIcon, ChevronRightIcon, EyeIcon } from '@icons';

const SITE = 'sonnalab.com';
const PER_PAGE = 10;

// ─── Shared helpers ────────────────────────────────────────────────────────────

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

function EmptyState({ message }: { message: string }) {
  return <p className="trk-empty">{message}</p>;
}

function LoadingState() {
  return <p className="trk-loading">…</p>;
}

// ─── Table standard helpers (search, selection, CSV export) ──────────────────

type Selection = ReturnType<typeof useRowSelection<any>>;
type Fields = (row: any) => Array<string | number | null | undefined>;
type Columns = Array<[string, (row: any) => unknown]>;

/** Rows matching the search; `fields` must be a stable (module-level) function. */
function useSearch(rows: any[] | null | undefined, fields: Fields) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => filterRows(rows ?? [], query, fields), [rows, query, fields]);
  return { query, setQuery, filtered };
}

/** Search above the table, then the selection bar (CSV export: these lists are read-only). */
function TableTools({ query, onQuery, selection, filename, columns }: {
  query: string; onQuery: (value: string) => void; selection: Selection; filename: string; columns: Columns;
}) {
  return (
    <>
      <DataTableToolbar>
        <DataTableSearch value={query} onChange={onQuery} />
      </DataTableToolbar>
      <DataTableSelectionBar
        count={selection.count}
        onClear={selection.clear}
        onExport={() => exportRowsCsv(filename, columns, selection.selectedRows)}
      />
    </>
  );
}

function SelectAllTh({ selection }: { selection: Selection }) {
  const { t: tc } = useTranslation('common');
  return <DataTableSelectTh checked={selection.allChecked} indeterminate={selection.someChecked} onChange={selection.toggleAll} ariaLabel={tc('table.selectAll')} />;
}

function SelectTd({ selection, id }: { selection: Selection; id: string }) {
  const { t: tc } = useTranslation('common');
  return <DataTableSelectTd checked={selection.isSelected(id)} onChange={(checked) => selection.toggle(id, checked)} ariaLabel={tc('table.selectRow')} />;
}

function NoResults({ query }: { query: string }) {
  const { t: tc } = useTranslation('common');
  return <DataTableEmpty label={tc('table.noResults', { query })} />;
}

const byId = (row: any) => String(row.id);

function fmt(date: string | null | undefined) {
  if (!date) return '—';
  return new Date(date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function dur(s: number | null | undefined) {
  if (s == null) return '—';
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m${s % 60}s`;
}

function timeAgo(date: string | null | undefined): string {
  if (!date) return '—';
  const diffMs = Date.now() - new Date(date).getTime();
  const diffS  = Math.floor(diffMs / 1000);
  if (diffS < 60)  return `il y a ${diffS}s`;
  const diffM = Math.floor(diffS / 60);
  if (diffM < 60)  return `il y a ${diffM}m`;
  return `il y a ${Math.floor(diffM / 60)}h`;
}

const _regionNames = new Intl.DisplayNames(['fr'], { type: 'region' });
function countryName(code: string | null | undefined): string {
  if (!code) return '—';
  try { return _regionNames.of(code) ?? code; } catch { return code; }
}

// ─── Géographie ────────────────────────────────────────────────────────────────

const GEO_ID = (r: any) => String(r.country ?? r.country_name);
const GEO_FIELDS: Fields = (r) => [r.country, r.country_name];

export function GeoTab() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const [data, setData] = useState<any[] | null>(null);
  const [page, setPage] = useState(1);
  const [err, setErr] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    setErr(false);
    apiService.analyticsGeo(SITE, { days: 30, limit: 200 })
      .then(setData).catch(() => setErr(true));
  }, []);

  const { query, setQuery, filtered } = useSearch(data, GEO_FIELDS);
  const slice = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page]);
  const selection = useRowSelection(slice, GEO_ID);

  if (err) return <EmptyState message={t('tracking.loadError')} />;
  if (!data) return <LoadingState />;

  return (
    <div className="trk-tab">
      {data.length === 0 ? (
        <EmptyState message={t('tracking.noData')} />
      ) : (
        <>
        <TableTools
          query={query}
          onQuery={(value) => { setQuery(value); setPage(1); }}
          selection={selection}
          filename="tracking-geographie"
          columns={[['Code', (r) => r.country ?? ''], [t('tracking.country'), (r) => r.country_name ?? r.country ?? ''], ['Sessions', (r) => r.sessions], ['%', (r) => r.pct]]}
        />
        <Card className="overflow-hidden gap-0">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <SelectAllTh selection={selection} />
                <DataTableTh>Code</DataTableTh>
                <DataTableTh>{t('tracking.country')}</DataTableTh>
                <DataTableTh>Sessions</DataTableTh>
                <DataTableTh>%</DataTableTh>
                <DataTableTh>{tc('table.actions')}</DataTableTh>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {slice.length === 0 && <NoResults query={query} />}
              {slice.map((r: any) => (
                <DataTableRow key={GEO_ID(r)}>
                  <SelectTd selection={selection} id={GEO_ID(r)} />
                  <DataTableTd className="font-mono text-xs">{r.country ?? '—'}</DataTableTd>
                  <DataTableTd>{r.country_name ?? r.country ?? '—'}</DataTableTd>
                  <DataTableTd>{r.sessions}</DataTableTd>
                  <DataTableTd>{r.pct}%</DataTableTd>
                  <DataTableTd>
                    <div className="adm-table__actions">
                      <DataTableAction icon={EyeIcon} label={t('tracking.viewDetails')} onClick={() => setSelected(r)} />
                    </div>
                  </DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
          <Pagination
            page={page}
            hasMore={page * PER_PAGE < filtered.length}
            onPrev={() => setPage(p => p - 1)}
            onNext={() => setPage(p => p + 1)}
          />
        </Card>
        </>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.country_name ?? selected?.country ?? '—'} size="sm">
        {selected && (
          <dl className="trk-modal-dl">
            <dt>Code</dt><dd className="font-mono">{selected.country ?? '—'}</dd>
            <dt>Pays</dt><dd>{selected.country_name ?? '—'}</dd>
            <dt>Sessions</dt><dd>{selected.sessions}</dd>
            <dt>Part</dt><dd>{selected.pct}%</dd>
          </dl>
        )}
      </Modal>
    </div>
  );
}

// ─── Temps réel ────────────────────────────────────────────────────────────────

const SESSION_FIELDS: Fields = (s) => [s.id, s.landing_page, s.device_type, s.browser, s.country, countryName(s.country), s.utm_source];

export function RealtimeTab() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const [overview, setOverview] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [err, setErr] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [tick, setTick] = useState(0); // force re-render for timeAgo

  const reload = useCallback(() => {
    setErr(false);
    Promise.all([
      apiService.analyticsOverview(SITE),
      apiService.analyticsSessions(SITE, { active_only: true, per_page: 100 }),
    ]).then(([ov, d]) => {
      setOverview(ov);
      setSessions(Array.isArray(d) ? d : d.items ?? []);
    }).catch(() => setErr(true));
  }, []);

  useEffect(() => {
    reload();
    const pollId  = setInterval(reload, 15_000);
    const tickId  = setInterval(() => setTick(n => n + 1), 10_000); // refresh timeAgo
    return () => { clearInterval(pollId); clearInterval(tickId); };
  }, [reload]);

  const { query, setQuery, filtered } = useSearch(sessions, SESSION_FIELDS);
  const selection = useRowSelection(filtered, byId);

  if (err) return <EmptyState message={t('tracking.loadError')} />;

  const activeCount = overview?.realtime_active ?? 0;

  return (
    <div className="trk-tab space-y-4">
      {overview != null && (
        <div className="trk-realtime-active">
          <span className={`trk-realtime-pulse${activeCount > 0 ? ' trk-realtime-pulse--live' : ''}`} />
          <span className="trk-realtime-count">{activeCount}</span>
          <span className="trk-realtime-label">visiteur{activeCount !== 1 ? 's' : ''} actif{activeCount !== 1 ? 's' : ''} en ce moment</span>
        </div>
      )}

      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Sessions actives (30 dernières minutes)
      </p>

      {sessions.length === 0 ? (
        <EmptyState message={t('tracking.noData')} />
      ) : (
        <>
        <TableTools
          query={query}
          onQuery={setQuery}
          selection={selection}
          filename="tracking-temps-reel"
          columns={[
            ['Landing page', (s) => s.landing_page ?? '/'],
            [t('tracking.device'), (s) => s.device_type ?? ''],
            [t('tracking.country'), (s) => countryName(s.country)],
            ['Pages', (s) => s.page_count ?? 0],
            ['Dernière activité', (s) => fmt(s.last_activity_at)],
          ]}
        />
        <Card className="overflow-hidden gap-0">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <SelectAllTh selection={selection} />
                <DataTableTh>Landing page</DataTableTh>
                <DataTableTh>{t('tracking.device')}</DataTableTh>
                <DataTableTh>{t('tracking.country')}</DataTableTh>
                <DataTableTh>Pages</DataTableTh>
                <DataTableTh>Dernière activité</DataTableTh>
                <DataTableTh>{tc('table.actions')}</DataTableTh>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {filtered.length === 0 && <NoResults query={query} />}
              {filtered.map((s: any) => (
                <DataTableRow key={s.id}>
                  <SelectTd selection={selection} id={byId(s)} />
                  <DataTableTd className="font-mono text-xs max-w-[180px] truncate" title={s.landing_page ?? '/'}>
                    {s.landing_page ? s.landing_page.replace('https://sonnalab.com', '') || '/' : '/'}
                  </DataTableTd>
                  <DataTableTd>{s.device_type ?? '—'}</DataTableTd>
                  <DataTableTd>{countryName(s.country)}</DataTableTd>
                  <DataTableTd>{s.page_count ?? 0}</DataTableTd>
                  <DataTableTd className="text-xs tabular-nums">{timeAgo(s.last_activity_at)}</DataTableTd>
                  <DataTableTd>
                    <div className="adm-table__actions">
                      <DataTableAction icon={EyeIcon} label={t('tracking.viewDetails')} onClick={() => setSelected(s)} />
                    </div>
                  </DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </Card>
        </>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Détails session" size="sm">
        {selected && (
          <dl className="trk-modal-dl">
            <dt>Statut</dt><dd>{selected.duration_seconds == null ? '🟢 Active' : '⚫ Terminée'}</dd>
            <dt>Landing page</dt><dd className="font-mono text-xs break-all">{selected.landing_page ?? '/'}</dd>
            <dt>{t('tracking.device')}</dt><dd>{selected.device_type ?? '—'}</dd>
            <dt>Navigateur</dt><dd>{selected.browser ?? '—'}</dd>
            <dt>{t('tracking.country')}</dt><dd>{countryName(selected.country)}</dd>
            <dt>Pages visitées</dt><dd>{selected.page_count ?? 0}</dd>
            <dt>Dernière activité</dt><dd>{fmt(selected.last_activity_at)}</dd>
            <dt>Début</dt><dd>{fmt(selected.started_at)}</dd>
          </dl>
        )}
      </Modal>
    </div>
  );
}

// ─── Visiteurs ─────────────────────────────────────────────────────────────────

const VISITOR_FIELDS: Fields = (v) => [v.fingerprint_id, v.country, countryName(v.country), v.device_type, v.browser];

export function VisitorsTab() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const [data, setData] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [visitorSessions, setVisitorSessions] = useState<any[]>([]);
  const [visitorPages, setVisitorPages] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setErr(false);
    apiService.analyticsVisitors(SITE, { page, per_page: PER_PAGE })
      .then(d => setData(Array.isArray(d) ? d : []))
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    if (!loading && data.length === 0 && page > 1) setPage(p => p - 1);
  }, [loading, data, page]);

  useEffect(() => {
    if (!selected) { setVisitorSessions([]); setVisitorPages([]); return; }
    setDetailLoading(true);
    Promise.all([
      apiService.analyticsVisitorSessions(SITE, selected.id, { per_page: 5 }).catch(() => []),
      apiService.analyticsVisitorPages(SITE, selected.id, { limit: 10 }).catch(() => []),
    ]).then(([sessions, pages]) => {
      setVisitorSessions(Array.isArray(sessions) ? sessions : []);
      setVisitorPages(Array.isArray(pages) ? pages : []);
    }).finally(() => setDetailLoading(false));
  }, [selected]);

  // Search within the loaded page (the API has no search).
  const { query, setQuery, filtered } = useSearch(data, VISITOR_FIELDS);
  const selection = useRowSelection(filtered, byId);

  if (err) return <EmptyState message={t('tracking.loadError')} />;
  if (loading) return <LoadingState />;

  return (
    <div className="trk-tab">
      {data.length === 0 ? (
        <EmptyState message={t('tracking.noData')} />
      ) : (
        <>
        <TableTools
          query={query}
          onQuery={setQuery}
          selection={selection}
          filename="tracking-visiteurs"
          columns={[
            ['ID', (v) => v.fingerprint_id],
            ['1ère visite', (v) => fmt(v.first_seen_at)],
            ['Dernière visite', (v) => fmt(v.last_seen_at)],
            ['Visites', (v) => v.visit_count],
            [t('tracking.country'), (v) => countryName(v.country)],
            [t('tracking.device'), (v) => v.device_type ?? ''],
            ['Navigateur', (v) => v.browser ?? ''],
          ]}
        />
        <Card className="overflow-hidden gap-0">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <SelectAllTh selection={selection} />
                <DataTableTh>ID</DataTableTh>
                <DataTableTh>1ère visite</DataTableTh>
                <DataTableTh>Dernière visite</DataTableTh>
                <DataTableTh>Visites</DataTableTh>
                <DataTableTh>{t('tracking.country')}</DataTableTh>
                <DataTableTh>{t('tracking.device')}</DataTableTh>
                <DataTableTh>{tc('table.actions')}</DataTableTh>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {filtered.length === 0 && <NoResults query={query} />}
              {filtered.map((v: any) => (
                <DataTableRow key={v.id}>
                  <SelectTd selection={selection} id={byId(v)} />
                  <DataTableTd className="font-mono text-xs">{v.fingerprint_id}</DataTableTd>
                  <DataTableTd>{fmt(v.first_seen_at)}</DataTableTd>
                  <DataTableTd>{fmt(v.last_seen_at)}</DataTableTd>
                  <DataTableTd>{v.visit_count}</DataTableTd>
                  <DataTableTd>{countryName(v.country)}</DataTableTd>
                  <DataTableTd>{v.device_type ?? '—'}</DataTableTd>
                  <DataTableTd>
                    <div className="adm-table__actions">
                      <DataTableAction icon={EyeIcon} label={t('tracking.viewDetails')} onClick={() => setSelected(v)} />
                    </div>
                  </DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
          <Pagination
            page={page}
            hasMore={data.length === PER_PAGE}
            onPrev={() => setPage(p => p - 1)}
            onNext={() => setPage(p => p + 1)}
          />
        </Card>
        </>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Détails visiteur" size="md">
        {selected && (
          <>
            <dl className="trk-modal-dl">
              <dt>ID</dt><dd className="font-mono">{selected.fingerprint_id}</dd>
              <dt>1ère visite</dt><dd>{fmt(selected.first_seen_at)}</dd>
              <dt>Dernière visite</dt><dd>{fmt(selected.last_seen_at)}</dd>
              <dt>Nb visites</dt><dd>{selected.visit_count}</dd>
              <dt>{t('tracking.country')}</dt><dd>{countryName(selected.country)}</dd>
              <dt>{t('tracking.device')}</dt><dd>{selected.device_type ?? '—'}</dd>
              <dt>Navigateur</dt><dd>{selected.browser ?? '—'}</dd>
            </dl>

            {detailLoading ? (
              <p className="trk-modal-loading">Chargement…</p>
            ) : (
              <>
                {visitorSessions.length > 0 && (
                  <div className="trk-modal-section">
                    <h4 className="trk-modal-section__title">Sessions récentes</h4>
                    <ul className="trk-modal-list">
                      {visitorSessions.map((s: any) => (
                        <li key={s.id} className="trk-modal-list__item">
                          <span className="trk-modal-list__date">{fmt(s.started_at)}</span>
                          <span className="trk-modal-list__meta">
                            {s.landing_page ?? '/'} · {dur(s.duration_seconds)} · {s.page_count} page{s.page_count !== 1 ? 's' : ''}
                            {s.is_bounce ? ' · rebond' : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {visitorPages.length > 0 && (
                  <div className="trk-modal-section">
                    <h4 className="trk-modal-section__title">Pages consultées</h4>
                    <ul className="trk-modal-list">
                      {visitorPages.map((p: any, i: number) => (
                        <li key={i} className="trk-modal-list__item">
                          <span className="trk-modal-list__date">{p.entered_at ? fmt(p.entered_at) : '—'}</span>
                          <span className="trk-modal-list__meta trk-modal-list__meta--url" title={p.url_path}>
                            {p.url_path}
                            {p.time_on_page_ms != null ? ` · ${Math.round(p.time_on_page_ms / 1000)}s` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}

// ─── Bots ──────────────────────────────────────────────────────────────────────

const BOT_FIELDS: Fields = (v) => [v.ip_address, v.bot_type, v.country, countryName(v.country), v.isp, v.user_agent];

export function BotsTab() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const [overview, setOverview] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    setErr(false);
    Promise.all([
      page === 1 ? apiService.botsOverview(SITE) : Promise.resolve(overview),
      apiService.botsVisits(SITE, { page, per_page: PER_PAGE }),
    ]).then(([ov, v]) => {
      if (page === 1) setOverview(ov);
      setVisits(Array.isArray(v) ? v : []);
    }).catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    if (!loading && visits.length === 0 && page > 1) setPage(p => p - 1);
  }, [loading, visits, page]);

  // Search within the loaded page (the API has no search).
  const { query, setQuery, filtered } = useSearch(visits, BOT_FIELDS);
  const selection = useRowSelection(filtered, byId);

  if (err) return <EmptyState message={t('tracking.loadError')} />;
  if (loading) return <LoadingState />;

  return (
    <div className="trk-tab space-y-4">
      {visits.length === 0 ? (
        <EmptyState message={t('tracking.noData')} />
      ) : (
        <>
        <TableTools
          query={query}
          onQuery={setQuery}
          selection={selection}
          filename="tracking-bots"
          columns={[
            ['IP', (v) => v.ip_address ?? ''],
            ['Type', (v) => v.bot_type ?? ''],
            ['Score', (v) => v.confidence_score ?? ''],
            [t('tracking.country'), (v) => (v.country != null ? countryName(v.country) : '')],
            ['ISP', (v) => v.isp ?? ''],
            ['User-Agent', (v) => v.user_agent ?? ''],
            ['Requêtes', (v) => v.request_count ?? 0],
            ['Dernière vue', (v) => fmt(v.last_seen_at)],
          ]}
        />
        <Card className="overflow-hidden gap-0">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <SelectAllTh selection={selection} />
                <DataTableTh>IP</DataTableTh>
                <DataTableTh>Type</DataTableTh>
                <DataTableTh>Score</DataTableTh>
                <DataTableTh>{t('tracking.country')}</DataTableTh>
                <DataTableTh>Requêtes</DataTableTh>
                <DataTableTh>Dernière vue</DataTableTh>
                <DataTableTh>{tc('table.actions')}</DataTableTh>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {filtered.length === 0 && <NoResults query={query} />}
              {filtered.map((v: any) => (
                <DataTableRow key={v.id}>
                  <SelectTd selection={selection} id={byId(v)} />
                  <DataTableTd className="font-mono text-xs">{v.ip_address ?? '—'}</DataTableTd>
                  <DataTableTd>{v.bot_type ?? '—'}</DataTableTd>
                  <DataTableTd>{v.confidence_score != null ? `${v.confidence_score}%` : '—'}</DataTableTd>
                  <DataTableTd>{v.country != null ? countryName(v.country) : '—'}</DataTableTd>
                  <DataTableTd>{v.request_count ?? 0}</DataTableTd>
                  <DataTableTd>{fmt(v.last_seen_at)}</DataTableTd>
                  <DataTableTd>
                    <div className="adm-table__actions">
                      <DataTableAction icon={EyeIcon} label={t('tracking.viewDetails')} onClick={() => setSelected(v)} />
                    </div>
                  </DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
          <Pagination
            page={page}
            hasMore={visits.length === PER_PAGE}
            onPrev={() => setPage(p => p - 1)}
            onNext={() => setPage(p => p + 1)}
          />
        </Card>
        </>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Détails bot" size="md">
        {selected && (
          <dl className="trk-modal-dl">
            <dt>IP</dt><dd className="font-mono">{selected.ip_address}</dd>
            <dt>Type</dt><dd>{selected.bot_type ?? '—'}</dd>
            <dt>Score</dt><dd>{selected.confidence_score != null ? `${selected.confidence_score}%` : '—'}</dd>
            <dt>ISP</dt><dd>{selected.isp ?? '—'}</dd>
            <dt>{t('tracking.country')}</dt><dd>{countryName(selected.country)}</dd>
            <dt>User-Agent</dt><dd className="font-mono text-xs break-all">{selected.user_agent ?? '—'}</dd>
            <dt>Requêtes</dt><dd>{selected.request_count ?? 0}</dd>
            <dt>1ère vue</dt><dd>{fmt(selected.first_seen_at)}</dd>
            <dt>Dernière vue</dt><dd>{fmt(selected.last_seen_at)}</dd>
            {selected.detection_reasons?.length > 0 && (
              <><dt>Raisons</dt><dd>{selected.detection_reasons.join(', ')}</dd></>
            )}
          </dl>
        )}
      </Modal>
    </div>
  );
}

// ─── Sessions ──────────────────────────────────────────────────────────────────

export function SessionsTab() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const [data, setData] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    setErr(false);
    apiService.analyticsSessions(SITE, { page, per_page: PER_PAGE })
      .then(d => setData(Array.isArray(d) ? d : []))
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    if (!loading && data.length === 0 && page > 1) setPage(p => p - 1);
  }, [loading, data, page]);

  // Search within the loaded page (the API has no search).
  const { query, setQuery, filtered } = useSearch(data, SESSION_FIELDS);
  const selection = useRowSelection(filtered, byId);

  if (err) return <EmptyState message={t('tracking.loadError')} />;
  if (loading) return <LoadingState />;

  return (
    <div className="trk-tab">
      {data.length === 0 ? (
        <EmptyState message={t('tracking.noData')} />
      ) : (
        <>
        <TableTools
          query={query}
          onQuery={setQuery}
          selection={selection}
          filename="tracking-sessions"
          columns={[
            ['ID', (s) => s.id],
            [t('tracking.device'), (s) => s.device_type ?? ''],
            ['Navigateur', (s) => s.browser ?? ''],
            [t('tracking.country'), (s) => countryName(s.country)],
            ['Pages', (s) => s.page_count ?? 0],
            [t('tracking.duration'), (s) => dur(s.duration_seconds)],
            ['Rebond', (s) => (s.is_bounce ? 'Oui' : 'Non')],
            ['Landing page', (s) => s.landing_page ?? ''],
            ['Source UTM', (s) => s.utm_source ?? ''],
            ['Début', (s) => fmt(s.started_at)],
          ]}
        />
        <Card className="overflow-hidden gap-0">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <SelectAllTh selection={selection} />
                <DataTableTh>ID</DataTableTh>
                <DataTableTh>{t('tracking.device')}</DataTableTh>
                <DataTableTh>{t('tracking.country')}</DataTableTh>
                <DataTableTh>Pages</DataTableTh>
                <DataTableTh>{t('tracking.duration')}</DataTableTh>
                <DataTableTh>Rebond</DataTableTh>
                <DataTableTh>Début</DataTableTh>
                <DataTableTh>{tc('table.actions')}</DataTableTh>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {filtered.length === 0 && <NoResults query={query} />}
              {filtered.map((s: any) => (
                <DataTableRow key={s.id}>
                  <SelectTd selection={selection} id={byId(s)} />
                  <DataTableTd className="font-mono text-xs">{s.id?.slice(0, 8)}…</DataTableTd>
                  <DataTableTd>{s.device_type ?? '—'}</DataTableTd>
                  <DataTableTd>{countryName(s.country)}</DataTableTd>
                  <DataTableTd>{s.page_count ?? 0}</DataTableTd>
                  <DataTableTd>{dur(s.duration_seconds)}</DataTableTd>
                  <DataTableTd>{s.is_bounce ? 'Oui' : 'Non'}</DataTableTd>
                  <DataTableTd>{fmt(s.started_at)}</DataTableTd>
                  <DataTableTd>
                    <div className="adm-table__actions">
                      <DataTableAction icon={EyeIcon} label={t('tracking.viewDetails')} onClick={() => setSelected(s)} />
                    </div>
                  </DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
          <Pagination
            page={page}
            hasMore={data.length === PER_PAGE}
            onPrev={() => setPage(p => p - 1)}
            onNext={() => setPage(p => p + 1)}
          />
        </Card>
        </>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Détails session" size="md">
        {selected && (
          <dl className="trk-modal-dl">
            <dt>ID</dt><dd className="font-mono text-xs">{selected.id}</dd>
            <dt>Visiteur</dt><dd className="font-mono text-xs">{selected.visitor_id?.slice(0, 12)}…</dd>
            <dt>{t('tracking.device')}</dt><dd>{selected.device_type ?? '—'}</dd>
            <dt>Navigateur</dt><dd>{selected.browser ?? '—'}</dd>
            <dt>{t('tracking.country')}</dt><dd>{countryName(selected.country)}</dd>
            <dt>Pages visitées</dt><dd>{selected.page_count ?? 0}</dd>
            <dt>{t('tracking.duration')}</dt><dd>{dur(selected.duration_seconds)}</dd>
            <dt>Rebond</dt><dd>{selected.is_bounce ? 'Oui' : 'Non'}</dd>
            <dt>Landing page</dt><dd className="break-all">{selected.landing_page ?? '—'}</dd>
            <dt>Source UTM</dt><dd>{selected.utm_source ?? '—'}</dd>
            <dt>Début</dt><dd>{fmt(selected.started_at)}</dd>
          </dl>
        )}
      </Modal>
    </div>
  );
}

// ─── Pages ─────────────────────────────────────────────────────────────────────

const PAGE_ID = (r: any) => String(r.url_path);
const PAGE_FIELDS: Fields = (r) => [r.url_path];

export function PagesTab() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const [data, setData] = useState<any[] | null>(null);
  const [page, setPage] = useState(1);
  const [err, setErr] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    setErr(false);
    apiService.analyticsPages(SITE, { days: 7, limit: 100 })
      .then(setData).catch(() => setErr(true));
  }, []);

  const { query, setQuery, filtered } = useSearch(data, PAGE_FIELDS);
  const slice = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page]);
  const selection = useRowSelection(slice, PAGE_ID);

  if (err) return <EmptyState message={t('tracking.loadError')} />;
  if (!data) return <LoadingState />;

  return (
    <div className="trk-tab">
      {data.length === 0 ? (
        <EmptyState message={t('tracking.noData')} />
      ) : (
        <>
        <TableTools
          query={query}
          onQuery={(value) => { setQuery(value); setPage(1); }}
          selection={selection}
          filename="tracking-pages"
          columns={[
            ['Chemin', (r) => r.url_path],
            ['Vues', (r) => r.views],
            ['Visiteurs uniques', (r) => r.unique_visitors],
            ['Temps moyen (s)', (r) => (r.avg_time_on_page_ms != null ? Math.round(r.avg_time_on_page_ms / 1000) : '')],
          ]}
        />
        <Card className="overflow-hidden gap-0">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <SelectAllTh selection={selection} />
                <DataTableTh>Chemin</DataTableTh>
                <DataTableTh>Vues</DataTableTh>
                <DataTableTh>Visiteurs uniques</DataTableTh>
                <DataTableTh>Temps moyen</DataTableTh>
                <DataTableTh>{tc('table.actions')}</DataTableTh>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {slice.length === 0 && <NoResults query={query} />}
              {slice.map((r: any) => (
                <DataTableRow key={r.url_path}>
                  <SelectTd selection={selection} id={PAGE_ID(r)} />
                  <DataTableTd className="font-mono text-xs">{r.url_path}</DataTableTd>
                  <DataTableTd>{r.views}</DataTableTd>
                  <DataTableTd>{r.unique_visitors}</DataTableTd>
                  <DataTableTd>{r.avg_time_on_page_ms != null ? `${Math.round(r.avg_time_on_page_ms / 1000)}s` : '—'}</DataTableTd>
                  <DataTableTd>
                    <div className="adm-table__actions">
                      <DataTableAction icon={EyeIcon} label={t('tracking.viewDetails')} onClick={() => setSelected(r)} />
                    </div>
                  </DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
          <Pagination
            page={page}
            hasMore={page * PER_PAGE < filtered.length}
            onPrev={() => setPage(p => p - 1)}
            onNext={() => setPage(p => p + 1)}
          />
        </Card>
        </>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Détails page" size="sm">
        {selected && (
          <dl className="trk-modal-dl">
            <dt>Chemin</dt><dd className="font-mono text-xs break-all">{selected.url_path}</dd>
            <dt>Vues</dt><dd>{selected.views}</dd>
            <dt>Visiteurs uniques</dt><dd>{selected.unique_visitors}</dd>
            <dt>Temps moyen</dt><dd>{selected.avg_time_on_page_ms != null ? `${Math.round(selected.avg_time_on_page_ms / 1000)}s` : '—'}</dd>
          </dl>
        )}
      </Modal>
    </div>
  );
}

// ─── Acquisition ───────────────────────────────────────────────────────────────

const REFERRAL_ID = (r: any) => String(r.referrer_domain);
const REFERRAL_FIELDS: Fields = (r) => [r.referrer_domain];

export function AcquisitionTab() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const [referrals, setReferrals] = useState<any[] | null>(null);
  const [page, setPage] = useState(1);
  const [err, setErr] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    setErr(false);
    apiService.analyticsReferrals(SITE, { days: 30, limit: 100 })
      .then(d => setReferrals(Array.isArray(d) ? d : []))
      .catch(() => setErr(true));
  }, []);

  const { query, setQuery, filtered } = useSearch(referrals, REFERRAL_FIELDS);
  const slice = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page]);
  const selection = useRowSelection(slice, REFERRAL_ID);

  if (err) return <EmptyState message={t('tracking.loadError')} />;
  if (!referrals) return <LoadingState />;

  return (
    <div className="trk-tab">
      {referrals.length === 0 ? (
        <EmptyState message={t('tracking.noData')} />
      ) : (
        <>
        <TableTools
          query={query}
          onQuery={(value) => { setQuery(value); setPage(1); }}
          selection={selection}
          filename="tracking-acquisition"
          columns={[['Domaine référent', (r) => r.referrer_domain], ['Sessions', (r) => r.sessions], ['%', (r) => r.pct]]}
        />
        <Card className="overflow-hidden gap-0">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <SelectAllTh selection={selection} />
                <DataTableTh>Domaine référent</DataTableTh>
                <DataTableTh>Sessions</DataTableTh>
                <DataTableTh>%</DataTableTh>
                <DataTableTh>{tc('table.actions')}</DataTableTh>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {slice.length === 0 && <NoResults query={query} />}
              {slice.map((r: any) => (
                <DataTableRow key={r.referrer_domain}>
                  <SelectTd selection={selection} id={REFERRAL_ID(r)} />
                  <DataTableTd>{r.referrer_domain}</DataTableTd>
                  <DataTableTd>{r.sessions}</DataTableTd>
                  <DataTableTd>{r.pct}%</DataTableTd>
                  <DataTableTd>
                    <div className="adm-table__actions">
                      <DataTableAction icon={EyeIcon} label={t('tracking.viewDetails')} onClick={() => setSelected(r)} />
                    </div>
                  </DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
          <Pagination
            page={page}
            hasMore={page * PER_PAGE < filtered.length}
            onPrev={() => setPage(p => p - 1)}
            onNext={() => setPage(p => p + 1)}
          />
        </Card>
        </>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Détails référent" size="sm">
        {selected && (
          <dl className="trk-modal-dl">
            <dt>Domaine</dt><dd>{selected.referrer_domain}</dd>
            <dt>Sessions</dt><dd>{selected.sessions}</dd>
            <dt>Part</dt><dd>{selected.pct}%</dd>
          </dl>
        )}
      </Modal>
    </div>
  );
}

// ─── Consentements ─────────────────────────────────────────────────────────────

const CONSENT_FIELDS: Fields = (c) => [c.id, c.visitor_id, c.consent_level];

export function ConsentsTab() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    setErr(false);
    apiService.consentAdmin(SITE, { page, per_page: PER_PAGE })
      .then(setData)
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, [page]);

  const items: any[] = data?.items ?? [];

  useEffect(() => {
    if (!loading && items.length === 0 && page > 1) setPage(p => p - 1);
  }, [loading, items, page]);

  // Search within the loaded page (the API has no search).
  const { query, setQuery, filtered } = useSearch(data?.items, CONSENT_FIELDS);
  const selection = useRowSelection(filtered, byId);

  if (err) return <EmptyState message={t('tracking.loadError')} />;
  if (loading) return <LoadingState />;

  return (
    <div className="trk-tab space-y-4">

      {items.length === 0 ? (
        <EmptyState message={t('tracking.noData')} />
      ) : (
        <>
        <TableTools
          query={query}
          onQuery={setQuery}
          selection={selection}
          filename="tracking-consentements"
          columns={[
            ['ID', (c) => c.id],
            ['Visiteur', (c) => c.visitor_id],
            ['Niveau', (c) => c.consent_level],
            ['Analytics', (c) => (c.analytics ? 'Oui' : 'Non')],
            ['Marketing', (c) => (c.marketing ? 'Oui' : 'Non')],
            ['Consenti le', (c) => fmt(c.consented_at)],
            ['Retiré le', (c) => (c.withdrawn_at ? fmt(c.withdrawn_at) : '')],
          ]}
        />
        <Card className="overflow-hidden gap-0">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <SelectAllTh selection={selection} />
                <DataTableTh>Visiteur</DataTableTh>
                <DataTableTh>Niveau</DataTableTh>
                <DataTableTh>Analytics</DataTableTh>
                <DataTableTh>Marketing</DataTableTh>
                <DataTableTh>Consenti le</DataTableTh>
                <DataTableTh>Retiré</DataTableTh>
                <DataTableTh>{tc('table.actions')}</DataTableTh>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {filtered.length === 0 && <NoResults query={query} />}
              {filtered.map((c: any) => (
                <DataTableRow key={c.id} className={c.withdrawn_at ? 'opacity-50' : ''}>
                  <SelectTd selection={selection} id={byId(c)} />
                  <DataTableTd className="font-mono text-xs">{c.visitor_id}</DataTableTd>
                  <DataTableTd>{c.consent_level}</DataTableTd>
                  <DataTableTd>{c.analytics ? '✓' : '—'}</DataTableTd>
                  <DataTableTd>{c.marketing ? '✓' : '—'}</DataTableTd>
                  <DataTableTd>{fmt(c.consented_at)}</DataTableTd>
                  <DataTableTd>{c.withdrawn_at ? fmt(c.withdrawn_at) : '—'}</DataTableTd>
                  <DataTableTd>
                    <div className="adm-table__actions">
                      <DataTableAction icon={EyeIcon} label={t('tracking.viewDetails')} onClick={() => setSelected(c)} />
                    </div>
                  </DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
          <Pagination
            page={page}
            hasMore={items.length === PER_PAGE}
            onPrev={() => setPage(p => p - 1)}
            onNext={() => setPage(p => p + 1)}
          />
        </Card>
        </>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Détails consentement" size="sm">
        {selected && (
          <dl className="trk-modal-dl">
            <dt>ID</dt><dd className="font-mono text-xs">{selected.id}</dd>
            <dt>Visiteur</dt><dd className="font-mono text-xs">{selected.visitor_id}</dd>
            <dt>Niveau</dt><dd>{selected.consent_level}</dd>
            <dt>Analytics</dt><dd>{selected.analytics ? 'Oui' : 'Non'}</dd>
            <dt>Marketing</dt><dd>{selected.marketing ? 'Oui' : 'Non'}</dd>
            <dt>Consenti le</dt><dd>{fmt(selected.consented_at)}</dd>
            <dt>Retiré le</dt><dd>{selected.withdrawn_at ? fmt(selected.withdrawn_at) : '—'}</dd>
          </dl>
        )}
      </Modal>
    </div>
  );
}
