/**
 * TrackingTabs — sub-tab components for the Cookies & consentement page.
 * Each tab handles its own data fetching, pagination and detail modal.
 */
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiService } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/common/Modal';
import { DataTable, DataTableHead, DataTableBody, DataTableRow, DataTableTh, DataTableTd, DataTableEmpty } from '@/components/common/DataTable';
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

function fmt(date: string | null | undefined) {
  if (!date) return '—';
  return new Date(date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function dur(s: number | null | undefined) {
  if (s == null) return '—';
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m${s % 60}s`;
}

// ─── Géographie ────────────────────────────────────────────────────────────────

export function GeoTab() {
  const { t } = useTranslation('admin');
  const [data, setData] = useState<any[] | null>(null);
  const [page, setPage] = useState(1);
  const [err, setErr] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    setErr(false);
    apiService.analyticsGeo(SITE, { days: 30, limit: 200 })
      .then(setData).catch(() => setErr(true));
  }, []);

  if (err) return <EmptyState message={t('tracking.loadError')} />;
  if (!data) return <LoadingState />;

  const slice = data.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="trk-tab">
      {data.length === 0 ? (
        <EmptyState message={t('tracking.noData')} />
      ) : (
        <Card className="overflow-hidden">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableTh>Code</DataTableTh>
                <DataTableTh>{t('tracking.country')}</DataTableTh>
                <DataTableTh>Sessions</DataTableTh>
                <DataTableTh>%</DataTableTh>
                <DataTableTh></DataTableTh>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {slice.map((r: any) => (
                <DataTableRow key={r.country ?? r.country_name}>
                  <DataTableTd className="font-mono text-xs">{r.country ?? '—'}</DataTableTd>
                  <DataTableTd>{r.country_name ?? r.country ?? '—'}</DataTableTd>
                  <DataTableTd>{r.sessions}</DataTableTd>
                  <DataTableTd>{r.pct}%</DataTableTd>
                  <DataTableTd>
                    <div className="adm-table__actions">
                      <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" onClick={() => setSelected(r)} title={t('tracking.viewDetails')}>
                        <EyeIcon size={13} />
                      </button>
                    </div>
                  </DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
          <Pagination
            page={page}
            hasMore={page * PER_PAGE < data.length}
            onPrev={() => setPage(p => p - 1)}
            onNext={() => setPage(p => p + 1)}
          />
        </Card>
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

export function RealtimeTab() {
  const { t } = useTranslation('admin');
  const [sessions, setSessions] = useState<any[]>([]);
  const [err, setErr] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const reload = useCallback(() => {
    setErr(false);
    apiService.analyticsSessions(SITE, { page: 1, per_page: 10 })
      .then(d => setSessions(Array.isArray(d) ? d : d.items ?? []))
      .catch(() => setErr(true));
  }, []);

  useEffect(() => {
    reload();
    const id = setInterval(reload, 15_000);
    return () => clearInterval(id);
  }, [reload]);

  if (err) return <EmptyState message={t('tracking.loadError')} />;

  return (
    <div className="trk-tab">
      {sessions.length === 0 ? (
        <EmptyState message={t('tracking.noData')} />
      ) : (
        <Card className="overflow-hidden">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableTh>{t('tracking.device')}</DataTableTh>
                <DataTableTh>{t('tracking.country')}</DataTableTh>
                <DataTableTh>{t('tracking.duration')}</DataTableTh>
                <DataTableTh>Début</DataTableTh>
                <DataTableTh></DataTableTh>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {sessions.map((s: any) => (
                <DataTableRow key={s.id}>
                  <DataTableTd>{s.device_type ?? '—'}</DataTableTd>
                  <DataTableTd>{s.country ?? '—'}</DataTableTd>
                  <DataTableTd>{dur(s.duration_seconds)}</DataTableTd>
                  <DataTableTd className="text-xs">{fmt(s.started_at)}</DataTableTd>
                  <DataTableTd>
                    <div className="adm-table__actions">
                      <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" onClick={() => setSelected(s)} title={t('tracking.viewDetails')}>
                        <EyeIcon size={13} />
                      </button>
                    </div>
                  </DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </Card>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Détails session" size="sm">
        {selected && (
          <dl className="trk-modal-dl">
            <dt>{t('tracking.device')}</dt><dd>{selected.device_type ?? '—'}</dd>
            <dt>{t('tracking.country')}</dt><dd>{selected.country ?? '—'}</dd>
            <dt>{t('tracking.duration')}</dt><dd>{dur(selected.duration_seconds)}</dd>
            <dt>Début</dt><dd>{fmt(selected.started_at)}</dd>
          </dl>
        )}
      </Modal>
    </div>
  );
}

// ─── Visiteurs ─────────────────────────────────────────────────────────────────

export function VisitorsTab() {
  const { t } = useTranslation('admin');
  const [data, setData] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    setErr(false);
    apiService.analyticsVisitors(SITE, { page, per_page: PER_PAGE })
      .then(d => setData(Array.isArray(d) ? d : []))
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, [page]);

  if (err) return <EmptyState message={t('tracking.loadError')} />;
  if (loading) return <LoadingState />;

  return (
    <div className="trk-tab">
      {data.length === 0 ? (
        <EmptyState message={t('tracking.noData')} />
      ) : (
        <Card className="overflow-hidden">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableTh>ID</DataTableTh>
                <DataTableTh>1ère visite</DataTableTh>
                <DataTableTh>Dernière visite</DataTableTh>
                <DataTableTh>Visites</DataTableTh>
                <DataTableTh>{t('tracking.country')}</DataTableTh>
                <DataTableTh>{t('tracking.device')}</DataTableTh>
                <DataTableTh></DataTableTh>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {data.map((v: any) => (
                <DataTableRow key={v.id}>
                  <DataTableTd className="font-mono text-xs">{v.fingerprint_id}</DataTableTd>
                  <DataTableTd className="text-xs">{fmt(v.first_seen_at)}</DataTableTd>
                  <DataTableTd className="text-xs">{fmt(v.last_seen_at)}</DataTableTd>
                  <DataTableTd>{v.visit_count}</DataTableTd>
                  <DataTableTd>{v.country ?? '—'}</DataTableTd>
                  <DataTableTd>{v.device_type ?? '—'}</DataTableTd>
                  <DataTableTd>
                    <div className="adm-table__actions">
                      <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" onClick={() => setSelected(v)} title={t('tracking.viewDetails')}>
                        <EyeIcon size={13} />
                      </button>
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
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Détails visiteur" size="md">
        {selected && (
          <dl className="trk-modal-dl">
            <dt>ID</dt><dd className="font-mono">{selected.fingerprint_id}</dd>
            <dt>1ère visite</dt><dd>{fmt(selected.first_seen_at)}</dd>
            <dt>Dernière visite</dt><dd>{fmt(selected.last_seen_at)}</dd>
            <dt>Nb visites</dt><dd>{selected.visit_count}</dd>
            <dt>{t('tracking.country')}</dt><dd>{selected.country ?? '—'}</dd>
            <dt>{t('tracking.device')}</dt><dd>{selected.device_type ?? '—'}</dd>
            <dt>Navigateur</dt><dd>{selected.browser ?? '—'}</dd>
            <dt>Bot</dt><dd>{selected.is_bot ? 'Oui' : 'Non'}</dd>
          </dl>
        )}
      </Modal>
    </div>
  );
}

// ─── Bots ──────────────────────────────────────────────────────────────────────

export function BotsTab() {
  const { t } = useTranslation('admin');
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

  if (err) return <EmptyState message={t('tracking.loadError')} />;
  if (loading) return <LoadingState />;

  return (
    <div className="trk-tab space-y-4">
      {visits.length === 0 ? (
        <EmptyState message={t('tracking.noData')} />
      ) : (
        <Card className="overflow-hidden">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableTh>IP</DataTableTh>
                <DataTableTh>Type</DataTableTh>
                <DataTableTh>Score</DataTableTh>
                <DataTableTh>{t('tracking.country')}</DataTableTh>
                <DataTableTh>Requêtes</DataTableTh>
                <DataTableTh>Dernière vue</DataTableTh>
                <DataTableTh></DataTableTh>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {visits.map((v: any) => (
                <DataTableRow key={v.id}>
                  <DataTableTd className="font-mono text-xs">{v.ip_address ?? '—'}</DataTableTd>
                  <DataTableTd>{v.bot_type ?? '—'}</DataTableTd>
                  <DataTableTd>{v.confidence_score != null ? `${v.confidence_score}%` : '—'}</DataTableTd>
                  <DataTableTd>{v.country ?? '—'}</DataTableTd>
                  <DataTableTd>{v.request_count ?? 0}</DataTableTd>
                  <DataTableTd className="text-xs">{fmt(v.last_seen_at)}</DataTableTd>
                  <DataTableTd>
                    <div className="adm-table__actions">
                      <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" onClick={() => setSelected(v)} title={t('tracking.viewDetails')}>
                        <EyeIcon size={13} />
                      </button>
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
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Détails bot" size="md">
        {selected && (
          <dl className="trk-modal-dl">
            <dt>IP</dt><dd className="font-mono">{selected.ip_address}</dd>
            <dt>Type</dt><dd>{selected.bot_type ?? '—'}</dd>
            <dt>Score</dt><dd>{selected.confidence_score != null ? `${selected.confidence_score}%` : '—'}</dd>
            <dt>ISP</dt><dd>{selected.isp ?? '—'}</dd>
            <dt>{t('tracking.country')}</dt><dd>{selected.country ?? '—'}</dd>
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

  if (err) return <EmptyState message={t('tracking.loadError')} />;
  if (loading) return <LoadingState />;

  return (
    <div className="trk-tab">
      {data.length === 0 ? (
        <EmptyState message={t('tracking.noData')} />
      ) : (
        <Card className="overflow-hidden">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableTh>ID</DataTableTh>
                <DataTableTh>{t('tracking.device')}</DataTableTh>
                <DataTableTh>{t('tracking.country')}</DataTableTh>
                <DataTableTh>Pages</DataTableTh>
                <DataTableTh>{t('tracking.duration')}</DataTableTh>
                <DataTableTh>Rebond</DataTableTh>
                <DataTableTh>Début</DataTableTh>
                <DataTableTh></DataTableTh>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {data.map((s: any) => (
                <DataTableRow key={s.id}>
                  <DataTableTd className="font-mono text-xs">{s.id?.slice(0, 8)}…</DataTableTd>
                  <DataTableTd>{s.device_type ?? '—'}</DataTableTd>
                  <DataTableTd>{s.country ?? '—'}</DataTableTd>
                  <DataTableTd>{s.page_count ?? 0}</DataTableTd>
                  <DataTableTd>{dur(s.duration_seconds)}</DataTableTd>
                  <DataTableTd>{s.is_bounce ? 'Oui' : 'Non'}</DataTableTd>
                  <DataTableTd className="text-xs">{fmt(s.started_at)}</DataTableTd>
                  <DataTableTd>
                    <div className="adm-table__actions">
                      <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" onClick={() => setSelected(s)} title={t('tracking.viewDetails')}>
                        <EyeIcon size={13} />
                      </button>
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
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Détails session" size="md">
        {selected && (
          <dl className="trk-modal-dl">
            <dt>ID</dt><dd className="font-mono text-xs">{selected.id}</dd>
            <dt>Visiteur</dt><dd className="font-mono text-xs">{selected.visitor_id?.slice(0, 12)}…</dd>
            <dt>{t('tracking.device')}</dt><dd>{selected.device_type ?? '—'}</dd>
            <dt>Navigateur</dt><dd>{selected.browser ?? '—'}</dd>
            <dt>{t('tracking.country')}</dt><dd>{selected.country ?? '—'}</dd>
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

export function PagesTab() {
  const { t } = useTranslation('admin');
  const [data, setData] = useState<any[] | null>(null);
  const [page, setPage] = useState(1);
  const [err, setErr] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    setErr(false);
    apiService.analyticsPages(SITE, { days: 7, limit: 100 })
      .then(setData).catch(() => setErr(true));
  }, []);

  if (err) return <EmptyState message={t('tracking.loadError')} />;
  if (!data) return <LoadingState />;

  const slice = data.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="trk-tab">
      {data.length === 0 ? (
        <EmptyState message={t('tracking.noData')} />
      ) : (
        <Card className="overflow-hidden">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableTh>Chemin</DataTableTh>
                <DataTableTh>Vues</DataTableTh>
                <DataTableTh>Visiteurs uniques</DataTableTh>
                <DataTableTh>Temps moyen</DataTableTh>
                <DataTableTh></DataTableTh>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {slice.map((r: any) => (
                <DataTableRow key={r.url_path}>
                  <DataTableTd className="font-mono text-xs">{r.url_path}</DataTableTd>
                  <DataTableTd>{r.views}</DataTableTd>
                  <DataTableTd>{r.unique_visitors}</DataTableTd>
                  <DataTableTd>{r.avg_time_on_page_ms != null ? `${Math.round(r.avg_time_on_page_ms / 1000)}s` : '—'}</DataTableTd>
                  <DataTableTd>
                    <div className="adm-table__actions">
                      <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" onClick={() => setSelected(r)} title={t('tracking.viewDetails')}>
                        <EyeIcon size={13} />
                      </button>
                    </div>
                  </DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
          <Pagination
            page={page}
            hasMore={page * PER_PAGE < data.length}
            onPrev={() => setPage(p => p - 1)}
            onNext={() => setPage(p => p + 1)}
          />
        </Card>
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

export function AcquisitionTab() {
  const { t } = useTranslation('admin');
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

  if (err) return <EmptyState message={t('tracking.loadError')} />;
  if (!referrals) return <LoadingState />;

  const slice = referrals.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="trk-tab">
      {referrals.length === 0 ? (
        <EmptyState message={t('tracking.noData')} />
      ) : (
        <Card className="overflow-hidden">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableTh>Domaine référent</DataTableTh>
                <DataTableTh>Sessions</DataTableTh>
                <DataTableTh>%</DataTableTh>
                <DataTableTh></DataTableTh>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {slice.map((r: any) => (
                <DataTableRow key={r.referrer_domain}>
                  <DataTableTd>{r.referrer_domain}</DataTableTd>
                  <DataTableTd>{r.sessions}</DataTableTd>
                  <DataTableTd>{r.pct}%</DataTableTd>
                  <DataTableTd>
                    <div className="adm-table__actions">
                      <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" onClick={() => setSelected(r)} title={t('tracking.viewDetails')}>
                        <EyeIcon size={13} />
                      </button>
                    </div>
                  </DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
          <Pagination
            page={page}
            hasMore={page * PER_PAGE < referrals.length}
            onPrev={() => setPage(p => p - 1)}
            onNext={() => setPage(p => p + 1)}
          />
        </Card>
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

export function ConsentsTab() {
  const { t } = useTranslation('admin');
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

  if (err) return <EmptyState message={t('tracking.loadError')} />;
  if (loading) return <LoadingState />;

  const items: any[] = data?.items ?? [];

  return (
    <div className="trk-tab space-y-4">

      {items.length === 0 ? (
        <EmptyState message={t('tracking.noData')} />
      ) : (
        <Card className="overflow-hidden">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableTh>Visiteur</DataTableTh>
                <DataTableTh>Niveau</DataTableTh>
                <DataTableTh>Analytics</DataTableTh>
                <DataTableTh>Marketing</DataTableTh>
                <DataTableTh>Consenti le</DataTableTh>
                <DataTableTh>Retiré</DataTableTh>
                <DataTableTh></DataTableTh>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {items.map((c: any) => (
                <DataTableRow key={c.id} className={c.withdrawn_at ? 'opacity-50' : ''}>
                  <DataTableTd className="font-mono text-xs">{c.visitor_id}</DataTableTd>
                  <DataTableTd>{c.consent_level}</DataTableTd>
                  <DataTableTd>{c.analytics ? '✓' : '—'}</DataTableTd>
                  <DataTableTd>{c.marketing ? '✓' : '—'}</DataTableTd>
                  <DataTableTd className="text-xs">{fmt(c.consented_at)}</DataTableTd>
                  <DataTableTd className="text-xs">{c.withdrawn_at ? fmt(c.withdrawn_at) : '—'}</DataTableTd>
                  <DataTableTd>
                    <div className="adm-table__actions">
                      <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" onClick={() => setSelected(c)} title={t('tracking.viewDetails')}>
                        <EyeIcon size={13} />
                      </button>
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
