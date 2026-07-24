# Issue #46 — Configurable single/multi target-language selection

**Status:** Research (pre-task investigation) · **Date:** 2026-07-22 · **Issue:** #46
**Skill:** /sp-research output. Feeds /sp-task once the blocking questions are resolved.

---

## Problem Statement

Translating a document into several locales today is one language per run: the editor
repeats the whole flow — pick target, submit, wait — once per language, in both the bulk
dashboard and the per-document panel. For any multi-locale site this is a repetitive,
everyday chore and reads as an incomplete translation tool. The need: let an editor pick
**N target languages** and queue them all in a single action, opt-in per install and fully
backward-compatible.

## Parsing summary

- **Source:** GitHub issue #46 (well-specified, `enhancement` + `good first issue`).
- **Explicit:** config `targetSelection: 'single' | 'multi'` (default single); `/enqueue`
  accepts `target_lng: string | string[]`; fan out one task per (document × target);
  multi-select in both forms; status reflects every queued target; source stays single.
- **Implicit:** locale validation, source-locale exclusion, empty-selection handling,
  in-batch de-dup, the config→client wiring.
- **Constraint:** default (`single`) behaviour must be byte-identical (back-compat).

## Key finding — the hard part is already done

The status/provenance/runner layers are **already per-(document, target-locale)** and the
multi-target path is exercised in production by auto-translate (#51):

- **Runner** dedups/supersedes strictly per `(document, targetLng)` — both `SyncTaskRunner`
  (`SyncTaskRunner.ts:87-89`) and `PayloadJobsTaskRunner`
  (`PayloadJobsTaskRunner.ts:11-12,34-42`). N targets of one doc coexist; a concurrent
  different-locale job is never cancelled (that was the PR #75 fix).
- **Status** is per-locale: `latestTaskPerTargetLocale` (`get-document-status/model.ts:76-83`),
  client keys rows by `target_lng` (`statusRows.ts:73-80`). Collection dashboard counts are
  **job-counts** (3 locales of 1 doc = 3 entries) — a semantic nuance, not a bug.
- **Provenance** rows keyed `(collectionSlug, documentId, targetLocale)`
  (`Provenance.store.ts:21-29,63-76`) → N targets = N independent rows, no collision.
- **Reuse precedent:** `buildAutoTranslateTasks` (`AutoTranslate.policy.ts:124-147`) is the
  exact fan-out loop (one `TaskInput` per target, source excluded); config de-dups targets
  with `new Set` (`AutoTranslate.policy.ts:26-37`); `extractLocaleCodes` +
  `filterPolicyToKnownLocales` (`:47-83`) validate/drop unknown locales with a warning.

So the change is localized to the **manual enqueue contract + the client forms + the config
option wiring** — everything downstream already tracks each target independently.

## Proposed Scope

**IN**
- Widen the enqueue input to accept multiple target locales (shape = blocking Q1).
- Server handler: cross-product `collection_id[] × target_lng[]`, de-dup targets, validate
  against configured locales, exclude the source locale — reusing the auto-translate helpers.
- New plugin config option `targetSelection: 'single' | 'multi'` (default `'single'`),
  threaded to the client via the existing `serverProps` channel.
- Multi-select target UI in **both** the bulk dashboard
  (`collection-translation-form`) and the per-document panel (`translate-document-form`),
  rendered only when `multi`; single mode unchanged.
- Widen the two client zod schemas + the mutation `Variables` accordingly.

**OUT**
- Multi **source** language (stays single — explicit in the issue).
- Global cross-collection dashboard (#49), per-field selection (#48).
- Per-target existing-translation / in-progress indicators (separate enhancement, already
  partly covered by the per-locale status model).
- Any DB/schema/migration change (there is none — no new persisted field).

### Non-functional scan
- **Performance** — *relevant*: `select_all` × N targets can enqueue a large batch
  (documents × locales). Consider a sane cap / warning. Runner handles volume, but the
  cross-product grows multiplicatively.
- **Security / access control** — *relevant*: the `/enqueue` access guard is unchanged, but
  the server must **not trust the client's locale list** — validate targets against
  `payload.config.localization.locales` server-side (an unknown locale can error on Postgres
  locale enums or orphan data on Mongo/SQLite).
- **Accessibility** — *relevant*: the new multi-select must be keyboard + screen-reader
  usable. `@payloadcms/ui` `ReactSelect` (`isMulti`) covers this.
- **i18n / localization** — *core to the feature*: locale validation, source exclusion,
  behaviour when localization is disabled (hide multi).
- **Observability** — *relevant*: log dropped unknown/duplicate locales (reuse the
  auto-translate config-time warning pattern); provenance write is already best-effort logged.

## Acceptance Criteria (draft)

1. **Back-compat**: with no config or `targetSelection: 'single'`, behaviour is unchanged and
   `/enqueue` still accepts a scalar `target_lng`. *(check: existing enqueue handler/route
   tests stay green.)*
2. **Schema accepts both**: `EnqueueInputSchema.target_lng` accepts `string` **and**
   `string[]`. *(check: unit test on the schema — both parse.)*
3. **Fan-out**: in `multi`, submitting M documents × N targets queues exactly one task per
   `(document, target)` pair. *(check: integration test — count jobs/provenance rows.)*
4. **Unknown-locale (negative)**: a target not in the configured locales is dropped with a
   logged warning and never reaches the provider; valid targets still run. *(check:
   integration test — no phantom job/record for the unknown locale.)*
5. **De-dup**: duplicate targets in one request collapse to one task per locale. *(check:
   unit/integration test.)*
6. **Source excluded (edge)**: selecting the source locale as a target is dropped (no
   self-translation task). *(check: test.)*
7. **Empty selection (negative)**: `multi` with zero targets is rejected by both the form and
   the server schema (≥1 required). *(check: form validation + schema test.)*
8. **Status**: every queued target surfaces independently in the per-document panel and the
   collection progress. *(check: existing per-locale status coverage + one multi-target case.)*
9. **Both entry points**: the multi-select renders in both the bulk dashboard and the
   per-document panel when enabled; single mode renders the current single select. *(check:
   manual/RTL.)*

## Open Questions

Coverage scan (each item → captured or confirmed answered):

1. **[API shape]** *[blocking → RESOLVED, see Clarifications]* — Widen `/enqueue` `target_lng` to
   `string | string[]`, add a separate `/enqueue-many`, or fan out N single-target calls
   client-side? Matters: sets the entire change surface + back-compat story. Note: a **dead
   orphan** `useQueueDocumentTranslations` already posts to a non-existent `/enqueue-many` route
   (`useQueueDocumentTranslations.ts:21`, no route in `createTranslationRoutes.ts`) — either
   repurpose or delete it.
2. **[Config granularity]** *[blocking → RESOLVED, see Clarifications]* — Is `targetSelection` a
   single install-global option, or per-collection / per-level (`documentLevel` vs
   `collectionLevel`)? Matters: wiring complexity vs flexibility; the issue implies global.
3. **[Concurrency]** *[non-blocking]* — Under the async jobs runner, N targets run
   `payload.update` on the same document row concurrently. Localized writes are locale-scoped
   (safe); non-localized / draft-version writes could theoretically race. Default: **accept**,
   because auto-translate already fans out this way in production without serialization.
4. **[Partial failure]** *[non-blocking]* — One target's task failing must not block the
   others. Default: independent tasks (already the runner's behaviour).
5. **[Batch cap]** *[non-blocking]* — `select_all` × N targets could be a very large batch.
   Default: no hard cap in v1, but log the enqueued count; revisit if it bites.
6. **[Localization off]** *[non-blocking]* — With localization disabled, `multi` has nothing
   to select. Default: fall back to single / hide (mirror `useLocaleOptions` returning `[]`).
7. **[Multi-select primitive]** *[non-blocking]* — Reuse `@payloadcms/ui` `ReactSelect`
   (`isMulti`); no in-package multi-select exists. Implementation detail for /sp-task.

**Restate check:**
- *"multi target selection"* = the editor picks several target locales and **one** submit
  queues them all (not sequential re-submits). Confirmed against issue + code.
- *"single (default)"* = today's exact behaviour, scalar `target_lng`. Confirmed.
- *"targetSelection"* = install-time plugin config, not a per-run editor toggle (granularity
  = Q2). Confirmed as config, granularity open.

## Clarifications

Resolved 2026-07-22. The two blocking questions were answered with the **recommended defaults**
(adopted in the absence of an explicit response — flagged so they are cheap to override before
/sp-task starts).

1. **API shape → widen `/enqueue`.** `target_lng` becomes `string | string[]` on the same
   endpoint; scalar keeps working (back-compat by construction). The dead
   `useQueueDocumentTranslations` → `/enqueue-many` orphan is **deleted** (not repurposed) — no
   need for a second path. Affects `EnqueueInputSchema` (`enqueue-translation/model.ts:9`), the
   handler loop (`handler.ts:44-54`), the mutation `Variables` (`useQueueDocumentTranslation.ts:12`),
   and the two client zod schemas.
2. **Config granularity → install-global.** A single `targetSelection: 'single' | 'multi'`
   (default `'single'`) on `TranslatorPluginConfig`, threaded to both widgets via the existing
   `serverProps` channel (same path as `hasDrafts`). No per-collection/per-level split in v1;
   can be refined later without breaking the global default.

These fold into ACs 1–3, 9 and the Scope above (no changes needed — they already assumed these
defaults).

## UI design — compact multi-select (open discussion)

The tension: a multi-select naturally *grows* with each selection, but the target control must
stay compact — especially in the **per-document panel** (tight), less so in the bulk dashboard.
Locales are short codes (en, de, fr…), usually 2–15. "From/To" should stay a single row in both
modes; **single mode is unchanged**. All three options build on the shipped `@payloadcms/ui`
`ReactSelect`.

- **Option A — checkbox dropdown + summary trigger (RECOMMENDED).** Collapsed trigger is always
  one line, showing a summary (`de, fr +2` / `All (5)`); multiplicity lives in the popover with
  checkboxes + "Select all". Fixed footprint regardless of count, scales to any number of
  locales, least surprising in Payload admin. Built as `ReactSelect` with
  `closeMenuOnSelect=false`, `hideSelectedOptions=false`, `controlShouldRenderValue=false` + a
  custom summary.
- **Option B — chips with overflow.** Standard `isMulti`: selected show as removable chips
  inside the field, collapsing to `+N`. Familiar, quick per-item remove, but without a display
  limit the field jumps in height (only compact if we cap visible chips).
- **Option C — inline toggle chips.** A row of small toggleable code-chips, no popover. Fastest
  for 2–6 locales and everything visible, but wraps and eats vertical space at 10+ — risky in the
  tight panel.

**DECISION (2026-07-22, confirmed by user):** Option A, built as a **custom
`FormMultiSelectLocale`** — NOT react-select:
- **Popover:** `@radix-ui/react-popover` (already a plugin dependency → zero new deps) wrapping
  an **inline checkbox list** with a "Select all" row.
- **Trigger:** fixed single-line, shows **up to 2 locale codes + `+N`** overflow
  (`de, fr +2`); `0` selected → placeholder (`Languages…`); all selected → `All (N)`. Codes,
  not names, in the trigger (matches single-mode).
- **Form binding:** symmetric with `FormSelectLocale` — `useController`, value `string[]`,
  `onChange`. Lives in `src/client/shared/ui/form/FormMultiSelectLocale/`.
- **Progressive search:** add a filter input in the popover header only when option count is
  large (> ~8 locales); omit for the common small-locale case.
- **Visual parity:** trigger border/height matches the current `FormSelectLocale` so the
  single↔multi swap reads as native.
- **"Select all" semantics:** a snapshot of currently-configured locales (we enqueue an
  explicit code list), not "all future locales".
- Rejected: B (chips overflow) and C (inline toggle chips) — see options above.

- **Do not trust client locales** — server-side validation is mandatory (Postgres enum / orphan
  data failure mode).
- **In-batch de-dup is the caller's job** — the runner only dedups against *stored* jobs, not
  within one enqueue batch (reuse the `new Set` precedent).
- **Two duplicated client schemas** (`collection-translation-form` + `translate-document-form`)
  must be changed together; watch for drift.
- **Back-compat is a hard constraint** — scalar `target_lng` must keep working end-to-end.
- **No migration** — feature adds no persisted field.

## Consistency self-check

- Every IN-scope item maps to an AC (fan-out→3, config→9, validation→4/6, schema→2, forms→9). ✓
- No AC contradicts an OUT line or a constraint (back-compat AC1/2 vs constraint). ✓
- All ACs are verifiable (test/manual noted). ✓
- Coverage-scan items are each captured as an Open Question or an AC. ✓

## Comprehension

**8 / 10.** The technical surface is well understood and the multi-target infrastructure is
proven (auto-translate already fans out). The two open items are **product decisions** (API
shape, config granularity), not technical unknowns — hence blocking for a clean /sp-task, but
low-risk to resolve.

## Suggested Next Step

**Ready for `/sp-task`.** Both blocking questions are resolved (see Clarifications — provisional
defaults, easy to override). No new data model, no migration; the change reuses an existing
config→client seam and the proven auto-translate fan-out, so this is line-level implementation,
not a system-design problem (no `/sp-architect` needed).
