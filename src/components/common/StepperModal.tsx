import type { ReactNode } from 'react';
import { Modal } from './Modal';
import { Stepper } from './Stepper';
import { Button } from '@/components/ui/button';

interface StepperModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  badge?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  steps: readonly string[];
  currentStep: number;
  onBack: () => void;
  onNext: () => void;
  /** Libellé du bouton "Suivant" pour l'étape courante — permet à l'appelant
   * de le transformer en action de validation (ex: "Enregistrer") sur une
   * étape intermédiaire, pas seulement sur la dernière. */
  nextLabel?: string;
  nextDisabled?: boolean;
  /** Étape sur laquelle le bouton "Suivant" est remplacé par une action de
   * validation (ex: "Enregistrer"). Par défaut, la dernière étape n'a que
   * "Fermer". */
  finalStepLabel?: string;
  onFinalStep?: () => void;
  finalStepDisabled?: boolean;
  children: ReactNode;
}

/**
 * Modal multi-étapes générique — compose le Modal partagé (components/common/
 * Modal.tsx) et le Stepper partagé (Stepper.tsx) au lieu que chaque modal de
 * l'admin ne redéfinisse sa propre logique de navigation/pied-de-page.
 * N'importe quel step multi-écran de l'admin (clients, modèles, etc.) doit
 * passer par ce composant plutôt que d'en recréer un.
 */
export function StepperModal({
  open, onClose, title, subtitle, badge, size = 'lg',
  steps, currentStep, onBack, onNext, nextLabel = 'Suivant', nextDisabled,
  finalStepLabel, onFinalStep, finalStepDisabled,
  children,
}: StepperModalProps) {
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const showFinalAction = isLast && finalStepLabel && onFinalStep;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      badge={badge}
      size={size}
      footer={
        <div className="flex justify-between w-full">
          {isFirst
            ? <Button variant="outline" onClick={onClose}>Fermer</Button>
            : <Button variant="outline" onClick={onBack}>Retour</Button>}
          {showFinalAction ? (
            <Button onClick={onFinalStep} disabled={finalStepDisabled}>{finalStepLabel}</Button>
          ) : !isLast ? (
            <Button onClick={onNext} disabled={nextDisabled}>{nextLabel}</Button>
          ) : (
            <Button onClick={onClose}>Fermer</Button>
          )}
        </div>
      }
    >
      <Stepper steps={steps} current={currentStep} />
      <div className="mt-5">{children}</div>
    </Modal>
  );
}
