# E-mail assets

Images used by the API's e-mails (`api.sonnalab.com/app/views/mail`), served from
`public/email/`: icon tiles, footer social icons, logo, and the heroes — a phone
showing the SonnaLab app, one per e-mail and per locale (fr/en).

Not part of the build: run them by hand when the app's look changes. They need
Playwright (`npx playwright install chromium`) and, for the screens, the site and
the API running locally with a demo member account (fictional company data only).

```sh
node scripts/email-assets/tiles.mjs                         # icons, social, logo, mark
WEB_URL=http://127.0.0.1:5173 API_URL=http://127.0.0.1:3000 \
DEMO_EMAIL=… DEMO_PASSWORD=… node scripts/email-assets/screens.mjs /tmp/email-screens
node scripts/email-assets/heroes.mjs /tmp/email-screens    # → public/email/heroes
```
