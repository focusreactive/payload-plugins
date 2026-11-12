# Task contract — one ruler for translatable content

**Risk: HIGH.** The change rewrites how a field's stored hash is built. Every receipt in every
locale is keyed on that hash, a mistake is silent in both directions — a document that quietly
never goes stale, or every document going stale at once — and no number of runs settles either.

## Requirements / Task restatement

Two defects, one cause: the walk-backed hash and the auto-translate gate each measure translatable
content differently from the rest of the plugin.

- **R1 (in)** A field's hash must not alias. Text moved across the boundary between a rich text's
  own prose and a block embedded in it, or between two embedded blocks, must change the hash.
  Today both joins use an empty separator, so it does not.
- **R2 (in)** Reordering embedded blocks must **not** change the hash. Only a change of content
  counts as a change.
- **R3 (in)** Replacing a block with a different block carrying the same text must change the hash:
  the text is attributed to a different element, and a translation recorded against the old one no
  longer describes the source.
- **R4 (in)** A field with nothing embedded in it must keep hashing byte-for-byte as it does today.
  This is the walk swap's own guarantee, and the whole reason that change could ship without
  re-hashing every stored receipt.
- **R5 (in)** The auto-translate change gate must measure with the same bound measurement
  provenance uses, so that a change to the content model cannot reach one reader and miss another.
  Today it is the last reader still on the pre-swap projection, so a save that edits only text
  inside an embedded block marks the locale out of date in the panel and enqueues nothing.
- **R6 (in)** The gate's agreement with provenance is pinned by a check that fails if they ever
  answer differently.
- **R7 (in)** The units the gate's move leaves without a caller are removed.
- **R8 (out)** The field-schema projection itself. It is not dead and cannot be removed: it is the
  first term of the walk-backed hash, which is what R4 rests on.
- **R9 (out)** A block carried without an id gets its address from its position, so reordering such
  a block does change the hash. Pre-existing, identical under the previous hasher, and fixing it
  means giving every embedded block a durable identity — its own body of work.

## Two corrections to the premise this task was framed on

Both found while reading the code, both narrowing the fourth part of the work:

1. **The field-schema projection stays.** It was expected to lose its last consumer once the gate
   moved. It does not: the walk-backed hash is built as *that projection's text for the field, plus
   whatever the walk found below a crossing at the same address*. Removing it would mean
   re-deriving the field's own text from the walk, which the swap deliberately rejected because the
   two cuts disagree on a blank text node between runs — exactly the re-hash R4 exists to avoid.
2. **Nothing here is published, so nothing here is breaking.** The symbols in question leave
   `src/core/index.ts`, which is an internal module barrel. The package's published entries are the
   root, `./client/*` and `./testing`; the root re-exports three type names from the core and none
   of them is one of these. So this needs no deprecation entry and no breaking-change footer, and
   it is not the major that makes the removal possible — it was always an internal cleanup.

## What already exists

- **Platform / installed libraries:** nothing. How this package decides a locale is out of date is
  its own question; `node:crypto` already supplies the hash.
- **Project — and this is the decisive precedent:** the pre-swap hasher already answered exactly
  the question R1, R2 and R3 ask. It serialized each entry as `length:address=length:text`, sorted
  the entries by address, and hashed the result. Address and text both present, both
  length-prefixed, order removed. The walk-backed hash dropped all three properties.
- **Verdict:** restore that answer for the crossed-in part rather than invent a second one. A
  second answer to a question the repository already settled is the same defect this task is here
  to close, one level down.

## Decisions

**D1 — a field with crossings hashes a combination of hashes, not a combination of text.**
Chosen: `hash(hash(own text) + the hash of each crossed-in piece)`. Each inner hash is a
fixed-length hex string, so the boundary between the parts cannot be moved by any text an editor
can write.
Rejected: a separator character between the parts, such as `\u0000`. It is smaller — two lines —
and in practice safe. It loses on a structural residual: R4 forbids the separator on the
no-crossing branch, so that branch hashes bare text, and bare text containing the separator can
imitate the boundary. Fixed-length hashes have no such residual.
Rejected: length-prefixed serialization of the whole field, in the style of the old hasher. It
removes the aliasing *within* the serialization but leaves the same cross-branch residual, since a
field with no crossings is still hashed bare.

**D2 — the crossed-in pieces are sorted by address before they are combined.**
Reordering two embedded blocks leaves every address untouched, because an element's address is
keyed on its id, so sorting removes traversal order from the result.
Rejected: sorting the pieces by their hash. Because D3 puts each piece's address inside its own
hash, this would catch R3 too — it loses on legibility, not on correctness. The order would be
decided by content, so a one-character edit reshuffles the sequence and no part of the result can
be traced back to a place in the document. Sorting by address keeps the order a property of where
the content lives.
Rejected: leaving them in traversal order. That is today's behaviour and it breaks R2.

**D3 — each piece hashes its address together with its text, both length-prefixed.**
Without the address, a block replaced by a different block carrying the same text produces an
identical hash (R3). The form is the pre-swap hasher's own, cited above.

**D4 — the no-crossing branch is not touched at all.**
A field with no crossed-in pieces keeps hashing exactly its own text, the same bytes as today.
This is a condition, not an elegance; R4 is what makes the change shippable without a one-time
staleness across every document.

**D5 — the parts travel to the hasher; nothing is joined before it.**
`FieldContent` carries the field's own text and its crossed-in pieces separately, and the folding
step returns pieces with their addresses rather than one joined string. The rule for turning them
into a hash then lives in one function.
Rejected: joining inside the folding step, as today. The rule is currently spread across three
files — one joins the pieces, one joins own-with-crossed, one hashes — and D2 cannot be
implemented there at all, because order cannot be restored from a string that has already been
joined.
The field's text has exactly one reader, the hasher; the two other consumers of this projection
read only addresses. So the reshape reaches one call site.

**D6 — the gate takes the bound measurement, not the walk.**
The gate stays a pure predicate with no framework types, which is what its own founding decision
requires and what lets it be tested without a database. It receives the already-bound measurement
the plugin assembles once, the same object provenance receives. The assembly point already builds
it unconditionally, before and independently of whether provenance is enabled, so this adds no
coupling to that option.
Rejected: having the gate build its own walk from the embed table. Same definition today, two
independent assembly points tomorrow — which is the failure this task exists to close.

**D7 — a collection the plugin does not translate keeps today's behaviour.**
The bound measurement answers `null` for such a collection, and today the gate is skipped entirely
when the collection has no schema, so the save proceeds. That stays: a collection outside the
plugin's content model is not the gate's business to refuse.

**D8 — two commits.** The hash and the gate first; the removal of the orphaned units second.
Mixing a cleanup across roughly a dozen test files into a change to the hash makes both harder to
read, and the second commit is pure subtraction.

**Placement.** The hash rule lands in the fingerprinting function; the pieces and their addresses
in the folding step and the projection type beside it; the gate and its caller keep their files.

**New surface.** One type for a crossed-in piece — an address and its text — with two callers, the
folding step that produces it and the hasher that consumes it. The shape check fired on the
reshaped projection type: two fields replacing one, always set together. Two shapes were compared —
the pair of fields, or one pre-joined string with a parallel list of addresses. The pair wins on
every count: the next kind of part costs one field either way, it admits no state the system does
not produce, and the parallel list would reintroduce the index-correspondence defect the pipeline
was just cured of.

**Written contract.** Yes, one: the hashing function owes its callers that a field with no
crossed-in pieces hashes exactly as the previous implementation did. A signature cannot state it.
It is pinned by a frozen baseline rather than by prose.

**Escalate to a design pass?** No. One module, no new pattern or seam, no dependency, no change to
what is stored — only to how a stored value is computed.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
| --- | --- | --- | --- | --- |
| AC1 | R1 | Moving text across the boundary between a rich text's own prose and an embedded block changes the field's hash | the aliasing cases in `__tests__/theHashCannotAlias.test.ts` | exit 0, and red before the fix |
| AC2 | R1 | Moving text between two embedded blocks changes the field's hash | same file | exit 0, and red before the fix |
| AC3 | R2 | Reordering two embedded blocks leaves the field's hash unchanged | same file | exit 0 |
| AC4 | R3 | Replacing a block with a different block carrying the same text changes the field's hash | same file | exit 0 |
| AC5 | R4 | Every field with nothing embedded in it hashes to the same value as before this change | a frozen baseline recorded from the current implementation, asserted in `__tests__/theHashCannotAlias.test.ts` | exit 0, every recorded field equal |
| AC6 | R5 | A save that edits only text inside an embedded block enqueues a translation | the new case in `auto-translate/__tests__/hasSourceContentChanged.test.ts` | exit 0, and red before the fix |
| AC7 | R5 | The gate names no symbol of the field-schema projection | `grep -nE "computeSourceFingerprint\|projectTranslatableContent" src/core/domain/auto-translate/hasSourceContentChanged.ts` | no match |
| AC8 | R6 | The gate and provenance reach the same verdict on a save, including one that edits only inside an embedded block | `bunx vitest run src/__tests__/translation-path/theGateAgreesWithProvenance.test.ts` | exit 0, and red before the fix |
| AC9 | R7 | The orphaned units are gone and nothing imports them | `grep -rn "computeSourceFingerprint\|everyTranslatableLeaf\|computeFieldFingerprints(" src --include="*.ts"` | no match |
| AC10 | — | No new type errors | `bun run check-types` | exit 0 |
| AC11 | — | Analyzer findings do not rise | `bunx oxlint .` | at most 33 warnings, 0 errors |
| AC12 | — | The whole suite still passes | `bunx vitest run` | 0 failed |
| AC13 | — | The sandbox still boots and translates against the built package | from `apps/dev`: `bun run test:integration:sqlite` | 248 passed, 7 skipped |

## Pre-flight

Run against the untouched tree at `f46011fa`.

| AC | Command | Result | Classification |
| --- | --- | --- | --- |
| AC1–AC4 | the suite above | no such file | change — fails now, correctly; each case is written red against the current hash before anything is fixed |
| AC5 | the baseline assertion | no such file; the baseline is recorded from the current implementation before it is altered | invariant — it cannot be captured after the change, so it is captured first |
| AC6 | the gate case | no such case | change — fails now, correctly: this is the reported defect |
| AC7 | the grep above | 3 hits in the gate | change — fails now, correctly |
| AC8 | the suite above | no such file | change — fails now, correctly |
| AC9 | the grep above | definitions present | change — fails now, correctly |
| AC10 | `bun run check-types` | exit 0 | invariant — passes now |
| AC11 | `bunx oxlint .` | 33 warnings, 0 errors | invariant — passes now |
| AC12 | `bunx vitest run` | 222 files, 2576 passed, 9 skipped | invariant — passes now |
| AC13 | the sandbox suite | 62 files, 248 passed, 7 skipped | invariant — passes now |

## Risk notes

- **The failure is silent in both directions.** Get the no-crossing branch wrong and every document
  in every locale reads out of date at once; get the crossed branch wrong and a real edit is never
  noticed. Neither throws. AC5's frozen baseline is the only mechanical guard on the first, and it
  has to be recorded before the implementation is touched or it cannot be recorded at all.
- **Fields with embedded blocks go stale once, deliberately.** Their hash changes by design. Those
  same documents already go stale once from the walk swap, which is not yet released, so doing this
  now costs one staleness event rather than two. That is the reason this is not deferred.
- **The gate's hash is never stored**, so moving it carries no migration of its own.
- **A block without an id** is addressed by position, so reordering such a block still changes the
  hash. Unchanged from the previous hasher; recorded, not fixed.

## Resolved during implementation

- R6 first read "the gate joins the existing agreement check as a fifth reader of an address". On
  contact with the code that check compares sets of addresses, and the gate offers a verdict rather
  than addresses — the addresses behind its answer are the keys of the very measurement provenance
  reads, so a fifth row would have compared one function with itself and passed whatever happened.
  The requirement is unchanged in substance and the check now compares the two verdicts, which is
  what can actually fail.

## Decisions by the owner

- 2026-11-12 — a change of content is the only thing that counts as a change; reordering embedded
  blocks is not one.
- 2026-11-12 — combine hashes rather than text, so that the boundary between a field's own text and
  what was found inside it cannot be imitated by the text itself.
- 2026-11-12 — the orphaned units go now rather than later, the branch being the right moment.
