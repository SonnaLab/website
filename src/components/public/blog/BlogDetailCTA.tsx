import { ArrowRight, CheckCircle2, Rocket } from 'lucide-react';
import { useModal } from '@/components/providers/ModalProvider';

type BlogDetailCTAVariant = 'diagnostic' | 'project';

interface BlogDetailCTAProps {
  variant: BlogDetailCTAVariant;
  lang?: string;
}

const copy = {
  fr: {
    diagnostic: {
      title: 'Clarifier les choix techniques',
      text: 'Un diagnostic court pour valider stack, UX et roadmap.',
      action: 'Lancer le diagnostic',
    },
    project: {
      title: 'Construire une app performante',
      text: 'On cadre et développe votre produit web avec une trajectoire nette.',
      action: 'Ouvrir le brief',
    },
  },
  en: {
    diagnostic: {
      title: 'Clarify technical choices',
      text: 'A short diagnostic to validate stack, UX, and roadmap.',
      action: 'Start the diagnostic',
    },
    project: {
      title: 'Build a performant app',
      text: 'We frame and develop your web product with a clear trajectory.',
      action: 'Open the brief',
    },
  },
} as const;

export function BlogDetailCTA({ variant, lang = 'fr' }: BlogDetailCTAProps) {
  const locale = lang.startsWith('en') ? 'en' : 'fr';
  const content = copy[locale][variant];
  const Icon = variant === 'diagnostic' ? CheckCircle2 : Rocket;
  const { openConsultationModal } = useModal();

  return (
    <aside className={`blog-detail-cta blog-detail-cta--${variant}`} aria-label={content.title}>
      <div className="blog-detail-cta__icon" aria-hidden="true">
        <Icon />
      </div>
      <div className="blog-detail-cta__body">
        <p className="blog-detail-cta__title">{content.title}</p>
        <p className="blog-detail-cta__text">{content.text}</p>
      </div>
      <button
        type="button"
        className="blog-detail-cta__button"
        onClick={() => openConsultationModal()}
      >
        <span>{content.action}</span>
        <ArrowRight aria-hidden="true" />
      </button>
    </aside>
  );
}
