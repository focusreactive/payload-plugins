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
- **Deprecated:** 2026-06-05 / PR #TBD
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
- **Code refs:** `src/server/modules/translation-providers/OpenAITranslation.provider.ts`
