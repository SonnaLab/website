import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'https://sonnalab.com';

const staticPages = [
  {
    loc: `${BASE_URL}/`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 1.0,
    alternates: [
      { lang: 'fr',        href: `${BASE_URL}/` },
      { lang: 'en',        href: `${BASE_URL}/` },
      { lang: 'x-default', href: `${BASE_URL}/` },
    ]
  },
  {
    loc: `${BASE_URL}/blog`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: 0.9,
    alternates: [
      { lang: 'fr',        href: `${BASE_URL}/blog` },
      { lang: 'en',        href: `${BASE_URL}/blog` },
      { lang: 'x-default', href: `${BASE_URL}/blog` },
    ]
  },
  {
    loc: `${BASE_URL}/projects`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'monthly',
    priority: 0.8,
    alternates: [
      { lang: 'fr',        href: `${BASE_URL}/projects` },
      { lang: 'en',        href: `${BASE_URL}/projects` },
      { lang: 'x-default', href: `${BASE_URL}/projects` },
    ]
  },
  {
    loc: `${BASE_URL}/contact`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'monthly',
    priority: 0.7,
    alternates: [
      { lang: 'fr',        href: `${BASE_URL}/contact` },
      { lang: 'en',        href: `${BASE_URL}/contact` },
      { lang: 'x-default', href: `${BASE_URL}/contact` },
    ]
  },
];

function getBlogPosts() {
  const blogUrls = [];
  
  // French blog posts
  const frIndexPath = join(__dirname, '../src/locales/fr/blog/_index.json');
  const frIndex = JSON.parse(readFileSync(frIndexPath, 'utf-8'));
  
  // English blog posts
  const enIndexPath = join(__dirname, '../src/locales/en/blog/_index.json');
  const enIndex = JSON.parse(readFileSync(enIndexPath, 'utf-8'));
  
  // Create a map for relatedPostId lookup
  const postMap = new Map();
  frIndex.forEach(post => postMap.set(post.id, { ...post, lang: 'fr' }));
  enIndex.forEach(post => postMap.set(post.id, { ...post, lang: 'en' }));
  
  // French posts
  for (const post of frIndex) {
    const relatedPost = post.relatedPostId ? postMap.get(post.relatedPostId) : null;
    const alternateUrl = relatedPost ? `${BASE_URL}/blog/${relatedPost.slug}` : null;
    
    blogUrls.push({
      loc: `${BASE_URL}/blog/${post.slug}`,
      lastmod: post.updatedAt || post.publishedAt,
      changefreq: 'monthly',
      priority: 0.8,
      alternates: alternateUrl ? [
        { lang: 'en', href: alternateUrl },
        { lang: 'fr', href: `${BASE_URL}/blog/${post.slug}` },
      ] : null,
    });
  }
  
  // English posts
  for (const post of enIndex) {
    const relatedPost = post.relatedPostId ? postMap.get(post.relatedPostId) : null;
    const alternateUrl = relatedPost ? `${BASE_URL}/blog/${relatedPost.slug}` : null;
    
    blogUrls.push({
      loc: `${BASE_URL}/blog/${post.slug}`,
      lastmod: post.updatedAt || post.publishedAt,
      changefreq: 'monthly',
      priority: 0.8,
      alternates: alternateUrl ? [
        { lang: 'fr', href: alternateUrl },
        { lang: 'en', href: `${BASE_URL}/blog/${post.slug}` },
      ] : null,
    });
  }
  
  return blogUrls;
}

function generateSitemap() {
  const allUrls = [...staticPages, ...getBlogPosts()];
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${allUrls.map(url => `  <url>
    <loc>${url.loc}</loc>${url.alternates ? `
${url.alternates.map(alt => `    <xhtml:link rel="alternate" hreflang="${alt.lang}" href="${alt.href}"/>`).join('\n')}${!url.alternates.find(a => a.lang === 'x-default') && url.alternates.find(a => a.lang === 'fr') ? `
    <xhtml:link rel="alternate" hreflang="x-default" href="${url.alternates.find(a => a.lang === 'fr')?.href}"/>` : ''}` : ''}
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  console.log(xml);
}

generateSitemap();