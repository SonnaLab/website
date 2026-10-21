// Icon tiles (48px shown, 96px drawn), footer social circles, logo and mark.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { svg } from './icons.mjs';
const ROOT = new URL('../../', import.meta.url).pathname;
const OUT = process.argv[2] || `${ROOT}public/email`;
const TILES = {
  calendar: 'Calendar', 'file-text': 'FileText', receipt: 'Receipt', wallet: 'Wallet', 'check-circle': 'CheckCircle',
  users: 'Users', user: 'User', lock: 'Lock', zap: 'Zap', clock: 'Clock', download: 'Download',
  'folder-kanban': 'FolderKanban', shield: 'Shield', globe: 'Globe', target: 'Target', 'layout-dashboard': 'LayoutDashboard',
  briefcase: 'Briefcase', send: 'Send', 'alert-triangle': 'AlertTriangle', 'trending-up': 'TrendingUp', sparkles: 'Sparkles',
  smartphone: 'Smartphone', 'shopping-cart': 'ShoppingCart', palette: 'Palette', code: 'Code', 'bar-chart': 'BarChart',
};
const TONES = { '': ['#f3f4f6', '#111111'], '-success': ['#e9f8ee', '#16a34a'], '-warning': ['#fff4e0', '#d97706'] };
const tiles = [];
for (const [file, name] of Object.entries(TILES)) for (const [suffix, [bg, fg]] of Object.entries(TONES)) {
  tiles.push({ file: `icons/${file}${suffix}.png`, html: `<div style="width:96px;height:96px;border-radius:24px;background:${bg};display:flex;align-items:center;justify-content:center">${svg(name, { size: 44, stroke: fg, width: 1.8 })}</div>` });
}
for (const [file, name] of Object.entries({ linkedin: 'Linkedin', instagram: 'Instagram', github: 'Github', twitter: 'Twitter' })) {
  tiles.push({ file: `social/${file}.png`, html: `<div style="width:72px;height:72px;border-radius:36px;background:#f3f4f6;display:flex;align-items:center;justify-content:center">${svg(name, { size: 30, stroke: '#111111', width: 1.8 })}</div>` });
}
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const t of tiles) {
  await page.setContent(`<html><body style="margin:0;background:transparent">${t.html}</body></html>`);
  await page.locator('body > div').screenshot({ path: `${OUT}/${t.file}`, omitBackground: true });
}
await browser.close();
// Logo (shown 168px wide) and the round mark (footer).
execSync(`sips -Z 336 "${ROOT}src/assets/logo/bSonnaLab.png" --out "${OUT}/logo.png"`);
execSync(`sips -Z 64 "${ROOT}public/favicon/android-chrome-192x192.png" --out "${OUT}/mark.png"`);
console.log('tiles', tiles.length);
