import { CheckIcon } from '@icons';

interface StepperProps {
  steps: readonly string[];
  current: number; // index 0-based
}

/**
 * Indicateur d'étapes générique — pas de couplage à un flux particulier
 * (contrairement à components/modals/steps/StepIndicator.tsx, propre au
 * flow de consultation marketing). Réutilisable par tout modal multi-étapes
 * de l'admin (voir StepperModal.tsx).
 */
export function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className="adm-stepper" aria-label="Étapes">
      {steps.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'upcoming';
        return (
          <li key={label} className={`adm-stepper__item adm-stepper__item--${state}`}>
            <div className="adm-stepper__node">
              <span className="adm-stepper__circle" aria-hidden="true">
                {state === 'done' ? <CheckIcon size={12} /> : i + 1}
              </span>
              <span className="adm-stepper__label">{label}</span>
            </div>
            {i < steps.length - 1 && <span className="adm-stepper__connector" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
