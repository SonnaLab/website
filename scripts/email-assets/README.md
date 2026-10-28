# E-mail assets

Images used by the API's e-mails (`api.sonnalab.com/app/views/mail`), served from
`public/email/`: icon tiles, footer social icons, logo, and the heroes — a phone
showing the SonnaLab app, one per e-mail and per locale (fr/en; the e-mails in
German, Italian and Spanish show the English one) — and the illustrations of the
« boîte mail professionnelle » e-mail (`mailbox/`: a hero and one device per
platform guide), drawn by hand as SVG in `scripts/email-assets/mailbox/`, with no
text so they serve every language.

Not part of the build: run them by hand when the app's look changes. They need
Playwright (`npx playwright install chromium`) and, for the screens, the site and
the API running locally with a demo member account (fictional company data only).

```sh
node scripts/email-assets/tiles.mjs                         # icons, social, logo, mark
WEB_URL=http://127.0.0.1:5173 API_URL=http://127.0.0.1:3000 \
DEMO_EMAIL=… DEMO_PASSWORD=… node scripts/email-assets/screens.mjs /tmp/email-screens
node scripts/email-assets/heroes.mjs /tmp/email-screens    # → public/email/heroes
```

The mailbox illustrations only need rsvg-convert and pngquant (`brew install librsvg pngquant`):

```sh
node scripts/email-assets/mailbox.mjs                       # → public/email/mailbox
```
