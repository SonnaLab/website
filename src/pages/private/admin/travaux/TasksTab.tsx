import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Modal } from '@/components/common/Modal';
import { apiService } from '@/services/api';
import { Trash2Icon } from '@icons';
import type { KanbanColumn, TaskPriority, TravauxObjective, TravauxTask } from '@/types/travaux';
import type { TravauxResource } from './useTravauxData';
import type { TravauxTabHandle } from './tabHandle';
import { apiErrorMessage, formatDateTime } from './format';
import { useConfirmDelete } from './useConfirmDelete';

const COLUMNS: KanbanColumn[] = ['todo', 'in_progress', 'review', 'done'];
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

interface TasksTabProps {
  clientId: string;
  tasks: TravauxTask[];
  objectives: TravauxObjective[];
  reload: (resources?: TravauxResource[]) => Promise<void>;
}

/**
 * Kanban du client : 4 colonnes, glisser-déposer pour changer de colonne.
 * Chaque écriture recharge aussi les livrables (progression recalculée côté API).
 */
export const TasksTab = forwardRef<TravauxTabHandle, TasksTabProps>(function TasksTab(
  { clientId, tasks, objectives, reload },
  ref,
) {
  const { t } = useTranslation('admin');
  const confirmDelete = useConfirmDelete();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<TravauxTask | null>(null);
  const [dragOver, setDragOver] = useState<KanbanColumn | null>(null);
  useImperativeHandle(ref, () => ({ openNew: () => setCreateOpen(true) }));

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
      await reload(['tasks', 'objectives']);
      return true;
    } catch (err) {
      toast.error(apiErrorMessage(err, t('common.error')));
      return false;
    }
  }

  const move = (id: string, column: KanbanColumn) => run(() => apiService.adminTravauxUpdateTask(id, { column }));
  const remove = (id: string) => run(() => apiService.adminTravauxDeleteTask(id)).then((ok) => ok && setEditTask(null));

  return (
    <div className="trv-kanban">
      {COLUMNS.map((col) => {
        // « Terminé »: the latest done first.
        const items = tasks.filter((task) => task.column === col);
        if (col === 'done') items.sort((a, b) => (b.completed_at ?? b.updated_at).localeCompare(a.completed_at ?? a.updated_at));
        return (
          <div
            key={col}
            className={['trv-kanban__col', dragOver === col ? 'trv-kanban__col--over' : ''].filter(Boolean).join(' ')}
            onDragOver={(e) => { e.preventDefault(); setDragOver(col); }}
            onDragLeave={() => setDragOver((c) => (c === col ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const id = e.dataTransfer.getData('text/task-id');
              const task = tasks.find((x) => x.id === id);
              if (task && task.column !== col) move(id, col);
            }}
          >
            <div className="trv-kanban__head">
              {t(`travaux.tracking.columns.${col}`)} <span className="trv-kanban__count">({items.length})</span>
            </div>
            <div className="trv-kanban__list">
              {items.map((task) => (
                <div
                  key={task.id}
                  className="trv-task"
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData('text/task-id', task.id); e.dataTransfer.effectAllowed = 'move'; }}
                  onClick={() => setEditTask(task)}
                >
                  <div className="trv-task__top">
                    <p className="trv-task__title">{task.title}</p>
                    {col === 'done' && (
                      <time className="trv-task__done-at" dateTime={task.completed_at ?? task.updated_at}>
                        {formatDateTime(task.completed_at ?? task.updated_at)}
                      </time>
                    )}
                    <button
                      type="button"
                      className="trv-task__delete"
                      title={t('common.delete')}
                      onClick={(e) => { e.stopPropagation(); void confirmDelete().then((ok) => ok && remove(task.id)); }}
                    >
                      <Trash2Icon size={13} />
                    </button>
                  </div>
                  {task.description && <p className="trv-task__desc">{task.description}</p>}
                  {task.objective_title && <p className="trv-task__objective">{task.objective_title}</p>}
                  <div className="trv-task__meta">
                    <span className={`trv-pill trv-pill--${task.priority}`}>{t(`travaux.tracking.priorities.${task.priority}`)}</span>
                    {task.score != null && (
                      <span className={`trv-score${Number(task.score) === 0 ? ' trv-score--offered' : ''}`}>
                        {Number(task.score) === 0 ? t('travaux.document.offered') : `${task.score}/5`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <TaskFormModal
        open={createOpen || !!editTask}
        task={editTask}
        objectives={objectives}
        onClose={() => { setCreateOpen(false); setEditTask(null); }}
        onDelete={editTask ? () => remove(editTask.id) : undefined}
        onSubmit={async (payload) => {
          const ok = await run(() => (editTask
            ? apiService.adminTravauxUpdateTask(editTask.id, payload)
            : apiService.adminTravauxCreateTask({ ...payload, client_id: clientId })));
          if (ok) { setCreateOpen(false); setEditTask(null); }
        }}
      />
    </div>
  );
});

function TaskFormModal({
  open, task, objectives, onClose, onSubmit, onDelete,
}: {
  open: boolean;
  task: TravauxTask | null;
  objectives: TravauxObjective[];
  onClose: () => void;
  onSubmit: (payload: Record<string, string | number | null>) => Promise<void>;
  onDelete?: () => void;
}) {
  const { t } = useTranslation('admin');
  const confirmDelete = useConfirmDelete();
  const isEdit = !!task;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [column, setColumn] = useState<KanbanColumn>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [objectiveId, setObjectiveId] = useState('');
  const [score, setScore] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setColumn(task?.column ?? 'todo');
    setPriority(task?.priority ?? 'medium');
    setObjectiveId(task?.objective_id ?? '');
    setScore(task?.score != null ? String(task.score) : '');
  }, [open, task]);

  const linked = objectives.find((o) => o.id === objectiveId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSubmit({
      title, description, column, priority,
      objective_id: objectiveId || null,
      score: score !== '' ? Number(score) : null,
    });
    setSaving(false);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('common.edit') : t('travaux.tracking.new')}
      footer={
        <>
          {isEdit && onDelete && (
            <button type="button" className="adm-btn adm-btn--danger trv-mr-auto" onClick={() => void confirmDelete().then((ok) => ok && onDelete())}>
              {t('common.delete')}
            </button>
          )}
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" form="trv-task-form" className="adm-btn adm-btn--primary" disabled={saving}>
            {isEdit ? t('common.save') : t('common.create')}
          </button>
        </>
      }
    >
      <form id="trv-task-form" className="adm-form" onSubmit={submit}>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="trv-task-title">{t('travaux.common.title')} *</label>
          <input id="trv-task-title" className="adm-input" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="trv-task-desc">{t('travaux.common.description')}</label>
          <textarea id="trv-task-desc" className="adm-textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="adm-form__row">
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-task-column">{t('travaux.tracking.column')}</label>
            <select id="trv-task-column" className="adm-select" value={column} onChange={(e) => setColumn(e.target.value as KanbanColumn)}>
              {COLUMNS.map((c) => <option key={c} value={c}>{t(`travaux.tracking.columns.${c}`)}</option>)}
            </select>
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-task-priority">{t('travaux.tracking.priority')}</label>
            <select id="trv-task-priority" className="adm-select" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{t(`travaux.tracking.priorities.${p}`)}</option>)}
            </select>
          </div>
        </div>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="trv-task-objective">{t('travaux.tracking.objective')}</label>
          <select id="trv-task-objective" className="adm-select" value={objectiveId} onChange={(e) => setObjectiveId(e.target.value)}>
            <option value="">{t('travaux.tracking.noObjective')}</option>
            {/* A delivered deliverable takes no new task (its own stays listed). */}
            {objectives.filter((o) => o.status !== 'done' || o.id === task?.objective_id).map((o) => (
              <option key={o.id} value={o.id}>{o.title}{o.project_name ? ` — ${o.project_name}` : ''}</option>
            ))}
          </select>
        </div>
        {linked && (
          <div>
            <div className="trv-progress-label"><span>{linked.title}</span><span>{linked.progress}%</span></div>
            <div className="trv-progress"><div className="trv-progress__bar" style={{ width: `${linked.progress}%` }} /></div>
          </div>
        )}
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="trv-task-score">{t('travaux.tracking.score')}</label>
          <input
            id="trv-task-score"
            type="number"
            min={0}
            max={5}
            step={0.5}
            className="adm-input"
            value={score}
            placeholder={t('travaux.tracking.scoreHint')}
            onChange={(e) => setScore(e.target.value)}
          />
          <p className="trv-hint">{t('travaux.tracking.scoreOffered')}</p>
        </div>
      </form>
    </Modal>
  );
}
