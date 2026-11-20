# Seam trace — fewer worlds, louder refusals

Source: `docs/plans/2026-11-19-fewer-worlds-louder-refusals.design.md` (design, D1–D10, closed 2026-11-20)
Saved: `docs/plans/2026-11-19-fewer-worlds-louder-refusals.seam-trace.md`
Model: 11 parts · 10 seams (5 global) · 6 shared values
Confirmed by: NOBODY — 3 assumptions carried, listed under Open questions
Lenses: contract + concurrency · stack packs: headless-cms
Runs: runtime + growth
Scenarios: 7 traced (SC1 SC2 SC2b SC3 SC4 SC5 SC6 SC7) · kinds skipped: none with a ground condition
Growth axes: 4 traced · 0 cut
Breaker: 16 breaks returned · 14 admitted · 2 dropped (cited below)

**Verdict in one line.** The design's decisions hold; **the query D1 specifies does not**, and because
the autosave refusal was withdrawn on 2026-11-20 the same flaw turns from an edge case into the normal
path on every autosave collection. Everything else is smaller, and four items are the design's own
recorded consequences now carrying concrete values.

---

## The worry, answered

**Three refusal layers.** No state slips between them for the sibling plugin that motivated the design
(SC2, dropped break B1). Two real gaps: the same refused world costs either a whole-CMS outage or one
log line depending on a host flag neither layer reads (F5), and the hook layer is now the last line of
defence for the only refused world there is (F5b).

**The run's intent through the queue.** The union does not cover the no-drafts world (F2), and the
legacy shim reads rows the wrong way round (F3) — the field that distinguishes the two paths is already
on the row.

**One read entry.** Held. SC6 reproduces the list/document split exactly as the review log recorded it,
and build step 2 is the right pin for it.

**The three state questions (D10).** They contradict each other permanently, by construction, not by
accident (F6).

---

## Findings

### 1. mismatch + guard-gap — the baseline query returns a draft, so the defect survives; with autosave it survives on every document

**Place.** Seam S7 · SC1 step 3 · breaker B8, B9.

D1's mechanism is written as "newest-first, limit 2, index 1". That query is **unfiltered**, so index 1
is the previous *version*, not the previous *published* version.

```
editor: Save Draft "Hello world"   → rows [B(draft,"Hello world"), A(published,"Hello")]
editor: Publish                    → rows [C(published,"Hello world"), B(draft,"Hello world"), A]
hook:   findVersions limit 2       → [C, B] ; index 1 = B(draft) = "Hello world"
hook:   compare "Hello world" vs "Hello world" → equal → no enqueue
```

**Observable state.** 0 provider calls; the German locale still holds the translation of "Hello". This
is the exact measured defect D1 exists to remove, reproduced by D1's own mechanism.

**Two consequences the trace adds.**

- **B9 — autosave makes it the normal path.** Autosave overwrites the latest version row in place
  (`saveVersion.js:20-28`), so at publish time row B always holds *exactly* the text being published.
  Index 1 therefore always compares equal, and auto-translate never fires on any document edited in the
  admin. This is in scope **because** the autosave refusal was withdrawn (design Revisions R-1): that
  decision removed the refusal that would have hidden this.
- **B8 — the mirror case spends money and destroys hand-written text.** Editor saves a draft
  "Hello world", reverts to "Hello", publishes. Index 1 = the draft → differs → "changed" → a paid
  provider call → the hand-written German "Hallo du!" is replaced by machine output, although the
  published English did not change by one character.

**Guard.** The step-3 trace test (1/1/1/1) catches the SC1 form at build time; **it does not catch B8**,
which needs a revert-then-publish case, and it catches B9 only if an autosave collection is in the
fixture.

**Decision needed.** `/sp-architect` on D1: the ADR must carry the query, not a sketch of it. Payload's
own form is in `getLatestCollectionVersion.js:6-18` —
`{ and: [{ parent: { equals: id } }, { 'version._status': { equals: 'published' } }] }`, `sort: '-updatedAt'`.
D1's guard line should name the revert-then-publish case and an autosave fixture.

### 2. unstated — the intent union has no member for a collection with no published layer

**Place.** Seam S4 · breaker B4.

`RunIntent` is `{read:"latest",publish:false}` | `{read:"published",publish:true}`. In the no-drafts
world the auto path takes the second member and therefore claims `publish: true`, which is false there —
`resolveTargetLayer` has no `publish` on the `no-drafts` variant at all (`targetLayer.ts:25-34`).

**Observable state.** Nothing wrong happens, because `publishIfAsked` returns early on
`run.layer.kind !== "drafts"` (`translateDocument.ts:45-48`). The correctness rests on a runtime `if`
that the design does not mention, in a decision whose stated point (DM6) is that illegal pairs are
unrepresentable.

**Decision needed.** `/sp-architect` on D4: either a third member for the no-drafts world, or a stated
rule that `publish` means "publish if there is a layer to publish into", with `publishIfAsked` named as
the place that holds it.

### 3. mismatch + half-done — the legacy shim reads an auto row as a manual one, and the row already says otherwise

**Place.** Seam S4 · breaker B5.

A task row queued before the intent ships carries no intent. D4 reads it as `{read:"latest",
publish:false}`. But rows queued by the auto path *were* auto work, and the row already carries
`publishOnTranslation` (`task-runner/types.ts:40`), which is exactly the bit that distinguishes them.

```
12:00:00  editor publishes en "Hello world v2" → old build queues {…, publishOnTranslation: true, waitUntil 12:00:30}
12:00:05  editor saves a draft  en "DRAFT scratch"
12:00:10  deploy of the new build
12:00:30  executor: no intent → read "latest" → translates "DRAFT scratch" → writes a de DRAFT, does not publish
          → receipt (pages,42,de) now carries the fingerprints of "DRAFT scratch"
```

**Observable state.** The editor's publish is never translated. The published German still holds the old
text. The German draft holds a translation of text that was never published. The badge reads "translated
12:00:35" and the locale is marked stale immediately after a run that settled as *succeeded*.

**Decision needed.** `/sp-architect` on D4: the shim derives the intent from `publishOnTranslation`
rather than defaulting to manual.

### 4. race — redelivery overwrites a hand-edited target locale and pays the provider twice

**Place.** Seam S5 · breaker B6.

The queue guarantees at-least-once. Nothing in the model guards the **target** locale: S5's assumption
speaks only about the source. Between the two deliveries an editor may edit the German by hand — Table 3
names the editor as a writer of that value.

**Observable state.** The editor's wording is gone, a second provider call is paid for one publish, and
the receipt is rewritten with the same fingerprints and a later `translatedAt`, so nothing in the admin
shows that anything was overwritten.

**Predates this design**, but D4 makes the run read at execution, which widens the window.

**Decision needed.** The user, or `/sp-architect` on D7: name the idempotency rule (a key on the run, or
a check that the target has not moved since the run read), or state the loss and stop promising the
admin shows what happened.

### 5. mismatch — one refused world, two prices, picked by a flag neither layer reads

**Place.** Seams S2 and S3 · SC2b · breaker B2.

`localizeStatus` is the only refused world. If a later config modifier turns it on:

- with `onInit` running, the boot layer throws → `payload.init` fails → **every** collection of the host
  answers 500, including ones the plugin does not manage, and nobody can sign in;
- with `disableOnInit` set, the hook layer is reached instead → `skipped(unsupported-world)` → one server
  log line, a successful publish, nothing translated, ever.

On a serverless deploy the first case arrives not at deploy time but on the first cold request.

**Observable state.** The same host mistake is either a total outage or complete silence, and the design
names no rule for which.

**Decision needed.** `/sp-architect` on D3: whether a world refusal at boot may fail the whole process,
or must degrade to a refusal scoped to the managed collection (the plugin's routes and hook refuse; the
host's other collections keep working), and what the hook layer does when it is the last layer standing.

### 6. mismatch — the badge and the emptiness row speak about different layers and contradict permanently

**Place.** Seam S10 · breaker B15 · D10 questions 2 and 3.

A manual run reads the latest and writes a German **draft**, never published. Question 2 reads the
latest layer → "translated 12:05". Question 3 reads the published layer → "empty".

**Observable state.** One row shows "translated 12:05" and "locale empty" at the same time, permanently,
with no failure involved. Visitors see no German. An editor who trusts the badge ships a release whose
translation lives only in a draft.

D10 split one word into three to remove ambiguity; this is the ambiguity surviving the split, because
two of the three answers are about different layers and sit side by side.

**Decision needed.** `/sp-architect` on D10: whether the badge answers per layer, or the two rows are
presented as one sentence that names the layer each half speaks about.

### 7. race — the three state reads have no common snapshot

**Place.** Seam S10 · breaker B14.

Three separate queries at three instants. A run finishing between them gives "translated 12:00:00" and
"locale empty" in one render, with a "Translate" action offered that would pay the provider again and
overwrite the translation just written. A refresh fixes it; the money spent does not come back.

**Decision needed.** The user: accept (a refresh fixes it) or give the three answers one read.

### 8. race — `admitWork` is a read-check-write with no constraint behind it

**Place.** Seam S9 · breaker B12 · CC1.

Two publishes 20 ms apart (an editor and a webhook) both read `findLiveForDocuments` → `[]`, both pass
`admitWork`, both enqueue. Run rows carry no unique constraint; only receipts do.

**Observable state.** Two paid calls for one publish, two "running" rows for one locale, and — if the two
runs read different published rows — a locale whose content came from one run and whose receipt
fingerprints came from the other, which the badge then calls current.

**Predates this design.** D7's correctness leans on `admitWork`, so it is now load-bearing.

**Decision needed.** `/sp-architect` on D7: a unique constraint on the live run row, or a stated
acceptance that two runs may be admitted for one document.

### 9. growth — one locale to k locales turns D7's residual into the normal path

**Place.** Growth axis "a target locale" · breaker G3.

Adding `es` beside `de` edits **no part** — and changes behaviour at S9 and S5. A publish now creates k
live run rows, and `admitWork` drops any save while **any** of them is live.

**Counts.** k = 8 locales × ~15 s per run ≈ **2 minutes** in which the document is busy after every
publish, and every editor save inside that window is dropped with one log line. 2nd addition: 0 parts
edited. 3rd: 0 parts edited, and the busy window grows linearly. The same axis multiplies live rows
against the silent 500-row ceiling (20 documents × 30 locales = 600).

**Decision needed.** `/sp-architect` on D7: with k locales the dropped save is ordinary, not residual.

### 10. growth — admitting `localizeStatus` later costs 5 seams, not "none"

**Place.** Growth axis "a row in the supported-worlds table" · breaker G1.

G1 claims a row plus a test, seam contracts unchanged. The model's own next instance is
`localizeStatus`, which turns `version._status` into a per-locale object
(`payload/dist/database/migrations/templates/localizeStatus.js:3`) and therefore edits: the hook's
publish gate, the intent vocabulary (S4), the published read (S6), the baseline query (S7), the receipt
key (S8) and question 3 (S10).

**This corroborates the 2026-11-20 refusal** rather than contradicting it: the decision was taken on a
conceptual argument and now has a mechanical one. What the trace changes is G1's class — `registered`
is true only for worlds that differ in how they are *detected*, not in what "published" *means*.

**Decision needed.** None. Record the class split in D2.

### 11. growth — the state questions grow quadratically in proof, and the third one has not paid

**Place.** Growth axis "a state question" · breaker G2 · finding 6.

S10's assumption is about **pairs**: three answers are 3 pairs, four are 6. The growth table counts
edits per answer and calls it flat. Finding 6 is the unpaid pair.

**Decision needed.** `/sp-architect` on D10: the rule that a new state question must state its layer and
be checked against each existing one, or the fourth question repeats finding 6.

### 12. growth — an axis the model does not list: translating part of a document

**Place.** Breaker, unlisted axis.

The parts already stand next to it: a `translate-field` unit exists and the admin has per-locale
actions. The receipt key `(collectionSlug, documentId, targetLocale)` carries no scope and the store
replaces **every column**, so the first partial run erases the record of the full run, and the badge
then calls every other field drifted.

**First addition edits:** the receipt key or its payload semantics, S8's assumption, the drift
computation, the task input (S4), the executor, and question 2 — one key plus three seams, against the
"two edits" the model gives its rare axes.

**Decision needed.** Record it against D5, whose revisit trigger already says "any change that makes the
receipt an input to the enqueue decision, or to a claim about the published layer". This is that change,
arriving from a direction D5 did not name.

### 13. unstated — an emptied source field may empty the live target locale

**Place.** Seam S6 · breaker B7. **Admitted without a citation to drop it**: I could not establish from
the collector that a leaf whose source value is empty is excluded from the selection
(`WalkCollector.stage.ts` special-cases no empty value).

Editor clears one English field and publishes. The fingerprint changes → enqueue → the executor reads
the published row, which exists, and its source field is `""`. S6's consumer has two branches, a row or
nothing; an empty source is a third case the seam's vocabulary does not have.

**Observable state, if the leaf is collected.** The German locale is overwritten with empty and
published; the badge reads "translated, current"; recovery is only through document versions.

**The one check that settles it:** does a leaf whose source value is `""` reach the provider and the
write, or is it dropped by the selection (`selectLeaves.ts:64`, `owed.emptyBecause`)?

### 14. Confirmed with values — four consequences the design already recorded

Not new findings; the trace gives each a concrete instance, which is what they lacked.

- **The receipt carries two meanings across the two paths** (D5 Consequences, breaker B10). Reverse
  order is the sharper half: a manual run's receipt overwrites an auto run's, so a **published** German
  made from "Hello world v2" is shown stale and the editor pays to redo it.
- **The 500-row ceiling** (design framing gap 3, breaker B13). 20 documents × 30 locales = 600: about
  four documents show "no runs" and offer an action that either refuses or admits a second run.
- **Enabling receipts retroactively** (breaker B11). 300 documents × 4 locales = 1200 locales read as
  never translated on the day `provenance` is switched on, and the admin offers to translate them all.
- **A save dropped against a running run is lost** (D7 Consequences, SC4). With receipts off the only
  artifact is a log line; see also finding 9, which makes it ordinary.

### 15. The cross-seam failure with no repair step

**Place.** Breaker, cross-seam · SC4 extended.

With receipts **off**, a save dropped against a running run closes the door permanently, because the
plugin's own locale publish writes a version row carrying the *current* source text. From then on the
baseline at index 1 already holds the newest English, so re-publishing the document — the only lever the
editor has — compares equal forever.

```
12:00:00 publish "Hello world"  → enqueue, run live
12:00:02 publish "Hello there"  → dropped (run live), one log line
12:00:06 run writes de from "Hello world", publishes the locale → version D carries en "Hello there"
12:05:00 editor re-publishes unchanged → index 1 = D = "Hello there" → equal → no enqueue, forever
```

This holds whether or not finding 1 is fixed: the filtered query would take D, a **published** row, so
the filter does not rescue it. Repair is only outside the model — a fresh English edit, or a manual run.

**Decision needed.** `/sp-architect` on D7: this is the dropped save becoming unrecoverable rather than
merely invisible, which is more than D7's recorded consequence claims.

---

## Dropped breaks

- **B1 — a later config modifier carries away the injected hook and the `custom` stamp.** Dropped:
  `applySchedulePublish.ts:14-17` spreads the **received** config (`{ ...config, versions: … }`), so the
  hook array and `custom` written by an earlier modifier survive. The general shape (a modifier rebuilt
  from a captured original) is unproven, not disproven — no such modifier exists in this repository.
- **B4's publish half — a no-drafts collection publishing because the intent says so.** Dropped:
  `translateDocument.ts:45-48` returns early unless `run.layer.kind === "drafts"`. The *type* half of
  B4 is admitted as finding 2.

---

## Open questions (assumptions the traces carried)

1. **Which layer the enqueue route checks rights against.** Breaker B16 extends SC6: if the enqueue
   permission check evaluates the host rule against the **published** row while the executor reads the
   **latest**, then a draft the caller may not read is translated and written into another locale, which
   the auto path then publishes. That is content disclosure, not an id. The model does not say which
   layer that check uses. **This is the one open item worth settling before build step 3.**
2. **Whether an empty source leaf reaches the provider** (finding 13).
3. **Whether run rows carry any unique constraint** (finding 8). Receipts do; the model says nothing
   about runs.

## Not knowable from the model

- The real provider latency, which sets the busy window in finding 9. 15 s is the breaker's figure, not
  a measurement.
- Payload's actual retry behaviour for a job whose handler wrote and then died (finding 4) — a check to
  run against the installed version, never a guess.
