import type { SVGProps } from 'react';

/**
 * Common props for every SonnaLab icon.
 * - `size`        : convenience for width/height (default 16, matches Tailwind size-4).
 * - `className`   : tailwind classes (color via `text-*`, sizing via `size-*`).
 * - `strokeWidth` : matches lucide default (2) for visual continuity.
 */
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  size?: number | string;
  strokeWidth?: number | string;
}

const DEFAULTS = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

export function svgProps({
  size,
  strokeWidth,
  ...rest
}: IconProps): SVGProps<SVGSVGElement> {
  return {
    ...DEFAULTS,
    width:  size ?? DEFAULTS.width,
    height: size ?? DEFAULTS.height,
    strokeWidth: strokeWidth ?? DEFAULTS.strokeWidth,
    ...rest,
  };
}
