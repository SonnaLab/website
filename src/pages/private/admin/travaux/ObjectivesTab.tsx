import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Modal } from '@/components/common/Modal';
import { apiService } from '@/services/api';
import { calculateDevis } from '@/lib/devisCalc';
import { PenLineIcon, PlusIcon, TargetIcon } from '@icons';
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
import { addDaysIso, apiErrorMessage, formatDate, formatEuros } from './format';

const STATUSES: ObjectiveStatus[] = ['planned', 'in_progress', 'done', 'at_risk'];
const COLUMN_ORDER: KanbanColumn[] = ['todo', 'in_progress', 'review', 'done'];
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
 * Livrables du client, une colonne par projet (ex. Elance VAE → ÉlanceVAE,
 * ÉlanceCampus). Fiche livrable avec la frise de ses tâches, et génération
 * du devis (répartition jours/prix au prorata des scores des tâches).
 */
export const ObjectivesTab = forwardRef<TravauxTabHandle, ObjectivesTabProps>(function ObjectivesTab(
  { clientId, issuer, projects, objectives, tasks, invoices, reload, onDevisCreated },
  ref,
) {
  const { t } = useTranslation('admin');
  const [createOpen, setCreateOpen] = useState(false);
  const [editObjective, setEditObjective] = useState<TravauxObjective | null>(null);
  const [detailObjective, setDetailObjective] = useState<TravauxObjective | null>(null);
  const [devisObjective, setDevisObjective] = useState<TravauxObjective | null>(null);
  const [projectModal, setProjectModal] = useState<{ open: boolean; project: TravauxProject | null }>({ open: false, project: null });
  useImperativeHandle(ref, () => ({
    openNew: () => {
      if (!projects.length) {
        toast.info(t('travaux.objectives.needProject'));
        setProjectModal({ open: true, project: null });
      } else {
        setCreateOpen(true);
      }
    },
  }));

  // Numéro d'ordre (#n) par date de création, comme sur elancevae.
  const orderMap = new Map(
    [...objectives].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((o, i) => [o.id, i + 1]),
  );

  async function saveObjective(payload: Record<string, string | null>, id?: string) {
    try {
      if (id) await apiService.adminTravauxUpdateObjective(id, payload);
      else await apiService.adminTravauxCreateObjective(payload);
      await reload(['objectives', 'invoices']);
      setCreateOpen(false);
      setEditObjective(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, t('common.error')));
    }
  }

  async function removeObjective(o: TravauxObjective) {
    if (!window.confirm(t('travaux.common.confirmDelete'))) return;
    try {
      await apiService.adminTravauxDeleteObjective(o.id);
      await reload(['objectives']);
      setDetailObjective(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, t('travaux.objectives.deleteBlocked')));
    }
  }

  async function archiveObjective(o: TravauxObjective) {
    try {
      await apiService.adminTravauxUpdateObjective(o.id, { status: 'done' });
      await reload(['objectives']);
      setDetailObjective(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, t('common.error')));
    }
  }

  function ObjectiveCard({ o }: { o: TravauxObjective }) {
    return (
      <div className="trv-card" onClick={() => setDetailObjective(o)}>
        <div className="trv-card__head">
          <span className="trv-card__ordinal">#{orderMap.get(o.id)}</span>
          <span className="trv-card__title">{o.title}</span>
        </div>
        <div className="trv-card__body">
          {o.description && <p className="trv-card__desc">{o.description}</p>}
          <div className="trv-progress"><div className="trv-progress__bar" style={{ width: `${o.progress}%` }} /></div>
        </div>
        <div className="trv-card__foot">
          <span className="trv-due">{o.due_on ? `${t('travaux.objectives.dueDate')} : ${formatDate(o.due_on)}` : ''}</span>
          <span className="trv-chip-row">
            <span className={`trv-pill trv-pill--${o.status}`}>{t(`travaux.objectives.statuses.${o.status}`)}</span>
            <span className={`trv-pill trv-pill--${o.format}`}>{t(`travaux.objectives.formats.${o.format}`)}</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="adm-form">
      <div className="trv-header-row">
        <p className="trv-info">{t('travaux.projects.hint')}</p>
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => setProjectModal({ open: true, project: null })}>
          <PlusIcon size={13} /> {t('travaux.projects.new')}
        </button>
      </div>

      {projects.length ? (
        <div className="trv-board">
          {projects.map((p) => {
            const items = objectives.filter((o) => o.project_id === p.id);
            return (
              <div key={p.id} className="trv-board__column">
                <div className="trv-board__column-head">
                  <span className="trv-board__column-title">{p.name} <span className="trv-kanban__count">({items.length})</span></span>
                  <button type="button" className="adm-btn adm-btn--ghost adm-btn--xs" title={t('travaux.projects.edit')} onClick={() => setProjectModal({ open: true, project: p })}>
                    <PenLineIcon size={12} />
                  </button>
                </div>
                {items.length ? items.map((o) => <ObjectiveCard key={o.id} o={o} />) : (
                  <div className="trv-board__empty">{t('travaux.projects.noObjectives')}</div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="adm-empty-state">
          <TargetIcon size={28} />
          <p>{t('travaux.projects.empty')}</p>
        </div>
      )}

      <ObjectiveFormModal
        open={createOpen || !!editObjective}
        objective={editObjective}
        projects={projects}
        onClose={() => { setCreateOpen(false); setEditObjective(null); }}
        onSubmit={(payload) => saveObjective(payload, editObjective?.id)}
      />
      <ObjectiveDetailModal
        objective={detailObjective}
        tasks={tasks}
        hasQuote={!!detailObjective && invoices.some((i) => i.kind === 'quote' && i.objective_id === detailObjective.id)}
        onClose={() => setDetailObjective(null)}
        onEdit={(o) => { setDetailObjective(null); setEditObjective(o); }}
        onDelete={removeObjective}
        onArchive={archiveObjective}
        onGenerateDevis={(o) => { setDetailObjective(null); setDevisObjective(o); }}
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
    if (!project || !window.confirm(t('travaux.common.confirmDelete'))) return;
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
  open, objective, projects, onClose, onSubmit,
}: {
  open: boolean;
  objective: TravauxObjective | null;
  projects: TravauxProject[];
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
    setProjectId(objective?.project_id ?? projects[0]?.id ?? '');
    setStatus(objective?.status ?? 'planned');
    setFormat(objective?.format ?? 'web');
    setDueOn(objective?.due_on ?? '');
  }, [open, objective, projects]);

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

// ── Livrable : fiche + frise des tâches ─────────────────────────────────────

function ObjectiveDetailModal({
  objective, tasks, hasQuote, onClose, onEdit, onDelete, onArchive, onGenerateDevis,
}: {
  objective: TravauxObjective | null;
  tasks: TravauxTask[];
  hasQuote: boolean;
  onClose: () => void;
  onEdit: (o: TravauxObjective) => void;
  onDelete: (o: TravauxObjective) => void;
  onArchive: (o: TravauxObjective) => void;
  onGenerateDevis: (o: TravauxObjective) => void;
}) {
  const { t } = useTranslation('admin');
  const linked = objective
    ? tasks
      .filter((task) => task.objective_id === objective.id)
      .sort((a, b) => COLUMN_ORDER.indexOf(a.column) - COLUMN_ORDER.indexOf(b.column) || a.position - b.position)
    : [];

  return (
    <Modal
      open={!!objective}
      onClose={onClose}
      title={objective?.title ?? ''}
      size="lg"
      footer={objective && (
        <>
          <button type="button" className="adm-btn adm-btn--ghost trv-mr-auto" onClick={() => onGenerateDevis(objective)}>
            {hasQuote ? t('travaux.objectives.updateDevis') : t('travaux.objectives.generateDevis')}
          </button>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => onEdit(objective)}>{t('common.edit')}</button>
          <button type="button" className="adm-btn adm-btn--danger" onClick={() => onDelete(objective)}>{t('common.delete')}</button>
          {objective.status !== 'done' && (
            <button type="button" className="adm-btn adm-btn--primary" onClick={() => onArchive(objective)}>{t('travaux.objectives.archive')}</button>
          )}
        </>
      )}
    >
      {objective && (
        <div className="adm-form">
          <div className="trv-chip-row">
            <span className={`trv-pill trv-pill--${objective.status}`}>{t(`travaux.objectives.statuses.${objective.status}`)}</span>
            <span className={`trv-pill trv-pill--${objective.format}`}>{t(`travaux.objectives.formats.${objective.format}`)}</span>
            {objective.project_name && <span className="trv-pill trv-pill--soft">{objective.project_name}</span>}
            {objective.due_on && <span className="trv-due">{t('travaux.objectives.dueDate')} : {formatDate(objective.due_on)}</span>}
          </div>
          {objective.description && <p className="trv-card__desc">{objective.description}</p>}
          <div>
            <div className="trv-progress-label"><span>{t('travaux.objectives.progress')}</span><span>{objective.progress}%</span></div>
            <div className="trv-progress"><div className="trv-progress__bar" style={{ width: `${objective.progress}%` }} /></div>
          </div>
          <div>
            <p className="trv-section-title">{t('travaux.tabs.tracking')}</p>
            {linked.length ? (
              <ol className={['trv-timeline', linked.length > 5 ? 'trv-timeline--scroll' : ''].filter(Boolean).join(' ')}>
                {linked.map((task) => (
                  <li key={task.id} className="trv-timeline__item">
                    <span className={`trv-timeline__dot trv-timeline__dot--${task.column}`} />
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
      )}
    </Modal>
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
  const [saving, setSaving] = useState(false);

  // Un livrable n'a qu'un devis en cours : le régénérer le met à jour (nouvelle
  // version) au lieu d'empiler des doublons.
  useEffect(() => {
    if (!objective) return;
    if (existingQuote) {
      setDueOn(existingQuote.due_on ?? '');
      setDailyRate(existingQuote.daily_rate_cents != null ? String(existingQuote.daily_rate_cents / 100) : String(DEFAULT_DAILY_RATE));
    } else {
      setDueOn(objective.due_on ?? addDaysIso(15));
      setDailyRate(String(DEFAULT_DAILY_RATE));
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
                  {calc.allocations.map(({ task, days, price }) => (
                    <tr key={task.id}>
                      <td>{task.title} <span className="trv-muted">({t(`travaux.tracking.columns.${task.column}`)})</span></td>
                      <td className="trv-right trv-num">{days}</td>
                      <td className="trv-right trv-num">{formatEuros(price)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}>{t('travaux.invoices.total')} ({calc.remainingDays} {t('travaux.invoices.daysRemaining')})</td>
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
