# Rework: separate translating from publishing

Supersedes the approach taken in [2026-08-31-draft-safe-locale-writes.md](./2026-08-31-draft-safe-locale-writes.md)
(PR #117). That work fixed a real defect and its locale-scoping fix is kept; what
this document changes is the *premise* underneath it, and then the shape that
follows from the corrected premise.

## The premise that turned out to be wrong

The earlier plan treated this as a defect:

> Publishing a translation takes a colleague's pending draft edits live.

It is not. `publish_on_translation` exists so the document gets published, and
publishing a document publishes its current draft — that is what the word means
and what Payload's own Publish button does.

The deeper problem is that the flag has been doing three jobs at once: choosing
which layer the target is **read** from, changing the **data** of the translation
write, and changing that write's **arguments**. Every difficulty in PR #117 comes
from that conflation, not from any of the individual decisions.

What was genuinely broken in #102 is narrower and is already fixed:
translating one locale changed the publish state of the **whole document in every
locale**, and published **other locales'** drafts. Both are cured by
`publishSpecificLocale` plus an explicit `_status: "published"`.

## The rule, in one sentence

Mirror what Payload shows the editor. The **source** is the current version of the source
locale — the newer draft when one exists, else the published row — and only that locale's
own content, never a fallback. The **translation** is written to the draft layer, so
switching locale in the admin shows it at once. **Publishing** is a separate step that the
flag alone gates.

## The shape

**Translation always writes to the draft layer.** No layer choice, no second
read, no carry. On a collection without drafts there is only one row and it
writes there.

**Publishing is a second, separate write, and the flag decides only whether it
runs.**

```ts
// step 1 — always identical; the flag does not reach here
payload.update({ data: translated, draft: true })

// step 2 — only when publish_on_translation
payload.update({ data: { _status: "published" }, publishSpecificLocale: targetLng })
```

Externally nothing changes: the checkbox still translates and publishes. The
endpoint contract, the job schema and the admin control are untouched — this is
not a breaking change.

## Measured facts

Payload 3.84.1, sqlite, local API. Raw output in the run's recon notes.

| # | Question | Measured answer |
|---|---|---|
| 1 | What does `findByID({draft: true})` return? | The **current** version: the newer draft when one exists, else the published row. |
| 2 | Does a full-document draft write from published clobber a colleague's draft fields? | Yes, in the current draft; the old version survives in history. |
| 3 | Does a **partial** draft write preserve them? | Yes, untouched. |
| 4 | Does a partial write stop non-localized draft data going live on publish? | **No.** `publishSpecificLocale` publishes the whole current version regardless of the payload. |
| 5 | Does `publishSpecificLocale` scope *localized* fields? | Yes — other locales stay unpublished. Non-localized fields and `_status` are one column per document and cannot be scoped. |
| 6 | Is the explicit `_status: "published"` needed? | **Yes.** Without it the document falls to `draft` when another locale holds a pending draft. |
| 7 | Can a locale be published with no translated payload? | **Yes** — `data: { _status: "published" }` + `publishSpecificLocale` publishes that locale's current content. `data: {}` publishes the content but leaves `_status: "draft"`. |
| 8 | Does `publish_on_translation: true` publish when nothing needs translating? | **No.** Returns `200`, publishes nothing, logs nothing. |
| 9 | What does "publish published-plus-translation" do to the colleague's draft? | **Erases it** from the current draft (recoverable from version history only). |

Facts 4 and 9 together are why the "publish only what was already published"
reading was rejected: it does not leave a colleague's work alone, it destroys the
working copy instead of publishing it. Fact 7 is what makes step 2 possible.
Fact 8 is a defect, fixed here by construction.

## The three candidate meanings of the flag

| Meaning | Base | A colleague's pending edit |
|---|---|---|
| **(a)** "publish the document afterwards" | current version | **goes live** |
| **(b)** "publish the published version plus the translation" | published row | **erased** from the current draft |
| **(c)** translation never publishes; publishing is its own step | current version | **untouched by the translation**, goes live only if the flag is set |

(b) is what PR #117 implements. It works, and it costs the review workflow the
very thing that workflow depends on. **(c) is chosen** — it is (a)'s outcome
without the side effect, and it removes the conflation rather than managing it.

## What this removes

- the second target read and `existingTranslation` (handler, `translateContent`,
  `PipelineConfig`, `PipelineContext`);
- the carry in `FieldChunkCollector` and `hasCarriedValues`;
- the split early exit in `TranslationPipeline`;
- the flag's influence on the translation write's data and arguments.

The six `core/translation-pipeline/` files revert to `main` — `main` already
passes `ctx.targetData` to the collector, so `existingTranslation` and the carry
are the only things the branch added there.

## What `TargetLayer` becomes

Two variants, because the flag no longer selects one. (An earlier revision of
this plan said three; that applied to the single-write design, where the flag
*was* the discriminant.)

```ts
type TargetLayer =
  | { kind: "no-drafts"; write: { autosave: false } }
  | { kind: "drafts"; write: { draft: true; autosave: boolean };
      publish: { publishSpecificLocale: string; status: "published" } }
```

`publish` exists only on the `drafts` variant, so `publishSpecificLocale` on a
collection with versions but no drafts — measured to drop every other locale from
the live row — stays unrepresentable. The contract test is kept. `autosave: false`
on the `no-drafts` variant is deliberate: `main` sent it on every write, and
criterion 9 promises that shape is unchanged.

## Deliberate trade-offs

1. **Publishing publishes the current draft, whatever is in it.** A bulk
   "translate and publish" publishes every pending draft in the documents it
   touches, including edits unrelated to translation. Documented next to the flag.

2. **A locale-scoped publish still marks the whole document published**, and
   still publishes all non-localized pending values (fact 5). Unavoidable —
   `_status` and non-localized fields are one column per document.

3. **Two writes produce two versions** where there was one. Accepted; version
   history is append-only and this makes the two acts separately visible.

## Concerns

- **The auto-translate loop guard must mark both writes.** The hook skips writes
  carrying `AUTO_TRANSLATE_SKIP_CONTEXT_KEY`; step 2 is a new write and needs the
  same flag or it can wake the hook.
- **Autosave collections** with a draft write followed immediately by a publish
  are unmeasured.
- **The two writes are not in a transaction.** If the translation write succeeds and
  the publish throws, the job runner retries the whole task (three attempts by
  default). Under `skip_existing` the retry is idempotent — the translation now
  exists, so it is skipped and only the publish repeats. Under `overwrite` the retry
  calls the provider again and overwrites the draft, losing any human edit made in
  that window. The single-write design had the same duplicate-provider exposure on a
  failed write; what is new is the window where a translation is saved but not
  published. Left as a known limitation: closing it needs idempotency or a
  transaction, neither of which belongs in this change.
- **Auto-translate reaches the same handler** with `publishOnTranslation: true`,
  so an automatic run now publishes the target locale's current draft. Confirmed
  as intended: one rule for both paths.
- **`skip_existing` means "the target field is not empty" and nothing more.** It
  has no notion of reviewed, and it ignores staleness even though the plugin
  computes staleness for the admin badge (`isRecordStale`, consumed only by the
  staleness routes). So the badge can say "out of date" while `skip_existing`
  refuses to re-translate the same field. Independent of this rework — filed as
  #118, which also records why the obvious fix (calling `isRecordStale` from the
  strategy) destroys corrections.
- **The source read is now settled** (2026-09-02): it takes the current version of the
  source locale and only that locale's own content — `draft: true, fallbackLocale: false`.
  Measured: with `fallback` on, translating *from* an empty locale translated the default
  locale's text and fingerprinted it as the source. See
  [2026-09-02-translation-chain-coverage.task.md](./2026-09-02-translation-chain-coverage.task.md).
- **Still open, unchanged:** access control on translated writes (#113), the
  concurrent multi-locale publish race (#114), draft-only block deletion (#115).

## Plan

1. **Revert the six `core/translation-pipeline/` files to `main`**, re-applying
   only the two comment deletions from the audit that were independent of the
   carry.
2. **Handler: one read of the current version** — `findByID({ draft: true })` —
   and one translation write, always to the draft layer.
3. **Handler: publishing as its own step**, run whenever the flag is set,
   independently of whether the pipeline produced anything. Carries the
   auto-translate skip context.
4. **`TargetLayer` to two variants**, keeping the contract test for the
   destructive combination.
5. **Reverse the integration case** *"publish mode does not take a colleague's
   pending edits live with the translation"* — it asserts the opposite of the
   intended behaviour.
6. **Cover facts 8 and 9**: publish with nothing to translate, and a colleague's
   draft surviving a draft-mode translation.
7. **Document the trade-off** in the README next to the flag.
