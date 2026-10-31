#!/usr/bin/env bash
# The gate every ticket must pass: types, lint, unit and integration tests, build, browser tests.
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

step "perf budgets (SQLite, one file at a time)"
npm run test:perf

step "build"
npm run build

step "browser tests (smoke test, then the tree view specs)"
if lsof -nP -iTCP:4078 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Something is listening on port 4078: stop the dev server on 4078 first" >&2
  exit 1
fi
if lsof -nP -iTCP:4079 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Something is listening on port 4079: stop the stock-list dev server on 4079 first" >&2
  exit 1
fi
# One run for every spec in tests/e2e, in file order (smoke first): the dev server starts once and
# the seed runs once.
npx playwright test
# Playwright kills the dev server's process group; confirm nothing is left on the ports.
if lsof -nP -iTCP:4078 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "The dev server is still listening on port 4078 after the browser tests" >&2
  exit 1
fi
if lsof -nP -iTCP:4079 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "The stock-list dev server is still listening on port 4079 after the browser tests" >&2
  exit 1
fi

printf '\ncheck.sh passed\n'
