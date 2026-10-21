import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/common/Modal';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PenLineIcon, TrafficConeIcon } from '@icons';
import { apiService } from '@/services/api';
import type { TravauxClient } from '@/types/travaux';
import { ClientAvatar } from './ClientAvatar';
import { DetailHead, DetailList, DetailListRow, DetailSection, initialsOf } from './DetailCard';
import { formatCents, formatDate } from './format';

const websiteHref = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

/** Fiche client (action « œil ») : identité, coordonnées, mentions légales, activité, projets, équipe. */
export function ClientDetailModal({ clientId, onClose, onEdit }: { clientId: string | null; onClose: () => void; onEdit?: (id: string) => void }) {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
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
  const address = client
    ? [client.address_line1, client.address_line2, [client.postal_code, client.city].filter(Boolean).join(' ')].filter(Boolean).join('\n')
    : '';
  const subtitle = client
    ? [client.legal_name && client.legal_name !== client.name ? client.legal_name : null, client.legal_form].filter(Boolean).join(' · ') || client.contact_email
    : null;
  const projects = client?.projects ?? [];
  const members = client?.members ?? [];
  const membersCount = client?.stats?.members_count ?? members.length;
  const isReferent = (email: string) => !!client?.referent_email && email.toLowerCase() === client.referent_email.toLowerCase();

  const footer = client && (
    <>
      {onEdit && (
        <button type="button" className="adm-btn adm-btn--ghost" onClick={() => onEdit(client.id)}>
          <PenLineIcon size={14} /> {t('travaux.clients.actions.edit')}
        </button>
      )}
      <button type="button" className="adm-btn adm-btn--primary" onClick={() => navigate(`/admin/travaux/${client.id}`)}>
        <TrafficConeIcon size={14} /> {t('travaux.clients.actions.travaux')}
      </button>
    </>
  );

  return (
    <Modal open={!!clientId} onClose={onClose} title={t('travaux.clients.detail.title')} size="md" footer={footer}>
      {error && <p className="trv-error">{t('common.error')}</p>}
      {!client && !error && <p className="trk-loading">{t('common.loading')}</p>}
      {client && (
        <div className="dm-card">
          <DetailHead
            avatar={<ClientAvatar client={client} size="lg" />}
            name={client.name}
            subtitle={subtitle}
            pills={(
              <>
                {client.is_issuer && <StatusBadge label={t('travaux.clients.issuer')} variant="info" />}
                {client.siret && <StatusBadge label={`${t('travaux.clients.fields.siret')} ${client.siret}`} variant="muted" />}
                <StatusBadge label={t('travaux.clients.detail.membersCount', { count: membersCount })} variant="default" />
              </>
            )}
          />

          <DetailSection
            title={t('common.detailSections.identity')}
            tiles={[
              { label: t('travaux.clients.fields.legalName'), value: client.legal_name },
              { label: t('travaux.clients.fields.legalForm'), value: client.legal_form },
              { label: t('travaux.clients.fields.siret'), value: client.siret, copy: client.siret },
              { label: t('travaux.clients.fields.vatNumber'), value: client.vat_number, copy: client.vat_number },
              { label: t('travaux.clients.fields.rcs'), value: client.rcs },
              { label: t('travaux.clients.fields.capital'), value: client.capital },
            ]}
          />

          <DetailSection
            title={t('common.detailSections.contact')}
            tiles={[
              { label: t('travaux.clients.fields.contactEmail'), value: client.contact_email, copy: client.contact_email },
              { label: t('travaux.clients.fields.phone'), value: client.phone, copy: client.phone },
              {
                label: t('travaux.clients.fields.website'),
                value: client.website && (
                  <a className="dm-link" href={websiteHref(client.website)} target="_blank" rel="noopener noreferrer">{client.website}</a>
                ),
                copy: client.website,
                wide: true,
              },
            ]}
          />

          <DetailSection
            title={t('travaux.clients.detail.referent')}
            tiles={[
              { label: t('users.table.name'), value: referent, wide: true },
              { label: t('travaux.clients.fields.referentEmail'), value: client.referent_email, copy: client.referent_email },
              { label: t('travaux.clients.fields.referentPhone'), value: client.referent_phone, copy: client.referent_phone },
            ]}
          />

          <DetailSection
            title={t('travaux.clients.fields.address')}
            tiles={[
              { label: t('travaux.clients.fields.address'), value: address && <span className="dm-multiline">{address}</span>, copy: address.replace(/\n/g, ', ') },
              { label: t('travaux.clients.fields.country'), value: client.country },
            ]}
          />

          <DetailSection
            title={t('common.detailSections.legal')}
            tiles={[
              { label: t('travaux.clients.fields.iban'), value: client.iban, copy: client.iban },
              { label: t('travaux.clients.fields.bic'), value: client.bic, copy: client.bic },
              { label: t('travaux.clients.fields.legalLine'), value: client.legal_line, wide: true },
            ]}
          />

          <DetailSection
            title={t('common.detailSections.activity')}
            tiles={[
              { label: t('travaux.clients.table.invoiced'), value: formatCents(client.stats?.invoiced_cents), num: true },
              { label: t('travaux.clients.table.paid'), value: formatCents(client.stats?.paid_cents), num: true },
              { label: t('travaux.clients.table.projects'), value: client.stats?.projects_count ?? projects.length, num: true },
              { label: t('travaux.clients.table.inProgress'), value: client.stats?.objectives_in_progress ?? 0, num: true },
            ]}
          />

          <DetailSection title={t('travaux.clients.detail.projects')} aside={projects.length || undefined}>
            <DetailList empty={t('travaux.clients.detail.noProjects')}>
              {projects.map((p) => (
                <DetailListRow
                  key={p.id}
                  title={p.name}
                  meta={p.due_on ? `${t('travaux.objectives.dueDate')} ${formatDate(p.due_on)}` : undefined}
                  pill={<StatusBadge label={`${Math.round(p.progress ?? 0)} %`} variant={p.progress >= 100 ? 'success' : 'default'} />}
                />
              ))}
            </DetailList>
          </DetailSection>

          <DetailSection title={t('travaux.clients.detail.members')} aside={members.length || undefined}>
            <DetailList empty={t('travaux.clients.detail.noMembers')}>
              {members.map((m) => (
                <DetailListRow
                  key={m.id}
                  initials={initialsOf(m.full_name, m.email)}
                  title={m.full_name || m.email}
                  meta={m.full_name ? m.email : undefined}
                  pill={isReferent(m.email) ? <StatusBadge label={t('travaux.clients.detail.referent')} variant="info" /> : undefined}
                  copy={m.email}
                />
              ))}
            </DetailList>
          </DetailSection>
        </div>
      )}
    </Modal>
  );
}
