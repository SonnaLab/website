import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HotelIcon, TrafficConeIcon } from '@icons';

import { apiAssetUrl, apiService } from '@/services/api';
import type { TravauxClient, TravauxPayload } from '@/types/travaux';
import { DocumentPreviewFrame } from '../travaux/DocumentPreviewFrame';
import { FileDropzone } from '../travaux/FileDropzone';
import { apiErrorMessage } from '../travaux/format';
import { LetterheadSheet, type LetterheadZone } from './LetterheadSheet';
import { LookupInput } from '../travaux/LookupInput';
import { Breadcrumbs } from '@/components/private/common/Breadcrumbs';
import { PageHeader } from '@/components/private/common/PageHeader';
import { normalizeCompanyAddress, searchCompanies, type CompanySuggestion } from '@/lib/publicDirectories';

const FIELDS = [
  'name', 'address_line1', 'address_line2', 'postal_code', 'city', 'country', 'phone', 'contact_email', 'website',
  'tagline', 'legal_name', 'legal_form', 'capital', 'rcs', 'siret', 'vat_number',
  'iban', 'bic',
  'referent_first_name', 'referent_last_name', 'referent_email', 'referent_phone',
] as const;

type Field = (typeof FIELDS)[number];
type FormState = Record<Field, string>;

interface FieldDef { name: Field; maxLength: number; type?: 'email' | 'tel' | 'url'; full?: boolean; required?: boolean }

/** Champs groupés par zone du document : focaliser une section l'éclaire dans l'aperçu. */
const SECTIONS: { key: string; zone: LetterheadZone; fields: FieldDef[]; logo?: boolean }[] = [
  {
    key: 'header', zone: 'header', logo: true, fields: [
      { name: 'name', maxLength: 255, full: true, required: true },
      { name: 'contact_email', maxLength: 255, type: 'email' },
      { name: 'phone', maxLength: 30, type: 'tel' },
    ],
  },
  {
    key: 'footer', zone: 'footer', fields: [
      { name: 'website', maxLength: 255, type: 'url', full: true },
      { name: 'address_line1', maxLength: 255, full: true },
      { name: 'address_line2', maxLength: 255, full: true },
      { name: 'postal_code', maxLength: 20 },
      { name: 'city', maxLength: 120 },
      { name: 'country', maxLength: 120 },
      { name: 'tagline', maxLength: 255, full: true },
      { name: 'legal_name', maxLength: 255 },
      { name: 'legal_form', maxLength: 50 },
      { name: 'capital', maxLength: 60 },
      { name: 'rcs', maxLength: 120 },
      { name: 'siret', maxLength: 20 },
    ],
  },
  {
    key: 'vat', zone: 'vat', fields: [
      { name: 'vat_number', maxLength: 40, full: true },
    ],
  },
  {
    key: 'payment', zone: 'payment', fields: [
      { name: 'iban', maxLength: 40 },
      { name: 'bic', maxLength: 20 },
    ],
  },
  {
    key: 'referent', zone: null, fields: [
      { name: 'referent_first_name', maxLength: 150 },
      { name: 'referent_last_name', maxLength: 150 },
      { name: 'referent_email', maxLength: 255, type: 'email' },
      { name: 'referent_phone', maxLength: 30, type: 'tel' },
    ],
  },
];

const toForm = (c: TravauxClient | null): FormState =>
  Object.fromEntries(FIELDS.map((f) => [f, (c?.[f] as string | null | undefined) ?? ''])) as FormState;

/**
 * Page Entreprise (admin) : fiche émetteur SonnaLab, source de l'en-tête et
 * du pied de page des devis, factures et autres documents générés.
 * Gauche (60 %) : aperçu A4 en direct ; droite (40 %) : champs éditables.
 */
export default function Company() {
  const { t } = useTranslation('admin');
  const [issuer, setIssuer] = useState<TravauxClient | null>(null);
  const [form, setForm] = useState<FormState>(() => toForm(null));
  const [logo, setLogo] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [zone, setZone] = useState<LetterheadZone>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiService.adminTravauxIssuer()
      .then((res) => { if (!cancelled) { setIssuer(res.issuer); setForm(toForm(res.issuer)); } })
      .catch(() => { if (!cancelled) toast.error(t('company.loadError')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [t]);

  // Aperçu immédiat du logo choisi, avant envoi.
  useEffect(() => {
    if (!logo) { setLogoPreview(null); return undefined; }
    const url = URL.createObjectURL(logo);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logo]);

  const savedForm = useMemo(() => toForm(issuer), [issuer]);
  const dirty = !!logo || removeLogo || FIELDS.some((f) => form[f] !== savedForm[f]);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const storedLogo = removeLogo ? null : apiAssetUrl(issuer?.logo_path);
  const logoUrl = logoPreview ?? storedLogo;

  const placeholders = t('company.placeholders', { returnObjects: true }) as Partial<Record<Field, string>>;

  const setField = (name: Field, value: string) => setForm((f) => ({ ...f, [name]: value }));

  // Annuaire des entreprises → SIRET, raison sociale et adresse (le nom de
  // marque reste) ; l'adresse publiée en capitales passe ensuite en graphie
  // BAN, sauf si on l'a modifiée entre-temps. Rien n'est enregistré avant
  // « Enregistrer ».
  const [companyQuery, setCompanyQuery] = useState('');
  const [imported, setImported] = useState('');
  const normalizing = useRef<AbortController | null>(null);
  function importCompany(c: CompanySuggestion) {
    setForm((f) => ({
      ...f,
      siret: c.siret ?? c.siren,
      legal_name: c.name,
      address_line1: c.street,
      postal_code: c.postal_code,
      city: c.city,
      country: c.country,
    }));
    setCompanyQuery('');
    setImported(c.name);
    setZone('footer');
    normalizing.current?.abort();
    const controller = new AbortController();
    normalizing.current = controller;
    normalizeCompanyAddress(c, controller.signal)
      .then((a) => setForm((f) => ({
        ...f,
        address_line1: f.address_line1 === c.street ? a.street : f.address_line1,
        postal_code: f.postal_code === c.postal_code ? a.postal_code : f.postal_code,
        city: f.city === c.city ? a.city : f.city,
      })))
      .catch(() => { /* adresse publiée conservée */ });
  }

  function reset() {
    setForm(savedForm);
    setLogo(null);
    setRemoveLogo(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: TravauxPayload = {
      ...form,
      logo: logo ?? undefined,
      remove_logo: removeLogo && !logo ? true : undefined,
    };
    try {
      const saved = (await apiService.adminTravauxUpdateIssuer(payload)).issuer;
      setIssuer(saved);
      setForm(toForm(saved));
      setLogo(null);
      setRemoveLogo(false);
      toast.success(t('company.saved'));
    } catch (err) {
      toast.error(apiErrorMessage(err, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dash-page">
      {/* Issuer of the Travaux documents; reached from the avatar menu. */}
      <Breadcrumbs items={[{ label: t('nav.travaux'), to: '/admin/travaux' }, { label: t('company.title') }]} />
      <PageHeader
        badge={{ icon: TrafficConeIcon, label: t('nav.travaux') }}
        icon={<HotelIcon size={26} />}
        title={t('company.title')}
        description={t('company.subtitle')}
      />

      <div className="co-layout">
        <section className="co-layout__preview" aria-label={t('company.preview.title')}>
          <DocumentPreviewFrame>
            <LetterheadSheet company={form} logoUrl={logoUrl} zone={zone} />
          </DocumentPreviewFrame>
        </section>

        <form className="co-panel" onSubmit={submit} onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setZone(null);
        }}>
          {loading ? (
            <p className="trv-muted co-panel__loading">{t('company.loading')}</p>
          ) : (
            <div className="co-panel__scroll">
              <div className="co-section">
                <h2 className="co-section__title">{t('company.lookup.title')}</h2>
                <p className="co-section__hint">{t('company.lookup.hint')}</p>
                <div className="adm-form__field">
                  <label className="adm-form__label" htmlFor="co-lookup">{t('travaux.clients.lookup.companyLabel')}</label>
                  <LookupInput
                    id="co-lookup"
                    value={companyQuery}
                    onChange={setCompanyQuery}
                    search={searchCompanies}
                    onPick={importCompany}
                    itemKey={(c) => c.key}
                    placeholder={t('travaux.clients.lookup.companyPlaceholder')}
                    labels={{
                      loading: t('travaux.clients.lookup.loading'),
                      empty: t('travaux.clients.lookup.empty'),
                      error: t('travaux.clients.lookup.error'),
                    }}
                    source={t('travaux.clients.lookup.sourceCompanies')}
                    renderItem={(c) => (
                      <>
                        <span className="trv-lookup__title">
                          {c.name}
                          {c.closed && <span className="trv-lookup__badge">{t('travaux.clients.lookup.closed')}</span>}
                        </span>
                        <span className="trv-lookup__meta">
                          {c.siret ? `SIRET ${c.siret}` : `SIREN ${c.siren}`}
                          {c.isHeadOffice ? ` · ${t('travaux.clients.lookup.headOffice')}` : ''}
                        </span>
                        {c.address && <span className="trv-lookup__meta">{c.address}</span>}
                      </>
                    )}
                  />
                  {imported && <p className="trv-lookup__imported">{t('company.lookup.imported', { name: imported })}</p>}
                </div>
              </div>
              {SECTIONS.map((section) => (
                <div
                  key={section.key}
                  role="group"
                  aria-labelledby={`co-section-${section.key}`}
                  className={`co-section${section.zone && zone === section.zone ? ' co-section--active' : ''}`}
                  onFocus={() => setZone(section.zone)}
                >
                  <h2 id={`co-section-${section.key}`} className="co-section__title">{t(`company.sections.${section.key}.title`)}</h2>
                  <p className="co-section__hint">{t(`company.sections.${section.key}.hint`)}</p>

                  {section.logo && (
                    <div className="adm-form__field">
                      <span className="adm-form__label">{t('company.fields.logo')}</span>
                      <FileDropzone
                        compact
                        accept="image/png,image/jpeg"
                        file={logo}
                        onChange={(f) => { setLogo(f); setRemoveLogo(false); }}
                        label={t('travaux.clients.dropLogo')}
                        hint={t('travaux.clients.dropLogoHint')}
                        existingUrl={storedLogo}
                        existingName={issuer?.name}
                        existingIsImage
                        onRemoveExisting={() => setRemoveLogo(true)}
                      />
                    </div>
                  )}

                  <div className="co-fields">
                    {section.fields.map((field) => (
                      <div key={field.name} className={`adm-form__field${field.full ? ' co-field--full' : ''}`}>
                        <label className="adm-form__label" htmlFor={`co-${field.name}`}>
                          {t(`company.fields.${field.name}`)}{field.required ? ' *' : ''}
                        </label>
                        <input
                          id={`co-${field.name}`}
                          className="adm-input"
                          type={field.type === 'url' ? 'text' : field.type ?? 'text'}
                          inputMode={field.type === 'url' ? 'url' : undefined}
                          maxLength={field.maxLength}
                          required={field.required}
                          placeholder={placeholders[field.name]}
                          value={form[field.name]}
                          onChange={(e) => setField(field.name, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="co-panel__actions">
            <span className="co-panel__status">{dirty ? t('company.unsaved') : t('company.upToDate')}</span>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={reset} disabled={!dirty || saving}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="adm-btn adm-btn--primary" disabled={!dirty || saving || loading}>
              {saving ? t('company.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
