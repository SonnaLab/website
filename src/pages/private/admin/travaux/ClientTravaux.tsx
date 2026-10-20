import { useCallback, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/common/Tabs';
import {
  FileSignatureIcon,
  KanbanIcon,
  PlusIcon,
  ReceiptIcon,
  TargetIcon,
  WalletIcon,
} from '@icons';
import type { TravauxInvoice } from '@/types/travaux';
import { Breadcrumbs } from '@/components/private/common/Breadcrumbs';
import { ClientAvatar } from './ClientAvatar';
import { ContractsTab } from './ContractsTab';
import { InvoicesTab } from './InvoicesTab';
import { ObjectivesTab } from './ObjectivesTab';
import { PaymentsTab } from './PaymentsTab';
import { TasksTab } from './TasksTab';
import type { TravauxTabHandle } from './tabHandle';
import { useTravauxData } from './useTravauxData';

type TabKey = 'objectives' | 'tracking' | 'invoices' | 'contracts' | 'payments';
const TAB_KEYS: TabKey[] = ['objectives', 'tracking', 'invoices', 'contracts', 'payments'];

/**
 * Travaux d'un client (action « plot » du tableau des clients) : livrables
 * par projet, kanban des tâches, devis/factures, contrats et paiements.
 * L'onglet actif est dans l'URL (?tab=) pour pouvoir y revenir directement.
 */
export default function AdminClientTravaux() {
  const { t } = useTranslation('admin');
  const { clientId } = useParams<{ clientId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') as TabKey | null;
  const tab: TabKey = urlTab && TAB_KEYS.includes(urlTab) ? urlTab : 'objectives';
  const setTab = (next: string) => setSearchParams((prev) => {
    const params = new URLSearchParams(prev);
    params.set('tab', next);
    return params;
  });
  const [autoPreviewId, setAutoPreviewId] = useState<string | null>(null);
  const consumeAutoPreview = useCallback(() => setAutoPreviewId(null), []);

  const data = useTravauxData(clientId);
  const refs: Record<TabKey, React.RefObject<TravauxTabHandle>> = {
    objectives: useRef<TravauxTabHandle>(null),
    tracking:   useRef<TravauxTabHandle>(null),
    invoices:   useRef<TravauxTabHandle>(null),
    contracts:  useRef<TravauxTabHandle>(null),
    payments:   useRef<TravauxTabHandle>(null),
  };

  const NEW_LABEL: Record<TabKey, string> = {
    objectives: t('travaux.objectives.new'),
    tracking:   t('travaux.tracking.new'),
    invoices:   t('travaux.invoices.new'),
    contracts:  t('travaux.contracts.new'),
    payments:   t('travaux.payments.new'),
  };

  if (!clientId) return null;
  const { client } = data;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: t('nav.travaux'), to: '/admin/travaux' }, { label: client?.name ?? '…' }]} />

      <div className="trv-header-row">
        <header className="trk-header">
          <div className="trk-header__title">
            {client ? <ClientAvatar client={client} size="lg" /> : null}
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">{client?.name ?? '…'}</h1>
          </div>
          {client && (
            <p className="mt-1 text-muted-foreground text-sm">
              {[client.siret && `SIRET ${client.siret}`, client.contact_email].filter(Boolean).join(' · ') || t('travaux.subtitle')}
            </p>
          )}
        </header>
        <div className="trv-header-actions">
          <button type="button" className="adm-btn adm-btn--primary" onClick={() => refs[tab].current?.openNew()}>
            <PlusIcon size={14} /> {NEW_LABEL[tab]}
          </button>
        </div>
      </div>

      {data.error && <p className="trv-error">{t('common.error')}</p>}
      {data.loading ? (
        <p className="trk-loading">{t('common.loading')}</p>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="objectives" icon={<TargetIcon size={14} />} count={data.objectives.length}>{t('travaux.tabs.objectives')}</TabsTrigger>
            <TabsTrigger value="tracking" icon={<KanbanIcon size={14} />} count={data.tasks.length}>{t('travaux.tabs.tracking')}</TabsTrigger>
            <TabsTrigger value="invoices" icon={<ReceiptIcon size={14} />} count={data.invoices.length}>{t('travaux.tabs.invoices')}</TabsTrigger>
            <TabsTrigger value="contracts" icon={<FileSignatureIcon size={14} />} count={data.contracts.length}>{t('travaux.tabs.contracts')}</TabsTrigger>
            <TabsTrigger value="payments" icon={<WalletIcon size={14} />} count={data.payments.length}>{t('travaux.tabs.payments')}</TabsTrigger>
          </TabsList>

          <TabsContent value="objectives">
            <ObjectivesTab
              ref={refs.objectives}
              clientId={clientId}
              client={client}
              issuer={data.issuer}
              projects={data.projects}
              objectives={data.objectives}
              tasks={data.tasks}
              invoices={data.invoices}
              reload={data.reload}
              onDevisCreated={(invoice: TravauxInvoice) => {
                setAutoPreviewId(invoice.id);
                setTab('invoices');
              }}
            />
          </TabsContent>
          <TabsContent value="tracking">
            <TasksTab ref={refs.tracking} clientId={clientId} tasks={data.tasks} objectives={data.objectives} reload={data.reload} />
          </TabsContent>
          <TabsContent value="invoices">
            <InvoicesTab
              ref={refs.invoices}
              clientId={clientId}
              client={client}
              issuer={data.issuer}
              invoices={data.invoices}
              objectives={data.objectives}
              tasks={data.tasks}
              reload={data.reload}
              autoPreviewId={autoPreviewId}
              onAutoPreviewConsumed={consumeAutoPreview}
            />
          </TabsContent>
          <TabsContent value="contracts">
            <ContractsTab ref={refs.contracts} clientId={clientId} contracts={data.contracts} reload={data.reload} />
          </TabsContent>
          <TabsContent value="payments">
            <PaymentsTab ref={refs.payments} clientId={clientId} payments={data.payments} invoices={data.invoices} reload={data.reload} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
