# The world, and its first two readers

Build step: 2026-11-20-the-host-config-becomes-our-rules.design.md #1

## Requirements / Task restatement

Four files in non-test source produce the arguments that decide which version of a
document Payload answers with. Two of them — `sourceDocument.ts:7` and
`localesHoldingContent.ts:8` — declare the identical constant independently, and neither
takes it from anywhere: the nine callers of those two readers pass only a payload handle
and a collection slug, so the choice of layer is made inside the reader and is invisible
to the code that asked.

This step builds the entry that owns the choice and moves those two readers onto it. The
other two producers (`targetDocument.ts`, `targetLayer.ts`) move in the following steps
and are **out of scope here**.

What lands: the world taxonomy and its rules table in the payload-free core; the detection
adapter and the one place the plugin's tokens become Payload arguments, in the server
layer; the two readers taking a minted read instead of declaring one.

**No behaviour changes.** Every argument reaching Payload is byte-identical afterwards.

Also carried, because they sit in a file this step rewrites: three renames a comment
review left pending for `localesHoldingContent.ts`. The other twenty-two pending renames
are deliberately **not** here — this step's whole verification is "the arguments did not
move", and unrelated renames in other files would hide a regression in noise.

Covers R1, R2 and R3 of the design.

## What already exists — platform · installed · project · verdict

- **Installed.** Payload exports `hasDraftsEnabled` and `hasAutosaveEnabled`, which
  interpret the several shapes `versions` may take (`true`, `false`, an object, absent).
  They are used rather than re-implemented. Payload also ignores a latest-version ask on a
  collection without drafts — `collections/operations/findByID.js:173` guards the draft
  replacement — so one set of read arguments is correct in both worlds and the no-drafts
  row needs no separate spelling.
- **Project.** The device that makes a value unforgeable already exists, in one of the
  files this work is about: `targetDocument.ts:31-39` mints a type keyed by a symbol its
  module never exports, "so unlike a string brand no literal can name it". The union that
  makes an illegal combination unbuildable exists twice — `targetLayer.ts:25-34` and
  `targetDocument.ts:44,50`. Each core domain folder carries an `index.ts`.
- **Verdict.** Nothing is invented. Two modules are added and two existing devices are
  applied.

## Decisions

- **The readers take the read; they do not resolve it.** *Chosen:* the version arguments
  arrive as a parameter, so the caller names the layer. *Lost:* each reader resolving the
  world itself from the registered config — zero call-site changes today, which is
  genuinely cheaper now. *Constraint:* the design that governs runs says the run carries
  its intent and the run decides whether it reads the latest or the published version. A
  reader that picks the layer itself would have to be unpicked in the two steps that
  follow. Nine call sites change in this step so that they do not change twice.
- **The arguments are branded, and the limit is recorded.** *Chosen:* the minted type is
  keyed by a module-private symbol, so a hand-typed object cannot be passed to either
  reader. *Lost:* an unbranded parameter — rejected because the regression this step most
  invites is someone "simplifying" a reader by inlining the arguments again, and that is
  exactly what the brand refuses. *Named limit, not claimed away:* a newly written direct
  Payload call elsewhere still compiles, because Payload's own signature takes a plain
  object. The brand binds the readers, not the whole package.
- **The core names no Payload argument.** *Chosen:* rule answers are closed unions of the
  plugin's own tokens; the token becomes an argument only in the server adapter.
  *Lost:* holding the arguments in the core table, which reads better in one file.
  *Constraint:* the core's payload-free promise is enforced by import checks only, so a
  literal placed there would pass every check the codebase owns.
- **The rules table is not built in this step; the supported-world table is.** *Chosen:* ship the
  two-row supported-world table with its proof paths, and let the world union carry the read rules.
  *Lost:* the subject-by-world rules table the design names for this step. *Constraint:* this step has
  exactly two read subjects, and both worlds answer them identically — the latest version is read the
  same way whether or not a published layer exists. What differs is only *which question a world can be
  asked*, which the union already states by giving the published read to one variant and not the other.
  A table whose every cell holds the same answer restates the union in a second place, and the design's
  own rule admits only subjects whose answers differ. The table arrives in the step that adds the write
  and publish subjects, where the answers do differ.
- **The field-path alias is declared where it is used.** *Chosen:* beside the query that
  needs it, in the server layer. *Lost:* the wire primitives — rejected on placement: the
  wire contracts carry what crosses to the client, and a database field path never does.
  *Constraint:* the wire module's zone permits imports only between wire files.

**Placement.** `src/core/domain/world/` — the kinds, the switches, the resolver, the
supported table with its proofs, the subject union and the rules table, with the folder's
`index.ts` as the convention requires. `src/server/shared/payload/worldOfCollection.ts` —
detection through Payload's own predicates, the token-to-argument map, and the mint.

**New surface.** The world module (callers: the two readers in this step, and the
auto-translate hook, which asks the same question today at `AutoTranslateEnqueue.hook.ts:70`)
and the adapter (callers: the two readers, and the nine call sites that now name a layer).
The shape check fired on the readers' parameter lists and is answered by the brand.

**Written contract?** Yes — the mint owes callers that nothing else can produce its type.
**Escalate?** No; the design that covers this step is settled and gated.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R1 | Neither of the two readers produces version arguments; the producers in non-test source drop from four to two | `grep -rln "draft: true" src` excluding tests | the two moved readers are absent from the list |
| AC2 | R1 | A hand-typed argument object cannot be passed to either reader | plant one at each reader, run `bun run check-types`, revert, quote both outputs | red with the plant, green without |
| AC3 | R2 | Every rule subject is answered by both worlds, or declared as belonging to one | `bun run check-types` with a cell removed, then restored | **dropped** — the decision above removes the rules table from this step, so the criterion has no subject here; it moves with the table |
| AC4 | R3 | The published-version ask does not exist on the world without a published layer | a type-level case in the world's own test, plus the plant in AC2 | exit 0, the case runs |
| AC5 | — | The arguments reaching Payload are byte-identical | `bunx vitest run src/server/shared/payload src/server/modules/translation-stub` | exit 0, the existing argument assertions run unchanged |
| AC6 | — | No type errors | `bun run check-types` | 0 errors |
| AC7 | — | The analyzer does not regress | `bunx oxlint .` | 0 errors, warnings at or below 26 |
| AC8 | — | The unit suite stays green at its recorded counts | `bunx vitest run` | 2980 passed and 15 skipped, plus only the cases this step adds |
| AC9 | — | A real boot still answers as before | from `apps/dev`: `bun run test:integration:sqlite` | 278 passed, 2 expected failures, 7 skipped |
| AC10 | — | The three renames leave no reference to an old name | `grep -rn` per old name over `src` | 0 hits for each |

## Pre-flight

Each check run against the untouched tree at the commit this work starts from.

- **AC1** — four files produce the arguments today: `targetDocument.ts`, `targetLayer.ts`,
  `sourceDocument.ts`, `localesHoldingContent.ts`. *change* — fails now, as it must. Two of
  the four are out of scope and stay.
- **AC2, AC3, AC4** — not runnable before the types exist. *change* — the plant is the
  proof and is run in the build phase.
- **AC5** — the argument assertions exist today at
  `shared/payload/__tests__/localesHoldingContent.test.ts:42-43` and
  `translation-stub/__tests__/translationStub.test.ts:215`. *invariant* — passes now, and
  is the behaviour baseline this step must not move.
- **AC6** — `bun run check-types`: 0 errors. *invariant* — passes now.
- **AC7** — `bunx oxlint .`: 26 warnings, 0 errors. *invariant* — passes now.
- **AC8** — `bunx vitest run`: 264 files, **2980** passed, 15 skipped. *invariant* — passes now. An
  earlier note in this work recorded 2974; that figure was read from the working tree before the
  commit this task starts from, and the commit carried in a test file measured by nobody. The
  baseline above is read at the starting commit itself and is the one this task is graded against.
- **AC9** — `bun run test:integration:sqlite`: 71 files passed and 4 skipped; 278 passed, 2
  expected failures, 7 skipped. *invariant* — passes now. The two expected failures are the
  recorded probe for a defect this work does not yet fix.
- **AC10** — the old names are present today: the content-map type in 2 files, the id field
  and the bare path type in the query. *change* — fails now, as it must.

## Risk notes

- **Classified high.** Nine call sites gain a parameter, and the step promises that nothing
  reaching Payload moved. The promise is only as good as the two argument assertions named
  in the pre-flight, which is why they are criteria rather than background.
- **The brand's limit is recorded rather than claimed away.** It binds the two readers. A
  new direct Payload call written elsewhere still compiles; no mechanical cure for that
  exists in this codebase.
- **The rules table must say in a line that a world differing in what "published" means is
  a refusal, not a new row.** Without it a later reader adds a row where a refusal belongs.
- **A second session edits this tree.** It is checked before each edit; anything that
  appears and is not this work is reported, not merged into it.

## Decisions by the owner

- 2026-11-20 — build on the branch that carries the admin work rather than a branch of its
  own, accepting that the two pieces then ship together.
- 2026-11-20 — the selection criterion for the design was that the answer must be simple,
  judged by counting what it removes; the decision taken on that basis adds one file and
  removes twelve decision sites.
- 2026-11-20 — of the pending renames from the comment review, only the three inside the
  file this step rewrites are carried here; the rest wait for a pass of their own.
