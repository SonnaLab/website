import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { apiService } from '@/services/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/common/Tabs';
import { DataTable, DataTableHead, DataTableBody, DataTableRow, DataTableTh, DataTableTd, DataTableEmpty } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import {
  BrainIcon,
  EyeIcon,
  RefreshCwIcon,
  ZapIcon,
  LayersIcon,
  UsersIcon,
  ServerIcon,
  TrendingUpIcon,
} from '@icons';

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
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  articles_total: number;
  articles_success: number;
  articles_failed: number;
  articles_pending: number;
  last_generation: string | null;
}

// ─────────────────────────────────────────────
// Mock data (Tasks + Infrastructure — brancher sur endpoints à créer)
// ─────────────────────────────────────────────

const MOCK_TASKS = [
  { id: 1, name: 'article_generation',   schedule: '0 */2 * * *',  last_run: '2026-05-25T08:00:00Z', status: 'idle'    },
  { id: 2, name: 'seo_scraping',         schedule: '0 3 * * *',    last_run: '2026-05-25T03:00:00Z', status: 'idle'    },
  { id: 3, name: 'keyword_analysis',     schedule: '30 4 * * 1',   last_run: '2026-05-19T04:30:00Z', status: 'idle'    },
  { id: 4, name: 'sitemap_refresh',      schedule: '0 * * * *',    last_run: '2026-05-25T09:00:00Z', status: 'running' },
  { id: 5, name: 'quota_reset',          schedule: '0 0 * * *',    last_run: '2026-05-25T00:00:00Z', status: 'idle'    },
  { id: 6, name: 'image_asset_cleanup',  schedule: '0 2 * * 0',    last_run: '2026-05-18T02:00:00Z', status: 'error'   },
];

const MOCK_CONTAINERS = [
  { id: 'ai-web',         image: 'ai.sonnalab.com:latest', status: 'running', started: '2026-05-24T10:00:00Z', cpu: '1.2%',  mem: '320 MiB' },
  { id: 'ai-celery',      image: 'ai.sonnalab.com:latest', status: 'running', started: '2026-05-24T10:01:00Z', cpu: '0.4%',  mem: '180 MiB' },
  { id: 'ai-celery-beat', image: 'ai.sonnalab.com:latest', status: 'running', started: '2026-05-24T10:01:00Z', cpu: '0.1%',  mem: '95 MiB'  },
  { id: 'ai-redis',       image: 'redis:7-alpine',         status: 'running', started: '2026-05-24T09:58:00Z', cpu: '0.05%', mem: '28 MiB'  },
  { id: 'ai-postgres',    image: 'postgres:16-alpine',     status: 'running', started: '2026-05-24T09:57:00Z', cpu: '0.8%',  mem: '410 MiB' },
];

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

function OverviewTab() {
  const [models,  setModels]  = useState<AIModelRow[] | null>(null);
  const [stats,   setStats]   = useState<AIStatsRow  | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiService.adminLesankofaModels(),
      apiService.adminLesankofaModelStats(),
    ])
      .then(([m, s]) => { setModels(m); setStats(s); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <KpiCard label="Modèles actifs"      value={stats ? String(stats.active_models)          : '—'} icon={<BrainIcon size={16} />}       />
        <KpiCard label="Requêtes aujourd'hui" value={stats ? String(stats.total_requests_today)  : '—'} icon={<ZapIcon   size={16} />}       />
        <KpiCard label="Tokens aujourd'hui"  value={stats ? fmtNum(stats.total_tokens_today)     : '—'} icon={<LayersIcon size={16} />}      />
        <KpiCard label="Clients actifs"      value={String(stats ? (stats.active_clients ?? '—') : '—')} icon={<UsersIcon  size={16} />}       />
      </div>

      {/* Actions row */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCwIcon className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
          Erreur API AI : {error}
        </p>
      )}

      {/* Models table */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Modèles IA</h3>
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
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {!models && !error && (
              <DataTableEmpty label="Chargement…" />
            )}
            {models && models.length === 0 && (
              <DataTableEmpty label="Aucun modèle trouvé" />
            )}
            {models?.map(m => (
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
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </div>

      {/* Recent activity — derived from models */}
      {models && models.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Modèles récemment actifs</h3>
          <div className="space-y-2">
            {models.filter(m => m.requests_today > 0).slice(0, 4).map(m => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div>
                  <span className="font-medium text-sm">{m.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{m.provider}</span>
                </div>
                <span className="text-xs text-muted-foreground">{m.requests_today} req. aujourd'hui</span>
              </div>
            ))}
            {models.every(m => m.requests_today === 0) && (
              <p className="text-sm text-muted-foreground">Aucune requête aujourd'hui.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Tasks Tab
// ─────────────────────────────────────────────

function TasksTab() {
  const [selected, setSelected] = useState<typeof MOCK_TASKS[0] | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Tâches Celery périodiques. Les données ci-dessous sont statiques — brancher sur{' '}
        <code>GET /api/v1/admin/tasks</code> une fois l'endpoint créé côté AI.
      </p>

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
          {MOCK_TASKS.map(t => (
            <DataTableRow key={t.id}>
              <DataTableTd>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{t.name}</code>
              </DataTableTd>
              <DataTableTd>
                <code className="text-xs text-muted-foreground">{t.schedule}</code>
              </DataTableTd>
              <DataTableTd>{fmtDate(t.last_run)}</DataTableTd>
              <DataTableTd><StatusBadgeLocal status={t.status} /></DataTableTd>
              <DataTableTd>
                <button
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setSelected(t)}
                >
                  <EyeIcon size={14} /> Voir
                </button>
              </DataTableTd>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      {/* Task detail modal */}
      <AnimatePresence>
        {selected && (
          <TaskDetailPanel task={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function TaskDetailPanel({ task, onClose }: { task: typeof MOCK_TASKS[0]; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={onClose}
    >
      <motion.div
        className="bg-background rounded-xl border border-border w-full max-w-lg p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-foreground">{task.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Planification : <code>{task.schedule}</code></p>
          </div>
          <StatusBadgeLocal status={task.status} />
        </div>
        <div className="rounded-lg bg-muted p-4 text-xs font-mono space-y-1 max-h-48 overflow-auto">
          <div className="text-muted-foreground">[INFO] Task {task.name} — last run {fmtDate(task.last_run)}</div>
          <div className="text-muted-foreground">[INFO] Status : {task.status}</div>
          {task.status === 'error' && (
            <div className="text-destructive">[ERROR] Connexion refusée au service de nettoyage d'assets</div>
          )}
          {task.status === 'running' && (
            <div className="text-green-600">[INFO] En cours d'exécution…</div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onClose} className="w-full">Fermer</Button>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Infrastructure Tab
// ─────────────────────────────────────────────

function InfraTab() {
  const [logTarget, setLogTarget] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Conteneurs Docker actifs sur <strong>ai.sonnalab.com</strong>. Données statiques — brancher sur{' '}
        <code>GET /api/v1/admin/containers</code> pour les valeurs en temps réel.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MOCK_CONTAINERS.map(c => (
          <Card key={c.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-sm text-foreground">{c.id}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.image}</p>
              </div>
              <StatusBadgeLocal status={c.status} />
            </div>
            <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
              <span>CPU</span>   <span className="text-right font-mono">{c.cpu}</span>
              <span>Mémoire</span> <span className="text-right font-mono">{c.mem}</span>
              <span>Démarré</span> <span className="text-right">{fmtDateShort(c.started)}</span>
            </div>
            <button
              className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg py-1.5 transition-colors"
              onClick={() => setLogTarget(c.id)}
            >
              <EyeIcon size={13} /> Logs en temps réel
            </button>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {logTarget && (
          <ContainerLogPanel containerId={logTarget} onClose={() => setLogTarget(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function ContainerLogPanel({ containerId, onClose }: { containerId: string; onClose: () => void }) {
  const [lines, setLines] = useState<string[]>([
    `[INFO]  Attaching to ${containerId}…`,
    `[INFO]  Worker prêt`,
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  // Simulate log streaming
  useEffect(() => {
    const msgs = [
      `[INFO]  Heartbeat OK`,
      `[DEBUG] Queue vide`,
      `[INFO]  Connexion DB établie`,
      `[INFO]  Requête traitée en 38ms`,
      `[DEBUG] Cache hit`,
      `[INFO]  Token usage: 1240 tokens`,
    ];
    let i = 0;
    const id = setInterval(() => {
      setLines(prev => [...prev.slice(-200), msgs[i % msgs.length]]);
      i++;
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 1200);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <motion.div
        className="bg-background rounded-xl border border-border w-full max-w-2xl p-6 space-y-3"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-sm">
            Logs — <code className="text-xs">{containerId}</code>
          </h3>
          <Button variant="outline" size="sm" onClick={onClose}>Fermer</Button>
        </div>
        <div className="rounded-lg bg-zinc-950 text-zinc-200 font-mono text-xs p-4 h-64 overflow-y-auto space-y-0.5">
          {lines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
          <div ref={endRef} />
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Clients Tab
// ─────────────────────────────────────────────

function ClientsTab() {
  const [clients,  setClients]  = useState<AIClientRow[] | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    apiService.adminLesankofaClients()
      .then(data => setClients(data.clients ?? data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
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
    <Card className="p-4 space-y-1">
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

export default function AdminLesankofa() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="admin-news">
      <header className="admin-news__header">
        <div className="admin-news__header-title">
          <BrainIcon size={22} />
          <h1>Lesankofa AI</h1>
        </div>
        <p className="admin-news__header-sub">Tableau de bord IA — modèles, tâches, infrastructure, clients</p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview"       icon={<TrendingUpIcon   size={14} />}>Overview</TabsTrigger>
          <TabsTrigger value="tasks"          icon={<ZapIcon          size={14} />}>Tasks</TabsTrigger>
          <TabsTrigger value="infrastructure" icon={<ServerIcon       size={14} />}>Infrastructure</TabsTrigger>
          <TabsTrigger value="clients"        icon={<UsersIcon        size={14} />}>Clients</TabsTrigger>
          <TabsTrigger value="model"          icon={<LayersIcon       size={14} />}>Model</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="tasks">
          <TasksTab />
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
