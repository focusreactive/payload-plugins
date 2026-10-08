# Task contract — per-field fingerprints, so staleness can be answered per field (#118)

**Risk: HIGH.** Changes a stored format with a legacy path, changes a `core` contract two strategies
implement, touches the translation hot path, and rewrites 28 existing assertions.

**Research:** `docs/plans/2026-10-02-per-field-fingerprints.md` — its codebase map and findings F1–F7
are adopted, not re-derived. Phase 1 below records only what verification added or corrected.

---

## Phase 1 — what verification added

The research map held. Four things it did not have, all of which change the design:

**V1 — `computeSourceFingerprint` must not change its return type.** Three production callers
(`hasSourceContentChanged.ts:30`, `Provenance.service.ts:70`, `:202`) and it is **public API**
(`core/index.ts:28`). `hasSourceContentChanged` compares two of its results with `!==`; returning an
object there makes every comparison reference-unequal, so every save would look changed and
auto-translate would fire on all of them. The per-field map therefore ships as a **new sibling
function**, and `computeSourceFingerprint` is untouched.

**V2 — `Provenance.store.ts:40` is the parse boundary, and today it erases types.**
`toRecord` does `sourceFingerprint: String(doc.sourceFingerprint)` and the same for
`dismissedFingerprint` at `:44-45`. Keeping the column `type: "text"` means Payload hands back a
string and `String()` is a no-op — harmless. Switching the field to `type: "json"` would make
`String()` produce `"[object Object]"` silently, with no throw, and every record would then read as
stale forever. This is the concrete reason the column stays `text` (and `Provenance.collection.ts:10-12`
already chose `text` for cross-adapter portability).

**V3 — the admin indicator breaks unless `isRecordStale` learns both shapes.** It compares the stored
string against a freshly computed one. A stored map vs. a computed document hash is never equal, so
every locale would read stale. `isRecordStale` must take both current values and branch on the stored
shape.

**V4 — the existing `skip_existing` tests survive the redefinition.** `strategies.int.test.ts`,
`strategy-publish-matrix.int.test.ts` and `draft-safe-writes.int.test.ts` enqueue manually with no
prior translation, so there is no record, so `sourceChanged` is unknown, so D4's safety rule leaves
them on today's behaviour. Verified by reading them; the suite run is the proof (AC 13).

**Baselines, measured on the untouched tree:** unit 1842 in 134 files · `check-types` clean ·
`oxlint` 55 warnings 0 errors · integration SQLite 160 passed / 7 skipped of 167. Postgres (5434) and
Mongo (27017) are up, so all three adapters are runnable.

**Precedent adopted:** `field-surface-errors.int.test.ts` proves a fixture is actually large
(`TextEncoder().encode(...).length` asserted against the threshold) *before* asserting behaviour on it.
AC 5 follows that order. `describe.skipIf` is the adapter-gating idiom, but AC 5 deliberately does not
use it — the point is that it runs on all three.

---

## Design decisions

**D1 — the stored value stays one `text` column; the two shapes are a discriminated union parsed at
the store boundary.**

```ts
export type SourceFingerprint =
  | { kind: "document"; hash: string }          // legacy: the single sha256 written until now
  | { kind: "fields"; hashes: FieldFingerprints }; // JSON object, IdPath -> hash
```

`PayloadProvenanceStore.toRecord` parses on read; the store serializes on write.
`TranslationProvenanceRecord.sourceFingerprint` becomes `SourceFingerprint`, and
`dismissedFingerprint` becomes `SourceFingerprint | null`. Every reader is then forced by the compiler
to handle both.

Chosen over a `startsWith("{")` test at each use — the owner's constraint, and V2 shows why a silent
mis-read here is invisible rather than loud. Rejected: changing the field to `type: "json"` (V2: the
`String()` coercion corrupts it without throwing, and the collection deliberately uses only
`text`/`date` for cross-adapter portability). Rejected: a `"v": 1` version marker in the JSON — no
second format is in hand, and the union already discriminates; recorded here so the next person knows
it was weighed, not missed.

**D2 — a new `computeFieldFingerprints`, beside `computeSourceFingerprint`, which is untouched.**
Cites V1. One extra walk of a projection the projector already produces; no change to the public
export and no change to the auto-translate drift gate.

**D3 — staleness travels into the pipeline as a decided tri-state per leaf, not as the raw map.**

`StrategyContext` gains `sourceChanged?: boolean`, with three meanings that are all safe by default:

| value | means | because |
|---|---|---|
| `true` | we hold a record and the leaf's source hash differs | refresh it |
| `false` | we hold a record and the hash matches | it is current |
| `undefined` | no record, a legacy record, or no address match | **we do not know — claim nothing** |

The comparison stays in one place (`core/domain/provenance`), so no second hash implementation exists
to drift from the first. The collector only needs the leaf's address and a lookup.

Rejected: hashing each leaf inside `FieldChunkCollector` and comparing there — it puts a second copy
of the hashing rule on the hot path, and the two copies are exactly what F6's guard exists to prevent.

**D4 — unknown is never stale. This is the safety rule the legacy path rests on.**
`skip_existing` refreshes a leaf only on `sourceChanged === true`. A document with no provenance, or
with a legacy record, yields `undefined` everywhere and therefore behaves **exactly as today** — a
hand-written translation on a document the plugin never translated is not overwritten. The record
upgrades to the map form the next time that document-locale is actually translated.

Rejected: treating a legacy record's document-level drift as "every leaf is stale". That is the
destruction #118 itself warns about, reached from a new direction.

**D5 — the record is merged on write, not replaced.**
`skip_existing` may translate two leaves of forty. Writing the whole current map would claim the other
thirty-eight were translated from the current source — false, and the same lie today's single
document-wide hash already tells. So: entries for leaves actually translated are updated, entries for
untouched leaves are preserved, and addresses absent from the current projection are dropped (which is
what retires a field removed from the schema).

This requires the pipeline to report which leaves it translated: `PipelineResult` gains
`translatedPaths: IdPath[]`. It has one field today (`translatedData`), and the collector already
builds the list.

**D6 — WITHDRAWN. Auto-translate keeps asking for the strategy the collection configured.**

It was taken, built, and reversed by measurement. As built, an automatic run used `skip_existing`
semantics: a filled-in target with no receipt reads as *unknown*, and unknown never claims a change,
so the leaf was left alone. Five existing integration suites caught it — they seed the German locale
with a sentinel and publish an English edit expecting it to be overwritten. The consequence was wider
than those tests: **auto-translate would stop writing any target field filled in by hand before the
plugin ever translated it, permanently**, because no receipt can ever appear for a leaf nothing
translates.

A replacement was measured and also rejected: teaching `OverwriteStrategy` to skip a leaf the receipt
proves current. It passes every suite (171/178 on SQLite, no failures) and it does fix the larger
defect — but it is the plugin **guessing** that an unchanged source means the editor wants no
re-translation. That guess is precisely what the owner's intended direction (a per-field opt-in the
editor controls) exists to replace with an answer, so buying it now would be building the thing we
plan to delete.

**What this task fixes, then, is the contradiction and nothing else.** `skip_existing` refreshes a leaf
whose source moved — on the manual path, which is where #118 is reported, and on the automatic path
for a collection that chose it. `overwrite` is untouched.

**D6a — WITHDRAWN with D6.** No `@deprecated` tag, no ledger entry, no boot warning, no README table
change: the option still means what it says. The whole strategy family goes when the per-field opt-in
lands, in one removal rather than a drip.

**The limitation this leaves is pinned as a test, not as prose.**
`apps/dev/src/integration/translator/auto-translate-only-changed.int.test.ts` asserts that `overwrite`
— the default — still overwrites a hand-corrected target when a sibling's source changes, and says in
its comment why, and what to rewrite it to when the opt-in lands. A limitation in a green run cannot be
forgotten the way a README paragraph can.

### Placement

| Piece | Lands in | Why there |
|---|---|---|
| `computeFieldFingerprints` | `core/domain/content-projection/` | beside the projector whose output it consumes |
| `SourceFingerprint` union, parse, serialize | `core/domain/provenance/SourceFingerprint.ts` | it is the stored shape; the role-tag rules leave small pure helpers untagged (`staleness.ts` precedent) |
| `sourceChanged` decision | `core/domain/provenance/staleness.ts` | the one owner of the comparison rule already |
| parse/serialize calls | `server/modules/provenance/Provenance.store.ts` | the single Payload boundary (V2) |
| address on the chunk | `core/translation-pipeline/.../FieldChunkCollector.ts` | where the walk already is |

### New surface

- `computeFieldFingerprints` — callers: `Provenance.service.captureFingerprint`, `makeCurrentFingerprint`. Two, both existing.
- `SourceFingerprint` + parse/serialize — callers: `Provenance.store.toRecord`, `Provenance.store.upsert`/`dismiss`, `staleness.ts`. Three, all existing.
- `PipelineResult.translatedPaths` — caller: `translate-document/handler.ts` (for D5's merge). One caller, and it is the reason the field exists; not speculative.

### Written contract

Yes, and it is the reason `/sp-red-test` applies in Phase 3: `SourceFingerprint`'s parse owes callers
what an unparseable value means, what an absent address means, and that `undefined` is never stale
(D4). None of that is expressible in the signature.

### Escalate to an architecture pass?

**No — with one tripwire.** Placement is forced at every step and no new dependency, module or seam
appears. But the stored format with a legacy path is a data-model decision: if the union turns out to
fight the storage layer during Phase 3, that is the signal to stop and design, not to improvise.

---

## Acceptance criteria

Every criterion is red before the change and its red run is captured (owner constraint).

| # | Criterion | Declared check |
|---|---|---|
| 1 | #118's reproduction: a translated `de` document, English `body` edited, a `skip_existing` run → German `body` refreshed, German `title` byte-identical | integration, all three adapters |
| 2 | The provider receives only the changed leaf's text in that run | `translateCount()` / recorded payload |
| 3 | ~~Auto-translate with the default config translates only the changed field~~ — **withdrawn with D6.** Replaced by: the default's existing behaviour is pinned as a known limitation, and a collection on `skip_existing` gets its stale leaves refreshed | `auto-translate-only-changed.int.test.ts`, both cases |
| 4 | A legacy record (bare 64-hex) → behaviour identical to today, and the record is upgraded to the map form on the next successful translation | unit on the parser + integration seeding a legacy row |
| 5 | A document with ~500 translatable leaves: the stored value round-trips and re-parses to the same map, with the fixture's byte size asserted first | integration on **each** of SQLite, PostgreSQL, MongoDB |
| 6 | An element inserted at the head of a localized array → only the new element's leaves are translated, siblings untouched | integration (fails if the address is positional) |
| 7 | Projector and collector produce the **same set of addresses**, not only the same texts | the new assertion in `driftGuard.test.ts` |
| 8 | A dismissed staleness warning stays hidden when the source has not changed since | unit on `isRecordStale` + integration |
| 9 | The admin indicator reports the same staleness as before for the same situation: every case in `staleness.test.ts` keeps its verdict, and a legacy-shaped record yields exactly today's answers | `staleness.test.ts` cases preserved verdict-for-verdict (the fixtures adapt to the new input shape — see the note below), plus the HTTP-level `features/staleness/staleness.test.ts` |
| 10 | A field removed from the schema leaves no orphaned address in the newly written map | unit |
| 11 | No provenance record at all → `skip_existing` behaves exactly as today (D4) | unit + integration |
| 12 | Unhappy path: a stored value that is neither a legal map nor a legal hash → treated as absent, no exception escapes | unit |
| 13 | The existing `skip_existing` suites still pass unmodified (V4) | `strategies`, `strategy-publish-matrix`, `draft-safe-writes` integration specs |
| 14 | ~~`AutoTranslateConfig.strategy` is deprecated~~ — **withdrawn with D6a.** The option still applies, so there is nothing to deprecate |
| 15 | README, release notes and the #118 answer state the new behaviour, including that `overwrite` is unchanged | reading the files — **text proposed to the owner, not applied** |

**Note on AC 9, corrected during pre-flight.** It first read "the existing staleness tests pass
unmodified". That is not achievable and saying so now is cheaper than discovering it at grading time:
`isRecordStale` takes the current fingerprint as a parameter, so changing what a fingerprint *is*
changes its signature, and its test fixtures with it. The invariant that actually matters — and that
AC 9 now states — is that each existing case keeps its **verdict**, and that a legacy-shaped record
produces exactly today's answers. The fixtures may be re-typed; no case may change its expected
result, and none may be deleted.

**Outcomes are three: met · not met · not verified.** A criterion whose declared check could not be run
is recorded `not-verified`, never `met` via a weaker proxy.

### Criteria pre-flight (against the untouched tree)

To be run and recorded before the first edit. Expected polarity: 1–8, 10–12, 14, 15 must **fail** now
(they describe what must change); 9 and 13 must **pass** now (they describe what must stay true).

---

## Human choices

- **The approach itself was reversed mid-research, by the owner's challenge.** An earlier plan routed a
  changed-field list through the job row to avoid a storage change. On measurement there is no storage
  change (F1), so that plan fixed less and cost more. Recorded so it is not re-proposed.
- **"Reject new values, honour old ones" for the deprecated option is not expressible** and was dropped
  for that reason: the option is configuration in code, re-supplied from source on every boot, so no
  older value exists to tell from a newer one. A type-level deprecation is the one mechanism that does
  express it.
- **#118 is not closed by scope alone.** The issue's reproduction is the *manual* run; items 1 and 2
  address it directly. The larger unreported defect — auto-translate's default destroying untouched
  translations — is item 3. Both are claimed only where measured.
- **The D6 decision was reversed after it was built, by the owner.** The fork first put to them
  ("fix the bigger defect" vs "honour the setting") dissolved once measurement showed the first option
  silently stopped auto-translate writing hand-filled targets. The owner's direction — simplify, stop
  guessing, hand per-field control to the editor later — made the narrow close the right one. The
  larger defect stays open **knowingly**, pinned by a test.
- **The trade `skip_existing` makes was put to the owner and accepted (option A).** A leaf a human
  rewrote is indistinguishable from one the machine wrote — the receipt records what the *source* said,
  never who authored the target — so when that leaf's source moves, the refresh overwrites the human's
  text. Before per-field receipts it survived, because a non-empty target was skipped unconditionally.
  **This is a regression for `skip_existing` users in exactly one case, and it belongs in the release
  notes in plain words.** It buys the resolution of #118: the indicator and the strategy stop
  contradicting each other.

  The rejected alternatives: leave `skip_existing` alone (#118 stays open, nothing is gained) and
  record a second per-leaf hash of *what we wrote into the target* (no guessing at all, but a
  round-trip through Payload — lexical normalisation, publish — can change the text we would read
  back, making every leaf look hand-edited and stopping refreshes **silently**; that is its own piece
  of work with its own measurement).

  The real answer is the per-field opt-in the owner plans: an editor marking a field "do not
  auto-translate" is a statement, not an inference from hashes. The interim second hash would be
  thrown away by it.

  Pinned by `staleness-refresh.int.test.ts`, "overwrites a hand-rewritten target once its own source
  moves — the trade this change makes", whose comment says what to rewrite it to when the opt-in lands.
- **Three owner constraints bind every phase:** red tests first with the red run captured · the long-value
  test runs per adapter, not reasoned about · the two stored shapes are a typed union parsed once.
- **The D6 fork was put to the owner and decided for scope item 8**, i.e. the bigger unreported defect
  (auto-translate's default destroying untouched translations) is fixed and
  `AutoTranslateConfig.strategy` goes inert. The rejected alternative — honour the option, drop item 8 —
  would have left every host on the default still losing hand-corrections. The owner's condition was
  that an inert option must be retired honestly rather than quietly ignored; that is D6a.
- **Scope is one task, one merge**, decided by the owner: the foundation has nothing to verify until
  the strategy and auto-translate consume it, so a first merge would close no acceptance criterion.

## Progress log — Phase 3

Red runs captured in `docs/plans/artifacts/2026-10-02-red-runs.txt`. Every unit below went red on a
stub or against the unchanged code before it was implemented.

| Unit | Red | Green | Mutations |
|---|---|---|---|
| `computeFieldFingerprints` | 6/6 on a stub, 0 passed | 6/6 | — |
| `SourceFingerprint` parse/serialize | 23/23 on a stub, 0 passed | 23/23 | 3 run; **one survived and found dead code** (an unreachable `Array.isArray` guard behind a redundant `startsWith("{")` prefilter). Prefilter removed; the mutation then killed a case. |
| `isRecordStale` + `sourceChangedAt` | 17/17 on a stub, 0 passed | 17/17 | 4 run, 4 killed — including both halves of D4's safety rule |
| `PayloadProvenanceStore` parse boundary | 8 failed / 11 passed (the 11 are key and transaction cases, correctly untouched) | 19/19 | — |
| `ProvenanceService` merge-on-write | 7 failed / 8 passed | 15/15 | — |
| drift guard — address agreement | 1 failed on real values (`content.#0.heading` vs `content.b1:hero.heading`) | 4/4 | 1 run, 1 killed |
| `FieldChunkCollector` address | 24 failed / 17 passed | 47/47 | — |
| `SkipExisting` refresh-on-change | 1 failed (the only behaviour change; the four safety cases were already green, which is D4 holding) | 24/24 | — |
| `TranslationPipeline.translatedPaths` | 3 failed | 206/206 | — |
| handler wiring | 4 failed | 28/28 | — |
| integration — staleness refresh | see below | 7/7 | 3 run, 2 killed, **1 survived and exposed two coverage holes** |
| seen-but-not-ours marker | 5/5 red | green | 1 run, 1 killed |
| provenance reads made best-effort | 2 red | green | — |

*(The D6 and D6a rows that stood here were removed with those decisions — they described work that was
reverted, and leaving them listed as green was the review's "stale documentation" finding.)*

### Findings the mutations produced, and what was done

**1 — a dead guard in the parser.** `!Array.isArray(value)` could never run: a `startsWith("{")`
prefilter rejected arrays first. The prefilter was removed so the structural guard does the work it
claims to; the mutation now kills a case.

**2 — the collector named leaves from data that cannot name them.** `DataReconciler` deliberately
strips a per-locale row's `id` (`DataReconciler.ts:99-100`), so the walked `filteredData` has no id to
key an address by and fell back to `#index`. The address is now taken from the **source** element. The
drift guard had not caught this because its fixture fed the untouched document; it now feeds a
reconciled one, and a mutation back to the old behaviour fails it.

**3 — two integration coverage holes, found by surviving mutations.** "No receipt at all" and "a
receipt that exists but never recorded this leaf" are different branches, and only the first was
covered; a case for the second was added and now kills that mutation. Separately, the integration
fixture **cannot** prove the address is id-keyed, because `items` in the test collections is
non-localized — its rows are shared and keep their ids, so a positional address resolves to the same
leaf. The comment claiming otherwise was corrected; the unit-level drift guard is what proves it.

## Review log

### 2026-10-03 · sp-review-deep · target=working-diff
- **Vectors:** core(correctness · regression · intent) + contracts-types · tests · performance · conventions · abstractions-solid — 8-way parallel fan-out, then an opus adversarial pass (always-on for deep), then a 2-way focused re-check round (loop-until-dry, capped at 3 rounds).
- **Findings:** 19 raised · 11 dropped (confidence <75, see below) · 9 reported (major: 5, minor: 4) · 2 needs-verification · 0 fixed (fix=off, read-only review).
- **Reopening per round:** 3 → 1 → 1 (did not strictly fall round 2→3; independently confirms convergence alongside the 3-round cap).
- **Resolved:** none — fix=off, all survivors are report-only.
- **Left open (major, unresolved):**
  - `staleness.ts` `sameFields` (~L15-17) + `Provenance.service.ts` `record()` (~L99-114): a partial per-leaf receipt (no prior record, only some leaves translated) makes `isRecordStale` report permanently stale — breaks AC9. Both "obvious" one-line fixes are independently blocked by other pinned tests (`staleness.test.ts:63`, `Provenance.service.test.ts:281`/`:299`, `staleness-refresh.int.test.ts:191`) — needs an owner decision on the receipt/`isRecordStale` contract, not a predicate tweak.
  - `src/index.ts`: `SourceFingerprint`/`TranslationProvenanceRecord.sourceFingerprint` is public but its only parser (`parseSourceFingerprint`/`serializeSourceFingerprint`) isn't reachable from the package's public entry (`core` isn't in package.json `exports`) — the public type now describes a shape no public API produces.
  - `auto-translate-only-changed.int.test.ts:63`: AC3's "skip_existing refreshes a stale leaf" case never configures `strategy: "skip_existing"` (boots with the "overwrite" default) — passes vacuously; no test anywhere exercises the real path.
  - `Provenance.service.ts` `record()` (~L104): new unprotected `previousFingerprint()` read before the `swallowOrThrow`-wrapped write — a transient failure after the translation is already saved reports the request as failed.
  - `handler.ts:122`: a second, distinct unprotected `previousFingerprint()` read BEFORE translation starts (2x corroborated) — a transient failure here now aborts the whole request before the provider is ever called, where a provenance failure previously never blocked translation. Any fix must make this read best-effort WITHOUT making `record()`'s read best-effort the same way (a swallowed null there would silently erase other leaves' provenance on upsert).
- **Left open (minor, unresolved):** stale Progress-log table rows for withdrawn D6/D6a tests; `SourceFingerprint` missing `@since` tag; orphaned/stale JSDoc on `translateContent.ts`; `getStaleness` now always double-walks the document (document hash + field hashes) even though the document hash only serves legacy receipts.
- **Needs-verification (handoff to owner):** AC5/AC13 — no recorded evidence the 500-leaf round-trip and the three untouched `skip_existing` suites were actually run on Postgres/Mongo (only SQLite-shaped evidence in the artifacts), despite the owner's own constraint that adapter runs aren't reasoned about; and whether the breaking change to the public `TranslationProvenanceRecord` type will ship with a major-bump commit given the repo's commit-type-driven release process.
- **Dropped (confidence <75):** provenance key ignores `sourceLocale` (50); `record()`'s redundant `previousFingerprint` re-fetch as a pure efficiency concern (70 — the same call site was independently confirmed as a correctness/error-propagation issue above, at higher confidence); `ProvenanceStore.interface.ts` `upsert` type permitting `null` against a `required:true` column (45, dormant); `TextChunkExpander.test.ts` hardcoded `idPath: "name"` fixture bug (55, dormant).
- **Pin:** not set — confirmed reopening findings (AC9, AC3, the two unprotected reads) remain unresolved in a read-only (fix=off) run.

### After the deep review — what was fixed and what was not

The review raised 19, reported 9. Acted on:

**The one that mattered — a defect this change introduced, reproduced before it was fixed.** A run that
translated some leaves and deliberately skipped others wrote a **shorter** map, and `sameFields`
requires the key sets to match, so the indicator read "out of date" immediately after a successful run
and could never be cleared: clearing it needed the skipped leaf in the map, which needed translating
it, which nothing would do. Measured: receipt `{"note":"7cddd654af7c2adf"}` for a two-leaf document,
`is_stale: true` with the source unmoved.

Neither one-line fix was legal — relaxing the key check collides with the pinned "a leaf was
added/removed" cases, and writing a complete map collides with the three cases that stop a run
claiming a leaf it did not translate. The receipt could not express **"seen, not mine"** apart from
**"never seen"**.

Fixed by giving it a third value: a leaf the run saw and declined is recorded as `null`. A hash means
"translated from this text", `null` means "saw it, left it", absent means "appeared afterwards".
`sameFields` skips `null` entries, so a declined leaf no longer reads as drift; a genuinely new leaf
still does. `sourceChangedAt` reads `null` as `undefined`, so D4's safety rule is untouched. Pinned by
`per-field-receipt.int.test.ts` ("does not leave the indicator stuck on…" and its opposite, "still
lights the indicator when a leaf genuinely appears"), and a mutation back to the old merge fails it.

**Two unprotected provenance reads this change added**, fixed differently on purpose:
- `handler.ts` — the read before translating is now best-effort. A sidecar that cannot be reached
  degrades every leaf to "we do not know", which is the behaviour from before receipts existed, rather
  than aborting the request before the provider is called.
- `Provenance.service.record()` — the read moved **inside** the existing guard, so a failure aborts the
  write instead of being swallowed. Swallowing it to `null` would make the merge treat a real receipt
  as none and mark every untouched leaf as not-ours, erasing what earlier runs recorded.

**A test that proved nothing.** The case titled "refreshes a stale leaf when the collection asked for
`skip_existing`" booted auto-translate without a strategy, so it ran under the `overwrite` default and
passed identically either way. Moved to `auto-translate-skip-existing.int.test.ts`, which is now the
only place anywhere that boots auto-translate with that strategy actually set.

**A public type nothing public could produce.** `TranslationProvenanceRecord` describes a parsed
fingerprint, but the only parser lived in `core`, which is not in the package's `exports`.
`parseSourceFingerprint` / `serializeSourceFingerprint` are now exported beside it.

**Minor:** `@since` added to the new public type; the docblock in `translateContent.ts` reattached to
its function; the progress-log rows for the withdrawn D6/D6a removed.

### Deferred — validation in core

Raised by the owner while reading `isRecordedMap`: hand-rolled type guards are hard to read, and the
package already depends on zod — just not in `core`, which carries a stated dependency-free rule
(`core/index.ts:4`, `index.ts:19`).

**Measured before deciding.** `core` holds 18 hand-rolled guards, but only **two** parse foreign data:
`SourceFingerprint.ts` (the stored column) and `getAutoTranslateConfig.ts` (the host's `custom` bag).
The other sixteen narrow unions that are already typed — which field type this is, whether a node is
Lexical — and a schema does not help there. Several sit on the translation hot path.

Also measured: `@repo/translator-core` **does not exist**. Nothing outside the plugin imports `core`.
The dependency-free rule is written for an extraction that has not happened, so it is live as intent,
not as a constraint.

**Decided by the owner:** relax the rule — zod may enter `core`. The argument that it would cost
portability is weak, since zod has no dependencies of its own and runs anywhere; the real cost is
weight.

**Done:** both guards are zod schemas now.

```ts
const recordedMap = z.record(z.string().nullable());                  // SourceFingerprint.ts
const autoTranslateConfig = z.object({ targets: z.array(z.string()) }); // getAutoTranslateConfig.ts
```

Each site carries a `TODO(core-deps)` marker naming the rule that was relaxed and when to revisit —
if the `@repo/translator-core` extraction is ever done.

Both are **checked, not parsed**: `safeParse(...).success` with the original value returned. For
`getAutoTranslateConfig` that is load-bearing — zod strips keys it does not describe, and the optional
settings (`strategy`, `debounceMs`, `sourceLocale`) are not in the schema, so parsing would silently
drop them.

The sixteen guards that narrow already-typed unions are untouched, for the reason measured above.

**Rejected outright: writing a small zod-alike in `core`.** The hard part of zod is not the runtime
checks, which are four lines of `typeof`; it is the type inference. Without it the type is written
twice — once as a schema, once by hand — and the two drift, which is the defect the exercise set out to
remove. A hand-rolled validator is a library, and a library is forever, in a plugin whose job is
translating content.

### Not fixed, with the reason

**The double document walk in `makeCurrentFingerprint`** (review, minor, confidence 75). Reading
staleness computes both the document-wide hash and the per-field map, and the document hash only serves
legacy receipts. Removing the second walk means either making the field lazy inside a plain data type,
or restructuring the three hashing entry points so one walk feeds both — and that puts a second copy of
the hashing rule in play, which is exactly the drift the guard in `driftGuard.test.ts` exists to
prevent. One extra walk on an admin read is the cheaper side of that trade. Recorded so the next
reviewer does not re-raise it as an oversight.

**Adapter evidence** was the review's `needs-verification` handoff: the runs were made and the numbers
reported in conversation, but nothing in this file recorded them. Now they are — see the run below.

### Comment audit — 2026-10-05

153 comment blocks across the whole working diff, judged in three slices by independent
fresh-eyes passes (core domain 34 · pipeline and server 51 · tests 68). Applied: 78 deletes,
34 comment rewrites, 11 code rewrites, 9 missing notes added; 18 kept with a named reason.

Seven notes were symptoms of code that did not state its own constraint, and the code changed
instead:

- `SourceFingerprint.parseSourceFingerprint` — `asFieldMap` extracted, so the `catch` branch no
  longer needs a sentence explaining where control lands.
- `staleness.ts` — `matchesClaim` extracted. A `DECLINED` entry reading as "present, nothing to
  compare" is what stops a deliberately skipped leaf showing as permanent drift; that rule was an
  anonymous `||` branch. The file is 90 lines, from 123.
- `ProvenanceService.readFingerprint` → `readFingerprintOrThrow` (private, two call sites). Two
  docblocks circling "which read may see a failure" were deleted; the name carries it.
- `provenanceIo` — the deliberate omission of `scope` is now `OUTSIDE_THE_CALLERS_TRANSACTION`
  rather than an undocumented five-key destructure against a six-key target.
- Test-side: named `{ publish }` instead of a positional boolean; `MIN_ROUND_TRIP_BYTES` derived
  from `LEAVES`; `SHA256_HEX_LENGTH` named in the four places where the 64 is load-bearing.

**Found while verifying, and fixed:** `apps/dev` `check-types` had two `TS2352` errors and oxlint
one unused binding, both in files this task adds. Proved pre-existing to the audit by re-running
against the staged version. The package gates were being run without the app's.

### Rejected verdicts — do not re-raise

- **`TranslationPipeline.ts` `(ctx.fieldChunks ?? []).map(...)`** was reported as a silent
  substitution that makes a run claim nothing. It is unreachable: `stages` is a fixed list, the
  collector always populates `fieldChunks`, and an empty result returns `null` inside the loop. The
  report also claimed the sibling guard throws; it returns `null`.
- **`lastTranslatedFrom`'s `return read ?? null`** was reported as collapsing "the read failed" into
  "there is no receipt". That collapse is the documented contract — both degrade every leaf to
  unknown, and widening the return hands callers a distinction they cannot act on.
- **Both `TODO(core-deps)` marks** were deleted by two independent passes, partly on a dead
  `core/index.ts:4` citation. The citation is repaired and the dependency rule is back in the
  barrel header. The marks stay, at two lines each, by owner's instruction.
- **Ten blocks reported as unjudgeable** at `server/modules/provenance/index.ts:26-112` are
  phantoms: the candidate list was cut while that barrel still carried annotated re-exports, which
  the re-export trim had already removed. Nothing is unjudged.

### Deferred

`filteredData` → `reconciledData` (nine references) would remove a comment that exists only to
correct the name, but it reaches `DataReconciler.stage.ts`, outside this diff. The eight section
banners in `src/index.ts` are pre-existing as a set; cutting one leaves the file inconsistent.

Gates after the audit: 1929 unit · check-types clean in both package and app · oxlint 55/0 in the
package and 0 in the app · integration sqlite 178, postgres 184, mongo 177, re-run after a rebuild
with the core edits and identical to the pre-audit run.

### The fingerprint is internal — decided 2026-10-05

The task briefly made `SourceFingerprint` and `parseSourceFingerprint` public, to close a review
finding that the public `TranslationProvenanceRecord` had come to describe a shape no public API
produced. That was fixing a consequence. The owner's call reversed it at the cause:

**How the plugin decides a locale is out of date is its own business.** The truncation rule, the
address grammar and the three-valued leaf record are mechanism, not contract. A consumer reading the
sidecar wants *which document, which locale, translated when* — whether it is stale is answered by
the staleness endpoint.

So `TranslationProvenanceRecord` — public since 0.7.0 — now carries only the five consumer-facing
fields, and the two fingerprint columns moved to `ProvenanceReceipt extends
TranslationProvenanceRecord`, which stays internal. Nothing new is exported from `src/index.ts`; the
`@since 0.15.0` marks came off `SourceFingerprint.ts`, which is no longer public API.

**Public surface audit that produced this.** All 58 symbols exported from `src/index.ts` were checked
against two criteria: documented in README, or called from an app in this repo. Six were neither.
Four of those are reachable from signatures a consumer must name and stay —
`OpenAIProviderConfig` (parameter of `createOpenAIProvider`), `DryRunConfig` (its `dryRun` field),
`RequestScope` (second parameter of `TaskRunnerProvider` and `TaskRunner.enqueue`) and `Requester`
(a field of it). The remaining two were the ones this task added. No other internals leak.

Separate debt found and not fixed here: `RequestScope`/`Requester` carry `@since 0.14.0` in code but
have no `Since v0.14.0` note in README, which the package convention requires.

**Release consequence.** Removing two fields from a published type is breaking in substance. The
owner's decision is to ship it as a minor while the package is in beta, so the commit must be
`feat:` — the release config has no major remapping for 0.x, and a `feat!:` or a `BREAKING CHANGE:`
footer would compute 1.0.0 rather than 0.15.0.
