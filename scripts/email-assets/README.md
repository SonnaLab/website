# E-mail assets

Images used by the API's e-mails (`api.sonnalab.com/app/views/mail`), served from
`public/email/`: icon tiles, footer social icons, logo — no words in them — and
the illustrations with words, drawn in every language of the site and the
e-mails (`locales.mjs`: fr, en, de, it, es), `<name>-<locale>.png`:

- `heroes/` — a phone showing the SonnaLab app in that language, with a card
  (`heroes.mjs`: its words per language), one per e-mail;
- `mailbox/` — the « boîte mail professionnelle » e-mail: a hero and one device
  per platform guide, drawn by hand as SVG in `mailbox/*.svg`, their words
  (`{{key}}`) in `mailbox/labels.json`.

The API picks `<name>-<locale>.png` by the e-mail's language (MailHelper#mail_illustration),
and its spec `spec/mailers/illustrations_spec.rb` checks every e-mail in every language.
A new language: add it to `locales.mjs`, to the words of `heroes.mjs` and
`mailbox/labels.json`, then run the scripts below.

Not part of the build: run them by hand when the app's look changes. They need
Playwright (`npx playwright install chromium`), pngquant (`brew install pngquant`)
and, for the screens, the site and the API running locally with a demo member
account (fictional company data only), signed in with its password or with tokens
issued for it (`DEMO_ACCESS_TOKEN`, `DEMO_REFRESH_TOKEN`). `LOCALES=de,it` redraws
only some languages.

```sh
node scripts/email-assets/tiles.mjs                         # icons, social, logo, mark
WEB_URL=http://127.0.0.1:5173 API_URL=http://127.0.0.1:3000 \
DEMO_EMAIL=… DEMO_PASSWORD=… node scripts/email-assets/screens.mjs /tmp/email-screens
node scripts/email-assets/heroes.mjs /tmp/email-screens    # → public/email/heroes
node scripts/email-assets/mailbox.mjs                       # → public/email/mailbox
```

The blog screen needs published articles in each language: take it from the live
site (`WEB_URL=https://sonnalab.com … screens.mjs /tmp/email-screens blog`).

The site's own illustrations with words — the products' sign-in screens on
« Nos projets » — follow the same rule: `node scripts/site-assets/projects.mjs`
(→ `public/projects/<id>-<locale>.png`).
