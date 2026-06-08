# Translation Levels Design

**Date:** 2026-06-05
**Status:** Approved (2026-06-08)
**Implementation plan:** [translation-levels-plan](./2026-06-08-translation-levels-plan.md)

## Overview

Introduce **translation levels** as a first-class plugin concept: the plugin config declares at which levels translation is available — `collection`, `document`, and the new `field` level. Field-level translation translates the current **unsaved form value** synchronously and writes the result back into the form, so it works in both create and edit modes and never touches the database.

## Problem

- The plugin only supports whole-document and bulk-collection translation. There is no way to translate a single field or a logical group of fields (group / tabs / array / blocks subtree).
- Document/collection UI and endpoints are hardcoded in `plugin.ts` — consumers cannot disable a level or configure levels independently.
- Both existing levels are forced through a single `runner`. Field-level translation must be synchronous (form value in → translated value out), which the `TaskRunnerProvider` contract cannot express: `TaskHandlerInput` is document-centric (`{ collection, collectionId, ... }`) — it translates a **saved** document by id and writes to the DB. Even `createSyncRunner()` executes the document pipeline; it cannot serve form-state translation.

## Key insight: field level is not a runner concern

The runner becomes an attribute of a **level**, not of the plugin. The field level does not use a runner at all:

| Level        | Semantics                                  | Execution                                                                  |
| ------------ | ------------------------------------------ | -------------------------------------------------------------------------- |
| `collection` | N saved documents → DB                     | runner (payload-jobs / sync / future inngest, qstash)                      |
| `document`   | 1 saved document → DB                      | runner                                                                     |
| `field`      | form value → response → form, DB untouched | synchronous endpoint → `translationProvider.translate()` directly, no jobs |

Field translation is a stateless request/response: the client sends the current (unsaved) value, the server runs it through the translation provider, the client writes the result into form state. This is what makes create-mode support trivial — no document needs to exist.

## Config API

Levels are an array of objects implementing one narrow interface ("a level is a mini-plugin contributing config"). All level-specific options live in factory functions, not in the interface.

```ts
translatorPlugin({
  collections: [Pages],
  translationProvider: createOpenAIProvider({ ... }),
  runner: createPayloadJobsRunner(),          // stays = default runner for job-based levels
  levels: [
    documentLevel(),                          // inherits root runner
    collectionLevel({ runner: otherRunner }), // or its own
    fieldLevel({ mode: 'in-place' }),         // no runner at all
  ],
})
```

```ts
interface TranslationLevel {
  readonly name: string; // 'field' | 'document' | 'collection' | custom
  configure(ctx: TranslationLevelContext): (config: Config) => Config;
}

type TranslationLevelContext = {
  collections: CollectionSlug[];
  schemaMap: Map<string, Field[]>;
  basePath: string;
  access?: AccessGuard;
  translateDocument: TaskHandler; // for job-based levels (existing TranslateDocumentHandler)
  translateContent: ContentTranslator; // for the field level: (values, src?, tgt) => translated
  defaultRunner?: TaskRunnerProvider; // root runner inheritance
};
```

### Backwards compatibility

- `levels` omitted → defaults to `[documentLevel(), collectionLevel()]` — exactly the current behavior.
- Root `runner` stays required as long as at least one job-based level is active.

### Implementation pitfalls to handle

- **Job infrastructure deduplication**: `document` and `collection` both need the task + autoRun registered. When they share one runner, its `configure()` must run exactly once — the plugin collects the _distinct set_ of runners across levels and configures each once.

### Endpoints: not split per level

The 6 existing routes are **one shared job-translation API**, not per-level APIs. Both job-based
widgets go through the same client entity layer (`client/entities/translation/api`): the document
widget and the bulk dashboard both call `enqueue` (single id, id array, or `select_all`), and
document statuses are consumed by both the edit view and the list view. Scoping routes to levels was
considered and rejected:

- shared ownership (whose `enqueue`?) would require route deduplication between levels — accidental complexity;
- the routes are a documented public API that consumers may call programmatically; admin-UI level
  configuration must not change the REST surface.

Decision: the existing 6 routes are registered as one bundle whenever at least one job-based level
is configured. The net API change of this design is exactly **one new route** — `POST
{basePath}/field` — added because its contract (stateless "values in → translated values out", no
job, no persistence) is not expressible by any of the existing document-id-based routes, and
overloading `enqueue` with a sync no-persistence mode would be worse than a dedicated route.

## Translation direction (field level)

Hard constraint: **the Payload admin form holds state for the current locale only**. Switching locales reloads the form from the DB; in create mode other locales do not exist yet. Therefore "pick a target locale and write the translation into the form" is not implementable without saving to the DB (which is document-level semantics).

Two modes are compatible with unsaved-form semantics (both write into the **current** locale's form):

1. **`in-place`** — the user writes in whatever language is convenient, hits the button, and the value is replaced with a translation into the current locale. No language picker. The OpenAI provider already supports source auto-detection (the prompt is built with an optional `sourceLang`). Works in create and edit modes.
2. **`from-locale`** — the user is on locale B with an empty field → "translate from locale A" → take the **saved** value from locale A, translate, put into form B. A language picker exists, but it selects the **source**, not the target. Edit mode only (requires a saved document).

Decision: **MVP = `in-place`**; `from-locale` is a second iteration (`mode: 'in-place' | 'from-locale' | 'both'` in `fieldLevel()`). "Translate into a selected locale" is rejected — it breaks the no-save invariant.

## Declaring field controls

Reuses the existing mechanism — no new API surface:

```ts
withFieldTranslation(field, { control: true }); // leaf field
withFieldTranslation(groupField, { control: true }); // wrapper → translates the whole subtree
```

- The plugin walks the declared collections' schemas at config build time and injects an admin component (the control button) into fields with `control: true`.
- Child fields get **no** control — only explicit declarations do.
- `exclude: true` inside a wrapper's subtree keeps working as a filter.

## Architecture changes

```
server/
  features/
    translate-field/          ← new sync endpoint POST {basePath}/field
  modules/
    translation-levels/       ← new: TranslationLevel + documentLevel/collectionLevel/fieldLevel
    translation-pipeline/     ← REUSE as-is: TranslationPipeline.execute({schema, sourceData,
                                 targetData, ...}) is already pure (no DB). It is a relative
                                 recursive walk over any Field[] + matching data, so a schema
                                 subtree + partial data works unchanged. The field level only
                                 needs a thin subtree resolver + translateContent() wrapper.
client/
  features/translate-field/   ← request + form state write-back
  widgets/field-translation-control/  ← per-field button (injected via admin.components)
```

### Riskiest part: form state write-back

For text fields it is a trivial dispatch by path. For **Lexical richText** it requires working with editor state and is deferred: the MVP supports text-like fields and wrappers without richText; richText is a follow-up.

### Security

`POST {basePath}/field` is effectively an LLM proxy. It must:

- enforce the existing `AccessGuard`,
- validate that `fieldPath` exists in the collection's `schemaMap`,
- enforce a content size limit.

## Milestones

1. **Levels refactoring** (no new features): `TranslationLevel`, move existing widgets (admin components) into `documentLevel` / `collectionLevel`; the 6 job-API routes stay a shared bundle registered when any job-based level is present; per-level runner with deduplication, back-compat default. Pure relocation — tests stay green.
2. **Field-level server**: subtree resolver + `translateContent()` wrapper around the existing `TranslationPipeline` (the pipeline is already pure — no core changes) + `POST /field` + tests.
3. **Field-level client**: control button, form state integration, injection via `control: true`. Text fields + wrappers.
4. **Second iteration**: richText support, `from-locale` mode.

## Resolved decisions

1. **Non-localized fields inside a declared wrapper → SKIPPED.** The field level translates only `localized` fields, exactly like the document level (`FieldChunkCollector` already gates on `isLocalizedField`). A non-localized value is shared across all locales, so translating it in place would corrupt every other locale. This means **no core change** — the existing pipeline's gate is correct as-is. (Superseded the earlier "translate the whole subtree" lean.)
2. **richText → deferred (follow-up).** The bottleneck is purely the **client-side write-back** into the Lexical editor state, not translation: the server pipeline (`RichTextExpander`) already handles richText. MVP = text-like fields and wrappers, no richText write-back.
3. **A separate, on-demand future feature** (not this work): a "translate this content" *utility* that translates a field's text regardless of `localized` — its only real value is richText (round-tripping richText through an external tool mangles formatting). It needs both relaxing the `isLocalizedField` gate AND the deferred richText write-back, so it is naturally a later, opt-in addition.
4. Naming/UX of the control button and the endpoint payload shape — settled during implementation.
