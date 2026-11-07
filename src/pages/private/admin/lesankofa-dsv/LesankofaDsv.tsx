import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/common/Tabs';
import { PageHeader } from '@/components/private/common/PageHeader';
import { StatCard, StatRow } from '@/components/private/common/StatRow';
import { apiService } from '@/services/api';
import { dsv, type DraftSummary } from '@/services/dsv';
import {
  AlertTriangleIcon, ArrowLeftIcon, ClipboardListIcon, LayersIcon, SearchIcon, SendIcon, TargetIcon, TrendingUpIcon,
} from '@icons';

import { ConfigTab } from './ConfigTab';
import { DecisionsTab } from './DecisionsTab';
import { QuestionsTab } from './QuestionsTab';
import { ResultsTab } from './ResultsTab';
import { ReviewTab } from './ReviewTab';
import { ErrorNote } from './shared';

const VALID_TABS = ['validation', 'decisions', 'questions', 'configuration', 'resultats'] as const;
type TabValue = typeof VALID_TABS[number];

function readHashTab(): TabValue {
  const hash = window.location.hash.replace('#tab-', '');
  return (VALID_TABS as readonly string[]).includes(hash) ? (hash as TabValue) : 'validation';
}

interface ClientRow { id: string; name: string; is_active: boolean }

/** Les quatre chiffres du haut : ce qui attend le proprietaire chez ce client. */
function useQueueFigures(clientId: string | null, refreshKey: number) {
  const [queue, setQueue] = useState<DraftSummary[] | null>(null);
  const [proposed, setProposed] = useState<number | null>(null);
  useEffect(() => {
    if (!clientId) return;
    setQueue(null);
    setProposed(null);
    dsv.reviewQueue(clientId, ['in_review', 'quality_failed', 'approved']).then(setQueue).catch(() => setQueue([]));
    dsv.decisions({ client_id: clientId, status: 'proposed', limit: 500 }).then((r) => setProposed(r.length)).catch(() => setProposed(null));
  }, [clientId, refreshKey]);
  const count = (s: string) => (queue ? queue.filter((d) => d.status === s).length : null);
  return { inReview: count('in_review'), failed: count('quality_failed'), approved: count('approved'), proposed };
}

export default function AdminLesankofaDsv() {
  const [tab, setTab] = useState<TabValue>(readHashTab);
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState<ClientRow[] | null>(null);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const clientId = searchParams.get('client') ?? clients?.[0]?.id ?? null;
  const client = clients?.find((c) => c.id === clientId);
  const figures = useQueueFigures(clientId, refreshKey);

  useEffect(() => {
    apiService.adminLesankofaClients()
      .then((data: { clients?: ClientRow[] } | ClientRow[]) => {
        const rows = (Array.isArray(data) ? data : data.clients ?? []).filter((c) => c.is_active);
        setClients(rows);
      })
      .catch((e: Error) => setClientsError(e.message));
  }, []);

  useEffect(() => {
    const onPop = () => setTab(readHashTab());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const handleTabChange = (v: string) => {
    setTab(v as TabValue);
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}#tab-${v}`);
  };

  const handleClientChange = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('client', id);
    setSearchParams(next, { replace: true });
    // useSearchParams efface le fragment : on garde l'onglet ouvert.
    window.setTimeout(() => history.replaceState(null, '', `${window.location.pathname}${window.location.search}#tab-${tab}`), 0);
  };

  return (
    <div className="dash-page">
      <PageHeader
        title="Moteur d’articles DSV"
        description="Demande, Vérité, Supériorité : validation des brouillons, décisions, banque de questions, configuration et résultats."
        documentTitle="Lesankofa DSV"
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/admin/lesankofa" className="adm-btn adm-btn--ghost adm-btn--sm"><ArrowLeftIcon size={13} /> Lesankofa</Link>
            <select
              className="adm-select adm-select--sm"
              aria-label="Client"
              value={clientId ?? ''}
              onChange={(e) => handleClientChange(e.target.value)}
              disabled={!clients?.length}
            >
              {!clients && <option value="">Chargement des clients…</option>}
              {clients?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
      />

      {clientsError && <ErrorNote>Impossible de charger les clients Lesankofa : {clientsError}</ErrorNote>}

      {clientId && (
        <>
          <StatRow>
            <StatCard icon={<ClipboardListIcon size={18} />} label="Brouillons à valider" value={figures.inReview ?? '—'} loading={figures.inReview === null} tone={figures.inReview ? 'warning' : undefined} />
            <StatCard icon={<SendIcon size={18} />} label="Validés, à publier" value={figures.approved ?? '—'} loading={figures.approved === null} />
            <StatCard icon={<AlertTriangleIcon size={18} />} label="Qualité en échec" value={figures.failed ?? '—'} loading={figures.failed === null} tone={figures.failed ? 'danger' : undefined} />
            <StatCard icon={<TargetIcon size={18} />} label="Décisions à rédiger" value={figures.proposed ?? '—'} loading={figures.proposed === null} />
          </StatRow>

          <Tabs value={tab} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="validation"    icon={<ClipboardListIcon size={14} />} count={figures.inReview ?? undefined}>Validation</TabsTrigger>
              <TabsTrigger value="decisions"     icon={<TargetIcon size={14} />}>Décisions</TabsTrigger>
              <TabsTrigger value="questions"     icon={<SearchIcon size={14} />}>Questions</TabsTrigger>
              <TabsTrigger value="configuration" icon={<LayersIcon size={14} />}>Configuration</TabsTrigger>
              <TabsTrigger value="resultats"     icon={<TrendingUpIcon size={14} />}>Résultats et liens</TabsTrigger>
            </TabsList>

            <TabsContent value="validation">
              <ReviewTab key={clientId} clientId={clientId} clientName={client?.name} onChanged={() => setRefreshKey((k) => k + 1)} />
            </TabsContent>
            <TabsContent value="decisions">
              <DecisionsTab key={clientId} clientId={clientId} clientName={client?.name} />
            </TabsContent>
            <TabsContent value="questions">
              <QuestionsTab key={clientId} clientId={clientId} />
            </TabsContent>
            <TabsContent value="configuration">
              <ConfigTab key={clientId} clientId={clientId} clientName={client?.name} />
            </TabsContent>
            <TabsContent value="resultats">
              <ResultsTab key={clientId} clientId={clientId} clientName={client?.name} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
