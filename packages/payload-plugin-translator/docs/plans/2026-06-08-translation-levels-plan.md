# Translation Levels — Implementation Plan

**Date:** 2026-06-08
**Status:** Ready
**Design:** [translation-levels-design](./2026-06-05-translation-levels-design.md) · **Groundwork:** [foundation-prep-plan](./2026-06-05-foundation-prep-plan.md)

Ordered, each step a self-contained PR. Field-level translation = `in-place` mode (translate the
current unsaved form value into the current locale, synchronously, no DB), localized fields only,
text-like fields + wrappers (richText write-back deferred). Default levels stay
`[documentLevel(), collectionLevel()]` — fully backwards compatible.

## Phase 0 — Groundwork (prerequisites, each shippable alone)

- **0a. Contract tests for the 6 routes.** Pin path + method + access-guard + error-wrapper →
  status/body for `enqueue`, `run/:id`, `cancel`, `cancel-by-collection`, `get-document-status`,
  `get-collection-status`. (Handlers already cover status codes; this pins the route _wiring_ so the
  Phase 1 relocation is verifiably behavior-preserving.) Lowest-risk; can be partial if Phase 1
  keeps route construction identical.
- **0b. `translateContent()` + subtree resolver.** No core change (pipeline already pure). Add a
  resolver: given a declared field config + form value(s), produce `[fieldConfig]` + data rooted as
  `{ [name]: value }`; add `translateContent(subtreeSchema, values, src, tgt)` that calls the
  existing `TranslationPipeline`. Unit-test on a leaf field, a group wrapper, and a nested
  array/blocks subtree. **Direct building block of Phase 2.**
- **0c. De-couple `SyncRunner` from configure→create ordering.** Prerequisite for per-level runners.

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
  > at the **orchestration layer**: Phase 1 configures each _distinct_ runner exactly once via
  > `new Set(levels.map(l => l.runner))`, deduped by instance identity. Until levels exist there is a
  > single runner configured exactly once — so no guard is needed today, and the provider stays pure.

## Phase 1 — Levels refactoring (no new features)

- Introduce `TranslationLevel` interface + `documentLevel()` / `collectionLevel()` factories under
  `modules/translation-levels/`.
- Move the existing admin components (document popup → `documentLevel`, bulk dashboard →
  `collectionLevel`) into their level modules.
- The 6 job-API routes stay **one shared bundle**, registered when any job-based level is present.
- Per-level runner with **deduplication**: configure each _distinct_ runner exactly once —
  `new Set(levels.map(l => l.runner ?? rootRunner))`, deduped by instance identity. **This is where
  `configure()` idempotency lives** — no guard inside the provider. Each distinct runner also gets one
  bound `TaskRunnerFactory` (introduced in 0c), so no `create()`-site changes are needed here.
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

- Phase 0: `refactor`/`fix` (patch). Phase 1: `feat` (minor), non-breaking (default levels unchanged).
- Phase 2–3: `feat` (minor) — the new field level is opt-in via `levels` + `control: true`.
- No breaking change; the deprecated job-input relationship field and API unification (foundation-prep
  §3) remain queued for the single planned major.
