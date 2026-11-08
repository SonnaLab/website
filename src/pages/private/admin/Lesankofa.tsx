import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { apiService } from '@/services/api';
import { Modal } from '@/components/common/Modal';
import { StepperModal } from '@/components/common/StepperModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/common/Tabs';
import { PageHeader } from '@/components/private/common/PageHeader';
import { StatCard, StatRow } from '@/components/private/common/StatRow';
import {
  DataTable, DataTableAction, DataTableBody, DataTableEmpty, DataTableHead, DataTableRow, DataTableSearch, DataTableSelectionBar,
  DataTableSelectTd, DataTableSelectTh, DataTableTd, DataTableTh, DataTableToolbar, exportRowsCsv, filterRows, useRowSelection,
} from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import {
  DSV_TABS, DsvClientSelect, DsvStatRow, DsvTabPanel, isDsvTab, useDsvState,
} from './lesankofa-dsv/LesankofaDsv';
import { SchemaTab } from './lesankofa-dsv/SchemaTab';

import {
  BrainIcon,
  EyeIcon,
  PenLineIcon,
  RefreshCwIcon,
  ZapIcon,
  LayersIcon,
  UsersIcon,
  ServerIcon,
  TrendingUpIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  XCircleIcon,
  ChevronDownIcon,
  CalendarDaysIcon,
  GlobeIcon,
  TargetIcon,
  FileTextIcon,
  MegaphoneIcon,
  MegaphoneOffIcon,
  ClipboardListIcon,
  SearchIcon,
} from '@icons';

// ─────────────────────────────────────────────
// Additional types
// ─────────────────────────────────────────────

interface LesankofaEvent {
  id: string;
  event_type: string;   // 'task_run' | 'article_generated' | 'push_success' | 'push_failed'
  client_id: string | null;
  entity_type: string | null;
  entity_name: string | null;
  status: string | null;
  meta: Record<string, unknown> | null;
  created_at: string | null;
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface AIModelRow {
  id: number;
  name: string;
  provider: string;
  model_identifier: string;
  tier: string;
  priority: number;
  is_active: boolean;
  is_available: boolean;
  requests_today: number;
  tokens_today: number;
  quota_remaining: number | null;
  max_tokens_per_request: number | null;
}

interface AIStatsRow {
  total_models: number;
  active_models: number;
  available_models: number;
  total_requests_today: number;
  total_tokens_today: number;
}

interface AIClientRow {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  articles_total: number;
  articles_success: number;
  articles_failed: number;
  articles_pending: number;
  daily_generation_capacity: number;
  last_generation: string | null;
}

// 3 paliers exposés côté admin — miroir de DAILY_GENERATION_CAPACITY_TIERS
// (src/models/client.py, ai.sonnalab.com). Fixés le 2026-08-05.
const CAPACITY_TIERS = [
  { value: 4,  label: 'Faible — 4/jour' },
  { value: 5,  label: 'Standard — 5/jour' },
  { value: 10, label: 'Élevée — 10/jour' },
] as const;

interface AIClientDetail extends AIClientRow {
  tagline?: string;
  description_short?: string;
  industry?: string;
  website_url?: string;
  primary_locale?: string;
  languages?: string[];
  geographic_zones?: string[];
  tone_of_voice?: string;
  objectives?: string[];
  target_audience?: Array<{ persona: string; pain_points?: string[] }>;
  content_pillars?: string[];
  brand_keywords?: string[];
  competitor_keywords?: string[];
  key_features?: string[];
  integrations?: string[];
  pricing_tiers?: Array<{ name: string; price: number; currency?: string; billing?: string }>;
  push_endpoint?: string;
  created_at?: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fr', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

function fmtDateShort(iso?: string | null) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fr', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
}

function StatusBadgeLocal({ status }: { status: string }) {
  const map: Record<string, { variant: 'default' | 'destructive' | 'outline' | 'secondary'; label: string }> = {
    running: { variant: 'default',     label: 'En cours'   },
    idle:    { variant: 'secondary',   label: 'Idle'       },
    error:   { variant: 'destructive', label: 'Erreur'     },
    active:  { variant: 'default',     label: 'Actif'      },
    paused:  { variant: 'outline',     label: 'Pausé'      },
  };
  const m = map[status] ?? { variant: 'outline' as const, label: status };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

// ─────────────────────────────────────────────
// Overview Tab
// ─────────────────────────────────────────────

const MODEL_PER_PAGE = 10;

// ─────────────────────────────────────────────
// Overview Tab (KPIs only)
// ─────────────────────────────────────────────

/** The page's stat row figures (models, today's requests and tokens, active clients). */
function useLesankofaOverview() {
  const [stats,       setStats]       = useState<AIStatsRow | null>(null);
  const [clientCount, setClientCount] = useState<number | null>(null);
  const [error,       setError]       = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiService.adminLesankofaModelStats(),
      apiService.adminLesankofaClients().catch(() => null),
    ])
      .then(([s, c]) => {
        setStats(s);
        const clients: AIClientRow[] = c?.clients ?? c ?? [];
        setClientCount(clients.filter((cl: AIClientRow) => cl.is_active).length);
      })
      .catch(e => setError(e.message));
  }, []);

  return { stats, clientCount, error };
}

function OverviewTab({ error }: { error: string | null }) {
  return (
    <div className="space-y-6">
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
          Erreur API AI : {error}
        </p>
      )}

      <RecentActivityCard />
    </div>
  );
}

// ─────────────────────────────────────────────
// Recent Activity Card
// ─────────────────────────────────────────────

// Humanize technical Celery task names into readable French labels.
const TASK_LABELS: Record<string, string> = {
  generate_due_articles_task: 'Génération d’articles',
  retry_failed_pushes_task:   'Relance des pushs échoués',
  refresh_search_trends_task: 'Rafraîchissement des tendances',
  cleanup_old_data_task:      'Nettoyage des données',
};

function humanizeTask(name?: string | null): string {
  if (!name) return 'Tâche';
  if (TASK_LABELS[name]) return TASK_LABELS[name];
  // Fallback: strip _task suffix, replace underscores, capitalize.
  const cleaned = name.replace(/_task$/, '').replace(/_/g, ' ').trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

// Primary label for an event (no client — that's shown as a separate pill).
function eventLabel(e: LesankofaEvent): string {
  switch (e.event_type) {
    case 'task_run':          return humanizeTask(e.entity_name);
    case 'article_generated': return e.entity_name ? `Article — ${e.entity_name}` : 'Article généré';
    case 'push_success':      return e.entity_name ? `Push — ${e.entity_name}`    : 'Push réussi';
    case 'push_failed':       return e.entity_name ? `Push — ${e.entity_name}`    : 'Push échoué';
    default:                  return e.entity_name ?? e.event_type;
  }
}

// Short status verb shown as the row subtitle.
function eventKind(e: LesankofaEvent): string {
  switch (e.event_type) {
    case 'task_run':          return 'Tâche planifiée';
    case 'article_generated': return 'Génération';
    case 'push_success':      return 'Publication réussie';
    case 'push_failed':       return 'Publication échouée';
    default:                  return e.event_type;
  }
}

// Relative time ("il y a 5 min", "il y a 2 h", "hier"…) for compact display.
function fmtRelative(iso?: string | null): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min  = Math.round(diff / 60000);
  if (min < 1)   return 'à l’instant';
  if (min < 60)  return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24)    return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1)   return 'hier';
  if (d < 7)     return `il y a ${d} j`;
  return fmtDateShort(iso);
}

// Status tone → tinted icon badge (no left bars / shadows, brand-color variants only).
function eventTone(e: LesankofaEvent) {
  if (e.status === 'error' || e.event_type === 'push_failed')
    return { icon: <XCircleIcon size={14} />,      ring: 'text-destructive bg-destructive/10 ring-destructive/20' };
  if (e.status === 'success' || e.event_type === 'push_success')
    return { icon: <CheckCircle2Icon size={14} />, ring: 'text-green-600 bg-green-500/10 ring-green-500/20' };
  if (e.event_type === 'article_generated')
    return { icon: <PenLineIcon size={14} />,      ring: 'text-primary bg-primary/10 ring-primary/20' };
  return { icon: <ZapIcon size={14} />,            ring: 'text-muted-foreground bg-muted ring-border' };
}

function ActivityRow({ e, last }: { e: LesankofaEvent; last?: boolean }) {
  const tone = eventTone(e);
  return (
    <div className="group relative flex gap-3 px-4">
      {/* Timeline rail */}
      <div className="relative flex flex-col items-center">
        <span className={`relative z-10 mt-2.5 flex items-center justify-center size-7 rounded-full ring-1 ${tone.ring} flex-shrink-0 transition-transform group-hover:scale-110`}>
          {tone.icon}
        </span>
        {!last && <span className="w-px flex-1 bg-border" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex items-start justify-between gap-3 py-2.5 group-hover:bg-muted/30 -mx-1 px-1 rounded-md transition-colors">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate">{eventLabel(e)}</p>
            {e.client_id && (
              <span className="text-[11px] font-semibold uppercase tracking-wide text-white bg-black rounded px-1.5 py-0.5 flex-shrink-0">
                {e.client_id}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{eventKind(e)}</p>
        </div>
        <span
          className="text-xs text-muted-foreground flex-shrink-0 tabular-nums whitespace-nowrap pt-0.5"
          title={fmtDate(e.created_at)}
        >
          {fmtRelative(e.created_at)}
        </span>
      </div>
    </div>
  );
}

function RecentActivityCard() {
  const [events,  setEvents]  = useState<LesankofaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    apiService.adminLesankofaHistory(15)
      .then((d: { events: LesankofaEvent[] }) => setEvents(d.events ?? []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Ensure newest → oldest, then split into the 10 visible + the older collapsed rest.
  const sorted  = [...events].sort(
    (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
  );
  const visible = sorted.slice(0, 10);
  const older   = sorted.slice(10);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ZapIcon size={15} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Activité récente</h3>
          {events.length > 0 && (
            <span className="text-[11px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
              {events.length}
            </span>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCwIcon size={12} className={loading ? 'animate-spin' : ''} /> Actualiser
        </button>
      </div>

      {error && (
        <p className="text-xs text-destructive px-4 py-3">{error}</p>
      )}

      {!error && events.length === 0 && loading && (
        <div className="px-4 py-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <div className="size-7 rounded-full bg-muted animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
                <div className="h-2.5 w-1/4 rounded bg-muted/60 animate-pulse" />
              </div>
              <div className="h-2.5 w-16 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {!error && events.length === 0 && !loading && (
        <p className="text-xs text-muted-foreground px-4 py-6 text-center">Aucune activité enregistrée.</p>
      )}

      {events.length > 0 && (
        <>
          <div className="py-1">
            {visible.map((e, i) => (
              <ActivityRow key={e.id} e={e} last={i === visible.length - 1 && older.length === 0} />
            ))}
          </div>

          {older.length > 0 && (
            <>
              <motion.div
                initial={false}
                animate={{ height: showAll ? 'auto' : 0, opacity: showAll ? 1 : 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="py-1 bg-muted/20">
                  {older.map((e, i) => (
                    <ActivityRow key={e.id} e={e} last={i === older.length - 1} />
                  ))}
                </div>
              </motion.div>

              <button
                onClick={() => setShowAll(v => !v)}
                className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 border-t border-border transition-colors"
              >
                <ChevronDownIcon
                  size={14}
                  className={`transition-transform duration-300 ${showAll ? 'rotate-180' : ''}`}
                />
                {showAll ? 'Réduire' : `Voir ${older.length} plus anciennes`}
              </button>
            </>
          )}
        </>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────
// Modèles Tab
// ─────────────────────────────────────────────

function ModelsTab() {
  const { t: tc } = useTranslation('common');
  const [q,             setQ]             = useState('');
  const [models,        setModels]        = useState<AIModelRow[] | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [modelPage,     setModelPage]     = useState(1);
  const [selectedModel, setSelectedModel] = useState<AIModelRow | null>(null);
  const [togglingId,    setTogglingId]    = useState<string | null>(null);

  const toggleModel = (id: string) => {
    setTogglingId(id);
    apiService.adminLesankofaModelToggle(id)
      .then(() => load())
      .catch(e => setError(e.message))
      .finally(() => setTogglingId(null));
  };

  const load = () => {
    setLoading(true);
    setError(null);
    apiService.adminLesankofaModels()
      .then(m => setModels(m))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Search first, then paginate what matches.
  const filteredModels = useMemo(
    () => (models ? filterRows(models, q, (m) => [m.name, m.model_identifier, m.provider, m.tier]) : null),
    [models, q],
  );
  const pagedModels = useMemo(
    () => filteredModels?.slice((modelPage - 1) * MODEL_PER_PAGE, modelPage * MODEL_PER_PAGE) ?? [],
    [filteredModels, modelPage],
  );
  const totalPages  = filteredModels ? Math.max(1, Math.ceil(filteredModels.length / MODEL_PER_PAGE)) : 1;
  const selection   = useRowSelection(pagedModels, (m) => String(m.id));

  // Bulk (de)activation: the endpoint toggles, so only rows not yet in the target state are sent.
  async function bulkSetActive(active: boolean) {
    const targets = selection.selectedRows.filter((m) => m.is_active !== active);
    const results = await Promise.allSettled(targets.map((m) => apiService.adminLesankofaModelToggle(String(m.id))));
    if (results.some((r) => r.status === 'rejected')) toast.error(tc('table.bulkFailed'));
    else toast.success(tc('table.bulkDone', { count: selection.count }));
    selection.clear(); load();
  }

  function exportSelection() {
    exportRowsCsv('lesankofa-modeles', [
      ['Modèle', (m) => m.name],
      ['Identifiant', (m) => m.model_identifier],
      ['Provider', (m) => m.provider],
      ['Tier', (m) => m.tier],
      ['Statut', (m) => (m.is_available ? 'Disponible' : m.is_active ? 'Quota épuisé' : 'Inactif')],
      ["Req. aujourd'hui", (m) => m.requests_today],
      ['Tokens', (m) => m.tokens_today],
      ['Quota restant', (m) => m.quota_remaining ?? ''],
    ], selection.selectedRows);
  }

  return (
    <div className="space-y-4">
      <DataTableToolbar right={
        <>
          <span className="text-xs text-muted-foreground">
            {models ? `${models.length} modèles` : ''}
          </span>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCwIcon className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </>
      }>
        <DataTableSearch value={q} onChange={(value) => { setQ(value); setModelPage(1); }} />
      </DataTableToolbar>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
          Erreur : {error}
        </p>
      )}

      <DataTableSelectionBar count={selection.count} onClear={selection.clear} onExport={exportSelection}>
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => bulkSetActive(true)}>
          <MegaphoneIcon size={13} /> Activer
        </button>
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => bulkSetActive(false)}>
          <MegaphoneOffIcon size={13} /> Désactiver
        </button>
      </DataTableSelectionBar>

      <DataTable>
        <DataTableHead>
          <DataTableRow>
            <DataTableSelectTh checked={selection.allChecked} indeterminate={selection.someChecked} onChange={selection.toggleAll} ariaLabel={tc('table.selectAll')} />
            <DataTableTh>Modèle</DataTableTh>
            <DataTableTh>Provider</DataTableTh>
            <DataTableTh>Tier</DataTableTh>
            <DataTableTh>Statut</DataTableTh>
            <DataTableTh>Req. aujourd'hui</DataTableTh>
            <DataTableTh>Tokens</DataTableTh>
            <DataTableTh>Quota restant</DataTableTh>
            <DataTableTh>Actions</DataTableTh>
          </DataTableRow>
        </DataTableHead>
        <DataTableBody>
          {!models && !error && <DataTableEmpty label="Chargement…" />}
          {filteredModels && filteredModels.length === 0 && (
            <DataTableEmpty icon={<BrainIcon size={28} />} label={q ? tc('table.noResults', { query: q }) : 'Aucun modèle trouvé'} />
          )}
          {pagedModels.map(m => (
            <DataTableRow key={m.id}>
              <DataTableSelectTd checked={selection.isSelected(String(m.id))} onChange={(checked) => selection.toggle(String(m.id), checked)} ariaLabel={tc('table.selectRow')} />
              <DataTableTd>
                <div className="font-medium text-foreground">{m.name}</div>
                <div className="text-xs text-muted-foreground">{m.model_identifier}</div>
              </DataTableTd>
              <DataTableTd>{m.provider}</DataTableTd>
              <DataTableTd>
                <Badge variant={m.tier === 'free' ? 'secondary' : 'default'}>{m.tier}</Badge>
              </DataTableTd>
              <DataTableTd>
                {m.is_available
                  ? <Badge variant="default">Disponible</Badge>
                  : m.is_active
                    ? <Badge variant="outline">Quota épuisé</Badge>
                    : <Badge variant="destructive">Inactif</Badge>}
              </DataTableTd>
              <DataTableTd>{m.requests_today}</DataTableTd>
              <DataTableTd>{fmtNum(m.tokens_today)}</DataTableTd>
              <DataTableTd>{m.quota_remaining ?? '∞'}</DataTableTd>
              <DataTableTd>
                <div className="adm-table__actions">
                  <DataTableAction icon={EyeIcon} label="Détails du modèle" onClick={() => setSelectedModel(m)} />
                  {m.is_active
                    ? <DataTableAction icon={MegaphoneIcon} label="Désactiver ce modèle" disabled={togglingId === String(m.id)} onClick={() => toggleModel(String(m.id))} />
                    : <DataTableAction icon={MegaphoneOffIcon} label="Activer ce modèle" variant="success" disabled={togglingId === String(m.id)} onClick={() => toggleModel(String(m.id))} />}
                </div>
              </DataTableTd>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-3 border-t border-border">
          <span className="text-xs text-muted-foreground">Page {modelPage} / {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={modelPage === 1} onClick={() => setModelPage(p => p - 1)}>←</Button>
            <Button variant="outline" size="sm" disabled={modelPage === totalPages} onClick={() => setModelPage(p => p + 1)}>→</Button>
          </div>
        </div>
      )}

      {/* Recent activity */}
      {models && models.length > 0 && (() => {
        const active = models.filter(m => m.requests_today > 0).slice(0, 4);
        if (active.length === 0) return null;
        const maxReq = Math.max(...active.map(m => m.requests_today), 1);
        return (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">Modèles récemment actifs</h3>
            <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {active.map(m => (
                <div
                  key={m.id}
                  className="flex items-center gap-4 px-4 py-3 bg-background hover:bg-muted/40 cursor-pointer transition-colors"
                  onClick={() => setSelectedModel(m)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.provider}</p>
                  </div>
                  <div className="w-20 flex-shrink-0">
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-foreground/70"
                        style={{ width: `${Math.round((m.requests_today / maxReq) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 w-16">
                    <p className="text-sm font-bold text-foreground tabular-nums">{m.requests_today}</p>
                    <p className="text-xs text-muted-foreground">req.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Model detail modal */}
      <Modal
        open={!!selectedModel}
        onClose={() => setSelectedModel(null)}
        title={selectedModel?.name ?? ''}
        subtitle={selectedModel ? <code className="text-xs">{selectedModel.model_identifier}</code> : undefined}
        badge={selectedModel
          ? (selectedModel.is_available
              ? <span className="flex items-center gap-1"><CheckCircle2Icon size={9} /> Disponible</span>
              : selectedModel.is_active
                ? <span className="flex items-center gap-1"><AlertTriangleIcon size={9} /> Quota épuisé</span>
                : <span className="flex items-center gap-1"><XCircleIcon size={9} /> Inactif</span>)
          : undefined}
        size="sm"
      >
        {selectedModel && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Field label="Provider"         value={selectedModel.provider} />
            <Field label="Tier"             value={<Badge variant={selectedModel.tier === 'free' ? 'secondary' : 'default'}>{selectedModel.tier}</Badge>} />
            <Field label="Priorité"         value={String(selectedModel.priority)} />
            <Field label="Req. aujourd'hui" value={String(selectedModel.requests_today)} />
            <Field label="Tokens / jour"    value={fmtNum(selectedModel.tokens_today)} />
            <Field label="Quota restant"    value={selectedModel.quota_remaining != null ? String(selectedModel.quota_remaining) : '∞'} />
            {selectedModel.max_tokens_per_request != null && (
              <Field label="Max tokens/req" value={fmtNum(selectedModel.max_tokens_per_request)} />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────
// Clients Tab
// ─────────────────────────────────────────────

function ClientsTab() {
  const { t: tc } = useTranslation('common');
  const [q,                  setQ]                  = useState('');
  const [clients,            setClients]            = useState<AIClientRow[] | null>(null);
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState<string | null>(null);
  const [selectedClient,     setSelectedClient]     = useState<AIClientRow | null>(null);
  const [clientDetail,       setClientDetail]       = useState<AIClientDetail | null>(null);
  const [detailLoading,      setDetailLoading]      = useState(false);

  const loadClients = () => {
    apiService.adminLesankofaClients()
      .then(data => setClients(data.clients ?? data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadClients(); }, []);

  const visibleClients = useMemo(
    () => (clients ? filterRows(clients, q, (c) => [c.name, c.slug]) : null),
    [clients, q],
  );
  const selection = useRowSelection(visibleClients ?? [], (c) => c.id);

  // Bulk: same daily capacity for every selected client.
  async function bulkCapacity(capacity: number) {
    const results = await Promise.allSettled(
      selection.selectedRows.map((c) => apiService.adminLesankofaClientUpdate(c.id, { daily_generation_capacity: capacity })),
    );
    if (results.some((r) => r.status === 'rejected')) toast.error(tc('table.bulkFailed'));
    else toast.success(tc('table.bulkDone', { count: results.length }));
    selection.clear(); loadClients();
  }

  function exportSelection() {
    exportRowsCsv('lesankofa-clients', [
      ['Client', (c) => c.name],
      ['Slug', (c) => c.slug],
      ['Total articles', (c) => c.articles_total],
      ['Succès', (c) => c.articles_success],
      ['Échecs', (c) => c.articles_failed],
      ['Capacité', (c) => c.daily_generation_capacity],
      ['Dernière génération', (c) => c.last_generation ?? ''],
      ['Statut', (c) => (c.is_active ? 'Actif' : 'Inactif')],
    ], selection.selectedRows);
  }

  useEffect(() => {
    if (!selectedClient) { setClientDetail(null); return; }
    setDetailLoading(true);
    setClientDetail(null);
    apiService.adminLesankofaClientDetail(selectedClient.id)
      .then(setClientDetail)
      .catch(() => setClientDetail(selectedClient as AIClientDetail))
      .finally(() => setDetailLoading(false));
  }, [selectedClient]);

  const [editingClient, setEditingClient] = useState<AIClientRow | null>(null);

  function handleCapacityUpdated(clientId: string, newCapacity: number) {
    setClients(prev => prev?.map(c => c.id === clientId ? { ...c, daily_generation_capacity: newCapacity } : c) ?? prev);
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">Erreur : {error}</p>
      )}
      <DataTableToolbar>
        <DataTableSearch value={q} onChange={setQ} />
      </DataTableToolbar>

      <DataTableSelectionBar count={selection.count} onClear={selection.clear} onExport={exportSelection}>
        <select
          className="adm-select adm-select--sm"
          aria-label="Capacité"
          value=""
          onChange={(e) => { if (e.target.value) bulkCapacity(Number(e.target.value)); }}
        >
          <option value="">Capacité…</option>
          {CAPACITY_TIERS.map((tier) => <option key={tier.value} value={tier.value}>{tier.label}</option>)}
        </select>
      </DataTableSelectionBar>

      <DataTable>
        <DataTableHead>
          <DataTableRow>
            <DataTableSelectTh checked={selection.allChecked} indeterminate={selection.someChecked} onChange={selection.toggleAll} ariaLabel={tc('table.selectAll')} />
            <DataTableTh>Client</DataTableTh>
            <DataTableTh>Total articles</DataTableTh>
            <DataTableTh>Succès</DataTableTh>
            <DataTableTh>Échecs</DataTableTh>
            <DataTableTh>Capacité</DataTableTh>
            <DataTableTh>Dernière génération</DataTableTh>
            <DataTableTh>Statut</DataTableTh>
            <DataTableTh>Actions</DataTableTh>
          </DataTableRow>
        </DataTableHead>
        <DataTableBody>
          {!clients && !error && <DataTableEmpty label="Chargement…" />}
          {visibleClients && visibleClients.length === 0 && (
            <DataTableEmpty icon={<UsersIcon size={28} />} label={q ? tc('table.noResults', { query: q }) : 'Aucun client'} />
          )}
          {visibleClients?.map(c => (
            <DataTableRow key={c.id}>
              <DataTableSelectTd checked={selection.isSelected(c.id)} onChange={(checked) => selection.toggle(c.id, checked)} ariaLabel={tc('table.selectRow')} />
              <DataTableTd>
                <div className="font-medium text-foreground">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.slug}</div>
              </DataTableTd>
              <DataTableTd><span className="font-semibold">{c.articles_total}</span></DataTableTd>
              <DataTableTd>{c.articles_success}</DataTableTd>
              <DataTableTd>{c.articles_failed > 0
                ? <span className="text-destructive font-medium">{c.articles_failed}</span>
                : 0}
              </DataTableTd>
              <DataTableTd>{c.daily_generation_capacity}/jour</DataTableTd>
              <DataTableTd>{fmtDate(c.last_generation)}</DataTableTd>
              <DataTableTd><StatusBadgeLocal status={c.is_active ? 'active' : 'paused'} /></DataTableTd>
              <DataTableTd>
                <div className="adm-table__actions">
                  <DataTableAction icon={EyeIcon} label="Détails" onClick={() => setSelectedClient(c)} />
                  <DataTableAction icon={PenLineIcon} label="Modifier" onClick={() => setEditingClient(c)} />
                </div>
              </DataTableTd>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      {/* Client detail modal (preview, multi-étapes) */}
      {selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          detail={clientDetail}
          loading={detailLoading}
          onClose={() => setSelectedClient(null)}
        />
      )}

      {/* Client update modal (multi-étapes) */}
      {editingClient && (
        <ClientUpdateModal
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onUpdated={handleCapacityUpdated}
        />
      )}
    </div>
  );
}

const DETAIL_STEPS = ['Identité', 'Capacité & articles', 'Stratégie éditoriale'] as const;

function ClientDetailModal({
  client, detail, loading, onClose
}: {
  client: AIClientRow;
  detail: AIClientDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  const d = detail ?? client;
  const [step, setStep] = useState(0);
  const weeklyCap = d.daily_generation_capacity * 5;

  return (
    <StepperModal
      open
      onClose={onClose}
      title={d.name}
      subtitle={(d as AIClientDetail).tagline}
      badge={<span className="flex items-center gap-1">{d.is_active ? <CheckCircle2Icon size={9} /> : <XCircleIcon size={9} />}{d.is_active ? 'Actif' : 'Inactif'}</span>}
      size="lg"
      steps={DETAIL_STEPS}
      currentStep={step}
      onBack={() => setStep(s => s - 1)}
      onNext={() => setStep(s => s + 1)}
    >
      <div className="space-y-6">
          {loading && (
            <p className="text-sm text-muted-foreground text-center py-4">Chargement…</p>
          )}

          {step === 0 && (
            <>
              <Section title="Identité">
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <Field label="Slug"      value={d.slug} />
                  <Field label="Industrie" value={(d as AIClientDetail).industry ?? '—'} />
                  <Field label="Locale"    value={(d as AIClientDetail).primary_locale ?? '—'} />
                  <Field label="Langues"   value={((d as AIClientDetail).languages ?? []).join(', ') || '—'} />
                  {(d as AIClientDetail).website_url && (
                    <Field label="Site" value={
                      <a href={(d as AIClientDetail).website_url!} target="_blank" rel="noreferrer"
                         className="text-primary hover:underline text-xs">{(d as AIClientDetail).website_url}</a>
                    } />
                  )}
                  {(d as AIClientDetail).push_endpoint && (
                    <Field label="Push endpoint" value={
                      <span className="font-mono text-xs break-all">{(d as AIClientDetail).push_endpoint}</span>
                    } />
                  )}
                </div>
                {(d as AIClientDetail).description_short && (
                  <p className="mt-2 text-sm text-muted-foreground">{(d as AIClientDetail).description_short}</p>
                )}
              </Section>
              {(d as AIClientDetail).created_at && (
                <p className="text-xs text-muted-foreground">Créé le {fmtDate((d as AIClientDetail).created_at)}</p>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <Section title="Capacité de génération">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center size-8 rounded-lg bg-muted/60 text-foreground">
                    <ZapIcon size={16} />
                  </span>
                  <div className="leading-tight whitespace-nowrap">
                    <span className="text-lg font-bold">{d.daily_generation_capacity}/jour</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">soit {weeklyCap}/semaine</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Plafond appliqué à la PROCHAINE génération du calendrier hebdomadaire — jamais rétroactif sur une semaine déjà planifiée.
                </p>
              </Section>

              <Section title="Articles générés">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  {[
                    { label: 'Total',    value: d.articles_total,   icon: <LayersIcon       size={16} />, color: 'text-foreground' },
                    { label: 'Succès',   value: d.articles_success, icon: <CheckCircle2Icon size={16} />, color: 'text-green-600' },
                    { label: 'Échecs',   value: d.articles_failed,  icon: <XCircleIcon      size={16} />, color: d.articles_failed > 0 ? 'text-destructive' : 'text-foreground' },
                    { label: 'En cours', value: d.articles_pending, icon: <RefreshCwIcon    size={16} />, color: 'text-foreground' },
                  ].map(({ label, value, icon, color }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className={`flex items-center justify-center size-8 rounded-lg bg-muted/60 ${color}`}>
                        {icon}
                      </span>
                      <div className="leading-tight whitespace-nowrap">
                        <span className={`text-lg font-bold ${color}`}>{value}</span>
                        <span className="ml-1.5 text-xs text-muted-foreground">{label}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Dernière génération : {fmtDate(d.last_generation)}</p>
              </Section>
            </>
          )}

          {step === 2 && (
            <>
              {((d as AIClientDetail).content_pillars?.length ?? 0) > 0 && (
                <Section title="Piliers de contenu">
                  <TagList items={(d as AIClientDetail).content_pillars!} />
                </Section>
              )}
              {((d as AIClientDetail).objectives?.length ?? 0) > 0 && (
                <Section title="Objectifs">
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                    {(d as AIClientDetail).objectives!.map((o, i) => <li key={i}>{o}</li>)}
                  </ul>
                </Section>
              )}
              {((d as AIClientDetail).brand_keywords?.length ?? 0) > 0 && (
                <Section title="Mots-clés marque">
                  <TagList items={(d as AIClientDetail).brand_keywords!} />
                </Section>
              )}
              {((d as AIClientDetail).competitor_keywords?.length ?? 0) > 0 && (
                <Section title="Mots-clés concurrents">
                  <TagList items={(d as AIClientDetail).competitor_keywords!} />
                </Section>
              )}
              {((d as AIClientDetail).key_features?.length ?? 0) > 0 && (
                <Section title="Fonctionnalités clés">
                  <TagList items={(d as AIClientDetail).key_features!} />
                </Section>
              )}
              {((d as AIClientDetail).integrations?.length ?? 0) > 0 && (
                <Section title="Intégrations">
                  <TagList items={(d as AIClientDetail).integrations!} />
                </Section>
              )}
              {((d as AIClientDetail).geographic_zones?.length ?? 0) > 0 && (
                <Section title="Zones géographiques">
                  <TagList items={(d as AIClientDetail).geographic_zones!} />
                </Section>
              )}
              {(d as AIClientDetail).tone_of_voice && (
                <Section title="Tonalité">
                  <p className="text-sm">{(d as AIClientDetail).tone_of_voice}</p>
                </Section>
              )}
              {((d as AIClientDetail).pricing_tiers?.length ?? 0) > 0 && (
                <Section title="Offres tarifaires">
                  <div className="space-y-1">
                    {(d as AIClientDetail).pricing_tiers!.map((t, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span>{t.name}</span>
                        <span className="font-mono text-muted-foreground">{t.price === 0 ? 'Gratuit' : `${t.price} ${t.currency ?? '€'} / ${t.billing ?? 'mois'}`}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </>
          )}
        </div>
    </StepperModal>
  );
}

function ClientUpdateModal({
  client, onClose, onUpdated,
}: {
  client: AIClientRow;
  onClose: () => void;
  onUpdated: (clientId: string, newCapacity: number) => void;
}) {
  const UPDATE_STEPS = ['Client', 'Capacité', 'Confirmation'] as const;
  const [step, setStep] = useState(0);
  const [capacity, setCapacity] = useState(client.daily_generation_capacity);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      await apiService.adminLesankofaClientUpdate(client.id, { daily_generation_capacity: capacity });
      onUpdated(client.id, capacity);
      setSaved(true);
      setStep(2);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  }

  return (
    <StepperModal
      open
      onClose={onClose}
      title={`Modifier ${client.name}`}
      size="md"
      steps={UPDATE_STEPS}
      currentStep={step}
      onBack={() => setStep(s => s - 1)}
      onNext={() => step === 1 ? handleSave() : setStep(s => s + 1)}
      nextLabel={step === 1 ? (saving ? 'Enregistrement…' : 'Enregistrer') : 'Suivant'}
      nextDisabled={step === 1 && saving}
    >
      <div className="space-y-6">
        {step === 0 && (
          <Section title="Client concerné">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Field label="Nom"  value={client.name} />
              <Field label="Slug" value={client.slug} />
              <Field label="Capacité actuelle" value={`${client.daily_generation_capacity}/jour`} />
              <Field label="Statut" value={client.is_active ? 'Actif' : 'Inactif'} />
            </div>
          </Section>
        )}

        {step === 1 && (
          <Section title="Capacité de génération quotidienne">
            <p className="text-xs text-muted-foreground mb-3">
              S'applique à la PROCHAINE génération du calendrier hebdomadaire (lundi-vendredi) — jamais rétroactif sur une semaine déjà planifiée.
            </p>
            <div className="space-y-2">
              {CAPACITY_TIERS.map(tier => (
                <label
                  key={tier.value}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                    capacity === tier.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="capacity-tier"
                    checked={capacity === tier.value}
                    onChange={() => setCapacity(tier.value)}
                  />
                  <span className="text-sm font-medium">{tier.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{tier.value * 5}/semaine</span>
                </label>
              ))}
            </div>
            {saveError && (
              <p className="text-sm text-destructive mt-3">Erreur : {saveError}</p>
            )}
          </Section>
        )}

        {step === 2 && saved && (
          <Section title="Confirmation">
            <p className="text-sm flex items-center gap-2">
              <CheckCircle2Icon size={16} className="text-green-600" />
              Capacité de {client.name} mise à jour : {capacity}/jour ({capacity * 5}/semaine).
            </p>
          </Section>
        )}
      </div>
    </StepperModal>
  );
}

// ─── Small reusable pieces for detail modals ─
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</h4>
      {children}
    </div>
  );
}
function TagList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t, i) => (
        <span key={i} className="rounded-md bg-muted border border-border px-2 py-0.5 text-xs">{t}</span>
      ))}
    </div>
  );
}
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// KPI card helper
// ─────────────────────────────────────────────

function fmtNum(n: number) {
  return new Intl.NumberFormat('fr').format(n);
}

// ─────────────────────────────────────────────
// Generation control (kill switch — incident 2026-07-29, 1000+ emails NoCapacity)
// ─────────────────────────────────────────────

interface GenerationControlState {
  is_paused: boolean;
  paused_at: string | null;
  paused_reason: string | null;
  resumed_at: string | null;
  updated_by: string | null;
  updated_at: string | null;
}

function GenerationControlToggle() {
  const [state,   setState]   = useState<GenerationControlState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    apiService.adminLesankofaGenerationControl()
      .then(setState)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggle = async () => {
    if (!state) return;
    setBusy(true);
    setError(null);
    try {
      if (state.is_paused) {
        await apiService.adminLesankofaGenerationResume();
      } else {
        const reason = window.prompt('Raison de la pause manuelle (optionnel) :', 'Pause manuelle (admin)') ?? undefined;
        await apiService.adminLesankofaGenerationPause(reason);
      }
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const isPaused = state?.is_paused ?? false;

  return (
    <div className="admin-news__header-toggle">
      <Button
        variant={isPaused ? 'default' : 'outline'}
        size="sm"
        onClick={toggle}
        disabled={loading || busy || !state}
        title={isPaused ? (state?.paused_reason ?? 'Génération en pause') : 'Génération active'}
      >
        {isPaused
          ? <AlertTriangleIcon size={14} />
          : <ZapIcon size={14} />}
        {busy ? 'Mise à jour…' : isPaused ? 'Génération en pause — reprendre' : 'Génération active — mettre en pause'}
      </Button>
      {error && <p className="admin-news__header-toggle-error">Erreur : {error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────
// Page root
// ─────────────────────────────────────────────

const VALID_TABS = ['overview', 'models', 'clients', 'model', ...DSV_TABS] as const;
type TabValue = typeof VALID_TABS[number];

function readHashTab(): TabValue {
  const hash = window.location.hash.replace('#tab-', '');
  return (VALID_TABS as readonly string[]).includes(hash) ? (hash as TabValue) : 'overview';
}

export default function AdminLesankofa() {
  const { t } = useTranslation('admin');
  const [tab, setTab] = useState<TabValue>(readHashTab);
  const { stats, clientCount, error } = useLesankofaOverview();
  const dsvState = useDsvState();
  const onDsvTab = isDsvTab(tab);

  useEffect(() => {
    const onPop = () => setTab(readHashTab());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const handleTabChange = (v: string) => {
    setTab(v as TabValue);
    history.replaceState(null, '', `#tab-${v}`);
  };

  return (
    <div className="dash-page">
      <PageHeader
        title={t('lesankofa.heading')}
        description={t('lesankofa.subtitle')}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            {onDsvTab && <DsvClientSelect state={dsvState} />}
            <GenerationControlToggle />
          </div>
        )}
      />

      {onDsvTab ? <DsvStatRow state={dsvState} /> : (
      <StatRow>
        <StatCard icon={<BrainIcon size={18} />} label={t('lesankofa.stats.models')} value={stats ? stats.active_models : '—'} />
        <StatCard icon={<ZapIcon size={18} />} label={t('lesankofa.stats.requests')} value={stats ? stats.total_requests_today : '—'} />
        <StatCard icon={<LayersIcon size={18} />} label={t('lesankofa.stats.tokens')} value={stats ? fmtNum(stats.total_tokens_today) : '—'} />
        <StatCard icon={<UsersIcon size={18} />} label={t('lesankofa.stats.clients')} value={clientCount ?? '—'} />
      </StatRow>
      )}

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="lsk-tabs">
          <TabsTrigger value="overview"       icon={<TrendingUpIcon   size={14} />}>Overview</TabsTrigger>
          <TabsTrigger value="models"         icon={<BrainIcon        size={14} />}>Modèles</TabsTrigger>
          <TabsTrigger value="clients"        icon={<UsersIcon        size={14} />}>Clients</TabsTrigger>
          <TabsTrigger value="model"          icon={<LayersIcon       size={14} />}>Schéma</TabsTrigger>
          <TabsTrigger value="validation"     icon={<ClipboardListIcon size={14} />} count={dsvState.figures.inReview ?? undefined}>Validation</TabsTrigger>
          <TabsTrigger value="decisions"      icon={<TargetIcon       size={14} />}>Décisions</TabsTrigger>
          <TabsTrigger value="questions"      icon={<SearchIcon       size={14} />}>Questions</TabsTrigger>
          <TabsTrigger value="configuration"  icon={<LayersIcon       size={14} />}>Configuration</TabsTrigger>
          <TabsTrigger value="resultats"      icon={<TrendingUpIcon   size={14} />}>Résultats et liens</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab error={error} />
        </TabsContent>
        <TabsContent value="models">
          <ModelsTab />
        </TabsContent>
        <TabsContent value="clients">
          <ClientsTab />
        </TabsContent>
        <TabsContent value="model">
          <SchemaTab />
        </TabsContent>
        {DSV_TABS.map((v) => (
          <TabsContent key={v} value={v}>
            <DsvTabPanel tab={v} state={dsvState} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
