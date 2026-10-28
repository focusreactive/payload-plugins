#!/usr/bin/env bash
# The gate every ticket must pass: types, lint, unit and integration tests, build, browser smoke.
set -euo pipefail

packageDirectory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repositoryRoot="$(cd "$packageDirectory/../.." && pwd)"

step() {
  printf '\n==> %s\n' "$1"
}

cd "$packageDirectory"

step "typecheck"
npm run typecheck

step "lint and format (ultracite, from the repo root)"
(cd "$repositoryRoot" && bunx ultracite check packages/payload-plugin-folders)

step "unit tests"
npm run test:unit

step "integration tests (SQLite)"
npm run test:int

step "integration tests (Postgres)"
npm run test:int:postgres

step "build"
npm run build

step "browser smoke test"
if lsof -nP -iTCP:4078 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Something is listening on port 4078: stop the dev server on 4078 first" >&2
  exit 1
fi
npx playwright test tests/e2e/smoke.e2e.spec.ts

printf '\ncheck.sh passed\n'
