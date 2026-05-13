import { Link } from 'react-router-dom';
import { Clock, ArrowRight, Dumbbell } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

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
  lang?: string;
}

export function RelatedArticles({ articles, title, lang: _lang }: RelatedArticlesProps) {
  const { t } = useTranslation('blog');
  const displayTitle = title ?? t('article.relatedPosts');
  return (
    <section className="blog-related-section">
      <div className="blog-related-section__header">
        <p className="blog-related-section__eyebrow">
          <Dumbbell aria-hidden="true"  />
          <span>{t('article.readMore')}</span>
        </p>
        <h2>{displayTitle}</h2>
        <span>
          {t('article.relatedSubtitle')}
        </span>
      </div>
      
      {articles.length > 0 && <div className="blog-related-grid">
        {articles.map((article, index) => (
          <motion.article
            key={article.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="blog-related-card"
          >
            <Link
            to={`/blog/${article.slug}`}
              className="blog-related-card__link"
            >
              <div className="blog-related-card__media">
                <img
                  src={article.coverImage}
                  alt={article.title}
                  className="blog-related-card__image"
                  loading="lazy"
                />
                <span className="blog-related-card__category">
                  {article.category}
                </span>
              </div>
              <div className="blog-related-card__body">
                <h3>
                  {article.title}
                </h3>
                <p>
                  {article.excerpt}
                </p>
                <div className="blog-related-card__meta">
                  <span>
                    <Clock aria-hidden="true" />
                    <span>{article.readTime} min</span>
                  </span>
                </div>
              </div>
              <div className="blog-related-card__footer" aria-hidden="true">
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
      </div>}
    </section>
  );
}