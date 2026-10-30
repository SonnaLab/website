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

import { readFile, writeFile, mkdir, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// entry-server.tsx (rendu React reel, voir src/entry-server.tsx) est compile
// a part par `npm run build:ssr` (vite build --ssr) avant que ce script ne
// tourne -- jamais bundle avec le reste, jamais expedie en prod. Charge une
// seule fois, reutilise pour toutes les routes de la boucle ci-dessous.
const SSR_ENTRY = join(__dirname, '..', 'build-ssr', 'entry-server.js');
let ssrRenderFn = null;
async function ssrRender(url, locale, ssrData) {
  if (!ssrRenderFn) {
    if (!existsSync(SSR_ENTRY)) {
      throw new Error(`SSR entry introuvable : ${SSR_ENTRY} -- lancer "npm run build:ssr" avant le prerender.`);
    }
    ({ render: ssrRenderFn } = await import(pathToFileURL(SSR_ENTRY).href));
  }
  return ssrRenderFn(url, locale, ssrData);
}

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

// @id stables des noeuds Organization / WebSite declares une seule fois dans
// le template (index.html) -- les articles les referencent au lieu de les
// redeclarer, pour que moteurs et IA relient chaque article a l'editeur.
const ORG_ID = `${BASE_URL}/#organization`;
const WEBSITE_ID = `${BASE_URL}/#website`;
const ROBOTS_INDEX = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
const HOME_LABEL = { fr: 'Accueil', en: 'Home', es: 'Inicio', it: 'Home', de: 'Startseite' };
const FEED_TITLE = {
  fr: 'SonnaLab — Blog (Français)', en: 'SonnaLab — Blog (English)', es: 'SonnaLab — Blog (Español)',
  it: 'SonnaLab — Blog (Italiano)', de: 'SonnaLab — Blog (Deutsch)',
};

// Couvertures servies par le CDN Unsplash (imgix) en 1080x720 : en dessous des
// 1200 px de large que Google demande pour l'apercu large (Discover, mobile)
// et pas au ratio 1,91:1 attendu pour og:image. imgix recadre a la volee via
// w/h/fit=crop -- aucune image a stocker. Toute autre URL est rendue telle quelle.
function imageVariant(url, width, height) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'images.unsplash.com') return url;
    parsed.searchParams.set('w', String(width));
    parsed.searchParams.set('h', String(height));
    parsed.searchParams.set('fit', 'crop');
    parsed.searchParams.set('crop', 'entropy');
    return parsed.toString();
  } catch {
    return url;
  }
}

function isResizable(url) {
  return imageVariant(url, 1, 1) !== url;
}

function feedUrl(locale) {
  return `${BASE_URL}/feed/${locale}.xml`;
}

const BLOG_INDEX_PER_PAGE = 6; // = POSTS_PER_PAGE dans src/pages/public/Blog.tsx
const RELATED_COUNT = 3;
const RELATED_POOL = 12; // candidats proches parmi lesquels le 3e lien va au moins lie
const FEED_ITEMS = 50;
const LLMS_ARTICLES_PER_LOCALE = 30;
const LEGACY_SLUG_BUG_FIXED_AT = '2026-07-28'; // voir les redirections legacy dans run()

// Liste publique d'une langue, au format exact que consomme le front
// (/api/v1/blog/posts : articles live uniquement, sans les stubs de
// redirection). `firstPage` est la reponse brute de la page 1 telle que
// Blog.tsx la demande, pour que son premier rendu client soit identique au
// rendu serveur ; `posts` est la liste complete, du plus recent au plus ancien.
async function fetchListing(locale) {
  const get = async (page, perPage) => {
    const url = `${API_URL}/api/v1/blog/posts?locale=${locale}&page=${page}&per_page=${perPage}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
    if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
    return res.json();
  };
  const firstPage = await get(1, BLOG_INDEX_PER_PAGE);
  const posts = [];
  for (let page = 1, totalPages = 1; page <= totalPages; page++) {
    const data = await get(page, 60); // plafond serveur, voir generate-sitemap.mjs
    posts.push(...(data.posts ?? []));
    totalPages = data.total_pages ?? 1;
  }
  posts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  return { firstPage, posts };
}

function tokens(text) {
  return new Set(
    String(text ?? '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .split(/[^a-z0-9]+/)
      .filter(word => word.length >= 5) // ecarte les mots vides des 5 langues sans liste dediee
  );
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const value of a) if (b.has(value)) shared++;
  return shared / (a.size + b.size - shared);
}

// Maillage interne : 3 articles proches par article (tags puis titre), rendus
// dans le HTML prerendu. Jusque-la les "articles lies" n'existaient qu'apres
// un fetch client, donc zero lien interne entre articles dans le HTML que
// lisent Bing et les crawlers IA. Les 2 premiers sont les plus proches ; le
// 3e est, parmi les plus proches suivants, celui qui a recu le moins de liens
// jusqu'ici -- sans lui, une centaine d'articles ne recevaient aucun lien
// pendant que quelques-uns en cumulaient 15.
function computeRelated(posts) {
  const features = posts.map(post => ({
    post,
    tags: new Set((post.tags ?? []).map(tag => String(tag).toLowerCase())),
    words: tokens(post.title),
  }));
  const inbound = new Map(posts.map(post => [post.slug, 0]));
  const related = new Map();

  for (const current of features) {
    const candidates = features
      .filter(other => other.post.slug !== current.post.slug)
      .map(other => ({
        post: other.post,
        score: 2 * jaccard(current.tags, other.tags) + jaccard(current.words, other.words),
      }))
      .sort((a, b) =>
        (b.score - a.score) ||
        (inbound.get(a.post.slug) - inbound.get(b.post.slug)) ||
        (new Date(b.post.publishedAt) - new Date(a.post.publishedAt))
      );
    const closest = candidates.slice(0, RELATED_COUNT - 1);
    const leastLinked = candidates
      .slice(RELATED_COUNT - 1, RELATED_COUNT - 1 + RELATED_POOL)
      .reduce((best, candidate) => (
        !best || inbound.get(candidate.post.slug) < inbound.get(best.post.slug) ? candidate : best
      ), null);
    const ranked = [...closest, ...(leastLinked ? [leastLinked] : [])].map(({ post }) => post);

    for (const post of ranked) inbound.set(post.slug, inbound.get(post.slug) + 1);
    related.set(current.post.slug, ranked.map(post => ({
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt || '',
      coverImage: post.coverImage || '',
      readTime: post.readTime,
      category: post.category || '',
    })));
  }
  return related;
}

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildFeed(locale, posts) {
  const items = posts.slice(0, FEED_ITEMS).map(post => {
    const link = `${BASE_URL}/blog/${post.slug}`;
    return [
      '    <item>',
      `      <title>${xmlEscape(post.title)}</title>`,
      `      <link>${link}</link>`,
      `      <guid isPermaLink="true">${link}</guid>`,
      `      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>`,
      `      <description>${xmlEscape(post.excerpt)}</description>`,
      ...(post.category ? [`      <category>${xmlEscape(post.category)}</category>`] : []),
      `      <dc:creator>${xmlEscape(post.author || 'SonnaLab')}</dc:creator>`,
      '    </item>',
    ].join('\n');
  });
  const { title, desc } = STATIC_PAGE_I18N.blog[locale];
  const lastBuild = posts[0] ? new Date(posts[0].publishedAt).toUTCString() : new Date().toUTCString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${xmlEscape(FEED_TITLE[locale] || title)}</title>
    <link>${localizedUrl(locale, '/blog')}</link>
    <description>${xmlEscape(desc)}</description>
    <language>${locale}</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${feedUrl(locale)}" rel="self" type="application/rss+xml" />
${items.join('\n')}
  </channel>
</rss>
`;
}

// llms.txt (https://llmstxt.org) : resume Markdown du site pour les agents IA
// (ChatGPT, Claude, Perplexity...) qui cherchent une vue d'ensemble sans
// executer le JS -- qui est SonnaLab, pages cles, derniers articles par langue.
function buildLlmsTxt(listings) {
  const lines = [
    '# SonnaLab',
    '',
    '> SonnaLab, le laboratoire d\'idées qui transforme le digital : conseil technologique, développement d\'applications web et mobiles, IA et solutions numériques sur mesure pour les PME et startups.',
    '',
    'Le blog publie des guides pratiques et études de cas sur l\'intelligence artificielle, le développement web et la transformation digitale, en français, anglais, espagnol, italien et allemand.',
    '',
    '## Pages clés',
    '',
    `- [Accueil](${BASE_URL}/): présentation de SonnaLab et de ses services`,
    `- [Projets](${BASE_URL}/projects): réalisations et études de cas`,
    `- [Blog](${BASE_URL}/blog): tous les articles en français`,
    `- [Contact](${BASE_URL}/contact): demander un devis ou un échange`,
    `- [Sitemap](${BASE_URL}/sitemap.xml): index complet des URLs`,
    '',
  ];
  for (const locale of LOCALES) {
    const posts = listings.get(locale)?.posts ?? [];
    if (!posts.length) continue;
    lines.push(`## Blog (${locale}) — derniers articles`, '');
    lines.push(`Flux RSS complet : ${feedUrl(locale)}`, '');
    for (const post of posts.slice(0, LLMS_ARTICLES_PER_LOCALE)) {
      const summary = String(post.excerpt ?? '').replace(/\s+/g, ' ').trim();
      lines.push(`- [${post.title.replace(/[[\]]/g, '')}](${BASE_URL}/blog/${post.slug})${summary ? `: ${summary}` : ''}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

// Balises communes a toute page indexable generee ici : langue reelle (le
// template portait "French" en dur, meme sur /en, /de...), robots avec
// apercu d'image large (Discover, reponses IA) et lien vers le flux RSS de
// la langue (decouverte rapide des nouveaux articles par Bing et les IA).
function commonHeadTags(locale) {
  return [
    `<meta http-equiv="content-language" content="${locale}" />`,
    `<meta name="robots" content="${ROBOTS_INDEX}" />`,
    `<link rel="alternate" type="application/rss+xml" title="${escapeHtml(FEED_TITLE[locale] || FEED_TITLE.fr)}" href="${feedUrl(locale)}" />`,
  ];
}

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
    fr: { title: "Accueil - De l'Idée à l'Innovation | SonnaLab", desc: "SonnaLab est votre partenaire de confiance pour l'innovation technologique. Conseil technologique, développement d'applications, IA et solutions numériques sur mesure.", h1: "Le laboratoire d'idées qui transforme le digital" },
    en: { title: 'Home - From Idea to Innovation | SonnaLab', desc: 'SonnaLab is your trusted partner for technological innovation. Tech consulting, app development, AI and tailored digital solutions for SMEs and startups.', h1: 'The think tank that transforms digital technology' },
    es: { title: 'Inicio - De la Idea a la Innovación | SonnaLab', desc: 'SonnaLab es su socio de confianza para la innovación tecnológica. Consultoría tech, desarrollo de aplicaciones, IA y soluciones digitales a su medida.', h1: 'El laboratorio de ideas que transforma lo digital' },
    it: { title: "Home - Dall'Idea all'Innovazione | SonnaLab", desc: "SonnaLab è il tuo partner di fiducia per l'innovazione tecnologica. Consulenza tech, sviluppo di app, intelligenza artificiale e soluzioni digitali su misura.", h1: "Il laboratorio di idee che trasforma il digitale" },
    de: { title: 'Startseite - Von der Idee zur Innovation | SonnaLab', desc: 'SonnaLab ist Ihr vertrauenswürdiger Partner für technologische Innovation. Tech-Beratung, App-Entwicklung, KI sowie maßgeschneiderte digitale Lösungen.', h1: 'Das Ideenlabor, das das Digitale transformiert' },
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
  // Ajouté 2026-09-08 : /projects n'avait jamais été ajouté ici ni au nginx
  // whitelist regex ni au bloc de génération des coquilles locale (voir
  // writeStaticShells plus bas) -- /{locale}/projects renvoyait donc un
  // vrai 404 pour les 4 locales préfixées (jamais bare /projects, lui géré
  // par ailleurs), repéré via Search Console (audit sonnalab.com, 2026-09-08).
  // Titres/descriptions repris tels quels de src/locales/{locale}/projects.json#seo.
  projects: {
    fr: { title: 'Projets - Innovation & Technologie | SonnaLab', desc: 'Chaque application utilise des technologies de pointe pour garantir fiabilité et évolutivité' },
    en: { title: 'Projects - Innovation & Technology | SonnaLab', desc: 'Each application uses top-performing technologies to ensure reliability and scalability' },
    es: { title: 'Proyectos - Innovación y Tecnología | SonnaLab', desc: 'Cada aplicación utiliza tecnologías de alto rendimiento para garantizar fiabilidad y escalabilidad' },
    it: { title: 'Progetti - Innovazione e Tecnologia | SonnaLab', desc: 'Ogni applicazione utilizza tecnologie ad alte prestazioni per garantire affidabilità e scalabilità' },
    de: { title: 'Projekte - Innovation & Technologie | SonnaLab', desc: 'Jede Anwendung verwendet leistungsstarke Technologien für Zuverlässigkeit und Skalierbarkeit' },
  },
};

/**
 * Coquille statique minimale : meta + hreflang réels, plus un H1 visible
 * injecté dans #root pour home (crawler sans JS) -- sans SSR complet des
 * sections (pas d'infra SSR React en place).
 */
async function buildStaticPageHtml(template, { locale, basePath, page, ssrRoute, ssrData }) {
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
  html = html.replace(/<meta name="twitter:url" content="[^"]*"\s*\/>/, `<meta name="twitter:url" content="${url}" />`);
  html = html.replace(/<meta name="twitter:title" content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${escapeHtml(title)}" />`);
  html = html.replace(/<meta name="twitter:description" content="[^"]*"\s*\/>/, `<meta name="twitter:description" content="${escapeHtml(desc)}" />`);
  html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${url}" />`);
  html = html.replace('</head>', `    ${[...commonHeadTags(locale), ...staticHreflangLinks(basePath)].join('\n    ')}\n  </head>`);

  // Home et blog (liste + archive, 2026-10-30) passent au vrai rendu SSR
  // (entry-server.tsx) -- contact/projects restent sans contenu injecte
  // dans #root (pas encore migres, voir le plan de migration SSR).
  if (ssrRoute) {
    const { html: rootHtml, ssrDataScript } = await ssrRender(ssrRoute, locale, ssrData);
    html = html.replace('<div id="root"></div>', `<div id="root" data-ssr="1">${rootHtml}</div>`);
    if (ssrDataScript) html = html.replace('</head>', `    ${ssrDataScript}\n  </head>`);
  }

  return html;
}

function warn(msg) { process.stderr.write(`[prerender] ${msg}\n`); }

/**
 * Vide #root en repérant sa VRAIE balise fermante par comptage de
 * profondeur, plutôt qu'une regex non-greedy qui s'arrête au premier
 * </div> rencontré. Le contenu injecté dans #root (hero home, article)
 * contient des <div> imbriqués avant sa propre fermeture -- une regex
 * `<div id="root">[\s\S]*?<\/div>` s'arrête donc trop tôt et laisse les
 * vraies fermetures (</section></main></div>) orpheline juste après.
 * Comme ce script relit son propre index.html à chaque rerun du webhook
 * /sitemap/refresh (sans repasser par vite build), cette troncature
 * s'empilait à l'identique à chaque passage -- des dizaines de balises
 * orphelines accumulées en prod (2026-09-01, signalé par l'utilisateur
 * comme une "balise qui fuit" sur /contact, /blog, /projects, /legal/*).
 */
function stripRootContent(html) {
  // Le match tolere un attribut supplementaire (ex. data-ssr="1", pose par
  // le rendu SSR reel -- voir buildArticleHead/buildStaticPageHtml) : un
  // rerun (webhook /sitemap/refresh, voir plus bas) relit un index.html
  // DEJA prerendu au tour precedent, donc l'ouverture peut deja porter cet
  // attribut. La reconstruction ci-dessous rend toujours un <div id="root">
  // nu, quel que soit l'attribut trouve a l'entree.
  const OPEN_RE = /<div id="root"[^>]*>/;
  const openMatch = html.match(OPEN_RE);
  if (!openMatch) return html;
  const start = openMatch.index;
  const contentStart = start + openMatch[0].length;
  let i = contentStart;
  let depth = 1;
  while (depth > 0) {
    const nextOpen = html.indexOf('<div', i);
    const nextClose = html.indexOf('</div>', i);
    if (nextClose === -1) {
      warn('stripRootContent: no matching </div> found for #root, leaving untouched');
      return html;
    }
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = html.indexOf('>', nextOpen) + 1;
    } else {
      depth--;
      i = nextClose + '</div>'.length;
    }
  }
  const contentEnd = i - '</div>'.length;
  return html.slice(0, start) + '<div id="root">' + html.slice(contentEnd);
}

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

async function buildArticleHead(article, template, related = []) {
  const url = `${BASE_URL}/blog/${article.slug}`;
  const title = article.seo_title || article.title;
  const desc = (article.meta_description || article.excerpt || '').slice(0, 300);
  const image = article.feature_image || `${BASE_URL}/assets/images/og-image.jpg`;
  const imageAlt = article.feature_image_alt || title;
  const resizable = isResizable(image);
  const socialImage = resizable ? imageVariant(image, 1200, 630) : image;
  // Google (donnees structurees d'article) : plusieurs ratios 16:9, 4:3 et
  // 1:1, au moins 1200 px de large -- il choisit selon la surface d'affichage.
  const schemaImages = resizable
    ? [imageVariant(image, 1200, 675), imageVariant(image, 1200, 900), imageVariant(image, 1200, 1200)]
    : [image];
  const ogLocale = OG_LOCALE[article.locale] || 'fr_FR';
  const tags = Array.isArray(article.tags) ? article.tags : [];

  // Un seul graphe par article (2026-10-30) : il y en avait jusqu'a trois une
  // fois le JS execute (Article ici, BlogPosting dans le corps, Article via
  // Helmet) avec des auteurs contradictoires (Organization vs Person
  // "SonnaLab") et un logo d'editeur en 404.
  const authorName = article.author || 'SonnaLab';
  const wordCount = article.content_markdown ? article.content_markdown.trim().split(/\s+/).length : undefined;
  const blogUrl = localizedUrl(article.locale, '/blog');
  const articleLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${url}#article`,
        headline: title,
        description: desc,
        image: schemaImages,
        datePublished: article.published_at,
        dateModified: article.updated_at || article.published_at,
        author: authorName === 'SonnaLab' ? { '@id': ORG_ID } : { '@type': 'Person', name: authorName },
        publisher: { '@id': ORG_ID },
        mainEntityOfPage: { '@id': url },
        isPartOf: { '@id': WEBSITE_ID },
        inLanguage: article.locale,
        ...(tags.length ? { keywords: tags.join(', ') } : {}),
        ...(wordCount ? { wordCount } : {}),
      },
      {
        '@type': 'WebPage',
        '@id': url,
        url,
        name: title,
        inLanguage: article.locale,
        isPartOf: { '@id': WEBSITE_ID },
        breadcrumb: { '@id': `${url}#breadcrumb` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: HOME_LABEL[article.locale] || HOME_LABEL.fr, item: localizedUrl(article.locale, '/') },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: blogUrl },
          { '@type': 'ListItem', position: 3, name: title },
        ],
      },
    ],
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
    `<meta property="og:image" content="${escapeHtml(socialImage)}" />`);
  html = html.replace(/<meta property="og:locale" content="[^"]*"\s*\/>/,
    `<meta property="og:locale" content="${ogLocale}" />`);

  html = html.replace(/<meta name="twitter:url" content="[^"]*"\s*\/>/,
    `<meta name="twitter:url" content="${url}" />`);
  html = html.replace(/<meta name="twitter:title" content="[^"]*"\s*\/>/,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`);
  html = html.replace(/<meta name="twitter:description" content="[^"]*"\s*\/>/,
    `<meta name="twitter:description" content="${escapeHtml(desc)}" />`);
  html = html.replace(/<meta name="twitter:image" content="[^"]*"\s*\/>/,
    `<meta name="twitter:image" content="${escapeHtml(socialImage)}" />`);

  html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${url}" />`);

  const headTags = article.noindex
    ? commonHeadTags(article.locale).map((tag) => (
        tag.startsWith('<meta name="robots"') ? '<meta name="robots" content="noindex,follow" />' : tag
      ))
    : commonHeadTags(article.locale);
  const articleExtras = [
    ...headTags,
    `<meta property="article:published_time" content="${article.published_at}" />`,
    `<meta property="article:modified_time" content="${article.updated_at || article.published_at}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />`,
    ...(resizable ? ['<meta property="og:image:width" content="1200" />', '<meta property="og:image:height" content="630" />'] : []),
    ...buildHreflangLinks(article),
    `<script type="application/ld+json">${jsonSafe(articleLd)}</script>`
  ].join('\n    ');

  html = html.replace('</head>', `    ${articleExtras}\n  </head>`);

  // 2026-08-12 : jusque-la <body> restait un <div id="root"></div> vide --
  // aucun <h1> ni texte reel avant hydratation React, cause du "H1 tag
  // missing" releve par Bing Webmaster Tools sur la quasi-totalite des
  // articles.
  //
  // Remplace ici par un vrai rendu SSR (entry-server.tsx, renderToString du
  // VRAI composant BlogPost) au lieu du squelette ecrit a la main -- ce
  // dernier ne matchait jamais exactement ce que React produit au premier
  // rendu, ce qui empechait toute hydratation reelle cote client
  // (createRoot devait TOUJOURS effacer et reconstruire, cause du flash
  // signale par l'utilisateur). Le HTML genere ici est PRECISEMENT ce que
  // hydrateRoot() retrouvera au premier rendu client -- voir main.tsx.
  if (article.content_markdown) {
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
      // Credit Unsplash rendu des le HTML statique (2026-10-30) : il
      // n'apparaissait qu'apres le fetch client, donc jamais pour un robot.
      coverImageCredit: article.feature_image_credit?.provider === 'unsplash' ? {
        provider: 'unsplash',
        photographer: article.feature_image_credit.photographer ?? null,
        photographerUrl: article.feature_image_credit.photographer_url ?? null,
        photographerAvatar: article.feature_image_credit.photographer_avatar ?? null,
        sourceUrl: article.feature_image_credit.source_url ?? null,
      } : null,
      category: '',
      tags: Array.isArray(article.tags) ? article.tags : [],
      readTime: Math.max(1, Math.round(wordCount / 200)),
      seo: {
        title: article.seo_title || article.title,
        description: desc,
        keywords: tags.join(', '),
      },
      related,
    };

    const { html: rootHtml, ssrDataScript } = await ssrRender(
      `/blog/${article.slug}`,
      article.locale,
      { route: `blog:${article.slug}`, data: prerenderedPost },
    );
    html = html.replace('<div id="root"></div>', `<div id="root" data-ssr="1">${rootHtml}</div>`);
    if (ssrDataScript) html = html.replace('</head>', `    ${ssrDataScript}\n  </head>`);
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

// Donnee d'hydratation de /blog (et /xx/blog) : la page 1 exacte que Blog.tsx
// demanderait, plus l'archive complete de la langue -- des liens <a> reels
// vers chaque article live dans le HTML prerendu (la pagination du front est
// en boutons, donc invisible pour un crawler). Sans liste (echec API), la
// page reste une coquille rendue cote client comme avant.
function blogIndexSSR(listings, locale) {
  const listing = listings.get(locale);
  if (!listing) return {};
  return {
    ssrRoute: localizedUrl(locale, '/blog').slice(BASE_URL.length),
    ssrData: {
      route: `blog-index:${locale}`,
      data: {
        listing: listing.firstPage,
        archive: listing.posts.map(post => ({ slug: post.slug, title: post.title, publishedAt: post.publishedAt })),
      },
    },
  };
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
  // #root, title/description ecrases avec ceux de la home -- voir plus
  // bas). Le webhook /sitemap/refresh (scripts/sitemap-webhook.mjs ->
  // regen-sitemap.sh) relance CE script seul, sans repasser par
  // `vite build` avant -- une execution relit alors index.html DEJA
  // modifie par la fois precedente comme s'il etait le template vierge.
  // stripRootContent() (2026-08-24) a bien rendu #root idempotent, mais
  // title/meta/canonical de la home restaient propages jusque dans
  // app-shell.html a chaque rerun -- app-shell.html est cense rester
  // GENERIQUE (utilise par nginx comme fallback pour toute route SPA sans
  // page dediee : legal/*, sign-in, dashboard, projects...), donc ces
  // routes affichaient le titre/description de la home au lieu du leur
  // (2026-09-04, meme classe de bug que sur lecolt.com, signale par
  // l'utilisateur apres coup : "j'espere que ca a ete gere dans tous les
  // projets"). Fix definitif : figer une VRAIE copie vierge d'index.html
  // (title/meta d'origine du template source, voir index.html a la racine
  // du repo) juste apres `vite build`, avant toute mutation -- ce script la
  // cree si absente (premiere execution suivant un vrai build) et la relit
  // TOUJOURS ensuite, meme invoque seul par le webhook. `vite build` vide
  // BUILD_DIR a chaque build complet (emptyOutDir), donc cette snapshot est
  // automatiquement effacee et regeneree a chaque vrai build -- jamais
  // perimee au dela d'un cycle de build.
  const templateSnapshotPath = join(BUILD_DIR, '.prerender-template.html');
  if (!existsSync(templateSnapshotPath)) {
    await copyFile(templatePath, templateSnapshotPath);
  }
  const rawTemplate = await readFile(templateSnapshotPath, 'utf-8');
  let template = stripRootContent(rawTemplate);

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
  // href="\/[^"]+" (chemin local, ex. /assets/index-XXXX.css) uniquement --
  // 2026-09-01 : depuis l'ajout d'un <link rel="stylesheet"> Google Fonts
  // externe dans index.html (avant le lien vers le CSS de build), un
  // pattern non ancre au chemin local matchait CE lien externe en premier
  // et tentait de "l'inliner" comme un fichier local inexistant -- echec
  // silencieux qui laissait le vrai CSS du build (~223 Ko, tout Tailwind)
  // jamais inline, reintroduisant le FOUC d'origine sur toutes les pages.
  const cssLinkMatch = template.match(/<link rel="stylesheet"[^>]*href="(\/[^"]+)"[^>]*\/?>/);
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
  const listings = new Map(); // locale -> { firstPage, posts } (liste publique, voir fetchListing)

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

    // Un echec ici ne bloque pas les articles : ils sortent simplement sans
    // liens connexes prerendus, et /blog sans liste prerendue (fetch client).
    let related = new Map();
    try {
      const listing = await fetchListing(locale);
      listings.set(locale, listing);
      related = computeRelated(listing.posts);
      warn(`Listing OK ${locale}: ${listing.posts.length} live posts`);
    } catch (err) {
      warn(`Listing FAIL ${locale}: ${err.message}`);
    }

    for (const article of articles) {
      if (!article.slug) continue;
      realSlugs.add(article.slug);
      const targetDir = join(BUILD_DIR, 'blog', article.slug);
      await mkdir(targetDir, { recursive: true });

      const html = article.redirected_to_slug
        ? buildRedirectHtml(article.slug, article.redirected_to_slug, article.locale)
        : await buildArticleHead(article, template, related.get(article.slug) ?? []);

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
      //
      // 2026-10-30 : limite aux articles publies AVANT le fix -- les autres
      // n'ont jamais eu cette URL (491 entrees sur 990 redirigeaient des URLs
      // qui n'ont jamais existe ; 1 seule requete sur les 990 en 15 jours de
      // logs nginx). Et cible la destination FINALE : pour un article devenu
      // lui-meme une redirection (doublon fusionne), pointer vers son slug
      // faisait une chaine de 2 sauts.
      if (article.title && (article.published_at ?? '') < LEGACY_SLUG_BUG_FIXED_AT) {
        const legacySlug = article.title.toLowerCase().replace(/\s+/g, '-');
        if (legacySlug && legacySlug !== article.slug) {
          legacyEntries.push([legacySlug, article.redirected_to_slug || article.slug]);
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
    await buildStaticPageHtml(template, {
      locale: DEFAULT_LOCALE,
      basePath: '/',
      page: 'home',
      ssrRoute: '/',
    }),
    'utf-8'
  );
  warn('Wrote index.html (home, fr)');

  const blogDir = join(BUILD_DIR, 'blog');
  await mkdir(blogDir, { recursive: true });
  await writeFile(join(blogDir, 'index.html'), await buildStaticPageHtml(template, { locale: DEFAULT_LOCALE, basePath: '/blog', page: 'blog', ...blogIndexSSR(listings, DEFAULT_LOCALE) }), 'utf-8');
  warn('Wrote blog/index.html (fr)');

  const contactDir = join(BUILD_DIR, 'contact');
  await mkdir(contactDir, { recursive: true });
  await writeFile(join(contactDir, 'index.html'), await buildStaticPageHtml(template, { locale: DEFAULT_LOCALE, basePath: '/contact', page: 'contact' }), 'utf-8');
  warn('Wrote contact/index.html (fr)');

  // /projects (bare, fr) était déjà servie via le nginx whitelist regex
  // `^/(contact|projects|blog|...)` mais sans coquille dédiée écrite ici --
  // fonctionnait par accident via le fallback @shell (titre générique, pas
  // de vrai SEO). Ajouté en même temps que les variantes localisées
  // ci-dessous pour cohérence (2026-09-08).
  const projectsDir = join(BUILD_DIR, 'projects');
  await mkdir(projectsDir, { recursive: true });
  await writeFile(join(projectsDir, 'index.html'), await buildStaticPageHtml(template, { locale: DEFAULT_LOCALE, basePath: '/projects', page: 'projects' }), 'utf-8');
  warn('Wrote projects/index.html (fr)');

  for (const locale of PREFIXED_LOCALES) {
    const localeDir = join(BUILD_DIR, locale);
    await mkdir(localeDir, { recursive: true });
    await writeFile(
      join(localeDir, 'index.html'),
      await buildStaticPageHtml(template, {
        locale,
        basePath: '/',
        page: 'home',
        ssrRoute: '/',
      }),
      'utf-8'
    );

    const localeBlogDir = join(localeDir, 'blog');
    await mkdir(localeBlogDir, { recursive: true });
    await writeFile(join(localeBlogDir, 'index.html'), await buildStaticPageHtml(template, { locale, basePath: '/blog', page: 'blog', ...blogIndexSSR(listings, locale) }), 'utf-8');

    const localeContactDir = join(localeDir, 'contact');
    await mkdir(localeContactDir, { recursive: true });
    await writeFile(join(localeContactDir, 'index.html'), await buildStaticPageHtml(template, { locale, basePath: '/contact', page: 'contact' }), 'utf-8');

    const localeProjectsDir = join(localeDir, 'projects');
    await mkdir(localeProjectsDir, { recursive: true });
    await writeFile(join(localeProjectsDir, 'index.html'), await buildStaticPageHtml(template, { locale, basePath: '/projects', page: 'projects' }), 'utf-8');

    warn(`Wrote /${locale}/, /${locale}/blog/, /${locale}/contact/, /${locale}/projects/`);
  }

  // Flux RSS par langue + llms.txt, regeneres a chaque publication (le
  // webhook /sitemap/refresh relance ce script). Une langue dont la liste a
  // echoue garde son flux precedent plutot qu'un flux vide.
  const feedDir = join(BUILD_DIR, 'feed');
  await mkdir(feedDir, { recursive: true });
  for (const [locale, listing] of listings) {
    await writeFile(join(feedDir, `${locale}.xml`), buildFeed(locale, listing.posts), 'utf-8');
  }
  if (listings.size === LOCALES.length) {
    await writeFile(join(BUILD_DIR, 'llms.txt'), buildLlmsTxt(listings), 'utf-8');
  }
  warn(`Wrote ${listings.size} RSS feeds${listings.size === LOCALES.length ? ' + llms.txt' : ' (llms.txt skipped: incomplete listings)'}`);

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
  warn(`Fatal: ${err.stack || err.message}`);
  process.exit(1);
});
