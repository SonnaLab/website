import { useTranslation } from 'react-i18next';
import {
  bankLine,
  contactLines,
  footerSlogan,
  footerWebsite,
  legalLine,
  type LetterheadCompany,
} from '@/lib/letterhead';

/** Zone du document mise en évidence pendant l'édition des champs correspondants. */
export type LetterheadZone = 'header' | 'footer' | 'payment' | null;

/** Initiales à la place du logo — même règle que Travaux::Client#initials. */
function initialsOf(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return '?';
}

/**
 * Page A4 de papier à en-tête : réplique de Travaux::Letterhead (PDF) aux
 * mêmes cotes — marges 20 mm / 15 mm, pied de page ancré à 8 mm du bord.
 * Le corps est schématisé : chaque document (devis, facture…) le remplit.
 */
export function LetterheadSheet({
  company,
  logoUrl,
  zone,
}: {
  company: LetterheadCompany;
  logoUrl: string | null;
  zone: LetterheadZone;
}) {
  const { t } = useTranslation('admin');
  const contacts = contactLines(company);
  const legal = legalLine(company);
  const bank = bankLine(company);
  const zoneClass = (z: Exclude<LetterheadZone, null>) => `co-sheet__zone${zone === z ? ' co-sheet__zone--active' : ''}`;

  return (
    <div className="co-sheet">
      <header className={`co-sheet__head ${zoneClass('header')}`}>
        {logoUrl ? (
          <img src={logoUrl} alt={company.name ?? ''} className="co-sheet__logo" />
        ) : (
          <span className="co-sheet__initials">{initialsOf(company.name)}</span>
        )}
        <div className="co-sheet__identity">
          <p className="co-sheet__name">{company.name || '—'}</p>
          {contacts.map((line, i) => <p key={i} className="co-sheet__meta">{line}</p>)}
        </div>
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

      <footer className={`co-sheet__foot ${zoneClass('footer')}`}>
        <p className="co-sheet__slogan">{footerSlogan(company)}</p>
        <p className="co-sheet__url">{footerWebsite(company)}</p>
        {legal && <p className="co-sheet__legal">{legal}</p>}
      </footer>
    </div>
  );
}
