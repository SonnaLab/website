import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Search, Clock, Calendar, ArrowRight, NewspaperIcon } from 'lucide-react';
import { SEO } from '@/components/seo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getBlogPostsByLang } from '@/data/blogLoader';
import { motion } from 'framer-motion';
import { useModal } from '@/components/providers/ModalProvider';

export default function Blog() {
  const { t, i18n } = useTranslation('blog');
  const lang = i18n.language as 'fr' | 'en';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const blogPosts = getBlogPostsByLang(lang);
  const { openConsultationModal } = useModal();

  const categories = [
    { id: 'all', label: t('categories.all') },
    { id: 'innovation', label: t('categories.innovation') },
    { id: 'coding', label: t('categories.coding') },
    { id: 'ia', label: t('categories.ia') },
    { id: 'case-studies', label: t('categories.case-studies') },
    { id: 'ecology', label: t('categories.ecology') },
    { id: 'tips', label: t('categories.tips') },
  ];

  const filteredPosts = useMemo(() => {
    return blogPosts.filter(post => {
      const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory, blogPosts]);

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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border border-gray-300 focus:border-black"
                />
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                {categories.map(category => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.label}
                  </Button>
                ))}
              </div>
            </div>

            {searchQuery && (
              <p className="text-gray-600 mb-6">
                {t('search.results', { count: filteredPosts.length })}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {filteredPosts.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 text-lg">{t('search.noResults')}</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredPosts.map((post, index) => (
                  <motion.article
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group"
                  >
                    <Link to={`/blog/${post.slug}`}>
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={post.coverImage}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/30 to-transparent pointer-events-none"></div>
                      </div>
                      <div className="bottom-4 right-4 z-20">
                        <span className="px-3 py-1.5 text-xs font-semibold text-black">
                          #{t(`categories.${post.category}`)}
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