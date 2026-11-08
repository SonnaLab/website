import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { BaseTab } from '@/components/common/BaseTab';
import { Modal } from '@/components/common/Modal';
import { useConfirm } from '@/components/common/ConfirmDialog';
import {
  DataTablePagination, usePagination,
  DataTable, DataTableAction, DataTableBody, DataTableEmpty, DataTableHead, DataTableRow, DataTableSearch, DataTableTd,
  DataTableTh, DataTableToolbar, filterRows,
} from '@/components/common/DataTable';
import { dsv, dsvErrorMessage, type ConfigVersion, type Fact, type FactInput, type Resource } from '@/services/dsv';
import { CheckCircle2Icon, FileTextIcon, GlobeIcon, PenLineIcon, PlusIcon } from '@icons';

import {
  Collapsible, ErrorNote, ExternalLink, InfoNote, JsonView, Section, StatusTag, SubTabs, VERSION_STATUS, langLabel,
} from './shared';
import { useClientScope } from './QuestionsTab';

// ─── Lecture d'une configuration ──────────────────────

const KEY_LABEL: Record<string, string> = {
  mission: 'Mission',
  truth: 'Vérité',
  writing: 'Rédaction',
  links: 'Liens',
  seo: 'SEO',
  social: 'Réseaux sociaux',
  thresholds: 'Seuils',
  official_domains: 'Domaines officiels supplémentaires',
  domain: 'Domaine du site',
  audience: 'Lecteurs',
  languages: 'Langues',
  tone_by_language: 'Registre par langue',
  nodes: 'Nœuds du territoire',
  excluded_themes: 'Thèmes exclus',
  forbidden: 'Affirmations et termes interdits',
  article_url_template: 'Modèle d’adresse des articles',
  resource_sources: 'Sources des ressources',
  review_capacity_per_week: 'Capacité de validation par semaine',
  bing_markets: 'Marchés Bing par langue',
  writing_enabled: 'Rédaction DSV activée',
  extra_rules: 'Règles propres au client',
};

const ENFORCED: Record<string, string> = { prompt: 'Consigne', check: 'Contrôle', both: 'Consigne et contrôle' };

interface RuleLike { key: string; text: string; enforced_by?: string; params?: Record<string, unknown> }
interface NodeLike { key: string; label: string; description?: string; seed_queries?: Record<string, string[]> }

const isRuleList = (v: unknown): v is RuleLike[] =>
  Array.isArray(v) && v.length > 0 && v.every((r) => r && typeof r === 'object' && 'key' in r && 'text' in r);
const isNodeList = (v: unknown): v is NodeLike[] =>
  Array.isArray(v) && v.length > 0 && v.every((r) => r && typeof r === 'object' && 'key' in r && 'label' in r);
const isStringList = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === 'string');

function ValueView({ value }: { value: unknown }): ReactNode {
  if (isRuleList(value)) {
    return (
      <ul className="space-y-2">
        {value.map((r) => (
          <li key={r.key} className="dsv-card">
            <div className="flex flex-wrap items-center gap-2">
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.key}</code>
              {r.enforced_by && <span className="text-xs text-muted-foreground">{ENFORCED[r.enforced_by] ?? r.enforced_by}</span>}
            </div>
            <p className="text-sm text-foreground mt-1.5">{r.text}</p>
            {r.params && Object.keys(r.params).length > 0 && (
              <p className="dsv-mono text-muted-foreground mt-1">{JSON.stringify(r.params)}</p>
            )}
          </li>
        ))}
      </ul>
    );
  }
  if (isNodeList(value)) {
    return (
      <ul className="space-y-2">
        {value.map((n) => (
          <li key={n.key} className="dsv-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{n.label}</span>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{n.key}</code>
            </div>
            {n.description && <p className="text-sm text-muted-foreground mt-1">{n.description}</p>}
            {n.seed_queries && Object.entries(n.seed_queries).map(([lang, qs]) => (
              <p key={lang} className="text-xs mt-1"><strong>{langLabel(lang)}</strong> : {qs.join(' · ')}</p>
            ))}
          </li>
        ))}
      </ul>
    );
  }
  if (isStringList(value)) {
    if (!value.length) return <span className="text-sm text-muted-foreground">Aucun</span>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((s, i) => <span key={i} className="dsv-tag">{s}</span>)}
      </div>
    );
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    const flat = entries.length > 0 && entries.every(([, v]) => typeof v === 'string' || typeof v === 'number' || isStringList(v));
    if (flat) {
      return (
        <dl className="space-y-2">
          {entries.map(([k, v]) => (
            <div key={k} className="flex flex-wrap gap-2 text-sm">
              <dt className="font-medium text-foreground">{/^[a-z]{2}$/.test(k) ? langLabel(k) : k} :</dt>
              <dd className="text-foreground">{Array.isArray(v) ? v.join(', ') : String(v)}</dd>
            </div>
          ))}
        </dl>
      );
    }
  }
  if (typeof value === 'boolean') return <span className="text-sm font-medium">{value ? 'Oui' : 'Non'}</span>;
  if (typeof value === 'string' || typeof value === 'number') return <p className="text-sm text-foreground dsv-pre-wrap">{String(value)}</p>;
  if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
    return <span className="text-sm text-muted-foreground">Vide (valeurs par défaut des modules)</span>;
  }
  return <JsonView value={value} maxHeight={280} />;
}

function PayloadView({ payload, changed }: { payload: Record<string, unknown>; changed: Set<string> }) {
  return (
    <div className="space-y-4">
      {Object.entries(payload).map(([key, value]) => (
        <Section
          key={key}
          title={`${KEY_LABEL[key] ?? key}${Array.isArray(value) ? ` (${value.length})` : ''}`}
          actions={changed.has(key) ? <span className="text-xs font-medium dsv-warn">Différent de la version active</span> : undefined}
        >
          <ValueView value={value} />
        </Section>
      ))}
    </div>
  );
}

function VersionEditor({ scope, base, onClose, onCreated }: {
  scope: string; base: ConfigVersion | null; onClose: () => void; onCreated: (v: ConfigVersion) => void;
}) {
  const [text, setText] = useState(() => JSON.stringify(base?.payload ?? {}, null, 2));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => {
    try {
      const value = JSON.parse(text);
      if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: 'La configuration doit être un objet JSON.' };
      return { value: value as Record<string, unknown> };
    } catch (e) {
      return { error: `JSON invalide : ${(e as Error).message}` };
    }
  }, [text]);

  async function save() {
    if (!parsed.value) return;
    setSaving(true);
    setError(null);
    try {
      const created = await dsv.createConfigVersion(scope, parsed.value, note.trim() || undefined);
      toast.success(`Version ${created.version} créée en brouillon. Elle n’est pas active.`);
      onCreated(created);
    } catch (e) {
      setError(dsvErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={`Nouvelle version : ${scope === 'general' ? 'configuration générale' : scope}`}
      subtitle={base ? `À partir de la version ${base.version}. La nouvelle version est créée en brouillon ; l’activation est une étape séparée.` : undefined}
      footer={(
        <>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose} disabled={saving}>Annuler</button>
          <button type="button" className="adm-btn adm-btn--primary" onClick={save} disabled={saving || !parsed.value}>
            {saving ? 'Création…' : 'Créer le brouillon'}
          </button>
        </>
      )}
    >
      <div className="adm-form space-y-4">
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="dsv-config-note">Note (ce qui change et pourquoi)</label>
          <input id="dsv-config-note" className="adm-input" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="dsv-config-json">Configuration (JSON)</label>
          <textarea
            id="dsv-config-json"
            className="adm-textarea font-mono text-xs"
            rows={28}
            spellCheck={false}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {parsed.error && <span className="text-xs text-destructive">{parsed.error}</span>}
        </div>
        <InfoNote>Lesankofa vérifie la forme complète (règles, nœuds, langues, seuils) à la création et refuse une version incomplète.</InfoNote>
        {error && <ErrorNote>{error}</ErrorNote>}
      </div>
    </Modal>
  );
}

function VersionsPanel({ scope, scopeLabel }: { scope: string; scopeLabel: string }) {
  const confirm = useConfirm();
  const [versions, setVersions] = useState<ConfigVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editorBase, setEditorBase] = useState<ConfigVersion | null | undefined>(undefined);
  const [activating, setActivating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [raw, setRaw] = useState(false);

  const load = useCallback((select?: number) => {
    setLoading(true);
    setError(null);
    dsv.configVersions(scope)
      .then((rows) => {
        const sorted = [...rows].sort((a, b) => b.version - a.version);
        setVersions(sorted);
        setSelectedId((cur) => select ?? (cur && sorted.some((v) => v.id === cur) ? cur : (sorted.find((v) => v.status === 'active') ?? sorted[0])?.id ?? null));
      })
      .catch((e) => setError(dsvErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [scope]);

  useEffect(() => { setSelectedId(null); load(); }, [load]);

  const active = versions.find((v) => v.status === 'active') ?? null;
  const selected = versions.find((v) => v.id === selectedId) ?? null;

  const changed = useMemo(() => {
    const out = new Set<string>();
    if (!selected || !active || selected.id === active.id) return out;
    const keys = new Set([...Object.keys(selected.payload), ...Object.keys(active.payload)]);
    keys.forEach((k) => { if (JSON.stringify(selected.payload[k]) !== JSON.stringify(active.payload[k])) out.add(k); });
    return out;
  }, [selected, active]);

  async function activate(v: ConfigVersion) {
    const ok = await confirm({
      title: `Activer la version ${v.version} (${scopeLabel}) ?`,
      message: `Elle remplace la version ${active ? active.version : 'active'} pour toutes les prochaines exécutions du moteur (questions, décisions, rédaction, contrôles qualité).${changed.size ? ` Sections modifiées : ${[...changed].map((k) => KEY_LABEL[k] ?? k).join(', ')}.` : ''}`,
      confirmLabel: 'Activer',
      danger: false,
    });
    if (!ok) return;
    setActivating(true);
    setActionError(null);
    try {
      await dsv.activateConfigVersion(v.id);
      toast.success(`Version ${v.version} active.`);
      load(v.id);
    } catch (e) {
      setActionError(dsvErrorMessage(e));
    } finally {
      setActivating(false);
    }
  }

  return (
    <BaseTab loading={loading && versions.length === 0} error={error} onRetry={() => load()}>
      <div className="dsv-config-layout">
        <div className="space-y-2">
          <button type="button" className="adm-btn adm-btn--primary w-full justify-center" onClick={() => setEditorBase(selected ?? active)}>
            <PlusIcon size={14} /> Nouvelle version
          </button>
          {versions.length === 0 && <p className="text-sm text-muted-foreground">Aucune version.</p>}
          <ul className="space-y-2">
            {versions.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(v.id)}
                  className={`dsv-version${v.id === selectedId ? ' dsv-version--active' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">Version {v.version}</span>
                    <StatusTag map={VERSION_STATUS} value={v.status} />
                  </div>
                  <div className="text-xs text-muted-foreground dsv-truncate">{v.note || 'Sans note'}</div>
                  <div className="text-xs text-muted-foreground">par {v.created_by}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4 min-w-0">
          {actionError && <ErrorNote>{actionError}</ErrorNote>}
          {selected && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold">Version {selected.version} <span className="font-normal text-muted-foreground">(n° {selected.id})</span></h3>
                  {selected.note && <p className="text-sm text-muted-foreground">{selected.note}</p>}
                  {selected.id !== active?.id && active && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {changed.size ? `Différences avec la version active (${active.version}) : ${[...changed].map((k) => KEY_LABEL[k] ?? k).join(', ')}.` : `Identique à la version active (${active.version}).`}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => setRaw((r) => !r)}>
                    <FileTextIcon size={13} /> {raw ? 'Vue lisible' : 'JSON brut'}
                  </button>
                  <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => setEditorBase(selected)}>
                    <PenLineIcon size={13} /> Modifier dans une nouvelle version
                  </button>
                  {selected.status === 'draft' && (
                    <button type="button" className="adm-btn adm-btn--primary adm-btn--sm" disabled={activating} onClick={() => activate(selected)}>
                      <CheckCircle2Icon size={13} /> {activating ? 'Activation…' : 'Activer'}
                    </button>
                  )}
                </div>
              </div>
              {raw ? <JsonView value={selected.payload} maxHeight={640} /> : <PayloadView payload={selected.payload} changed={changed} />}
            </>
          )}
        </div>
      </div>

      {editorBase !== undefined && (
        <VersionEditor
          scope={scope}
          base={editorBase}
          onClose={() => setEditorBase(undefined)}
          onCreated={(v) => { setEditorBase(undefined); load(v.id); }}
        />
      )}
    </BaseTab>
  );
}

// ─── Registre des faits ───────────────────────────────

function FactEditor({ clientId, fact, onClose, onSaved }: {
  clientId: string; fact: Fact | null; onClose: () => void; onSaved: (f: Fact) => void;
}) {
  const [form, setForm] = useState<FactInput>(() => fact
    ? { key: fact.key, statement: fact.statement, exists: fact.exists, source: fact.source }
    : { key: '', statement: '', exists: true, source: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const problems = [
    form.key.trim().length < 2 && 'La clé doit faire au moins 2 caractères.',
    form.statement.trim().length < 10 && 'L’énoncé doit faire au moins 10 caractères.',
    form.source.trim().length < 3 && 'La source doit faire au moins 3 caractères.',
  ].filter(Boolean) as string[];

  async function save() {
    if (problems.length) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await dsv.putFact(clientId, { key: form.key.trim(), statement: form.statement.trim(), exists: form.exists, source: form.source.trim() });
      toast.success(fact ? 'Fait mis à jour.' : 'Fait ajouté.');
      onSaved(saved);
    } catch (e) {
      setError(dsvErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={fact ? `Modifier le fait « ${fact.key} »` : 'Ajouter un fait'}
      subtitle="Ce que la rédaction peut affirmer (ou doit taire) sur le client. Vérifié contre le code et les documents, jamais contre la seule copie du site."
      footer={(
        <>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose} disabled={saving}>Annuler</button>
          <button type="button" className="adm-btn adm-btn--primary" onClick={save} disabled={saving || problems.length > 0}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </>
      )}
    >
      <div className="adm-form space-y-4">
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="dsv-fact-key">Clé</label>
          <input id="dsv-fact-key" className="adm-input font-mono" value={form.key} disabled={!!fact} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="ex. advice_30_min" />
          {fact && <span className="text-xs text-muted-foreground">La clé identifie le fait : pour la changer, ajoutez un nouveau fait.</span>}
        </div>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="dsv-fact-statement">Énoncé</label>
          <textarea id="dsv-fact-statement" className="adm-textarea" rows={3} value={form.statement} onChange={(e) => setForm({ ...form, statement: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.exists} onChange={(e) => setForm({ ...form, exists: e.target.checked })} />
          Ce fait est vrai (décocher pour un service ou une affirmation qui n’existe pas)
        </label>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="dsv-fact-source">Source</label>
          <input id="dsv-fact-source" className="adm-input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="ex. modèle Django, document commercial, propriétaire" />
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
      </div>
    </Modal>
  );
}

function FactsPanel({ clientId }: { clientId: string }) {
  const [rows, setRows] = useState<Fact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Fact | null | undefined>(undefined);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    dsv.facts(clientId).then(setRows).catch((e) => setError(dsvErrorMessage(e))).finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => filterRows(rows, q, (f) => [f.key, f.statement, f.source]), [rows, q]);
  const pager = usePagination(visible, q);

  return (
    <div className="space-y-4">
      <DataTableToolbar
        right={<button type="button" className="adm-btn adm-btn--primary adm-btn--sm" onClick={() => setEditing(null)}><PlusIcon size={13} /> Ajouter un fait</button>}
      >
        <DataTableSearch value={q} onChange={setQ} placeholder="Clé, énoncé ou source" />
      </DataTableToolbar>
      <BaseTab loading={loading} error={error} onRetry={load}>
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableTh>Clé</DataTableTh>
              <DataTableTh>Énoncé</DataTableTh>
              <DataTableTh>Vrai</DataTableTh>
              <DataTableTh>Source</DataTableTh>
              <DataTableTh>Vérifié par</DataTableTh>
              <DataTableTh>Action</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {visible.length === 0 && <DataTableEmpty icon={<FileTextIcon size={28} />} label="Aucun fait enregistré." />}
            {pager.pageRows.map((f) => (
              <DataTableRow key={f.id} className={f.is_active ? undefined : 'dsv-dim'}>
                <DataTableTd><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{f.key}</code></DataTableTd>
                <DataTableTd><span className="text-sm">{f.statement}</span></DataTableTd>
                <DataTableTd>{f.exists ? 'Oui' : <span className="text-destructive font-medium">Non</span>}</DataTableTd>
                <DataTableTd><span className="text-xs text-muted-foreground">{f.source}</span></DataTableTd>
                <DataTableTd><span className="text-xs text-muted-foreground">{f.verified_by}{f.is_active ? '' : ' (inactif)'}</span></DataTableTd>
                <DataTableTd>
                  <div className="adm-table__actions">
                    <DataTableAction icon={PenLineIcon} label="Modifier" onClick={() => setEditing(f)} />
                  </div>
                </DataTableTd>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
        <DataTablePagination {...pager} />
      </BaseTab>
      {editing !== undefined && (
        <FactEditor clientId={clientId} fact={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); load(); }} />
      )}
    </div>
  );
}

// ─── Registre des ressources (lecture seule) ──────────

const RESOURCE_KIND: Record<string, string> = {
  library_guide: 'Guide de la bibliothèque',
  template: 'Modèle',
  university: 'Fiche d’université',
};

function ResourcesPanel({ clientId }: { clientId: string }) {
  // Le registre peut compter des dizaines de milliers de fiches (lebocheur : 57 000,
  // 14 Mo) : on charge une langue a la fois, la premiere du client par defaut.
  const scope = useClientScope(clientId);
  const [language, setLanguage] = useState<string | null>(null);
  const [kind, setKind] = useState('');
  const [live, setLive] = useState('');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (language === null && scope.loaded) setLanguage(scope.languages[0] ?? '');
  }, [scope, language]);

  const load = useCallback(() => {
    if (language === null) return;
    setLoading(true);
    setError(null);
    dsv.resources(clientId, language || undefined)
      .then(setRows)
      .catch((e) => setError(dsvErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [clientId, language]);

  useEffect(() => { load(); }, [load]);

  const kinds = useMemo(() => Array.from(new Set(rows.map((r) => r.kind))).sort(), [rows]);
  const visible = useMemo(() => filterRows(
    rows.filter((r) => (!kind || r.kind === kind) && (!live || String(r.is_live) === live)),
    q,
    (r) => [r.title, r.url, r.summary, r.topics.join(' ')],
  ), [rows, kind, live, q]);
  const pager = usePagination(visible, `${clientId}|${language}|${kind}|${live}|${q}`);

  return (
    <div className="space-y-4">
      <DataTableToolbar right={<span className="text-xs text-muted-foreground">{visible.length} ressource{visible.length > 1 ? 's' : ''}</span>}>
        <DataTableSearch value={q} onChange={setQ} placeholder="Titre, adresse, sujet" />
        <select className="adm-select adm-select--sm" aria-label="Langue" value={language ?? ''} onChange={(e) => setLanguage(e.target.value)}>
          {scope.languages.map((l) => <option key={l} value={l}>{langLabel(l)}</option>)}
          <option value="">Toutes les langues (chargement lourd)</option>
        </select>
        <select className="adm-select adm-select--sm" aria-label="Type" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">Tous les types</option>
          {kinds.map((k) => <option key={k} value={k}>{RESOURCE_KIND[k] ?? k}</option>)}
        </select>
        <select className="adm-select adm-select--sm" aria-label="En ligne" value={live} onChange={(e) => setLive(e.target.value)}>
          <option value="">En ligne ou non</option>
          <option value="true">En ligne</option>
          <option value="false">Hors ligne</option>
        </select>
      </DataTableToolbar>
      <BaseTab loading={loading} error={error} onRetry={load}>
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableTh>Ressource</DataTableTh>
              <DataTableTh>Type</DataTableTh>
              <DataTableTh>Langue</DataTableTh>
              <DataTableTh>Sujets</DataTableTh>
              <DataTableTh>En ligne</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {visible.length === 0 && <DataTableEmpty icon={<GlobeIcon size={28} />} label="Aucune ressource pour ces filtres." hint="Le registre est importé chaque nuit depuis les sources configurées du client." />}
            {pager.pageRows.map((r) => (
              <DataTableRow key={r.id}>
                <DataTableTd>
                  <div className="font-medium text-foreground"><ExternalLink href={r.url}>{r.title}</ExternalLink></div>
                  {r.summary && <div className="text-xs text-muted-foreground">{r.summary}</div>}
                </DataTableTd>
                <DataTableTd>{RESOURCE_KIND[r.kind] ?? r.kind}</DataTableTd>
                <DataTableTd>{langLabel(r.language)}</DataTableTd>
                <DataTableTd><span className="text-xs">{r.topics.join(', ') || '—'}</span></DataTableTd>
                <DataTableTd>{r.is_live ? 'Oui' : <span className="text-muted-foreground">Non</span>}</DataTableTd>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
        <DataTablePagination {...pager} />
      </BaseTab>
    </div>
  );
}

// ─── Onglet ───────────────────────────────────────────

type ConfigView = 'general' | 'client' | 'facts' | 'resources';

export function ConfigTab({ clientId, clientName }: { clientId: string; clientName?: string }) {
  const [view, setView] = useState<ConfigView>('general');
  const label = clientName ?? clientId;
  return (
    <div>
      <SubTabs<ConfigView>
        value={view}
        onChange={setView}
        items={[
          { value: 'general', label: 'Configuration générale' },
          { value: 'client', label: `Configuration ${label}` },
          { value: 'facts', label: `Faits ${label}` },
          { value: 'resources', label: `Ressources ${label}` },
        ]}
      />
      {view === 'general' && <VersionsPanel key="general" scope="general" scopeLabel="configuration générale" />}
      {view === 'client' && <VersionsPanel key={clientId} scope={clientId} scopeLabel={`configuration ${label}`} />}
      {view === 'facts' && <FactsPanel key={clientId} clientId={clientId} />}
      {view === 'resources' && <ResourcesPanel key={clientId} clientId={clientId} />}
      {view === 'general' && (
        <div className="mt-4">
          <Collapsible title="Où ces consignes sont-elles utilisées ?">
            <p className="text-sm text-muted-foreground">
              Une règle « Consigne » est donnée au modèle, une règle « Contrôle » est vérifiée par la barrière qualité, « Consigne et contrôle » fait les deux. Les seuils absents prennent la valeur par défaut du module qui les lit.
            </p>
          </Collapsible>
        </div>
      )}
    </div>
  );
}
