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
  es: {
    diagnostic: {
      title: 'Aclarar las decisiones técnicas',
      text: 'Un diagnóstico breve para validar stack, UX y roadmap.',
      action: 'Iniciar el diagnóstico',
    },
    project: {
      title: 'Crear una app de alto rendimiento',
      text: 'Encuadramos y desarrollamos tu producto web con una trayectoria clara.',
      action: 'Abrir el brief',
    },
  },
  it: {
    diagnostic: {
      title: 'Chiarire le scelte tecniche',
      text: 'Una breve diagnosi per validare stack, UX e roadmap.',
      action: 'Avvia la diagnosi',
    },
    project: {
      title: 'Costruire un\'app performante',
      text: 'Inquadriamo e sviluppiamo il tuo prodotto web con una traiettoria chiara.',
      action: 'Apri il brief',
    },
  },
  de: {
    diagnostic: {
      title: 'Technische Entscheidungen klären',
      text: 'Eine kurze Diagnose, um Stack, UX und Roadmap zu validieren.',
      action: 'Diagnose starten',
    },
    project: {
      title: 'Eine performante App bauen',
      text: 'Wir strukturieren und entwickeln Ihr Webprodukt mit klarer Ausrichtung.',
      action: 'Brief öffnen',
    },
  },
} as const;

const SUPPORTED_LOCALES = ['fr', 'en', 'es', 'it', 'de'] as const;
type CTALocale = (typeof SUPPORTED_LOCALES)[number];

export function BlogDetailCTA({ variant, lang = 'fr' }: BlogDetailCTAProps) {
  const prefix = lang.slice(0, 2).toLowerCase();
  const locale: CTALocale = (SUPPORTED_LOCALES as readonly string[]).includes(prefix)
    ? (prefix as CTALocale)
    : 'fr';
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
