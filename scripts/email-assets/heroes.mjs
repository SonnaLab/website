// E-mail heroes: a SonnaLab mobile screen in a phone, on the brand's grey,
// with a floating card (as on the site's « +03 Années d'expertise »).
// 600×360 drawn at 2x → 1200×720 PNG, one per locale.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const ROOT = new URL('../../', import.meta.url).pathname;
const SCREENS = process.argv[2];
const OUT = process.argv[3] || `${ROOT}public/email/heroes`;
const ICONS = `${ROOT}public/email/icons`;
const b64 = (path) => `data:image/png;base64,${readFileSync(path).toString('base64')}`;
const HEROES = {
  welcome:    { screen: 'home',      icon: 'check-circle-success', side: 'left',  fr: ['Compte créé', 'Bienvenue chez SonnaLab'],      en: ['Account created', 'Welcome to SonnaLab'] },
  password:   { screen: 'signin',    icon: 'lock',                 side: 'right', fr: ['Mot de passe', 'Lien sécurisé'],              en: ['Password', 'Secure link'] },
  invitation: { screen: 'dashboard', icon: 'users',                side: 'left',  fr: ['Votre équipe', 'Projets, devis et factures'], en: ['Your team', 'Projects, quotes, invoices'] },
  quote:      { screen: 'quotes',    icon: 'file-text',            side: 'right', fr: ['Nouveau devis', 'PDF en pièce jointe'],       en: ['New quote', 'PDF attached'] },
  invoice:    { screen: 'invoices',  icon: 'receipt',              side: 'left',  fr: ['Nouvelle facture', 'PDF en pièce jointe'],    en: ['New invoice', 'PDF attached'] },
  reminder:   { screen: 'invoices',  icon: 'clock-warning',        side: 'right', fr: ['Reste à payer', 'Échéance à surveiller'],     en: ['Balance due', 'Mind the due date'] },
  payment:    { screen: 'invoices',  icon: 'check-circle-success', side: 'left',  fr: ['Paiement reçu', 'Merci !'],                   en: ['Payment received', 'Thank you!'] },
  request:    { screen: 'services',  icon: 'zap',                  side: 'right', fr: ['Demande reçue', 'Réponse sous 48 h'],         en: ['Request received', 'Answer within 48 h'] },
};
const page = (h, locale) => {
  const [title, sub] = h[locale];
  const chipLeft = h.side === 'left';
  return `<!doctype html><html><head><style>
  @font-face { font-family: Raleway; src: url('file://${ROOT}public/fonts/raleway-latin-variable.woff2'); font-weight: 100 900; }
  * { box-sizing: border-box; margin: 0; }
  body { width: 600px; height: 360px; overflow: hidden; font-family: Raleway, Helvetica, Arial, sans-serif; }
  .hero { position: relative; width: 600px; height: 360px; overflow: hidden; background: #f4f4f5; }
  .ring { position: absolute; border-radius: 50%; }
  .ring--a { width: 420px; height: 420px; left: -120px; top: -150px; background: #ececee; }
  .ring--b { width: 300px; height: 300px; right: -70px; bottom: -150px; background: #f6e86f; opacity: .55; }
  .dots { position: absolute; right: 36px; top: 30px; width: 96px; height: 64px; background-image: radial-gradient(#c9c9ce 1.4px, transparent 1.5px); background-size: 12px 12px; }
  .phone { position: absolute; left: 50%; top: 30px; width: 226px; height: 470px; margin-left: -113px; padding: 8px; border-radius: 38px; background: #0f0f0f; box-shadow: 0 30px 60px rgba(15,15,15,.18), 0 8px 18px rgba(15,15,15,.12); }
  .screen { position: relative; width: 210px; height: 454px; overflow: hidden; border-radius: 30px; background: #fff; }
  .screen img { width: 210px; display: block; }
  .island { position: absolute; left: 50%; top: 8px; width: 62px; height: 18px; margin-left: -31px; border-radius: 10px; background: #0f0f0f; }
  .status { display: flex; align-items: center; justify-content: space-between; height: 32px; padding: 4px 20px 0 26px; background: #fff; font-size: 11px; font-weight: 700; color: #0f0f0f; }
  .status i { display: flex; gap: 3px; align-items: center; }
  .status i::before { content: ''; width: 14px; height: 8px; border-radius: 2px; background: linear-gradient(90deg, #0f0f0f 0 22%, transparent 22% 26%, #0f0f0f 26% 48%, transparent 48% 52%, #0f0f0f 52% 74%, transparent 74% 78%, #0f0f0f 78%); }
  .status i::after { content: ''; width: 18px; height: 9px; border-radius: 3px; border: 1.5px solid #0f0f0f; box-shadow: inset 0 0 0 1.5px #fff; background: #0f0f0f; }
  .chip { position: absolute; top: 150px; ${chipLeft ? 'left: 70px' : 'right: 70px'}; display: flex; align-items: center; gap: 12px; padding: 12px 18px 12px 12px; border-radius: 18px; background: #fff; box-shadow: 0 18px 40px rgba(15,15,15,.14); }
  .chip img { width: 40px; height: 40px; }
  .chip b { display: block; font-size: 15px; font-weight: 800; color: #0f0f0f; letter-spacing: -.01em; }
  .chip span { display: block; margin-top: 2px; font-size: 11.5px; color: #6b7280; }
  </style></head><body><div class="hero">
    <div class="ring ring--a"></div><div class="ring ring--b"></div><div class="dots"></div>
    <div class="phone"><div class="screen"><div class="status"><span>9:41</span><i></i></div><img src="${b64(`${SCREENS}/${h.screen}-${locale}.png`)}"></div><div class="island"></div></div>
    <div class="chip"><img src="${b64(`${ICONS}/${h.icon}.png`)}"><div><b>${title}</b><span>${sub}</span></div></div>
  </div></body></html>`;
};
const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: 600, height: 360 }, deviceScaleFactor: 2 });
for (const [key, h] of Object.entries(HEROES)) for (const locale of ['fr', 'en']) {
  await tab.setContent(page(h, locale), { waitUntil: 'load' });
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: `${OUT}/${key}-${locale}.png` });
}
await browser.close();
console.log('heroes', Object.keys(HEROES).length * 2);
