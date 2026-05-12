import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Search, Clock, Calendar, ArrowRight, NewspaperIcon } from 'lucide-react';
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

      {/* Hero Section */}
      <section className="relative bg-gray-50 text-black py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-5 py-2.5 rounded-full mb-8">
              <NewspaperIcon className="w-6 h-6 text-black" />
              <span className="text-md font-medium text-black tracking-wide">{t('hero.badge')}</span>
            </div>
            
            <h1 className="text-4xl lg:text-6xl font-bold mb-6">
              {t('hero.title')}
            </h1>
            
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              {t('hero.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Search & Filters */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder={t('search.placeholder')}
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="pl-10 border border-gray-300 focus:border-black"
                />
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                {categoryTabs.map(category => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => { setSelectedCategory(category.id); setPage(1); }}
                  >
                    {category.label}
                  </Button>
                ))}
              </div>
            </div>

            {searchQuery && (
              <p className="text-gray-600 mb-6">
                {t('search.results', { count: total })}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
                <p className="text-gray-500 text-lg">{t('search.loading')}</p>
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <p className="text-gray-500 text-lg">{error}</p>
              </div>
            ) : blogPosts.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 text-lg">{t('search.noResults')}</p>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {blogPosts.map((post, index) => (
                    <motion.article
                      key={post.id || post.slug}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group"
                    >
                      <Link to={`/blog/${post.slug}`}>
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={post.coverImage || '/images/fromIdeaToInovation.png'}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-linear-to-t from-black/30 to-transparent pointer-events-none"></div>
                        </div>
                        <div className="bottom-4 right-4 z-20">
                          <span className="px-3 py-1.5 text-xs font-semibold text-black">
                            #{categoryLabel(post.category)}
                          </span>
                        </div>
                        <div className="p-6">
                          <h2 className="text-xl font-bold mb-3 text-gray-900 group-hover:text-black transition-colors line-clamp-2">
                            {post.title}
                          </h2>
                          <p className="text-gray-600 mb-4 line-clamp-3">
                            {post.excerpt}
                          </p>
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <div className="flex items-center space-x-4">
                              <span className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {post.readTime} min
                              </span>
                              <span className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {new Date(post.publishedAt).toLocaleDateString(lang)}
                              </span>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center text-black font-semibold group-hover:translate-x-2 transition-transform">
                            {t('article.readMore')} <ArrowRight className="w-4 h-4 ml-2" />
                          </div>
                        </div>
                      </Link>
                    </motion.article>
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Pagination blog">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(current => Math.max(1, current - 1))}
                    >
                      {t('pagination.previousPage', { defaultValue: 'Précédent' })}
                    </Button>
                    <span className="text-sm font-semibold text-gray-700">
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
                    </Button>
                  </nav>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50 text-black">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">{t('cta.title')}</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            {t('cta.description')}
          </p>
          <Button size="lg" className="bg-black text-white hover:bg-gray-800" onClick={() => openConsultationModal()}>
              {t('cta.button')}
            </Button>
        </div>
      </section>
    </>
  );
}