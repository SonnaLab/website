import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Clock, Calendar, ArrowLeft, Tag } from 'lucide-react';
import { BlogSEO } from '@/components/seo/BlogSEO';
import { MarkdownRenderer } from '@/components/public/blog/MarkdownRenderer';
import { ReadingProgressBar } from '@/components/public/blog/ReadingProgressBar';
import { SocialShareSidebar } from '@/components/public/blog/SocialShareSidebar';
import { TableOfContents } from '@/components/public/blog/TableOfContents';
import { AuthorBio } from '@/components/public/blog/AuthorBio';
import { RelatedArticles } from '@/components/public/blog/RelatedArticles';
import { getBlogPost, getBlogPostsByCategory } from '@/data/blogLoader';
import { BlogPost as BlogPostType } from '@/types/blog';
import { Button } from '@/components/ui/button';
import { useBlogTracking } from '@/hooks/useAnalytics';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation('blog');
  const lang = i18n.language as 'fr' | 'en';
  const navigate = useNavigate();
  
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Omit<BlogPostType, 'content'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableOfContents, setTableOfContents] = useState<Array<{ id: string; text: string; level: number }>>([]);

  // ✅ Hook appelé AVANT toute condition
  useBlogTracking(slug || '', post?.category);

  useEffect(() => {
    async function loadPost() {
      if (!slug) return;
      
      setLoading(true);      
      const fetchedPost = await getBlogPost(slug, lang);
      
      if (fetchedPost) {
        setPost(fetchedPost);        
        const related = getBlogPostsByCategory(fetchedPost.category, lang);
        setRelatedPosts(related.filter(p => p.id !== fetchedPost.id).slice(0, 3));
      }
      
      setLoading(false);
    }
    
    loadPost();
  }, [slug, lang]);

  useEffect(() => {
    if (!post) return;

    const headings = post.content.match(/^#{1,3}\s.+$/gm) || [];
    const toc = headings.map((heading, index) => {
      const level = heading.match(/^#+/)?.[0].length || 1;
      const text = heading.replace(/^#+\s/, '');
      const id = `heading-${index}`;
      return { id, text, level };
    });
    setTableOfContents(toc);
  }, [post]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">{t('search.loading')}</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">{t('blogErrors.articleDoesntExist')}</h1>
          <p className="text-gray-600 mb-8">{t('blogErrors.notFound')}</p>
          <Button onClick={() => navigate('/blog')} size="lg">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('blogErrors.goBack')}
          </Button>
        </div>
      </div>
    );
  }

  const currentUrl = `https://sonnalab.com${lang === 'en' ? '/en' : ''}/blog/${post.slug}`;

  return (
    <>
      <BlogSEO post={post} />
      <ReadingProgressBar />
      
      <article className="pt-20 pb-16 py-20 bg-gray-50" itemScope itemType="https://schema.org/BlogPosting">
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 pt-4 max-w-7xl">
          <nav className="flex items-center text-sm text-gray-600 mb-8" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-black transition-colors">
              {t('breadcrumb.home')}
            </Link>
            <span className="mx-2">/</span>
            <Link to="/blog" className="hover:text-black transition-colors">
              {t('breadcrumb.blog')}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900 font-medium truncate max-w-xs">{post.title}</span>
          </nav>
        </div>

        {/* Hero Section */}
        <header className="relative bg-black text-white py-16 mb-16">
          <div className="container mx-auto max-w-5xl px-8">
            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <span className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-sm font-semibold">
                {post.category}
              </span>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{post.readTime} min de lecture</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <time dateTime={post.publishedAt} itemProp="datePublished" className="text-sm">
                  {new Date(post.publishedAt).toLocaleDateString(lang, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </time>
              </div>
              {post.updatedAt && (
                <meta itemProp="dateModified" content={post.updatedAt} />
              )}
            </div>
        
            {/* Title */}
            <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight" itemProp="headline">
              {post.title}
            </h1>
        
            {/* Author */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                <span className="text-lg font-bold">{post.author.charAt(0)}</span>
              </div>
              <div>
                <p className="font-semibold" itemProp="author" itemScope itemType="https://schema.org/Person">
                  <span itemProp="name">{post.author}</span>
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* 3-Column Layout Container */}
        <div className="container mx-auto px-4 max-w-[1600px]">
            <div className="blog-post-grid">
            {/* LEFT SIDEBAR - Table of Contents */}
            <aside className="blog-toc-sidebar">
              <div className="sticky-sidebar">
              <TableOfContents items={tableOfContents} />
              </div>
            </aside>

            {/* MAIN CONTENT - Center Column */}
            <main className="blog-main-content">
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-full h-full object-cover"
                itemProp="image"
              />
              {/* Excerpt */}
              <div className="bg-gray-50 border-l-4 border-black p-6 rounded-r-2xl mb-12">
                <p className="text-xl leading-relaxed text-gray-700 italic" itemProp="description">
                  {post.excerpt}
                </p>
              </div>

              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-8" itemProp="keywords">
                  <Tag className="w-4 h-4 text-gray-600" />
                  {post.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition-colors cursor-pointer"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Article Body */}
              <div className="prose prose-lg max-w-none mb-16" itemProp="articleBody">
                <MarkdownRenderer content={post.content} />
              </div>

              {/* Author Bio */}
              <div className="mb-16">
                <AuthorBio
                  name={post.author}
                  bio={`Expert en innovation digitale, ${post.author} partage son expertise sur les dernières tendances technologiques et les meilleures pratiques du développement web moderne.`}
                />
              </div>

              {/* Related Articles */}
              {relatedPosts.length > 0 && (
                <RelatedArticles
                  articles={relatedPosts}
                  title={t('article.relatedPosts')}
                  lang={lang}
                />
              )}
            </main>

            {/* RIGHT SIDEBAR - Social Share */}
            <aside className="blog-social-sidebar">
              <div className="sticky-sidebar">
                <SocialShareSidebar
                  url={currentUrl}
                  title={post.title}
                  excerpt={post.excerpt}
                />
              </div>
            </aside>
          </div>
        </div>
      </article>

      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.excerpt,
            image: post.coverImage,
            datePublished: post.publishedAt,
            dateModified: post.updatedAt || post.publishedAt,
            author: {
              '@type': 'Person',
              name: post.author,
            },
            publisher: {
              '@type': 'Organization',
              name: 'SonnaLab',
              logo: {
                '@type': 'ImageObject',
                url: 'https://sonnalab.com/logo.png',
              },
            },
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': currentUrl,
            },
          }),
        }}
      />
    </>
  );
}