#!/bin/sh
# Replaces Vercel's cron for the scheduling plugin: every minute ask the CMS to publish what is due.
# The endpoint is protected with the CRON_SECRET bearer token (see payload-plugin-scheduling).
set -eu
: "${CMS_URL:=http://cms:3000}"
: "${CRON_SECRET:?CRON_SECRET is required}"
: "${INTERVAL_SECONDS:=60}"
while true; do
  if curl -fsS -m 30 -H "Authorization: Bearer ${CRON_SECRET}" "${CMS_URL}/api/scheduled-publish/run" >/dev/null; then
    echo "$(date -u +%FT%TZ) scheduled-publish: ok"
  else
    echo "$(date -u +%FT%TZ) scheduled-publish: request failed" >&2
  fi
  sleep "${INTERVAL_SECONDS}"
done
