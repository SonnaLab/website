#!/bin/bash
set -euo pipefail

SITE_ROOT="${SITE_ROOT:-/var/www/sonnalab.com}"

cd "$SITE_ROOT"
# Production React (NODE_ENV): the development build printed a "useLayoutEffect
# does nothing on the server" warning with its whole component stack for every
# page -- ~470 000 lines per run, ~1 GB of /var/log/sonnalab-sitemap.log a day
# (2026-10-10). Only the summary lines are kept, like the other hourly
# prerenders on this VPS; pipefail still reports a failed run.
NODE_ENV=production node scripts/prerender-blog.mjs 2>&1 | tail -3
node scripts/generate-sitemap.mjs > build/sitemap.xml
echo "[$(date -u '+%Y-%m-%d %H:%M:%S')] sitemap + prerender regenerated" >> /var/log/sonnalab-sitemap.log
