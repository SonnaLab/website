import { useCallback, useEffect, useMemo, useState } from 'react';

import { BaseTab } from '@/components/common/BaseTab';
import {
  DataTablePagination, usePagination,
  DataTable, DataTableBody, DataTableEmpty, DataTableHead, DataTableRow, DataTableTd, DataTableTh, DataTableToolbar,
} from '@/components/common/DataTable';
import { dsv, dsvErrorMessage, type LinkPlan, type OrphanReport, type Outcome, type PublishEvent } from '@/services/dsv';
import { LayersIcon, RefreshCwIcon, SendIcon, TrendingUpIcon } from '@icons';

import { DecisionModal, LinksTable } from './DecisionsTab';
import { PublishEventResult } from './DraftModal';
import {
  ACTION_LABEL, Collapsible, EVENT_KIND, ErrorNote, ExternalLink, Field, InfoNote, JsonView, Pager, SubTabs, fmtDate, fmtDay, fmtNumber, langLabel,
} from './shared';

const PAGE = 100;

function windowCell(w: Outcome['baseline']) {
  if (!w) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="text-xs">
      <strong className="text-foreground">{w.position ?? '—'}</strong>
      <span className="text-muted-foreground"> · {fmtNumber(w.impressions ?? 0)} impr. · {fmtNumber(w.clicks ?? 0)} clics</span>
    </span>
  );
}

function OutcomesPanel({ clientId, clientName }: { clientId: string; clientName?: string }) {
  const [pending, setPending] = useState('');
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<Outcome[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decisionId, setDecisionId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    dsv.outcomes({ client_id: clientId, pending: pending === '' ? undefined : pending === 'true', limit: PAGE, offset })
      .then(setRows)
      .catch((e) => setError(dsvErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [clientId, pending, offset]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setOffset(0); }, [clientId, pending]);

  return (
    <div className="space-y-4">
      <DataTableToolbar right={<button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={load}><RefreshCwIcon size={13} /> Rafraîchir</button>}>
        <select className="adm-select adm-select--sm" aria-label="Avancement" value={pending} onChange={(e) => setPending(e.target.value)}>
          <option value="">Tous les résultats</option>
          <option value="true">En attente de mesure</option>
          <option value="false">Mesurés</option>
        </select>
      </DataTableToolbar>
      <InfoNote>Position moyenne Search Console de la page, avant publication puis à 28 et 56 jours. Les mesures sont mises à jour chaque nuit.</InfoNote>
      <BaseTab loading={loading} error={error} onRetry={load}>
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableTh>Question</DataTableTh>
              <DataTableTh>Action</DataTableTh>
              <DataTableTh>Publié le</DataTableTh>
              <DataTableTh>Avant</DataTableTh>
              <DataTableTh>28 jours</DataTableTh>
              <DataTableTh>56 jours</DataTableTh>
              <DataTableTh>Verdict</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {rows.length === 0 && <DataTableEmpty icon={<TrendingUpIcon size={28} />} label="Aucun résultat : rien n’a encore été publié par le moteur DSV pour ce client." />}
            {rows.map((o) => (
              <DataTableRow key={o.id} onClick={() => setDecisionId(o.decision_id)}>
                <DataTableTd>
                  <div className="font-medium text-foreground">{o.question ?? '—'}</div>
                  <div className="text-xs"><ExternalLink href={o.url}>{o.url.replace(/^https?:\/\/[^/]+/, '')}</ExternalLink></div>
                </DataTableTd>
                <DataTableTd>{o.action ? ACTION_LABEL[o.action] ?? o.action : '—'}</DataTableTd>
                <DataTableTd>{fmtDay(o.published_on)}</DataTableTd>
                <DataTableTd>{windowCell(o.baseline)}</DataTableTd>
                <DataTableTd>{windowCell(o.day_28)}</DataTableTd>
                <DataTableTd>{windowCell(o.day_56)}</DataTableTd>
                <DataTableTd><span className="text-xs" style={{ maxWidth: 320, display: 'inline-block' }}>{o.verdict ?? '—'}</span></DataTableTd>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
        <Pager offset={offset} limit={PAGE} count={rows.length} onChange={setOffset} />
      </BaseTab>
      {decisionId !== null && <DecisionModal decisionId={decisionId} clientName={clientName} onClose={() => setDecisionId(null)} />}
    </div>
  );
}

function EventsPanel({ clientId }: { clientId: string }) {
  const [kind, setKind] = useState('');
  const [rows, setRows] = useState<PublishEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<PublishEvent | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    dsv.publishEvents(clientId, { kind: kind || undefined, limit: 200 })
      .then(setRows)
      .catch((e) => setError(dsvErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [clientId, kind]);

  useEffect(() => { load(); }, [load]);
  const pager = usePagination(rows, kind);

  return (
    <div className="space-y-4">
      <DataTableToolbar right={<button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={load}><RefreshCwIcon size={13} /> Rafraîchir</button>}>
        <select className="adm-select adm-select--sm" aria-label="Type d’envoi" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">Tous les envois</option>
          <option value="article">Articles</option>
          <option value="indexnow">IndexNow</option>
          <option value="backlinks">Liens retour</option>
        </select>
      </DataTableToolbar>
      <BaseTab loading={loading} error={error} onRetry={load}>
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableTh>Date</DataTableTh>
              <DataTableTh>Type</DataTableTh>
              <DataTableTh>Brouillon</DataTableTh>
              <DataTableTh>Cible</DataTableTh>
              <DataTableTh>Résultat</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {rows.length === 0 && <DataTableEmpty icon={<SendIcon size={28} />} label="Aucun envoi pour ce client." />}
            {pager.pageRows.map((ev) => (
              <DataTableRow key={ev.id} onClick={() => setOpen(open?.id === ev.id ? null : ev)}>
                <DataTableTd>{fmtDate(ev.created_at)}</DataTableTd>
                <DataTableTd>{EVENT_KIND[ev.kind] ?? ev.kind}</DataTableTd>
                <DataTableTd>{ev.draft_id ? `#${ev.draft_id}` : '—'}</DataTableTd>
                <DataTableTd><span className="text-xs"><ExternalLink href={ev.target} /></span></DataTableTd>
                <DataTableTd>
                  {ev.status === 'success'
                    ? <span className="dsv-ok font-medium">Réussi</span>
                    : <span className="text-destructive font-medium">Échec{typeof ev.detail?.error === 'string' ? ` : ${ev.detail.error}` : ''}</span>}
                </DataTableTd>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
        <DataTablePagination {...pager} />
      </BaseTab>
      {open && <PublishEventResult event={open} />}
    </div>
  );
}

function DecisionLinksPanel() {
  const [input, setInput] = useState('');
  const [links, setLinks] = useState<LinkPlan[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decisionId, setDecisionId] = useState<number | null>(null);

  function show() {
    const id = Number(input);
    if (!Number.isInteger(id) || id <= 0) return;
    setLoading(true);
    setError(null);
    setDecisionId(id);
    dsv.decisionLinks(id).then(setLinks).catch((e) => { setLinks(null); setError(dsvErrorMessage(e)); }).finally(() => setLoading(false));
  }

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); show(); }}>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="dsv-links-decision">N° de décision</label>
          <input id="dsv-links-decision" className="adm-input" style={{ width: 160 }} inputMode="numeric" value={input} onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))} />
        </div>
        <button type="submit" className="adm-btn adm-btn--primary" disabled={!input || loading}>{loading ? 'Chargement…' : 'Afficher les liens'}</button>
      </form>
      <p className="text-xs text-muted-foreground">Les liens d’une décision sont aussi visibles dans sa fiche (onglet Décisions).</p>
      {error && <ErrorNote>{error}</ErrorNote>}
      {links && decisionId !== null && (
        <div className="space-y-2">
          <p className="text-sm">Décision n° {decisionId} : {links.length} lien{links.length > 1 ? 's' : ''}, dont {links.filter((l) => l.required).length} obligatoire{links.filter((l) => l.required).length > 1 ? 's' : ''}.</p>
          <LinksTable links={links} />
        </div>
      )}
    </div>
  );
}

function OrphansPanel({ clientId }: { clientId: string }) {
  const [report, setReport] = useState<OrphanReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'problems' | 'all'>('problems');

  useEffect(() => { setReport(null); setError(null); }, [clientId]);

  function run() {
    setLoading(true);
    setError(null);
    dsv.orphanReport(clientId).then(setReport).catch((e) => setError(dsvErrorMessage(e))).finally(() => setLoading(false));
  }

  const rows = useMemo(() => {
    const all = report?.details ?? [];
    const list = filter === 'all' ? all : all.filter((a) => a.inbound === 0 || a.outbound === 0 || a.outbound === null || a.dead_links.length > 0);
    return [...list].sort((a, b) => a.inbound - b.inbound || (a.outbound ?? -1) - (b.outbound ?? -1));
  }, [report, filter]);
  const pager = usePagination(rows, filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="adm-btn adm-btn--primary" disabled={loading} onClick={run}>
          <RefreshCwIcon size={14} className={loading ? 'adm-spin' : ''} />
          {loading ? 'Analyse en cours (jusqu’à trois minutes)…' : report ? 'Relancer l’analyse' : 'Lancer l’analyse des liens'}
        </button>
        <span className="text-xs text-muted-foreground">Lit chaque article en ligne sur le site client : opération lente, lancée seulement à la demande.</span>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      {report && (
        <div className="space-y-4">
          {report.error && <ErrorNote>{report.error}{report.tried.length ? ` (essayé : ${report.tried.join(', ')})` : ''}</ErrorNote>}
          {report.partial && <InfoNote>Rapport partiel : certains articles n’ont pas pu être lus.</InfoNote>}
          <div className="dsv-grid">
            <Field label="Articles en ligne" value={fmtNumber(report.articles)} />
            <Field label="Sans lien entrant" value={fmtNumber(report.no_inbound)} />
            <Field label="Sans lien sortant" value={fmtNumber(report.no_outbound)} />
            <Field label="Isolés (ni l’un ni l’autre)" value={fmtNumber(report.isolated)} />
            <Field label="Contenu non lu" value={fmtNumber(report.content_unknown)} />
            <Field label="Liens morts" value={fmtNumber(report.dead_links)} />
          </div>
          {report.source && <p className="text-xs text-muted-foreground">Source : {report.source}</p>}
          <div className="flex items-center gap-2">
            <select className="adm-select adm-select--sm" aria-label="Articles affichés" value={filter} onChange={(e) => setFilter(e.target.value as 'problems' | 'all')}>
              <option value="problems">Articles à traiter</option>
              <option value="all">Tous les articles</option>
            </select>
            <span className="text-xs text-muted-foreground">{rows.length} article{rows.length > 1 ? 's' : ''}</span>
          </div>
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableTh>Article</DataTableTh>
                <DataTableTh>Langue</DataTableTh>
                <DataTableTh>Liens entrants</DataTableTh>
                <DataTableTh>Liens sortants</DataTableTh>
                <DataTableTh>Liens morts</DataTableTh>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {rows.length === 0 && <DataTableEmpty icon={<LayersIcon size={28} />} label="Aucun article à traiter." />}
              {pager.pageRows.map((a) => (
                <DataTableRow key={`${a.slug}-${a.language}`}>
                  <DataTableTd><div className="font-medium text-foreground">{a.slug}</div><div className="text-xs text-muted-foreground">{a.path}</div></DataTableTd>
                  <DataTableTd>{langLabel(a.language)}</DataTableTd>
                  <DataTableTd>{a.inbound === 0 ? <span className="text-destructive font-medium">0</span> : a.inbound}</DataTableTd>
                  <DataTableTd>{a.outbound === null ? <span className="text-muted-foreground">non lu</span> : a.outbound === 0 ? <span className="text-destructive font-medium">0</span> : a.outbound}</DataTableTd>
                  <DataTableTd><span className="text-xs">{a.dead_links.length ? a.dead_links.join(', ') : '—'}</span></DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
          <DataTablePagination {...pager} />
          {report.errors.length > 0 && (
            <Collapsible title={`Erreurs de lecture (${report.errors.length})`}><JsonView value={report.errors} maxHeight={260} /></Collapsible>
          )}
        </div>
      )}
    </div>
  );
}

type ResultsView = 'outcomes' | 'events' | 'links' | 'orphans';

export function ResultsTab({ clientId, clientName }: { clientId: string; clientName?: string }) {
  const [view, setView] = useState<ResultsView>('outcomes');
  return (
    <div>
      <SubTabs<ResultsView>
        value={view}
        onChange={setView}
        items={[
          { value: 'outcomes', label: 'Résultats' },
          { value: 'events', label: 'Historique des envois' },
          { value: 'links', label: 'Liens d’une décision' },
          { value: 'orphans', label: 'Articles orphelins' },
        ]}
      />
      {view === 'outcomes' && <OutcomesPanel clientId={clientId} clientName={clientName} />}
      {view === 'events' && <EventsPanel clientId={clientId} />}
      {view === 'links' && <DecisionLinksPanel />}
      {view === 'orphans' && <OrphansPanel clientId={clientId} />}
    </div>
  );
}
