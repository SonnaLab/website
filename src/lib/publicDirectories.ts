/**
 * Annuaires publics de l'État, gratuits et sans clé, appelés directement
 * depuis le navigateur (CORS ouvert) — volontairement hors de apiService,
 * pour ne jamais leur transmettre le jeton SonnaLab.
 *
 *  - Recherche d'entreprises (annuaire-entreprises.data.gouv.fr), ~7 req/s
 *  - Géocodage de la Géoplateforme IGN (ex-API Adresse / BAN), ~50 req/s
 *
 * France uniquement : pour un client étranger, la saisie reste manuelle.
 */

const COMPANIES_URL = 'https://recherche-entreprises.api.gouv.fr/search';
const ADDRESSES_URL = 'https://data.geopf.fr/geocodage/search';

export interface AddressSuggestion {
  key: string;
  /** « 12 Rue de la Paix 75002 Paris » */
  label: string;
  /** « 12 Rue de la Paix » → address_line1 */
  street: string;
  postal_code: string;
  city: string;
  /** « 75, Paris, Île-de-France » */
  context: string;
}

export interface CompanySuggestion {
  key: string;
  name: string;
  siren: string;
  siret: string | null;
  street: string;
  postal_code: string;
  city: string;
  country: string;
  /** Adresse d'affichage, telle que publiée (en capitales). */
  address: string;
  isHeadOffice: boolean;
  /** Entreprise cessée ou établissement fermé. */
  closed: boolean;
}

interface GeoFeature {
  properties: { id: string; label: string; name: string; postcode: string; city: string; context: string };
}

interface DirectoryEstablishment {
  siret?: string | null;
  adresse?: string | null;
  numero_voie?: string | null;
  indice_repetition?: string | null;
  type_voie?: string | null;
  libelle_voie?: string | null;
  code_postal?: string | null;
  libelle_commune?: string | null;
  libelle_pays_etranger?: string | null;
  etat_administratif?: string | null;
  est_siege?: boolean;
}

interface DirectoryCompany {
  siren: string;
  nom_complet?: string | null;
  nom_raison_sociale?: string | null;
  etat_administratif?: string | null;
  siege?: DirectoryEstablishment | null;
  matching_etablissements?: DirectoryEstablishment[] | null;
}

async function getJson<T>(url: URL, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

/** Autocomplétion d'adresse (France) : numéros et voies d'abord. */
export async function searchAddresses(query: string, signal: AbortSignal, limit = 5): Promise<AddressSuggestion[]> {
  // L'API exige 3 à 200 caractères commençant par une lettre ou un chiffre.
  const q = query.trim().replace(/^[^\p{L}\p{N}]+/u, '').slice(0, 200);
  if (q.length < 3) return [];
  const url = new URL(ADDRESSES_URL);
  url.search = new URLSearchParams({ q, autocomplete: '1', limit: String(limit) }).toString();
  const data = await getJson<{ features: GeoFeature[] }>(url, signal);
  return data.features.map(({ properties: p }) => ({
    key: p.id,
    label: p.label,
    street: p.name,
    postal_code: p.postcode,
    city: p.city,
    context: p.context,
  }));
}

const digits = (s: string) => s.replace(/\s+/g, '');
/** « Avenue des Grouettes » ≡ « AVENUE DES GROUETTES » (casse, accents, ponctuation). */
const sameText = (a: string, b: string) => {
  const key = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase();
  return key(a) === key(b);
};
const join = (parts: (string | null | undefined)[]) => parts.filter(Boolean).join(' ');

/**
 * Voie de l'établissement : champs détaillés quand l'annuaire les fournit
 * (siège), sinon l'adresse complète privée de « CP Commune » (établissements
 * trouvés par SIRET, publiés sur une seule ligne).
 */
function streetOf(etab: DirectoryEstablishment): string {
  const detailed = join([etab.numero_voie, etab.indice_repetition, etab.type_voie, etab.libelle_voie]);
  if (detailed || !etab.adresse) return detailed;
  const locality = join([etab.code_postal, etab.libelle_commune]);
  return locality && etab.adresse.endsWith(locality) ? etab.adresse.slice(0, -locality.length).trim() : etab.adresse;
}

function toSuggestion(company: DirectoryCompany, query: string): CompanySuggestion {
  // Recherche par SIRET : on retient l'établissement demandé, sinon le siège.
  const wanted = /^\d{14}$/.test(digits(query)) ? digits(query) : null;
  const match = wanted ? company.matching_etablissements?.find((e) => e.siret === wanted) : undefined;
  const etab: DirectoryEstablishment = match ?? company.siege ?? {};
  return {
    key: etab.siret ?? company.siren,
    name: company.nom_raison_sociale || company.nom_complet || company.siren,
    siren: company.siren,
    siret: etab.siret ?? null,
    street: streetOf(etab),
    postal_code: etab.code_postal ?? '',
    city: etab.libelle_commune ?? '',
    country: etab.libelle_pays_etranger || 'France',
    address: etab.adresse ?? '',
    isHeadOffice: etab.est_siege ?? !match,
    closed: company.etat_administratif === 'C' || etab.etat_administratif === 'F',
  };
}

/** Recherche d'entreprise par nom, SIREN ou SIRET. */
export async function searchCompanies(query: string, signal: AbortSignal, limit = 6): Promise<CompanySuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = new URL(COMPANIES_URL);
  url.search = new URLSearchParams({ q, per_page: String(limit), page: '1' }).toString();
  const data = await getJson<{ results: DirectoryCompany[] }>(url, signal);
  return data.results.map((c) => toSuggestion(c, q));
}

/**
 * L'annuaire publie les adresses en capitales : on les fait correspondre à
 * la Base Adresse Nationale pour récupérer la graphie usuelle
 * (« Avenue des Grouettes », « Cergy »). Sans correspondance sûre (même
 * voie, même code postal), l'adresse publiée est conservée telle quelle.
 */
export async function normalizeCompanyAddress(
  company: CompanySuggestion,
  signal: AbortSignal,
): Promise<Pick<CompanySuggestion, 'street' | 'postal_code' | 'city'>> {
  const published = { street: company.street, postal_code: company.postal_code, city: company.city };
  if (company.country !== 'France' || !company.street || !company.postal_code) return published;
  const [best] = await searchAddresses(`${company.street} ${company.postal_code} ${company.city}`, signal, 1);
  if (!best || best.postal_code !== company.postal_code || !sameText(best.street, company.street)) return published;
  return { street: best.street, postal_code: best.postal_code, city: best.city };
}
