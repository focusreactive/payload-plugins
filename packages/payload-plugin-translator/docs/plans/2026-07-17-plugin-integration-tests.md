# Design (proposal) — integration tests for the translator plugin

**Date:** 2026-07-17
**Status:** proposal — approach/scope not yet confirmed (see Open decisions). No code yet.
**Motivation:** a real data-flow bug (source content wiped on full-document translation — the
block/array-id reconciler bug, fixed in `c0a49d1b`) shipped because it was only catchable by
exercising the plugin against a live Payload, and nothing did that automatically. Manual click-through
is the only current end-to-end check.

## Current test reality (audit)

- **Unit tests** — ~1097 (vitest, `environment: node`, `src/**/*.test.ts`). All mock-based: policy,
  hooks (mock runner), config readers, pipeline pieces, routes (mock `PayloadRequest`). **No real Payload
  boot.** `plugin.test.ts` runs the plugin *function* over a mock `Config` object (config transformation),
  not a live instance.
- **One integration-style harness** — `apps/dev/scripts/verify-provenance.ts`: boots real Payload
  (`getPayload`) against sqlite/postgres/mongo, exercises the provenance sidecar via the local API with
  hand-rolled `ok/fail`. Covers **only provenance**; run manually (`verify:provenance:*`), not vitest.
- **`apps/cms/playwright.config.ts`** — Playwright exists, but for the CMS boilerplate app, not the plugin.
- **CI** — only `release.yml`. **No workflow runs tests** — neither unit nor integration gate PRs/main.

Gap: the whole translation *data flow* (source → pipeline → target-locale write, across nested
blocks/arrays/tabs, on a real DB) is untested end-to-end.

## Recommended approach (spine)

**Vitest integration tests that boot Payload on sqlite (in-memory / temp file) and drive the real flows
through the local API.** Fast, no browser, no external services — but real hooks, real pipeline, real DB
writes. This is the layer that catches the class of bug we missed.

- **Location:** `apps/dev` (it already has the plugin wired, the collections, and the adapters — same
  home as `verify-provenance.ts`). The library package can't boot Payload on its own.
- **Provider:** the dry-run OpenAI provider (`TRANSLATOR_DRY_RUN`, deterministic reverse-text transform)
  — no API spend, deterministic assertions.
- **Runner:** the sync runner (`TRANSLATOR_SYNC`) so a translation runs inline on enqueue and the test
  can assert the result without polling a jobs autorun.
- **Config:** a dedicated sqlite test config (in-memory or a temp file reset per run) so suites are
  isolated and fast; boot once per suite, seed/teardown per test.

### Flows to cover (each an assertion the mocks can't make)

1. **Document translation, happy path** — create doc with `en` content, run translation → `de`/`fr`
   fields populated; **source `en` NOT wiped** (regression lock for `c0a49d1b`); nested
   group/array/blocks/tabs localized values translated, non-localized untouched.
2. **Strategies** — `overwrite` replaces existing target; `skip_existing` fills only empty target fields.
3. **Auto-translate (#51)** — publish source → job enqueued + (sync) run → target populated;
   drift-gate (no source change → no enqueue); publish-gate (draft save → no enqueue); loop-guard (the
   translator's own target write does not re-trigger); unknown target locale dropped at config time.
4. **Stale detection (#50)** — translate, then change source → staleness surfaces for that target.
5. **Provenance (#47)** — folded in or kept as the existing verify script.

## CI (strongly recommended, separate decision)

Add a `test.yml` workflow running `check-types` + `lint` + unit + integration on PR and `main`. Today
nothing runs tests automatically, so the safety net depends on someone remembering. This is arguably the
highest-leverage item — a test suite that isn't gated will drift.

## Open decisions (need confirmation before building)

- **Level:** vitest+Payload (recommended) · Playwright browser e2e · both.
- **DB matrix:** sqlite-only to start (recommended — fast gate) · all three adapters (catches
  adapter-specific bugs like the Postgres locale enum, but needs services in CI, à la verify-provenance).
- **CI timing:** add the test workflow now · after the suite lands.
- **Harness style:** a shared `bootTestPayload()` helper (sqlite, dry-run, sync) reused across specs.

## Notes

- Keep integration specs out of the unit `test` run if they're slower — a separate `test:integration`
  script + vitest project, so the fast unit loop stays fast.
- sqlite in-memory resets between boots; if parallel suites collide, use per-suite temp files.
