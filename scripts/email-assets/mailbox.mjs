// Illustrations of the « boîte mail professionnelle » e-mail (api.sonnalab.com
// MailboxMailer#setup): a hero and one device per platform guide, drawn by
// hand in scripts/email-assets/mailbox/*.svg — neutral devices, no brand
// logo nor screenshot — with their words ({{key}}) in each language
// (mailbox/labels.json, locales.mjs): <name>-<locale>.png, PNG at 2x since
// many mail clients block SVG. The cards around the words grow to fit them.
// Needs Playwright (npx playwright install chromium) and pngquant.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { LOCALES } from './locales.mjs';
const ROOT = new URL('../../', import.meta.url).pathname;
const SRC = `${ROOT}scripts/email-assets/mailbox`;
const OUT = `${ROOT}public/email/mailbox`;
const LABELS = JSON.parse(readFileSync(`${SRC}/labels.json`, 'utf8'));
const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const browser = await chromium.launch();
const tab = await browser.newPage({ deviceScaleFactor: 2 });
for (const file of readdirSync(SRC).filter((f) => f.endsWith('.svg'))) {
  const name = file.replace(/\.svg$/, '');
  const template = readFileSync(`${SRC}/${file}`, 'utf8');
  const [, width, height] = /width="(\d+)" height="(\d+)"/.exec(template);
  for (const locale of LOCALES) {
    const svg = template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      if (!(key in LABELS[locale])) throw new Error(`${locale}: no label « ${key} »`);
      return escape(LABELS[locale][key]);
    });
    await tab.setViewportSize({ width: Number(width), height: Number(height) });
    await tab.setContent(`<!doctype html><html><head><style>
      @font-face { font-family: Raleway; src: url('file://${ROOT}public/fonts/raleway-latin-variable.woff2'); font-weight: 100 900; }
      * { margin: 0; } body { width: ${width}px; height: ${height}px; overflow: hidden; }
    </style></head><body>${svg}</body></html>`, { waitUntil: 'load' });
    await tab.evaluate(() => document.fonts.ready);
    // A card holds its words: its width follows the longest line.
    await tab.evaluate(() => {
      for (const card of document.querySelectorAll('rect[data-fit]')) {
        const right = Math.max(...[...document.querySelectorAll(`text.${card.dataset.fit}`)].map((t) => { const b = t.getBBox(); return b.x + b.width; }));
        card.setAttribute('width', String(Math.ceil(right - Number(card.getAttribute('x')) + 14)));
      }
    });
    const path = `${OUT}/${name}-${locale}.png`;
    await tab.screenshot({ path, clip: { x: 0, y: 0, width: Number(width), height: Number(height) } });
    execFileSync('pngquant', ['--force', '--quality', '70-92', '--skip-if-larger', '--output', path, path]);
    console.log(`${name}-${locale}`, `${Math.round(statSync(path).size / 1024)} KB`);
  }
}
await browser.close();
