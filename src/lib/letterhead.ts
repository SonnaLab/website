/**
 * En-tête / pied de page des documents générés, à partir de la fiche
 * émetteur (page Entreprise). Miroir de app/services/travaux/letterhead.rb
 * et Travaux::Client#address_lines / #legal_line côté API : l'aperçu se
 * recalcule pendant la saisie, avant tout enregistrement.
 */

export interface LetterheadCompany {
  name?: string | null;
  legal_name?: string | null;
  legal_form?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  referent_phone?: string | null;
  contact_email?: string | null;
  website?: string | null;
  siret?: string | null;
  rcs?: string | null;
  capital?: string | null;
  vat_number?: string | null;
  iban?: string | null;
  bic?: string | null;
  tagline?: string | null;
}

export const DEFAULT_TAGLINE = "SonnaLab — Le laboratoire d'idées qui transforme le digital.";
export const DEFAULT_WEBSITE = 'https://sonnalab.com';

const present = (v: string | null | undefined): v is string => !!v && v.trim() !== '';
const join = (parts: (string | null | undefined)[], sep: string) => parts.filter(present).map((p) => p.trim()).join(sep);

/** « rue », « complément », puis « CP Ville, Pays ». */
export function addressLines(c: LetterheadCompany | null | undefined): string[] {
  if (!c) return [];
  const locality = join([join([c.postal_code, c.city], ' '), c.country], ', ');
  return [c.address_line1, c.address_line2, locality].filter(present).map((l) => l.trim());
}

/** Adresse du pied de page, sur une ligne : « rue, CP Ville, Pays ». */
export function footerAddress(c: LetterheadCompany | null | undefined): string {
  return addressLines(c).join(', ');
}

/** « SONNALAB SAS · Capital 1 000 € · RCS … · SIRET … » (la TVA a sa propre ligne). */
export function legalLine(c: LetterheadCompany | null | undefined): string {
  if (!c) return '';
  return join([
    join([present(c.legal_name) ? c.legal_name : c.name, c.legal_form], ' '),
    present(c.capital) ? `Capital ${c.capital.trim()}` : null,
    c.rcs,
    present(c.siret) ? `SIRET ${c.siret.trim()}` : null,
  ], ' · ');
}

/** Téléphone de l'entreprise, à défaut celui du référent (comme le PDF). */
export function partyPhone(c: LetterheadCompany | null | undefined): string | null {
  if (present(c?.phone)) return c!.phone!.trim();
  return present(c?.referent_phone) ? c!.referent_phone!.trim() : null;
}

/** « téléphone | e-mail » sous le logo de l'émetteur. */
export function issuerContact(c: LetterheadCompany | null | undefined): string {
  if (!c) return '';
  return join([partyPhone(c), c.contact_email], ' | ');
}

/**
 * Numéro de TVA intracommunautaire, ou null : la ligne au-dessus du pied de
 * page affiche alors « TVA non applicable – article 293 B du CGI ».
 */
export function vatNumber(c: LetterheadCompany | null | undefined): string | null {
  return present(c?.vat_number) ? c!.vat_number!.trim() : null;
}

/** « Nom — slogan » ; texte historique tant que la fiche n'a pas de slogan. */
export function footerSlogan(c: LetterheadCompany | null | undefined): string {
  if (!c || !present(c.tagline)) return DEFAULT_TAGLINE;
  return join([c.name, c.tagline], ' — ');
}

export function footerWebsite(c: LetterheadCompany | null | undefined): string {
  return present(c?.website) ? c!.website!.trim() : DEFAULT_WEBSITE;
}

/** « IBAN … · BIC … » pour les mentions de règlement, ou null sans IBAN. */
export function bankLine(c: LetterheadCompany | null | undefined): string | null {
  if (!c || !present(c.iban)) return null;
  return join([`IBAN ${c.iban.trim()}`, present(c.bic) ? `BIC ${c.bic.trim()}` : null], ' · ');
}
