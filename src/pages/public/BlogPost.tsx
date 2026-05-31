import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { ArrowLeft, CalendarDays, Clock3, ListChecks } from 'lucide-react';
import { BlogSEO } from '@/components/seo/BlogSEO';
import { MarkdownRenderer } from '@/components/public/blog/MarkdownRenderer';
import { ReadingProgressBar } from '@/components/public/blog/ReadingProgressBar';
import { SocialShareSidebar } from '@/components/public/blog/SocialShareSidebar';
import { TableOfContents } from '@/components/public/blog/TableOfContents';
import { RelatedArticles } from '@/components/public/blog/RelatedArticles';
import { BlogPost as BlogPostType } from '@/types/blog';
import { Button } from '@/components/ui/button';
import { useBlogTracking } from '@/hooks/useAnalytics';
import { useAutoConsultationTrigger } from '@/hooks/useAutoConsultationTrigger';
import { apiService } from '@/services/api';

function getArticleBodyContent(content: string): string {
  return content.replace(/^#\s+.+(?:\r?\n)+/, '').trimStart();
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation('blog');
  const lang = i18n.language.substring(0, 2);
  const navigate = useNavigate();
  
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Omit<BlogPostType, 'content'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableOfContents, setTableOfContents] = useState<Array<{ id: string; text: string; level: number }>>([]);

  // ✅ Hook appelé AVANT toute condition
  useBlogTracking(slug || '', post?.category);

  // Invitation stratégique à nous contacter : s'arme une fois l'article chargé,
  // se déclenche au plus une fois par session sur les lecteurs engagés.
  useAutoConsultationTrigger({ enabled: !!post && !loading });

  useEffect(() => {
    const SUPPORTED_LOCALES = ['fr', 'en', 'es', 'it', 'de'];

    async function loadPost() {
      if (!slug) return;
      
      setLoading(true);
      try {
        // 1. Essai dans la langue courante
        let fetchedPost: BlogPostType | null = null;
        let articleLang = lang;

        const primary = await apiService.getBlogPost(slug, { locale: lang }).catch(() => null);
        fetchedPost = primary?.post ?? null;

        // 2. Fallback : essayer les autres locales en parallèle
        if (!fetchedPost) {
          const fallbackLocales = SUPPORTED_LOCALES.filter(l => l !== lang);
          const results = await Promise.allSettled(
            fallbackLocales.map(l => apiService.getBlogPost(slug, { locale: l }).then(r => ({ ...r, _locale: l })))
          );
          for (const result of results) {
            if (result.status === 'fulfilled' && result.value.post) {
              fetchedPost = result.value.post;
              articleLang = result.value._locale;
              break;
            }
          }
        }

        if (fetchedPost) {
          // Si l'article est dans une autre langue, switcher l'interface
          if (articleLang !== lang) {
            i18n.changeLanguage(articleLang);
          }
          setPost(fetchedPost);
          const relatedResponse = await apiService.getBlogPosts({ category: fetchedPost.category, limit: 4, locale: articleLang });
          let relatedCandidates = (relatedResponse.posts ?? []).filter(p => p.id !== fetchedPost!.id);

          if (relatedCandidates.length < 3) {
            try {
              const complementaryResponse = await apiService.getBlogPosts({ limit: 6, locale: articleLang });
              const complementaryPosts = (complementaryResponse.posts ?? []).filter((candidate) => (
                candidate.id !== fetchedPost!.id &&
                !relatedCandidates.some((relatedPost) => relatedPost.id === candidate.id)
              ));

              relatedCandidates = [...relatedCandidates, ...complementaryPosts];
            } catch {
              // The article should stay readable even if complementary links are unavailable.
            }
          }

          setRelatedPosts(relatedCandidates.slice(0, 3));
        } else {
          setPost(null);
          setRelatedPosts([]);
        }
      } catch {
        setPost(null);
        setRelatedPosts([]);
      } finally {
        setLoading(false);
      }
    }
    
    loadPost();
  }, [slug, lang]);

  useEffect(() => {
    if (!post) return;

    const headings = getArticleBodyContent(post.content).match(/^#{1,3}\s.+$/gm) || [];
    const allHeadings = headings.map((heading, index) => {
      const level = heading.match(/^#+/)?.[0].length || 1;
      const text = heading.replace(/^#+\s/, '');
      const id = `heading-${index}`;
      return { id, text, level };
    });
    const preferredLevel = allHeadings.some((heading) => heading.level === 2)
      ? 2
      : Math.min(...allHeadings.map((heading) => heading.level));
    const toc = Number.isFinite(preferredLevel)
      ? allHeadings.filter((heading) => heading.level === preferredLevel)
      : [];
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
  const articleContent = getArticleBodyContent(post.content);

  return (
    <>
      <BlogSEO post={post} />
      <ReadingProgressBar />
      
      <article className="blog-post-page" itemScope itemType="https://schema.org/BlogPosting">
        <meta itemProp="datePublished" content={post.publishedAt} />
        {post.updatedAt && <meta itemProp="dateModified" content={post.updatedAt} />}

        <section className="blog-post-intro" aria-labelledby="blog-post-title">
          <nav className="blog-post-breadcrumb" aria-label="Breadcrumb">
            <Link to="/blog">{t('breadcrumb.blog')}</Link>
            <span aria-hidden="true">&gt;</span>
            <span>{post.title}</span>
          </nav>

          <h1 id="blog-post-title" className="blog-post-title" itemProp="headline">
            {post.title}
          </h1>

          <figure className="blog-post-hero-media">
            <img
              src={post.coverImage}
              alt={post.title}
              className="blog-post-hero-image"
              itemProp="image"
            />
            <figcaption className="blog-post-hero-caption" itemProp="description">
              <span>{post.excerpt}</span>
              {post.coverImageCredit?.provider === 'unsplash' && (
                <span className="blog-post-hero-photo-credit">
                  {t('photoBy')}{' '}
                  <a
                    href={post.coverImageCredit.photographerUrl ?? `https://unsplash.com/?utm_source=sonnalab&utm_medium=referral`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {post.coverImageCredit.photographer ?? 'Unsplash'}
                  </a>
                  {' · '}
                  <a
                    href={`https://unsplash.com/?utm_source=sonnalab&utm_medium=referral`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Unsplash
                  </a>
                </span>
              )}
            </figcaption>
          </figure>
        </section>

        {/* 3-Column Layout Container */}
        <div className="container mx-auto px-4 max-w-[1600px] blog-post-content-shell">
            <div className="blog-post-grid">
            {/* LEFT SIDEBAR - Table of Contents */}
            <aside className="blog-toc-sidebar">
              <div className="sticky-sidebar">
              <TableOfContents items={tableOfContents} />
              </div>
            </aside>

            {/* MAIN CONTENT - Center Column */}
            <main className="blog-main-content">
              {/* Article Body */}
              <div className="prose prose-lg max-w-none mb-16" itemProp="articleBody">
                <MarkdownRenderer content={articleContent} lang={lang} enableCtas />
              </div>
            </main>

            {/* RIGHT SIDEBAR - Social Share */}
            <aside className="blog-social-sidebar">
              <div className="sticky-sidebar blog-right-rail">
                <section className="blog-article-details-card" aria-label={t('article.detailsLabel', "Article details")}>
                  <div className="blog-article-author flex items-center gap-3">
                    <div className="blog-article-author__avatar w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <img src="/favicon.ico" alt="" width="24" height="24" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-semibold" itemProp="author" itemScope itemType="https://schema.org/Person">
                        <span itemProp="name">SonnaLab</span>
                      </p>
                      <span>{post.author}</span>
                    </div>
                  </div>

                  <dl className="blog-article-details-list">
                    <div>
                      <dt>
                        <ListChecks aria-hidden="true" />
                        <span>{t('article.category')}</span>
                      </dt>
                      <dd>{post.category}</dd>
                    </div>
                    <div>
                      <dt>
                        <CalendarDays aria-hidden="true" />
                        <span>{t('article.publishedOn')}</span>
                      </dt>
                      <dd>
                        {new Date(post.publishedAt).toLocaleDateString(lang, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <Clock3 aria-hidden="true" />
                        <span>{t('article.readLabel')}</span>
                      </dt>
                      <dd>{post.readTime} min</dd>
                    </div>
                  </dl>
                </section>
                <SocialShareSidebar
                  url={currentUrl}
                  title={post.title}
                  excerpt={post.excerpt}
                />
                {post.coverImageCredit?.provider === 'unsplash' && (
                  <div className="blog-unsplash-card">
                    <a
                      href={post.coverImageCredit.photographerUrl ?? `https://unsplash.com/?utm_source=sonnalab&utm_medium=referral`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="blog-unsplash-photographer"
                    >
                      {post.coverImageCredit.photographerAvatar ? (
                        <img
                          src={post.coverImageCredit.photographerAvatar}
                          alt={post.coverImageCredit.photographer ?? ''}
                          className="blog-unsplash-avatar"
                        />
                      ) : (
                        <span className="blog-unsplash-avatar-initial" aria-hidden="true">
                          {(post.coverImageCredit.photographer ?? 'U')[0].toUpperCase()}
                        </span>
                      )}
                      <span>{post.coverImageCredit.photographer ?? 'Photographer'}</span>
                    </a>
                    <a
                      href={`https://unsplash.com/?utm_source=sonnalab&utm_medium=referral`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="blog-unsplash-brand"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M10 9V0h12v9H10zm12 5h10v18H0V14h10v9h12v-9z"/></svg>
                      <span>Unsplash</span>
                    </a>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </article>

      <div className="blog-related-shell">
        <RelatedArticles
          articles={relatedPosts}
          title={t('article.relatedPosts')}
          lang={lang}
        />
      </div>

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