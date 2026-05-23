/**
 * TrackingTabs — sub-tab components for the Cookies & consentement page.
 * Each tab handles its own data fetching, pagination and detail modal.
 */
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiService } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/common/Modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeftIcon, ChevronRightIcon } from '@icons';

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>{t('tracking.country')}</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slice.map((r: any) => (
                <TableRow key={r.country ?? r.country_name}>
                  <TableCell className="font-mono text-xs">{r.country ?? '—'}</TableCell>
                  <TableCell>{r.country_name ?? r.country ?? '—'}</TableCell>
                  <TableCell>{r.sessions}</TableCell>
                  <TableCell>{r.pct}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={page}
            hasMore={page * PER_PAGE < data.length}
            onPrev={() => setPage(p => p - 1)}
            onNext={() => setPage(p => p + 1)}
          />
        </Card>
      )}
    </div>
  );
}

// ─── Temps réel ────────────────────────────────────────────────────────────────

export function RealtimeTab() {
  const { t } = useTranslation('admin');
  const [overview, setOverview] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [err, setErr] = useState(false);

  const reload = useCallback(() => {
    setErr(false);
    Promise.all([
      apiService.analyticsOverview(SITE),
      apiService.analyticsSessions(SITE, { page: 1, per_page: 10 }),
    ]).then(([ov, sess]) => {
      setOverview(ov);
      setSessions(Array.isArray(sess) ? sess : sess.items ?? []);
    }).catch(() => setErr(true));
  }, []);

  useEffect(() => {
    reload();
    const id = setInterval(reload, 15_000);
    return () => clearInterval(id);
  }, [reload]);

  if (err) return <EmptyState message={t('tracking.loadError')} />;
  if (!overview) return <LoadingState />;

  return (
    <div className="trk-tab space-y-4">
      <div className="trk-kpi-row">
        <Card className="trk-kpi-card">
          <p className="trk-kpi-label">{t('tracking.activeNow')}</p>
          <p className="trk-kpi-value trk-kpi-value--accent">{overview.realtime_active ?? 0}</p>
        </Card>
        <Card className="trk-kpi-card">
          <p className="trk-kpi-label">{t('tracking.visitorsToday')}</p>
          <p className="trk-kpi-value">{overview.visitors_today ?? 0}</p>
        </Card>
        <Card className="trk-kpi-card">
          <p className="trk-kpi-label">{t('tracking.sessionsToday')}</p>
          <p className="trk-kpi-value">{overview.sessions_today ?? 0}</p>
        </Card>
        <Card className="trk-kpi-card">
          <p className="trk-kpi-label">{t('tracking.pageviewsToday')}</p>
          <p className="trk-kpi-value">{overview.pageviews_today ?? 0}</p>
        </Card>
      </div>

      {sessions.length === 0 ? (
        <EmptyState message={t('tracking.noData')} />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('tracking.device')}</TableHead>
                <TableHead>{t('tracking.country')}</TableHead>
                <TableHead>{t('tracking.duration')}</TableHead>
                <TableHead>Début</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell>{s.device_type ?? '—'}</TableCell>
                  <TableCell>{s.country ?? '—'}</TableCell>
                  <TableCell>{dur(s.duration_seconds)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmt(s.started_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>1ère visite</TableHead>
                <TableHead>Dernière visite</TableHead>
                <TableHead>Visites</TableHead>
                <TableHead>{t('tracking.country')}</TableHead>
                <TableHead>{t('tracking.device')}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-xs">{v.fingerprint_id}</TableCell>
                  <TableCell className="text-xs">{fmt(v.first_seen_at)}</TableCell>
                  <TableCell className="text-xs">{fmt(v.last_seen_at)}</TableCell>
                  <TableCell>{v.visit_count}</TableCell>
                  <TableCell>{v.country ?? '—'}</TableCell>
                  <TableCell>{v.device_type ?? '—'}</TableCell>
                  <TableCell>
                    <button className="trk-detail-btn" onClick={() => setSelected(v)}>
                      {t('tracking.viewDetails')}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
      {overview && (
        <div className="trk-kpi-row">
          <Card className="trk-kpi-card">
            <p className="trk-kpi-label">Total bots</p>
            <p className="trk-kpi-value">{overview.total_bot_visits ?? 0}</p>
          </Card>
          <Card className="trk-kpi-card">
            <p className="trk-kpi-label">IPs uniques</p>
            <p className="trk-kpi-value">{overview.unique_bot_ips ?? 0}</p>
          </Card>
          <Card className="trk-kpi-card">
            <p className="trk-kpi-label">Aujourd'hui</p>
            <p className="trk-kpi-value">{overview.bot_visits_today ?? 0}</p>
          </Card>
        </div>
      )}

      {visits.length === 0 ? (
        <EmptyState message={t('tracking.noData')} />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IP</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>{t('tracking.country')}</TableHead>
                <TableHead>Requêtes</TableHead>
                <TableHead>Dernière vue</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visits.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-xs">{v.ip_address ?? '—'}</TableCell>
                  <TableCell>{v.bot_type ?? '—'}</TableCell>
                  <TableCell>{v.confidence_score != null ? `${v.confidence_score}%` : '—'}</TableCell>
                  <TableCell>{v.country ?? '—'}</TableCell>
                  <TableCell>{v.request_count ?? 0}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmt(v.last_seen_at)}</TableCell>
                  <TableCell>
                    <button className="trk-detail-btn" onClick={() => setSelected(v)}>
                      {t('tracking.viewDetails')}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>{t('tracking.device')}</TableHead>
                <TableHead>{t('tracking.country')}</TableHead>
                <TableHead>Pages</TableHead>
                <TableHead>{t('tracking.duration')}</TableHead>
                <TableHead>Rebond</TableHead>
                <TableHead>Début</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.id?.slice(0, 8)}…</TableCell>
                  <TableCell>{s.device_type ?? '—'}</TableCell>
                  <TableCell>{s.country ?? '—'}</TableCell>
                  <TableCell>{s.page_count ?? 0}</TableCell>
                  <TableCell>{dur(s.duration_seconds)}</TableCell>
                  <TableCell>{s.is_bounce ? 'Oui' : 'Non'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmt(s.started_at)}</TableCell>
                  <TableCell>
                    <button className="trk-detail-btn" onClick={() => setSelected(s)}>
                      {t('tracking.viewDetails')}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

  useEffect(() => {
    setErr(false);
    apiService.analyticsPages(SITE, { days: 7, limit: 200 })
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chemin</TableHead>
                <TableHead>Vues</TableHead>
                <TableHead>Visiteurs uniques</TableHead>
                <TableHead>Temps moyen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slice.map((r: any) => (
                <TableRow key={r.url_path}>
                  <TableCell className="font-mono text-xs max-w-xs truncate">{r.url_path}</TableCell>
                  <TableCell>{r.views}</TableCell>
                  <TableCell>{r.unique_visitors}</TableCell>
                  <TableCell>{r.avg_time_on_page_ms != null ? `${Math.round(r.avg_time_on_page_ms / 1000)}s` : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={page}
            hasMore={page * PER_PAGE < data.length}
            onPrev={() => setPage(p => p - 1)}
            onNext={() => setPage(p => p + 1)}
          />
        </Card>
      )}
    </div>
  );
}

// ─── Acquisition ───────────────────────────────────────────────────────────────

export function AcquisitionTab() {
  const { t } = useTranslation('admin');
  const [referrals, setReferrals] = useState<any[] | null>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [err, setErr] = useState(false);

  useEffect(() => {
    setErr(false);
    Promise.all([
      apiService.analyticsReferrals(SITE, { days: 30, limit: 200 }),
      apiService.analyticsDevices(SITE, { days: 30 }),
    ]).then(([ref, dev]) => {
      setReferrals(Array.isArray(ref) ? ref : []);
      setDevices(Array.isArray(dev) ? dev : []);
    }).catch(() => setErr(true));
  }, []);

  if (err) return <EmptyState message={t('tracking.loadError')} />;
  if (!referrals) return <LoadingState />;

  const slice = referrals.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="trk-tab space-y-6">
      {devices.length > 0 && (
        <div className="trk-kpi-row">
          {devices.map((d: any) => (
            <Card key={d.device_type} className="trk-kpi-card">
              <p className="trk-kpi-label">{d.device_type}</p>
              <p className="trk-kpi-value">{d.pct}%</p>
            </Card>
          ))}
        </div>
      )}

      <h3 className="text-sm font-medium text-foreground">Référents</h3>

      {referrals.length === 0 ? (
        <EmptyState message={t('tracking.noData')} />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domaine référent</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slice.map((r: any) => (
                <TableRow key={r.referrer_domain}>
                  <TableCell>{r.referrer_domain}</TableCell>
                  <TableCell>{r.sessions}</TableCell>
                  <TableCell>{r.pct}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={page}
            hasMore={page * PER_PAGE < referrals.length}
            onPrev={() => setPage(p => p - 1)}
            onNext={() => setPage(p => p + 1)}
          />
        </Card>
      )}
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
  const byLevel: Record<string, number> = data?.by_level ?? {};

  return (
    <div className="trk-tab space-y-4">
      {Object.keys(byLevel).length > 0 && (
        <div className="trk-kpi-row">
          {Object.entries(byLevel).map(([level, count]) => (
            <Card key={level} className="trk-kpi-card">
              <p className="trk-kpi-label">{level}</p>
              <p className="trk-kpi-value">{count as number}</p>
            </Card>
          ))}
          <Card className="trk-kpi-card">
            <p className="trk-kpi-label">Total actifs</p>
            <p className="trk-kpi-value">{data?.total ?? 0}</p>
          </Card>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState message={t('tracking.noData')} />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Visiteur</TableHead>
                <TableHead>Niveau</TableHead>
                <TableHead>Analytics</TableHead>
                <TableHead>Marketing</TableHead>
                <TableHead>Consenti le</TableHead>
                <TableHead>Retiré</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c: any) => (
                <TableRow key={c.id} className={c.withdrawn_at ? 'opacity-50' : ''}>
                  <TableCell className="font-mono text-xs">{c.visitor_id}</TableCell>
                  <TableCell>{c.consent_level}</TableCell>
                  <TableCell>{c.analytics ? '✓' : '—'}</TableCell>
                  <TableCell>{c.marketing ? '✓' : '—'}</TableCell>
                  <TableCell className="text-xs">{fmt(c.consented_at)}</TableCell>
                  <TableCell className="text-xs">{c.withdrawn_at ? fmt(c.withdrawn_at) : '—'}</TableCell>
                  <TableCell>
                    <button className="trk-detail-btn" onClick={() => setSelected(c)}>
                      {t('tracking.viewDetails')}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
