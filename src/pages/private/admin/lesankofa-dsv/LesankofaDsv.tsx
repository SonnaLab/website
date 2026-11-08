/**
 * Moteur DSV (Demande, Verite, Superiorite), integre a la page Gestion
 * Lesankofa : ses onglets s'ajoutent a ceux de la page, et la ligne de
 * chiffres du haut bascule sur les chiffres DSV du client choisi.
 */
import { useEffect, useState } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';

import { StatCard, StatRow } from '@/components/private/common/StatRow';
import { apiService } from '@/services/api';
import { dsv, type DraftSummary } from '@/services/dsv';
import { AlertTriangleIcon, ClipboardListIcon, SendIcon, TargetIcon } from '@icons';

import { ConfigTab } from './ConfigTab';
import { DecisionsTab } from './DecisionsTab';
import { QuestionsTab } from './QuestionsTab';
import { ResultsTab } from './ResultsTab';
import { ReviewTab } from './ReviewTab';
import { ErrorNote } from './shared';

export const DSV_TABS = ['validation', 'decisions', 'questions', 'configuration', 'resultats'] as const;
export type DsvTab = typeof DSV_TABS[number];

export const isDsvTab = (tab: string): tab is DsvTab => (DSV_TABS as readonly string[]).includes(tab);

interface ClientRow { id: string; name: string; is_active: boolean }

export interface DsvState {
  clients: ClientRow[] | null;
  clientsError: string | null;
  clientId: string | null;
  clientName: string | undefined;
  figures: { inReview: number | null; failed: number | null; approved: number | null; proposed: number | null };
  setClient: (id: string) => void;
  refresh: () => void;
}

/** Client choisi (?client=…) et les quatre chiffres de ce qui attend le proprietaire. */
export function useDsvState(): DsvState {
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState<ClientRow[] | null>(null);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [queue, setQueue] = useState<DraftSummary[] | null>(null);
  const [proposed, setProposed] = useState<number | null>(null);

  const clientId = searchParams.get('client') ?? clients?.[0]?.id ?? null;

  useEffect(() => {
    apiService.adminLesankofaClients()
      .then((data: { clients?: ClientRow[] } | ClientRow[]) => {
        setClients((Array.isArray(data) ? data : data.clients ?? []).filter((c) => c.is_active));
      })
      .catch((e: Error) => setClientsError(e.message));
  }, []);

  useEffect(() => {
    if (!clientId) return;
    setQueue(null);
    setProposed(null);
    dsv.reviewQueue(clientId, ['in_review', 'quality_failed', 'approved']).then(setQueue).catch(() => setQueue([]));
    dsv.decisions({ client_id: clientId, status: 'proposed', limit: 500 }).then((r) => setProposed(r.length)).catch(() => setProposed(null));
  }, [clientId, refreshKey]);

  const count = (s: string) => (queue ? queue.filter((d) => d.status === s).length : null);

  const setClient = (id: string) => {
    const hash = window.location.hash;
    const next = new URLSearchParams(searchParams);
    next.set('client', id);
    setSearchParams(next, { replace: true });
    // useSearchParams efface le fragment : on garde l'onglet ouvert.
    window.setTimeout(() => history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`), 0);
  };

  return {
    clients,
    clientsError,
    clientId,
    clientName: clients?.find((c) => c.id === clientId)?.name,
    figures: { inReview: count('in_review'), failed: count('quality_failed'), approved: count('approved'), proposed },
    setClient,
    refresh: () => setRefreshKey((k) => k + 1),
  };
}

export function DsvClientSelect({ state }: { state: DsvState }) {
  const { clients, clientId, setClient } = state;
  return (
    <select
      className="adm-select adm-select--sm"
      aria-label="Client du moteur DSV"
      value={clientId ?? ''}
      onChange={(e) => setClient(e.target.value)}
      disabled={!clients?.length}
    >
      {!clients && <option value="">Chargement des clients…</option>}
      {clients?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  );
}

export function DsvStatRow({ state }: { state: DsvState }) {
  const { figures } = state;
  return (
    <>
      {state.clientsError && <ErrorNote>Impossible de charger les clients Lesankofa : {state.clientsError}</ErrorNote>}
      <StatRow>
        <StatCard icon={<ClipboardListIcon size={18} />} label="Brouillons à valider" value={figures.inReview ?? '—'} loading={figures.inReview === null} tone={figures.inReview ? 'warning' : undefined} />
        <StatCard icon={<SendIcon size={18} />} label="Validés, à publier" value={figures.approved ?? '—'} loading={figures.approved === null} />
        <StatCard icon={<AlertTriangleIcon size={18} />} label="Qualité en échec" value={figures.failed ?? '—'} loading={figures.failed === null} tone={figures.failed ? 'danger' : undefined} />
        <StatCard icon={<TargetIcon size={18} />} label="Décisions à rédiger" value={figures.proposed ?? '—'} loading={figures.proposed === null} />
      </StatRow>
    </>
  );
}

/** Contenu de l'onglet DSV ouvert, pour le client choisi. */
export function DsvTabPanel({ tab, state }: { tab: DsvTab; state: DsvState }) {
  const { clientId, clientName } = state;
  if (!clientId) return null;
  switch (tab) {
    case 'validation':
      return <ReviewTab key={clientId} clientId={clientId} clientName={clientName} onChanged={state.refresh} />;
    case 'decisions':
      return <DecisionsTab key={clientId} clientId={clientId} clientName={clientName} />;
    case 'questions':
      return <QuestionsTab key={clientId} clientId={clientId} />;
    case 'configuration':
      return <ConfigTab key={clientId} clientId={clientId} clientName={clientName} />;
    case 'resultats':
      return <ResultsTab key={clientId} clientId={clientId} clientName={clientName} />;
  }
}

/** Ancienne adresse /admin/lesankofa/dsv : renvoie sur la page unique en gardant l'onglet et le client. */
export function LegacyDsvRedirect() {
  const { search, hash } = useLocation();
  const tab = hash.replace('#tab-', '');
  return <Navigate to={{ pathname: '/admin/lesankofa', search, hash: `#tab-${isDsvTab(tab) ? tab : 'validation'}` }} replace />;
}
