// The languages of the site, the member/admin app and the e-mails (the API's
// ApplicationMailer::LOCALES), each written in its own name.
export const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'es', label: 'Español' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export const LANGUAGE_CODES: readonly LanguageCode[] = LANGUAGES.map((lang) => lang.code);

export const isLanguageCode = (code: string | null | undefined): code is LanguageCode =>
  !!code && (LANGUAGE_CODES as readonly string[]).includes(code);
