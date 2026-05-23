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
        description={post.seo.description}
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