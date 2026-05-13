import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Rocket, Smartphone } from 'lucide-react';

type BlogDetailCTAVariant = 'diagnostic' | 'project';

interface BlogDetailCTAProps {
  variant: BlogDetailCTAVariant;
  lang?: string;
}

const copy = {
  fr: {
    diagnostic: {
      eyebrow: 'Diagnostic SonnaLab',
      title: 'Vous voulez valider les choix techniques de votre projet ?',
      text: 'On analyse votre stack, vos parcours et vos priorites pour clarifier les prochaines decisions produit.',
      action: 'Demander un diagnostic',
      chips: ['Audit stack', 'UX produit', 'Roadmap claire'],
    },
    project: {
      eyebrow: 'Equipe produit',
      title: 'Besoin de construire une application web performante ?',
      text: 'SonnaLab accompagne la conception, le developpement et l optimisation de produits React, Next.js et SaaS.',
      action: 'Parler du projet',
      chips: ['React & Next.js', 'Performance', 'SEO technique'],
    },
  },
  en: {
    diagnostic: {
      eyebrow: 'SonnaLab diagnostic',
      title: 'Want to validate your project technical choices?',
      text: 'We review your stack, user flows, and product priorities so the next decisions are easier to make.',
      action: 'Request a diagnostic',
      chips: ['Stack audit', 'Product UX', 'Clear roadmap'],
    },
    project: {
      eyebrow: 'Product team',
      title: 'Need to build a high-performing web application?',
      text: 'SonnaLab supports product design, development, and optimization for React, Next.js, and SaaS platforms.',
      action: 'Talk about the project',
      chips: ['React & Next.js', 'Performance', 'Technical SEO'],
    },
  },
} as const;

export function BlogDetailCTA({ variant, lang = 'fr' }: BlogDetailCTAProps) {
  const locale = lang.startsWith('en') ? 'en' : 'fr';
  const content = copy[locale][variant];
  const Icon = variant === 'diagnostic' ? CheckCircle2 : Rocket;
  const BadgeIcon = variant === 'diagnostic' ? Smartphone : Rocket;

  return (
    <aside className={`blog-detail-cta blog-detail-cta--${variant}`} aria-label={content.eyebrow}>
      <div className="blog-detail-cta__icon" aria-hidden="true">
        <Icon />
      </div>
      <div className="blog-detail-cta__body">
        <span className="blog-detail-cta__eyebrow">
          <BadgeIcon aria-hidden="true" />
          {content.eyebrow}
        </span>
        <p className="blog-detail-cta__title">{content.title}</p>
        <p className="blog-detail-cta__text">{content.text}</p>
        <div className="blog-detail-cta__chips" aria-hidden="true">
          {content.chips.map((chip) => (
            <span key={chip}>{chip}</span>
          ))}
        </div>
      </div>
      <Link to="/contact" className="blog-detail-cta__button">
        <span>{content.action}</span>
        <ArrowRight aria-hidden="true" />
      </Link>
    </aside>
  );
}
