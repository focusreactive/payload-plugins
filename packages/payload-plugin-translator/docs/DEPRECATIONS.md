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

- **Removal policy.** Deprecations ship as `feat:` (minor). Removals land in the next major, grouped
  rather than drip-fed — each one in the step of the major that rewrites its area.
- **How a removal is committed.** An ordinary `feat(scope): …` header plus a `BREAKING CHANGE:`
  footer in the body. **Never a `!` in the header.** `.releaserc.json` sets no `preset`, so the
  `angular` one is used, and its header pattern has no place for `!` — such a header fails to parse
  and the commit may not be read as a release at all. The footer is what the preset's
  `noteKeywords` reads, and it is the only thing that produces a major. Same reasoning as
  [runner-create-takes-the-context](#runner-create-takes-the-context).

## Status legend

- `live` — annotated and in use as a fallback / alias; safe to remove in the next major.
- `planned` — agreed to deprecate, not yet annotated in code.
- `removed` — gone from the code. The entry stays, because it is what tells an upgrading host
  what used to be there and what replaced it; the `Removed:` line says when.

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
  - `src/server/modules/task-runner/payload-jobs-runner/store/normalizeJob.ts` (read fallback)
  - `src/server/modules/task-runner/payload-jobs-runner/store/types.ts` (`PayloadJob.input` shape)

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
  - `src/server/modules/task-runner/payload-jobs-runner/model/planEnqueue.ts` (`pickHost` skips it)
  - `src/server/modules/task-runner/payload-jobs-runner/store/normalizeJob.ts` (`normalizeJobLocales`
    expands it to itself)

### translate-positional-languages

- **What:** `TranslationProvider.translate(input, sourceLng, targetLng, options?)` — the two language
  codes as adjacent positional strings, with everything else in a trailing optional bag.
- **Status:** planned
- **Deprecated:** not yet annotated — agreed 2026-10-15 while implementing #109.
- **Replacement:** `translate(input, ctx)`, one object carrying the languages, the document and the
  switches. `ctx` is **not** optional, so the document is required outright — today it is required
  inside an optional parameter, which is as close to the truth as the current signature allows.
- **Remove in:** next major
- **Why:** two adjacent parameters of the same type can be swapped silently, and no test catches it.
  The trailing bag then forced a second mistake: `collection` and `documentId` arrived as *options*
  beside `inlineMarks`, mixing what is being translated with how. #109 fixed the second half by
  grouping them as `document: DocumentRef`; the first half cannot be fixed without breaking the
  signature.
- **Migration:** mechanical, and narrower than it looks. The path the README recommends —
  `createTranslationProvider({ complete })` — is unaffected: `CompletionFn` already takes a single
  `CompletionRequest` object. Only a host that implements `TranslationProvider.translate` by hand has
  to change, and `TranslationRequestOptions` disappears into `ctx` rather than being removed.
- **Note:** `docs/plans/2026-08-21-translation-mechanism-kernel-extraction.md` reshapes this port
  anyway. Doing it before that lands would be the same work twice, which is why it waits.

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

- **What:** `TranslateCollectionPlugin` class, and the `TranslateCollectionPluginConfig` type
  alias beside it.
- **Status:** removed
- **Deprecated:** pre-ledger (annotated before this registry existed)
- **Removed:** 2026-10-19 / PR #184
- **Replacement:** `translatorPlugin()` function, and `TranslatorPluginConfig`.
- **What moved with it:** the class held the whole plugin body and `translatorPlugin` only
  constructed it. The body now lives in the function, which is where a host's configuration
  file expects it — Payload's own config API is functions and plain objects, and this class
  was the only `new` a host had to write.
- **Code refs:** `src/plugin.ts` (`translatorPlugin`)

### create-translate-plugin

- **What:** `createTranslatePlugin` alias.
- **Status:** removed
- **Deprecated:** pre-ledger
- **Removed:** 2026-10-19 / PR #184
- **Replacement:** `translatorPlugin()`.
- **Code refs:** `src/plugin.ts`

### translate-kit-field

- **What:** `translateKitField` alias.
- **Status:** removed
- **Deprecated:** pre-ledger
- **Removed:** 2026-10-19 / PR #184
- **Replacement:** `withFieldTranslation()`.
- **Code refs:** `src/field-config.ts`

### translate-kit-field-config-type

- **What:** `TranslateKitFieldConfig` type alias, both the public one and the internal copy in
  `core/domain/field-config/`, along with the `getTranslateKitFieldConfig` alias that read it.
- **Status:** removed
- **Deprecated:** pre-ledger
- **Removed:** 2026-10-19 / PR #184
- **Replacement:** `FieldTranslationConfig`, and `getFieldTranslationConfig` internally.
- **Code refs:** `src/field-config.ts`, `src/core/domain/field-config/`

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
- **Status:** removed
- **Deprecated:** 2026-09-11 / PR #139 (issue #134)
- **Removed:** 2026-10-19 / PR #186
- **Replacement:** none for the host. What used to be two conditions is now one: a provider that
  declares `capabilities.inlineMarks` gets container-granular rich text, and one that does not keeps
  translating node by node. Nothing is configured.
- **Scope, revised when it was removed.** This entry said the `experimental` option itself was
  permanent, being where the next transitional switch would live. That was reversed by the owner on
  2026-10-19: `inlineMarks` was its only entry, so keeping it would have published an option that
  accepts nothing for the whole of 1.x — and adding an option back is additive and ships in a minor,
  while removing one is breaking and can only ship in a major. The object went with its entry.
- **Who this changes, and how to keep the old behaviour.** Every host whose provider declares
  `capabilities.inlineMarks` **and** that had the flag off or never set it. That is not a corner: the
  bundled OpenAI provider declares it (`OpenAITranslation.provider.ts:134`), so an install that never
  opted in moves from node-by-node to container-at-a-time rich text on upgrade — which may reorder
  the pieces of a paragraph and changes the shape that gets saved. There is no flag to pin the old
  behaviour any more; the only way back is a provider that does not declare the capability, which a
  host can arrange by wrapping theirs. Ships in a major, by itself.
- **Why:** a transitional switch, not a supported choice. Translating rich text node by node pins
  every word to its source position, which is a defect, not a preference — so there is nothing to
  keep choosing between. The flag exists only so an install can adopt the change on its own
  schedule and step back if its provider misbehaved. This major removed **the flag**, not the
  per-node code: that stays as the internal fallback for a mark-shaped source, a single-fragment
  container, and a corrupt reply — and it is what a provider silent about marks still gets.
- **After removal, a provider still decides:** `capabilities.inlineMarks` is core logic, not part of
  the flag, and survives it. A third-party `TranslationProvider` that never declares the capability
  therefore keeps translating node by node indefinitely — the mode this entry calls a defect — with
  no warning surface. Provider authors need telling, separately from this flag's own removal.
- **Code refs:**
  - `src/core/translation-pipeline/translateContent.ts` (the one condition that now decides)
  - `src/core/translation-pipeline/stages/text-expander/RichContainerExpander.ts`
  - `docs/plans/2026-09-08-richtext-container-granularity-design.md` (D8, D8a)

### enqueue-void-return

- **What:** `TaskRunner.enqueue` resolving with nothing.
- **Status:** live
- **Deprecated:** 2026-10-07 / PR pending (issues #107, #110)
- **Replacement:** resolve with one assignment per requested locale — the shape `TaskRunnerProvider`
  infers for `enqueue`; an implementation returns it as an object literal and needs no import.
- **Remove in:** next major
- **Why:** the handle is what every later message about the work is keyed by — `onCompleted`,
  `onFailed`, `onCancelled`, the enqueue answer and the cancel route all name it. A runner that
  answers with nothing leaves its host unable to connect any of them to the request it made.
- **Why the return type widened instead of changing:** `enqueue` is implemented outside this
  package. Narrowing it to `EnqueueAssignment[]` would break every third-party runner on upgrade,
  and a pair of overloads cannot express the transition — an implementation must satisfy every
  overload, so the old shape would stop compiling just the same.
- **What a `void` runner loses today:** nothing throws and nothing is logged. The enqueue response
  reports no handles, and the lifecycle callbacks arrive without one. Both degrade silently and on
  purpose: the alternative is a warning on a path the host cannot fix from where it sees it.
- **Code refs:**
  - `src/server/modules/task-runner/TaskRunner.interface.ts` (the widened return)
  - `src/server/modules/task-runner/__tests__/TaskRunner.conformance.types.ts` (a `void` runner
    still compiles; narrowing the contract fails the build)
  - `src/server/features/enqueue-translation/handler.ts` (the answer, when handles exist)

### on-failed-per-attempt

- **What:** `lifecycle.onFailed` firing once per execution attempt.
- **Status:** removed (behaviour change, not an annotated symbol)
- **Changed:** 2026-10-07 / PR pending (issue #110)
- **Replacement:** `onFailed` fires once per target locale, and only when that locale will not be
  translated. A runner that retries decides when that is and says so itself, by reporting the
  `failed` event of `TaskRunnerContext.report`.
- **Why this is listed although nothing was renamed:** a host counting `onFailed` calls, or treating
  one as "this translation is dead", was reading a signal that did not mean that. Silently making it
  mean that is the fix, but an install that disabled retries *because* of the old behaviour should
  know it can turn them back on.
- **What else moved with it:** a locale the run never reached is now reported too, with the error
  that ended the run rather than one of its own — nothing ran for it to throw.
- **Code refs:**
  - `src/server/features/translate-document/wireTranslateRunner.ts` (turns a reported event into a callback)
  - `src/server/modules/task-runner/payload-jobs-runner/model/owedIfGaveUp.ts` (when a run has stopped for good)
  - `src/server/modules/lifecycle/types.ts` (`TranslationLifecycleCallbacks`)

### runner-create-takes-the-context

- **What:** `TaskRunnerProvider.create(payload, handler)` — the second argument.
- **Status:** removed
- **Changed:** 2026-10-12 / PR #177
- **Replacement:** `create(payload, context)`, where `context` is the whole `TaskRunnerContext` —
  the same object `configure` has always been handed. The handler is `context.handler`.
- **Why:** a runner now tells the plugin what became of every assignment it accepted, through
  `context.report`, so it needs the channel and not just the handler. `report` is required rather
  than optional so that omitting it fails the build instead of leaving a host hearing nothing.
- **Who this breaks:** only a `TaskRunner` implemented outside this package — `TaskRunnerProvider`
  is exported from the barrel, so a runner written against 0.15.0 will not compile. A host that
  merely configures the plugin sees no change: the callbacks, their arguments, the runner factories
  and every HTTP response are as they were.
- **Why it ships in a minor rather than a major:** the owner's call, taken on 2026-10-12 — the
  package is pre-1.0 and a third-party runner is a surface nobody is known to have implemented yet.
  It is recorded here rather than in the changelog because the project's commit-analyzer preset
  (`angular`, the default, since `.releaserc.json` sets no `preset`) does not read the `!` marker in
  a commit header at all, and the `BREAKING CHANGE:` footer it does read would force 1.0.0.
- **Code refs:**
  - `src/server/modules/task-runner/TaskRunnerProvider.interface.ts` (`create`, and `report` on the
    context)
  - `src/server/modules/task-runner/__tests__/TaskRunner.conformance.types.ts` (a complete outside
    runner, compiled against the published barrel)
  - `src/server/features/translate-document/wireTranslateRunner.ts` (the one place that builds a
    context)

## 2026-10-22 — `skip_existing` refreshes on drift, whoever wrote the target

**Status:** live · **Removal target:** next major (this one)

A run used to record `null` against every leaf it saw and did not send, and both readers took that
as *claim nothing*. The leaf then never read as out of date and `skip_existing` never selected it
again, however far its source drifted. The receipt now records where each leaf's source stood when
the run ended, whether the run translated that leaf or left it alone.

**What changes for a host.** `skip_existing` re-translates a non-empty target once its own source
text moves — including text a person typed or corrected. It never asked who wrote the target; it
simply had no way to tell a leaf it had skipped from one it had never seen.

**Why this is listed although nothing was renamed.** `README.md` promised "Protect hand-written
copy — the `skip_existing` strategy fills only empty target fields", and a host reading that was
relying on a guarantee the plugin no longer makes. Same precedent as `on-failed-per-attempt`.

**What to do instead.** `withFieldTranslation(field, { exclude: true })` keeps a field out of every
run. Per-document, per-field control arrives with the field picker (#48).

**Stored receipts** written before this date are read leaf by leaf as before; a `null` in one is
taken as *revisit this leaf*, and the first run that translates that leaf records a hash in its
place. A leaf whose source is empty is never sent, so its `null` is carried forward and the locale
keeps flagging until the source has text again.

### levels-become-modules-and-components

- **What:** the `levels` plugin option and the four names it needed — `documentLevel()`,
  `collectionLevel()`, `fieldLevel()` and the `TranslationLevel` type.
- **Status:** removed
- **Changed:** 2026-10-22 / #198
- **Replacement:** two required lists, `modules` and `components`. Either may be `[]`.

  | Was | Becomes |
  | --- | --- |
  | `levels: [documentLevel()]` | `modules: [documentTranslation()]` · `components: [translateDocumentControl()]` |
  | `levels: [collectionLevel()]` | `modules: [documentTranslation()]` · `components: [bulkTranslationDashboard()]` |
  | `levels: [fieldLevel()]` | `modules: [fieldTranslation()]` |
  | omitted (the old default) | `modules: [documentTranslation()]` · `components: [translateDocumentControl(), bulkTranslationDashboard()]` |

- **Why:** a level was a server surface and an admin control welded together, and the two have
  nothing to do with each other — a control runs in the browser and is loaded by path, while the
  routes behind it are server wiring. Separating them is what lets provenance, which contributes
  routes and a collection but no control, be listed the same way everything else is. The document
  and collection levels registered the *same* route bundle, which is the only reason endpoints are
  deduplicated at all; once the controls moved out, the two were indistinguishable and collapsed
  into one module.
- **No default:** an omitted option used to mean two surfaces, silently. Both lists are now
  required, and omitting either fails at boot with the table above in the message. `[]` is a real
  answer: auto-translate runs from a save hook and needs no route.
- **Who this breaks:** every host. A plugin config that sets `levels`, or relies on its default,
  does not compile and does not boot.
- **Code refs:**
  - `src/plugin.ts` (`modules`, `components`, and the refusal)
  - `src/composition/modules/`, `src/composition/components/`
  - `src/server/modules/plugin-config/types.ts` (`TranslationModule`, `TranslationComponent`)

### runner-context-carries-the-attempt-count

- **What:** `TaskHandlerInput` gains a required `previousAttempts: number`.
- **Status:** removed (the old shape)
- **Changed:** 2026-10-22 / #198
- **Replacement:** a runner supplies the number of times this locale was tried before the attempt
  now running — zero on the first, and zero always for a runner that never retries.
- **Why:** a module joining a translation run may need to behave differently on a replay, and the
  count already exists on the job row. Reading it in the runner, where it lives, is cheaper and
  more honest than every module guessing.
- **Who this breaks:** only a `TaskRunnerProvider` implemented outside this package. The built-in
  runners both supply it; a host that merely configures the plugin sees no change.
- **Code refs:**
  - `src/server/modules/task-runner/TaskRunnerProvider.interface.ts`
  - `src/server/modules/task-runner/payload-jobs-runner/model/attemptsBefore.ts`
