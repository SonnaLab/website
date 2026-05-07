import { Link } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface RelatedArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  readTime: number;
  category: string;
}

interface RelatedArticlesProps {
  articles: RelatedArticle[];
  title?: string;
  lang: 'fr' | 'en';
}

export function RelatedArticles({ articles, title = "Articles similaires", lang }: RelatedArticlesProps) {
  if (articles.length === 0) return null;

  return (
    <section className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
      <div className="border-b-2 border-gray-200 pb-4 mb-8">
        <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {articles.map((article, index) => (
          <motion.article
            key={article.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Link
              to={`/${lang === 'en' ? 'en/' : ''}blog/${article.slug}`}
              className="group block bg-gray-50 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300"
            >
              <div className="aspect-video overflow-hidden relative">
                <img
                  src={article.coverImage}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-black">
                    {article.category}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-bold text-xl mb-3 text-gray-900 group-hover:text-black transition-colors line-clamp-2">
                  {article.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {article.excerpt}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>{article.readTime} min</span>
                  </div>
                  <span className="text-black font-semibold text-sm flex items-center group-hover:translate-x-1 transition-transform">
                    Lire l'article <ArrowRight className="w-4 h-4 ml-1" />
                  </span>
                </div>
              </div>
            </Link>
          </motion.article>
        ))}
      </div>
    </section>
  );
}