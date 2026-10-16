import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/common/Modal';
import { apiService } from '@/services/api';
import type { TravauxClient } from '@/types/travaux';
import { ClientAvatar } from './ClientAvatar';
import { formatCents } from './format';

/** Fiche client (action « œil ») : coordonnées, synthèse, projets, comptes membres. */
export function ClientDetailModal({ clientId, onClose }: { clientId: string | null; onClose: () => void }) {
  const { t } = useTranslation('admin');
  const [client, setClient] = useState<TravauxClient | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setClient(null);
    setError(false);
    if (!clientId) return;
    apiService.adminTravauxClient(clientId)
      .then((res) => setClient(res.client))
      .catch(() => setError(true));
  }, [clientId]);

  const referent = client ? [client.referent_first_name, client.referent_last_name].filter(Boolean).join(' ') : '';

  return (
    <Modal open={!!clientId} onClose={onClose} title={client?.name || '…'} size="md" badge={client && <ClientAvatar client={client} />}>
      {error && <p className="trv-error">{t('common.error')}</p>}
      {!client && !error && <p className="trk-loading">{t('common.loading')}</p>}
      {client && (
        <div className="adm-form">
          <dl className="trk-modal-dl">
            <dt>{t('travaux.clients.fields.siret')}</dt><dd>{client.siret || '—'}</dd>
            <dt>{t('travaux.clients.fields.contactEmail')}</dt><dd>{client.contact_email || '—'}</dd>
            <dt>{t('travaux.clients.detail.referent')}</dt>
            <dd>
              {referent || '—'}
              {client.referent_email && <div className="trv-muted">{client.referent_email}</div>}
              {client.referent_phone && <div className="trv-muted">{client.referent_phone}</div>}
            </dd>
            <dt>{t('travaux.clients.table.invoiced')}</dt><dd className="trv-num">{formatCents(client.stats?.invoiced_cents)}</dd>
            <dt>{t('travaux.clients.table.paid')}</dt><dd className="trv-num">{formatCents(client.stats?.paid_cents)}</dd>
          </dl>

          <div>
            <p className="trv-section-title">{t('travaux.clients.detail.projects')}</p>
            {client.projects?.length ? (
              <div className="trv-chip-row">
                {client.projects.map((p) => <span key={p.id} className="trv-pill trv-pill--soft">{p.name}</span>)}
              </div>
            ) : (
              <p className="trv-info">{t('travaux.clients.detail.noProjects')}</p>
            )}
          </div>

          <div>
            <p className="trv-section-title">{t('travaux.clients.detail.members')}</p>
            {client.members?.length ? (
              <ul className="trv-info" style={{ margin: 0, paddingLeft: 18 }}>
                {client.members.map((m) => <li key={m.id}>{m.full_name ? `${m.full_name} — ${m.email}` : m.email}</li>)}
              </ul>
            ) : (
              <p className="trv-info">{t('travaux.clients.detail.noMembers')}</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
