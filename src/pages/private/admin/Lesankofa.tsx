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

function eventLabel(e: LesankofaEvent): string {
  const client = e.client_id ? ` · ${e.client_id}` : '';
  switch (e.event_type) {
    case 'task_run':          return `Tâche ${e.entity_name ?? ''}${client}`;
    case 'article_generated': return `Article généré${client}${e.entity_name ? ` — ${e.entity_name}` : ''}`;
    case 'push_success':      return `Push réussi${client}${e.entity_name ? ` — ${e.entity_name}` : ''}`;
    case 'push_failed':       return `Push échoué${client}${e.entity_name ? ` — ${e.entity_name}` : ''}`;
    default:                  return e.entity_name ?? e.event_type;
  }
}

function eventIcon(e: LesankofaEvent) {
  if (e.status === 'error' || e.event_type === 'push_failed')
    return <XCircleIcon size={13} className="text-destructive flex-shrink-0" />;
  if (e.status === 'success' || e.event_type === 'push_success')
    return <CheckCircle2Icon size={13} className="text-green-500 flex-shrink-0" />;
  return <ZapIcon size={13} className="text-muted-foreground flex-shrink-0" />;
}

function RecentActivityCard() {
  const [events,  setEvents]  = useState<LesankofaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    apiService.adminLesankofaHistory(10)
      .then((d: { events: LesankofaEvent[] }) => setEvents(d.events ?? []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Activité récente</h3>
        <button
          onClick={load}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCwIcon size={11} className={loading ? 'animate-spin' : ''} /> Actualiser
        </button>
      </div>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
      {!error && events.length === 0 && !loading && (
        <p className="text-xs text-muted-foreground py-2">Aucune activité enregistrée.</p>
      )}
      {events.length > 0 && (
        <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {events.slice(0, 10).map(e => (
            <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 bg-background hover:bg-muted/30 transition-colors">
              {eventIcon(e)}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{eventLabel(e)}</p>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">{fmtDate(e.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
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
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Total',    value: d.articles_total,   variant: '' },
                { label: 'Succès',   value: d.articles_success, variant: 'text-green-600' },
                { label: 'Échecs',   value: d.articles_failed,  variant: d.articles_failed > 0 ? 'text-destructive' : '' },
                { label: 'En cours', value: d.articles_pending, variant: '' },
              ].map(({ label, value, variant }) => (
                <div key={label} className="rounded-lg border border-border p-3 text-center">
                  <p className={`text-xl font-bold ${variant}`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
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

function getCenter(id: string) {
  const n = ER_NODES.find(n => n.id === id);
  if (!n) return { x: 0, y: 0 };
  const W = id.length * 6.5 + 24;
  return { x: n.x + W / 2, y: n.y + 18 };
}

function EREdge({ from, to, label, delay }: { from: string; to: string; label: string; delay: number }) {
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
        stroke="#94a3b8"
        strokeWidth={1.5}
        markerEnd="url(#arrow)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay, ease: 'easeOut' }}
        style={{ strokeDasharray: len, strokeDashoffset: len }}
      />
      <text x={mx} y={my - 5} fill="#64748b" fontSize={9} textAnchor="middle">{label}</text>
    </g>
  );
}

function ERNode({ id, x, y, color, delay }: { id: string; x: number; y: number; color: string; delay: number }) {
  const W = id.length * 6.5 + 24;
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay, type: 'spring', stiffness: 280, damping: 22 }}
      style={{ transformOrigin: `${x + W / 2}px ${y + 18}px` }}
    >
      <rect x={x} y={y} width={W} height={36} rx={8} fill={color} />
      <text x={x + W / 2} y={y + 23} fill="#fff" fontSize={11} textAnchor="middle" fontFamily="monospace" fontWeight="600">
        {id}
      </text>
    </motion.g>
  );
}

function ModelTab() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Diagramme des relations entre les entités principales de la base de données AI.
      </p>
      <div className="rounded-xl border border-border bg-muted/30 overflow-x-auto">
        <svg viewBox="0 0 740 490" className="w-full min-w-[480px]" style={{ maxHeight: 480 }}>
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" />
            </marker>
          </defs>

          {/* Edges first (behind nodes) */}
          {ER_EDGES.map((e, i) => (
            <EREdge key={`${e.from}-${e.to}`} from={e.from} to={e.to} label={e.label} delay={0.5 + i * 0.1} />
          ))}

          {/* Nodes */}
          {ER_NODES.map((n, i) => (
            <ERNode key={n.id} id={n.id} x={n.x} y={n.y} color={n.color} delay={i * 0.07} />
          ))}

          {/* Legend */}
          <text x={10} y={478} fill="#94a3b8" fontSize={9}>1:n = un à plusieurs  ·  n:n = plusieurs à plusieurs  ·  n:1 = plusieurs à un</text>
        </svg>
      </div>
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
