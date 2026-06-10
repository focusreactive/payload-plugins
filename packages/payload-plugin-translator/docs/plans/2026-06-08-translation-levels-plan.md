# Translation Levels — Implementation Plan

**Date:** 2026-06-08
**Status:** Ready
**Design:** [translation-levels-design](./2026-06-05-translation-levels-design.md) · **Phase 1 design:** [translation-levels-phase1-design](./2026-06-09-translation-levels-phase1-design.md) · **Groundwork:** [foundation-prep-plan](./2026-06-05-foundation-prep-plan.md)

Ordered, each step a self-contained PR. Field-level translation = `in-place` mode (translate the
current unsaved form value into the current locale, synchronously, no DB), localized fields only,
text-like fields + wrappers (richText write-back deferred). Default levels stay
`[documentLevel(), collectionLevel()]` — fully backwards compatible.

## Phase 0 — Groundwork (prerequisites, each shippable alone)

- **0a. Contract tests for the 6 routes.** ✅ Shipped (PR #24). Pinned path + method + access-guard
  wiring for `enqueue`, `run/:id`, `cancel`, `cancel-by-collection`, `get-document-status`,
  `get-collection-status` (status/body for the wrappers are covered by their own unit tests). Also
  extracted the 6 registrations into one `createTranslationRoutes()` bundle, so the Phase 1
  relocation is verifiably behavior-preserving.
- **0b. `translateContent()`.** ✅ Shipped (PR #22). No core change (pipeline already pure):
  `translateContent({ schema, sourceData, targetData?, sourceLng, targetLng, translationProvider,
strategy? })` is a thin reusable entry over the existing `TranslationPipeline`. Unit-tested on a
  leaf field, a group wrapper, and nested array/blocks. The subtree **resolver** (declared field
  path → `[fieldConfig]` + data rooted as `{ [name]: value }`) was **deferred to Phase 2** — it has
  no caller until the `POST /field` endpoint, so building it now was premature. **Direct building
  block of Phase 2.**
- **0c. De-couple `SyncRunner` from configure→create ordering.** ✅ Shipped (PR #23). Prerequisite for per-level runners.

  `SyncRunnerProvider` stashed `this.handler` in `configure()` and `create()` threw unless it was set
  first — a temporal coupling on mutable instance state (needed because `SyncTaskRunner` runs the
  translation inline on enqueue, with no Payload task to bake the handler into). Fix: the handler now
  flows through `create(payload, context)`, and the plugin binds the context **once** into a narrow
  `TaskRunnerFactory` (`{ create(payload) }`) that the 6 routes depend on. The provider keeps no
  mutable handler state and `create()` is a pure function of its arguments — no "configure() first"
  ordering. Routes never `configure()`, so the narrower factory type is also more honest.

  > **Idempotent `configure()` — moved to Phase 1, not done here.** An earlier 0c draft added a guard
  > inside `PayloadJobsRunnerProvider.configure()` (skip if the task slug is already in
  > `config.jobs.tasks`) so two levels sharing a runner wouldn't double-register task/autoRun/onInit.
  > Dropped: it's a content-sniffing belt at the wrong layer, and moving the state onto the provider
  > (an instance `configured` flag, "singleton") is worse — the flag sticks across `Config` objects
  > and would silently skip registration on hot-reload / a second `buildConfig`. Idempotency belongs
  > at the **orchestration layer**. Phase 1 keeps a **single root runner** configured exactly once
  > (no dedup needed); the runner-agnostic document-translation routes are contributed by the
  > doc-levels and deduped by content (see the Phase 1 design). A future per-level runner override
  > would configure each _distinct_ runner once via `new Set(...)`, deduped by instance identity. So
  > no guard is needed today, and the provider stays pure.

## Phase 1 — Levels refactoring (no new features)

- Introduce `TranslationLevel` interface + `documentLevel()` / `collectionLevel()` factories under
  `modules/translation-levels/`.
- Move the existing admin components (document popup → `documentLevel`, bulk dashboard →
  `collectionLevel`) into their level modules.
- The 6 job-API routes stay **one shared bundle**, registered when any job-based level is present.
- **Single shared doc-translation runner** (per-level runner deferred). `documentLevel` and
  `collectionLevel` share the top-level `runner` (sync or async), configured once. They contribute
  the runner-agnostic 6-route bundle via generic context primitives, deduped by content; the
  `CacheProvider` is plugin-level. `field` uses `translateContent` (sync), no runner. Per-level
  runners (which need a breaking route split) are deferred to the major — see the
  [Phase 1 design](./2026-06-09-translation-levels-phase1-design.md).
- Add optional `levels` config field, default `[documentLevel(), collectionLevel()]`. Omitted =
  exactly today's behavior.
- Exit criteria: Phase 0a contract tests + existing suite green (pure relocation).

## Phase 2 — Field-level server

- `fieldLevel({ mode: 'in-place' })` factory.
- `POST {basePath}/field` — synchronous endpoint: receives `{ collectionSlug, fieldPath, value,
targetLng }`, runs `translateContent` (0b), returns the translated subtree. **No persistence.**
- Security: enforce `AccessGuard`; validate `fieldPath` exists in the collection `schemaMap`; content
  size limit.
- Tests: leaf + wrapper; localized-only (non-localized skipped); access denied; unknown fieldPath.

## Phase 3 — Field-level client

- `withFieldTranslation(field, { control: true })` injects a per-field control (button) via
  `admin.components` — only where explicitly declared; child fields get nothing.
- Client feature: call `POST /field` with the current form value, write the result back into form
  state (text fields + wrappers). Works in create AND edit (unsaved value).
- Tests for the form-state write-back on text fields.

## Phase 4 — Follow-ups (separate, on demand)

- richText write-back into Lexical editor state (the deferred bottleneck; server already translates richText).
- `from-locale` mode (translate a saved locale A value into form B; source picker).
- "Translate this content" utility for non-localized/richText fields (relaxes the `isLocalizedField`
  gate + needs the richText write-back) — opt-in, not part of the levels MVP.

## Release shape

- Phase 0: shipped as `chore` (no release) — internal groundwork, no user-facing change. Phase 1: `feat` (minor), non-breaking (default levels unchanged).
- Phase 2–3: `feat` (minor) — the new field level is opt-in via `levels` + `control: true`.
- No breaking change; the deprecated job-input relationship field and API unification (foundation-prep
  §3) remain queued for the single planned major.
