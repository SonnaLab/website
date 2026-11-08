import { useEffect, useState, type ReactNode } from 'react';

import { StatusBadge } from '@/components/common/StatusBadge';
import { AlertTriangleIcon, ChevronDownIcon, ChevronRightIcon } from '@icons';
import { PaginationBar } from '@/components/common/DataTable';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

// ─── Libelles ──────────────────────────────────────────

export const DRAFT_STATUS: Record<string, { label: string; variant: Variant }> = {
  generated:      { label: 'Généré',             variant: 'muted' },
  quality_failed: { label: 'Qualité en échec',   variant: 'danger' },
  in_review:      { label: 'À valider',          variant: 'warning' },
  approved:       { label: 'Validé, à publier',  variant: 'info' },
  rejected:       { label: 'Refusé',             variant: 'muted' },
  published:      { label: 'Publié',             variant: 'success' },
};

export const DECISION_STATUS: Record<string, { label: string; variant: Variant }> = {
  proposed:  { label: 'Proposée',       variant: 'default' },
  writing:   { label: 'En rédaction',   variant: 'info' },
  in_review: { label: 'En validation',  variant: 'warning' },
  approved:  { label: 'Validée',        variant: 'info' },
  published: { label: 'Publiée',        variant: 'success' },
  rejected:  { label: 'Refusée',        variant: 'muted' },
  failed:    { label: 'Échec',          variant: 'danger' },
  dismissed: { label: 'Abandonnée',     variant: 'muted' },
};

export const ACTION_LABEL: Record<string, string> = {
  create:    'Créer',
  reinforce: 'Renforcer',
  event:     'Événement',
  merge:     'Regrouper',
  nothing:   'Rien',
};

export const QUESTION_STATUS: Record<string, { label: string; variant: Variant }> = {
  candidate: { label: 'Candidate', variant: 'default' },
  active:    { label: 'Active',    variant: 'info' },
  covered:   { label: 'Couverte',  variant: 'success' },
  dropped:   { label: 'Écartée',   variant: 'muted' },
};

export const EVIDENCE_KIND: Record<string, string> = {
  demand:      'Demande',
  superiority: 'Supériorité',
  truth:       'Vérité',
};

export const EVIDENCE_ORDER = ['demand', 'superiority', 'truth'];

export const PASSED: Record<string, { label: string; variant: Variant }> = {
  yes:     { label: 'Validée',     variant: 'success' },
  no:      { label: 'Refusée',     variant: 'danger' },
  unknown: { label: 'Indéterminée', variant: 'warning' },
};

export const VERSION_STATUS: Record<string, { label: string; variant: Variant }> = {
  active:   { label: 'Active',     variant: 'success' },
  draft:    { label: 'Brouillon',  variant: 'warning' },
  archived: { label: 'Archivée',   variant: 'muted' },
};

export const LINK_RELATION: Record<string, string> = {
  to_pillar:   'Vers le pilier',
  from_pillar: 'Depuis le pilier',
  sibling:     'Article voisin',
  resource:    'Ressource',
  backlink:    'Lien retour',
};

export const LINK_STATUS: Record<string, { label: string; variant: Variant }> = {
  planned:  { label: 'Prévu',    variant: 'default' },
  placed:   { label: 'Placé',    variant: 'info' },
  verified: { label: 'Vérifié',  variant: 'success' },
  broken:   { label: 'Cassé',    variant: 'danger' },
  dropped:  { label: 'Abandonné', variant: 'muted' },
};

export const EVENT_KIND: Record<string, string> = {
  article:   'Article',
  backlinks: 'Liens retour',
  indexnow:  'IndexNow',
  social:    'Réseaux sociaux',
};

/** Libelles lisibles des controles de la barriere qualite (cle de regle -> texte). */
export const QUALITY_RULE: Record<string, string> = {
  reader_problem_only: 'Le texte ne parle que du problème du lecteur (pas de marque)',
  no_call_to_action:   'Aucun appel à l’action',
  sourced_figures:     'Chiffres sourcés',
  client_facts_only:   'Affirmations conformes au registre des faits',
  current_year:        'Année en cours',
  native_language:     'Langue native',
  structure:           'Structure (pas de titre H1)',
  no_emoji:            'Aucun emoji',
  no_instruction_leak: 'Aucune consigne recopiée',
  provided_links_only: 'Uniquement les liens fournis',
  seo_title:           'Titre SEO',
  meta_description:    'Méta-description',
  slug:                'Slug',
  client_forbidden:    'Termes interdits du client',
  near_duplicate:      'Pas de quasi-doublon',
  quality_report:      'Rapport qualité',
};

export function StatusTag({ map, value }: { map: Record<string, { label: string; variant: Variant }>; value: string | null | undefined }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const m = map[value] ?? { label: value, variant: 'muted' as Variant };
  return <StatusBadge label={m.label} variant={m.variant} />;
}

export const LANGUAGE_LABEL: Record<string, string> = {
  fr: 'Français', en: 'Anglais', de: 'Allemand', es: 'Espagnol', it: 'Italien', pt: 'Portugais', nl: 'Néerlandais', ar: 'Arabe',
};

export function langLabel(code: string | null | undefined): string {
  if (!code) return '—';
  return LANGUAGE_LABEL[code] ?? code.toUpperCase();
}

// ─── Dates et nombres ─────────────────────────────────

export function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('fr', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
}

export function fmtDay(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('fr', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

export function fmtNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('fr').format(n);
}

// ─── Petits blocs ──────────────────────────────────────

export function Section({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h4 className="dsv-section-title">{title}</h4>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="dsv-field">
      <span className="dsv-field__label">{label}</span>
      <span className="dsv-field__value">{value ?? '—'}</span>
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div className="dsv-note dsv-note--error" role="alert">
      <AlertTriangleIcon size={15} />
      <div className="dsv-note__body">{children}</div>
    </div>
  );
}

export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="dsv-note"><div className="dsv-note__body">{children}</div></div>
  );
}

export function ExternalLink({ href, children }: { href: string | null | undefined; children?: ReactNode }) {
  if (!href) return <span className="text-muted-foreground">—</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="dsv-link">
      {children ?? href}
    </a>
  );
}

/** Bloc JSON lisible (meme rendu que les journaux de l'onglet Infrastructure). */
export function JsonView({ value, maxHeight = 360 }: { value: unknown; maxHeight?: number }) {
  return (
    <pre className="dsv-json" style={{ maxHeight }}>
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

/** Section repliable (le detail technique reste cache par defaut). */
export function Collapsible({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="dsv-collapsible">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="dsv-collapsible__toggle"
        aria-expanded={open}
      >
        {open ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
        {title}
      </button>
      {open && <div className="dsv-collapsible__body">{children}</div>}
    </div>
  );
}

/** Onglets internes d'une fenetre (meme style que l'apercu des articles). */
export function SubTabs<T extends string>({ value, onChange, items }: {
  value: T;
  onChange: (v: T) => void;
  items: Array<{ value: T; label: ReactNode; hidden?: boolean }>;
}) {
  return (
    <div className="adm-tabs__list" role="tablist" style={{ marginBottom: 16 }}>
      {items.filter((i) => !i.hidden).map((i) => (
        <button
          key={i.value}
          type="button"
          role="tab"
          aria-selected={value === i.value}
          className={`adm-tabs__trigger${value === i.value ? ' adm-tabs__trigger--active' : ''}`}
          onClick={() => onChange(i.value)}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}

/** Pagination par decalage (les listes DSV n'ont pas toutes de total), avec la barre commune. */
export function Pager({ offset, limit, count, total, onChange }: {
  offset: number; limit: number; count: number; total?: number; onChange: (offset: number) => void;
}) {
  const page = Math.floor(offset / limit) + 1;
  return (
    <PaginationBar
      page={page}
      pageCount={total !== undefined ? Math.max(1, Math.ceil(total / limit)) : undefined}
      hasMore={count >= limit}
      from={count ? offset + 1 : undefined}
      to={count ? offset + count : undefined}
      total={total}
      summary={count ? `${offset + 1}–${offset + count}` : undefined}
      onChange={(next) => onChange((next - 1) * limit)}
    />
  );
}

/** Valeur differee (recherche saisie au clavier). */
export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/** Nombre de caracteres avec la plage conseillee (titre SEO, meta). */
export function CharCount({ value, min, max }: { value: string; min?: number; max?: number }) {
  const n = value.trim().length;
  const bad = (min !== undefined && n < min) || (max !== undefined && n > max);
  const range = min !== undefined && max !== undefined ? ` (exigé : ${min} à ${max})`
    : max !== undefined ? ` (maximum ${max})`
    : min !== undefined ? ` (minimum ${min})` : '';
  return (
    <span className={`text-xs ${bad ? 'text-destructive' : 'text-muted-foreground'}`}>
      {n} caractères{range}
    </span>
  );
}
