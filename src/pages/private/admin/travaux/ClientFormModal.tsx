import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '@/components/common/Modal';
import { apiAssetUrl, apiService, type AdminUser } from '@/services/api';
import type { TravauxClient, TravauxPayload } from '@/types/travaux';
import { FileDropzone } from './FileDropzone';
import { apiErrorMessage } from './format';

/**
 * Création/édition d'un client (entreprise), ou de la fiche émetteur
 * SonnaLab (`issuer`) : mêmes champs, sans les comptes membres.
 */
export function ClientFormModal({
  open,
  client,
  issuer = false,
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  client: TravauxClient | null;
  issuer?: boolean;
  onClose: () => void;
  onSaved: (client: TravauxClient) => void;
  onDeleted?: () => void;
}) {
  const { t } = useTranslation('admin');
  const isEdit = !!client;
  const [name, setName] = useState('');
  const [siret, setSiret] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [referentFirstName, setReferentFirstName] = useState('');
  const [referentLastName, setReferentLastName] = useState('');
  const [referentEmail, setReferentEmail] = useState('');
  const [referentPhone, setReferentPhone] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [members, setMembers] = useState<AdminUser[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(client?.name ?? '');
    setSiret(client?.siret ?? '');
    setContactEmail(client?.contact_email ?? '');
    setReferentFirstName(client?.referent_first_name ?? '');
    setReferentLastName(client?.referent_last_name ?? '');
    setReferentEmail(client?.referent_email ?? '');
    setReferentPhone(client?.referent_phone ?? '');
    setLogo(null);
    setRemoveLogo(false);
    setMemberIds(client?.members?.map((m) => m.id) ?? []);
  }, [open, client]);

  useEffect(() => {
    if (!open || issuer) return;
    apiService.adminUsersList({ role: 'user', per_page: 100 })
      .then((res) => setMembers(res.users))
      .catch(() => setMembers([]));
  }, [open, issuer]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: TravauxPayload = {
      name,
      siret,
      contact_email: contactEmail,
      referent_first_name: referentFirstName,
      referent_last_name: referentLastName,
      referent_email: referentEmail,
      referent_phone: referentPhone,
      logo: logo ?? undefined,
      remove_logo: removeLogo && !logo ? true : undefined,
    };
    if (!issuer) payload.member_ids = memberIds;
    try {
      const saved = issuer
        ? (await apiService.adminTravauxUpdateIssuer(payload)).issuer
        : isEdit
          ? (await apiService.adminTravauxUpdateClient(client!.id, payload)).client
          : (await apiService.adminTravauxCreateClient(payload)).client;
      toast.success(t('travaux.clients.saved'));
      onSaved(saved);
    } catch (err) {
      toast.error(apiErrorMessage(err, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!client || !window.confirm(t('travaux.common.confirmDelete'))) return;
    setDeleting(true);
    try {
      await apiService.adminTravauxDeleteClient(client.id);
      toast.success(t('travaux.clients.deleted'));
      onDeleted?.();
    } catch (err) {
      toast.error(apiErrorMessage(err, t('travaux.clients.deleteBlocked')));
    } finally {
      setDeleting(false);
    }
  }

  const toggleMember = (id: string) =>
    setMemberIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const title = issuer ? t('travaux.clients.issuerTitle') : isEdit ? t('travaux.clients.edit') : t('travaux.clients.new');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={issuer ? t('travaux.clients.issuerHint') : undefined}
      size="md"
      footer={
        <>
          {isEdit && !issuer && onDeleted && (
            <button type="button" className="adm-btn adm-btn--danger trv-mr-auto" onClick={remove} disabled={deleting}>
              {t('common.delete')}
            </button>
          )}
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" form="trv-client-form" className="adm-btn adm-btn--primary" disabled={saving}>
            {isEdit || issuer ? t('common.save') : t('common.create')}
          </button>
        </>
      }
    >
      <form id="trv-client-form" className="adm-form" onSubmit={submit}>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="trv-client-name">{t('travaux.clients.fields.name')} *</label>
          <input id="trv-client-name" className="adm-input" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="adm-form__field">
          <span className="adm-form__label">{t('travaux.clients.fields.logo')}</span>
          <FileDropzone
            compact
            accept="image/png,image/jpeg"
            file={logo}
            onChange={(f) => { setLogo(f); setRemoveLogo(false); }}
            label={t('travaux.clients.dropLogo')}
            hint={t('travaux.clients.dropLogoHint')}
            existingUrl={removeLogo ? null : apiAssetUrl(client?.logo_path)}
            existingName={client?.name}
            existingIsImage
            onRemoveExisting={() => setRemoveLogo(true)}
          />
        </div>
        <div className="adm-form__row">
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-client-siret">{t('travaux.clients.fields.siret')}</label>
            <input id="trv-client-siret" className="adm-input" maxLength={20} value={siret} onChange={(e) => setSiret(e.target.value)} />
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-client-email">{t('travaux.clients.fields.contactEmail')}</label>
            <input id="trv-client-email" type="email" className="adm-input" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </div>
        </div>
        <div className="adm-form__row">
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-client-ref-first">{t('travaux.clients.fields.referentFirstName')}</label>
            <input id="trv-client-ref-first" className="adm-input" value={referentFirstName} onChange={(e) => setReferentFirstName(e.target.value)} />
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-client-ref-last">{t('travaux.clients.fields.referentLastName')}</label>
            <input id="trv-client-ref-last" className="adm-input" value={referentLastName} onChange={(e) => setReferentLastName(e.target.value)} />
          </div>
        </div>
        <div className="adm-form__row">
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-client-ref-email">{t('travaux.clients.fields.referentEmail')}</label>
            <input id="trv-client-ref-email" type="email" className="adm-input" value={referentEmail} onChange={(e) => setReferentEmail(e.target.value)} />
          </div>
          <div className="adm-form__field">
            <label className="adm-form__label" htmlFor="trv-client-ref-phone">{t('travaux.clients.fields.referentPhone')}</label>
            <input id="trv-client-ref-phone" className="adm-input" value={referentPhone} onChange={(e) => setReferentPhone(e.target.value)} />
          </div>
        </div>

        {!issuer && (
          <div className="adm-form__field">
            <span className="adm-form__label">{t('travaux.clients.fields.members')}</span>
            <p className="trv-muted">{t('travaux.clients.fields.membersHint')}</p>
            {members.length ? (
              <div className="trv-checklist">
                {members.map((m) => (
                  <label key={m.id}>
                    <input type="checkbox" checked={memberIds.includes(m.id)} onChange={() => toggleMember(m.id)} />
                    <span>{m.full_name || m.email}</span>
                    {m.full_name && <span className="trv-muted">{m.email}</span>}
                  </label>
                ))}
              </div>
            ) : (
              <p className="trv-info">{t('travaux.clients.fields.noMembers')}</p>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
