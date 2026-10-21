// Pulls the SVG bodies out of sonnalab.com/src/icons/icons.tsx (lucide drawings).
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../../src/icons/icons.tsx', import.meta.url), 'utf8');
export const icons = {};
for (const m of src.matchAll(/export function (\w+)Icon\(p: IconProps\) \{\s*return \(\s*<svg \{\.\.\.svgProps\(p\)\}>([\s\S]*?)<\/svg>/g)) {
  icons[m[1]] = m[2].replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim();
}
// Brand glyphs (lucide) missing from the site's set.
icons.Instagram = '<rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />';
icons.Github = '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" />';
// The services (sonnalab.com « Nos services »), for the promo block of every e-mail.
icons.Smartphone = '<rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" />';
icons.ShoppingCart = '<circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />';
icons.Palette = '<circle cx="13.5" cy="6.5" r="1" /><circle cx="17.5" cy="10.5" r="1" /><circle cx="8.5" cy="7.5" r="1" /><circle cx="6.5" cy="12.5" r="1" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />';
icons.Code = '<polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />';
icons.BarChart = '<path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />';
icons.Twitter = '<path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />';
export const svg = (name, { size = 24, stroke = '#111111', width = 1.8 } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
