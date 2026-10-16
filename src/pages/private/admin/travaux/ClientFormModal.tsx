import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '@/components/common/Modal';
import { StepperModal } from '@/components/common/StepperModal';
import { apiAssetUrl, apiService, type AdminUser } from '@/services/api';
import type { TravauxClient, TravauxPayload } from '@/types/travaux';
import { addressLines } from '@/lib/letterhead';
import { FileDropzone } from './FileDropzone';
import { apiErrorMessage } from './format';

const STEPS = ['company', 'contact', 'referent', 'access'] as const;

/**
 * Création/édition d'un client (entreprise). Son adresse et son téléphone
 * figurent dans le bloc « À l'attention de » des devis/factures. La fiche
 * émetteur SonnaLab s'édite, elle, depuis la page Entreprise.
 *
 * Création : assistant en 4 étapes (StepperModal) — entreprise, coordonnées,
 * référent, accès membres + récapitulatif. Édition : formulaire sur une page.
 */
export function ClientFormModal({
  open,
  client,
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  client: TravauxClient | null;
  onClose: () => void;
  onSaved: (client: TravauxClient) => void;
  onDeleted?: () => void;
}) {
  const { t } = useTranslation('admin');
  const isEdit = !!client;
  const [step, setStep] = useState(0);
  const stepFormRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState('');
  const [siret, setSiret] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [referentFirstName, setReferentFirstName] = useState('');
  const [referentLastName, setReferentLastName] = useState('');
  const [referentEmail, setReferentEmail] = useState('');
  const [referentPhone, setReferentPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [members, setMembers] = useState<AdminUser[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setName(client?.name ?? '');
    setSiret(client?.siret ?? '');
    setContactEmail(client?.contact_email ?? '');
    setReferentFirstName(client?.referent_first_name ?? '');
    setReferentLastName(client?.referent_last_name ?? '');
    setReferentEmail(client?.referent_email ?? '');
    setReferentPhone(client?.referent_phone ?? '');
    setAddressLine1(client?.address_line1 ?? '');
    setPostalCode(client?.postal_code ?? '');
    setCity(client?.city ?? '');
    setCountry(client?.country ?? '');
    setPhone(client?.phone ?? '');
    setLogo(null);
    setRemoveLogo(false);
    setMemberIds(client?.members?.map((m) => m.id) ?? []);
  }, [open, client]);

  useEffect(() => {
    if (!open) return;
    apiService.adminUsersList({ role: 'user', per_page: 100 })
      .then((res) => setMembers(res.users))
      .catch(() => setMembers([]));
  }, [open]);

  async function save() {
    setSaving(true);
    const payload: TravauxPayload = {
      name,
      siret,
      contact_email: contactEmail,
      referent_first_name: referentFirstName,
      referent_last_name: referentLastName,
      referent_email: referentEmail,
      referent_phone: referentPhone,
      address_line1: addressLine1,
      postal_code: postalCode,
      city,
      country,
      phone,
      logo: logo ?? undefined,
      remove_logo: removeLogo && !logo ? true : undefined,
      member_ids: memberIds,
    };
    try {
      const saved = isEdit
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

  // Assistant : chaque étape est un formulaire, validé (requis, e-mail,
  // longueurs) par le navigateur avant de passer à la suivante.
  const isLastStep = step === STEPS.length - 1;
  function goNext() {
    if (stepFormRef.current && !stepFormRef.current.reportValidity()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function submitStep(e: React.FormEvent) {
    e.preventDefault();
    if (isLastStep) { if (!saving) save(); } else goNext();
  }

  const toggleMember = (id: string) =>
    setMemberIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const companyFields = (
    <>
      <div className="adm-form__field">
        <label className="adm-form__label" htmlFor="trv-client-name">{t('travaux.clients.fields.name')} *</label>
        <input id="trv-client-name" className="adm-input" required maxLength={255} autoFocus={!isEdit} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="adm-form__field">
        <label className="adm-form__label" htmlFor="trv-client-siret">{t('travaux.clients.fields.siret')}</label>
        <input id="trv-client-siret" className="adm-input" maxLength={20} value={siret} onChange={(e) => setSiret(e.target.value)} />
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
    </>
  );

  const contactFields = (
    <>
      <div className="adm-form__row">
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="trv-client-email">{t('travaux.clients.fields.contactEmail')}</label>
          <input id="trv-client-email" type="email" className="adm-input" maxLength={255} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        </div>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="trv-client-phone">{t('travaux.clients.fields.phone')}</label>
          <input id="trv-client-phone" type="tel" className="adm-input" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <div className="adm-form__field">
        <label className="adm-form__label" htmlFor="trv-client-address">{t('travaux.clients.fields.address')}</label>
        <input id="trv-client-address" className="adm-input" maxLength={255} value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
      </div>
      <div className="adm-form__row">
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="trv-client-postal">{t('travaux.clients.fields.postalCode')}</label>
          <input id="trv-client-postal" className="adm-input" maxLength={20} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
        </div>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="trv-client-city">{t('travaux.clients.fields.city')}</label>
          <input id="trv-client-city" className="adm-input" maxLength={120} value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
      </div>
      <div className="adm-form__field">
        <label className="adm-form__label" htmlFor="trv-client-country">{t('travaux.clients.fields.country')}</label>
        <input id="trv-client-country" className="adm-input" maxLength={120} value={country} onChange={(e) => setCountry(e.target.value)} />
      </div>
    </>
  );

  const referentFields = (
    <>
      <div className="adm-form__row">
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="trv-client-ref-first">{t('travaux.clients.fields.referentFirstName')}</label>
          <input id="trv-client-ref-first" className="adm-input" maxLength={150} value={referentFirstName} onChange={(e) => setReferentFirstName(e.target.value)} />
        </div>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="trv-client-ref-last">{t('travaux.clients.fields.referentLastName')}</label>
          <input id="trv-client-ref-last" className="adm-input" maxLength={150} value={referentLastName} onChange={(e) => setReferentLastName(e.target.value)} />
        </div>
      </div>
      <div className="adm-form__row">
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="trv-client-ref-email">{t('travaux.clients.fields.referentEmail')}</label>
          <input id="trv-client-ref-email" type="email" className="adm-input" maxLength={255} value={referentEmail} onChange={(e) => setReferentEmail(e.target.value)} />
        </div>
        <div className="adm-form__field">
          <label className="adm-form__label" htmlFor="trv-client-ref-phone">{t('travaux.clients.fields.referentPhone')}</label>
          <input id="trv-client-ref-phone" type="tel" className="adm-input" maxLength={30} value={referentPhone} onChange={(e) => setReferentPhone(e.target.value)} />
        </div>
      </div>
    </>
  );

  const membersField = (
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
  );

  if (isEdit) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title={t('travaux.clients.edit')}
        size="md"
        footer={
          <>
            {onDeleted && (
              <button type="button" className="adm-btn adm-btn--danger trv-mr-auto" onClick={remove} disabled={deleting}>
                {t('common.delete')}
              </button>
            )}
            <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" form="trv-client-form" className="adm-btn adm-btn--primary" disabled={saving}>
              {t('common.save')}
            </button>
          </>
        }
      >
        <form id="trv-client-form" className="adm-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
          {companyFields}
          {contactFields}
          {referentFields}
          {membersField}
        </form>
      </Modal>
    );
  }

  const referent = [referentFirstName, referentLastName].filter(Boolean).join(' ');
  const recap: [string, string][] = [
    [t('travaux.clients.recap.company'), name],
    [t('travaux.clients.fields.siret'), siret],
    [t('travaux.clients.fields.address'), addressLines({ address_line1: addressLine1, postal_code: postalCode, city, country }).join(', ')],
    [t('travaux.clients.recap.contact'), [contactEmail, phone].filter(Boolean).join(' · ')],
    [t('travaux.clients.recap.referent'), [referent, referentEmail, referentPhone].filter(Boolean).join(' · ')],
  ];

  return (
    <StepperModal
      open={open}
      onClose={onClose}
      title={t('travaux.clients.new')}
      size="lg"
      steps={STEPS.map((key) => t(`travaux.clients.steps.${key}`))}
      currentStep={step}
      onBack={() => setStep((s) => Math.max(s - 1, 0))}
      onNext={goNext}
      nextLabel={t('common.next')}
      nextDisabled={step === 0 && !name.trim()}
      backLabel={t('common.back')}
      closeLabel={t('common.cancel')}
      finalStepLabel={saving ? t('travaux.clients.creating') : t('common.create')}
      onFinalStep={() => { if (!saving) save(); }}
      finalStepDisabled={saving}
    >
      <form ref={stepFormRef} className="adm-form" onSubmit={submitStep}>
        <p className="trv-muted">{t(`travaux.clients.stepHints.${STEPS[step]}`)}</p>
        {step === 0 && companyFields}
        {step === 1 && contactFields}
        {step === 2 && referentFields}
        {step === 3 && (
          <>
            {membersField}
            <div className="adm-form__field">
              <span className="adm-form__label">{t('travaux.clients.recap.title')}</span>
              <dl className="trv-recap">
                {recap.map(([label, value]) => (
                  <div key={label} className="trv-recap__row">
                    <dt>{label}</dt>
                    <dd>{value || '—'}</dd>
                  </div>
                ))}
                <div className="trv-recap__row">
                  <dt>{t('travaux.clients.recap.members')}</dt>
                  <dd>{memberIds.length || '—'}</dd>
                </div>
              </dl>
            </div>
          </>
        )}
        {/* Entrée valide l'étape (bouton invisible : les actions sont dans le pied du modal). */}
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </StepperModal>
  );
}
