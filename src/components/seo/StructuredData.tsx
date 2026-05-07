import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { ArticleStructuredDataProps } from '@/types/seo';

export function OrganizationStructuredData() {
  const { i18n } = useTranslation();
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "SonnaLab",
    "url": "https://sonnalab.com",
    "logo": "https://sonnalab.com/logo.png",
    "description": i18n.language === 'fr'
      ? "Le laboratoire d'idées qui transforme le digital"
      : "The Ideas Lab Transforming Digital",
    "foundingDate": "2028",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+33-XXX-XXX-XXX",
      "contactType": "Customer Service",
      "availableLanguage": ["French", "English"]
    },
    "sameAs": [
      "https://twitter.com/SonnaLab",
      "https://linkedin.com/company/sonnalab",
      "https://facebook.com/SonnaLab"
    ],
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "FR",
      "addressLocality": "Paris"
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
}

export function WebsiteStructuredData() {
  const { i18n } = useTranslation();
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "SonnaLab",
    "url": "https://sonnalab.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://sonnalab.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    },
    "inLanguage": [
      {
        "@type": "Language",
        "name": "French",
        "alternateName": "fr"
      },
      {
        "@type": "Language",
        "name": "English",
        "alternateName": "en"
      }
    ]
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
}

export function BreadcrumbStructuredData({ items }: { items: Array<{ name: string; url: string }> }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": `https://sonnalab.com${item.url}`
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
}

export function ArticleStructuredData({
  title,
  description,
  image,
  datePublished,
  dateModified,
  author
}: ArticleStructuredDataProps) {
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: description,
    image: image.startsWith('http') ? image : `https://sonnalab.com${image}`,
    datePublished: datePublished,
    dateModified: dateModified,
    author: {
      '@type': 'Person',
      name: author,
      url: 'https://sonnalab.com/about'
    },
    publisher: {
      '@type': 'Organization',
      name: 'SonnaLab',
      logo: {
        '@type': 'ImageObject',
        url: 'https://sonnalab.com/logo.png'
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://sonnalab.com/blog/${title.toLowerCase().replace(/\s+/g, '-')}`
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(articleSchema)}
      </script>
    </Helmet>
  );
}