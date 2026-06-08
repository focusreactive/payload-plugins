# Foundation Prep Plan

**Date:** 2026-06-05
**Status:** Proposed
**Related:** [Translation Levels Design](./2026-06-05-translation-levels-design.md)

## Overview

Prepare the plugin foundation for upcoming features (translation levels, field-level translation)
through **non-breaking minor releases**: fix reliability issues in the jobs pipeline, extract the
internals the levels design depends on, unify and deprecate redundant API surface. Everything
deprecated here is removed in **one** major release — no drip-feed of breaking changes.

Priority order: **reliability → core extraction + contract tests → API unification → process**.
Reliability goes first: any new feature built on top of jobs that silently hang multiplies support
cost.

---

## 1. Jobs reliability (minor, highest priority) — ✅ SHIPPED in 0.4.0

- [x] **Stale-lock recovery.** Shipped: `staleJobTimeoutMs` (default 5 min, validated), boot-time
      `reclaimStaleJobs`, and manual `run()` clears a stale lock before re-running. (Threshold is a
      flat configurable default, not "2× cron interval" — it must exceed the longest single run,
      which the cron interval does not capture.)
- [x] **ID type handling.** Shipped via the ID-agnostic migration (0.3.0): job input stores a flat
      text reference (`collection_slug`/`collection_id`); `type ID = string`; coercion at the write
      boundary. Regression tests cover number-id and string-id collections.
- [x] **Force-run actually executes.** Root cause found during this work: `payload.jobs.runByID`
      is broken on the drizzle/sqlite adapter (writes `processing: true`, returns no rows). `run()`
      now executes via the `where`-based picker (`payload.jobs.run({ queue, where, limit })`).
- [ ] **Failure observability** (open, deferred): `run()` returns `{ success: true }` even when the
      picker ran nothing (failed/`hasError` job, future `waitUntil`, or an autorun race). A faithful
      fix inspects the `jobs.run` result and adds an internal `RunResult` variant + handler mapping.
      Bounded today (the admin status-poll converges to the real state).

## 2. Levels prerequisites (minor)

- [ ] **Contract tests for the 6 existing routes** (request/response shapes: `enqueue`, `run/:id`,
      `cancel`, `cancel-by-collection`, `get-document-status`, `get-collection-status`) — written
      **before** any relocation, so "pure refactoring, tests stay green" is verifiable.
- [ ] **Subtree `translateContent()` wrapper** — NOT a core extraction. Investigated: the core is
      already pure and reusable. `TranslationPipeline.execute({ schema, sourceData, targetData,
      sourceLng, targetLng })` is a relative recursive walk over any `Field[]` + matching data
      (collector/reconciler/mutator carry no DB, root, or absolute-path assumptions), so a schema
      subtree + partial data works unchanged. Work needed: a resolver that, for a declared field
      path, produces `[fieldConfig]` + data rooted as `{ [name]: value }`, and a thin
      `translateContent()` entry that calls the existing pipeline. Prerequisite for `POST /field`.
- [ ] **Idempotent `runner.configure()`** + the "one runner is configured exactly once" contract —
      required before per-level runners. Includes removing the temporal coupling in
      `SyncRunnerProvider` (`create()` throws unless `configure()` was called first — mutable
      provider state).
- [ ] **Introduce optional `levels` config field** with default `[documentLevel(),
    collectionLevel()]` — non-breaking by construction. (Implementation itself tracked by the
      levels design doc; this item is only the config surface + back-compat default.)

## 3. API surface unification (minor: deprecate, major: remove)

- [ ] **Unify `cancel`.** `POST {basePath}/cancel` accepts `{ ids: string[] } | { collection: slug }`
      (exactly one of the two, validated). `cancel-by-collection` becomes a thin alias delegating to
      the same handler.
- [ ] **Deprecation pass over existing aliases** — make sure every item is annotated uniformly and
      scheduled for the same major removal. The authoritative list (status, replacement, removal
      target, code refs) lives in the [Deprecations Ledger](../DEPRECATIONS.md); this checklist item
      is just "annotate everything in the ledger uniformly and link each symbol back to its entry."
- [ ] **DECIDE: fate of `run/:id` (force-run).** Its only purpose is skipping the ≤1 min wait for
      the cron picker. Options:
  - _keep + fix_: real UX value; requires the stale-lock fix above so it stops refusing dead jobs
    (recommended);
  - _deprecate_: the document popup's Run button goes away in the major as well.
- [ ] **DECIDE: merge the two status routes in the major?** `get-document-status` +
      `get-collection-status` → single `status?collection=&ids=`. If yes — same pattern: unified
      route in a minor, old ones become deprecated aliases.

## 4. Deprecation mechanics (process, in parallel)

- [ ] **Uniform deprecation pattern**: `@deprecated` JSDoc + one-time runtime `console.warn` +
      a link to the symbol's entry in the [Deprecations Ledger](../DEPRECATIONS.md) (the ledger is
      the single source of truth — keyed by date + PR, removal target = next major, since
      semantic-release assigns versions at merge time).
- [ ] **Release mapping** (semantic-release): deprecations ship as `feat:` (minor), removals as
      `feat!:` (major). All removals land in a single major release.
- [ ] **Audit the minimum supported `payload` peer version.** The peer range is `^3.0.0`, but the
      Jobs API changed noticeably within 3.x. Document "tested with >= 3.x.y" in a minor; raise the
      floor in the major.

---

## Out of scope

- The translation levels implementation itself (field level, per-level runners, control injection) —
  tracked by the [levels design doc](./2026-06-05-translation-levels-design.md). This plan only
  clears the ground for it.
- Any breaking change shipped outside the single planned major release.

## Open decisions

1. Fate of `run/:id` — keep + fix (recommended) vs deprecate.
2. Merge `get-document-status` / `get-collection-status` into one `status` route in the major — yes/no.
3. Stale-lock threshold value (proposal: 2× autoRun cron interval).
4. Fix location for the enqueue ID-type issue — zod boundary vs runner write-side.
