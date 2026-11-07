import { useCallback, useEffect, useState } from 'react';

import { BaseTab } from '@/components/common/BaseTab';
import { Modal } from '@/components/common/Modal';
import {
  DataTable, DataTableAction, DataTableBody, DataTableEmpty, DataTableHead, DataTableRow, DataTableTd, DataTableTh,
  DataTableToolbar,
} from '@/components/common/DataTable';
import {
  dsv, dsvErrorMessage,
  type BriefPreview, type Decision, type DecisionDetail, type DraftSummary, type LinkPlan, type Outcome,
} from '@/services/dsv';
import { EyeIcon, RefreshCwIcon, TargetIcon } from '@icons';

import { DraftModal } from './DraftModal';
import {
  ACTION_LABEL, Collapsible, DECISION_STATUS, DRAFT_STATUS, EVIDENCE_KIND, EVIDENCE_ORDER, ErrorNote, ExternalLink, Field,
  JsonView, LINK_RELATION, LINK_STATUS, PASSED, Pager, Section, StatusTag, fmtDate, fmtDay, fmtNumber, langLabel,
} from './shared';

const PAGE = 50;

export function OutcomeBlock({ outcome }: { outcome: Outcome }) {
  const cell = (w: Outcome['baseline']) => w
    ? `position ${w.position ?? '—'}, ${fmtNumber(w.impressions ?? 0)} impressions, ${fmtNumber(w.clicks ?? 0)} clics`
    : 'pas encore mesuré';
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{outcome.verdict ?? 'Pas de verdict'}</p>
      <div className="dsv-grid">
        <Field label="Avant publication" value={cell(outcome.baseline)} />
        <Field label="À 28 jours" value={cell(outcome.day_28)} />
        <Field label="À 56 jours" value={cell(outcome.day_56)} />
      </div>
      <p className="text-xs text-muted-foreground">Publié le {fmtDay(outcome.published_on)} : <ExternalLink href={outcome.url} /></p>
    </div>
  );
}

export function LinksTable({ links }: { links: LinkPlan[] }) {
  if (!links.length) return <p className="text-sm text-muted-foreground">Aucun lien prévu pour cette décision.</p>;
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead className="adm-table__head">
          <tr>
            <th className="adm-table__th">Relation</th>
            <th className="adm-table__th">Cible</th>
            <th className="adm-table__th">Ancre suggérée</th>
            <th className="adm-table__th">Obligatoire</th>
            <th className="adm-table__th">Statut</th>
          </tr>
        </thead>
        <tbody className="adm-table__body">
          {links.map((l) => (
            <tr key={l.id} className="adm-table__row">
              <td className="adm-table__td">
                {LINK_RELATION[l.relation] ?? l.relation}
                {l.source_url && <div className="text-xs text-muted-foreground">depuis <ExternalLink href={l.source_url} /></div>}
              </td>
              <td className="adm-table__td text-xs"><ExternalLink href={l.target_url} /><div className="text-muted-foreground">{l.target_kind === 'resource' ? 'Ressource' : 'Article'} · {langLabel(l.language)}</div></td>
              <td className="adm-table__td text-sm">{l.anchor_hint}</td>
              <td className="adm-table__td">{l.required ? 'Oui' : 'Non'}</td>
              <td className="adm-table__td"><StatusTag map={LINK_STATUS} value={l.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DecisionModal({ decisionId, clientName, onClose }: { decisionId: number; clientName?: string; onClose: () => void }) {
  const [detail, setDetail] = useState<DecisionDetail | null>(null);
  const [links, setLinks] = useState<LinkPlan[] | null>(null);
  const [drafts, setDrafts] = useState<DraftSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<BriefPreview | null>(null);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [draftId, setDraftId] = useState<number | null>(null);

  useEffect(() => {
    dsv.decisionDetail(decisionId).then(setDetail).catch((e) => setError(dsvErrorMessage(e)));
    dsv.decisionLinks(decisionId).then(setLinks).catch(() => setLinks([]));
    dsv.decisionDrafts(decisionId).then(setDrafts).catch(() => setDrafts([]));
  }, [decisionId]);

  function loadBrief() {
    setBriefLoading(true);
    setBriefError(null);
    dsv.briefPreview(decisionId).then(setBrief).catch((e) => setBriefError(dsvErrorMessage(e))).finally(() => setBriefLoading(false));
  }

  const d = detail?.decision;
  const metrics = d?.evidence_snapshot?.metrics;
  // L'API rend toutes les preuves actuelles, les plus recentes d'abord : on garde la derniere de chaque type.
  const evidence = (detail?.evidence ?? [])
    .filter((ev, i, all) => all.findIndex((other) => other.kind === ev.kind) === i)
    .sort((a, b) => EVIDENCE_ORDER.indexOf(a.kind) - EVIDENCE_ORDER.indexOf(b.kind));

  return (
    <>
      {/* Un brouillon ouvert remplace la fenetre (pas de fenetres empilees) ; on y revient en le fermant. */}
      <Modal
        open={draftId === null}
        onClose={onClose}
        size="xl"
        title={d?.question ?? `Décision n° ${decisionId}`}
        subtitle={d ? `${clientName ?? d.client_id} · ${langLabel(d.language)} · décidée le ${fmtDay(d.decided_on)}` : undefined}
        badge={d ? <span>{ACTION_LABEL[d.action] ?? d.action}</span> : undefined}
      >
        {error && <ErrorNote>{error}</ErrorNote>}
        {!d && !error && <div className="flex justify-center py-12"><RefreshCwIcon className="adm-spin text-muted-foreground" size={20} /></div>}
        {d && (
          <div className="space-y-6">
            <Section title="Décision">
              <div className="dsv-grid">
                <Field label="Action" value={ACTION_LABEL[d.action] ?? d.action} />
                <Field label="Priorité" value={d.priority} />
                <Field label="Statut" value={<StatusTag map={DECISION_STATUS} value={d.status} />} />
                <Field label="Versions de configuration" value={Object.entries(d.config_versions ?? {}).map(([k, v]) => `${k} n° ${v}`).join(', ') || '—'} />
              </div>
              <p className="text-sm text-foreground mt-2">{d.reason}</p>
              {d.target_url && <p className="text-sm">Page visée : <ExternalLink href={d.target_url} /></p>}
              {d.status_note && <p className="text-xs text-muted-foreground">Note de statut : {d.status_note}</p>}
            </Section>

            {detail?.question && (
              <Section title="Question">
                <div className="dsv-grid">
                  <Field label="N°" value={detail.question.id} />
                  <Field label="Nœud" value={detail.question.node_key ?? '—'} />
                  <Field label="Intention" value={detail.question.intent ?? '—'} />
                  <Field label="Statut" value={detail.question.status} />
                </div>
              </Section>
            )}

            {metrics && (
              <Section title="Mesures au moment de la décision">
                <div className="dsv-grid">
                  <Field label="Impressions" value={fmtNumber(metrics.impressions)} />
                  <Field label="Clics" value={fmtNumber(metrics.clicks)} />
                  <Field label="28 derniers jours" value={fmtNumber(metrics.recent_28d)} />
                  <Field label="28 jours d’avant" value={fmtNumber(metrics.previous_28d)} />
                  <Field label="Volume Bing" value={fmtNumber(metrics.bing_volume ?? null)} />
                </div>
                {!!metrics.pages?.length && (
                  <ul className="mt-2 space-y-2 text-xs">
                    {metrics.pages.map((p) => (
                      <li key={p.url}><ExternalLink href={p.url} /> : {fmtNumber(p.impressions)} impressions, {fmtNumber(p.clicks)} clics, position {p.position ?? '—'}</li>
                    ))}
                  </ul>
                )}
              </Section>
            )}

            <Section title="Preuves actuelles de la question">
              {evidence.length === 0 && <p className="text-sm text-muted-foreground">Aucune preuve.</p>}
              <div className="dsv-grid dsv-grid--cards">
                {evidence.map((ev) => (
                  <div key={ev.id} className="dsv-card space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{EVIDENCE_KIND[ev.kind] ?? ev.kind}{ev.level ? ` · niveau ${ev.level}` : ''}</span>
                      <StatusTag map={PASSED} value={ev.passed} />
                    </div>
                    <p className="text-sm">{ev.summary}</p>
                    <p className="text-xs text-muted-foreground">Collectée le {fmtDate(ev.collected_at)}, expire le {fmtDate(ev.expires_at)}</p>
                    {Object.keys(ev.payload ?? {}).length > 0 && (
                      <Collapsible title="Données brutes"><JsonView value={ev.payload} maxHeight={240} /></Collapsible>
                    )}
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Brouillons">
              {drafts === null && <p className="text-sm text-muted-foreground">Chargement…</p>}
              {drafts?.length === 0 && <p className="text-sm text-muted-foreground">Aucun brouillon rédigé pour cette décision.</p>}
              <ul className="space-y-2">
                {drafts?.map((dr) => (
                  <li key={dr.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <button type="button" className="adm-table__title-btn" onClick={() => setDraftId(dr.id)}>#{dr.id} {dr.title}</button>
                    <StatusTag map={DRAFT_STATUS} value={dr.status} />
                    <span className="text-xs text-muted-foreground">tentative {dr.attempt}, {fmtDate(dr.created_at)}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Liens">
              {links === null ? <p className="text-sm text-muted-foreground">Chargement…</p> : <LinksTable links={links} />}
            </Section>

            <Section title="Résultat">
              {detail?.outcome ? <OutcomeBlock outcome={detail.outcome} /> : <p className="text-sm text-muted-foreground">Pas encore de mesure (la mesure commence à la publication).</p>}
            </Section>

            <Section
              title="Brief de rédaction"
              actions={!brief && (
                <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" disabled={briefLoading} onClick={loadBrief}>
                  {briefLoading ? 'Chargement…' : 'Afficher le brief et le prompt'}
                </button>
              )}
            >
              <p className="text-xs text-muted-foreground">Ce que la rédaction enverrait au modèle, sans l’appeler.</p>
              {briefError && <ErrorNote>{briefError}</ErrorNote>}
              {brief && (
                <div className="space-y-2">
                  <Collapsible title="Brief" defaultOpen><JsonView value={brief.brief} maxHeight={360} /></Collapsible>
                  <Collapsible title="Consigne système"><pre className="text-xs dsv-pre-wrap">{brief.system}</pre></Collapsible>
                  <Collapsible title="Message utilisateur"><pre className="text-xs dsv-pre-wrap">{brief.user}</pre></Collapsible>
                </div>
              )}
            </Section>
          </div>
        )}
      </Modal>
      {draftId !== null && <DraftModal draftId={draftId} clientName={clientName} onClose={() => setDraftId(null)} />}
    </>
  );
}

export function DecisionsTab({ clientId, clientName }: { clientId: string; clientName?: string }) {
  const [status, setStatus] = useState('');
  const [action, setAction] = useState('');
  const [since, setSince] = useState('');
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    dsv.decisions({ client_id: clientId, status: status || undefined, action: action || undefined, since: since || undefined, limit: PAGE, offset })
      .then(setRows)
      .catch((e) => setError(dsvErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [clientId, status, action, since, offset]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setOffset(0); }, [clientId, status, action, since]);

  return (
    <div className="space-y-4">
      <DataTableToolbar
        right={(
          <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={load}><RefreshCwIcon size={13} /> Rafraîchir</button>
        )}
      >
        <select className="adm-select adm-select--sm" aria-label="Statut" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(DECISION_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="adm-select adm-select--sm" aria-label="Action" value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">Toutes les actions</option>
          {Object.entries(ACTION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Depuis le
          <input type="date" className="adm-input" style={{ width: 'auto', padding: '5px 8px' }} value={since} onChange={(e) => setSince(e.target.value)} />
        </label>
      </DataTableToolbar>

      <BaseTab loading={loading} error={error} onRetry={load}>
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableTh>Date</DataTableTh>
              <DataTableTh>Question</DataTableTh>
              <DataTableTh>Action</DataTableTh>
              <DataTableTh>Priorité</DataTableTh>
              <DataTableTh>Raison</DataTableTh>
              <DataTableTh>Statut</DataTableTh>
              <DataTableTh>Détail</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {rows.length === 0 && <DataTableEmpty icon={<TargetIcon size={28} />} label="Aucune décision pour ces filtres." />}
            {rows.map((d) => (
              <DataTableRow key={d.id} onClick={() => setOpenId(d.id)}>
                <DataTableTd>{fmtDay(d.decided_on)}</DataTableTd>
                <DataTableTd>
                  <div className="font-medium text-foreground">{d.question ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">{langLabel(d.language)} · n° {d.id}</div>
                </DataTableTd>
                <DataTableTd>{ACTION_LABEL[d.action] ?? d.action}</DataTableTd>
                <DataTableTd>{d.priority}</DataTableTd>
                <DataTableTd><span className="text-xs text-muted-foreground dsv-clamp-2" style={{ maxWidth: 420 }}>{d.reason}</span></DataTableTd>
                <DataTableTd><StatusTag map={DECISION_STATUS} value={d.status} /></DataTableTd>
                <DataTableTd>
                  <div className="adm-table__actions">
                    <DataTableAction icon={EyeIcon} label="Détail" onClick={() => setOpenId(d.id)} />
                  </div>
                </DataTableTd>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
        <Pager offset={offset} limit={PAGE} count={rows.length} onChange={setOffset} />
      </BaseTab>

      {openId !== null && <DecisionModal decisionId={openId} clientName={clientName} onClose={() => setOpenId(null)} />}
    </div>
  );
}

export { DecisionModal };
