#!/usr/bin/env node
/**
 * Static prerender for blog articles.
 *
 * For each published article exposed by /api/v1/seo/articles, write a static
 * HTML file at build/blog/{slug}/index.html that contains the correct title,
 * meta description, canonical URL, hreflang alternates, Open Graph, Twitter
 * and Article JSON-LD tags. The React bundle still hydrates the page client-
 * side, but Googlebot now sees per-URL SEO signals on first request — fixing
 * the "Detected, not indexed" issue caused by a single canonical = home in
 * the bundled index.html.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const BASE_URL = 'https://sonnalab.com';
const API_URL  = process.env.API_URL || 'https://api.sonnalab.com';
const BUILD_DIR = process.env.BUILD_DIR
  ? (process.env.BUILD_DIR.startsWith('/') ? process.env.BUILD_DIR : join(__dirname, '..', process.env.BUILD_DIR))
  : join(__dirname, '..', 'build');
const LOCALES = ['fr', 'en', 'es', 'it', 'de'];
const OG_LOCALE = { fr: 'fr_FR', en: 'en_US', es: 'es_ES', it: 'it_IT', de: 'de_DE' };
const TIMEOUT = 15_000;

function warn(msg) { process.stderr.write(`[prerender] ${msg}\n`); }

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function jsonSafe(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

function buildHreflangLinks(article) {
  const selfUrl = `${BASE_URL}/blog/${article.slug}`;
  const alternates = Array.isArray(article.hreflang_alternates) ? article.hreflang_alternates : [];
  const map = new Map();
  // Always include self
  map.set(article.locale, selfUrl);
  for (const alt of alternates) {
    if (alt && alt.locale && alt.slug) {
      map.set(alt.locale, `${BASE_URL}/blog/${alt.slug}`);
    }
  }
  const links = [...map.entries()].map(([loc, href]) =>
    `<link rel="alternate" hreflang="${loc}" href="${href}" />`
  );
  // x-default = FR if present, else self
  const xDefault = map.get('fr') || selfUrl;
  links.push(`<link rel="alternate" hreflang="x-default" href="${xDefault}" />`);
  return links;
}

async function fetchArticles(locale) {
  const url = `${API_URL}/api/v1/seo/articles?locale=${locale}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  const data = await res.json();
  return Array.isArray(data?.articles) ? data.articles : [];
}

function buildArticleHead(article, template) {
  const url = `${BASE_URL}/blog/${article.slug}`;
  const title = article.seo_title || article.title;
  const desc = (article.meta_description || article.excerpt || '').slice(0, 300);
  const image = article.feature_image || `${BASE_URL}/assets/images/og-image.jpg`;
  const imageAlt = article.feature_image_alt || title;
  const ogLocale = OG_LOCALE[article.locale] || 'fr_FR';
  const tags = Array.isArray(article.tags) ? article.tags : [];

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: desc,
    image: [image],
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: { '@type': 'Organization', name: article.author || 'SonnaLab', url: BASE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'SonnaLab',
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/assets/logo/sonnalab-logo.png` }
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    inLanguage: article.locale,
    keywords: tags.join(', ')
  };

  let html = template;

  html = html.replace(/<html lang="[^"]*"/, `<html lang="${article.locale}"`);

  html = html.replace(/<title>[\s\S]*?<\/title>/,
    `<title>${escapeHtml(title)}</title>`);

  html = html.replace(/<meta name="description" content="[^"]*"\s*\/>/,
    `<meta name="description" content="${escapeHtml(desc)}" />`);

  if (tags.length) {
    html = html.replace(/<meta name="keywords" content="[^"]*"\s*\/>/,
      `<meta name="keywords" content="${escapeHtml(tags.join(', '))}" />`);
  }

  html = html.replace(/<meta property="og:type" content="[^"]*"\s*\/>/,
    `<meta property="og:type" content="article" />`);
  html = html.replace(/<meta property="og:url" content="[^"]*"\s*\/>/,
    `<meta property="og:url" content="${url}" />`);
  html = html.replace(/<meta property="og:title" content="[^"]*"\s*\/>/,
    `<meta property="og:title" content="${escapeHtml(title)}" />`);
  html = html.replace(/<meta property="og:description" content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${escapeHtml(desc)}" />`);
  html = html.replace(/<meta property="og:image" content="[^"]*"\s*\/>/,
    `<meta property="og:image" content="${escapeHtml(image)}" />`);
  html = html.replace(/<meta property="og:locale" content="[^"]*"\s*\/>/,
    `<meta property="og:locale" content="${ogLocale}" />`);

  html = html.replace(/<meta property="twitter:url" content="[^"]*"\s*\/>/,
    `<meta property="twitter:url" content="${url}" />`);
  html = html.replace(/<meta property="twitter:title" content="[^"]*"\s*\/>/,
    `<meta property="twitter:title" content="${escapeHtml(title)}" />`);
  html = html.replace(/<meta property="twitter:description" content="[^"]*"\s*\/>/,
    `<meta property="twitter:description" content="${escapeHtml(desc)}" />`);
  html = html.replace(/<meta property="twitter:image" content="[^"]*"\s*\/>/,
    `<meta property="twitter:image" content="${escapeHtml(image)}" />`);

  html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${url}" />`);

  const articleExtras = [
    `<meta property="article:published_time" content="${article.published_at}" />`,
    `<meta property="article:modified_time" content="${article.updated_at}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />`,
    ...buildHreflangLinks(article),
    `<script type="application/ld+json">${jsonSafe(articleLd)}</script>`
  ].join('\n    ');

  html = html.replace('</head>', `    ${articleExtras}\n  </head>`);

  return html;
}

function buildRedirectHtml(fromSlug, toSlug, locale) {
  const target = `${BASE_URL}/blog/${toSlug}`;
  return `<!DOCTYPE html>
<html lang="${locale}">
  <head>
    <meta charset="UTF-8" />
    <title>Redirection</title>
    <meta name="robots" content="noindex,follow" />
    <link rel="canonical" href="${target}" />
    <meta http-equiv="refresh" content="0; url=${target}" />
    <script>window.location.replace(${JSON.stringify(target)});</script>
  </head>
  <body>
    <p>Cette page a été déplacée : <a href="${target}">${target}</a></p>
  </body>
</html>`;
}

async function run() {
  if (!existsSync(BUILD_DIR)) {
    warn(`Build dir not found: ${BUILD_DIR} — skip.`);
    process.exit(0);
  }
  const templatePath = join(BUILD_DIR, 'index.html');
  if (!existsSync(templatePath)) {
    warn(`Template missing: ${templatePath} — skip.`);
    process.exit(0);
  }
  const template = await readFile(templatePath, 'utf-8');

  let written = 0;
  let redirects = 0;
  let failures = 0;
  const redirectMap = [];

  for (const locale of LOCALES) {
    let articles;
    try {
      articles = await fetchArticles(locale);
      warn(`API OK ${locale}: ${articles.length} articles`);
    } catch (err) {
      warn(`API FAIL ${locale}: ${err.message}`);
      failures++;
      continue;
    }

    for (const article of articles) {
      if (!article.slug) continue;
      const targetDir = join(BUILD_DIR, 'blog', article.slug);
      await mkdir(targetDir, { recursive: true });

      const html = article.redirected_to_slug
        ? buildRedirectHtml(article.slug, article.redirected_to_slug, article.locale)
        : buildArticleHead(article, template);

      await writeFile(join(targetDir, 'index.html'), html, 'utf-8');
      if (article.redirected_to_slug) {
        redirects++;
        redirectMap.push(`/blog/${article.slug} /blog/${article.redirected_to_slug};`);
      } else {
        written++;
      }
    }
  }

  const mapPath = join(BUILD_DIR, 'blog-redirects.map');
  await writeFile(
    mapPath,
    redirectMap.length
      ? redirectMap.join('\n') + '\n'
      : '# (no redirects)\n',
    'utf-8'
  );

  warn(`Done: ${written} article pages, ${redirects} redirect stubs, ${failures} locale failures.`);
  warn(`Wrote ${mapPath} (${redirectMap.length} entries)`);
  if (failures === LOCALES.length) process.exit(1);
}

run().catch(err => {
  warn(`Fatal: ${err.message}`);
  process.exit(1);
});
