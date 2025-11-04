import { getBlogPosts } from '../../data/blogLoader';
import type { BlogPost } from '../../types/blog';

const BASE_URL = 'https://sonnalab.com';

interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
  alternates?: {
    lang: string;
    href: string;
  }[];
}

const staticPages: SitemapUrl[] = [
  {
    loc: `${BASE_URL}/`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 1.0,
    alternates: [
      { lang: 'en', href: `${BASE_URL}/en/` },
      { lang: 'fr', href: `${BASE_URL}/` },
    ]
  },
  {
    loc: `${BASE_URL}/en/`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 1.0,
    alternates: [
      { lang: 'fr', href: `${BASE_URL}/` },
      { lang: 'en', href: `${BASE_URL}/en/` },
    ]
  },
  {
    loc: `${BASE_URL}/blog`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 0.9,
    alternates: [
      { lang: 'en', href: `${BASE_URL}/en/blog` },
      { lang: 'fr', href: `${BASE_URL}/blog` },
    ]
  },
  {
    loc: `${BASE_URL}/en/blog`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 0.9,
    alternates: [
      { lang: 'fr', href: `${BASE_URL}/blog` },
      { lang: 'en', href: `${BASE_URL}/en/blog` },
    ]
  },
  {
    loc: `${BASE_URL}/projects`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'monthly',
    priority: 0.8,
    alternates: [
      { lang: 'en', href: `${BASE_URL}/en/projects` },
      { lang: 'fr', href: `${BASE_URL}/projects` },
    ]
  },
  {
    loc: `${BASE_URL}/en/projects`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'monthly',
    priority: 0.8,
    alternates: [
      { lang: 'fr', href: `${BASE_URL}/projects` },
      { lang: 'en', href: `${BASE_URL}/en/projects` },
    ]
  },
  {
    loc: `${BASE_URL}/contact`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'monthly',
    priority: 0.7,
    alternates: [
      { lang: 'en', href: `${BASE_URL}/en/contact` },
      { lang: 'fr', href: `${BASE_URL}/contact` },
    ]
  },
  {
    loc: `${BASE_URL}/en/contact`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'monthly',
    priority: 0.7,
    alternates: [
      { lang: 'fr', href: `${BASE_URL}/contact` },
      { lang: 'en', href: `${BASE_URL}/en/contact` },
    ]
  },
];

function getBlogPostAlternateUrl(post: BlogPost, relatedPosts: BlogPost[]): string | undefined {
  if (!post.relatedPostId) return undefined;
  const related = relatedPosts.find(p => p.id === post.relatedPostId);
  if (!related) return undefined;
  
  const langPrefix = related.lang === 'en' ? '/en' : '';
  return `${BASE_URL}${langPrefix}/blog/${related.slug}`;
}

export async function generateSitemap(): Promise<string> {
  const blogPosts = await getBlogPosts();
  
  const blogUrls: SitemapUrl[] = blogPosts.map(post => {
    const langPrefix = post.lang === 'en' ? '/en' : '';
    const loc = `${BASE_URL}${langPrefix}/blog/${post.slug}`;
    const alternateUrl = getBlogPostAlternateUrl(post, blogPosts);
    
    return {
      loc,
      lastmod: post.updatedAt || post.publishedAt,
      changefreq: 'monthly' as const,
      priority: 0.8,
      alternates: alternateUrl ? [
        { lang: post.lang === 'fr' ? 'en' : 'fr', href: alternateUrl },
        { lang: post.lang, href: loc },
      ] : undefined,
    };
  });

  const allUrls = [...staticPages, ...blogUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${allUrls.map(url => `  
  <url>
    <loc>${url.loc}</loc>${url.alternates ? `
${url.alternates.map(alt => `    <xhtml:link rel="alternate" hreflang="${alt.lang}" href="${alt.href}"/>`).join('\n')}${url.alternates.find(a => a.lang === 'fr') ? `
    <xhtml:link rel="alternate" hreflang="x-default" href="${url.alternates.find(a => a.lang === 'fr')?.href}"/>` : ''}` : ''}
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}

</urlset>`;

  return xml;
}

// Script Node.js pour générer le sitemap
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSitemap().then(xml => {
    console.log(xml);
  });
}