# Draft-safe and per-locale-safe translated writes

**Issue:** [#102](https://github.com/focusreactive/payload-plugins/issues/102) · **Date:** 2026-08-31 · **Status:** implemented

## The defect

`TranslateDocumentHandler.saveTranslatedDocument` put `_status` into the data of an ordinary
`payload.update` and never passed `draft: true`:

```ts
if (versions && versions.drafts) {
  translatedData["_status"] = publishOnTranslation ? "published" : "draft";
}
await payload.update({ collection, id, data: translatedData, locale: targetLng, ... });
```

Two facts about Payload turn that into data corruption, and neither is visible from the call site.

**`draft: true` selects a table, it is not a label.** With it, the write goes only to a version row
and the main table is untouched. Without it, the write goes to the main table — the live document.

**`_status` is not localized.** Payload keeps localized *fields* in a separate per-locale table, but
`_status` is a single column on the parent row. So `locale: targetLng` scopes the fields and not the
status: translating one locale sets the publish state of the whole document.

Together:

- **Draft mode unpublished the site.** Saving a German translation as a draft wrote
  `_status: "draft"` to the live row, taking the document off the public site in every locale.
- **Publish mode shipped unreviewed work.** Publishing a German translation set
  `_status: "published"` document-wide, which promotes whatever is pending — including another
  locale's half-finished draft.

A third consequence, no `req.user` and therefore no access control on the write, is split out as
[#113](https://github.com/focusreactive/payload-plugins/issues/113); it needs a user threaded through
several layers including background jobs, where none exists.

## Why it survived review

The behaviour was covered by two unit tests, and both asserted that `_status` had been placed in the
update data — which is exactly what the broken code did. They ran against a stub of `payload.update`,
and a stub models neither the versions table nor the shared `_status` column, so it cannot fail on
anything described above. The tests confirmed the shape of the call and said nothing about its effect.

## What was measured

Every decision below rests on a probe against a real Payload 3.84.1 on sqlite, locales en/de/fr, run
before any code was written.

| Probe | Setup | Result |
| --- | --- | --- |
| R1 | `draft: true` on a published document | `_status` stayed `published`; translation in the draft row; the live target locale untouched |
| R3 | `draft: true` on an unpublished document | stayed `draft`; no accidental publish |
| R6 | `drafts: { autosave: true }`, `draft: true` + `autosave: true` | stayed `published`; translation in the draft row |
| R4 | `publishSpecificLocale` with no other pending draft | stayed `published`; target locale live |
| R2 | `publishSpecificLocale` with a foreign locale holding a draft | target locale live and the foreign draft stayed unpublished — **but `_status` dropped to `draft`** |
| R5 | R2 plus `_status: "published"` in the data | target locale live, foreign draft still unpublished, `_status` stayed `published` |
| N1 | never-published document + foreign draft, publish one locale | `_status` became `published`; only that locale went live; the foreign draft stayed unpublished |
| N2 | as N1, with an unreviewed draft edit in the *source* locale | the source locale's live value stayed empty — publishing a translation does not publish pending source work |

Two probes ran later, after an adversarial pass found that the first shape of the target read leaked
draft content into a publish:

| Probe | Setup | Result |
| --- | --- | --- |
| D1 | publish mode with a pending draft edit to a **non-localized** field, target read taken from the draft | the draft value went live — a leak of exactly the class this change exists to close |
| D2 | the same with the target read taken from the published row | the live value was preserved |

A later pass measured the other half of D2, which D2 itself never looked at: the same write also
pushes the published value back into the **draft** row, so a pending edit to an untranslated field is
neither carried live nor left pending — it is discarded. That is the source-driven reconciler's
behaviour rather than anything this change introduced (the same family as
[#115](https://github.com/focusreactive/payload-plugins/issues/115)), but it is why the README no
longer promises that pending drafts survive a publish-mode run untouched.

## The fix

`resolveTargetLayer` (`src/server/features/translate-document/targetLayer.ts`) answers one question —
which layer of the document this translation reads from and writes to — and returns both sides of the
answer together. Three shapes: no drafts is a plain update, as it always was; drafts without
publishing reads and writes the draft layer; drafts with publishing reads the published row and writes
through `publishSpecificLocale` with an explicit `_status: "published"`.

**The read has to move with the write, which is why one function returns both.** The target document
is read before translating, and the reconciler copies every leaf it does *not* translate —
non-localized fields, localized non-text ones — straight from that read into the write. So the two
must come from the same layer, or the write carries content across the boundary between them.

Getting this wrong is not symmetrical, and both directions were measured. Reading the published row
while writing a draft makes every field look empty, so `skip_existing` skips nothing and re-translates
over a reviewer's corrections. Reading the draft while writing live does the opposite and worse: it
takes a colleague's pending edits to untranslated fields into production — the same "publish mode ships
unreviewed work" failure the whole change exists to remove.

That second failure was introduced by the fix for the first, and an adversarial pass caught it. The
two sides were then two expressions eighty lines apart, kept in step by comments; a later review
pointed at the precedent already in this package — `shared/payload/sourceDocument.ts` was extracted for
exactly this reason, "so the fingerprint baseline can never drift between the two" — and the decision
became a single unit. Its table test asserts the invariant directly: the layer read is always the
layer written.

**The explicit `_status: "published"` looks redundant next to `publishSpecificLocale` and is not.**
R2 is the reason: on its own, `publishSpecificLocale` scopes the publish correctly but lets any other
locale's pending draft drag the document back to `draft`. Removing that line would produce a quieter
version of the same defect — a publish that silently unpublishes. R5 is the case that pins it, and
N1/N2 show the scoping holds even when the document has never been published, where there is no prior
live state to scope against.

## The rules

A collection with drafts has two layers, and a translation run has to decide which one answers which
question. Four rules, in the order they matter:

**1. The publish flag picks the layer, the strategy never does.** Without publish-on-translation the
run reads and writes the draft layer. With it, the run writes the published one, scoped to the
translated locale.

**2. The write is assembled from the layer being written.** The reconciler copies every leaf it does
not translate straight through, so those values must come from the write layer. Taking them from the
draft carries a colleague's pending edits into production; taking them from the published row while
writing a draft discards work that was already there.

**3. "Already translated" means "exists in either layer", not "exists in the layer being written."**
This is the strategy's question, and it is a different question from rule 2. A translation awaiting
review lives only in the draft; a publish-mode run that judged `skip_existing` against the published
row would find it empty, translate again, and overwrite a text a human approved.

**4. A leaf skipped under rule 3 is carried into the write.** Having decided not to re-translate it,
the run must still publish it — otherwise the editor asked to publish a translation and nothing
happened, with a 200 and no error. Carrying applies only when the write layer does not already hold
the value, so a draft-mode run where both layers are the same object stays a no-op rather than
writing a version that changes nothing.

Rules 3 and 4 are why `existingTranslation` is separate from `targetData` in the pipeline: one field
answering both questions is correct only while the two layers coincide, which is exactly the case
that is not interesting.

### What the eight combinations do

Measured, and pinned by `apps/dev/src/integration/translator/strategy-publish-matrix.int.test.ts`.
`REVIEWED` is a translation already present; `MACHINE` is what the provider returns.

| Existing translation is | Strategy | Publish | Live | Draft |
| --- | --- | --- | --- | --- |
| published | overwrite | no | `REVIEWED` | `MACHINE` |
| published | overwrite | yes | `MACHINE` | `MACHINE` |
| published | skip_existing | no | `REVIEWED` | `REVIEWED` |
| published | skip_existing | yes | `REVIEWED` | `REVIEWED` |
| draft only | overwrite | no | — | `MACHINE` |
| draft only | overwrite | yes | `MACHINE` | `MACHINE` |
| draft only | skip_existing | no | — | `REVIEWED` |
| draft only | skip_existing | yes | `REVIEWED` | `REVIEWED` |

Only the last row needed rules 3 and 4. Before them it read `MACHINE` / `MACHINE` — the reviewer's
text destroyed in both layers ([#116](https://github.com/focusreactive/payload-plugins/issues/116)).

## Behaviour change

This ships as a fix and changes what existing installs do, deliberately: a draft-mode translation now
lands as a version instead of overwriting the live document, and a publish-mode translation publishes
one locale instead of all of them. No configuration opts in or out — the previous behaviour corrupts
data, and leaving it as the default would mean only readers of the changelog ever got the fix.

**What "up to date" now means for a draft-mode translation.** Provenance is recorded after every
successful save, and it does not know which branch the write took. Before this change a draft-mode
translation went to the main table, so "recorded as translated" and "the live locale is translated"
were one and the same. Now the translation lands in a version row, so a locale can read as translated
and current while its live content is still empty, until someone publishes the draft. That is the
intended reading — a translation exists and is waiting on a human, so re-translating would be wrong —
but a host using the staleness signal to decide "does this locale still need work" gets a different
answer than it did before for the same situation.

**A known limit this change makes quieter, tracked as [#114](https://github.com/focusreactive/payload-plugins/issues/114).**
Publishing a locale is not additive: Payload rebuilds the whole published document from the last
published version and overlays only the named locale. Two locales of one document published
concurrently — which is what a multi-target run produces — read the same base, so the second write
loses the first. That race predates this change. What this change alters is how it fails: the old
document-wide `_status` write collided and was rejected by the database adapter, so the job failed
loudly; the scoped write does not collide, so the operation reports success and one locale quietly
does not go live. Fixing it means serializing jobs per document, which is a scheduling decision with
its own cost and was deliberately kept out of this change.

**A revert does not repair data already written.** Documents the old behaviour unpublished stay
unpublished, and the plugin cannot repair them automatically: there is no way to distinguish a
document it unpublished from one an editor deliberately left in draft. Any repair is a host-side
decision made against that host's own audit trail.

## Test strategy

The unit tests still assert the arguments handed to `payload.update`, because that is all a stub can
see — but they now assert the corrected ones, including a negative assertion that draft-mode sends no
`_status`, which no positive check can express.

The behaviour itself is proven in `apps/dev/src/integration/translator/draft-safe-writes.int.test.ts`
against a real database. It boots its own Payload (the shared fixture has no collection without
`versions`, and none with autosave drafts) with locale fallbacks off, since every "this locale is not
live" assertion is meaningless when a fallback returns the source text.

Both suites were checked by reverting the handler and confirming they go red, and that check earned
its keep three times over:

- Against the original implementation, five of the six cases that existed at the time fail. The
  survivor is the deliberate control, `a collection without drafts is written exactly as before` —
  that path is unchanged and must pass against both. Cite the case by name rather than by position:
  three cases were inserted later and the ordering has moved since the mutation run.
- The autosave case originally passed against the broken code too, because nothing in it forced a
  scoped publish apart from a document-wide one. It was strengthened with a foreign draft.
- The two cases covering the read layer were each checked against the intermediate shape that leaked,
  not just against the original code, because the defect they guard was introduced by an earlier
  attempt at this same fix rather than by the original.

One case deserves a note for whoever reads it next. "skip_existing preserves a human's correction"
seeds a second, cleared field on purpose: without it the run produces no write at all, and the case
would pass because nothing happened rather than because the correction survived a write.
