import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Search, Clock, Calendar, ArrowRight, NewspaperIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { SEO } from '@/components/seo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useModal } from '@/components/providers/ModalProvider';
import { apiService, type BlogCategorySummary } from '@/services/api';
import type { BlogPost as BlogPostType } from '@/types/blog';

const POSTS_PER_PAGE = 3;

type BlogListPost = Omit<BlogPostType, 'content'>;

function humanizeCategory(category: string) {
  return category
    .split('-')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function Blog() {
  const { t, i18n } = useTranslation('blog');
  const lang = i18n.language.startsWith('en') ? 'en' : 'fr';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [blogPosts, setBlogPosts] = useState<BlogListPost[]>([]);
  const [categories, setCategories] = useState<BlogCategorySummary[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setError(null);

    apiService.getBlogPosts({
      page,
      per_page: POSTS_PER_PAGE,
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      q: searchQuery.trim() || undefined,
    })
      .then(response => {
        if (!mounted) return;

        setBlogPosts(response.posts ?? []);
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
  }, [page, searchQuery, selectedCategory, t]);

  return (
    <>
      <SEO
        title={t('seo.title')}
        description={t('seo.description')}
        keywords={t('seo.keywords')}
        url="/blog"
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

          <dl className="blog-index-hero__stats" aria-label="Blog">
            <div>
              <dt>{t('stats.articles')}</dt>
              <dd>{total}</dd>
            </div>
            <div>
              <dt>{t('stats.categories')}</dt>
              <dd>{categories.length}</dd>
            </div>
            <div>
              <dt>{t('stats.page')}</dt>
              <dd>{page}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="blog-index-toolbar">
        <div className="blog-index-container">
          <div className="blog-index-toolbar__row">
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
          </div>

            {searchQuery && (
              <p className="blog-index-toolbar__result">
                {t('search.results', { count: total })}
              </p>
            )}
          </div>
      </section>

      <section className="blog-index-list">
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
                              {new Date(post.publishedAt).toLocaleDateString(lang)}
                            </span>
                          </div>
                          <h2>{post.title}</h2>
                          <p>{post.excerpt}</p>
                          <span className="blog-index-card__cta">
                            {t('article.readMore')} <ArrowRight size={16} />
                          </span>
                        </div>
                      </Link>
                    </motion.article>
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav className="blog-index-pagination" aria-label="Pagination blog">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(current => Math.max(1, current - 1))}
                    >
                      <ChevronLeft size={16} />
                      {t('pagination.previousPage', { defaultValue: 'Précédent' })}
                    </Button>
                    <span>
                      {page} / {totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage(current => Math.min(totalPages, current + 1))}
                    >
                      {t('pagination.nextPage', { defaultValue: 'Suivant' })}
                      <ChevronRight size={16} />
                    </Button>
                  </nav>
                )}
              </>
            )}
        </div>
      </section>

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