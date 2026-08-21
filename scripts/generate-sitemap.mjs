import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const BASE_URL = 'https://sonnalab.com';
const API_URL  = process.env.API_URL || 'https://api.sonnalab.com';
const LOCALES  = ['fr', 'en', 'es', 'it', 'de'];
const TIMEOUT  = 15_000; // ms

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().split('T')[0];
}

function warn(msg) {
  process.stderr.write(`[sitemap] ${msg}\n`);
}

// ─── Static pages ───────────────────────────────────────────────────────────
// home/blog/contact ont de vraies URLs préfixées par langue depuis le
// 2026-08-17 (voir router/index.tsx LOCALIZED_PREFIXES + prerender-blog.mjs) --
// leurs alternates pointent désormais vers ces vraies URLs sœurs au lieu de
// s'auto-référencer. /projects n'a PAS de préfixe réel (jamais ajouté à
// LOCALIZED_PREFIXES) : reste sur l'ancien comportement auto-référencé, seule
// option honnête pour une page qui n'a qu'une seule URL.
const PREFIXED_LOCALES = ['en', 'es', 'it', 'de'];
const DEFAULT_LOCALE   = 'fr';

function localizedUrl(locale, basePath) {
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  return basePath === '/' ? `${BASE_URL}${prefix || ''}` : `${BASE_URL}${prefix}${basePath}`;
}

function makeLocalizedAlternates(basePath) {
  return [
    ...[DEFAULT_LOCALE, ...PREFIXED_LOCALES].map(lang => ({ lang, href: localizedUrl(lang, basePath) })),
    { lang: 'x-default', href: localizedUrl(DEFAULT_LOCALE, basePath) },
  ];
}

function makeStaticAlternates(path) {
  return [
    ...LOCALES.map(lang => ({ lang, href: `${BASE_URL}${path}` })),
    { lang: 'x-default', href: `${BASE_URL}${path}` },
  ];
}

const staticPages = [
  { loc: `${BASE_URL}/`,         lastmod: today(), changefreq: 'weekly',  priority: 1.0, alternates: makeLocalizedAlternates('/') },
  { loc: `${BASE_URL}/blog`,     lastmod: today(), changefreq: 'weekly',  priority: 0.9, alternates: makeLocalizedAlternates('/blog') },
  { loc: `${BASE_URL}/projects`, lastmod: today(), changefreq: 'monthly', priority: 0.8, alternates: makeStaticAlternates('/projects') },
  { loc: `${BASE_URL}/contact`,  lastmod: today(), changefreq: 'monthly', priority: 0.7, alternates: makeLocalizedAlternates('/contact') },
];

// Entrées sitemap dédiées pour les URLs préfixées elles-mêmes (/en, /es, /it,
// /de × home/blog/contact) : sans ça, ces 12 pages réelles n'apparaissaient
// dans AUCUN sitemap, jamais découvertes par les moteurs.
const prefixedStaticPages = PREFIXED_LOCALES.flatMap(lang => ([
  { loc: localizedUrl(lang, '/'),        lastmod: today(), changefreq: 'weekly',  priority: 0.9, alternates: makeLocalizedAlternates('/') },
  { loc: localizedUrl(lang, '/blog'),    lastmod: today(), changefreq: 'weekly',  priority: 0.8, alternates: makeLocalizedAlternates('/blog') },
  { loc: localizedUrl(lang, '/contact'), lastmod: today(), changefreq: 'monthly', priority: 0.6, alternates: makeLocalizedAlternates('/contact') },
]));

// ─── API fetch (per locale) ───────────────────────────────────────────────────

async function fetchPostsFromAPI(locale) {
  const url = `${API_URL}/api/v1/blog/posts?locale=${locale}&per_page=1000`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const raw = data.posts || data || [];
  return raw.map(p => normalisePost(p, locale));
}

function normalisePost(p, locale) {
  return {
    id:            p.id,
    slug:          p.slug,
    lang:          p.lang || locale,
    relatedPostId: p.relatedPostId || p.related_post_id || null,
    lastmod:       p.updatedAt || p.updated_at || p.publishedAt || p.published_at || today(),
  };
}

// ─── Local fallback (_index.json) ─────────────────────────────────────────────

function loadLocalIndex(locale) {
  const indexPath = join(__dirname, `../src/locales/${locale}/blog/_index.json`);
  if (!existsSync(indexPath)) return [];
  return JSON.parse(readFileSync(indexPath, 'utf-8')).map(p => normalisePost(p, locale));
}

// ─── Translation-family grouping ──────────────────────────────────────────────
// Follows relatedPostId references transitively so FR<->EN<->ES<->IT<->DE
// articles all end up in the same family regardless of chain depth.

function buildFamilies(allPostsById) {
  const processed = new Set();
  const families  = [];

  for (const [id] of allPostsById) {
    if (processed.has(id)) continue;

    const family = new Map(); // lang -> post
    const queue  = [id];

    while (queue.length > 0) {
      const current = queue.pop();
      if (processed.has(current)) continue;

      const post = allPostsById.get(current);
      if (!post) continue;

      processed.add(current);
      family.set(post.lang, post);

      if (post.relatedPostId && !processed.has(post.relatedPostId)) {
        queue.push(post.relatedPostId);
      }
    }

    if (family.size > 0) families.push(family);
  }

  return families;
}

// ─── Build sitemap URL entries for blog posts ──────────────────────────────────

function buildBlogUrls(families) {
  const urls = [];

  for (const family of families) {
    // x-default -> FR version, or first available
    const frPost      = family.get('fr');
    const defaultPost = frPost ?? [...family.values()][0];
    const xDefault    = `${BASE_URL}/blog/${defaultPost.slug}`;

    const familyAlternates = [
      ...[...family.entries()].map(([lang, post]) => ({
        lang,
        href: `${BASE_URL}/blog/${post.slug}`,
      })),
      { lang: 'x-default', href: xDefault },
    ];

    for (const [, post] of family) {
      urls.push({
        loc:        `${BASE_URL}/blog/${post.slug}`,
        lastmod:    post.lastmod,
        changefreq: 'monthly',
        priority:   0.8,
        alternates: familyAlternates,
      });
    }
  }

  return urls;
}

// ─── XML renderer ─────────────────────────────────────────────────────────────

function renderUrl(url) {
  const hreflang = url.alternates
    ? '\n' + url.alternates
        .map(a => `    <xhtml:link rel="alternate" hreflang="${a.lang}" href="${a.href}"/>`)
        .join('\n')
    : '';
  return `  <url>
    <loc>${url.loc}</loc>${hreflang}
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function generateSitemap() {
  const allPostsById = new Map();

  // 2026-08-11 : l'ancienne strategie chargeait TOUJOURS _index.json comme
  // base puis ne retirait que les entrees dont le SLUG matchait un post API
  // -- un article renomme/supprime cote API (le cas normal, l'API est la
  // seule source de verite depuis longtemps) laissait donc son ancienne
  // entree locale trainer indefiniment dans le sitemap (ex: incident
  // "ia-generative-rgpd-conformite-2025", 404 vivant, jamais nettoye).
  // _index.json est un filet de secours pour un build dont l'API serait
  // injoignable -- il ne doit jamais survivre a cote d'un fetch API reussi
  // pour la meme locale : par locale, c'est l'un OU l'autre, jamais un merge.
  let apiSuccesses = 0;
  for (const locale of LOCALES) {
    let posts;
    try {
      posts = await fetchPostsFromAPI(locale);
      apiSuccesses++;
      warn(`API OK ${locale}: ${posts.length} posts`);
    } catch (err) {
      warn(`API FAIL ${locale} (${err.message}) -> local fallback for this locale`);
      const local = loadLocalIndex(locale);
      if (local.length > 0) warn(`Local ${locale}: ${local.length} posts`);
      for (const p of local) allPostsById.set(p.id, p);
      continue;
    }
    for (const p of posts) allPostsById.set(p.id, p);
  }

  if (apiSuccesses === 0) {
    warn('WARNING: All locales used local fallback. Ensure the API is reachable in production builds.');
  }

  const families = buildFamilies(allPostsById);
  const blogUrls = buildBlogUrls(families);
  const allUrls  = [...staticPages, ...prefixedStaticPages, ...blogUrls];

  warn(`Sitemap: ${staticPages.length} static + ${prefixedStaticPages.length} prefixed static + ${blogUrls.length} blog URLs (${families.length} article families)`);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${allUrls.map(renderUrl).join('\n')}
</urlset>`;

  process.stdout.write(xml);
}

generateSitemap().catch(err => {
  warn(`Fatal: ${err.message}`);
  process.exit(1);
});