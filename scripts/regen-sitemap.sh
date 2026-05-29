#!/bin/bash
set -euo pipefail

SITE_ROOT="${SITE_ROOT:-/var/www/sonnalab.com}"

cd "$SITE_ROOT"
node scripts/prerender-blog.mjs
node scripts/generate-sitemap.mjs > build/sitemap.xml
echo "[$(date -u '+%Y-%m-%d %H:%M:%S')] sitemap + prerender regenerated" >> /var/log/sonnalab-sitemap.log
