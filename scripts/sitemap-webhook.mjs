import { execFile } from 'child_process';
import { createServer } from 'http';
import { existsSync, readFileSync } from 'fs';

const SITE_ROOT = process.env.SITE_ROOT || '/var/www/sonnalab.com';
const PORT = Number(process.env.SITEMAP_WEBHOOK_PORT || 9876);
const TOKEN_FILE = process.env.SITEMAP_TOKEN_FILE || '/etc/sonnalab/sitemap-token';
const SCRIPT = process.env.SITEMAP_REGEN_SCRIPT || `${SITE_ROOT}/scripts/regen-sitemap.sh`;
const KEY_FILE = process.env.INDEXNOW_KEY_FILE || '/etc/sonnalab/indexnow-keys/66a83429b4bd189df88b9ba77f7037ef.txt';
const INDEXNOW_HOST = process.env.INDEXNOW_HOST || 'sonnalab.com';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const SITEMAP_XML = `${SITE_ROOT}/build/sitemap.xml`;

const TOKEN = readFileSync(TOKEN_FILE, 'utf8').trim();
const INDEXNOW_KEY = existsSync(KEY_FILE)
  ? readFileSync(KEY_FILE, 'utf8').trim()
  : null;

function extractUrls() {
  try {
    const xml = readFileSync(SITEMAP_XML, 'utf8');
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  } catch {
    return [];
  }
}

async function pingIndexNow() {
  if (!INDEXNOW_KEY) return;

  const urls = extractUrls().filter(url => url.startsWith('https://'));
  if (!urls.length) return;

  const body = JSON.stringify({
    host: INDEXNOW_HOST,
    key: INDEXNOW_KEY,
    keyLocation: `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`,
    urlList: urls.slice(0, 10_000),
  });

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    process.stdout.write(`[indexnow] ${response.status} - ${urls.length} URL(s) submitted\n`);
  } catch (error) {
    process.stderr.write(`[indexnow] warn: ${error.message}\n`);
  }
}

createServer((request, response) => {
  if (request.method !== 'POST' || request.url !== '/refresh') {
    response.writeHead(404).end();
    return;
  }

  if (request.headers['x-sitemap-token'] !== TOKEN) {
    response.writeHead(401).end();
    return;
  }

  execFile(SCRIPT, { timeout: 30_000 }, error => {
    if (error) {
      response.writeHead(500).end(error.message);
      return;
    }

    response.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true}');
    pingIndexNow().catch(cause => process.stderr.write(`[indexnow] fatal: ${cause.message}\n`));
  });
}).listen(PORT, '127.0.0.1', () => {
  process.stdout.write(`[sitemap-webhook] listening on 127.0.0.1:${PORT}\n`);
  process.stdout.write(`[sitemap-webhook] IndexNow: ${INDEXNOW_KEY ? `${INDEXNOW_KEY.slice(0, 8)}...` : 'NOT SET'}\n`);
});