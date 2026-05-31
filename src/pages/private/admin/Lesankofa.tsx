import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

import { apiService } from '@/services/api';
import { BaseTab } from '@/components/common/BaseTab';
import { Modal } from '@/components/common/Modal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/common/Tabs';
import { DataTable, DataTableHead, DataTableBody, DataTableRow, DataTableTh, DataTableTd, DataTableEmpty } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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
  ChevronRightIcon,
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

interface TaskRow {
  name: string;
  task: string;
  schedule: string | null;
  kwargs: Record<string, unknown>;
  last_run_at: string | null;
  status: string;
}

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
  last_generation: string | null;
}

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

interface ContainerRow {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  created: number | null;
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

// Returns a plain icon + label for use inside adm-modal__badge (already black bg, white text)
function ModalStatusTag({ status }: { status: string }) {
  const map: Record<string, { icon: React.ReactNode; label: string }> = {
    running:  { icon: <ZapIcon          size={9} />, label: 'En cours'       },
    idle:     { icon: <ServerIcon       size={9} />, label: 'Idle'            },
    error:    { icon: <AlertTriangleIcon size={9} />, label: 'Erreur'         },
    active:   { icon: <CheckCircle2Icon  size={9} />, label: 'Actif'          },
    paused:   { icon: <XCircleIcon       size={9} />, label: 'Inactif'        },
  };
  const m = map[status] ?? { icon: <ServerIcon size={9} />, label: status };
  return <span className="flex items-center gap-1">{m.icon}{m.label}</span>;
}

// Simple cron expression → plain French description
function describeCron(expr: string): string {
  const [min, hour, dom, , dow] = expr.trim().split(/\s+/);
  const h = (s: string) => s.padStart(2, '0');
  const DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  if (min === '0' && hour === '*')           return 'Toutes les heures';
  if (min === '0' && hour.startsWith('*/'))  return `Toutes les ${hour.slice(2)}h`;
  if (min.startsWith('*/'))                  return `Toutes les ${min.slice(2)} min`;
  if (dow !== '*' && !isNaN(+dow))           return `Tous les ${DAYS[+dow] ?? dow} à ${h(hour)}h${h(min)}`;
  if (dom !== '*' && !isNaN(+dom))           return `Le ${dom} de chaque mois à ${h(hour)}h${h(min)}`;
  return `Tous les jours à ${h(hour)}h${h(min)}`;
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

function OverviewTab() {
  const [stats,       setStats]       = useState<AIStatsRow | null>(null);
  const [clientCount, setClientCount] = useState<number | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiService.adminLesankofaModelStats(),
      apiService.adminLesankofaClients().catch(() => null),
    ])
      .then(([s, c]) => {
        setStats(s);
        const clients: AIClientRow[] = c?.clients ?? c ?? [];
        setClientCount(clients.filter((cl: AIClientRow) => cl.is_active).length);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-stretch gap-3 overflow-x-auto">
        <KpiCard label="Modèles actifs"       value={stats ? String(stats.active_models)         : '—'} icon={<BrainIcon  size={16} />} />
        <KpiCard label="Requêtes aujourd'hui" value={stats ? String(stats.total_requests_today)  : '—'} icon={<ZapIcon    size={16} />} />
        <KpiCard label="Tokens aujourd'hui"   value={stats ? fmtNum(stats.total_tokens_today)    : '—'} icon={<LayersIcon size={16} />} />
        <KpiCard label="Clients actifs"       value={clientCount !== null ? String(clientCount) : '—'} icon={<UsersIcon  size={16} />} />
      </div>

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
            <p className="text-xs font-semibold text-foreground truncate">{eventLabel(e)}</p>
            {e.client_id && (
              <span className="text-[10px] font-medium uppercase tracking-wide text-primary bg-primary/10 rounded px-1.5 py-0.5 flex-shrink-0">
                {e.client_id}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{eventKind(e)}</p>
        </div>
        <span
          className="text-[11px] text-muted-foreground flex-shrink-0 tabular-nums whitespace-nowrap pt-0.5"
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
  const [models,        setModels]        = useState<AIModelRow[] | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [modelPage,     setModelPage]     = useState(1);
  const [selectedModel, setSelectedModel] = useState<AIModelRow | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    apiService.adminLesankofaModels()
      .then(m => setModels(m))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const pagedModels = models?.slice((modelPage - 1) * MODEL_PER_PAGE, modelPage * MODEL_PER_PAGE);
  const totalPages  = models ? Math.ceil(models.length / MODEL_PER_PAGE) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {models ? `${models.length} modèles` : ''}
        </span>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCwIcon className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
          Erreur : {error}
        </p>
      )}

      <DataTable>
        <DataTableHead>
          <DataTableRow>
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
          {models && models.length === 0 && <DataTableEmpty label="Aucun modèle trouvé" />}
          {pagedModels?.map(m => (
            <DataTableRow key={m.id}>
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
                <button
                  type="button"
                  className="adm-btn adm-btn--ghost adm-btn--xs"
                  onClick={() => setSelectedModel(m)}
                  title="Détails du modèle"
                >
                  <EyeIcon size={13} />
                </button>
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
// Tasks Tab
// ─────────────────────────────────────────────

function TasksTab() {
  const [tasks,    setTasks]    = useState<TaskRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [selected, setSelected] = useState<TaskRow | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    apiService.adminLesankofaTasks()
      .then((data: { tasks: TaskRow[] }) => { setTasks(data.tasks ?? []); })
      .catch(() => { setError('Impossible de charger les tâches Celery.'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <BaseTab loading={loading} error={error} onRetry={load}>
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableTh>Tâche</DataTableTh>
              <DataTableTh>Planification (cron)</DataTableTh>
              <DataTableTh>Dernier déclenchement</DataTableTh>
              <DataTableTh>Statut</DataTableTh>
              <DataTableTh>Action</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {tasks.length === 0 && (
              <DataTableEmpty label="Aucune tâche trouvée." />
            )}
            {tasks.map(t => (
              <DataTableRow key={t.name}>
                <DataTableTd>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{t.name}</code>
                </DataTableTd>
                <DataTableTd>
                  <code className="text-xs text-muted-foreground">{t.schedule ?? '—'}</code>
                </DataTableTd>
                <DataTableTd>{fmtDate(t.last_run_at)}</DataTableTd>
                <DataTableTd><StatusBadgeLocal status={t.status} /></DataTableTd>
                <DataTableTd>
                  <div className="adm-table__actions">
                    <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" onClick={() => setSelected(t)} title="Détails">
                      <EyeIcon size={13} />
                    </button>
                    <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" title="Modifier (à venir)" disabled>
                      <PenLineIcon size={13} />
                    </button>
                  </div>
                </DataTableTd>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </BaseTab>

      {/* Task detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ''}
        subtitle={selected
          ? <span><code className="font-mono">{selected.schedule ?? '—'}</code>{selected.schedule ? ` — ${describeCron(selected.schedule)}` : ''} · Dernier run : {fmtDate(selected.last_run_at)}</span>
          : undefined}
        badge={selected ? <ModalStatusTag status={selected.status} /> : undefined}
        size="md"
      >
        {selected && (
          <div className="rounded-lg bg-zinc-950 text-zinc-200 font-mono text-xs p-4 space-y-0.5 overflow-y-auto max-h-60 overflow-x-hidden">
            <div>[INFO] Task: {selected.task}</div>
            <div>[INFO] Entry: {selected.name}</div>
            <div>[INFO] Last run: {fmtDate(selected.last_run_at)}</div>
            <div>[INFO] Status: {selected.status}</div>
            {Object.keys(selected.kwargs).length > 0 && (
              <div>[INFO] kwargs: {JSON.stringify(selected.kwargs)}</div>
            )}
            {selected.status === 'error' && (
              <div className="text-red-400">[ERROR] La dernière exécution a échoué.</div>
            )}
            {selected.status === 'running' && (
              <div className="text-green-400">[INFO] En cours d'exécution…</div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────
// Infrastructure Tab
// ─────────────────────────────────────────────

function InfraTab() {
  const [containers, setContainers] = useState<ContainerRow[] | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [logTarget,  setLogTarget]  = useState<ContainerRow | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    apiService.adminLesankofaContainers()
      .then(d => setContainers(d.containers ?? []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <BaseTab loading={loading} error={error} onRetry={load}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Conteneurs Docker actifs sur <strong className="text-foreground">ai.sonnalab.com</strong>
          </p>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCwIcon size={12} /> Rafraîchir
          </button>
        </div>

        {containers && containers.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Aucun conteneur trouvé.</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(containers ?? []).map(c => (
            <Card key={c.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.image}</p>
                </div>
                <StatusBadgeLocal status={c.state} />
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="font-mono">{c.status}</span>
              </div>
              <button
                className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg py-1.5 transition-colors"
                onClick={() => setLogTarget(c)}
              >
                <EyeIcon size={13} /> Voir les logs
              </button>
            </Card>
          ))}
        </div>

        {logTarget && (
          <ContainerLogPanel container={logTarget} onClose={() => setLogTarget(null)} />
        )}
      </div>
    </BaseTab>
  );
}

function ContainerLogPanel({ container, onClose }: { container: ContainerRow; onClose: () => void }) {
  const [lines,   setLines]   = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiService.adminLesankofaContainerLogs(container.name, 150)
      .then(d => {
        setLines(d.lines ?? []);
        if (d.error) setError(d.error);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [container.name]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  return (
    <Modal
      open
      onClose={onClose}
      title={container.name}
      subtitle={container.image}
      badge={<ModalStatusTag status={container.state} />}
      size="lg"
    >
      <div className="flex flex-wrap gap-5 text-sm text-muted-foreground mb-4">
        <span>ID <code className="font-mono text-foreground">{container.id}</code></span>
        <span>{container.status}</span>
      </div>

      <div className="rounded-lg bg-zinc-950 text-zinc-200 font-mono text-xs p-4 h-72 overflow-y-auto overflow-x-hidden">
        {loading && (
          <p className="text-zinc-400 animate-pulse">Chargement des logs…</p>
        )}
        {error && (
          <p className="text-red-400">[ERROR] {error}</p>
        )}
        {!loading && lines.length === 0 && !error && (
          <p className="text-zinc-500">Aucun log disponible.</p>
        )}
        <div className="space-y-0.5">
          {lines.map((l, i) => (
            <div key={i} className="break-all whitespace-pre-wrap">{l}</div>
          ))}
          <div ref={endRef} />
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// Clients Tab
// ─────────────────────────────────────────────

function ClientsTab() {
  const [clients,            setClients]            = useState<AIClientRow[] | null>(null);
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState<string | null>(null);
  const [selectedClient,     setSelectedClient]     = useState<AIClientRow | null>(null);
  const [clientDetail,       setClientDetail]       = useState<AIClientDetail | null>(null);
  const [detailLoading,      setDetailLoading]      = useState(false);

  useEffect(() => {
    apiService.adminLesankofaClients()
      .then(data => setClients(data.clients ?? data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedClient) { setClientDetail(null); return; }
    setDetailLoading(true);
    setClientDetail(null);
    apiService.adminLesankofaClientDetail(selectedClient.id)
      .then(setClientDetail)
      .catch(() => setClientDetail(selectedClient as AIClientDetail))
      .finally(() => setDetailLoading(false));
  }, [selectedClient]);

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">Erreur : {error}</p>
      )}
      <DataTable>
        <DataTableHead>
          <DataTableRow>
            <DataTableTh>Client</DataTableTh>
            <DataTableTh>Total articles</DataTableTh>
            <DataTableTh>Succès</DataTableTh>
            <DataTableTh>Échecs</DataTableTh>
            <DataTableTh>En cours</DataTableTh>
            <DataTableTh>Dernière génération</DataTableTh>
            <DataTableTh>Statut</DataTableTh>
            <DataTableTh>Actions</DataTableTh>
          </DataTableRow>
        </DataTableHead>
        <DataTableBody>
          {!clients && !error && <DataTableEmpty label="Chargement…" />}
          {clients && clients.length === 0 && <DataTableEmpty label="Aucun client" />}
          {clients?.map(c => (
            <DataTableRow key={c.id}>
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
              <DataTableTd>{c.articles_pending}</DataTableTd>
              <DataTableTd>{fmtDate(c.last_generation)}</DataTableTd>
              <DataTableTd><StatusBadgeLocal status={c.is_active ? 'active' : 'paused'} /></DataTableTd>
              <DataTableTd>
                <div className="adm-table__actions">
                  <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" onClick={() => setSelectedClient(c)} title="Détails">
                    <EyeIcon size={13} />
                  </button>
                  <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" title="Modifier (à venir)" disabled>
                    <PenLineIcon size={13} />
                  </button>
                </div>
              </DataTableTd>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      {/* Client detail modal */}
      {selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          detail={clientDetail}
          loading={detailLoading}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </div>
  );
}

function ClientDetailModal({
  client, detail, loading, onClose
}: {
  client: AIClientRow;
  detail: AIClientDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  const d = detail ?? client;
  return (
    <Modal
      open
      onClose={onClose}
      title={d.name}
      subtitle={(d as AIClientDetail).tagline}
      badge={<span className="flex items-center gap-1">{d.is_active ? <CheckCircle2Icon size={9} /> : <XCircleIcon size={9} />}{d.is_active ? 'Actif' : 'Inactif'}</span>}
      size="lg"
    >
      <div className="space-y-6">
          {loading && (
            <p className="text-sm text-muted-foreground text-center py-4">Chargement…</p>
          )}

          {/* Identité */}
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

          {/* Stats articles */}
          <Section title="Articles générés">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {[
                { label: 'Total',    value: d.articles_total,   icon: <LayersIcon       size={16} />, color: 'text-foreground' },
                { label: 'Succès',   value: d.articles_success, icon: <CheckCircle2Icon size={16} />, color: 'text-green-600' },
                { label: 'Échecs',   value: d.articles_failed,  icon: <XCircleIcon      size={16} />, color: d.articles_failed > 0 ? 'text-destructive' : 'text-foreground' },
                { label: 'En cours', value: d.articles_pending, icon: <ZapIcon          size={16} />, color: 'text-foreground' },
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

          {/* Stratégie éditoriale */}
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
          {(d as AIClientDetail).created_at && (
            <p className="text-xs text-muted-foreground">Créé le {fmtDate((d as AIClientDetail).created_at)}</p>
          )}
        </div>
    </Modal>
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
// Model Tab — Animated ER Diagram
// ─────────────────────────────────────────────

const ER_NODES = [
  { id: 'Client',               x: 320, y: 240, color: '#000'    },
  { id: 'APIKey',               x: 80,  y: 80,  color: '#374151' },
  { id: 'AIModel',              x: 580, y: 80,  color: '#374151' },
  { id: 'ArticleGeneration',    x: 620, y: 240, color: '#374151' },
  { id: 'EditorialCalendar',    x: 500, y: 410, color: '#374151' },
  { id: 'SearchTrend',          x: 300, y: 430, color: '#374151' },
  { id: 'SeoOpportunity',       x: 80,  y: 410, color: '#374151' },
  { id: 'Country',              x: 60,  y: 240, color: '#374151' },
];

const ER_EDGES = [
  { from: 'Client', to: 'APIKey',            label: '1:n'     },
  { from: 'Client', to: 'ArticleGeneration', label: '1:n'     },
  { from: 'Client', to: 'EditorialCalendar', label: '1:n'     },
  { from: 'Client', to: 'SearchTrend',       label: 'n:n'     },
  { from: 'Client', to: 'SeoOpportunity',    label: '1:n'     },
  { from: 'Client', to: 'Country',           label: 'n:n'     },
  { from: 'ArticleGeneration', to: 'AIModel', label: 'n:1'   },
];

const ER_ACCENT = '#0891b2';

// ─── Table schema metadata (mirrors src/models/*.py on ai.sonnalab) ───
type SchemaColumn = { name: string; type: string; tag?: 'PK' | 'FK' | 'idx' };
interface EntitySchema {
  table: string;
  icon: React.ReactNode;
  description: string;
  columns: SchemaColumn[];
}

const TABLE_SCHEMAS: Record<string, EntitySchema> = {
  Client: {
    table: 'clients',
    icon: <UsersIcon size={16} />,
    description: 'Fiche complète d’un client : identité, stratégie éditoriale, audience et configuration de publication.',
    columns: [
      { name: 'id',                  type: 'String(64)', tag: 'PK' },
      { name: 'slug',                type: 'String(64)', tag: 'idx' },
      { name: 'name',                type: 'String(100)' },
      { name: 'tagline',             type: 'String(255)' },
      { name: 'description_short',   type: 'Text' },
      { name: 'description_full',    type: 'Text' },
      { name: 'industry',            type: 'String(100)' },
      { name: 'website_url',         type: 'String(255)' },
      { name: 'push_endpoint',       type: 'String(512)' },
      { name: 'objectives',          type: 'JSON' },
      { name: 'target_audience',     type: 'JSON' },
      { name: 'languages',           type: 'JSON' },
      { name: 'geographic_zones',    type: 'JSON' },
      { name: 'primary_locale',      type: 'String' },
      { name: 'content_pillars',     type: 'JSON' },
      { name: 'brand_keywords',      type: 'JSON' },
      { name: 'competitor_keywords', type: 'JSON' },
      { name: 'tone_of_voice',       type: 'String(50)' },
      { name: 'key_features',        type: 'JSON' },
      { name: 'integrations',        type: 'JSON' },
      { name: 'pricing_tiers',       type: 'JSON' },
      { name: 'is_active',           type: 'Boolean' },
      { name: 'unsplash_access_key', type: 'String(128)' },
      { name: 'created_at',          type: 'DateTime' },
      { name: 'updated_at',          type: 'DateTime' },
    ],
  },
  APIKey: {
    table: 'api_keys',
    icon: <ServerIcon size={16} />,
    description: 'Clés d’API d’accès à la plateforme, avec domaines autorisés, permissions et quota de débit.',
    columns: [
      { name: 'api_key',            type: 'String(128)', tag: 'PK' },
      { name: 'client_name',        type: 'String(100)', tag: 'idx' },
      { name: 'client_description', type: 'Text' },
      { name: 'domains',            type: 'JSON' },
      { name: 'permissions',        type: 'JSON' },
      { name: 'rate_limit',         type: 'Integer' },
      { name: 'is_active',          type: 'Boolean', tag: 'idx' },
      { name: 'usage_count',        type: 'Integer' },
      { name: 'last_used_at',       type: 'DateTime' },
      { name: 'last_ip',            type: 'String(45)' },
      { name: 'last_domain',        type: 'String(255)' },
      { name: 'created_at',         type: 'DateTime' },
      { name: 'updated_at',         type: 'DateTime' },
    ],
  },
  AIModel: {
    table: 'ai_models',
    icon: <BrainIcon size={16} />,
    description: 'Catalogue des modèles IA disponibles, leurs quotas, priorités et compteurs d’usage temps réel.',
    columns: [
      { name: 'id',                      type: 'String(64)', tag: 'PK' },
      { name: 'name',                    type: 'String(100)' },
      { name: 'provider',                type: 'String(20)' },
      { name: 'model_identifier',        type: 'String(100)' },
      { name: 'endpoint_url',            type: 'String(500)' },
      { name: 'tier',                    type: 'String(10)' },
      { name: 'priority',                type: 'Integer' },
      { name: 'max_requests_per_minute', type: 'Integer' },
      { name: 'max_requests_per_day',    type: 'Integer' },
      { name: 'max_tokens_per_request',  type: 'Integer' },
      { name: 'total_requests',          type: 'Integer' },
      { name: 'total_tokens_used',       type: 'Integer' },
      { name: 'requests_today',          type: 'Integer' },
      { name: 'tokens_today',            type: 'Integer' },
      { name: 'consecutive_errors',      type: 'Integer' },
      { name: 'is_active',               type: 'Boolean' },
      { name: 'is_available',            type: 'Boolean' },
      { name: 'last_request_at',         type: 'DateTime' },
      { name: 'created_at',              type: 'DateTime' },
      { name: 'updated_at',              type: 'DateTime' },
    ],
  },
  ArticleGeneration: {
    table: 'article_generations',
    icon: <FileTextIcon size={16} />,
    description: 'Trace de chaque génération d’article : prompts, contenu produit, métadonnées SEO et coûts de tokens.',
    columns: [
      { name: 'id',                       type: 'Integer', tag: 'PK' },
      { name: 'client_id',                type: 'String',  tag: 'FK' },
      { name: 'client_trend_id',          type: 'Integer', tag: 'FK' },
      { name: 'search_trend_id',          type: 'Integer', tag: 'FK' },
      { name: 'editorial_calendar_id',    type: 'Integer', tag: 'FK' },
      { name: 'keyword',                  type: 'String(255)', tag: 'idx' },
      { name: 'country_id',               type: 'String(10)' },
      { name: 'locale',                   type: 'String(10)' },
      { name: 'prompt_system',            type: 'Text' },
      { name: 'prompt_user',              type: 'Text' },
      { name: 'seo_rules_snapshot',       type: 'JSON' },
      { name: 'generated_title',          type: 'Text' },
      { name: 'generated_content',        type: 'Text' },
      { name: 'generated_slug',           type: 'String(255)' },
      { name: 'article_format',           type: 'String(50)' },
      { name: 'generated_meta_description', type: 'Text' },
      { name: 'generated_feature_image_url', type: 'String(512)' },
      { name: 'reading_time_minutes',     type: 'Integer' },
      { name: 'word_count',               type: 'Integer' },
      { name: 'status',                   type: 'String(20)', tag: 'idx' },
      { name: 'model_used',               type: 'String(64)' },
      { name: 'provider',                 type: 'String(32)' },
      { name: 'total_tokens',             type: 'Integer' },
      { name: 'generation_time_ms',       type: 'Float' },
    ],
  },
  EditorialCalendar: {
    table: 'editorial_calendar',
    icon: <CalendarDaysIcon size={16} />,
    description: 'Planning éditorial : chaque entrée est un article programmé pour un client, une locale et une date.',
    columns: [
      { name: 'id',                  type: 'Integer', tag: 'PK' },
      { name: 'client_id',           type: 'String',  tag: 'FK' },
      { name: 'weekly_objective_id', type: 'Integer', tag: 'FK' },
      { name: 'seo_opportunity_id',  type: 'Integer', tag: 'FK' },
      { name: 'client_trend_id',     type: 'Integer', tag: 'FK' },
      { name: 'search_trend_id',     type: 'Integer', tag: 'FK' },
      { name: 'keyword',             type: 'String(255)', tag: 'idx' },
      { name: 'locale',              type: 'String(10)', tag: 'idx' },
      { name: 'country_id',          type: 'String',  tag: 'FK' },
      { name: 'topic_cluster',       type: 'String(160)' },
      { name: 'article_format',      type: 'String(50)' },
      { name: 'generation_mode',     type: 'String(40)' },
      { name: 'content_angle',       type: 'Text' },
      { name: 'suggested_title',     type: 'Text' },
      { name: 'priority',            type: 'Integer' },
      { name: 'scheduled_for',       type: 'Date', tag: 'idx' },
      { name: 'status',              type: 'String(30)', tag: 'idx' },
      { name: 'rationale',           type: 'Text' },
      { name: 'reviewer_notes',      type: 'Text' },
      { name: 'planning_metadata',   type: 'JSON' },
      { name: 'created_at',          type: 'DateTime' },
      { name: 'updated_at',          type: 'DateTime' },
    ],
  },
  SearchTrend: {
    table: 'search_trends',
    icon: <TrendingUpIcon size={16} />,
    description: 'Tendances de recherche consolidées par pays et par période : volumes, score et intention.',
    columns: [
      { name: 'id',                type: 'Integer', tag: 'PK' },
      { name: 'country_id',        type: 'String(10)', tag: 'FK' },
      { name: 'keyword',           type: 'String(255)', tag: 'idx' },
      { name: 'related_keywords',  type: 'JSON' },
      { name: 'search_volume',     type: 'Integer' },
      { name: 'volume_avg',        type: 'Float' },
      { name: 'volume_min',        type: 'Float' },
      { name: 'volume_max',        type: 'Float' },
      { name: 'volume_peak_date',  type: 'Date' },
      { name: 'trend_score',       type: 'Float' },
      { name: 'trend_direction',   type: 'String' },
      { name: 'competition_level', type: 'String(20)' },
      { name: 'cpc_estimate',      type: 'Float' },
      { name: 'period_type',       type: 'String' },
      { name: 'period_start',      type: 'Date' },
      { name: 'period_end',        type: 'Date' },
      { name: 'source',            type: 'String(50)' },
      { name: 'search_intent',     type: 'String(30)' },
      { name: 'is_active',         type: 'Boolean' },
      { name: 'created_at',        type: 'DateTime' },
      { name: 'updated_at',        type: 'DateTime' },
    ],
  },
  SeoOpportunity: {
    table: 'seo_opportunities',
    icon: <TargetIcon size={16} />,
    description: 'Opportunités SEO scorées par semaine : croisement tendance × objectif × cluster pour prioriser les contenus.',
    columns: [
      { name: 'id',                       type: 'Integer', tag: 'PK' },
      { name: 'client_id',                type: 'String',  tag: 'FK' },
      { name: 'client_trend_id',          type: 'Integer', tag: 'FK' },
      { name: 'search_trend_id',          type: 'Integer', tag: 'FK' },
      { name: 'strategic_objective_id',   type: 'Integer', tag: 'FK' },
      { name: 'topic_phase_id',           type: 'Integer', tag: 'FK' },
      { name: 'week_start_date',          type: 'Date', tag: 'idx' },
      { name: 'keyword',                  type: 'String(255)', tag: 'idx' },
      { name: 'locale',                   type: 'String(10)', tag: 'idx' },
      { name: 'country_id',               type: 'String',  tag: 'FK' },
      { name: 'topic_cluster',            type: 'String(160)' },
      { name: 'suggested_format',         type: 'String(50)' },
      { name: 'objective_type',           type: 'String(50)', tag: 'idx' },
      { name: 'source',                   type: 'String(40)' },
      { name: 'trend_score',              type: 'Float' },
      { name: 'strategic_fit_score',      type: 'Float' },
      { name: 'content_gap_score',        type: 'Float' },
      { name: 'conversion_score',         type: 'Float' },
      { name: 'total_score',              type: 'Float', tag: 'idx' },
      { name: 'recommendation',           type: 'Text' },
      { name: 'score_snapshot',           type: 'JSON' },
      { name: 'status',                   type: 'String(30)', tag: 'idx' },
      { name: 'created_at',               type: 'DateTime' },
      { name: 'updated_at',               type: 'DateTime' },
    ],
  },
  Country: {
    table: 'countries',
    icon: <GlobeIcon size={16} />,
    description: 'Référentiel des pays ciblés : langue, devise, fuseau et configuration de scraping des tendances.',
    columns: [
      { name: 'id',                      type: 'String(10)', tag: 'PK' },
      { name: 'name',                    type: 'String(100)' },
      { name: 'language',                type: 'String(10)' },
      { name: 'timezone',                type: 'String(50)' },
      { name: 'currency',                type: 'String(10)' },
      { name: 'google_trends_geo',       type: 'String(20)' },
      { name: 'scrape_enabled',          type: 'Boolean' },
      { name: 'scrape_sources',          type: 'JSON' },
      { name: 'last_scraped_daily_at',   type: 'DateTime' },
      { name: 'last_scraped_weekly_at',  type: 'DateTime' },
      { name: 'last_scraped_monthly_at', type: 'DateTime' },
      { name: 'last_scraped_annual_at',  type: 'DateTime' },
      { name: 'created_at',              type: 'DateTime' },
      { name: 'updated_at',              type: 'DateTime' },
    ],
  },
};

function getCenter(id: string) {
  const n = ER_NODES.find(n => n.id === id);
  if (!n) return { x: 0, y: 0 };
  const W = id.length * 6.5 + 24;
  return { x: n.x + W / 2, y: n.y + 18 };
}

function EREdge({ from, to, label, delay, active }: { from: string; to: string; label: string; delay: number; active: boolean }) {
  const s = getCenter(from);
  const e = getCenter(to);
  // Midpoint for label
  const mx = (s.x + e.x) / 2;
  const my = (s.y + e.y) / 2;
  const dx = e.x - s.x;
  const dy = e.y - s.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  return (
    <g>
      <motion.line
        x1={s.x} y1={s.y} x2={e.x} y2={e.y}
        stroke={active ? ER_ACCENT : '#cbd5e1'}
        strokeWidth={active ? 2 : 1.5}
        markerEnd={active ? 'url(#arrow-active)' : 'url(#arrow)'}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay, ease: 'easeOut' }}
        style={{ strokeDasharray: len, strokeDashoffset: len }}
      />
      {/* Flowing dash overlay highlighting the active relation */}
      {active && (
        <motion.line
          x1={s.x} y1={s.y} x2={e.x} y2={e.y}
          stroke={ER_ACCENT}
          strokeWidth={2}
          strokeLinecap="round"
          style={{ strokeDasharray: '3 9' }}
          animate={{ strokeDashoffset: [0, -24] }}
          transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
        />
      )}
      <text
        x={mx} y={my - 5}
        fill={active ? ER_ACCENT : '#94a3b8'}
        fontSize={9}
        fontWeight={active ? 700 : 400}
        textAnchor="middle"
      >
        {label}
      </text>
    </g>
  );
}

function ERNode({
  node, delay, active, dimmed, onHover, onSelect,
}: {
  node: { id: string; x: number; y: number; color: string };
  delay: number;
  active: boolean;
  dimmed: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const { id, x, y, color } = node;
  const W = id.length * 6.5 + 24;
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: dimmed ? 0.4 : 1, scale: active ? 1.08 : 1 }}
      transition={{ duration: 0.4, delay, type: 'spring', stiffness: 280, damping: 22 }}
      style={{ transformOrigin: `${x + W / 2}px ${y + 18}px`, cursor: 'pointer' }}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(id)}
    >
      {active && (
        <rect x={x - 3} y={y - 3} width={W + 6} height={42} rx={11} fill="none" stroke={ER_ACCENT} strokeWidth={2} />
      )}
      <rect x={x} y={y} width={W} height={36} rx={8} fill={color} />
      <text x={x + W / 2} y={y + 23} fill="#fff" fontSize={11} textAnchor="middle" fontFamily="monospace" fontWeight="600">
        {id}
      </text>
    </motion.g>
  );
}

function SchemaModal({ entity, onClose }: { entity: string | null; onClose: () => void }) {
  const schema = entity ? TABLE_SCHEMAS[entity] : null;
  const relations = entity
    ? ER_EDGES
        .filter(e => e.from === entity || e.to === entity)
        .map(e => ({
          target: e.from === entity ? e.to : e.from,
          label: e.label,
          dir: e.from === entity ? 'sortante' : 'entrante',
        }))
    : [];

  const TAG_STYLE: Record<string, string> = {
    PK:  'bg-primary text-primary-foreground',
    FK:  'bg-cyan-100 text-cyan-700',
    idx: 'bg-muted text-muted-foreground',
  };

  return (
    <Modal
      open={!!entity}
      onClose={onClose}
      size="lg"
      title={entity ?? ''}
      subtitle={schema && <span className="font-mono text-xs">{schema.table}</span>}
      badge={schema?.icon}
    >
      {schema && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">{schema.description}</p>

          <Section title={`Colonnes · ${schema.columns.length}`}>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-xs text-muted-foreground">
                    <th className="text-left font-medium px-3 py-2">Colonne</th>
                    <th className="text-left font-medium px-3 py-2">Type</th>
                    <th className="text-left font-medium px-3 py-2 w-20">Clé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {schema.columns.map(c => (
                    <tr key={c.name} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-1.5 font-mono text-xs text-foreground">{c.name}</td>
                      <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{c.type}</td>
                      <td className="px-3 py-1.5">
                        {c.tag && (
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${TAG_STYLE[c.tag]}`}>
                            {c.tag}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {relations.length > 0 && (
            <Section title={`Relations · ${relations.length}`}>
              <div className="flex flex-wrap gap-2">
                {relations.map((r, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs"
                  >
                    <span className="font-mono font-semibold text-cyan-700">{r.label}</span>
                    <ChevronRightIcon size={12} className="text-muted-foreground" />
                    <span className="font-medium text-foreground">{r.target}</span>
                  </span>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </Modal>
  );
}

function ModelTab() {
  const [hovered,  setHovered]  = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const focus = hovered ?? selected;

  const isEdgeActive = (from: string, to: string) =>
    focus !== null && (from === focus || to === focus);
  const isNodeActive = (id: string) =>
    focus !== null && (id === focus || ER_EDGES.some(e =>
      (e.from === focus && e.to === id) || (e.to === focus && e.from === id)));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <LayersIcon size={14} className="text-primary" />
        <span>Survolez une entité pour voir ses relations, cliquez pour ouvrir sa structure de table.</span>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 overflow-x-auto">
        <svg viewBox="0 0 740 490" className="w-full min-w-[480px]" style={{ maxHeight: 480 }}>
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#cbd5e1" />
            </marker>
            <marker id="arrow-active" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill={ER_ACCENT} />
            </marker>
          </defs>

          {/* Edges first (behind nodes) */}
          {ER_EDGES.map((e, i) => (
            <EREdge
              key={`${e.from}-${e.to}`}
              from={e.from} to={e.to} label={e.label}
              delay={0.5 + i * 0.1}
              active={isEdgeActive(e.from, e.to)}
            />
          ))}

          {/* Nodes */}
          {ER_NODES.map((n, i) => (
            <ERNode
              key={n.id}
              node={n}
              delay={i * 0.07}
              active={focus === n.id || isNodeActive(n.id)}
              dimmed={focus !== null && focus !== n.id && !isNodeActive(n.id)}
              onHover={setHovered}
              onSelect={setSelected}
            />
          ))}

          {/* Legend */}
          <text x={10} y={478} fill="#94a3b8" fontSize={9}>1:n = un à plusieurs  ·  n:n = plusieurs à plusieurs  ·  n:1 = plusieurs à un</text>
        </svg>
      </div>

      <SchemaModal entity={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// ─────────────────────────────────────────────
// KPI card helper
// ─────────────────────────────────────────────

function KpiCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="flex-1 min-w-0 p-4 space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </Card>
  );
}

function fmtNum(n: number) {
  return new Intl.NumberFormat('fr').format(n);
}

// ─────────────────────────────────────────────
// Page root
// ─────────────────────────────────────────────

const VALID_TABS = ['overview', 'tasks', 'models', 'infrastructure', 'clients', 'model'] as const;
type TabValue = typeof VALID_TABS[number];

function readHashTab(): TabValue {
  const hash = window.location.hash.replace('#tab-', '');
  return (VALID_TABS as readonly string[]).includes(hash) ? (hash as TabValue) : 'overview';
}

export default function AdminLesankofa() {
  const [tab, setTab] = useState<TabValue>(readHashTab);

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
    <div className="admin-news">
      <header className="admin-news__header">
        <div className="admin-news__header-title">
          <BrainIcon size={22} />
          <h1>Lesankofa AI</h1>
        </div>
        <p className="admin-news__header-sub">Tableau de bord IA — modèles, tâches, infrastructure, clients</p>
      </header>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="overview"       icon={<TrendingUpIcon   size={14} />}>Overview</TabsTrigger>
          <TabsTrigger value="tasks"          icon={<ZapIcon          size={14} />}>Tasks</TabsTrigger>
          <TabsTrigger value="models"         icon={<BrainIcon        size={14} />}>Modèles</TabsTrigger>
          <TabsTrigger value="infrastructure" icon={<ServerIcon       size={14} />}>Infrastructure</TabsTrigger>
          <TabsTrigger value="clients"        icon={<UsersIcon        size={14} />}>Clients</TabsTrigger>
          <TabsTrigger value="model"          icon={<LayersIcon       size={14} />}>Schéma</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="tasks">
          <TasksTab />
        </TabsContent>
        <TabsContent value="models">
          <ModelsTab />
        </TabsContent>
        <TabsContent value="infrastructure">
          <InfraTab />
        </TabsContent>
        <TabsContent value="clients">
          <ClientsTab />
        </TabsContent>
        <TabsContent value="model">
          <ModelTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
