import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { apiService, type MemberTravaux, type MemberTravauxObjective, type MemberTravauxTask } from '@/services/api';
import { PageHeader } from '@/components/private/common/PageHeader';
import { StatCard, StatRow } from '@/components/private/common/StatRow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/common/Tabs';
import { DataTableSearch, DataTableToolbar, filterRows } from '@/components/common/DataTable';
import { dueTone, formatDate, formatDateTime } from '@/pages/private/admin/travaux/format';
import { COLUMN_ICONS } from '@/pages/private/admin/travaux/columnIcons';
import { CheckCircleIcon, ChevronDownIcon, FolderKanbanIcon, KanbanIcon, TargetIcon, TrendingUpIcon } from '@icons';

const TABS = ['objectives', 'tasks'] as const;
type TabKey = typeof TABS[number];
const COLUMNS: MemberTravauxTask['column'][] = ['todo', 'in_progress', 'review', 'done'];

/**
 * « Suivi des travaux » (client space): the company's projects, their
 * deliverables with their progress, and the tasks on a read-only board.
 * Livrables reads like the admin view: projects › deliverables as
 * accordions on the left, the open deliverable and its timeline on the right.
 */
export default function MemberTravaux() {
  const { t } = useTranslation('member');
  const { t: tc } = useTranslation('common');
  const [data, setData] = useState<MemberTravaux | null>(null);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [closedProjects, setClosedProjects] = useState<Set<string>>(() => new Set());
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') as TabKey | null;
  const tab: TabKey = urlTab && TABS.includes(urlTab) ? urlTab : 'objectives';
  const setTab = (next: string) => setSearchParams((prev) => {
    const params = new URLSearchParams(prev);
    params.set('tab', next);
    return params;
  }, { replace: true });

  useEffect(() => { apiService.memberTravaux().then(setData).catch(() => setData({ projects: [], tasks: [] })); }, []);

  const objectives = data?.projects.flatMap((p) => p.objectives) ?? [];
  const tasks = data?.tasks ?? [];
  const done = tasks.filter((task) => task.column === 'done').length;
  const inProgress = objectives.filter((o) => o.status !== 'done').length;
  const overall = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const projects = (data?.projects ?? []).map((p) => ({
    ...p,
    objectives: filterRows(p.objectives, query, (o) => [o.title, o.description, p.name, t(`travaux.statuses.${o.status}`)]),
  })).filter((p) => !query || p.objectives.length);
  const visibleTasks = filterRows(tasks, query, (task) => [task.title, task.objective_title, task.description]);

  // The first deliverable opens at once, so the detail column is never empty.
  const visibleObjectives = projects.flatMap((p) => p.objectives);
  const selected = visibleObjectives.find((o) => o.id === selectedId) ?? null;
  const selectedProject = selected ? projects.find((p) => p.objectives.some((o) => o.id === selected.id)) : null;
  useEffect(() => {
    if (selectedId === null && objectives.length) setSelectedId(objectives[0].id);
  }, [objectives.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggleProject = (id: string) => setClosedProjects((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="dash-page">
      <PageHeader title={t('travaux.heading')} description={t('travaux.subtitle')} />

      <StatRow>
        <StatCard icon={<FolderKanbanIcon size={18} />} label={t('travaux.stats.projects')} value={data ? data.projects.length : '—'} loading={!data} />
        <StatCard icon={<TargetIcon size={18} />} label={t('travaux.stats.inProgress')} value={data ? inProgress : '—'} loading={!data} />
        <StatCard icon={<CheckCircleIcon size={18} />} label={t('travaux.stats.tasksDone')} value={data ? `${done} / ${tasks.length}` : '—'} loading={!data} />
        <StatCard icon={<TrendingUpIcon size={18} />} label={t('travaux.stats.overall')} value={data ? `${overall} %` : '—'} loading={!data} />
      </StatRow>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="objectives" icon={<TargetIcon size={14} />} count={objectives.length}>{t('travaux.tabs.objectives')}</TabsTrigger>
          <TabsTrigger value="tasks" icon={<KanbanIcon size={14} />} count={tasks.length}>{t('travaux.tabs.tasks')}</TabsTrigger>
        </TabsList>

        <DataTableToolbar>
          <DataTableSearch value={query} onChange={setQuery} />
        </DataTableToolbar>

        <TabsContent value="objectives">
          {!data ? <p className="trk-loading">…</p> : projects.length ? (
            <div className="trv-split">
              <div className="trv-split__list">
                {projects.map((p) => {
                  const open = !closedProjects.has(p.id);
                  return (
                    <section key={p.id} className={['trv-acc', open ? 'is-open' : ''].filter(Boolean).join(' ')}>
                      <div className="trv-acc__head">
                        <button type="button" className="trv-acc__toggle" aria-expanded={open} onClick={() => toggleProject(p.id)}>
                          <ChevronDownIcon size={16} className="trv-acc__chevron" />
                          <FolderKanbanIcon size={16} />
                          <span className="trv-acc__title">{p.name}</span>
                          <span className="trv-kanban__count">{p.objectives.length}</span>
                        </button>
                      </div>
                      {open && (
                        <div className="trv-acc__body">
                          {p.objectives.length ? p.objectives.map((o) => <ObjectiveItem key={o.id} o={o} />) : (
                            <div className="trv-board__empty">{t('travaux.noObjectives')}</div>
                          )}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>

              <div className="trv-split__detail">
                {selected ? <ObjectiveDetail o={selected} projectName={selectedProject?.name ?? null} /> : (
                  <div className="adm-empty-state trv-split__empty">
                    <TargetIcon size={28} />
                    <p>{t('travaux.pick')}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="adm-empty-state">
              <TargetIcon size={28} />
              <p>{query ? tc('table.noResults', { query }) : t('travaux.empty')}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks">
          <div className="trv-kanban">
            {COLUMNS.map((col) => {
              // « Terminé »: the latest done first, dated.
              const items = visibleTasks.filter((task) => task.column === col);
              if (col === 'done') items.sort((a, b) => (b.completed_at ?? b.updated_at).localeCompare(a.completed_at ?? a.updated_at));
              return (
                <div key={col} className="trv-kanban__col">
                  <div className="trv-kanban__head">
                    {t(`travaux.columns.${col}`)} <span className="trv-kanban__count">({items.length})</span>
                  </div>
                  <div className="trv-kanban__list">
                    {items.map((task) => (
                      <div key={task.id} className="trv-task trv-task--readonly">
                        <div className="trv-task__top">
                          <p className="trv-task__title">{task.title}</p>
                          {col === 'done' && (
                            <time className="trv-task__done-at" dateTime={task.completed_at ?? task.updated_at}>
                              {formatDateTime(task.completed_at ?? task.updated_at)}
                            </time>
                          )}
                        </div>
                        {task.objective_title && <p className="trv-task__objective">{task.objective_title}</p>}
                        {task.due_on && col !== 'done' && (
                          <span className={`trv-due trv-due--${dueTone(task.due_on, false)}`}>{t('travaux.dueOn', { date: formatDate(task.due_on) })}</span>
                        )}
                      </div>
                    ))}
                    {!items.length && <div className="trv-board__empty">{t('travaux.noTasks')}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  function ObjectiveItem({ o }: { o: MemberTravauxObjective }) {
    const active = o.id === selected?.id;
    return (
      <div className={['trv-acc', 'trv-acc--item', active ? 'is-open' : ''].filter(Boolean).join(' ')}>
        <div className="trv-acc__head">
          <button type="button" className="trv-acc__toggle" aria-expanded={active} onClick={() => setSelectedId(active ? null : o.id)}>
            <ChevronDownIcon size={14} className="trv-acc__chevron" />
            <span className="trv-acc__title">{o.title}</span>
          </button>
        </div>
        {active && (
          <div className="trv-acc__body trv-acc__body--item">
            <div className="trv-card__progress">
              <div className="trv-progress"><div className="trv-progress__bar" style={{ width: `${o.progress}%` }} /></div>
              <span className="trv-card__percent">{o.progress} %</span>
            </div>
            <span className="trv-chip-row">
              <span className={`trv-pill trv-pill--${o.status}`}>{t(`travaux.statuses.${o.status}`)}</span>
              <span className={`trv-pill trv-pill--${o.format}`}>{t(`travaux.formats.${o.format}`)}</span>
            </span>
          </div>
        )}
      </div>
    );
  }

  // The open deliverable: its progress and the timeline of its tasks.
  function ObjectiveDetail({ o, projectName }: { o: MemberTravauxObjective; projectName: string | null }) {
    const linked = tasks
      .filter((task) => task.objective_id === o.id)
      .sort((a, b) => COLUMNS.indexOf(a.column) - COLUMNS.indexOf(b.column));
    return (
      <article className="trv-detail">
        <header className="trv-detail__head">
          <h3 className="trv-detail__title">{o.title}</h3>
          <div className="trv-chip-row">
            <span className={`trv-pill trv-pill--${o.status}`}>{t(`travaux.statuses.${o.status}`)}</span>
            <span className={`trv-pill trv-pill--${o.format}`}>{t(`travaux.formats.${o.format}`)}</span>
            {projectName && <span className="trv-pill trv-pill--soft">{projectName}</span>}
            {o.due_on && <span className={`trv-due trv-due--${dueTone(o.due_on, o.status === 'done')}`}>{t('travaux.dueOn', { date: formatDate(o.due_on) })}</span>}
          </div>
        </header>
        <div className="trv-detail__body">
          {o.description && <p className="trv-card__desc">{o.description}</p>}
          <div>
            <div className="trv-progress-label"><span>{t('travaux.progress')}</span><span>{o.progress} %</span></div>
            <div className="trv-progress"><div className="trv-progress__bar" style={{ width: `${o.progress}%` }} /></div>
            <p className="trv-card__tasks">{t('travaux.tasksDone', { done: o.tasks_done, total: o.tasks_total })}</p>
          </div>
          <div>
            <p className="trv-section-title">{t('travaux.tabs.tasks')}</p>
            {linked.length ? (
              <ol className="trv-timeline">
                {linked.map((task) => {
                  const Icon = COLUMN_ICONS[task.column];
                  return (
                    <li key={task.id} className="trv-timeline__item">
                      <span className={`trv-timeline__icon trv-timeline__icon--${task.column}`} title={t(`travaux.columns.${task.column}`)}>
                        <Icon size={12} />
                      </span>
                      <div className="trv-timeline__row">
                        <p className="trv-timeline__title">{task.title}</p>
                        <span className="trv-pill trv-pill--soft">{t(`travaux.columns.${task.column}`)}</span>
                      </div>
                      {task.description && <p className="trv-task__desc">{task.description}</p>}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="trv-info">{t('travaux.noTasks')}</p>
            )}
          </div>
        </div>
      </article>
    );
  }
}
