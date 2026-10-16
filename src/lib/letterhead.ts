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

/** « SONNALAB SAS · Capital 1 000 € · RCS … · SIRET … · TVA … ». */
export function legalLine(c: LetterheadCompany | null | undefined): string {
  if (!c) return '';
  return join([
    join([present(c.legal_name) ? c.legal_name : c.name, c.legal_form], ' '),
    present(c.capital) ? `Capital ${c.capital.trim()}` : null,
    c.rcs,
    present(c.siret) ? `SIRET ${c.siret.trim()}` : null,
    present(c.vat_number) ? `TVA ${c.vat_number.trim()}` : null,
  ], ' · ');
}

/** Lignes de contact de l'en-tête (sous le nom, alignées à droite). */
export function contactLines(c: LetterheadCompany | null | undefined): string[] {
  if (!c) return [];
  return [...addressLines(c), join([c.phone, c.contact_email], ' · '), c.website ?? '']
    .filter(present).map((l) => l.trim());
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
