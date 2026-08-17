import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  hreflangAlternates?: Array<{ lang: string; href: string }>;
  noindex?: boolean;
}

// Pages ayant une variante d'URL préfixée réelle par langue (/en, /es, /it,
// /de en plus du français non préfixé -- voir router/index.tsx). Les autres
// pages n'ont qu'une seule URL : leur hreflang s'auto-référence.
const LOCALIZED_PATHS = ['/', '/blog', '/contact'];
const SITE_LOCALES = ['fr', 'en', 'es', 'it', 'de'];
const DEFAULT_LOCALE = 'fr';

function buildLocalizedHref(origin: string, basePath: string, lang: string): string {
  if (lang === 'x-default' || lang === DEFAULT_LOCALE) {
    return basePath === '/' ? origin : `${origin}${basePath}`;
  }
  return basePath === '/' ? `${origin}/${lang}` : `${origin}/${lang}${basePath}`;
}

export function SEO({
  title,
  description,
  keywords,
  image = '/og-image.png',
  url,
  type = 'website',
  author = 'SonnaLab',
  publishedTime,
  modifiedTime,
  hreflangAlternates,
  noindex = false,
}: SEOProps) {
  const { i18n } = useTranslation();
  const location = useLocation();
  const currentLang = i18n.language?.slice(0, 2) || 'fr';

  const siteUrl = 'https://sonnalab.com';
  // location.pathname (réactif à la navigation) plutôt que le seul `url`
  // fourni par la page appelante : la balise canonical doit refléter l'URL
  // RÉELLEMENT affichée (ex: /en, /en/blog) à chaque changement de route,
  // pas seulement au premier chargement.
  const currentPath = location.pathname === '/' ? '' : location.pathname.replace(/\/+$/, '');
  const fullUrl = url ? `${siteUrl}${url}` : `${siteUrl}${currentPath}` || siteUrl;
  const fullImageUrl = image.startsWith('http') ? image : `${siteUrl}${image}`;

  const prefixMatch = location.pathname.match(/^\/(en|es|it|de)(\/.*)?$/);
  const basePath = prefixMatch ? (prefixMatch[2] || '/') : (location.pathname || '/');
  const isLocalized = !hreflangAlternates && LOCALIZED_PATHS.includes(basePath);
  const computedHreflangAlternates = isLocalized
    ? [...SITE_LOCALES, 'x-default'].map((lang) => ({ lang, href: buildLocalizedHref(siteUrl, basePath, lang) }))
    : hreflangAlternates;

  const defaultTitle = currentLang === 'fr'
    ? 'SonnaLab - Le laboratoire d\'idées qui transforme le digital'
    : 'SonnaLab - The Ideas Lab Transforming Digital';

  const finalTitle = title ? `${title} | SonnaLab` : defaultTitle;

  const OG_LOCALES: Record<string, string> = {
    fr: 'fr_FR',
    en: 'en_US',
    es: 'es_ES',
    it: 'it_IT',
    de: 'de_DE',
  };
  const ogLocale = OG_LOCALES[currentLang] ?? 'en_US';

  return (
    <Helmet>
      {/* Base */}
      <html lang={currentLang} />
      <title>{finalTitle}</title>
      {description && <meta name="description" content={description} />}
      {keywords    && <meta name="keywords"     content={keywords}    />}
      <meta name="author" content={author} />

      {/* Canonical */}
      <link rel="canonical" href={fullUrl} />

      {/* hreflang : URLs réelles par langue pour home/blog/contact (voir
          LOCALIZED_PATHS ci-dessus) ; auto-référence pour les autres pages,
          qui n'ont qu'une seule URL. */}
      {computedHreflangAlternates
        ? computedHreflangAlternates.map(alt => (
            <link key={alt.lang} rel="alternate" hrefLang={alt.lang} href={alt.href} />
          ))
        : <>
            <link rel="alternate" hrefLang="fr"        href={fullUrl} />
            <link rel="alternate" hrefLang="en"        href={fullUrl} />
            <link rel="alternate" hrefLang="es"        href={fullUrl} />
            <link rel="alternate" hrefLang="it"        href={fullUrl} />
            <link rel="alternate" hrefLang="de"        href={fullUrl} />
            <link rel="alternate" hrefLang="x-default" href={fullUrl} />
          </>
      }

      {/* Open Graph */}
      <meta property="og:type"         content={type}                                        />
      <meta property="og:title"        content={finalTitle}                                  />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:image"        content={fullImageUrl}                                />
      <meta property="og:url"          content={fullUrl}                                     />
      <meta property="og:site_name"    content="SonnaLab"                                   />
      <meta property="og:locale"       content={ogLocale}                                   />

      {/* Twitter Card */}
      <meta name="twitter:card"    content="summary_large_image" />
      <meta name="twitter:title"   content={finalTitle}          />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image"   content={fullImageUrl}        />
      <meta name="twitter:site"    content="@SonnaLab"           />
      <meta name="twitter:creator" content="@SonnaLab"           />

      {/* Article metadata */}
      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {type === 'article' && author && (
        <meta property="article:author" content={author} />
      )}

      {/* Mobile */}
      <meta name="apple-mobile-web-app-capable"           content="yes"               />
      <meta name="apple-mobile-web-app-status-bar-style"  content="black-translucent" />
      <meta name="apple-mobile-web-app-title"             content="SonnaLab"          />

      {/* Theme */}
      <meta name="theme-color"          content="#000000" />
      <meta name="msapplication-TileColor" content="#000000" />

      {/* Robots */}
      {noindex ? (
        <>
          <meta name="robots"    content="noindex, nofollow" />
          <meta name="googlebot" content="noindex, nofollow" />
        </>
      ) : (
        <>
          <meta name="robots"    content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
          <meta name="googlebot" content="index, follow" />
        </>
      )}
    </Helmet>
  );
}