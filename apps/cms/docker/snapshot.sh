#!/bin/sh
# DEMO ONLY — produces "the static website" from the running CMS by mirroring it.
# In production the GitLab pipeline builds the static site; this script shows the same hand-off:
# publish → files → Nginx. Output goes to /out (mounted to apps/cms/.local/site).
set -eu
: "${CMS_URL:=http://cms:3000}"
: "${OUT:=/out}"
apt-get update >/dev/null && apt-get install -y --no-install-recommends wget ca-certificates >/dev/null
rm -rf "${OUT:?}"/* && mkdir -p "$OUT"
# --mirror follows internal links; --page-requisites pulls CSS/JS/images; --adjust-extension gives
# .html names; --convert-links rewrites absolute links to relative ones; the reject list keeps the
# admin, API and preview out of the public bundle.
wget --mirror --page-requisites --adjust-extension --convert-links --no-parent --no-host-directories \
     --reject-regex '/(admin|api|next)(/|$)' --wait=0.2 --tries=2 --quiet --show-progress \
     -P "$OUT" "${CMS_URL}/en" "${CMS_URL}/feeds/all.atom.xml" "${CMS_URL}/feeds/all.rss.xml" "${CMS_URL}/robots.txt" "${CMS_URL}/sitemap.xml" "${CMS_URL}/llms.txt" || true
[ -f "$OUT/index.html" ] || cp "$OUT/en.html" "$OUT/index.html" 2>/dev/null || true
echo "snapshot: $(find "$OUT" -type f | wc -l) files in $OUT"
