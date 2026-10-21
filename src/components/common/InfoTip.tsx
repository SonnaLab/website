import { InfoIcon } from '@icons';

/**
 * A small « i » that tells more on hover (or keyboard focus): the text sits
 * in a bubble to its right, or below it. CSS only (`.info-tip`), SSR-safe.
 */
export function InfoTip({ text, placement = 'right', size = 14 }: {
  text: string;
  placement?: 'right' | 'bottom';
  size?: number;
}) {
  return (
    <span className={`info-tip info-tip--${placement}`} tabIndex={0} aria-label={text}>
      <InfoIcon size={size} aria-hidden="true" />
      <span className="info-tip__bubble" role="tooltip">{text}</span>
    </span>
  );
}
