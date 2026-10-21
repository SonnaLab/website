import { forwardRef, useEffect, useImperativeHandle, useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Modal } from '@/components/common/Modal';
import { apiService } from '@/services/api';
import { calculateDevis, DAYS_MULTIPLIERS, formatDays, shownDays, shownTotalDays } from '@/lib/devisCalc';
import { DataTableAction } from '@/components/common/DataTable';
import {
  CheckCircle2Icon, CheckCircleIcon, ChevronDownIcon, ClipboardListIcon, ClockIcon, EyeIcon, FileTextIcon, FolderKanbanIcon,
  PenLineIcon, PlusIcon, TargetIcon, Trash2Icon, type IconProps,
} from '@icons';
import type {
  KanbanColumn,
  ObjectiveFormat,
  ObjectiveStatus,
  TravauxClient,
  TravauxInvoice,
  TravauxObjective,
  TravauxTask,
} from '@/types/travaux';
import type { TravauxProject, TravauxResource } from './useTravauxData';
import type { TravauxTabHandle } from './tabHandle';
import { addDaysIso, apiErrorMessage, dueTone, formatDate, formatEuros } from './format';
import { useConfirmDelete } from './useConfirmDelete';

const STATUSES: ObjectiveStatus[] = ['planned', 'in_progress', 'done', 'at_risk'];
const COLUMN_ORDER: KanbanColumn[] = ['todo', 'in_progress', 'review', 'done'];
// The task's column, as an icon on the timeline.
const COLUMN_ICONS: Record<KanbanColumn, ComponentType<IconProps>> = {
  todo: ClipboardListIcon, in_progress: ClockIcon, review: EyeIcon, done: CheckCircle2Icon,
};
const DEFAULT_DAILY_RATE = 500;

interface ObjectivesTabProps {
  clientId: string;
  client: TravauxClient | null;
  issuer: TravauxClient | null;
  projects: TravauxProject[];
  objectives: TravauxObjective[];
  tasks: TravauxTask[];
  invoices: TravauxInvoice[];
  reload: (resources?: TravauxResource[]) => Promise<void>;
  onDevisCreated: (invoice: TravauxInvoice) => void;
}

/**
 * Livrables du client en deux colonnes : à gauche les projets (ex. Elance VAE
 * → ÉlanceVAE, ÉlanceCampus) en accordéons contenant leurs livrables, à droite
 * le livrable ouvert avec la frise de ses tâches et la génération du devis
 * (répartition jours/prix au prorata des scores des tâches).
 */
export const ObjectivesTab = forwardRef<TravauxTabHandle, ObjectivesTabProps>(function ObjectivesTab(
  { clientId, issuer, projects, objectives, tasks, invoices, reload, onDevisCreated },
  ref,
) {
  const { t } = useTranslation('admin');
  const confirmDelete = useConfirmDelete();
  // Projet pré-choisi du livrable à créer ('' = le premier), null = fermé.
  const [createFor, setCreateFor] = useState<string | null>(null);
  const [editObjective, setEditObjective] = useState<TravauxObjective | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [closedProjects, setClosedProjects] = useState<Set<string>>(() => new Set());
  const [devisObjective, setDevisObjective] = useState<TravauxObjective | null>(null);
  const [projectModal, setProjectModal] = useState<{ open: boolean; project: TravauxProject | null }>({ open: false, project: null });
  useImperativeHandle(ref, () => ({
    openNew: () => {
      if (!projects.length) {
        toast.info(t('travaux.objectives.needProject'));
        setProjectModal({ open: true, project: null });
      } else {
        setCreateFor('');
      }
    },
    openNewProject: () => setProjectModal({ open: true, project: null }),
  }));

  // Le premier livrable s'ouvre d'emblée, pour que la colonne détail ne soit pas vide.
  useEffect(() => {
    if (selectedId === null && objectives.length) setSelectedId(objectives[0].id);
  }, [objectives]); // eslint-disable-line react-hooks/exhaustive-deps

  // Numéro d'ordre (#n) par date de création, comme sur elancevae.
  const orderMap = new Map(
    [...objectives].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((o, i) => [o.id, i + 1]),
  );

  async function saveObjective(payload: Record<string, string | null>, id?: string) {
    try {
      if (id) await apiService.adminTravauxUpdateObjective(id, payload);
      else await apiService.adminTravauxCreateObjective(payload);
      await reload(['objectives', 'invoices']);
      setCreateFor(null);
      setEditObjective(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, t('common.error')));
    }
  }

  async function removeObjective(o: TravauxObjective) {
    if (!(await confirmDelete())) return;
    try {
      await apiService.adminTravauxDeleteObjective(o.id);
      await reload(['objectives']);
      if (selectedId === o.id) setSelectedId(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, t('travaux.objectives.deleteBlocked')));
    }
  }

  async function archiveObjective(o: TravauxObjective) {
    try {
      await apiService.adminTravauxUpdateObjective(o.id, { status: 'done' });
      await reload(['objectives']);
    } catch (err) {
      toast.error(apiErrorMessage(err, t('common.error')));
    }
  }

  const selected = objectives.find((o) => o.id === selectedId) ?? null;
  const toggleProject = (id: string) => setClosedProjects((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="adm-form">
      {projects.length ? (
        <div className="trv-split">
          {/* Col A : projets → livrables, chacun en accordéon. */}
          <div className="trv-split__list">
            {projects.map((p) => {
              const items = objectives.filter((o) => o.project_id === p.id);
              const open = !closedProjects.has(p.id);
              return (
                <section key={p.id} className={['trv-acc', open ? 'is-open' : ''].filter(Boolean).join(' ')}>
                  <div className="trv-acc__head">
                    <button type="button" className="trv-acc__toggle" aria-expanded={open} onClick={() => toggleProject(p.id)}>
                      <ChevronDownIcon size={16} className="trv-acc__chevron" />
                      <FolderKanbanIcon size={16} />
                      <span className="trv-acc__title">{p.name}</span>
                      <span className="trv-kanban__count">{items.length}</span>
                    </button>
                    <span className="trv-acc__actions">
                      <DataTableAction icon={PlusIcon} label={t('travaux.objectives.new')} onClick={() => setCreateFor(p.id)} />
                      <DataTableAction icon={PenLineIcon} label={t('travaux.projects.edit')} onClick={() => setProjectModal({ open: true, project: p })} />
                    </span>
                  </div>
                  {open && (
                    <div className="trv-acc__body">
                      {items.length ? items.map((o) => {
                        const active = o.id === selected?.id;
                        return (
                          <div key={o.id} className={['trv-acc', 'trv-acc--item', active ? 'is-open' : ''].filter(Boolean).join(' ')}>
                            <div className="trv-acc__head">
                              <button type="button" className="trv-acc__toggle" aria-expanded={active} onClick={() => setSelectedId(active ? null : o.id)}>
                                <ChevronDownIcon size={14} className="trv-acc__chevron" />
                                <span className="trv-card__ordinal">#{orderMap.get(o.id)}</span>
                                <span className="trv-acc__title">{o.title}</span>
                              </button>
                              <span className="trv-acc__actions">
                                <DataTableAction icon={PenLineIcon} label={t('common.edit')} onClick={() => setEditObjective(o)} />
                                {o.status !== 'done' && (
                                  <DataTableAction icon={CheckCircleIcon} variant="success" label={t('travaux.objectives.archive')} onClick={() => archiveObjective(o)} />
                                )}
                                <DataTableAction icon={Trash2Icon} variant="danger" label={t('common.delete')} onClick={() => removeObjective(o)} />
                              </span>
                            </div>
                            {active && (
                              <div className="trv-acc__body trv-acc__body--item">
                                <div className="trv-card__progress">
                                  <div className="trv-progress"><div className="trv-progress__bar" style={{ width: `${o.progress}%` }} /></div>
                                  <span className="trv-card__percent">{o.progress} %</span>
                                </div>
                                <span className="trv-chip-row">
                                  <span className={`trv-pill trv-pill--${o.status}`}>{t(`travaux.objectives.statuses.${o.status}`)}</span>
                                  <span className={`trv-pill trv-pill--${o.format}`}>{t(`travaux.objectives.formats.${o.format}`)}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      }) : (
                        <div className="trv-board__empty">{t('travaux.projects.noObjectives')}</div>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          {/* Col B : le livrable ouvert, avec la génération du devis au-dessus. */}
          <div className="trv-split__detail">
            {selected ? (
              <>
                <div className="trv-split__cta">
                  <button type="button" className="adm-btn adm-btn--primary" onClick={() => setDevisObjective(selected)}>
                    <FileTextIcon size={14} />
                    {invoices.some((i) => i.kind === 'quote' && i.objective_id === selected.id)
                      ? t('travaux.objectives.updateDevis')
                      : t('travaux.objectives.generateDevis')}
                  </button>
                </div>
                <ObjectiveDetail objective={selected} tasks={tasks} />
              </>
            ) : (
              <div className="adm-empty-state trv-split__empty">
                <TargetIcon size={28} />
                <p>{t('travaux.objectives.pick')}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="adm-empty-state">
          <TargetIcon size={28} />
          <p>{t('travaux.projects.empty')}</p>
        </div>
      )}

      <ObjectiveFormModal
        open={!!createFor || !!editObjective}
        objective={editObjective}
        projects={projects}
        defaultProjectId={createFor}
        onClose={() => { setCreateFor(null); setEditObjective(null); }}
        onSubmit={(payload) => saveObjective(payload, editObjective?.id)}
      />
      <GenerateDevisModal
        clientId={clientId}
        objective={devisObjective}
        issuer={issuer}
        tasks={tasks}
        existingQuote={devisObjective ? invoices.find((i) => i.kind === 'quote' && i.objective_id === devisObjective.id) ?? null : null}
        onClose={() => setDevisObjective(null)}
        onSaved={async (invoice) => {
          await reload(['invoices']);
          setDevisObjective(null);
          onDevisCreated(invoice);
        }}
      />
      <ProjectFormModal
        open={projectModal.open}
        clientId={clientId}
        project={projectModal.project}
        onClose={() => setProjectModal({ open: false, project: null })}
        onSaved={async () => {
          await reload(['projects', 'client']);
          setProjectModal({ open: false, project: null });
        }}
      />
    </div>
  );
});

// ── Projet (colonne du tableau) ─────────────────────────────────────────────

function ProjectFormModal({
  open, clientId, project, onClose, onSaved,
}: {
  open: boolean;
  clientId: string;
  project: TravauxProject | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useTranslation('admin');
  const confirmDelete = useConfirmDelete();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(project?.name ?? '');
    setDescription(project?.description ?? '');
  }, [open, project]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (project) await apiService.adminTravauxUpdateProject(project.id, { name, description });
      else await apiService.adminTravauxCreateProject({ client_id: clientId, name, description });
      await onSaved();
    } catch (err) {
      toast.error(apiErrorMessage(err, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!project || !(await confirmDelete())) return;
    try {
      await apiService.adminTravauxDeleteProject(project.id);
      await onSaved();
    } catch (err) {
      toast.error(apiErrorMessage(err, t('travaux.projects.deleteBlocked')));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project ? t('travaux.projects.edit') : t('travaux.projects.new')}
      size="sm"
      footer={
        <>
          {project && <button type="button" className="adm-btn adm-btn--danger trv-mr-auto" onClick={remove}>{t('common.delete')}</button>}
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" form="trv-project-form" className="adm-btn adm-btn--primary" disabled={saving}>
            {project ? t('common.save') : t('common.create')}
          </button>
        </>
      }
    >
      <form id="trv-project-form" className="adm-form" onSubmit={submit}>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="trv-project-name">{t('travaux.projects.name')} *</label>
          <input id="trv-project-name" className="adm-input" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="trv-project-desc">{t('travaux.common.description')}</label>
          <textarea id="trv-project-desc" className="adm-textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </form>
    </Modal>
  );
}

// ── Livrable : formulaire ───────────────────────────────────────────────────

function ObjectiveFormModal({
  open, objective, projects, defaultProjectId, onClose, onSubmit,
}: {
  open: boolean;
  objective: TravauxObjective | null;
  projects: TravauxProject[];
  defaultProjectId?: string | null;
  onClose: () => void;
  onSubmit: (payload: Record<string, string | null>) => Promise<void>;
}) {
  const { t } = useTranslation('admin');
  const isEdit = !!objective;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState<ObjectiveStatus>('planned');
  const [format, setFormat] = useState<ObjectiveFormat>('web');
  const [dueOn, setDueOn] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(objective?.title ?? '');
    setDescription(objective?.description ?? '');
    setProjectId(objective?.project_id || defaultProjectId || projects[0]?.id || '');
    setStatus(objective?.status ?? 'planned');
    setFormat(objective?.format ?? 'web');
    setDueOn(objective?.due_on ?? '');
  }, [open, objective, projects, defaultProjectId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSubmit({ title, description, project_id: projectId, status, format, due_on: dueOn || null });
    setSaving(false);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('common.edit') : t('travaux.objectives.new')}
      footer={
        <>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" form="trv-objective-form" className="adm-btn adm-btn--primary" disabled={saving}>
            {isEdit ? t('common.save') : t('common.create')}
          </button>
        </>
      }
    >
      <form id="trv-objective-form" className="adm-form" onSubmit={submit}>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="trv-obj-title">{t('travaux.common.title')} *</label>
          <input id="trv-obj-title" className="adm-input" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="trv-obj-desc">{t('travaux.common.description')}</label>
          <textarea id="trv-obj-desc" className="adm-textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="adm-form__row">
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-obj-project">{t('travaux.objectives.project')}</label>
            <select id="trv-obj-project" className="adm-select" required value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-obj-format">{t('travaux.objectives.format')}</label>
            <select id="trv-obj-format" className="adm-select" value={format} onChange={(e) => setFormat(e.target.value as ObjectiveFormat)}>
              <option value="web">{t('travaux.objectives.formats.web')}</option>
              <option value="mobile">{t('travaux.objectives.formats.mobile')}</option>
            </select>
          </div>
        </div>
        <div className="adm-form__row">
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-obj-status">{t('travaux.common.status')}</label>
            <select id="trv-obj-status" className="adm-select" value={status} onChange={(e) => setStatus(e.target.value as ObjectiveStatus)}>
              {STATUSES.map((s) => <option key={s} value={s}>{t(`travaux.objectives.statuses.${s}`)}</option>)}
            </select>
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-obj-due">{t('travaux.objectives.dueDate')}</label>
            <input id="trv-obj-due" type="date" className="adm-input" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ── Livrable : fiche + frise des tâches (colonne de droite) ────────────────

function ObjectiveDetail({ objective, tasks }: { objective: TravauxObjective; tasks: TravauxTask[] }) {
  const { t } = useTranslation('admin');
  const linked = tasks
    .filter((task) => task.objective_id === objective.id)
    .sort((a, b) => COLUMN_ORDER.indexOf(a.column) - COLUMN_ORDER.indexOf(b.column) || a.position - b.position);

  return (
    <article className="trv-detail">
      <header className="trv-detail__head">
        <h3 className="trv-detail__title">{objective.title}</h3>
        <div className="trv-chip-row">
          <span className={`trv-pill trv-pill--${objective.status}`}>{t(`travaux.objectives.statuses.${objective.status}`)}</span>
          <span className={`trv-pill trv-pill--${objective.format}`}>{t(`travaux.objectives.formats.${objective.format}`)}</span>
          {objective.project_name && <span className="trv-pill trv-pill--soft">{objective.project_name}</span>}
          {objective.due_on && <span className={`trv-due trv-due--${dueTone(objective.due_on, objective.status === 'done')}`}>{t('travaux.objectives.dueDate')} : {formatDate(objective.due_on)}</span>}
        </div>
      </header>
      <div className="trv-detail__body">
        {objective.description && <p className="trv-card__desc">{objective.description}</p>}
        <div>
          <div className="trv-progress-label"><span>{t('travaux.objectives.progress')}</span><span>{objective.progress} %</span></div>
          <div className="trv-progress"><div className="trv-progress__bar" style={{ width: `${objective.progress}%` }} /></div>
        </div>
        <div>
          <p className="trv-section-title">{t('travaux.tabs.tracking')}</p>
          {linked.length ? (
            <ol className="trv-timeline">
              {linked.map((task) => (
                <li key={task.id} className="trv-timeline__item">
                  <span className={`trv-timeline__icon trv-timeline__icon--${task.column}`} title={t(`travaux.tracking.columns.${task.column}`)}>
                    {(() => { const Icon = COLUMN_ICONS[task.column]; return <Icon size={12} />; })()}
                  </span>
                  <div className="trv-timeline__row">
                    <p className="trv-timeline__title">{task.title}</p>
                    <span className="trv-pill trv-pill--soft">{t(`travaux.tracking.columns.${task.column}`)}</span>
                  </div>
                  {task.description && <p className="trv-task__desc">{task.description}</p>}
                </li>
              ))}
            </ol>
          ) : (
            <p className="trv-info">{t('travaux.objectives.noTasks')}</p>
          )}
        </div>
      </div>
    </article>
  );
}

// ── Génération / mise à jour du devis d'un livrable ─────────────────────────

function GenerateDevisModal({
  clientId, objective, issuer, tasks, existingQuote, onClose, onSaved,
}: {
  clientId: string;
  objective: TravauxObjective | null;
  issuer: TravauxClient | null;
  tasks: TravauxTask[];
  existingQuote: TravauxInvoice | null;
  onClose: () => void;
  onSaved: (invoice: TravauxInvoice) => Promise<void>;
}) {
  const { t } = useTranslation('admin');
  const [dueOn, setDueOn] = useState('');
  const [dailyRate, setDailyRate] = useState(String(DEFAULT_DAILY_RATE));
  // « Facteur de multiplication » des jours affichés (1 = désactivé).
  const [multiplier, setMultiplier] = useState(1);
  const [saving, setSaving] = useState(false);

  // Un livrable n'a qu'un devis en cours : le régénérer le met à jour (nouvelle
  // version) au lieu d'empiler des doublons.
  useEffect(() => {
    if (!objective) return;
    if (existingQuote) {
      setDueOn(existingQuote.due_on ?? '');
      setDailyRate(existingQuote.daily_rate_cents != null ? String(existingQuote.daily_rate_cents / 100) : String(DEFAULT_DAILY_RATE));
      setMultiplier(existingQuote.days_multiplier ?? 1);
    } else {
      setDueOn(objective.due_on ?? addDaysIso(15));
      setDailyRate(String(DEFAULT_DAILY_RATE));
      setMultiplier(1);
    }
  }, [objective, existingQuote]);

  const objectiveTasks = objective ? tasks.filter((task) => task.objective_id === objective.id) : [];
  const calc = calculateDevis(objectiveTasks, dueOn || null, dailyRate ? Number(dailyRate) : null);

  async function submit() {
    if (!objective) return;
    setSaving(true);
    const payload = {
      due_on: dueOn || null,
      daily_rate_cents: dailyRate ? Math.round(Number(dailyRate) * 100) : null,
      amount_cents: calc.totalPrice * 100,
      days_multiplier: multiplier,
    };
    try {
      const invoice = existingQuote
        ? (await apiService.adminTravauxUpdateInvoice(existingQuote.id, payload)).invoice
        : (await apiService.adminTravauxCreateInvoice({
          ...payload, client_id: clientId, kind: 'quote', objective_id: objective.id, status: 'draft',
        })).invoice;
      await onSaved(invoice);
    } catch (err) {
      toast.error(apiErrorMessage(err, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  const label = existingQuote ? t('travaux.objectives.updateDevis') : t('travaux.objectives.generateDevis');

  return (
    <Modal
      open={!!objective}
      onClose={onClose}
      title={label}
      subtitle={objective?.title}
      size="lg"
      footer={
        <>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button type="button" className="adm-btn adm-btn--primary" onClick={submit} disabled={saving}>{label}</button>
        </>
      }
    >
      {objective && (
        <div className="adm-form">
          {!issuer && <p className="trv-error">{t('travaux.invoices.noIssuer')}</p>}
          <div className="adm-form__row">
            <div className="adm-form__field">
              <label className="adm-form__label" htmlFor="trv-devis-due">{t('travaux.invoices.dueDate')}</label>
              <input id="trv-devis-due" type="date" className="adm-input" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
            </div>
            <div className="adm-form__field">
              <label className="adm-form__label" htmlFor="trv-devis-rate">{t('travaux.invoices.dailyRate')}</label>
              <input id="trv-devis-rate" type="number" min={0} step="10" className="adm-input" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} />
            </div>
          </div>

          <div className="trv-multiplier">
            <label className="trv-multiplier__toggle">
              <input type="checkbox" checked={multiplier > 1} onChange={(e) => setMultiplier(e.target.checked ? 2 : 1)} />
              <span>{t('travaux.invoices.multiplier.enable')}</span>
            </label>
            {multiplier > 1 && (
              <div className="infra-chips" role="radiogroup" aria-label={t('travaux.invoices.multiplier.enable')}>
                {DAYS_MULTIPLIERS.map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={multiplier === m}
                          className={multiplier === m ? 'is-active' : ''} onClick={() => setMultiplier(m)}>
                    x{m}
                  </button>
                ))}
              </div>
            )}
            <p className="trv-hint">{t('travaux.invoices.multiplier.hint')}</p>
          </div>

          {calc.allocations.length > 0 ? (
            <div className={['trv-alloc', calc.allocations.length > 5 ? 'trv-alloc--scroll' : ''].filter(Boolean).join(' ')}>
              <table>
                <thead>
                  <tr>
                    <th>{t('travaux.common.title')}</th>
                    <th className="trv-right">{t('travaux.invoices.days')}</th>
                    <th className="trv-right">{t('travaux.common.amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {calc.allocations.map(({ task, days, price, offered }) => (
                    <tr key={task.id}>
                      <td>{task.title} <span className="trv-muted">({t(`travaux.tracking.columns.${task.column}`)})</span></td>
                      <td className="trv-right trv-num">{offered ? '—' : formatDays(shownDays(days, multiplier))}</td>
                      <td className="trv-right trv-num">{offered ? t('travaux.document.offered') : formatEuros(price)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>{t('travaux.invoices.total')} ({calc.remainingDays} {t('travaux.invoices.daysRemaining')})</td>
                    <td className="trv-right trv-num">{formatDays(shownTotalDays(calc, multiplier))}</td>
                    <td className="trv-right trv-num">{formatEuros(calc.totalPrice)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="trv-info">{t('travaux.objectives.generateDevisNoScore')}</p>
          )}
        </div>
      )}
    </Modal>
  );
}
