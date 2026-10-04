#!/bin/sh
# Entrypoint for the `cms` image.
#
# Database migrations: the Postgres adapter is configured with `prodMigrations`, so Payload applies
# pending migrations itself when the server initialises in production. Nothing to do here except
# fail early with a readable message when the required variables are missing.
set -eu

missing=""
for v in DATABASE_URL PAYLOAD_SECRET NEXT_PUBLIC_SERVER_URL; do
  eval "val=\${$v:-}"
  [ -n "$val" ] || missing="$missing $v"
done
if [ -n "$missing" ]; then
  echo "entrypoint: missing required environment variables:$missing" >&2
  exit 64
fi

echo "entrypoint: starting CT CMS on :${PORT:-3000} (NODE_ENV=${NODE_ENV:-production})"
exec "$@"
