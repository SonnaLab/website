import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { apiService } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface Project {
  id: string;
  slug: string;
  name: string;
  status: string;
  progress: number;
  starts_on?: string;
  ends_on?: string;
  milestones?: Milestone[];
  updates?: ProjectUpdate[];
}
interface Milestone     { id: string; title: string; status: string; due_on?: string; completed_on?: string }
interface ProjectUpdate { id: string; kind: string; title?: string; body: string; created_at: string }

export function ProjectsList() {
  const { t } = useTranslation('member');
  const [items, setItems]     = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.listProjects()
      .then((res) => setItems(res.projects || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">{t('projects.title')}</h1>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">…</p>
      ) : items.length === 0 ? (
        <Card className="p-6"><p className="text-sm text-muted-foreground">{t('projects.empty')}</p></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((p) => (
            <Link key={p.id} to={`/member/projects/${p.id}`}>
              <Card className="p-5 hover:bg-secondary transition-colors space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-foreground">{p.name}</h3>
                  <Badge variant="secondary" className="capitalize">{p.status}</Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t('projects.progress')}</span><span>{p.progress}%</span>
                  </div>
                  <Progress value={p.progress} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation('member');
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!id) return;
    apiService.getProject(id).then((res) => setProject(res.project));
  }, [id]);

  if (!project) return <p className="text-sm text-muted-foreground">…</p>;

  const fmt = (iso?: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(iso)) : '—';

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Link to="/member/projects" className="text-sm text-muted-foreground hover:text-foreground">← {t('projects.title')}</Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">{project.name}</h1>
          <Badge variant="secondary" className="capitalize">{project.status}</Badge>
        </div>
        <Progress value={project.progress} />
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-foreground">{t('projects.milestones')}</h2>
        <Card className="divide-y divide-border">
          {(project.milestones || []).map((m) => (
            <div key={m.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">{m.title}</p>
                <p className="text-xs text-muted-foreground">
                  {fmt(m.due_on)} {m.completed_on && `• ${fmt(m.completed_on)}`}
                </p>
              </div>
              <Badge variant="outline" className="capitalize">{m.status}</Badge>
            </div>
          ))}
          {(!project.milestones || project.milestones.length === 0) && (
            <p className="p-4 text-sm text-muted-foreground">{t('projects.empty')}</p>
          )}
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-foreground">{t('projects.updates')}</h2>
        <div className="space-y-3">
          {(project.updates || []).map((u) => (
            <Card key={u.id} className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">{u.title || u.kind}</p>
                <span className="text-xs text-muted-foreground">{fmt(u.created_at)}</span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{u.body}</p>
            </Card>
          ))}
          {(!project.updates || project.updates.length === 0) && (
            <p className="text-sm text-muted-foreground">{t('projects.noUpdates')}</p>
          )}
        </div>
      </section>
    </div>
  );
}
