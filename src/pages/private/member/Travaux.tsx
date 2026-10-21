import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { apiService, type MemberTravaux, type MemberTravauxObjective, type MemberTravauxTask } from '@/services/api';
import { PageHeader } from '@/components/private/common/PageHeader';
import { StatCard, StatRow } from '@/components/private/common/StatRow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/common/Tabs';
import { DataTableSearch, DataTableToolbar, filterRows } from '@/components/common/DataTable';
import { dueTone, formatDate, formatDateTime } from '@/pages/private/admin/travaux/format';
import { CheckCircleIcon, FolderKanbanIcon, KanbanIcon, TargetIcon, TrendingUpIcon } from '@icons';

const TABS = ['objectives', 'tasks'] as const;
type TabKey = typeof TABS[number];
const COLUMNS: MemberTravauxTask['column'][] = ['todo', 'in_progress', 'review', 'done'];

/**
 * « Suivi des travaux » (client space): the company's projects, their
 * deliverables with their progress, and the tasks on a read-only board.
 */
export default function MemberTravaux() {
  const { t } = useTranslation('member');
  const { t: tc } = useTranslation('common');
  const [data, setData] = useState<MemberTravaux | null>(null);
  const [query, setQuery] = useState('');
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
            <div className="trv-board">
              {projects.map((p) => (
                <div key={p.id} className="trv-board__column">
                  <div className="trv-board__column-head">
                    <span className="trv-board__column-title">{p.name} <span className="trv-kanban__count">({p.objectives.length})</span></span>
                  </div>
                  {p.objectives.length ? p.objectives.map((o) => <ObjectiveCard key={o.id} o={o} />) : (
                    <div className="trv-board__empty">{t('travaux.noObjectives')}</div>
                  )}
                </div>
              ))}
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

  function ObjectiveCard({ o }: { o: MemberTravauxObjective }) {
    return (
      <div className="trv-card trv-card--readonly">
        <div className="trv-card__head">
          <span className="trv-card__title">{o.title}</span>
        </div>
        <div className="trv-card__body">
          {o.description && <p className="trv-card__desc trv-card__desc--clamp">{o.description}</p>}
          <div className="trv-card__progress">
            <div className="trv-progress"><div className="trv-progress__bar" style={{ width: `${o.progress}%` }} /></div>
            <span className="trv-card__percent">{o.progress} %</span>
          </div>
          <p className="trv-card__tasks">{t('travaux.tasksDone', { done: o.tasks_done, total: o.tasks_total })}</p>
        </div>
        <div className="trv-card__foot">
          <span className={`trv-due trv-due--${dueTone(o.due_on, o.status === 'done')}`}>
            {o.due_on ? t('travaux.dueOn', { date: formatDate(o.due_on) }) : ''}
          </span>
          <span className="trv-chip-row">
            <span className={`trv-pill trv-pill--${o.status}`}>{t(`travaux.statuses.${o.status}`)}</span>
            <span className={`trv-pill trv-pill--${o.format}`}>{t(`travaux.formats.${o.format}`)}</span>
          </span>
        </div>
      </div>
    );
  }
}
