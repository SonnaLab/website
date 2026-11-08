import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { BaseTab } from '@/components/common/BaseTab';
import { Modal } from '@/components/common/Modal';
import {
  DataTablePagination, usePagination,
  DataTable, DataTableAction, DataTableBody, DataTableEmpty, DataTableHead, DataTableRow, DataTableSearch, DataTableTd,
  DataTableTh, DataTableToolbar,
} from '@/components/common/DataTable';
import {
  dsv, dsvErrorMessage,
  type Cluster, type Question, type QuestionEvidence, type QuestionPatch, type QuestionStatus,
} from '@/services/dsv';
import { EyeIcon, LayersIcon, PenLineIcon, RefreshCwIcon, SearchIcon, XIcon } from '@icons';

import {
  EVIDENCE_KIND, EVIDENCE_ORDER, ErrorNote, ExternalLink, Field, InfoNote, PASSED, Pager, QUESTION_STATUS, Section,
  StatusTag, SubTabs, fmtDate, fmtDay, fmtNumber, langLabel, useDebounced,
} from './shared';

const PAGE = 100;

export interface ClientScope { loaded: boolean; languages: string[]; nodes: Array<{ key: string; label: string }> }

/** Langues et noeuds de la configuration active du client (pour les filtres). */
export function useClientScope(clientId: string): ClientScope {
  const [scope, setScope] = useState<ClientScope>({ loaded: false, languages: [], nodes: [] });
  useEffect(() => {
    setScope({ loaded: false, languages: [], nodes: [] });
    dsv.configVersions(clientId).then((versions) => {
      const payload = versions.find((v) => v.status === 'active')?.payload ?? {};
      setScope({
        loaded: true,
        languages: (payload.languages as string[] | undefined) ?? [],
        nodes: ((payload.nodes as Array<{ key: string; label: string }> | undefined) ?? []).map((n) => ({ key: n.key, label: n.label })),
      });
    }).catch(() => setScope({ loaded: true, languages: [], nodes: [] }));
  }, [clientId]);
  return scope;
}

function QuestionModal({ questionId, scope, onClose, onSaved }: {
  questionId: number; scope: ClientScope; onClose: () => void; onSaved: (q: Question) => void;
}) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [evidence, setEvidence] = useState<QuestionEvidence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<{ status: QuestionStatus; target_url: string; target_kind: '' | 'article' | 'resource'; notes: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    dsv.question(questionId).then((q) => {
      setQuestion(q);
      setForm({ status: q.status, target_url: q.target_url ?? '', target_kind: q.target_kind ?? '', notes: q.notes ?? '' });
    }).catch((e) => setError(dsvErrorMessage(e)));
    dsv.questionEvidence(questionId).then(setEvidence).catch(() => setEvidence(null));
  }, [questionId]);

  const patch = useMemo<QuestionPatch>(() => {
    if (!question || !form) return {};
    const out: QuestionPatch = {};
    if (form.status !== question.status) out.status = form.status;
    const url = form.target_url.trim();
    if (url !== (question.target_url ?? '')) out.target_url = url || null;
    const kind = form.target_kind || null;
    if (kind !== (question.target_kind ?? null)) out.target_kind = kind;
    if (form.notes !== (question.notes ?? '')) out.notes = form.notes.trim() || null;
    return out;
  }, [question, form]);

  const urlInvalid = !!form?.target_url.trim() && !/^https?:\/\//.test(form.target_url.trim());

  async function save() {
    if (!Object.keys(patch).length || urlInvalid) return;
    setSaving(true);
    setSaveError(null);
    try {
      const next = await dsv.patchQuestion(questionId, patch);
      setQuestion(next);
      setForm({ status: next.status, target_url: next.target_url ?? '', target_kind: next.target_kind ?? '', notes: next.notes ?? '' });
      setEditing(false);
      onSaved(next);
      toast.success('Question mise à jour. Elle ne sera plus réécrite par la reconstruction de la banque.');
    } catch (e) {
      setSaveError(dsvErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const nodeLabel = (key: string | null) => (key ? scope.nodes.find((n) => n.key === key)?.label ?? key : '—');
  const ev = [...(evidence?.evidence ?? [])].sort((a, b) => EVIDENCE_ORDER.indexOf(a.kind) - EVIDENCE_ORDER.indexOf(b.kind));

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={question?.text ?? 'Question'}
      subtitle={question ? `${langLabel(question.language)} · n° ${question.id} · clé « ${question.key} »` : undefined}
      badge={question ? <span>{QUESTION_STATUS[question.status]?.label ?? question.status}</span> : undefined}
      footer={question && !editing ? (
        <button type="button" className="adm-btn adm-btn--primary" onClick={() => setEditing(true)}><PenLineIcon size={14} /> Corriger</button>
      ) : question && editing ? (
        <>
          <button type="button" className="adm-btn adm-btn--ghost" disabled={saving} onClick={() => { setEditing(false); setSaveError(null); setForm({ status: question.status, target_url: question.target_url ?? '', target_kind: question.target_kind ?? '', notes: question.notes ?? '' }); }}>Annuler</button>
          <button type="button" className="adm-btn adm-btn--primary" disabled={saving || !Object.keys(patch).length || urlInvalid} onClick={save}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </>
      ) : undefined}
    >
      {error && <ErrorNote>{error}</ErrorNote>}
      {question && form && (
        <div className="space-y-6">
          {editing ? (
            <div className="adm-form space-y-4">
              <InfoNote>Une question corrigée (statut changé ou note remplie) n’est plus réécrite par la reconstruction quotidienne de la banque.</InfoNote>
              <div className="adm-form__row">
                <div className="adm-form__field">
                  <label className="adm-form__label" htmlFor="dsv-q-status">Statut</label>
                  <select id="dsv-q-status" className="adm-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as QuestionStatus })}>
                    {Object.entries(QUESTION_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="adm-form__field">
                  <label className="adm-form__label" htmlFor="dsv-q-kind">Type de page cible</label>
                  <select id="dsv-q-kind" className="adm-select" value={form.target_kind} onChange={(e) => setForm({ ...form, target_kind: e.target.value as '' | 'article' | 'resource' })}>
                    <option value="">Aucun</option>
                    <option value="article">Article</option>
                    <option value="resource">Ressource</option>
                  </select>
                </div>
              </div>
              <div className="adm-form__field">
                <label className="adm-form__label" htmlFor="dsv-q-url">Page cible (vide pour la retirer)</label>
                <input id="dsv-q-url" className="adm-input" value={form.target_url} placeholder="https://…" onChange={(e) => setForm({ ...form, target_url: e.target.value })} />
                {urlInvalid && <span className="text-xs text-destructive">Adresse complète attendue (https://…).</span>}
              </div>
              <div className="adm-form__field">
                <label className="adm-form__label" htmlFor="dsv-q-notes">Notes</label>
                <textarea id="dsv-q-notes" className="adm-textarea" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              {saveError && <ErrorNote>{saveError}</ErrorNote>}
            </div>
          ) : (
            <Section title="Question">
              <div className="dsv-grid">
                <Field label="Statut" value={<StatusTag map={QUESTION_STATUS} value={question.status} />} />
                <Field label="Nœud" value={nodeLabel(question.node_key)} />
                <Field label="Intention" value={question.intent ?? '—'} />
                <Field label="Page cible" value={<ExternalLink href={question.target_url} />} />
                <Field label="Type de cible" value={question.target_kind === 'resource' ? 'Ressource' : question.target_kind === 'article' ? 'Article' : '—'} />
                <Field label="Grappe" value={question.cluster_id ?? '—'} />
                <Field label="Vue la première fois" value={fmtDay(question.first_seen)} />
                <Field label="Vue la dernière fois" value={fmtDay(question.last_seen)} />
                <Field label="Notes" value={question.notes ?? '—'} />
              </div>
            </Section>
          )}

          <Section title={`Variantes (${question.variants.length})`}>
            <div className="flex flex-wrap gap-1.5">
              {question.variants.map((v) => (
                <span key={v.id} className="dsv-tag">{v.query_norm} <span className="text-muted-foreground">({v.source})</span></span>
              ))}
            </div>
          </Section>

          <Section title="Preuves">
            {evidence === null && <p className="text-sm text-muted-foreground">Aucune preuve collectée.</p>}
            {evidence && (
              <p className="text-sm">{evidence.gate_open ? 'Porte DSV ouverte : les trois preuves sont valides.' : 'Porte DSV fermée : il manque une preuve valide.'}</p>
            )}
            <div className="dsv-grid dsv-grid--cards">
              {ev.map((e) => (
                <div key={e.id} className="dsv-card space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{EVIDENCE_KIND[e.kind] ?? e.kind}{e.level ? ` · niveau ${e.level}` : ''}</span>
                    <StatusTag map={PASSED} value={e.passed} />
                  </div>
                  <p className="text-sm">{e.summary}</p>
                  <p className="text-xs text-muted-foreground">{e.valid ? 'Valide' : 'Expirée ou refusée'} · expire le {fmtDate(e.expires_at)}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}
    </Modal>
  );
}

function QuestionsList({ clientId, scope, cluster, onClearCluster }: {
  clientId: string; scope: ClientScope; cluster: Cluster | null; onClearCluster: () => void;
}) {
  const [language, setLanguage] = useState('');
  const [status, setStatus] = useState('');
  const [node, setNode] = useState('');
  const [q, setQ] = useState('');
  const query = useDebounced(q);
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    dsv.questions(clientId, {
      language: language || undefined, status: status || undefined, node_key: node || undefined,
      cluster_id: cluster?.id, q: query.trim() || undefined, limit: PAGE, offset,
    })
      .then((page) => { setRows(page.items); setTotal(page.total); })
      .catch((e) => setError(dsvErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [clientId, language, status, node, cluster, query, offset]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setOffset(0); }, [clientId, language, status, node, cluster, query]);

  const nodeLabel = (key: string | null) => (key ? scope.nodes.find((n) => n.key === key)?.label ?? key : '—');

  return (
    <div className="space-y-4">
      {cluster && (
        <div className="flex items-center gap-2 text-sm">
          <span>Grappe : <strong>{cluster.label}</strong> ({langLabel(cluster.language)}, {cluster.questions} questions)</span>
          <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" onClick={onClearCluster}><XIcon size={12} /> Retirer le filtre</button>
        </div>
      )}
      <DataTableToolbar
        right={<span className="text-xs text-muted-foreground">{fmtNumber(total)} question{total > 1 ? 's' : ''}</span>}
      >
        <DataTableSearch value={q} onChange={setQ} placeholder="Rechercher dans le texte" />
        <select className="adm-select adm-select--sm" aria-label="Langue" value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="">Toutes les langues</option>
          {scope.languages.map((l) => <option key={l} value={l}>{langLabel(l)}</option>)}
        </select>
        <select className="adm-select adm-select--sm" aria-label="Statut" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(QUESTION_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="adm-select adm-select--sm" aria-label="Nœud" value={node} onChange={(e) => setNode(e.target.value)}>
          <option value="">Tous les nœuds</option>
          <option value="none">Sans nœud</option>
          {scope.nodes.map((n) => <option key={n.key} value={n.key}>{n.label}</option>)}
        </select>
      </DataTableToolbar>

      <BaseTab loading={loading} error={error} onRetry={load}>
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableTh>Question</DataTableTh>
              <DataTableTh>Langue</DataTableTh>
              <DataTableTh>Nœud</DataTableTh>
              <DataTableTh>Statut</DataTableTh>
              <DataTableTh>Page cible</DataTableTh>
              <DataTableTh>Variantes</DataTableTh>
              <DataTableTh>Dernière vue</DataTableTh>
              <DataTableTh>Action</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {rows.length === 0 && <DataTableEmpty icon={<SearchIcon size={28} />} label="Aucune question pour ces filtres." />}
            {rows.map((r) => (
              <DataTableRow key={r.id} onClick={() => setOpenId(r.id)}>
                <DataTableTd>
                  <div className="font-medium text-foreground">{r.text}</div>
                  {r.notes && <div className="text-xs text-muted-foreground">Note : {r.notes}</div>}
                </DataTableTd>
                <DataTableTd>{langLabel(r.language)}</DataTableTd>
                <DataTableTd>{nodeLabel(r.node_key)}</DataTableTd>
                <DataTableTd><StatusTag map={QUESTION_STATUS} value={r.status} /></DataTableTd>
                <DataTableTd><span className="text-xs">{r.target_url ? <ExternalLink href={r.target_url}>{r.target_url.replace(/^https?:\/\/[^/]+/, '')}</ExternalLink> : '—'}</span></DataTableTd>
                <DataTableTd>{r.variants.length}</DataTableTd>
                <DataTableTd>{fmtDay(r.last_seen)}</DataTableTd>
                <DataTableTd>
                  <div className="adm-table__actions">
                    <DataTableAction icon={EyeIcon} label="Détail et correction" onClick={() => setOpenId(r.id)} />
                  </div>
                </DataTableTd>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
        <Pager offset={offset} limit={PAGE} count={rows.length} total={total} onChange={setOffset} />
      </BaseTab>

      {openId !== null && (
        <QuestionModal
          questionId={openId}
          scope={scope}
          onClose={() => setOpenId(null)}
          onSaved={(next) => setRows((prev) => prev.map((r) => (r.id === next.id ? next : r)))}
        />
      )}
    </div>
  );
}

function ClustersList({ clientId, scope, onOpen }: { clientId: string; scope: ClientScope; onOpen: (c: Cluster) => void }) {
  const [language, setLanguage] = useState('');
  const [node, setNode] = useState('');
  const [minQuestions, setMinQuestions] = useState(2);
  const [rows, setRows] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    dsv.clusters(clientId, { language: language || undefined, node_key: node || undefined, min_questions: minQuestions, limit: 500 })
      .then(setRows)
      .catch((e) => setError(dsvErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [clientId, language, node, minQuestions]);

  useEffect(() => { load(); }, [load]);
  const pager = usePagination(rows, `${clientId}|${language}|${node}|${minQuestions}`);

  const nodeLabel = (key: string | null) => (key ? scope.nodes.find((n) => n.key === key)?.label ?? key : '—');

  return (
    <div className="space-y-4">
      <DataTableToolbar
        right={<button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={load}><RefreshCwIcon size={13} /> Rafraîchir</button>}
      >
        <select className="adm-select adm-select--sm" aria-label="Langue" value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="">Toutes les langues</option>
          {scope.languages.map((l) => <option key={l} value={l}>{langLabel(l)}</option>)}
        </select>
        <select className="adm-select adm-select--sm" aria-label="Nœud" value={node} onChange={(e) => setNode(e.target.value)}>
          <option value="">Tous les nœuds</option>
          {scope.nodes.map((n) => <option key={n.key} value={n.key}>{n.label}</option>)}
        </select>
        <select className="adm-select adm-select--sm" aria-label="Taille minimale" value={minQuestions} onChange={(e) => setMinQuestions(Number(e.target.value))}>
          <option value={1}>Toutes les grappes</option>
          <option value={2}>2 questions et plus</option>
          <option value={5}>5 questions et plus</option>
          <option value={10}>10 questions et plus</option>
        </select>
      </DataTableToolbar>

      <BaseTab loading={loading} error={error} onRetry={load}>
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableTh>Grappe</DataTableTh>
              <DataTableTh>Langue</DataTableTh>
              <DataTableTh>Nœud</DataTableTh>
              <DataTableTh>Questions</DataTableTh>
              <DataTableTh>Question pilier</DataTableTh>
              <DataTableTh>Action</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {rows.length === 0 && <DataTableEmpty icon={<LayersIcon size={28} />} label="Aucune grappe pour ces filtres." />}
            {pager.pageRows.map((c) => (
              <DataTableRow key={c.id} onClick={() => onOpen(c)}>
                <DataTableTd>
                  <div className="font-medium text-foreground">{c.label}</div>
                  <div className="text-xs text-muted-foreground">{c.key}</div>
                </DataTableTd>
                <DataTableTd>{langLabel(c.language)}</DataTableTd>
                <DataTableTd>{nodeLabel(c.node_key)}</DataTableTd>
                <DataTableTd>{c.questions}</DataTableTd>
                <DataTableTd>{c.pillar_question_id ? `n° ${c.pillar_question_id}` : '—'}</DataTableTd>
                <DataTableTd>
                  <div className="adm-table__actions">
                    <DataTableAction icon={SearchIcon} label="Voir ses questions" onClick={() => onOpen(c)} />
                  </div>
                </DataTableTd>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
        <DataTablePagination {...pager} />
      </BaseTab>
    </div>
  );
}

export function QuestionsTab({ clientId }: { clientId: string }) {
  const scope = useClientScope(clientId);
  const [view, setView] = useState<'questions' | 'clusters'>('questions');
  const [cluster, setCluster] = useState<Cluster | null>(null);

  useEffect(() => { setCluster(null); }, [clientId]);

  return (
    <div>
      <SubTabs<'questions' | 'clusters'>
        value={view}
        onChange={setView}
        items={[{ value: 'questions', label: 'Questions' }, { value: 'clusters', label: 'Grappes' }]}
      />
      {view === 'questions'
        ? <QuestionsList clientId={clientId} scope={scope} cluster={cluster} onClearCluster={() => setCluster(null)} />
        : <ClustersList clientId={clientId} scope={scope} onOpen={(c) => { setCluster(c); setView('questions'); }} />}
    </div>
  );
}
