# A run reports the leaves that came back, not the ones it attempted

Issue: [#197](https://github.com/focusreactive/payload-plugins/issues/197)
Upstream: `2026-10-18-the-rewiring.md` §6, **F1** (lines 542–560)

## Requirements / Task restatement

`PipelineResult.translatedPaths` is built from the leaves *collected*:

```ts
// TranslationPipeline.ts:85
translatedPaths: (ctx.fieldChunks ?? []).map((chunk) => chunk.idPath),
```

A model may answer with fewer values than it was sent. The reply parser accepts that by design,
it is not an error and triggers no retry, and the applier writes what came back and leaves the
rest. But the report names every collected leaf, so `ProvenanceService.record` writes the
**current** source hash for a leaf nobody translated:

```ts
// Provenance.service.ts:107
hashes[address] = translated.has(address) ? hash : previousClaim(previous, address);
```

A leaf whose target was empty holds the source text, put there by the reconciler before the model
was called. The receipt seals it, staleness finds a matching fingerprint, and the field reads as up
to date **permanently**. An already-translated field is not damaged, so the harm is confined to
empty targets, and only where provenance is on — with it off, nothing revisits the field at all.

The correction must land now rather than later: this field crosses the module seam that step 4
(#198) publishes, and the contract has to say *returned* from the start.

**Second half, named in F1:** the adapter stops writing to `console`.

## What already exists — platform · installed · project · verdict

| Needed | Found | Verdict |
|---|---|---|
| the leaf address, per leaf | `FieldChunk.idPath` (`types/FieldChunk.ts:11`) | reuse — the same address a receipt is keyed on |
| "did this chunk get written" | the rule is already in `TranslationMutator.apply` — container by `reply`, others by `translations[index]` | extract, do not restate |
| detection of a partial reply | `parseAndValidateReply` returns `missingInputKeys` / `unrequestedReplyKeys`, and `KeySetMismatchError` carries both | already there; only the `console` write is new work |
| a link from a text chunk to its leaf | **nothing** — `TextChunkExpander.expand` allocates indices per field chunk and records no boundary | this is the whole design question |

Nothing new from outside the package. No new dependency.

## Decisions

**D1 — the leaf's address travels on the text chunk.** Each `TextChunk` variant gains a required
`idPath`, set by the expander from the `FieldChunk` it was handed. *Lost:* a side table from
`TextChunkExpander.expand` pairing each leaf with its index range, and re-deriving the grouping in
the pipeline. *Constraint:* the traversal kernel that replaces this machinery at the swap (#199)
already carries the address on each unit — `TranslationTarget.idPath`, `core/traversal/contract.ts`.
Matching that shape means the swap deletes this code rather than unpicking a side table into it.
The field being required also means a future expander cannot forget it: the compiler asks.

**D2 — the applicator reports what it wrote; nothing re-derives it.** `TranslationMutator.apply`
returns the chunks it wrote, the stage puts them on the context as `writtenChunks`, and the
reporter groups those by leaf. *Lost:* (a) a shared `wasWritten(chunk, translations)` predicate
called by both the mutator and the reporter, (b) letting the reporter re-derive the condition on
its own. *Constraint:* the rule is subtle and already written down —
`RichContainerChunk.reply`'s docblock says the applicator "must not tell the two apart" when no
reply came back and when one could not be parsed. Two expressions of that drift, and the drift is
silent: the report claims a leaf the mutator skipped. (b) loses outright. (a) survived the gate and
**was then rejected during execution** — see below.

**D2 was revised mid-build, and the revision is the point.** The shared-predicate version was
written first. It did not survive contact: `wasWritten` returning `true` tells TypeScript nothing
about `chunk.reply`, so the mutator's container branch needed `chunk.reply ?? []` and its plain
branch `translations[chunk.index] ?? ""` — two fallbacks for states the predicate had just
excluded. Dead values standing in for a guarantee the types could not carry is the smell that said
the shape was wrong. Having the applicator *return* what it wrote removes the predicate entirely:
there is one decider rather than two agreeing ones, no unreachable branch, and the stale
`@returns` docblock on `apply` — which promised a result the method never gave — becomes true
instead of being deleted. The cost D2 originally cited against it, one field on `PipelineContext`,
is real and accepted: the context already carries `textChunks`, `translations` and `filteredData`,
and `writtenChunks` sits beside them.

**D3 — a leaf that produced no chunks is not translated.** A leaf counts as translated only when it
produced **at least one** chunk and every one was written. *Lost:* "every chunk was written", which
is vacuously true for zero. *Constraint:* zero chunks is reachable twice over —
`PlainTextExpander.canExpand` refuses a non-string, a blank string, `null` and `{}`
(`PlainTextExpander.ts:8-9`), and `RichTextExpander` yields none for a tree whose text nodes are all
blank. Nothing was sent for such a leaf, so claiming it seals exactly the empty-target case this
whole correction is about. **Beyond F1's wording; recorded as a decision rather than slipped in.**

**D4 — the console write goes, the detection stays.** `warnAboutPartialReply` and its formatting
helper are deleted along with the call. *Lost:* keeping the write behind a flag, and inventing a
reporting channel for it. *Constraint:* the `missing` half now reaches the caller properly, through
`translatedPaths` — that is what F1 means by the two halves being one change. The `unrequested` half
has no consumer today, and it survives where it belongs: `parseAndValidateReply` still returns both
lists and `KeySetMismatchError` still carries them, each with its own tests. Inventing a channel for
a provider-conformance signal is the provider port's business (#201), not this fix's.

### Placement

`idPath` on the three chunk variants and `wasWritten` go in
`src/core/translation-pipeline/types/TextChunk.ts`, beside the guards that already live there. The
grouping — leaves whose every chunk was written — stays inline in `TranslationPipeline.ts`: one
caller, and the brake against an abstraction with one caller applies.

### New surface — the shape check

None of the mechanical triggers fires: `TextChunk` is internal (absent from `src/index.ts`), is
implemented nowhere outside this package, the new field is **required** rather than optional, no
exported function gains a parameter, and D2 *merges* two decisions rather than splitting one.
D1 is still a shape decision and is recorded as one above.

### Written contract

`wasWritten` owes its callers something the signature cannot state: that it is the **same** decision
the mutator acts on rather than an approximation of it, and that for a container "written" means a
parsed reply, not a returned string. Stated in its docblock, and pinned by AC3.

### Escalate to `/sp-architect`?

No. One module, no new dependency, no new seam, no data-model change — the stored shape is
unchanged, only which addresses are claimed.

## Acceptance Criteria

From `packages/payload-plugin-translator`.

| AC | Criterion | How it is checked | Passes when |
|---|---|---|---|
| AC1 | A leaf the model did not answer is absent from `translatedPaths` | `bunx vitest run src/core/translation-pipeline/__tests__/reportsWhatCameBack.test.ts -t "unanswered"` | the address is not in the result; its answered sibling is |
| AC2 | A leaf answered in full is present | same file, `-t "answered in full"` | the address is in the result |
| AC3 | **A container whose reply could not be parsed is not claimed** | same file, `-t "unparsable"` | the rich-text field's address is absent, although a translation string came back for its index |
| AC4 | A leaf cut into several chunks is claimed only when every one came back | same file, `-t "partly"` | absent when one of its text nodes went unanswered |
| AC5 | **Unhappy** — a collected leaf that produced no chunks is not claimed | same file, `-t "no chunks"` | absent, and the run still reports its answered siblings |
| AC6 | The receipt no longer seals an unanswered leaf | same file, `-t "receipt"` — drives `ProvenanceService.record` with the new paths and reads the stored fingerprint | the unanswered address keeps its previous claim rather than the current hash |
| AC7 | The adapter writes nothing to `console` | `grep -rn "console\." src/translation-providers/shared/CompletionProvider.provider.ts` | no match; `runDryRun.ts` still has its `console.info` |
| AC8 | The partial-reply detection survives where it belongs | `bunx vitest run src/translation-providers/shared/parseAndValidateReply.test.ts` | unchanged and passing |
| AC9 | The docblocks say what is true | read `PipelineResult.translatedPaths` and `TranslationMutator.apply` | the first says *returned*, not *sent*; the second no longer promises a return value it does not give |
| AC10 | Nothing else moves | `bunx vitest run` | 177 files / 2371 checks plus the new ones, all passing |
| AC11 | Clean types and lint | `bun run check-types`, `bunx oxlint .` | 0 type errors; 0 lint errors, ≤44 warnings |

## Pre-flight

Against the untouched tree, 2026-10-21, branch `fix/translator-report-returned-not-attempted`
from `origin/major/translator` at `69915d06`.

| AC | Command | Result | Classification |
|---|---|---|---|
| AC1–AC6 | the new test file | absent | **change** — fails now |
| AC7 | `grep -rn "console\." …/CompletionProvider.provider.ts` | one match, line 88 | **change** — fails now |
| AC8 | `bunx vitest run …/parseAndValidateReply.test.ts` | passing | **invariant** |
| AC9 | read both docblocks | `translatedPaths` says "actually sent for translation"; `apply` promises "@returns Mutation result with count" and returns `void` | **change** — both false now |
| AC10 | `bunx vitest run` | 177 files, 2371 checks, passing | **invariant** |
| AC11 | `bun run check-types` · `bunx oxlint .` | 0 errors · 44 warnings, 0 errors | **invariant** |

AC9's second half is a pre-existing false docblock found during investigation: `apply` returns
`void` and has promised a result since before this change.

## Risk notes

**High risk** — it changes what is written into stored provenance records, and the staleness verdict
a user reads. So: the regression sweep in Phase 4 is evidenced, and Phase 5b runs three review
angles.

- **The fix can only ever claim less — but "claiming less" is not free, and review found where.**
  See the review log entry below: when the dropped leaf has **no** earlier string claim, `record`
  writes `DECLINED`, which staleness reads as "claims nothing, never drifts". That silences the
  later source-drift signal the old (wrong) seal happened to provide. Recorded as a known cost; the
  remedy is the owner's, because it changes what a receipt may store.
- **With provenance off there is no self-correction.** F1 records this: a field the model did not
  answer keeps the source text and nothing revisits it. Unchanged by this fix, and not its job.
- **A container reply that parses is claimed even if a mark came back empty.** `applyContainer`
  drops an emptied mark's node deliberately. "Written" means the reply was applied, not that every
  word changed — and that is the existing meaning, not a new one.

## Human choices

Forced at the gate, which the owner was not present for. All three are reversible and none is
visible outside this package.

- **2026-10-21** — D3, that a leaf with no chunks is not claimed. F1 does not mention the case; it
  is reachable and claiming it would seal precisely the empty target F1 is about.
- **2026-10-21** — D4, that the `unrequested reply keys` signal loses its only reader. The
  alternative is a new reporting channel, which belongs to the provider port.
- **2026-10-21** — AC9 extends the task to a false docblock on `apply` that predates this change,
  on the grounds that the same read that corrects one is already open on the other.

## Review log

### 2026-10-21 — comment audit

Nine blocks were handed over; **ten verdicts came back**. 5 deleted, 4 shortened, 1 answered by
renaming. Comment lines over the change: 18, all docblocks, no new inline comment — the density
verdict was *ok*, with one file called out: `TextChunk.ts` added three doc lines for three field
lines, all carrying the same sentence.

**The tenth block was one this change stranded**, and the audit went looking rather than taking the
list on trust: the docblock explaining why model-supplied keys were quoted before printing
(`CompletionProvider.provider.ts`) outlived the function it described and came to sit on
`asConfigurationFailure`, which it does not describe. It was false by the time the audit read it.

**One finding was a factual overclaim of mine.** The rewritten `translatedPaths` docblock said a
skipped leaf is absent "so the next run picks it up". That holds only when the previous claim is
`DECLINED` or an older hash; if the stored receipt already claims the current source hash, the leaf
stays up to date and is not picked up. The text now states the mechanism — absent, so the receipt
keeps its prior claim — and points at `ProvenanceService.record` instead of promising an outcome.

**Three repetitions collapsed into one statement.** The `idPath` docblock was written once per union
member. The fact a reader actually needs is many-to-one — several chunks share one leaf's address,
which is the whole basis of `leavesFullyWritten` — and that is a property of the union, so it is
said once on `TextChunk`, replacing a docblock this change had made stale ("contains only data
references for mutation" stopped being true the moment each variant carried an address).

**Two notes went beyond comments and were taken as defects.**

- `applyContainer` returns early when a container has no children, yet the chunk was pushed as
  written regardless — the report would have claimed a leaf nothing was written into. Unreachable
  today, because `collectInlineFragments` only emits containers with a direct text child, but the
  discrepancy was real. `applyContainer` now reports whether it wrote, and the push depends on it.
- `TranslationMutator.apply`'s new return value was covered only through the pipeline. Three checks
  added directly on the unit, and three further mutations run against them: returning every chunk
  rather than the written ones turns all three red; claiming a container regardless of the write, or
  treating a childless container as written, turns one each.

Also fixed, outside the diff but falsified by it: `ProvenanceService.record`'s `@param` said it
received "the leaves this run actually sent for translation".

### 2026-10-21 — three review angles (high risk)

**The claim rule: no findings.** Object identity between what the expander produced and what the
applicator returned holds on every path, including the one that worried me — `RichContainerExpander`
spreads `{ ...perNodeChunk, index: at }` for a skipped container, and it is that copy, not the
original, which reaches `textChunks` and then the applicator. Grouping by `IdPath` is unambiguous
for any input the collector can produce, the tally counts exactly what was sent, and the early
returns are untouched.

**What the deletions cost: one major test gap, closed.** Every check that named a rich-text leaf
positively used the *container* expander; the only per-node case expected `[]`. So a wrong or
missing `idPath` in `RichTextExpander` would have passed the whole suite — and the harm would have
been the **opposite** of this fix: fully translated rich text silently declined. A check now drives
the per-node expander with every chunk answered and expects the leaf claimed; mutating
`RichTextExpander` to stamp a foreign address turns exactly that check red.

Two smaller ones from the same angle: D3 gained a second shape — a rich-text tree whose text is all
blank, where the expander *accepts* the value and still yields nothing, which `count: 42`
(refused outright) does not exercise; and the receipt check now also runs against a **non-null**
earlier claim, so "keeps its previous claim" is shown as a real hash rather than only as `null`.
The doubt about whether `count: 42` is collected at all is settled: both D3 checks go red under the
defining mutation, which they could not if the leaf never reached the collector.

The deletion of the console warning cost nothing live. Nothing prints `unrequestedReplyKeys`
anywhere; `KeySetMismatchError` builds its message from counts and holds the lists non-enumerably,
with its own check that they stay out of a serialized error. The newline-forging concern the
deleted quoting guarded against has no remaining path.

**The provenance consequence: a major finding, recorded and not fixed here.**

The harm is reversed only where the leaf has an earlier **string** claim. Where it has none — a
first run, a legacy document-shaped receipt, or an address that appeared after the last receipt —
`previousClaim` returns `DECLINED`, and `DECLINED` is deliberately inert: `matchesClaim` returns
true for it (`staleness.ts:22-28`) and `leafSourceChanged` returns `undefined`
(`staleness.ts:64-69`), by a documented rule that "a stored value neither reader understands must
claim nothing, never drift". `SkipExistingStrategy` then returns `ctx.sourceChanged === true`,
which `undefined` fails, and the target is no longer empty because the reconciler copied the source
text into it before the model was called.

Net: for that leaf, a **later edit to the source no longer makes the field stale**, where the old
false seal would have. Before the change the leaf was equally unclaimed until the source moved, and
then it was re-translated; now it is never revisited under `SkipExisting`.

This is narrower than "the fix makes things worse" — in every case with a prior claim the fix is a
strict improvement, and with `OverwriteStrategy` the leaf is retranslated regardless. But F1's own
sentence, *"the field simply has no receipt and the next run picks it up"*, assumes an address can be
absent from the stored map. It cannot: `record` writes an entry for every address in
`currentFields`, so "not claimed" is spelled `DECLINED`, and `DECLINED` cancels the drift signal.

**Not fixed in this step, deliberately.** Every remedy changes what a receipt may store — a third
state beside "hash" and "declined", or omitting the address and letting `sameAddresses` fail, which
makes the **whole** record stale rather than the leaf. That is a data-model decision with a blast
radius well outside this correction, and it is the owner's. Carried to the questions list and to
step 4 (#198), which publishes this field's meaning at the module seam.

**Also raised, for the owner:** a run that answers nothing now writes a receipt with every address
declined and a fresh `translatedAt`, so the admin reads "translated just now" over a run that
translated nothing. Previously the same run sealed everything, which was worse. Whether such a run
should write a receipt at all is a question, not a defect of this change.
