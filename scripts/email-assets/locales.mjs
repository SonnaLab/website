// The languages every localized e-mail image is drawn in (the API's
// ApplicationMailer::LOCALES). `LOCALES=de,it node …` redraws only some.
export const ALL_LOCALES = ['fr', 'en', 'de', 'it', 'es'];
export const LOCALES = process.env.LOCALES ? process.env.LOCALES.split(',') : ALL_LOCALES;
// A page of the site in a language: French at the root, the others under their prefix.
export const sitePath = (path, locale) => (locale === 'fr' ? path : `/${locale}${path === '/' ? '' : path}`);
