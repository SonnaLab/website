import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Search, Clock, Calendar, ArrowRight, NewspaperIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { SEO } from '@/components/seo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useModal } from '@/components/providers/ModalProvider';
import { apiService, type BlogCategorySummary, type BlogPostsResponse } from '@/services/api';
import type { BlogPost as BlogPostType } from '@/types/blog';
import { getSSRData } from '@/lib/ssrData';

const POSTS_PER_PAGE = 6;

type BlogListPost = Omit<BlogPostType, 'content'>;

// Donnee prerendue par scripts/prerender-blog.mjs (blogIndexSSR) : la page 1
// exacte que l'effet ci-dessous demanderait, plus l'archive complete de la
// langue -- de vrais liens vers chaque article dans le HTML statique.
interface BlogIndexSSRData {
  listing: BlogPostsResponse;
  archive: { slug: string; title: string; publishedAt: string }[];
}

function humanizeCategory(category: string) {
  return category
    .split('-')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function sortByNewestPost(firstPost: BlogListPost, secondPost: BlogListPost) {
  return new Date(secondPost.publishedAt).getTime() - new Date(firstPost.publishedAt).getTime();
}

function newestPosts(response: BlogPostsResponse) {
  return [...(response.posts ?? [])].sort(sortByNewestPost).slice(0, POSTS_PER_PAGE);
}

// Jour de publication tel qu'ecrit par l'API (fuseau de l'editeur), formate en
// UTC : meme texte au build (VPS en UTC) et dans le navigateur, sinon un
// article publie peu apres minuit changeait de date et cassait l'hydratation.
function formatPublishedDate(publishedAt: string, lang: string) {
  return new Date(`${publishedAt.slice(0, 10)}T00:00:00Z`).toLocaleDateString(lang, { timeZone: 'UTC' });
}

export default function Blog() {
  const { t, i18n } = useTranslation('blog');
  const lang = i18n.language.substring(0, 2);
  // Etat initial (lazy useState) et non useEffect : le premier rendu client
  // doit reproduire le HTML prerendu pour que hydrateRoot le reutilise.
  const ssrIndex = useMemo(() => getSSRData<BlogIndexSSRData>(`blog-index:${lang}`), [lang]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [blogPosts, setBlogPosts] = useState<BlogListPost[]>(() => (ssrIndex ? newestPosts(ssrIndex.listing) : []));
  const [categories, setCategories] = useState<BlogCategorySummary[]>(() => ssrIndex?.listing.categories ?? []);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(() => ssrIndex?.listing.total ?? 0);
  const [totalPages, setTotalPages] = useState(() => ssrIndex?.listing.total_pages ?? 0);
  const [loading, setLoading] = useState(() => !ssrIndex);
  const [error, setError] = useState<string | null>(null);
  const { openConsultationModal } = useModal();

  const categoryLabel = (category: string, fallback?: string) => {
    const key = `blog:categories.${category}`;
    return i18n.exists(key) ? t(`categories.${category}`) : (fallback || humanizeCategory(category));
  };

  const categoryTabs = [
    { id: 'all', label: t('categories.all'), count: total },
    ...categories.map(category => ({
      ...category,
      label: categoryLabel(category.id, category.label),
    })),
  ];
  const hasCategoryTabs = categoryTabs.some(category => category.count > 0);
  const shouldShowToolbar = hasCategoryTabs || searchQuery.trim().length > 0;

  useEffect(() => {
    let mounted = true;

    // Vue par defaut deja livree par le HTML prerendu : la reutiliser au lieu
    // de refetcher (et d'afficher le loader par-dessus un contenu deja la).
    if (ssrIndex && page === 1 && selectedCategory === 'all' && !searchQuery.trim()) {
      setBlogPosts(newestPosts(ssrIndex.listing));
      setCategories(ssrIndex.listing.categories ?? []);
      setTotal(ssrIndex.listing.total ?? 0);
      setTotalPages(ssrIndex.listing.total_pages ?? 0);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    apiService.getBlogPosts({
      page,
      per_page: POSTS_PER_PAGE,
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      q: searchQuery.trim() || undefined,
      locale: lang,
    })
      .then(response => {
        if (!mounted) return;

        setBlogPosts(newestPosts(response));
        setCategories(response.categories ?? []);
        setTotal(response.total ?? 0);
        setTotalPages(response.total_pages ?? 0);
      })
      .catch(() => {
        if (!mounted) return;
        setBlogPosts([]);
        setTotal(0);
        setTotalPages(0);
        setError(t('blogErrors.loadPosts', { defaultValue: t('errors.loadPosts') }));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [page, searchQuery, selectedCategory, t, lang, ssrIndex]);

  return (
    <>
      {/* pas de url="/blog" en dur : SEO.tsx dérive canonical/hreflang de
          location.pathname, cette page vit aussi à /en/blog, etc. */}
      <SEO
        title={t('seo.title')}
        description={t('seo.description')}
        keywords={t('seo.keywords')}
      />

      <section className="blog-index-hero">
        <div className="blog-index-container blog-index-hero__inner">
          <div className="blog-index-hero__copy">
            <div className="blog-index-hero__eyebrow">
              <NewspaperIcon size={18} />
              <span>{t('hero.badge')}</span>
            </div>
            <h1>{t('hero.title')}</h1>
            <p>{t('hero.subtitle')}</p>
          </div>
        </div>
      </section>

      <section className="blog-index-list">
        {shouldShowToolbar && (
          <div className="blog-index-container">
            <div className={`blog-index-toolbar__row${hasCategoryTabs ? '' : ' blog-index-toolbar__row--search-only'}`}>
              <label className="blog-index-search">
                <Search size={18} />
                <Input
                  type="text"
                  placeholder={t('search.placeholder')}
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="blog-index-search__input"
                />
              </label>

              {hasCategoryTabs && (
                <div className="blog-index-filters" aria-label="Catégories">
                  {categoryTabs.map(category => (
                    <button
                      key={category.id}
                      type="button"
                      className={`blog-index-filter${selectedCategory === category.id ? ' blog-index-filter--active' : ''}`}
                      onClick={() => { setSelectedCategory(category.id); setPage(1); }}
                    >
                      <span>{category.label}</span>
                      <strong>{category.count}</strong>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {searchQuery && (
              <p className="blog-index-toolbar__result">
                {t('search.results', { count: total })}
              </p>
            )}
          </div>
        )}
        <div className="blog-index-container">
            {loading ? (
              <div className="blog-index-state">
                <div className="blog-index-state__loader"></div>
                <p>{t('search.loading')}</p>
              </div>
            ) : error ? (
              <div className="blog-index-state">
                <p>{error}</p>
              </div>
            ) : blogPosts.length === 0 ? (
              <div className="blog-index-empty">
                <NewspaperIcon size={26} />
                <h2>{t('search.noResults')}</h2>
                <p>{searchQuery ? t('search.results', { count: 0 }) : t('hero.subtitle')}</p>
              </div>
            ) : (
              <>
                <div className="blog-index-grid">
                  {blogPosts.map((post, index) => (
                    <motion.article
                      key={post.id || post.slug}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="blog-index-card"
                    >
                      <Link to={`/blog/${post.slug}`} className="blog-index-card__link">
                        <div className="blog-index-card__media">
                          <img
                            src={post.coverImage || '/images/fromIdeaToInovation.png'}
                            alt={post.title}
                          />
                          <span>#{categoryLabel(post.category)}</span>
                        </div>
                        <div className="blog-index-card__body">
                          <div className="blog-index-card__meta">
                            <span>
                              <Clock size={14} />
                              {post.readTime} min
                            </span>
                            <span>
                              <Calendar size={14} />
                              {formatPublishedDate(post.publishedAt, lang)}
                            </span>
                          </div>
                          <h2>{post.title}</h2>
                          <p>{post.excerpt}</p>
                        </div>
                        <div className="blog-related-card__footer blog-index-card__footer" aria-hidden="true">
                          <span className="blog-related-card__brand">
                            <span className="blog-related-card__brand-icon">
                              <img src="/favicon.ico" alt="" width="18" height="18" />
                            </span>
                            <span>SonnaLab</span>
                          </span>
                          <ArrowRight />
                        </div>
                      </Link>
                    </motion.article>
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav className="blog-index-pagination" aria-label="Pagination blog">
                    <button
                      type="button"
                      className="blog-pagination__arrow"
                      disabled={page <= 1}
                      onClick={() => setPage(current => Math.max(1, current - 1))}
                      aria-label={t('pagination.previousPage', { defaultValue: 'Précédent' })}
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <div className="blog-pagination__pages">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button
                          key={p}
                          type="button"
                          className={`blog-pagination__page${p === page ? ' blog-pagination__page--active' : ''}`}
                          onClick={() => setPage(p)}
                          aria-current={p === page ? 'page' : undefined}
                        >
                          {p}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="blog-pagination__arrow"
                      disabled={page >= totalPages}
                      onClick={() => setPage(current => Math.min(totalPages, current + 1))}
                      aria-label={t('pagination.nextPage', { defaultValue: 'Suivant' })}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </nav>
                )}
              </>
            )}
        </div>
      </section>

      {ssrIndex && ssrIndex.archive.length > 0 && (
        <section className="blog-index-archive">
          <div className="blog-index-container">
            <details>
              <summary>{t('archive.title', { count: ssrIndex.archive.length })}</summary>
              <ul>
                {ssrIndex.archive.map(item => (
                  <li key={item.slug}>
                    <Link to={`/blog/${item.slug}`}>{item.title}</Link>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </section>
      )}

      <section className="blog-index-cta">
        <div className="blog-index-container blog-index-cta__inner">
          <div>
            <h2>{t('cta.title')}</h2>
            <p>{t('cta.description')}</p>
          </div>
          <Button size="lg" className="bg-black text-white hover:bg-gray-800" onClick={() => openConsultationModal()}>
              {t('cta.button')}
          </Button>
        </div>
      </section>
    </>
  );
}