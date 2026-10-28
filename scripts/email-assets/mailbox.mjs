// Illustrations of the « boîte mail professionnelle » e-mail (api.sonnalab.com
// MailboxMailer#setup): a hero and one device per platform guide, drawn by
// hand in scripts/email-assets/mailbox/*.svg — neutral devices, no brand
// logo nor screenshot, no text (one image for every language). PNG at 2x,
// since many mail clients block SVG. Needs rsvg-convert and pngquant
// (brew install librsvg pngquant).
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
const ROOT = new URL('../../', import.meta.url).pathname;
const SRC = `${ROOT}scripts/email-assets/mailbox`;
const OUT = `${ROOT}public/email/mailbox`;
for (const file of readdirSync(SRC).filter((f) => f.endsWith('.svg'))) {
  const name = file.replace(/\.svg$/, '');
  const width = Number(/width="(\d+)"/.exec(execFileSync('head', ['-c', '200', `${SRC}/${file}`]).toString())[1]) * 2;
  execFileSync('rsvg-convert', ['-w', String(width), `${SRC}/${file}`, '-o', `${OUT}/${name}.png`]);
  execFileSync('pngquant', ['--force', '--quality', '70-92', '--skip-if-larger', '--output', `${OUT}/${name}.png`, `${OUT}/${name}.png`]);
  console.log(name, `${Math.round(statSync(`${OUT}/${name}.png`).size / 1024)} KB`);
}
