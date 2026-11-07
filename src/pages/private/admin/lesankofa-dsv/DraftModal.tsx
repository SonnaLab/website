import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Modal } from '@/components/common/Modal';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { MarkdownRenderer } from '@/components/public/blog/MarkdownRenderer';
import {
  dsv, dsvErrorDetail, dsvErrorMessage,
  type DecisionDetail, type DraftDetail, type DraftEdits, type PublishEvent, type QualityCheck,
} from '@/services/dsv';
import {
  AlertTriangleIcon, CheckCircle2Icon, RefreshCwIcon, SendIcon, XCircleIcon,
} from '@icons';

import {
  ACTION_LABEL, CharCount, EVENT_KIND, Collapsible, DECISION_STATUS, DRAFT_STATUS, EVIDENCE_KIND, EVIDENCE_ORDER, ErrorNote,
  ExternalLink, Field, InfoNote, JsonView, PASSED, QUALITY_RULE, Section, StatusTag, SubTabs, fmtDate, fmtNumber, langLabel,
} from './shared';

type Tab = 'preview' | 'seo' | 'social' | 'quality' | 'evidence' | 'edit' | 'history';
type Panel = null | 'approve' | 'reject';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REVIEWABLE = ['in_review', 'quality_failed'];
const EDITABLE = [...REVIEWABLE, 'approved'];

interface SeoLimits { seoTitle: { min?: number; max?: number }; meta: { min?: number; max?: number }; slugMax?: number }

interface EditForm {
  title: string;
  seo_title: string;
  meta_description: string;
  slug: string;
  excerpt: string;
  content_markdown: string;
  social_posts: Record<string, string>;
}

function ruleLabel(rule: string): string {
  return QUALITY_RULE[rule] ?? rule;
}

function checkState(c: QualityCheck): { label: string; tone: string } {
  if (c.status === 'not_implemented') return { label: 'Non vérifié', tone: 'text-muted-foreground' };
  if (c.status === 'error') return { label: 'Erreur du contrôle', tone: 'text-destructive' };
  return c.passed ? { label: 'Réussi', tone: 'dsv-ok' } : { label: 'Échec', tone: 'text-destructive' };
}

/** Liste des controles bloquants en echec, avec l'extrait fautif (detail). */
function BlockingFailures({ failures }: { failures: QualityCheck[] }) {
  if (!failures.length) return null;
  return (
    <div className="dsv-note dsv-note--error" role="alert">
      <div className="dsv-note__body space-y-2">
      <p className="dsv-note__title">
        <AlertTriangleIcon size={15} />
        {failures.length === 1 ? '1 contrôle bloquant en échec' : `${failures.length} contrôles bloquants en échec`} : validation impossible en l’état
      </p>
      <ul className="space-y-2">
        {failures.map((f, i) => (
          <li key={`${f.rule}-${i}`} className="text-sm">
            <span className="font-medium text-foreground">{ruleLabel(f.rule)}</span>
            {f.detail && <span className="block dsv-mono text-muted-foreground mt-1">{f.detail}</span>}
          </li>
        ))}
      </ul>
      </div>
    </div>
  );
}

/** Resultat d'un envoi au site client, tel que Lesankofa l'a enregistre. */
export function PublishEventResult({ event }: { event: PublishEvent }) {
  const ok = event.status === 'success';
  const detail = (event.detail ?? {}) as Record<string, unknown>;
  const after = (detail.after ?? null) as Record<string, unknown> | null;
  const social = (after?.social ?? null) as { sent?: string[]; missing?: string[]; client_status?: string } | null;
  return (
    <div className={`dsv-note ${ok ? 'dsv-note--success' : 'dsv-note--error'}`} role="status">
      <div className="dsv-note__body space-y-2">
      <p className="dsv-note__title">
        {ok ? <CheckCircle2Icon size={15} /> : <XCircleIcon size={15} />}
        {ok ? 'Publié sur le site client' : 'Échec de la publication'}
        {event.http_status ? <span className="font-normal text-muted-foreground">(HTTP {event.http_status})</span> : null}
      </p>
      {ok && event.target && <p className="text-sm">Adresse : <ExternalLink href={event.target} /></p>}
      {!ok && typeof detail.error === 'string' && <p className="text-sm text-foreground">Raison : {detail.error}</p>}
      {!ok && typeof detail.body === 'string' && detail.body && (
        <p className="dsv-mono text-muted-foreground">{detail.body}</p>
      )}
      {social && (
        <p className="text-xs text-muted-foreground">
          Posts sociaux transmis au site : {social.sent?.length ? social.sent.join(', ') : 'aucun'}
          {social.missing?.length ? ` ; manquants : ${social.missing.join(', ')}` : ''}
          {social.client_status ? ` (diffusion : ${social.client_status})` : ''}
        </p>
      )}
      {after && (
        <Collapsible title="Suites de la publication (IndexNow, liens retour, mesure de référence)">
          <JsonView value={after} maxHeight={260} />
        </Collapsible>
      )}
      <p className="text-xs text-muted-foreground">Événement n° {event.id}, {fmtDate(event.created_at)}</p>
      </div>
    </div>
  );
}

function formFrom(detail: DraftDetail): EditForm {
  const d = detail.draft;
  const briefSocial = (d.brief?.social ?? {}) as { platforms?: string[] };
  const platforms = Array.from(new Set([...(briefSocial.platforms ?? []), ...Object.keys(d.social_posts ?? {})]));
  return {
    title: d.title,
    seo_title: d.seo_title,
    meta_description: d.meta_description,
    slug: d.slug,
    excerpt: d.excerpt ?? '',
    content_markdown: d.content_markdown,
    social_posts: Object.fromEntries(platforms.map((p) => [p, d.social_posts?.[p] ?? ''])),
  };
}

function platformLabel(p: string) {
  return p === 'linkedin' ? 'LinkedIn' : p === 'facebook' ? 'Facebook' : p;
}

export function DraftModal({ draftId, clientName, onClose, onChanged }: {
  draftId: number;
  clientName?: string;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const confirm = useConfirm();
  const [currentId, setCurrentId] = useState(draftId);
  const [detail, setDetail] = useState<DraftDetail | null>(null);
  const [decision, setDecision] = useState<DecisionDetail | null>(null);
  const [events, setEvents] = useState<PublishEvent[] | null>(null);
  const [limits, setLimits] = useState<SeoLimits>({ seoTitle: {}, meta: {} });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('preview');
  const [panel, setPanel] = useState<Panel>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ message: string; failures?: QualityCheck[] } | null>(null);
  const [publishResult, setPublishResult] = useState<PublishEvent | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Le panneau de validation ou de refus, les erreurs et le resultat d'envoi s'affichent en haut : on y remonte.
  useEffect(() => {
    if (panel || actionError || publishResult) topRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [panel, actionError, publishResult]);

  const load = useCallback(async (id: number) => {
    setLoading(true);
    setLoadError(null);
    try {
      const d = await dsv.draftDetail(id);
      setDetail(d);
      setForm(formFrom(d));
      dsv.decisionDetail(d.draft.decision_id).then(setDecision).catch(() => setDecision(null));
      dsv.publishEvents(d.draft.client_id, { draft_id: id, limit: 50 }).then(setEvents).catch(() => setEvents([]));
    } catch (e) {
      setLoadError(dsvErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { setPublishResult(null); setPanel(null); load(currentId); }, [currentId, load]);

  // Longueurs exigees par la barriere qualite, lues dans la configuration generale active.
  useEffect(() => {
    dsv.configVersions('general').then((versions) => {
      const active = versions.find((v) => v.status === 'active');
      const seo = (active?.payload?.seo ?? []) as Array<{ key: string; params?: Record<string, number> }>;
      const p = (key: string) => seo.find((r) => r.key === key)?.params ?? {};
      setLimits({
        seoTitle: { min: p('seo_title').min, max: p('seo_title').max },
        meta: { min: p('meta_description').min, max: p('meta_description').max },
        slugMax: p('slug').max_length,
      });
    }).catch(() => undefined);
  }, []);

  const draft = detail?.draft;
  const status = draft?.status ?? '';
  const failures = detail?.blocking_failures ?? [];

  const changes = useMemo<DraftEdits>(() => {
    if (!draft || !form) return {};
    const out: DraftEdits = {};
    (['title', 'seo_title', 'meta_description', 'slug', 'content_markdown'] as const).forEach((k) => {
      if (form[k] !== draft[k]) out[k] = form[k];
    });
    if (form.excerpt !== (draft.excerpt ?? '')) out.excerpt = form.excerpt;
    const before = draft.social_posts ?? {};
    const socialChanged = Object.keys(form.social_posts).some((p) => (before[p] ?? '') !== form.social_posts[p]);
    if (socialChanged) out.social_posts = { ...before, ...form.social_posts };
    return out;
  }, [draft, form]);

  const formErrors = useMemo(() => {
    if (!form) return [];
    const errs: string[] = [];
    if (form.title.trim().length < 3) errs.push('Le titre doit faire au moins 3 caractères.');
    if (form.seo_title.trim().length < 3) errs.push('Le titre SEO doit faire au moins 3 caractères.');
    if (form.meta_description.trim().length < 10) errs.push('La méta-description doit faire au moins 10 caractères.');
    if (!SLUG_RE.test(form.slug)) errs.push('Le slug ne contient que des minuscules sans accent, des chiffres et des tirets simples.');
    if (form.content_markdown.trim().length < 50) errs.push('Le contenu doit faire au moins 50 caractères.');
    return errs;
  }, [form]);

  const changedCount = Object.keys(changes).length;

  function afterAction(next: DraftDetail) {
    setDetail(next);
    setForm(formFrom(next));
    onChanged?.();
    dsv.publishEvents(next.draft.client_id, { draft_id: next.draft.id, limit: 50 }).then(setEvents).catch(() => undefined);
  }

  async function saveEdits() {
    if (!draft || !changedCount || formErrors.length) return;
    if (status === 'approved') {
      const ok = await confirm({
        title: 'Modifier un brouillon déjà validé ?',
        message: 'La validation sera annulée : le brouillon repasse par la barrière qualité puis en validation.',
        confirmLabel: 'Enregistrer',
        danger: false,
      });
      if (!ok) return;
    }
    setBusy('edit');
    setActionError(null);
    try {
      const next = await dsv.editDraft(draft.id, changes);
      afterAction(next);
      if (next.blocking_failures.length) {
        toast.warning('Modifications enregistrées, mais des contrôles bloquants échouent encore.');
        setTab('quality');
      } else {
        toast.success('Modifications enregistrées, contrôles qualité réussis.');
        setTab('preview');
      }
    } catch (e) {
      setActionError({ message: dsvErrorMessage(e) });
    } finally {
      setBusy(null);
    }
  }

  async function approve() {
    if (!draft) return;
    setBusy('approve');
    setActionError(null);
    try {
      const next = await dsv.approveDraft(draft.id, notes.trim() || undefined);
      afterAction(next);
      setPanel(null);
      setNotes('');
      toast.success('Brouillon validé. Il n’est pas encore publié.');
    } catch (e) {
      const detailErr = dsvErrorDetail(e) as { failures?: QualityCheck[] } | undefined;
      setActionError({ message: dsvErrorMessage(e), failures: detailErr?.failures });
      load(draft.id); // le nouveau rapport qualite est garde meme si la validation est refusee
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    if (!draft || notes.trim().length < 3) return;
    setBusy('reject');
    setActionError(null);
    try {
      const next = await dsv.rejectDraft(draft.id, notes.trim());
      afterAction(next);
      setPanel(null);
      setNotes('');
      toast.success('Brouillon refusé.');
    } catch (e) {
      setActionError({ message: dsvErrorMessage(e) });
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    if (!draft || status !== 'approved') return;
    const ok = await confirm({
      title: `Publier sur ${clientName ?? draft.client_id} ?`,
      message: `« ${draft.title} » sera envoyé maintenant au site client, puis signalé à IndexNow. Cette action ne s’annule pas depuis cet écran.`,
      confirmLabel: 'Publier',
      danger: false,
    });
    if (!ok) return;
    setBusy('publish');
    setActionError(null);
    setPublishResult(null);
    try {
      const event = await dsv.publishDraft(draft.id);
      setPublishResult(event);
      if (event.status === 'success') toast.success('Article publié.');
      else toast.error('La publication a échoué.');
      await load(draft.id);
      onChanged?.();
    } catch (e) {
      setActionError({ message: dsvErrorMessage(e) });
    } finally {
      setBusy(null);
    }
  }

  async function rerunQuality() {
    if (!draft) return;
    setBusy('quality');
    setActionError(null);
    try {
      await dsv.runQuality(draft.id);
      await load(draft.id);
      toast.success('Contrôles qualité relancés.');
    } catch (e) {
      setActionError({ message: dsvErrorMessage(e) });
    } finally {
      setBusy(null);
    }
  }

  async function regenerate() {
    if (!draft) return;
    const ok = await confirm({
      title: 'Régénérer ce brouillon ?',
      message: 'Le modèle réécrit l’article à partir du brief (jusqu’à trois tentatives, plusieurs minutes, consomme du budget IA). Un nouveau brouillon remplace celui-ci dans la file.',
      confirmLabel: 'Régénérer',
      danger: false,
    });
    if (!ok) return;
    setBusy('regenerate');
    setActionError(null);
    try {
      const next = await dsv.regenerate(draft.decision_id);
      toast.success(`Nouveau brouillon n° ${next.id} (${DRAFT_STATUS[next.status]?.label ?? next.status}).`);
      onChanged?.();
      setTab('preview');
      setCurrentId(next.id);
    } catch (e) {
      setActionError({ message: dsvErrorMessage(e) });
    } finally {
      setBusy(null);
    }
  }

  const evidenceById = useMemo(() => new Map((decision?.evidence ?? []).map((e) => [e.id, e])), [decision]);
  const orderedEvidence = useMemo(
    () => [...(detail?.evidence ?? [])].sort((a, b) => EVIDENCE_ORDER.indexOf(a.kind) - EVIDENCE_ORDER.indexOf(b.kind)),
    [detail],
  );

  const footer = draft && (
    <div className="w-full flex flex-wrap items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">
        Brouillon n° {draft.id}, tentative {draft.attempt}, décision n° {draft.decision_id}
      </span>
      <div className="flex flex-wrap gap-2">
        {status === 'quality_failed' && (
          <button type="button" className="adm-btn adm-btn--ghost" disabled={!!busy} onClick={regenerate}>
            <RefreshCwIcon size={14} className={busy === 'regenerate' ? 'adm-spin' : ''} />
            {busy === 'regenerate' ? 'Régénération…' : 'Régénérer'}
          </button>
        )}
        {EDITABLE.includes(status) && (
          <button type="button" className="adm-btn adm-btn--danger" disabled={!!busy} onClick={() => { setPanel('reject'); setActionError(null); }}>
            <XCircleIcon size={14} /> Refuser
          </button>
        )}
        {REVIEWABLE.includes(status) && (
          <button
            type="button"
            className="adm-btn adm-btn--primary"
            disabled={!!busy || failures.length > 0}
            title={failures.length ? 'Corrigez d’abord les contrôles bloquants' : undefined}
            onClick={() => { setPanel('approve'); setActionError(null); }}
          >
            <CheckCircle2Icon size={14} /> Valider
          </button>
        )}
        {status === 'approved' && (
          <button type="button" className="adm-btn adm-btn--primary" disabled={!!busy} onClick={publish}>
            <SendIcon size={14} /> {busy === 'publish' ? 'Publication…' : 'Publier'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={draft?.title ?? (loading ? 'Chargement…' : 'Brouillon')}
      subtitle={draft ? (
        <span>
          {clientName ?? draft.client_id} · {langLabel(draft.language)} · créé le {fmtDate(draft.created_at)}
          {decision?.question ? <> · question : « {decision.question.text} »</> : null}
        </span>
      ) : undefined}
      badge={draft ? <span>{DRAFT_STATUS[status]?.label ?? status}</span> : undefined}
      footer={footer || undefined}
    >
      {loading && !detail && (
        <div className="flex justify-center py-12"><RefreshCwIcon className="adm-spin text-muted-foreground" size={20} /></div>
      )}
      {loadError && <ErrorNote>{loadError}</ErrorNote>}

      {draft && form && (
        <div className="space-y-4" ref={topRef}>
          {actionError && (
            <ErrorNote>
              <p>{actionError.message}</p>
              {actionError.failures?.length ? (
                <ul className="mt-1 dsv-list text-xs">
                  {actionError.failures.map((f, i) => <li key={i}>{ruleLabel(f.rule)} : {f.detail}</li>)}
                </ul>
              ) : null}
            </ErrorNote>
          )}

          {publishResult && <PublishEventResult event={publishResult} />}

          {status === 'published' && !publishResult && (
            <div className="dsv-note dsv-note--success">
              <div className="dsv-note__body">Publié le {fmtDate(draft.published_at)} : <ExternalLink href={draft.published_url} /></div>
            </div>
          )}
          {status === 'rejected' && draft.reviewer_notes && (
            <InfoNote>Refusé par {draft.reviewed_by ?? '—'} le {fmtDate(draft.reviewed_at)} : {draft.reviewer_notes}</InfoNote>
          )}
          {status === 'approved' && (
            <InfoNote>
              Validé par {draft.reviewed_by ?? '—'} le {fmtDate(draft.reviewed_at)}. Rien n’est envoyé au site tant que vous ne cliquez pas sur « Publier ».
            </InfoNote>
          )}

          <BlockingFailures failures={failures} />

          {panel && (
            <div className="dsv-panel space-y-3">
              <div className="adm-form__field">
                <label className="adm-form__label" htmlFor="dsv-review-notes">
                  {panel === 'reject' ? 'Raison du refus (obligatoire)' : 'Note de validation (facultative)'}
                </label>
                <textarea
                  id="dsv-review-notes"
                  className="adm-textarea"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={panel === 'reject' ? 'Ce qui ne va pas : sujet, faits, ton…' : ''}
                  autoFocus
                />
                {panel === 'reject' && notes.trim().length > 0 && notes.trim().length < 3 && (
                  <span className="text-xs text-destructive">Au moins 3 caractères.</span>
                )}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" className="adm-btn adm-btn--ghost" onClick={() => { setPanel(null); setNotes(''); }} disabled={!!busy}>Annuler</button>
                {panel === 'reject' ? (
                  <button type="button" className="adm-btn adm-btn--danger-solid" disabled={!!busy || notes.trim().length < 3} onClick={reject}>
                    {busy === 'reject' ? 'Refus…' : 'Confirmer le refus'}
                  </button>
                ) : (
                  <button type="button" className="adm-btn adm-btn--primary" disabled={!!busy} onClick={approve}>
                    {busy === 'approve' ? 'Validation…' : 'Confirmer la validation'}
                  </button>
                )}
              </div>
              {panel === 'approve' && (
                <p className="text-xs text-muted-foreground">La validation ne publie rien : la publication reste un clic séparé.</p>
              )}
            </div>
          )}

          <SubTabs<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'preview', label: 'Aperçu' },
              { value: 'seo', label: 'SEO' },
              { value: 'social', label: 'Réseaux sociaux' },
              { value: 'quality', label: <>Qualité{failures.length ? <span className="adm-tabs__count">{failures.length}</span> : null}</> },
              { value: 'evidence', label: 'Question et preuves' },
              { value: 'edit', label: 'Modifier', hidden: !EDITABLE.includes(status) },
              { value: 'history', label: 'Envois et détails' },
            ]}
          />

          {tab === 'preview' && (
            <article className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">{draft.title}</h2>
              {draft.excerpt && <p className="text-sm text-muted-foreground">{draft.excerpt}</p>}
              <div className="admin-news-articles__markdown">
                <MarkdownRenderer content={draft.content_markdown} lang={draft.language} />
              </div>
            </article>
          )}

          {tab === 'seo' && (
            <div className="space-y-4">
              <div className="dsv-grid">
                <Field label="Titre SEO" value={<>{draft.seo_title}<br /><CharCount value={draft.seo_title} {...limits.seoTitle} /></>} />
                <Field label="Slug" value={<code className="text-xs">{draft.slug}</code>} />
                <Field label="Méta-description" value={<>{draft.meta_description}<br /><CharCount value={draft.meta_description} {...limits.meta} /></>} />
                <Field label="Extrait" value={draft.excerpt || '—'} />
                <Field label="Recherche d’image" value={draft.image_query || '—'} />
                <Field label="Page visée par la décision" value={<ExternalLink href={detail?.decision?.target_url} />} />
              </div>
              <Section title="Aperçu dans les résultats de recherche">
                <div className="dsv-serp">
                  <p className="dsv-serp__url dsv-truncate">…/blog/{draft.slug}</p>
                  <p className="dsv-serp__title dsv-truncate">{draft.seo_title}</p>
                  <p className="dsv-serp__desc dsv-clamp-2">{draft.meta_description}</p>
                </div>
              </Section>
            </div>
          )}

          {tab === 'social' && (
            <div className="space-y-4">
              {Object.keys(form.social_posts).length === 0 && <InfoNote>Aucun réseau social configuré pour ce client.</InfoNote>}
              {Object.entries(draft.social_posts ?? {}).map(([platform, text]) => (
                <Section key={platform} title={platformLabel(platform)}>
                  <div className="dsv-card text-sm dsv-pre-wrap">{text || <span className="text-muted-foreground">Vide</span>}</div>
                  <span className="text-xs text-muted-foreground">{(text ?? '').length} caractères</span>
                </Section>
              ))}
              {Object.keys(form.social_posts).filter((p) => !(draft.social_posts ?? {})[p]).map((p) => (
                <InfoNote key={p}>Pas de post {platformLabel(p)} : il ne partira pas avec l’article.</InfoNote>
              ))}
            </div>
          )}

          {tab === 'quality' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm">
                  {detail?.quality
                    ? <>Rapport n° {detail.quality.id} du {fmtDate(detail.quality.created_at)} : <strong className={detail.quality.passed ? 'dsv-ok' : 'text-destructive'}>{detail.quality.passed ? 'réussi' : 'en échec'}</strong></>
                    : 'Aucun rapport qualité pour ce brouillon.'}
                </p>
                {status !== 'published' && (
                  <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" disabled={!!busy} onClick={rerunQuality}>
                    <RefreshCwIcon size={13} className={busy === 'quality' ? 'adm-spin' : ''} /> Relancer les contrôles
                  </button>
                )}
              </div>
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead className="adm-table__head">
                    <tr>
                      <th className="adm-table__th">Contrôle</th>
                      <th className="adm-table__th">Résultat</th>
                      <th className="adm-table__th">Bloquant</th>
                      <th className="adm-table__th">Détail</th>
                    </tr>
                  </thead>
                  <tbody className="adm-table__body">
                    {(detail?.quality?.checks ?? []).map((c, i) => {
                      const s = checkState(c);
                      const blockingFail = !c.passed && c.blocking;
                      return (
                        <tr key={`${c.rule}-${i}`} className={`adm-table__row${blockingFail ? ' dsv-table-row--danger' : ''}`}>
                          <td className="adm-table__td">
                            <div className="font-medium text-foreground">{ruleLabel(c.rule)}</div>
                            <code className="text-xs text-muted-foreground">{c.rule}</code>
                          </td>
                          <td className={`adm-table__td font-medium ${s.tone}`}>{s.label}</td>
                          <td className="adm-table__td">{c.blocking ? 'Oui' : 'Non'}</td>
                          <td className="adm-table__td dsv-mono" style={{ maxWidth: 520 }}>{c.detail}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'evidence' && (
            <div className="space-y-6">
              <Section title="Question">
                {decision?.question ? (
                  <div className="dsv-grid">
                    <Field label="Texte" value={decision.question.text} />
                    <Field label="Langue" value={langLabel(decision.question.language)} />
                    <Field label="Nœud" value={decision.question.node_key ?? '—'} />
                    <Field label="Intention" value={decision.question.intent ?? '—'} />
                    <Field label="Page cible" value={<ExternalLink href={decision.question.target_url} />} />
                    <Field label="N°" value={decision.question.id} />
                  </div>
                ) : <p className="text-sm text-muted-foreground">Question non chargée.</p>}
              </Section>

              {detail?.decision && (
                <Section title="Décision">
                  <div className="dsv-grid">
                    <Field label="Action" value={ACTION_LABEL[detail.decision.action] ?? detail.decision.action} />
                    <Field label="Priorité" value={detail.decision.priority} />
                    <Field label="Statut" value={<StatusTag map={DECISION_STATUS} value={detail.decision.status} />} />
                  </div>
                  <p className="text-sm text-foreground mt-2">{detail.decision.reason}</p>
                </Section>
              )}

              <Section title="Preuves (dernier dossier de chaque type)">
                {orderedEvidence.length === 0 && <p className="text-sm text-muted-foreground">Aucune preuve enregistrée pour cette question.</p>}
                <div className="dsv-grid dsv-grid--cards">
                  {orderedEvidence.map((ev) => {
                    const full = evidenceById.get(ev.id);
                    return (
                      <div key={ev.id} className="dsv-card space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{EVIDENCE_KIND[ev.kind] ?? ev.kind}{ev.level ? ` · niveau ${ev.level}` : ''}</span>
                          <StatusTag map={PASSED} value={ev.passed} />
                        </div>
                        <p className="text-sm text-foreground">{ev.summary}</p>
                        <p className="text-xs text-muted-foreground">Collectée le {fmtDate(ev.collected_at)}, expire le {fmtDate(ev.expires_at)}</p>
                        {full && Object.keys(full.payload ?? {}).length > 0 && (
                          <Collapsible title="Données brutes"><JsonView value={full.payload} maxHeight={240} /></Collapsible>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Section>

              {detail?.decision?.evidence_snapshot?.metrics && (
                <Section title="Mesures au moment de la décision">
                  <div className="dsv-grid">
                    <Field label="Impressions (90 j)" value={fmtNumber(detail.decision.evidence_snapshot.metrics.impressions)} />
                    <Field label="Clics" value={fmtNumber(detail.decision.evidence_snapshot.metrics.clicks)} />
                    <Field label="28 derniers jours" value={fmtNumber(detail.decision.evidence_snapshot.metrics.recent_28d)} />
                    <Field label="Volume Bing" value={fmtNumber(detail.decision.evidence_snapshot.metrics.bing_volume ?? null)} />
                  </div>
                </Section>
              )}
            </div>
          )}

          {tab === 'edit' && EDITABLE.includes(status) && (
            <div className="adm-form space-y-4">
              <InfoNote>
                Chaque enregistrement relance la barrière qualité. {status === 'approved' ? 'Ce brouillon est validé : le modifier annule la validation.' : ''}
              </InfoNote>
              <div className="adm-form__field">
                <label className="adm-form__label" htmlFor="dsv-title">Titre</label>
                <input id="dsv-title" className="adm-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="adm-form__row">
                <div className="adm-form__field">
                  <label className="adm-form__label" htmlFor="dsv-seo-title">Titre SEO</label>
                  <input id="dsv-seo-title" className="adm-input" value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} />
                  <CharCount value={form.seo_title} {...limits.seoTitle} />
                </div>
                <div className="adm-form__field">
                  <label className="adm-form__label" htmlFor="dsv-slug">Slug</label>
                  <input id="dsv-slug" className="adm-input font-mono" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                  <CharCount value={form.slug} max={limits.slugMax} />
                </div>
              </div>
              <div className="adm-form__field">
                <label className="adm-form__label" htmlFor="dsv-meta">Méta-description</label>
                <textarea id="dsv-meta" className="adm-textarea" rows={2} value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} />
                <CharCount value={form.meta_description} {...limits.meta} />
              </div>
              <div className="adm-form__field">
                <label className="adm-form__label" htmlFor="dsv-excerpt">Extrait</label>
                <textarea id="dsv-excerpt" className="adm-textarea" rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
              </div>
              <div className="adm-form__field">
                <label className="adm-form__label" htmlFor="dsv-content">Contenu (Markdown)</label>
                <textarea id="dsv-content" className="adm-textarea font-mono text-xs" rows={22} value={form.content_markdown} onChange={(e) => setForm({ ...form, content_markdown: e.target.value })} />
              </div>
              {Object.keys(form.social_posts).map((p) => (
                <div key={p} className="adm-form__field">
                  <label className="adm-form__label" htmlFor={`dsv-social-${p}`}>Post {platformLabel(p)}</label>
                  <textarea
                    id={`dsv-social-${p}`}
                    className="adm-textarea"
                    rows={6}
                    value={form.social_posts[p]}
                    onChange={(e) => setForm({ ...form, social_posts: { ...form.social_posts, [p]: e.target.value } })}
                  />
                </div>
              ))}
              {formErrors.length > 0 && changedCount > 0 && (
                <ErrorNote><ul className="dsv-list">{formErrors.map((e) => <li key={e}>{e}</li>)}</ul></ErrorNote>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" className="adm-btn adm-btn--ghost" disabled={!changedCount || !!busy} onClick={() => detail && setForm(formFrom(detail))}>
                  Annuler les modifications
                </button>
                <button type="button" className="adm-btn adm-btn--primary" disabled={!changedCount || formErrors.length > 0 || !!busy} onClick={saveEdits}>
                  {busy === 'edit' ? 'Enregistrement et contrôles…' : changedCount ? `Enregistrer (${changedCount} champ${changedCount > 1 ? 's' : ''})` : 'Enregistrer'}
                </button>
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-6">
              <Section title="Envois au site client">
                {events === null && <p className="text-sm text-muted-foreground">Chargement…</p>}
                {events && events.length === 0 && <p className="text-sm text-muted-foreground">Aucun envoi pour ce brouillon.</p>}
                <div className="space-y-2">
                  {events?.map((ev) => (
                    <div key={ev.id} className="dsv-card text-sm space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong>{EVENT_KIND[ev.kind] ?? ev.kind}</strong>
                        <StatusTag map={{ success: { label: 'Réussi', variant: 'success' }, failed: { label: 'Échec', variant: 'danger' } }} value={ev.status} />
                        {ev.http_status && <span className="text-xs text-muted-foreground">HTTP {ev.http_status}</span>}
                        <span className="text-xs text-muted-foreground ml-auto">{fmtDate(ev.created_at)}</span>
                      </div>
                      {ev.target && <p className="text-xs"><ExternalLink href={ev.target} /></p>}
                      {typeof ev.detail?.error === 'string' && <p className="text-xs text-destructive">{ev.detail.error}</p>}
                      {ev.detail && Object.keys(ev.detail).length > 0 && (
                        <Collapsible title="Détail"><JsonView value={ev.detail} maxHeight={220} /></Collapsible>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
              <Section title="Brouillon">
                <div className="dsv-grid">
                  <Field label="Modèle" value={draft.model_used ?? '—'} />
                  <Field label="Versions de configuration" value={Object.entries(draft.config_versions ?? {}).map(([k, v]) => `${k} n° ${v}`).join(', ') || '—'} />
                  <Field label="Relu par" value={draft.reviewed_by ? `${draft.reviewed_by}, ${fmtDate(draft.reviewed_at)}` : '—'} />
                  <Field label="Note du relecteur" value={draft.reviewer_notes ?? '—'} />
                  <Field label="Identifiant chez le client" value={draft.external_id ?? '—'} />
                  <Field label="Adresse publiée" value={<ExternalLink href={draft.published_url} />} />
                </div>
              </Section>
              <Collapsible title="Brief envoyé au modèle"><JsonView value={draft.brief} maxHeight={420} /></Collapsible>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
