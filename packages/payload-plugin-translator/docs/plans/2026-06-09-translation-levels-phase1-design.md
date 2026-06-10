# Translation Levels — Phase 1 Design (Levels Architecture)

**Date:** 2026-06-09
**Status:** Draft
**Plan:** [translation-levels-plan](./2026-06-08-translation-levels-plan.md) ·
**Design:** [translation-levels-design](./2026-06-05-translation-levels-design.md)

Phase 1 introduces the **levels** architecture: a composable way to declare which
translation surfaces the plugin exposes. It is **behaviour-preserving** — the default
levels reproduce today's plugin exactly. No new user-facing features here; the
field-level server and client land in Phases 2–3.

## Concept

A **level** is a self-contained translation surface. Three are planned:

- `documentLevel()` — per-document translation (popup control on the document edit
  view). Runs through the **shared doc-translation runner** (async/job by default; the
  runner is swappable to sync).
- `collectionLevel()` — bulk collection translation (dashboard on the list view). Same
  shared doc-translation runner.
- `fieldLevel({ mode })` — in-place field translation. **Always synchronous**, no
  runner/queue — runs `translateContent` directly. (Server is Phase 2; here we only fix
  its shape in the interface.)

The plugin composes a list of levels and assembles the Payload config from their
contributions. Default: `[documentLevel(), collectionLevel()]` — exactly today's
behaviour. Omitting `levels` is unchanged.

## Public API — closed, but forward-compatible

Levels are a **closed set** today: produced only by our factories, selected via an
array. There is **no public `kind` discriminator** and no externally-implementable
contract yet — but the surface is deliberately shaped so that opening it later
(anyone implements their own level) is **additive and non-breaking**.

```ts
// Public exports
export interface TranslationLevel {
  /** @internal Not a stable contract yet — produce via the factories below. */
  extend(ctx: LevelContext): void;
}

export function documentLevel(options?: DocumentLevelOptions): TranslationLevel;
export function collectionLevel(
  options?: CollectionLevelOptions,
): TranslationLevel;
export function fieldLevel(options: FieldLevelOptions): TranslationLevel; // Phase 2

// Config (added to TranslatorPluginConfig)
type TranslatorPluginConfig = {
  // …existing fields…
  /**
   * Which translation surfaces to enable.
   * @default [documentLevel(), collectionLevel()]
   */
  levels?: TranslationLevel[];
};
```

Why this shape opens cheaply later:

- **Array of factory objects, not a string enum.** `levels: TranslationLevel[]` — not
  `('document' | 'collection')[]`. Opening = also accepting user-built
  `TranslationLevel`s in the same array → purely additive. A string enum would force a
  breaking migration and can't carry per-level options.
- **`LevelContext` is not exported.** External code cannot type its own `extend`, so
  levels are de-facto closed. Opening = export `LevelContext` + drop the `@internal`
  tag. No renames, no signature changes.
- **The internal `extend(ctx)` contract is designed now as if it were public** (clean,
  no leaked machinery), so exposure is a pure visibility change rather than a redesign.

## Internal contract — `extend(ctx)` + `LevelContext`

A level contributes by calling **generic primitives** on the context — it never mutates
the raw Payload config directly. The plugin **deduplicates by content**, so shared
infrastructure registers once no matter how many levels ask for it. This keeps the
fiddly config plumbing (`collection.admin.components.edit ??= {}` …) in one place and
makes a level trivially unit-testable: assert which primitives it called against a mock
context.

```ts
/** @internal — public-ready shape, kept internal until external levels are needed. */
interface LevelContext {
  // --- read-only context ---
  readonly collections: CollectionConfig[]; // managed collections (original configs)
  readonly schemaMap: CollectionSchemaMap; // slug -> localized field schema
  readonly basePath: string; // normalized, e.g. "/translate"
  readonly access?: AccessGuard;
  readonly translationProvider: TranslationProvider;
  readonly taskRunnerFactory: TaskRunnerFactory; // shared doc-translation runner (bound in 0c)

  // --- generic contribution primitives ---
  /** Register endpoints. The plugin deduplicates by method + path, so two levels
   *  adding the same bundle collapse to one set. */
  addEndpoints(endpoints: Endpoint[]): void;
  /** Attach an admin component to a slot on every managed collection. */
  addCollectionComponent(
    slot: CollectionAdminSlot,
    make: (collection: CollectionConfig) => RawPayloadComponentExport,
  ): void;
}

type CollectionAdminSlot = "beforeDocumentControls" | "beforeListTable";
```

**No `kind`, no "job" in the contract.** A level expresses what it needs by _calling_
generic primitives, not by declaring a category. There is deliberately **no
`ensureJobApi()`** — that would re-leak our queue taxonomy into the (future-public)
context, the same smell we removed with `kind`. Instead:

- the **document-translation API** (the 6-route bundle from #24) is **runner-agnostic** —
  `createSyncRunner()` drives it exactly as the job runner does — so it is not a "job"
  concept. `documentLevel`/`collectionLevel` both contribute it via an internal shared
  helper (`useDocTranslationApi`, below), and the plugin **dedups by method + path** so
  it registers once;
- "register shared infra once" is plain content dedup at the orchestration layer — not
  an idempotency flag keyed on a named capability.

## The three levels

```ts
// Internal shared helper — the runner-agnostic document-translation API (the 6-route
// bundle from #24), bound to the shared runner. Both doc-based levels reuse it; the
// plugin dedups by method+path so it registers once.
function useDocTranslationApi(ctx: LevelContext) {
  ctx.addEndpoints(
    createTranslationRoutes({
      taskRunnerFactory: ctx.taskRunnerFactory,
      collectionConfig: {
        availableCollections: new Set(ctx.collections.map((c) => c.slug)),
      },
      access: ctx.access,
      basePath: ctx.basePath,
    }),
  );
}

// document — uses the shared doc-translation runner (sync or async)
function documentLevel(): TranslationLevel {
  return {
    extend(ctx) {
      useDocTranslationApi(ctx);
      ctx.addCollectionComponent(
        "beforeDocumentControls",
        (collection) => new TranslateDocumentExport(collection, ctx.access),
      );
    },
  };
}

// collection — same shared doc-translation runner + API
function collectionLevel(): TranslationLevel {
  return {
    extend(ctx) {
      useDocTranslationApi(ctx);
      ctx.addCollectionComponent(
        "beforeListTable",
        () => new BulkDocumentTranslationDashboard(ctx.access),
      );
    },
  };
}

// field — always synchronous, no runner: its own endpoint runs translateContent (0b)
// directly. (Phase 2 supplies createFieldRoute; shape only here.)
function fieldLevel(options: FieldLevelOptions): TranslationLevel {
  return {
    extend(ctx) {
      ctx.addEndpoints([
        createFieldRoute(
          ctx.schemaMap,
          ctx.translationProvider,
          ctx.access,
          ctx.basePath,
        ),
      ]);
      // The per-field control UI is wired separately, at field-declaration time,
      // via withFieldTranslation(field, { control: true }) — NOT here. (Phase 3)
    },
  };
}
```

`fieldLevel` is the proof the abstraction is right: it needs no document-translation
API and no runner — it is request → response via `translateContent` — and its UI
attaches per-field (through the existing `withFieldTranslation` wrapper), not
per-collection. The generic primitives accommodate it with no special-casing.

## Plugin orchestration

`plugin.init()` collapses from the hard-coded 4-step `pipe` into: build context → run
each level's `extend` → build config.

```
init(config):
  schemaMap, collectionSlugs, basePath, translateHandler   // unchanged
  runnerContext, taskRunnerFactory                         // unchanged (one root runner)

  levels = config.levels ?? [documentLevel(), collectionLevel()]

  ctx = makeLevelContext({ collections, schemaMap, basePath, access,
                           translationProvider, taskRunnerFactory })
  for (const level of levels) level.extend(ctx)            // accumulate contributions

  // plugin-level infra (not a level concern) — added straight to the config:
  config.admin.components.providers.push(new CacheProviderExport(basePath)) // client cache — always, once
  runnerConfigModifier = runner.configure(runnerContext)                    // root runner configured once

  return ctx.applyTo(config, runnerConfigModifier)         // dedup endpoints (method+path) → pipe
```

`ctx.applyTo` deduplicates the accumulated endpoints by content (method + path) before
composing them, so two doc-levels each contributing the 6-route bundle collapse to one
set. The `CacheProvider` is **plugin-level** — always needed for requests/caching, so
the plugin adds it directly to `config.admin.components.providers` (once, regardless of
which levels are active). It is **not** a `LevelContext` primitive: no level
contributes it, so `addAdminProvider` would be dead surface.

## Runners — one shared doc-translation runner + two backends by request shape

`document` and `collection` form one **document-translation domain**: they share the
6-route bundle, so they share **one runner** — the top-level `runner`, configurable as
sync (`createSyncRunner()`) or async (`createPayloadJobsRunner()`, the default). It is
configured once. There is no per-level runner: the shared routes have a single
`taskRunnerFactory`, so document and collection cannot diverge to different runners
without splitting the routes (deferred — below).

`field` is **not** in this domain. It is always synchronous (request → response) and
runs `translateContent` (0b) in its own endpoint — no runner, no queue, no polling. So
there are **two execution backends, by request shape**:

- `TaskRunnerProvider` — document tracking (enqueue → poll status → DB write), sync or async;
- `translateContent` — field (value in → value out), always sync.

Generalizing one runner to serve both was considered and **rejected**: the contracts
differ fundamentally (fire-and-track-with-DB-side-effect vs request→response, `void`
vs a returned value), and `field` needs none of the job machinery (status, cancel,
persistence). Two small backends beat one leaky generic one.

**Deferred to the planned major:** per-level runners (e.g. `document` sync while
`collection` is async) require splitting the shared 6-route bundle into per-level
endpoints — a **breaking** REST change. Batched into the major alongside the API
unification, not done in this non-breaking relocation. (Note: `document` is already
async today, so the only thing per-level runners would add to the doc domain is a
_synchronous_ document path — questionable value, since sync blocks the HTTP request
for LLM latency, worse UX than the existing non-blocking poll. 0c's `SyncRunner`
decoupling already makes the eventual split cheap.)

## Forward-compatibility recipe (closed → open)

When external levels become a real requirement:

1. Export `LevelContext` (and `CollectionAdminSlot`).
2. Remove `@internal` from `TranslationLevel.extend`.
3. Freeze the `LevelContext` shape as public API.

All three are additive. Existing `levels: [documentLevel(), …]` configs keep compiling
unchanged; users merely gain the ability to pass their own `TranslationLevel`.

## Alternatives considered

| Approach            | Shape                                                   | Pros                                                           | Cons                                                                                                                         |
| ------------------- | ------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Levels (chosen)** | `levels: [documentLevel(), fieldLevel({…})]`            | composes; carries per-level options; cheapest to open later    | needs a "level" abstraction                                                                                                  |
| Boolean flags       | `{ documentTranslation: true, fieldTranslation: {…} }`  | simplest, most discoverable                                    | doesn't compose; **opening externally = breaking migration**; config grows one key per feature                               |
| Nested preset       | `{ surfaces: { document: {…}, field: {…} } }`           | grouped, still simple                                          | same downsides as flags, slightly tidier                                                                                     |
| Sub-plugins         | `plugins: [translatorCore(), fieldTranslation()]`       | **inherently open** (anyone ships a Payload plugin); idiomatic | shared infra (runner / routes / schemaMap / cache) is hard to coordinate across separate plugins; ordering; more boilerplate |
| Per-collection      | `collections: [{ collection: Posts, surfaces: [...] }]` | granular (per collection)                                      | different axis, more complex; can be layered on top of levels later                                                          |
| Monolith + one flag | today + `enableFieldTranslation`                        | minimal change (YAGNI)                                         | doesn't satisfy "control which surfaces are on"                                                                              |

The forward-compatibility requirement (closed now, cheap to open) is what rules out
flags / nested presets (most painful to open) and confirms the levels array. Sub-plugins
are the only natively-open option but are expensive _today_ because of the shared
infrastructure — levels are effectively "sub-plugins coordinated inside one plugin".

## Decisions

- **Closed levels** via factories + array config (not a string enum / flags) —
  composable, carries options, cheapest to open later.
- **No public `kind`, no `ensureJobApi`** — the context exposes only the two primitives
  levels actually use (`addEndpoints`, `addCollectionComponent`); the plugin dedups
  endpoints by content. The runner-agnostic document-translation API is an internal
  shared helper, not a "job" capability on the context.
- **Internal `extend(ctx)` + builder-style `LevelContext`**, designed public-ready,
  kept `@internal`.
- **Two execution backends by request shape:** `TaskRunnerProvider` (document, sync/async)
  - `translateContent` (field, sync). The runner is not generalized.
- **One shared doc-translation runner**; per-level runners deferred to the planned major
  (they need a breaking route split).
- **`CacheProvider` is plugin-level** — always needed for requests/caching, added
  directly to the config by the plugin. Not a `LevelContext` primitive (no level
  contributes it), so `addAdminProvider` stays out of the interface. Its own QueryClient
  is isolated and nests safely under any host-app react-query provider.

## Exit criteria

- `levels` omitted ⇒ behaviour identical to today (default
  `[documentLevel(), collectionLevel()]`).
- Phase 0a route-contract tests + the bundle-contract test + the full existing suite
  stay green (pure relocation).
- New unit tests: each level's `extend` calls the expected `ctx` primitives (mock ctx);
  endpoint dedup by (method + path) collapses two doc-levels' bundles to one set.

## Out of scope (later phases)

- **Phase 2:** `fieldLevel` server — the real `POST {basePath}/field` synchronous
  endpoint (built on `translateContent` from 0b).
- **Phase 3:** per-field control UI via `withFieldTranslation(field, { control: true })`
  - form-state write-back.
- **Phase 4:** richText write-back into Lexical; `from-locale` mode.
