import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

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
  modifiedTime
}: SEOProps) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  const alternateLanguages = ['fr', 'en'].filter(lang => lang !== currentLang);

  const siteUrl = 'https://sonnalab.com';
  const fullUrl = url ? `${siteUrl}${url}` : siteUrl;
  const fullImageUrl = image.startsWith('http') ? image : `${siteUrl}${image}`;

  // Titre par défaut
  const defaultTitle = currentLang === 'fr' 
    ? 'SonnaLab - Le laboratoire d\'idées qui transforme le digital'
    : 'SonnaLab - The Ideas Lab Transforming Digital';

  const finalTitle = title ? `${title} | SonnaLab` : defaultTitle;

  return (
    <Helmet>
      {/* Métadonnées de base */}
      <html lang={currentLang} />
      <title>{finalTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="author" content={author} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={fullUrl} />
      
      {/* Alternate languages (hreflang) */}
      {alternateLanguages.map(lang => (
        <link
          key={lang}
          rel="alternate"
          hrefLang={lang}
          href={`${siteUrl}/${lang}${url || ''}`}
        />
      ))}
      <link rel="alternate" hrefLang="x-default" href={fullUrl} />

      {/* Open Graph (Facebook, LinkedIn) */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:site_name" content="SonnaLab" />
      <meta property="og:locale" content={currentLang === 'fr' ? 'fr_FR' : 'en_US'} />
      {alternateLanguages.map(lang => (
        <meta
          key={`og-${lang}`}
          property="og:locale:alternate"
          content={lang === 'fr' ? 'fr_FR' : 'en_US'}
        />
      ))}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />
      <meta name="twitter:site" content="@SonnaLab" />
      <meta name="twitter:creator" content="@SonnaLab" />

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

      {/* Mobile App */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="SonnaLab" />

      {/* Theme Color */}
      <meta name="theme-color" content="#000000" />
      <meta name="msapplication-TileColor" content="#000000" />

      {/* Robots */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />

      {/* Verification */}
      <meta name="google-site-verification" content="your-verification-code" />
    </Helmet>
  );
}