# Translator plugin — audit findings & roadmap

**Date:** 2026-06-15
**Status:** Research / findings (no code). Feeds a set of follow-up `/task`s (reliability) and `/feature`s (block correlation key, growth features).
**Method:** Six parallel subsystem audits (block reconciliation, field-traversal, async jobs/runner, provider + rich-text pipeline, field-level + client, test/DX) followed by a manual verification pass over every actionable claim. Confidence legend below; only **[verified]** items have been read directly in this pass.

> **Confidence:** **[verified]** = read directly here / confirmed in a committed design doc · **[likely]** = single-audit read of code, plausible · **[needs-check]** = depends on Payload internals not yet confirmed.

---

## 1. Architecture snapshot

Staged pipeline: `FieldChunkCollector` → `TextChunkExpander` (plain + Lexical) → `Translation` (provider) → `TranslationMutator` → `DataReconciler`. Strategies `Overwrite` / `SkipExisting`. A data-agnostic field-traversal engine (`walkFields`/`kernel`) pairs cross-locale array/block elements by `id` (`matchElementById`). Three surfaces (`documentLevel`, `collectionLevel`, `fieldLevel`). Two runners (`PayloadJobsTaskRunner` default, `SyncTaskRunner`). OpenAI provider + a custom-provider interface. The codebase is mature and well-tested; findings below are **hardening and edge cases**, not a rewrite.

---

## 2. Problems to fix (ranked)

### Reliability cluster (priority)

**P1 — Provider responses are not validated; partial translations fail silently. [verified]**
`TranslationStage.execute` throws only when the provider returns a fully `null` map (`stages/translation/Translation.stage.ts:17-19`). `TranslationMutator.apply` then does `if (translation === undefined) continue` (`stages/translation-applicator/TranslationMutator.ts:20-21`) — any index the provider drops, renumbers, or merges is silently left in the source language, and the job still reports success.

- **Impact:** Silent untranslated fields; worst on large index maps or content that contains JSON-like text. Custom (non-OpenAI) providers returning string keys (`"0"`) vs numeric, or partial maps, hit the same gap.
- **Fix direction:** Validate the returned key-set against the requested key-set (and value types); on mismatch, fail loudly or surface an explicit "incomplete" outcome rather than a silent skip.

**P2 — `deleteJobOnComplete` footgun makes status invisible. [verified]**
The plugin never sets `jobs.deleteJobOnComplete` (`task-runner/payload-jobs-runner/PayloadJobsRunnerProvider.ts:17-30` configures task/queue/autoRun/retries/stale only). Payload's default deletes a job on completion, so the status endpoints return `null` for both "never ran" and "succeeded/failed" — the UI cannot distinguish success from failure. Documented as a README note, but not defended in code.

- **Fix direction:** Default the translations queue to `deleteJobOnComplete: false`, or emit a startup warning when it's left at the Payload default.

**P3 — OpenAI provider: unguarded `choices[0]` + no client-option configurability. [verified] — FIXED 2026-06-15.**
_Downgraded from "reliability, important" after verification._ Two distinct points, not equal:

- **Real bug (fixed):** `chatCompletion.choices[0].message.content` accessed `choices[0]` unguarded — an empty `choices` array (e.g. content-filtered response) threw a `TypeError` instead of the intended graceful `null`. The surrounding code (`if (!translatedContent) return null`, `try/catch` on `JSON.parse`) clearly intended to fail soft. Fixed with optional chaining (`choices[0]?.message?.content`) + a regression test.
- **Not a bug — configurability (added):** the client was created with `apiKey` only, relying on SDK defaults. The OpenAI SDK _does_ retry by default (2x on 429/5xx/network) and _does_ time out (10 min) — so the original "no retry / hangs indefinitely" wording was **overstated and is corrected here**. The only real gap was that the 10-min default is too long for a blocking job and neither value was configurable. Added optional `timeout` / `maxRetries` to `OpenAIProviderConfig` (`@since 0.6.0`), passed through to the client; `undefined` keeps SDK defaults.

**P4 — `skip_existing` + job retry is not idempotent. [likely / needs-check]**
`SkipExistingStrategy.shouldTranslate` skips when the target value is non-empty (`strategies/SkipExisting.strategy.ts:9-12`). If a job partially writes then Payload retries it (`retries.attempts: 3` by default), the partially-written fields now look "done" and are permanently skipped. `overwrite` is safe.

- **Needs-check:** exact Payload Jobs retry/transaction semantics. **Fix direction:** wrap the document write, or re-derive skip decisions from a pre-run snapshot.

### Correctness & DX

**P5 — Silent no-translation when only the container is marked `localized`. [verified]**
The plugin requires explicit `localized: true` on every leaf; if an author marks the group/array/blocks container localized but forgets a leaf, the field is silently dropped. `plugin.ts:78` deep-clones the schema (`JSON.parse(JSON.stringify(...))`) and performs **no validation**. (Our dev seed uses the correct shape — localized leaves — so this is latent, not active.)

- **Fix direction:** Init-time schema validation that warns when a `localized` container has no `localized` translatable leaves.

**P6 — Concurrent-enqueue race. [verified]**
`PayloadJobsTaskRunner.enqueue` dedups by cancelling existing jobs for the same collection+ids _within a single call_ (`:19-28`), but two near-simultaneous enqueue requests each find nothing and both queue the same doc.

- **Fix direction:** dedup at pickup, or a unique (taskSlug, collection_slug, collection_id) guard.

**P7 — Scale ceiling: one request per document, no batching across a huge field/doc. [verified]**
The whole `textMap` goes in one provider call; a very large doc or single huge rich-text field can exceed the model's token limit with no chunking.

- **Fix direction:** size-aware batching of the index map.

**P8 — Prompt-injection surface. [verified]**
`buildSystemPrompt` interpolates raw `sourceLang`/`targetLang` and the content is user-controlled (`OpenAITranslation.provider.ts:143-148`). JSON mode mitigates, but language codes should be validated (ISO pattern) and content framed defensively.

### Field-level UX (priority)

All **[verified]** against `TranslateFieldControl.tsx` + `translate-field/handler.ts`:

- **Unsaved source edits are ignored, no warning.** The endpoint reads the _saved_ source doc (`handler.ts:47-54`, `fallbackLocale:false`); if the user edited the source locale without saving, the translation uses the stale saved value. _(Confirmed real.)_
- **New-doc: control hidden entirely** (`TranslateFieldControl.tsx:65`) — can't translate before first save.
- **richText re-mount** on write-back (`:75-78`) — acceptable since translate is a deliberate click, but worth a guard if the field is mid-edit.
- **i18n: control strings are hardcoded English** (`"Translate field"`, `"Field translated"`, …). Locale codes shown raw/lowercased, no display-name fallback.
- **Undo is single-level**, no redo.
- **Correction to the audit:** a `noop` does **not** dirty the form — the client only writes on `status === "translated"` (`:93-101`). The earlier "required+noop breaks save" claim is **false**.

---

## 3. Cross-locale block translation & matching (focused dive)

### Current design is sound [verified — read `2026-06-12-cross-locale-block-identity.md` + `kernel.ts`]

- Elements pair **by `id`** (and identical `blockType` for blocks) via `matchElementById` (`kernel.ts:149-154`), shared by `DataReconciler` and `FieldChunkCollector`. No match → source fills in; output follows source order; `id` is stripped on write (Postgres rejects it on update).
- **Supported regime:** _non-localized_ container + _localized leaves_ → structure shared, `id` == position, exact matching. This is the only fully-correct shape and is what our seed uses.
- **Field level guards** a localized blocks/array ancestor with a `noop` notice instead of guessing positionally (`handler.ts:70-73`).
- The design doc's rejection of position / per-locale block id / blockType / content-similarity as auto-match signals is correct: **independent localized blocks cannot be auto-matched** — refusing beats silent corruption.

### Small fixable gaps here

- **Duplicate `id` → first-match wins silently** (`kernel.ts:152` `arr.find`). Rare (UUIDs), cheap to guard.
- **Silent drop on `id` match + `blockType` mismatch** — correct behavior, but the discarded target edit is invisible; a notice would help.
- **Nested localized containers** compound independence; document as a hard boundary.

### The in-demand feature (was deferred, now requested)

The case **"different block layout per locale AND translate between them"** is a **real requirement** per product. The current design explicitly punts it (`cross-locale-block-identity.md` §"Out of scope") to an **author-managed correlation key** — a non-localized key the author maintains per element to link locales. This now needs its **own design doc** before any code. Key open questions for that design:

- Where does the key live (it can't sit _inside_ the localized field — the whole subtree is locale-partitioned)? A sibling non-localized map keyed by element? A convention field?
- How is it surfaced/maintained in the admin UI without burdening authors?
- How do reconciler + field-level consume it (replace/augment `matchElementById`)?
- Migration/back-compat for existing localized-blocks content with no keys.

→ **This is the single largest piece of work surfaced by the audit. Treat as a separate `/feature` with its own design doc.**

---

## 4. Predicted future problems

- **New Lexical node types** (tables, embeds, custom inline blocks): only `text` nodes are collected, so text inside new structural nodes may be missed or mangled on round-trip. **[verified — collector walks text nodes only]**
- **Job table growth**: `findByCollection` fetches all jobs for the task and filters in memory (a deliberate Drizzle-bug workaround) — fine now, a latency/memory problem at scale. **[likely]**
- **Payload 4.x**: the `JSON.parse(JSON.stringify(fields))` schema clone (`plugin.ts:78`) is lossy for functions and brittle across Payload internals (the code's own TODO suggests a `FieldLike` interface). **[verified — comment + code]**
- **Relationship/upload fields inside localized blocks**: passed through unchanged with no cross-locale consistency guarantee. **[likely]**
- **Custom providers**: the numeric-index contract isn't runtime-validated (ties to P1). **[verified]**

---

## 5. Useful features (vetted, ranked)

1. **Auto-translate on source change** (on roadmap) — afterChange on the default locale enqueues target translations. The most-requested translation workflow.
2. **Glossary / do-not-translate + tone/formality** — brand names, formal vs informal `de`/`fr`/`es`. Higher value than a raw `systemPrompt` override.
3. **Translation memory / cache** — hash source strings, skip unchanged on re-translation; cuts cost, enables "translate only what changed."
4. **Provider response validation + visible "incomplete" status** — productized P1.
5. **More built-in providers** — DeepL, Google, and an **Anthropic/Claude** provider (interface already supports it).
6. **Per-field control: use the unsaved source value** — removes the "save first" friction (fixes a field-level UX gap above).
7. **Cost/usage estimate & dry-run preview** before a bulk run.
8. **Vercel/serverless cron runner** (on roadmap).

---

## 6. Recommended breakdown

- `**/task` — Reliability pass (P1–P2):\*_ provider response validation + "incomplete" surfacing, `deleteJobOnComplete` default/warning. High value, low blast radius. _(P3 already done — `choices[0]` guard + configurable `timeout`/`maxRetries`, 2026-06-15.)\*
- `**/task` — `skip_existing` retry idempotency (P4):\*\* after a quick Payload Jobs retry-semantics check.
- `**/task` — Field-level UX:\*\* unsaved-source handling + warning, i18n of control strings, undo polish.
- `**/task` — Schema validation (P5)** and **block notices\*\* (duplicate-id guard, blockType-mismatch notice).
- `**/feature` (largest) — Author-managed cross-locale correlation key:\*\* needs its own design doc; unblocks the "different layout per locale + translate between them" requirement.
- `**/feature` — Auto-translate on source change**, then **glossary/tone**, then **translation memory\*\*.

---

## Appendix — key evidence anchors (verified this pass)

- `stages/translation/Translation.stage.ts:17-19` — throws only on full-null.
- `stages/translation-applicator/TranslationMutator.ts:20-21` — silent skip on missing index.
- `translation-providers/OpenAITranslation.provider.ts` — `choices[0]?.message?.content` (guarded, fixed); `timeout`/`maxRetries` passed to client; raw lang interpolation in `buildSystemPrompt` (P8) still open.
- `strategies/SkipExisting.strategy.ts:9-12` — skip when target non-empty.
- `shared/field-traversal/kernel.ts:122-126,149-154` — block resolution by slug; id+blockType match, `arr.find` first-match.
- `features/translate-field/handler.ts:47-54,64-91` — saved-source read; noop statuses.
- `client/widgets/translate-field-control/ui/TranslateFieldControl.tsx:65,75-78,93-101` — new-doc hidden, write-back remount, noop does not write.
- `task-runner/payload-jobs-runner/PayloadJobsTaskRunner.ts:19-28` — within-call enqueue dedup.
- `task-runner/payload-jobs-runner/PayloadJobsRunnerProvider.ts:17-30` — runner defaults; no `deleteJobOnComplete`.
- `plugin.ts:78` — JSON-clone schema, no validation.
