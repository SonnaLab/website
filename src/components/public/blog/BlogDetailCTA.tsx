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
      title: 'Sécurisez vos décisions techniques',
      text: 'Validez votre stack, votre UX et votre roadmap en un diagnostic court et actionnable.',
      action: 'Démarrer mon diagnostic',
    },
    project: {
      title: 'Lancez une app vraiment performante',
      text: 'Cadrons et développons votre produit web avec une trajectoire claire et mesurable.',
      action: 'Décrire mon projet',
    },
  },
  en: {
    diagnostic: {
      title: 'Secure your technical decisions',
      text: 'Validate your stack, UX and roadmap with a short, actionable diagnostic.',
      action: 'Start my diagnostic',
    },
    project: {
      title: 'Launch a truly performant app',
      text: "Let's frame and build your web product with a clear, measurable trajectory.",
      action: 'Describe my project',
    },
  },
  es: {
    diagnostic: {
      title: 'Asegura tus decisiones técnicas',
      text: 'Valida tu stack, UX y roadmap con un diagnóstico breve y accionable.',
      action: 'Iniciar mi diagnóstico',
    },
    project: {
      title: 'Lanza una app de alto rendimiento',
      text: 'Definamos y construyamos tu producto web con una trayectoria clara y medible.',
      action: 'Describir mi proyecto',
    },
  },
  it: {
    diagnostic: {
      title: 'Metti al sicuro le tue scelte tecniche',
      text: 'Valida stack, UX e roadmap con una diagnosi breve e concreta.',
      action: 'Avvia la mia diagnosi',
    },
    project: {
      title: "Lancia un'app davvero performante",
      text: 'Inquadriamo e sviluppiamo il tuo prodotto web con una traiettoria chiara e misurabile.',
      action: 'Descrivi il mio progetto',
    },
  },
  de: {
    diagnostic: {
      title: 'Sichern Sie Ihre technischen Entscheidungen',
      text: 'Validieren Sie Stack, UX und Roadmap mit einer kurzen, umsetzbaren Diagnose.',
      action: 'Diagnose starten',
    },
    project: {
      title: 'Starten Sie eine wirklich performante App',
      text: 'Wir strukturieren und entwickeln Ihr Webprodukt mit klarer, messbarer Ausrichtung.',
      action: 'Projekt beschreiben',
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
