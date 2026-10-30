// Annee de creation de SonnaLab : base de toutes les "annees d'expertise".
export const FOUNDING_YEAR = 2022;

// Annee du build (define dans vite.config.ts), la meme dans le bundle SSR et
// dans le bundle client d'un deploiement. Un new Date() au rendu differait
// entre le HTML prerendu et le navigateur des qu'un build de decembre etait
// affiche en janvier : hydratation ratee sur toutes les pages (footer) et sur
// la home (vignettes d'experience).
export const BUILD_YEAR: number = __BUILD_YEAR__;

export const YEARS_OF_EXPERIENCE = BUILD_YEAR - FOUNDING_YEAR;
