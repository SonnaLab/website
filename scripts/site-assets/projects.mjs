// The products' sign-in screens on « Nos projets » (public/projects/<id>-<locale>.png),
// in every language of the site: each screenshot (site-assets/projects/<id>.png)
// gets its words hidden and typed again in the language (layout.json says where,
// labels.json what; **…** is the bold part). Needs Playwright
// (npx playwright install chromium) and pngquant.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { LOCALES } from '../email-assets/locales.mjs';
const ROOT = new URL('../../', import.meta.url).pathname;
const SRC = `${ROOT}scripts/site-assets/projects`;
const OUT = `${ROOT}public/projects`;
const LAYOUT = JSON.parse(readFileSync(`${SRC}/layout.json`, 'utf8'));
const LABELS = JSON.parse(readFileSync(`${SRC}/labels.json`, 'utf8'));
const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const browser = await chromium.launch();
const tab = await browser.newPage();
for (const [id, { items }] of Object.entries(LAYOUT).filter(([key]) => !key.startsWith('_'))) {
  const base = `${SRC}/${id}.png`;
  const [width, height] = execFileSync('magick', ['identify', '-format', '%w %h', base]).toString().split(' ').map(Number);
  for (const locale of LOCALES) {
    const words = LABELS[id][locale];
    const html = items.map((item) => {
      if (!(item.key in words)) throw new Error(`${id} ${locale}: no « ${item.key} »`);
      const [x0, y0, x1, y1, bg] = item.mask;
      const text = escape(words[item.key]).replace(/\*\*(.+?)\*\*/g,
        `<b style="color:${item.strong || item.color};font-weight:${item.strongWeight || 800}">$1</b>`);
      const box = item.align === 'center' ? `left:${item.x - 300}px;width:600px;text-align:center`
        : item.align === 'right' ? `right:${width - item.x}px;text-align:right` : `left:${item.x}px`;
      return `<div style="position:absolute;left:${x0}px;top:${y0}px;width:${x1 - x0}px;height:${y1 - y0}px;background:${bg}"></div>
        <div style="position:absolute;${box};top:${item.y - 20}px;height:40px;line-height:40px;white-space:nowrap;font-size:${item.size}px;font-weight:${item.weight};color:${item.color}">${text}</div>`;
    }).join('');
    await tab.setViewportSize({ width, height });
    await tab.setContent(`<!doctype html><html><head><style>
      @font-face { font-family: Raleway; src: url('file://${ROOT}public/fonts/raleway-latin-variable.woff2'); font-weight: 100 900; }
      * { margin: 0; } body { position: relative; width: ${width}px; height: ${height}px; overflow: hidden; font-family: Raleway, Helvetica, Arial, sans-serif; }
    </style></head><body><img src="data:image/png;base64,${readFileSync(base).toString('base64')}" style="position:absolute;left:0;top:0">${html}</body></html>`, { waitUntil: 'load' });
    await tab.evaluate(() => document.fonts.ready);
    const path = `${OUT}/${id}-${locale}.png`;
    await tab.screenshot({ path, clip: { x: 0, y: 0, width, height } });
    execFileSync('pngquant', ['--force', '--quality', '75-95', '--skip-if-larger', '--output', path, path]);
    console.log(`${id}-${locale}`, `${Math.round(statSync(path).size / 1024)} KB`);
  }
}
await browser.close();
