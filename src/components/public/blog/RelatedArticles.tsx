import { Link } from 'react-router-dom';
import { Clock, ArrowRight, BookOpen } from 'lucide-react';
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

export function RelatedArticles({ articles, title = "Articles qui pourraient vous intéresser", lang }: RelatedArticlesProps) {
  return (
    <section className="blog-related-section">
      <div className="blog-related-section__header">
        <p className="blog-related-section__eyebrow">
          <BookOpen aria-hidden="true" />
          <span>POUR ALLER PLUS LOIN</span>
        </p>
        <h2>{title}</h2>
        <span>
          Sélectionnés selon vos centres d'intérêt — similaires ou complémentaires à ce que vous venez de lire.
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
              to={`/${lang === 'en' ? 'en/' : ''}blog/${article.slug}`}
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