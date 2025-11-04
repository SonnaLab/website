import { SEO } from './SEO';
import { ArticleStructuredData } from './StructuredData';
import { BlogPost } from '../../types/blog';

interface BlogSEOProps {
  post: BlogPost;
}

export function BlogSEO({ post }: BlogSEOProps) {
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
      />
    </>
  );
}