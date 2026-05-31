import { SEO } from './SEO';
import { ArticleStructuredData } from './StructuredData';
import { BlogPost } from '@/types/blog';
import frBlogIndex from '@/locales/fr/blog/_index.json';
import enBlogIndex from '@/locales/en/blog/_index.json';

type BlogIndexEntry = { id: string; slug: string; lang: string };

const ALL_BLOG_POSTS: BlogIndexEntry[] = [
  ...(frBlogIndex as BlogIndexEntry[]),
  ...(enBlogIndex as BlogIndexEntry[]),
];

const BASE = 'https://sonnalab.com';

const SUPPORTED_LOCALES = ['fr', 'en', 'es', 'it', 'de'] as const;
type SeoLocale = (typeof SUPPORTED_LOCALES)[number];

const resolveLocale = (lang?: string): SeoLocale => {
  const prefix = (lang ?? 'fr').slice(0, 2).toLowerCase();
  return (SUPPORTED_LOCALES as readonly string[]).includes(prefix)
    ? (prefix as SeoLocale)
    : 'fr';
};

// Concise, benefit + action-verb hook appended to the meta description to lift
// the click-through rate from search results. Localized so es/it/de articles
// (high impressions, low CTR in GSC) get an incentive ending too.
const CTA_SUFFIX: Record<SeoLocale, string> = {
  fr: 'Passez à l’action avec nos experts.',
  en: 'Take action with our experts.',
  es: 'Pasa a la acción con nuestros expertos.',
  it: 'Passa all’azione con i nostri esperti.',
  de: 'Werden Sie mit unseren Experten aktiv.',
};

const META_DESCRIPTION_MAX = 158;

/** Appends a localized incentive hook when there is room and it isn't already present. */
function buildMetaDescription(rawDescription: string, lang?: string): string {
  const locale = resolveLocale(lang);
  const base = (rawDescription ?? '').trim();
  const suffix = CTA_SUFFIX[locale];

  if (base.toLowerCase().includes(suffix.toLowerCase())) return base;

  const withSuffix = base ? `${base} ${suffix}` : suffix;
  if (withSuffix.length <= META_DESCRIPTION_MAX) return withSuffix;

  // No room: keep the original description intact rather than truncating it.
  return base;
}

interface BlogSEOProps {
  post: BlogPost;
}

export function BlogSEO({ post }: BlogSEOProps) {
  const currentHref = `${BASE}/blog/${post.slug}`;
  const relatedPost = post.relatedPostId
    ? ALL_BLOG_POSTS.find(p => p.id === post.relatedPostId)
    : null;
  const alternateHref = relatedPost ? `${BASE}/blog/${relatedPost.slug}` : null;

  const hreflangAlternates = alternateHref
    ? [
        { lang: post.lang === 'fr' ? 'fr' : 'en', href: currentHref },
        { lang: post.lang === 'fr' ? 'en' : 'fr', href: alternateHref },
        { lang: 'x-default', href: post.lang === 'fr' ? currentHref : alternateHref },
      ]
    : undefined;

  const metaDescription = buildMetaDescription(post.seo.description, post.lang);

  return (
    <>
      <ArticleStructuredData
        title={post.title}
        description={post.excerpt}
        image={post.coverImage}
        datePublished={post.publishedAt}
        dateModified={post.updatedAt || post.publishedAt}
        author={post.author}
      />
      <SEO
        title={post.seo.title}
        description={metaDescription}
        keywords={post.seo.keywords}
        url={`/blog/${post.slug}`}
        image={post.coverImage}
        type="article"
        author={post.author}
        publishedTime={post.publishedAt}
        modifiedTime={post.updatedAt}
        hreflangAlternates={hreflangAlternates}
      />
    </>
  );
}