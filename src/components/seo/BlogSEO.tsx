import { SEO } from './SEO';
import { ArticleStructuredData } from './StructuredData';
import { BlogPost } from '@/types/blog';

const BASE = 'https://sonnalab.com';

interface BlogSEOProps {
  post: BlogPost;
}

export function BlogSEO({ post }: BlogSEOProps) {
  // 2026-08-11 : les alternates hreflang etaient resolus via post.relatedPostId
  // contre le JSON de demo _index.json (fr/en uniquement, contenu seed
  // pre-CMS) -- l'API reelle (posts_controller#show cote api.sonnalab.com)
  // ne renseigne jamais ce champ, donc cette branche etait un no-op silencieux
  // pour tous les vrais articles publies. Retire en attendant que le backend
  // expose translation_group_id / les slugs freres sur l'endpoint public (le
  // meme mecanisme existe deja cote seo_controller#articles, utilise par le
  // prerender statique, mais pas par ce composant client-side).

  return (
    <>
      <ArticleStructuredData
        title={post.title}
        slug={post.slug}
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