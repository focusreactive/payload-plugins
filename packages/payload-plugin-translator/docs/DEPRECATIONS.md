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
- **Why:** the relationship field validates the stored value's type against the target collection's
  ID type, so a string id for a number-id collection silently fails validation and the job hangs in
  `processing`. Flat text fields make the job input ID-agnostic. See
  [jobs ID-agnostic migration](./plans/2026-06-05-jobs-id-agnostic-migration.md).
- **Migration:** expand/contract. New jobs write text fields; the relationship field stays as a
  read-only fallback (`required: false`, `admin.readOnly: true`) so jobs queued before the change
  remain readable. Removed (along with the fallback read path) in the next major.
- **Code refs:**
  - `src/server/modules/task-runner/payload-jobs-runner/PayloadJobsRunnerProvider.ts` (inputSchema, handler input type/unpacking)
  - `src/server/modules/task-runner/payload-jobs-runner/PayloadJobsTaskRunner.ts` (enqueue write, `findByCollection` / `findJobsInternal` query + in-memory filter)
  - `src/server/modules/task-runner/payload-jobs-runner/normalizeJob.ts` (read fallback)
  - `src/server/modules/task-runner/payload-jobs-runner/types.ts` (`PayloadJob.input` shape)

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
- **Code refs:** `src/translation-providers/openai/OpenAITranslationProvider.deprecated.ts`

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

### built-in-openai-adapter

- **What:** the whole built-in OpenAI adapter — `createOpenAIProvider`, `OpenAIProviderConfig`,
  `OpenAIClientShape`, `OpenAISamplingParams`, `OpenAIStructuredOutput`, and the already-deprecated
  `OpenAITranslationProvider` class that delegates to it. Everything under
  `src/translation-providers/openai/` goes as a unit, and the `openai` optional dependency goes with
  it.
- **Status:** live
- **Deprecated:** 2026-08-28 / PR #101
- **Replacement:** `createTranslationProvider({ complete })` plus your own `openai` client — about a
  dozen lines, recipe in the README. The SDK version becomes yours, and the envelope choice sits in
  your own code where you can see it.
- **Remove in:** next major
- **Why:** the adapter exists to carry someone else's dependency, and carrying it optionally is what
  makes it expensive. `loadOpenAIClient` lazily imports the SDK through a module-level constant
  because deployment file-tracers resolve `import()` statically and silently prune anything else;
  `OpenAI.shapes.ts` hand-writes a structural slice of the SDK's client, with a conformance test to
  catch drift, so no vendor type enters the emitted declarations. None of that machinery is needed
  by a consumer who simply imports the SDK they already chose.

  The 0.11.0 layering made this possible: once `createTranslationProvider({ complete })` exists and
  `createOpenAIProvider` accepts an injected `client`, the wrapper's remaining job is defaults and a
  request body — a dozen lines the consumer is better placed to own.

  What a consumer gives up, stated plainly so the README recipe can cover it: the message that names
  `structuredOutput: "json_object"` when a gateway rejects a strict schema, the guard against
  `json_object` with a prompt that never says "json", and the 60 s default timeout in place of the
  SDK's ten minutes.

  This also settles the shape of the planned Anthropic / Gemini / OpenRouter work (issue #100): the
  package ships recipes, not adapters.
- **Code refs:** `src/translation-providers/openai/` (the directory as a whole)
