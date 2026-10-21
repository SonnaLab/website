// Mobile screens of the SonnaLab app (390×844 @2x) for the e-mail illustrations.
import { chromium } from 'playwright';
const OUT = process.argv[2];
const WEB = process.env.WEB_URL || 'http://127.0.0.1:5173';
const API = process.env.API_URL || 'http://127.0.0.1:3000';
const auth = await (await fetch(`${API}/api/v1/auth/sign_in`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  // A demo member account (fictional company data only — these screens are public).
  body: JSON.stringify({ email: process.env.DEMO_EMAIL, password: process.env.DEMO_PASSWORD }),
})).json();
const consent = JSON.stringify({ necessary: true, analytics: false, marketing: false, functional: true, timestamp: new Date().toISOString(), version: '1.0.0' });
const ONLY = process.argv[3];
const SHOTS = [
  { key: 'home', path: { fr: '/', en: '/en' } },
  { key: 'services', path: { fr: '/', en: '/en' }, anchor: { fr: 'Sites Web', en: 'Websites' } },
  { key: 'signin', path: { fr: '/sign-in', en: '/sign-in' } },
  { key: 'dashboard', path: { fr: '/dashboard', en: '/dashboard' }, member: true },
  { key: 'invoices', path: { fr: '/dashboard/billing', en: '/dashboard/billing' }, member: true },
  { key: 'quotes', path: { fr: '/dashboard/billing', en: '/dashboard/billing' }, member: true, click: '[role=tab]:nth-child(2)' },
  { key: 'appointments', path: { fr: '/dashboard/appointments', en: '/dashboard/appointments' }, member: true },
  { key: 'blog', path: { fr: '/blog', en: '/en/blog' } },
];
const browser = await chromium.launch();
for (const locale of ['fr', 'en']) {
  for (const shot of SHOTS.filter((s) => !ONLY || s.key === ONLY)) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale });
    await ctx.addInitScript(([a, member, lng, consent]) => {
      localStorage.setItem('i18nextLng', lng);
      localStorage.setItem('cookie_consent', consent);
      if (member) {
        localStorage.setItem('auth_token', a.access_token);
        localStorage.setItem('refresh_token', a.refresh_token);
        localStorage.setItem('auth_user', JSON.stringify(a.user));
      }
    }, [auth, !!shot.member, locale, consent]);
    const page = await ctx.newPage();
    await page.goto(WEB + shot.path[locale], { waitUntil: 'networkidle' });
    if (shot.click) { await page.locator(shot.click).first().click(); await page.waitForTimeout(400); }
    if (shot.anchor) {
      // The service cards (home page, maybe lazy-loaded): scroll down until they render.
      for (let i = 0; i < 30 && !(await page.locator('#services [data-slot=card]').count()); i++) {
        await page.mouse.wheel(0, 700); await page.waitForTimeout(250);
      }
      const top = await page.locator('#services [data-slot=card]').first().evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
      await page.evaluate((y) => window.scrollTo(0, y - 96), top);
      await page.waitForTimeout(1200);
    }
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/${shot.key}-${locale}.png` });
    await ctx.close();
  }
}
await browser.close();
console.log('ok');
