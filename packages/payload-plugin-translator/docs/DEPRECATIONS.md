# Deprecations Ledger

Living registry of deprecated functionality in `@focus-reactive/payload-plugin-translator`. This is
the single source of truth — code annotations link here by anchor instead of duplicating history.

## How this works

- **Keyed by date + PR, not version.** Versions are assigned by semantic-release at merge time, so
  the exact "deprecated in" version is unknown while the code is being written. We record the date
  and PR; the removal target is expressed as **next major**, never a guessed number.
- **Code annotation convention.** Every deprecated symbol carries a JSDoc `@deprecated` tag, a
  replacement, and a link to its entry here:

  ```ts
  /**
   * @deprecated Use `translatorPlugin` instead. Remove in next major.
   * See docs/DEPRECATIONS.md#translate-collection-plugin-class
   */
  ```

- **Removal policy.** Deprecations ship as `feat:` (minor). All removals land together in a single
  `feat!:` (major) release — no drip-feed of breaking changes.

## Status legend

- `live` — annotated and in use as a fallback / alias; safe to remove in the next major.
- `planned` — agreed to deprecate, not yet annotated in code.

---

## Entries

### jobs-input-collection-field

- **What:** the `collection` field (Payload `relationship`) in the translate task `inputSchema`.
- **Status:** live
- **Deprecated:** 2026-06-05 / PR #18 (shipped in 0.3.0)
- **Replacement:** flat text reference — `collection_slug` + `collection_id`.
- **Remove in:** next major
- **What removal takes with it:** the flag is also the only way to turn the behaviour off, so an
  install that adopted it to guard against a misbehaving provider has no code-level guard after the
  next major — pinning the previous major is the only remaining step-back. Say so before an install
  relies on the flag as a safety valve.
- **What turning it back off does not undo:** it stops future translations from splitting wrappers;
  documents already translated under it stay split. The one-way door is the first translated
  document, not the flag.
- **Why:** the relationship field validates the stored value's type against the target collection's
  ID type, so a string id for a number-id collection silently fails validation and the job hangs in
  `processing`. Flat text fields make the job input ID-agnostic. See
  [jobs ID-agnostic migration](./plans/2026-06-05-jobs-id-agnostic-migration.md).
- **Migration:** expand/contract. New jobs write text fields; the relationship field stays as a
  read-only fallback (`required: false`, `admin.readOnly: true`) so jobs queued before the change
  remain readable. Removed (along with the fallback read path) in the next major.
- **Code refs:**
  - `src/server/modules/task-runner/payload-jobs-runner/PayloadJobsRunnerProvider.ts` (inputSchema, handler input type/unpacking)
  - `src/server/modules/task-runner/payload-jobs-runner/PayloadJobsTaskRunner.ts` (enqueue write, `findByCollection` / `findRawJobs` query + in-memory filter)
  - `src/server/modules/task-runner/payload-jobs-runner/normalizeJob.ts` (read fallback)
  - `src/server/modules/task-runner/payload-jobs-runner/types.ts` (`PayloadJob.input` shape)

### jobs-per-locale-task-shape

- **What:** jobs queued as a bare task (`taskSlug: 'translate_document'`, one `target_lng` in the
  input) rather than as the locale-walking workflow.
- **Status:** live
- **Deprecated:** 2026-09-04 / PR #133
- **Replacement:** one workflow job per document (`workflowSlug: 'translate_document_locales'`,
  `target_lngs` list).
- **Remove in:** next major
- **Why:** a job per locale meant Payload ran a document's locales through `Promise.all`, and every
  write it makes is a whole-document version snapshot — so the second locale's snapshot dropped the
  first's work. See [locale workflow](./plans/2026-09-04-locale-workflow.task.md).
- **Migration:** expand/contract. Nothing writes the task shape any more, but rows queued before the
  upgrade are still in `payload-jobs`, so every read keeps a fallback for them. Removing the fallback
  strands those rows: cancel, stale-lock reclaim and the status panels stop finding them, silently.
- **Code refs:**
  - `src/server/modules/task-runner/payload-jobs-runner/PayloadJobsTaskRunner.ts` (`ownJobs()`)
  - `src/server/modules/task-runner/payload-jobs-runner/planEnqueue.ts` (`pickHost` skips it)
  - `src/server/modules/task-runner/payload-jobs-runner/normalizeJob.ts` (`normalizeJobLocales`
    expands it to itself)

### find-by-collection-document-ids-array

- **What:** passing a bare `Array<string | number>` of document ids as the second argument to
  `TaskRunner.findByCollection`.
- **Status:** live
- **Deprecated:** 2026-09-04 / PR #126
- **Replacement:** `TaskFilter` — `findByCollection(slug, { documentIds })`.
- **Remove in:** next major
- **Why:** a positional argument cannot grow. The second filter this method needed —
  `excludeCompleted`, which bounds the read on the enqueue path (#108) — had nowhere to go without
  either a third positional parameter or an object. The object also lets the type say which fields
  reach the database and which are matched in memory, a distinction that is invisible at the call
  site and was previously carried only by a comment.
- **Migration:** the parameter is a union, so both forms compile and behave identically;
  `toTaskFilter` normalizes them at the top of each implementation. Removing the array form is a
  one-line change to that helper plus the two runner signatures.
- **Code refs:**
  - `src/server/modules/task-runner/TaskRunner.interface.ts` (the union, `TaskFilter`, `toTaskFilter`)
  - `src/server/modules/task-runner/payload-jobs-runner/PayloadJobsTaskRunner.ts`
  - `src/server/modules/task-runner/sync-runner/SyncTaskRunner.ts`
  - `src/server/features/get-document-status/handler.ts` (a remaining array-form caller)

### cancel-by-collection-route

- **What:** `POST {basePath}/cancel-by-collection` endpoint.
- **Status:** planned
- **Deprecated:** 2026-06-05 / PR #TBD
- **Replacement:** unified `POST {basePath}/cancel` accepting `{ ids: string[] } | { collection: slug }`.
- **Remove in:** next major
- **Why:** two routes differing only in the where-clause shape. After unification the old route
  becomes a thin alias delegating to the same handler.
- **Code refs:**
  - `src/server/features/cancel-by-collection/`
  - `src/server/features/cancel/`

### translate-collection-plugin-class

- **What:** `TranslateCollectionPlugin` class.
- **Status:** live (already `@deprecated` in code)
- **Deprecated:** pre-ledger (annotated before this registry existed)
- **Replacement:** `translatorPlugin()` function.
- **Remove in:** next major
- **Code refs:** `src/plugin.ts`

### create-translate-plugin

- **What:** `createTranslatePlugin` alias.
- **Status:** live (already `@deprecated` in code)
- **Deprecated:** pre-ledger
- **Replacement:** `translatorPlugin()`.
- **Remove in:** next major
- **Code refs:** `src/plugin.ts`

### translate-kit-field

- **What:** `translateKitField` alias.
- **Status:** live (already `@deprecated` in code)
- **Deprecated:** pre-ledger
- **Replacement:** `withFieldTranslation()`.
- **Remove in:** next major
- **Code refs:** `src/field-config.ts`

### translate-kit-field-config-type

- **What:** `TranslateKitFieldConfig` type alias.
- **Status:** live (already `@deprecated` in code)
- **Deprecated:** pre-ledger
- **Replacement:** `FieldTranslationConfig`.
- **Remove in:** next major
- **Code refs:** `src/field-config.ts`

### openai-translation-provider-class

- **What:** `OpenAITranslationProvider` class.
- **Status:** live (already `@deprecated` in code)
- **Deprecated:** pre-ledger
- **Replacement:** `createOpenAIProvider()` factory.
- **Remove in:** next major
- **Code refs:** `src/translation-providers/openai/OpenAITranslationLegacy.provider.ts`

### provider-dry-run

- **What:** the `dryRun` option on `TranslationProviderConfig` and `OpenAIProviderConfig`, and with
  it the exported `DryRunConfig` / `DryRunTransformer` types.
- **Status:** live
- **Deprecated:** 2026-08-28 / PR #101
- **Replacement:** supply your own fake request function —
  `createTranslationProvider({ complete })`, or `createOpenAIProvider({ client })` with a stub
  client. Both reach no network and need no API key. The README carries the recipe; the package
  deliberately does **not** ship a ready-made fake, because that would be this option again under a
  new name.
- **Remove in:** next major
- **Why:** the name promises a rehearsal the option cannot deliver. It lives on the provider, so it
  can only skip the network call. Everything downstream runs as in a real translation: the
  transformed strings are written to the target locale, published when `publishOnTranslation` is
  set, and recorded as provenance. The recorded fingerprint then matches the source, so
  `isRecordStale` reports the locale as up to date — the staleness indicator stays hidden and a
  later real translation is not prompted. The source locale is never touched.

  Two use cases hid under one name. "Run without an API key or network" is replaced today, by the
  injection points above. "See what would happen without changing anything" never existed here; a
  genuine dry run belongs at the operation level — run the pipeline, skip the write and the
  provenance record, return the would-be result — and is separate work. Removal does not wait for
  it, because the second use case never worked.

  Known wart, left as is for the same reason: the built-in transformer reverses by UTF-16 code unit
  (`split("")`), so text outside the basic plane comes back mangled.
- **Code refs:** `src/translation-providers/shared/runDryRun.ts`,
  `src/translation-providers/shared/CompletionProvider.provider.ts`,
  `src/translation-providers/openai/OpenAITranslation.provider.ts`

### openai-client-construction

- **What:** the layer that builds an OpenAI SDK client for you — `createOpenAIProvider`,
  `OpenAIProviderConfig`, the `loadOpenAIClient` module behind them, and the already-deprecated
  `OpenAITranslationProvider` class that delegates to `createOpenAIProvider`. The `openai` entry in
  `optionalDependencies` goes with them.
- **Status:** live
- **Deprecated:** 2026-08-28 / PR #101
- **Replacement:** construct the client yourself and hand it to `openAIComplete`, which stays:

  ```ts
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 60_000 });

  translationProvider: createTranslationProvider({
    complete: openAIComplete({ client, model: "gpt-4o" }),
  }),
  ```
- **Remove in:** next major
- **Why:** what makes this layer expensive is not knowing how to call OpenAI — it is carrying the
  SDK as an *optional* dependency of ours. `loadOpenAIClient` imports it through a module-level
  specifier constant because deployment file-tracers resolve `import()` statically and silently
  prune anything else; `importOpenAISdk.test.ts` exists to guard that exact source shape after the
  defect it caused reached production-shaped code; `isModuleNotFound` tells "not installed" from
  "installed but broken" across four runtimes' wordings. Every line of that exists so a package the
  consumer may not have can be absent safely. A consumer who imports the SDK they already chose
  needs none of it, and gains their own SDK version.

  **What is *not* deprecated, and why the first cut of this entry was wrong:** `openAIComplete`,
  `OpenAIClientShape` and the `OpenAI.shapes.ts` types stay. They carry vendor *knowledge* with no
  vendor *dependency* — `OpenAI.shapes.ts` bans the import in its first line, and `openAIComplete`
  never names the package, taking a structural client slice instead. Deprecating them would have
  handed every consumer the request body, the envelope choice and the schema-rejection advice to
  maintain themselves, which is the opposite of the point.
- **Code refs:** `src/translation-providers/openai/OpenAITranslation.provider.ts`,
  `src/translation-providers/openai/loadOpenAIClient.ts`,
  `src/translation-providers/openai/OpenAITranslationLegacy.provider.ts`

### experimental-inline-marks

- **What:** `translatorPlugin({ experimental: { inlineMarks } })`.
- **Status:** live (`@deprecated` in code from the day it shipped)
- **Deprecated:** 2026-09-11 / PR #139 (issue #134)
- **Replacement:** none — the behaviour becomes the only mode, so the switch simply goes away.
- **Scope:** this entry only. The `experimental` option itself is permanent — it is where the
  next transitional switch will live, so removing `inlineMarks` does not remove the object.
- **Remove in:** next major
- **Why:** a transitional switch, not a supported choice. Translating rich text node by node pins
  every word to its source position, which is a defect, not a preference — so there is nothing to
  keep choosing between. The flag exists only so an install can adopt the change on its own
  schedule and step back if its provider misbehaves. The next major removes **the flag**, not the
  per-node code: that stays as the internal fallback for a mark-shaped source, a single-fragment
  container, and a corrupt reply.
- **After removal, a provider still decides:** `capabilities.inlineMarks` is core logic, not part of
  the flag, and survives it. A third-party `TranslationProvider` that never declares the capability
  therefore keeps translating node by node indefinitely — the mode this entry calls a defect — with
  no warning surface. Provider authors need telling, separately from this flag's own removal.
- **Code refs:**
  - `src/plugin.ts` (the option)
  - `src/core/translation-pipeline/translateContent.ts` (the single switch between the two paths)
  - `src/core/translation-pipeline/stages/text-expander/RichContainerExpander.ts`
  - `docs/plans/2026-09-08-richtext-container-granularity-design.md` (D8, D8a)
