import { useTranslation } from 'react-i18next';
import {
  bankLine,
  footerAddress,
  footerSlogan,
  footerWebsite,
  issuerContact,
  legalLine,
  partyPhone,
  vatNumber,
  type LetterheadCompany,
} from '@/lib/letterhead';

/** Zone du document mise en évidence pendant l'édition des champs correspondants. */
export type LetterheadZone = 'header' | 'footer' | 'vat' | 'payment' | null;

/** Client destinataire affiché à droite de l'en-tête ; absent → emplacement type. */
export interface LetterheadClient extends LetterheadCompany {
  logoUrl: string | null;
}

/**
 * Page A4 de papier à en-tête : réplique de Travaux::Letterhead (PDF) aux
 * mêmes cotes — marges 20 mm / 15 mm, pied de page ancré à 8 mm du bord.
 * En-tête : émetteur à gauche (logo, « tél | e-mail »), client à droite.
 * Pied : mention TVA, puis site web, adresse, « Nom — slogan », ligne légale.
 * Le corps est schématisé : chaque document (devis, facture…) le remplit.
 */
export function LetterheadSheet({
  company,
  logoUrl,
  client,
  zone,
}: {
  company: LetterheadCompany;
  logoUrl: string | null;
  client?: LetterheadClient | null;
  zone: LetterheadZone;
}) {
  const { t } = useTranslation('admin');
  const contact = issuerContact(company);
  const address = footerAddress(company);
  const legal = legalLine(company);
  const bank = bankLine(company);
  const vat = vatNumber(company);
  const zoneClass = (z: Exclude<LetterheadZone, null>) => `co-sheet__zone${zone === z ? ' co-sheet__zone--active' : ''}`;

  return (
    <div className="co-sheet">
      <header className={`co-sheet__head ${zoneClass('header')}`}>
        <div className="co-sheet__party">
          {logoUrl ? (
            <img src={logoUrl} alt={company.name ?? ''} className="co-sheet__logo" />
          ) : (
            <p className="co-sheet__name">{company.name || '—'}</p>
          )}
          {contact && <p className="co-sheet__meta">{contact}</p>}
        </div>

        {client ? (
          <div className="co-sheet__party co-sheet__party--right">
            {client.logoUrl ? (
              <img src={client.logoUrl} alt={client.name ?? ''} className="co-sheet__logo" />
            ) : (
              <p className="co-sheet__name">{client.name || '—'}</p>
            )}
            {partyPhone(client) && <p className="co-sheet__meta">{partyPhone(client)}</p>}
            {client.contact_email && <p className="co-sheet__meta">{client.contact_email}</p>}
          </div>
        ) : (
          <div className="co-sheet__party co-sheet__party--right co-sheet__party--placeholder">
            <span className="co-sheet__logo-slot">{t('company.preview.clientLogo')}</span>
            <p className="co-sheet__meta">{t('company.preview.clientPhone')}</p>
            <p className="co-sheet__meta">{t('company.preview.clientEmail')}</p>
          </div>
        )}
      </header>

      <div className="co-sheet__body" aria-hidden="true">
        <p className="co-sheet__body-label">{t('company.preview.body')}</p>
        <div className="co-sheet__lines">
          {[88, 72, 80, 54].map((w) => <span key={w} style={{ width: `${w}%` }} />)}
        </div>
        <div className="co-sheet__table">
          {[0, 1, 2, 3].map((row) => <span key={row} />)}
        </div>
        <div className="co-sheet__lines co-sheet__lines--center">
          {[64, 46].map((w) => <span key={w} style={{ width: `${w}%` }} />)}
        </div>
      </div>

      <p className={`co-sheet__payment ${zoneClass('payment')}`}>
        {bank ? t('travaux.document.paymentMentionBank', { bank }) : t('travaux.document.paymentMention')}
      </p>

      <footer className="co-sheet__foot">
        <p className={`co-sheet__vat ${zoneClass('vat')}`}>
          {vat ? t('travaux.document.vatNumber', { number: vat }) : t('travaux.document.vatMention')}
        </p>
        <div className={`co-sheet__foot-lines ${zoneClass('footer')}`}>
          <p className="co-sheet__url">{footerWebsite(company)}</p>
          {address && <p className="co-sheet__address">{address}</p>}
          <p className="co-sheet__slogan">{footerSlogan(company)}</p>
          {legal && <p className="co-sheet__legal">{legal}</p>}
        </div>
      </footer>
    </div>
  );
}
