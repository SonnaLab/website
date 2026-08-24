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
import { marked } from 'marked';

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

// Langues avec une URL préfixée réelle en plus du français non préfixé --
// doit rester en phase avec LOCALIZED_PREFIXES dans src/router/index.tsx.
const PREFIXED_LOCALES = ['en', 'es', 'it', 'de'];
const DEFAULT_LOCALE = 'fr';

function localizedUrl(locale, basePath) {
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  return basePath === '/' ? `${BASE_URL}${prefix || ''}` : `${BASE_URL}${prefix}${basePath}`;
}

function staticHreflangLinks(basePath) {
  const links = [DEFAULT_LOCALE, ...PREFIXED_LOCALES].map(
    (lang) => `<link rel="alternate" hreflang="${lang}" href="${localizedUrl(lang, basePath)}" />`
  );
  links.push(`<link rel="alternate" hreflang="x-default" href="${localizedUrl(DEFAULT_LOCALE, basePath)}" />`);
  return links;
}

// title/description repris tels quels des locales src/locales/{locale}/{home,blog,contact}.json
// -- SEO.tsx ajoute " | SonnaLab" au titre sauf pour la page blog qui l'a déjà.
const STATIC_PAGE_I18N = {
  home: {
    fr: { title: "Accueil - De l'Idée à l'Innovation | SonnaLab", desc: "SonnaLab est votre partenaire de confiance pour l'innovation technologique. Conseil technologique, développement d'applications, IA et solutions numériques sur mesure.", h1: "De l'Idée à l'Innovation" },
    en: { title: 'Home - From Idea to Innovation | SonnaLab', desc: 'SonnaLab is your trusted partner for technological innovation. Tech consulting, app development, AI and custom digital solutions.', h1: 'From Idea to Innovation' },
    es: { title: 'Inicio - De la Idea a la Innovación | SonnaLab', desc: 'SonnaLab es su socio de confianza para la innovación tecnológica.', h1: 'De la Idea a la Innovación' },
    it: { title: "Home - Dall'Idea all'Innovazione | SonnaLab", desc: "SonnaLab è il tuo partner di fiducia per l'innovazione tecnologica.", h1: "Dall'Idea all'Innovazione" },
    de: { title: 'Startseite - Von der Idee zur Innovation | SonnaLab', desc: 'SonnaLab ist Ihr vertrauenswürdiger Partner für technologische Innovation.', h1: 'Von der Idee zur Innovation' },
  },
  blog: {
    fr: { title: 'Blog - Innovation Digitale & IA | SonnaLab', desc: "Découvrez nos articles sur l'intelligence artificielle, le développement web et la transformation digitale. Guides pratiques et études de cas." },
    en: { title: 'Blog - Digital Innovation & AI | SonnaLab', desc: 'Discover our articles on artificial intelligence, web development and digital transformation. Practical guides and case studies.' },
    es: { title: 'Blog - Innovación Digital & IA | SonnaLab', desc: 'Descubra nuestros artículos sobre inteligencia artificial, desarrollo web y transformación digital.' },
    it: { title: 'Blog - Innovazione Digitale & IA | SonnaLab', desc: "Scoprite i nostri articoli sull'intelligenza artificiale, lo sviluppo web e la trasformazione digitale." },
    de: { title: 'Blog - Digitale Innovation & KI | SonnaLab', desc: 'Entdecken Sie unsere Artikel über künstliche Intelligenz, Webentwicklung und digitale Transformation.' },
  },
  contact: {
    fr: { title: 'Contact - Parlons de Votre Projet | SonnaLab', desc: "Contactez SonnaLab pour discuter de votre projet digital. Notre équipe d'experts est prête à vous accompagner dans votre transformation numérique." },
    en: { title: "Contact - Let's Talk About Your Project | SonnaLab", desc: 'Get in touch with SonnaLab to discuss your digital project. Our team of experts is ready to assist you in your digital transformation.' },
    es: { title: 'Contacto - Hablemos de su Proyecto | SonnaLab', desc: 'Póngase en contacto con SonnaLab para hablar de su proyecto digital.' },
    it: { title: 'Contatti - Parliamo del Vostro Progetto | SonnaLab', desc: 'Contattateci per discutere il vostro progetto digitale.' },
    de: { title: 'Kontakt - Sprechen wir über Ihr Projekt | SonnaLab', desc: 'Kontaktieren Sie SonnaLab, um Ihr digitales Projekt zu besprechen.' },
  },
};

/**
 * Coquille statique minimale : meta + hreflang réels, plus un H1 visible
 * injecté dans #root pour home (crawler sans JS) -- sans SSR complet des
 * sections (pas d'infra SSR React en place).
 */
function buildStaticPageHtml(template, { locale, basePath, page, heroHtml }) {
  const url = localizedUrl(locale, basePath);
  const { title, desc } = STATIC_PAGE_I18N[page][locale];

  let html = template;
  html = html.replace(/<html lang="[^"]*"/, `<html lang="${locale}"`);
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${escapeHtml(desc)}" />`);
  html = html.replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${escapeHtml(title)}" />`);
  html = html.replace(/<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${escapeHtml(desc)}" />`);
  html = html.replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${url}" />`);
  html = html.replace(/<meta property="og:locale" content="[^"]*"\s*\/>/, `<meta property="og:locale" content="${OG_LOCALE[locale] || 'fr_FR'}" />`);
  html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${url}" />`);
  html = html.replace('</head>', `    ${staticHreflangLinks(basePath).join('\n    ')}\n  </head>`);

  if (heroHtml) {
    html = html.replace('<div id="root"></div>', `<div id="root">${heroHtml}</div>`);
  }

  return html;
}

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

  if (article.noindex) {
    html = html.replace(/<meta name="robots" content="[^"]*"\s*\/>/,
      `<meta name="robots" content="noindex,follow" />`);
    if (!/name="robots"/.test(html)) {
      html = html.replace('</head>', `    <meta name="robots" content="noindex,follow" />\n  </head>`);
    }
  }

  html = html.replace('</head>', `    ${articleExtras}\n  </head>`);

  // 2026-08-12 : jusque-la <body> restait un <div id="root"></div> vide --
  // aucun <h1> ni texte reel avant hydratation React, cause du "H1 tag
  // missing" releve par Bing Webmaster Tools sur la quasi-totalite des
  // articles. Injecte le corps reel (meme lib `marked` que lescopr.com,
  // meme approche) dans le shell SPA ; React remplace ce contenu au
  // montage (BlogPost.tsx rend son propre <h1> + MarkdownRenderer), donc
  // aucun risque de doublon visible -- seul le PREMIER rendu (crawler,
  // JS desactive, ou fenetre avant hydratation) voit ce HTML statique.
  if (article.content_markdown) {
    // 2026-08-13 : la premiere version detectait "le corps fournit deja son
    // propre H1" en regardant si bodyHtml commencait par un <h1> -- mais
    // certains articles utilisent "# Introduction"/"# Conclusion" (niveau 1)
    // comme sous-titres internes, jamais le vrai titre. Resultat : la
    // heuristique se trompait, sautait l'injection du VRAI titre, et la
    // page se retrouvait avec "Introduction"/"Conclusion" comme seuls H1 --
    // pire que le bug d'origine. Corrige en s'alignant sur MarkdownRenderer.tsx
    // cote client (meme fix) : le titre de l'article a TOUJOURS son propre
    // <h1> ici, sans condition, et tout <h1> produit par le corps est
    // TOUJOURS retrograde en <h2> -- aucune heuristique a tromper.
    const bodyHtml = marked.parse(article.content_markdown)
      .replace(/<h1(\s[^>]*)?>/g, '<h2>')
      .replace(/<\/h1>/g, '</h2>');
    // article.title (pas la variable `title` = seo_title || title, utilisee
    // pour <title>/OG) -- doit correspondre exactement au <h1> que
    // BlogPost.tsx rend cote client (`{post.title}`), jamais le titre SEO.
    const articleShell = `<main id="article-prerender"><article><h1>${escapeHtml(article.title)}</h1>${bodyHtml}</article></main>`;
    html = html.replace('<div id="root"></div>', `<div id="root">${articleShell}</div>`);

    // Donnees pour BlogPost.tsx (readPrerenderedPost) -- meme forme que
    // BlogPost renvoye par GET /api/v1/blog/posts/{slug}, mais avec ce que
    // le feed SEO fournit reellement (pas d'id/category/credit photo reels
    // ici -- BlogPost.tsx les recoit via son fetch normal qui tourne quand
    // meme en arriere-plan et complete l'etat sans jamais revider l'ecran).
    // Objectif unique : que le tout premier rendu client ait deja le vrai
    // contenu, jamais un spinner "Loading..." qui efface l'article deja
    // peint par le prerender.
    const wordCount = article.content_markdown.trim().split(/\s+/).length;
    const prerenderedPost = {
      id: article.slug,
      slug: article.slug,
      lang: article.locale,
      title: article.title,
      excerpt: article.excerpt || '',
      content: article.content_markdown,
      author: article.author || 'SonnaLab',
      publishedAt: article.published_at,
      updatedAt: article.updated_at,
      coverImage: article.feature_image || '',
      coverImageCredit: null,
      category: '',
      tags: Array.isArray(article.tags) ? article.tags : [],
      readTime: Math.max(1, Math.round(wordCount / 200)),
      seo: {
        title: article.seo_title || article.title,
        description: desc,
        keywords: tags.join(', '),
      },
    };
    html = html.replace(
      '</head>',
      `    <script id="prerendered-post-data" type="application/json">${jsonSafe(prerenderedPost)}</script>\n  </head>`
    );
  }

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
  // Ce script REECRIT index.html en place (H1 de la home injecte dans
  // #root, voir plus bas). Le webhook /sitemap/refresh (scripts/
  // sitemap-webhook.mjs -> regen-sitemap.sh) relance CE script seul, sans
  // repasser par `vite build` avant -- une execution relit alors le
  // index.html DEJA modifie par la fois precedente comme s'il etait le
  // template vierge, et propage le H1 injecte jusque dans app-shell.html
  // (qui doit pourtant rester generique). Normaliser #root vers son etat
  // vierge des la lecture rend le script idempotent, execute seul ou apres
  // un vrai build (2026-08-24, regression observee en prod ~2h apres le
  // premier fix : le webhook a tourne entre-temps et a re-corrompu
  // app-shell.html).
  const rawTemplate = await readFile(templatePath, 'utf-8');
  let template = rawTemplate.replace(
    /<div id="root">[\s\S]*?<\/div>/,
    '<div id="root"></div>'
  );

  // Inline le CSS de build (~200 Ko) directement dans <head> au lieu du
  // <link rel="stylesheet"> externe -- ces pages statiques (surtout les
  // articles, dont #root contient deja tout le corps du texte pour le SEO,
  // voir buildArticleHead) affichaient un vrai FOUC : le HTML pre-rendu
  // peint immediatement mais sans aucune regle CSS le temps que le fichier
  // externe soit requete + telecharge, donc un "mur" de texte brut visible
  // avant que le style n'arrive (mesure ~100ms en local, bien plus sur une
  // connexion lente -- signale par l'utilisateur comme "tout le blog qui se
  // charge sans css" au refresh d'un article, 2026-08-24). Inliner supprime
  // l'aller-retour reseau : le style est deja present au tout premier paint.
  const cssLinkMatch = template.match(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*\/?>/);
  if (cssLinkMatch) {
    const cssPath = join(BUILD_DIR, cssLinkMatch[1].replace(/^\//, ''));
    if (existsSync(cssPath)) {
      const cssContent = await readFile(cssPath, 'utf-8');
      template = template.replace(cssLinkMatch[0], `<style>${cssContent}</style>`);
      warn(`Inlined CSS (${(cssContent.length / 1024).toFixed(0)} KB) from ${cssLinkMatch[1]}`);
    } else {
      warn(`CSS file not found for inlining: ${cssPath} — keeping external <link>`);
    }
  }

  let written = 0;
  let redirects = 0;
  let legacyRedirects = 0;
  let failures = 0;
  const redirectMap = [];
  const realSlugs = new Set();
  const legacyEntries = []; // computed after the main loop, once realSlugs is complete

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
      realSlugs.add(article.slug);
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

      // Legacy-slug redirect (2026-07-28 fix): before the ArticleStructuredData
      // slug bug was fixed, Search Console indexed a "slug" derived straight
      // from the raw title (title.toLowerCase().replace(/\s+/g, '-') --
      // accents/colons/uppercase all intact, e.g. "microservices-et-cloud-:-
      // accélérez..."). Those crawled URLs still 404 with no page ever having
      // linked to the real slug. Recompute the exact same buggy transform here
      // and redirect it to the real article -- stops the still-indexed URLs
      // from bouncing, without resurrecting the malformed path as a real page.
      if (article.title) {
        const legacySlug = article.title.toLowerCase().replace(/\s+/g, '-');
        if (legacySlug && legacySlug !== article.slug) {
          legacyEntries.push([legacySlug, article.slug]);
        }
      }
    }
  }

  const seenLegacy = new Set();
  for (const [legacySlug, realSlug] of legacyEntries) {
    // Skip if it collides with any real article slug (already resolvable) or
    // was already emitted (two articles whose titles produce the same buggy
    // slug -- first one wins, arbitrary but deterministic).
    if (realSlugs.has(legacySlug) || seenLegacy.has(legacySlug)) continue;
    seenLegacy.add(legacySlug);
    redirectMap.push(`/blog/${legacySlug} /blog/${realSlug};`);
    legacyRedirects++;
  }

  // Coquille générique SANS contenu pré-rendu (#root vide, comme le
  // template Vite brut) — utilisée par nginx (@shell) comme fallback pour
  // toute route SPA sans page dédiée (legal/*, sign-in, dashboard, projects,
  // staff, admin...). Doit être écrite AVANT que index.html ne soit
  // réécrit ci-dessous avec le H1 de la home injecté dans #root : sans ce
  // fichier séparé, nginx retombait sur ce même index.html "home" comme
  // coquille partagée, donc *toute* route flashait le H1 "De l'Idée à
  // l'Innovation" pendant l'hydratation React (2026-08-24, signalé par
  // l'utilisateur après le fix nginx @shell du 2026-08-24 plus tôt le
  // même jour, qui a rendu ce partage de fichier visible).
  await writeFile(join(BUILD_DIR, 'app-shell.html'), template, 'utf-8');
  warn('Wrote app-shell.html (generic, no prerendered content)');

  // Génère les coquilles statiques home/blog/contact : fr non préfixé
  // (réécrit sur place) + variantes réelles /en, /es, /it, /de (voir
  // LOCALIZED_PREFIXES dans src/router/index.tsx).
  await writeFile(
    join(BUILD_DIR, 'index.html'),
    buildStaticPageHtml(template, {
      locale: DEFAULT_LOCALE,
      basePath: '/',
      page: 'home',
      heroHtml: `<main id="home-prerender"><h1>${escapeHtml(STATIC_PAGE_I18N.home.fr.h1)}</h1></main>`,
    }),
    'utf-8'
  );
  warn('Wrote index.html (home, fr)');

  const blogDir = join(BUILD_DIR, 'blog');
  await mkdir(blogDir, { recursive: true });
  await writeFile(join(blogDir, 'index.html'), buildStaticPageHtml(template, { locale: DEFAULT_LOCALE, basePath: '/blog', page: 'blog' }), 'utf-8');
  warn('Wrote blog/index.html (fr)');

  const contactDir = join(BUILD_DIR, 'contact');
  await mkdir(contactDir, { recursive: true });
  await writeFile(join(contactDir, 'index.html'), buildStaticPageHtml(template, { locale: DEFAULT_LOCALE, basePath: '/contact', page: 'contact' }), 'utf-8');
  warn('Wrote contact/index.html (fr)');

  for (const locale of PREFIXED_LOCALES) {
    const localeDir = join(BUILD_DIR, locale);
    await mkdir(localeDir, { recursive: true });
    await writeFile(
      join(localeDir, 'index.html'),
      buildStaticPageHtml(template, {
        locale,
        basePath: '/',
        page: 'home',
        heroHtml: `<main id="home-prerender"><h1>${escapeHtml(STATIC_PAGE_I18N.home[locale].h1)}</h1></main>`,
      }),
      'utf-8'
    );

    const localeBlogDir = join(localeDir, 'blog');
    await mkdir(localeBlogDir, { recursive: true });
    await writeFile(join(localeBlogDir, 'index.html'), buildStaticPageHtml(template, { locale, basePath: '/blog', page: 'blog' }), 'utf-8');

    const localeContactDir = join(localeDir, 'contact');
    await mkdir(localeContactDir, { recursive: true });
    await writeFile(join(localeContactDir, 'index.html'), buildStaticPageHtml(template, { locale, basePath: '/contact', page: 'contact' }), 'utf-8');

    warn(`Wrote /${locale}/, /${locale}/blog/, /${locale}/contact/`);
  }

  const mapPath = join(BUILD_DIR, 'blog-redirects.map');
  await writeFile(
    mapPath,
    redirectMap.length
      ? redirectMap.join('\n') + '\n'
      : '# (no redirects)\n',
    'utf-8'
  );

  warn(`Done: ${written} article pages, ${redirects} redirect stubs, ${legacyRedirects} legacy-slug redirects, ${failures} locale failures.`);
  warn(`Wrote ${mapPath} (${redirectMap.length} entries)`);
  if (failures === LOCALES.length) process.exit(1);
}

run().catch(err => {
  warn(`Fatal: ${err.message}`);
  process.exit(1);
});
