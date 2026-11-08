/**
 * Onglet Schéma : la boucle du moteur DSV, animée, et les tables qu'écrit
 * chaque étape. Tout vient de GET /admin/lesankofa/schema (étapes déclarées à
 * côté du pipeline, horaires du planificateur Celery, colonnes et volumes lus
 * dans la base) : rien n'est recopié ici.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { apiService } from '@/services/api';
import { StatusBadge } from '@/components/common/StatusBadge';
import { cronLabel, formatDateTime, nextCronRunUtc } from '../infrastructure/format';
import { ErrorNote } from './shared';

// ─── Contrat de l'API ───────────────────────────────────────────────

interface BeatEntry { name: string; task: string | null; cron: string | null }
interface Stage {
  key: string;
  label: string;
  trigger: 'schedule' | 'owner' | 'external';
  beat: BeatEntry[];
  tables: string[];
  description: string;
}
interface Edge { from: string; to: string; kind: 'loop' | 'side' | 'retry'; label?: string }
interface Column { name: string; type: string; nullable: boolean; primary_key: boolean; foreign_key: string | null; indexed: boolean }
interface TableInfo { exists: boolean; columns: Column[]; rows: number | null; rows_estimated: boolean }
interface SchemaMap { stages: Stage[]; loop: string[]; edges: Edge[]; tables: Record<string, TableInfo> }

// ─── Géométrie : la boucle sur une ellipse, étapes à distance égale ─────

const VIEW = { w: 1000, h: 660 };
const RING = { cx: 500, cy: 330, rx: 420, ry: 250 };
const NODE = { w: 136, h: 58 };
const START = 0.42; // angle de la première étape (Demande), en haut à gauche
const PERIOD_PER_STAGE = 1400; // ms passées sur chaque étape par le flux

type Point = { x: number; y: number };

const onRing = (phi: number): Point => ({ x: RING.cx - RING.rx * Math.cos(phi), y: RING.cy - RING.ry * Math.sin(phi) });

/** Échantillons de l'ellipse (sens horaire depuis START) avec leur abscisse curviligne. */
function sampleRing(steps = 1440) {
  const points: Point[] = [];
  const lengths: number[] = [0];
  for (let i = 0; i <= steps; i += 1) {
    points.push(onRing(START + (i / steps) * Math.PI * 2));
    if (i) lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  return { points, lengths, total: lengths[steps] };
}

function pointAt(ring: ReturnType<typeof sampleRing>, fraction: number): Point {
  const target = (((fraction % 1) + 1) % 1) * ring.total;
  let lo = 0;
  let hi = ring.lengths.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (ring.lengths[mid] < target) lo = mid + 1; else hi = mid;
  }
  return ring.points[lo];
}

const ringPath = (ring: ReturnType<typeof sampleRing>) =>
  ring.points.filter((_, i) => i % 6 === 0).map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';

const INNER: Record<string, Point> = {
  sources: { x: RING.cx - 175, y: RING.cy + 10 },
  config: { x: RING.cx + 175, y: RING.cy + 10 },
};

// ─── Composant ──────────────────────────────────────────────────────

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
};

export function SchemaTab() {
  const { t, i18n } = useTranslation('admin');
  const [map, setMap] = useState<SchemaMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0);
  const reduced = usePrefersReducedMotion();
  const particles = useRef<(SVGCircleElement | null)[]>([]);
  const locale = i18n.language;

  useEffect(() => {
    apiService.adminLesankofaSchema().then(setMap).catch((e: Error) => setError(e.message));
  }, []);

  const ring = useMemo(sampleRing, []);
  const loop = map?.loop ?? [];
  const positions = useMemo(() => {
    const out: Record<string, Point> = { ...INNER };
    loop.forEach((key, i) => { out[key] = pointAt(ring, i / loop.length); });
    return out;
  }, [loop, ring]);
  const stages = useMemo(() => Object.fromEntries((map?.stages ?? []).map((s) => [s.key, s])), [map]);

  // Le flux : une tête et sa traîne parcourent la boucle ; l'étape atteinte s'allume.
  useEffect(() => {
    if (!loop.length || reduced) return;
    const period = loop.length * PERIOD_PER_STAGE;
    let frame = 0;
    let last = -1;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = ((now - start) % period) / period;
      particles.current.forEach((el, i) => {
        if (!el) return;
        const p = pointAt(ring, progress - i * 0.012);
        el.setAttribute('cx', p.x.toFixed(1));
        el.setAttribute('cy', p.y.toFixed(1));
      });
      const stage = Math.floor(progress * loop.length + 0.5) % loop.length;
      if (stage !== last) { last = stage; setPulse(stage); }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [loop, ring, reduced]);

  if (error) return <ErrorNote>Impossible de charger le schéma du moteur : {error}</ErrorNote>;
  if (!map) return <p className="trk-loading">{t('common.loading')}</p>;

  const focus = hovered ?? selected;
  const linked = (key: string) => !focus || key === focus
    || map.edges.some((e) => (e.from === focus && e.to === key) || (e.to === focus && e.from === key));
  const edgeOn = (e: Edge) => !focus || e.from === focus || e.to === focus;
  const pulseKey = reduced ? null : loop[pulse];

  const rowsOf = (stage: Stage) => stage.tables.reduce((sum, name) => sum + (map.tables[name]?.rows ?? 0), 0);
  const fmt = (n: number) => new Intl.NumberFormat(locale).format(n);
  const triggerText = (stage: Stage) => {
    if (stage.trigger === 'owner') return 'Propriétaire';
    if (stage.trigger === 'external') return 'Externe';
    const crons = stage.beat.map((b) => b.cron).filter(Boolean) as string[];
    const times = crons.map((c) => {
      const [m, h] = c.split(/\s+/);
      return /^\d+$/.test(m) && /^\d+$/.test(h) ? `${h.padStart(2, '0')}:${m.padStart(2, '0')}` : c;
    });
    return times.length ? `${[...new Set(times)].join(' · ')} UTC` : 'Planifié';
  };

  const sideEdges = map.edges.filter((e) => e.kind !== 'loop');
  const loopEdges = map.edges.filter((e) => e.kind === 'loop');
  const totalRows = Object.values(map.tables).reduce((s, tb) => s + (tb.rows ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="lsk-flow__legend">
        <span><i className="lsk-flow__dot lsk-flow__dot--schedule" /> Planifié (Celery, UTC)</span>
        <span><i className="lsk-flow__dot lsk-flow__dot--owner" /> Action du propriétaire</span>
        <span><i className="lsk-flow__dot lsk-flow__dot--external" /> Entrée externe</span>
        <span><i className="lsk-flow__dash lsk-flow__dash--retry" /> Retour en rédaction</span>
        <span className="lsk-flow__legend-total">
          {map.stages.length} étapes · {Object.keys(map.tables).length} tables · {fmt(totalRows)} lignes
        </span>
      </div>

      <div className="lsk-flow">
        <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="lsk-flow__svg" role="img" aria-label="Boucle du moteur DSV">
          <defs>
            <marker id="lsk-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,1 L9,5 L0,9 z" className="lsk-flow__arrowhead" />
            </marker>
            <filter id="lsk-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* La piste de la boucle */}
          <path d={ringPath(ring)} className="lsk-flow__track" />
          {loopEdges.map((e, i) => {
            const mid = pointAt(ring, (i + 0.5) / loop.length);
            const ahead = pointAt(ring, (i + 0.5) / loop.length + 0.004);
            const angle = (Math.atan2(ahead.y - mid.y, ahead.x - mid.x) * 180) / Math.PI;
            const closing = e.from === loop[loop.length - 1];
            return (
              <g key={`${e.from}-${e.to}`} transform={`translate(${mid.x},${mid.y}) rotate(${angle})`}
                 className={edgeOn(e) ? 'lsk-flow__chevron' : 'lsk-flow__chevron lsk-flow__chevron--dim'}>
                <path d="M-6,-6 L4,0 L-6,6" />
                {closing && <text y={-12} className="lsk-flow__edge-label" transform={`rotate(${-angle})`}>la boucle se referme</text>}
              </g>
            );
          })}

          {/* Flux secondaires : entrées, configuration lue, retour en rédaction */}
          {sideEdges.map((e) => {
            const a = positions[e.from];
            const b = positions[e.to];
            if (!a || !b) return null;
            let c: Point;
            if (e.kind === 'retry') {
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              const dx = mx - RING.cx;
              const dy = my - RING.cy;
              const norm = Math.hypot(dx, dy) || 1;
              c = { x: mx + (dx / norm) * 120, y: my + (dy / norm) * 120 };
            } else {
              c = { x: (a.x + b.x) / 2 + (b.y - a.y) * 0.12, y: (a.y + b.y) / 2 - (b.x - a.x) * 0.12 };
            }
            const d = `M${a.x},${a.y} Q${c.x},${c.y} ${b.x},${b.y}`;
            const lx = 0.25 * a.x + 0.5 * c.x + 0.25 * b.x;
            const ly = 0.25 * a.y + 0.5 * c.y + 0.25 * b.y;
            const on = edgeOn(e);
            return (
              <g key={`${e.from}-${e.to}`} className={on ? '' : 'lsk-flow__dim'}>
                <path d={d} className={`lsk-flow__side lsk-flow__side--${e.kind}${reduced ? '' : ' lsk-flow__side--moving'}`} />
                {e.label && <text x={lx} y={ly - 4} className={`lsk-flow__edge-label lsk-flow__edge-label--${e.kind}`}>{e.label}</text>}
              </g>
            );
          })}

          {/* Le flux qui parcourt la boucle */}
          {!reduced && [0, 1, 2, 3, 4].map((i) => (
            <circle key={i} ref={(el) => { particles.current[i] = el; }} r={i ? 4.5 - i * 0.6 : 6}
                    className="lsk-flow__particle" style={{ opacity: 1 - i * 0.17 }} />
          ))}

          {/* Les étapes */}
          {[...Object.keys(INNER), ...loop].map((key) => {
            const stage = stages[key];
            const p = positions[key];
            if (!stage || !p) return null;
            const isPulse = key === pulseKey;
            const isSelected = key === selected;
            const rows = rowsOf(stage);
            return (
              <g key={key}
                 transform={`translate(${p.x - NODE.w / 2},${p.y - NODE.h / 2})`}
                 className={['lsk-flow__node', `lsk-flow__node--${stage.trigger}`, isPulse ? 'lsk-flow__node--pulse' : '',
                   isSelected ? 'lsk-flow__node--selected' : '', linked(key) ? '' : 'lsk-flow__dim'].filter(Boolean).join(' ')}
                 role="button" tabIndex={0} aria-label={stage.label}
                 onMouseEnter={() => setHovered(key)} onMouseLeave={() => setHovered(null)}
                 onClick={() => setSelected(isSelected ? null : key)}
                 onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setSelected(isSelected ? null : key); } }}>
                <rect width={NODE.w} height={NODE.h} rx={11} className="lsk-flow__node-box"
                      filter={isPulse ? 'url(#lsk-glow)' : undefined} />
                <rect width={5} height={NODE.h - 18} x={0} y={9} rx={2.5} className="lsk-flow__node-tick" />
                <text x={NODE.w / 2} y={22} className="lsk-flow__node-label">{stage.label}</text>
                <text x={NODE.w / 2} y={37} className="lsk-flow__node-sub">{triggerText(stage)}</text>
                {stage.tables.length > 0 && (
                  <text x={NODE.w / 2} y={50} className="lsk-flow__node-rows">
                    {stage.tables.length} table{stage.tables.length > 1 ? 's' : ''} · {fmt(rows)}
                  </text>
                )}
              </g>
            );
          })}

          <text x={RING.cx} y={RING.cy - 70} className="lsk-flow__center-title">Moteur DSV</text>
          <text x={RING.cx} y={RING.cy - 50} className="lsk-flow__center-sub">Demande · Vérité · Supériorité</text>
        </svg>
      </div>

      <p className="text-xs text-muted-foreground">
        Survole une étape pour voir ses flux, clique pour ouvrir ses tables (colonnes et volumes lus dans la base).
      </p>

      {selected && stages[selected] && (
        <StageDetails stage={stages[selected]} tables={map.tables} locale={locale} t={t} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function StageDetails({ stage, tables, locale, t, onClose }: {
  stage: Stage;
  tables: Record<string, TableInfo>;
  locale: string;
  t: ReturnType<typeof useTranslation>['t'];
  onClose: () => void;
}) {
  const fmt = (n: number) => new Intl.NumberFormat(locale).format(n);
  const trigger = { schedule: 'Planifié', owner: 'Propriétaire', external: 'Externe' }[stage.trigger];
  return (
    <section className="lsk-flow__details">
      <header className="lsk-flow__details-head">
        <div>
          <h3>{stage.label} <StatusBadge label={trigger} variant={stage.trigger === 'schedule' ? 'info' : stage.trigger === 'owner' ? 'warning' : 'muted'} /></h3>
          <p>{stage.description}</p>
        </div>
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={onClose}>Fermer</button>
      </header>

      {stage.beat.length > 0 && (
        <ul className="lsk-flow__beats">
          {stage.beat.map((b) => (
            <li key={b.name}>
              <code>{b.name}</code>
              <span>{cronLabel(b.cron, t)}{b.cron ? ' (UTC)' : ''}</span>
              <span className="lsk-flow__muted">prochaine : {formatDateTime(nextCronRunUtc(b.cron), locale)}</span>
            </li>
          ))}
        </ul>
      )}

      {stage.tables.length === 0 && <p className="lsk-flow__muted">Aucune table : cette étape lit des services externes.</p>}

      <div className="lsk-flow__tables">
        {stage.tables.map((name, i) => {
          const info = tables[name];
          return (
            <details key={name} className="lsk-flow__table" open={i === 0}>
              <summary>
                <code>{name}</code>
                {info?.exists === false
                  ? <StatusBadge label="absente de la base" variant="danger" />
                  : (
                    <span className="lsk-flow__muted">
                      {info?.rows == null ? '—' : `${info.rows_estimated ? '≈ ' : ''}${fmt(info.rows)} lignes`} · {info?.columns.length ?? 0} colonnes
                    </span>
                  )}
              </summary>
              {info?.exists && (
                <table className="lsk-flow__cols">
                  <tbody>
                    {info.columns.map((c) => (
                      <tr key={c.name}>
                        <td><code>{c.name}</code></td>
                        <td className="lsk-flow__muted">{c.type}{c.nullable ? '' : ' · requis'}</td>
                        <td className="lsk-flow__keys">
                          {c.primary_key && <span className="lsk-flow__key lsk-flow__key--pk">PK</span>}
                          {c.foreign_key && <span className="lsk-flow__key lsk-flow__key--fk" title={c.foreign_key}>FK → {c.foreign_key}</span>}
                          {c.indexed && !c.primary_key && <span className="lsk-flow__key">idx</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </details>
          );
        })}
      </div>
    </section>
  );
}
