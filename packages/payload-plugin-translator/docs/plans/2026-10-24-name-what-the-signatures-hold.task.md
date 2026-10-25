# Name what the signatures hold

**Status:** approved at the gate, 2026-10-24 · **Risk:** high
**Branch:** `feat/translator-fields-not-a-strategy`, alongside the uncommitted work
**Upstream:** the twelve audit runs of 2026-10-24 (notes in the session scratchpad). Those notes
predate the id scheme, so the plan gate does not apply to them; their counts are adopted as read.

## Requirements / Task restatement

Four audits of the translator converged on one complaint from three directions, and the owner
raised it himself against `NarrowSelection`: **a signature of `readonly string[]` does not say what
the strings are.** Three different meanings travel the plugin as bare strings — a leaf address, a
locale code, a rule name — and in several places a comment exists only to say which.

Two smaller findings ride along: a handful of barrel exports nobody imports, and one stored column
whose type is wider than any writer.

## What already exists — platform · installed · project · verdict

| Need | What already does it |
|---|---|
| a branded address type | `IdPath` (`core/domain/content-projection/idPath.ts:22`), minted by `makeIdPath` and `joinRendered` |
| a named locale code | `LocaleCode` (`payload-jobs-runner/store/types.ts`), added earlier today and not yet spread |
| a home for locale utilities | `core/domain/locales/`, a namespace barrel whose own docblock names the two features that today reach into `modules/auto-translate/` instead |
| the barrel rule | `packages/payload-plugin-translator/CLAUDE.md`, "What goes into any other `index.ts`" — mechanical, no judgement needed |

**Nothing new is built** beyond two type aliases. No dependency, no file, no seam.

## The decisive constraint, found in Phase 1

**There is no way to mint an `IdPath` from a string that arrived from outside.** `makeIdPath` takes
structural segments; `joinRendered` takes already-rendered ones; `namesAPosition` only *inspects* a
string. A `leaves` filter's addresses arrive over HTTP as plain strings and are checked for shape,
never parsed back into the grammar — `idPath.ts`'s own docblock says so: "re-entering the grammar
from such an address costs a cast, and a cast is not checked."

So branding the chain end to end needs one of two things the owner's rules push against: a cast at
the request boundary, or a new parser. That is what makes the alias the option that fits **today**,
and it is the reason this goes to the gate rather than being chosen here.

## Decisions

**D1 — `LeafAddress` and `RuleName` as aliases in `core/domain/selection/`, `LocaleCode` spread from
where it already is. Settled by the owner at the gate.**
*Rejected: a type the compiler checks, built on `IdPath`.* It would catch a list of locale codes
passed where addresses are wanted, which an alias cannot. It is not reachable from here: an address
arriving in a request is a plain string, and nothing can turn one into an `IdPath` — `makeIdPath`
takes parsed segments, `joinRendered` takes escaped ones, `namesAPosition` only inspects. Reaching it
needs either an assertion at the request boundary, which the owner forbids, or a parser that does not
exist yet. **Recorded as the next step, with the parser first.**
*Rejected: do nothing and keep the explaining comments.* Three audits independently filed the same
finding, and two of the comments they want deleted exist only to patch it.

**D2 — each alias lives where its meaning is already declared, not both in one place.**
`LeafAddress` goes beside `IdPath` in `core/domain/content-projection/idPath.ts`: that file already
owns the address grammar, and `everyTranslatableLeaf` one folder over already produces address
lists. `RuleName` goes in `core/domain/selection/TranslationFilter.ts`, which is where a rule name
enters the system and the only place it is parsed.
*Rejected: both in `core/domain/selection/`* — the first shape this contract proposed. It would make
`content-projection` and `provenance` import the address type from `selection/`, although neither
has anything to do with filters, and `provenance/staleness.ts` already imports from
`content-projection`. Corrected on contact with the code, before any edit.

**D3 — `extractLocaleCodes` and `LocalizationLike` move to `core/domain/locales/`.**
*Rejected: leave them and delete the comment that excuses the placement.* Two features that have
nothing to do with automatic translation import from `modules/auto-translate/` today; the comment is
holding a misplacement in position. The destination already exists and already names these callers.
Call sites become `Locales.knownCodes(...)`, matching `Locales.dedupe(...)` beside them.

**D4 — the five unused barrel exports are deleted, not kept for a future caller.** `CLAUDE.md`:
"adding a name later is not a breaking change; removing one is. The cheap direction is to start
narrow." None is reachable from `src/index.ts`, so nothing outside the package can name them.

**D5 — nothing changes. The column keeps `required: true` and the type keeps `| null`.**
*Tried and reverted in Phase 5, after review.* The first answer was to relax the column, reasoning
that the type admits `null` and the column refused it. That was wrong in a way worth recording: the
relaxation only reaches a database built by schema push. A consumer whose database came from the
committed migration still has `source_fingerprint text NOT NULL`, and after the change Payload would
*accept* a null row and the insert would then fail against the constraint — a raw driver error in
place of a validation one. Shipping it would have needed a migration this task never planned.
The asymmetry is real but harmless: the readers produce `null` (`parseSourceFingerprint` on an empty
column), the writers never do (`record` and `rebaseSourceFingerprint` both write a map). One type
serves both directions, which is the actual shape question, and it is not this task's.

### Placement

| Piece | Lands in | Why there |
|---|---|---|
| `LeafAddress`, `RuleName` | `core/domain/selection/TranslationFilter.ts` | where both meanings are already declared and parsed |
| `LocaleCode` | stays in `payload-jobs-runner/store/types.ts`, re-exported where used | it is already there; moving it is a second decision nobody needs |
| `knownCodes`, `LocalizationLike` | `core/domain/locales/resolveLocales.ts` | the barrel's own docblock names the callers |

### New surface — the shape check

Triggers fired: **an exported function gains a parameter** — no; **a field is added to a published
type** — no. None fired. Two type aliases are added and no shape changes: `type LeafAddress = string`
is assignable both ways, so no call site and no test changes.

| | aliases (chosen) | brand (`IdPath`) end to end |
|---|---|---|
| cost of the next meaning | 1 — one more alias | 1 alias + a parser for the boundary |
| states admitted / produced | unchanged — an alias is the same type | would fall: a string could not be passed where an address is wanted |
| second caller already present | 13 signatures | the same 13 |
| breaks outside this repo | nothing — none of these is published | nothing |

The brand wins on the second row and loses on the first, and the first is the one that is blocked
today. **Chosen: aliases now, brand recorded as the next step.**

### Written contract

None of the three aliases owes callers anything a signature cannot state — that is the whole point
of adding them. No `/sp-red-test` path.

### Escalate to `/sp-architect`?

No. Two aliases, one file move inside the package, four deletions.

## Acceptance Criteria

Run from `packages/payload-plugin-translator` unless stated.

| AC | Criterion | How it is checked | Passes when |
|---|---|---|---|
| AC1 | No signature outside tests and the client carries a bare list of leaf addresses | `grep -rn "readonly string\[\]\|: string\[\]" src --include="*.ts" \| grep -v "__tests__\|\.test\.\|client/" \| grep -icE "selection\|addresses\|leaves\|vouched\|changed\|drifted\|moved"` | 0 |
| AC2 | The two look-alike helpers no longer declare the same return type | read `TranslationFilter.ts`; `grep -n "NamedBy" src/core/domain/selection/TranslationFilter.ts` | one returns `LeafAddress[]`, the other `RuleName[]` |
| AC3 | No feature imports a locale utility from the auto-translate module | `grep -rn "modules/auto-translate" src/server/features --include="*.ts"` | no hit |
| AC4 | The locale utility answers from its new home | `bunx vitest run src/core/domain/locales src/server/features/enqueue-translation src/server/features/translate-field` | green |
| AC5 | No barrel exports a name nobody imports | for each of the five, a grep for importers outside the defining file | 0 importers, 0 exports |
| AC6 | The sidecar column and the receipt type are left exactly as they were — see D5 | `git diff -- src/server/modules/provenance/Provenance.collection.ts src/core/domain/provenance/ProvenanceStore.interface.ts` for the `sourceFingerprint` lines | neither line is in the diff |
| AC8 | One shared double replaces the hand-rolled `ProvenanceStore` stubs | `grep -rln "deleteByDocument:" src --include="*.ts" \| grep -cE "test\|__tests__"` | 2 — the fixture, and the one stateful store that is not a stub |
| AC9 | Every verdict of the four comment audits has an outcome | the Phase 5 report lists each as applied or declined-with-reason | applied + declined = 199 |
| AC10 | The prose the audits called surplus is gone | count comment lines over the four audited file sets | below 913, with the per-stage split reported |
| AC7 | Nothing else moves | `bunx vitest run` · `bun run check-types` · `bunx oxlint .` · `bunx turbo run build --filter='./packages/payload-plugin-translator'` from the root · `bun run test:integration` from `apps/dev` after the build | ≥190 files / ≥2503 checks, 0 type errors, ≤43 warnings and 0 errors, build green, 56 integration files green |

## Pre-flight — each check run against the current branch

| AC | Result now | Classification |
|---|---|---|
| AC1 | **13 hits** | **change** |
| AC2 | both helpers declare `(filters) => string[]` | **change** |
| AC3 | 2 hits: `enqueue-translation/handler.ts:9`, `translate-field/handler.ts:6` | **change** |
| AC4 | the suites pass against the current home | **invariant** |
| AC5 | 5 exports, 0 importers each | **change** |
| AC6 | the column says `required: true`, the type says `SourceFingerprint \| null` | **withdrawn** |
| AC7 | 190 files / 2503 checks, 0 type errors, 43 warnings, build green, 56 integration files | **invariant** |
| AC8 | 10 hand-rolled doubles, no shared fixture | **change** — nine convert; `dismissalWritesTheReceipt.test.ts` keeps its own, because it is a store that *remembers* what was written and reads it back, which is the thing those checks are about. A spy with default answers cannot stand in for it |
| AC9 | 199 verdicts, 0 outcomes recorded | **change** |
| AC10 | 913 comment lines over 3014 code lines across the four sets (247/214/213/239) | **change** |

## Risk notes

1. **AC1 touches 13 signatures across `core/` and `server/`.** An alias is assignable in both
   directions, so the compiler cannot tell a missed site from a converted one — which is why AC1 is
   a count rather than a build result.
2. **The locale utility move changes an import path two features depend on**, and the destination is
   a namespace barrel, so the call style changes with it.
3. **Deleting a barrel export is irreversible for a consumer who found it anyway.** None is reachable
   from `src/index.ts`; that was checked rather than assumed.
4. The column change alters the sidecar's declared schema. It makes a column *less* strict, so a
   schema push has nothing to destroy — unlike the removal shipped earlier today.

## Scope — the whole list, by the owner's decision

Taken: all six open findings. The owner's words at the gate: "Брать за раз — ВСЁ. Я не хочу
возвращаться к этому потом." So the two items this contract had proposed to defer are in:
the shared test double (AC8) and the four audits' comment verdicts (AC9, AC10).

Still out, and still only recorded: `/field` and `/enqueue` narrow a run by two unrelated
mechanisms — open in `docs/plans/2026-10-18-the-rewiring.md`.

## Human choices

Settled by the owner, 2026-10-24:

- **Names only, not a checked type.** "Давай дадим пока что только имена таким аргументам. И на этом
  всё." The alternative — a type the compiler enforces — is blocked behind a parser that does not
  exist; building it is the next step, not this one.
- **The whole list in one pass**, rather than the four-item scope this contract first proposed.

**One criterion was rewritten because the chosen design cannot meet the one first written.** AC2
originally demanded that swapping the two helpers become a type error. A plain second name for
`string` cannot deliver that — the compiler treats the alias and `string` as the same type, which is
exactly the trade the owner accepted at the gate. The criterion now asks what the design does
deliver: the two helpers stop declaring the same return type, so a reader sees the difference and a
later move to a checked type has somewhere to attach. **The compiler still permits the swap**, and
that is recorded here rather than hidden behind a weaker check that would have read as a pass.

## Risk notes — revised after the gate

The scope grew at the gate, and so did the risk. Beyond the four already recorded above:

5. **The comment work touches about thirty files** that are already part of a large uncommitted
   branch the owner is reading. The diff it produces is wide and almost entirely prose. Mitigation:
   it goes last, after every behavioural change is green, so the two are separable by file.
6. **Replacing ten hand-rolled test doubles with one fixture** means ten test files stop declaring
   what they expect of the port. If the fixture's defaults differ from a local stub's, a test can
   pass for a new reason. Mitigation: the fixture takes per-method overrides, and each converted file
   is run before moving to the next.

## Review log

### 2026-10-24 — three angles; one of them caught a regression this task introduced

| Angle | Verdict |
|---|---|
| the type aliases | no wrong label anywhere, no import cycle, the rename complete. **Five sites left half-labelled** |
| the move, the deletions, the column, the fixture | the move and the fixture clean. **The column relaxation was a regression** |
| what the deleted prose held | **one real fact lost**, one minor; nothing stranded, nothing newly false |

**Introduced here, caught in review, reverted.** Relaxing the sidecar column is recorded in D5
above. The short version: it only takes effect under schema push, and in a migration-managed
database it would have turned a validation refusal into a constraint violation at insert time.

**The labelling was half-done, which is worse than not done.** An alias is assignable both ways, so
a half-labelled path reads as deliberate: a reader seeing `LeafAddress[]` beside `readonly string[]`
assumes the second is something else. Finished at `answerTo`, `emptyBecause.everything`, `Criteria`'s
key, `FieldFingerprints`' key and `FieldChunkCollector`'s selection set.

**A lost fact, restored as prose rather than as a test.** The chain assembly in `plugin.ts` had
carried the reason provenance must run first — the staleness route re-hashes the stored source, so a
fingerprint taken after another module replaced `sourceData` would never match. The owner's standing
rule prefers a test to a sentence, and the review suggested one; there is no seam in
`translatorPlugin` to observe the assembled chain, and inventing one to hold a comment would cost
more than it saves. The sentence is back and the reason is recorded here. `alreadyCovered` likewise
got back the clause saying a failed attempt still counts as covered.

**Two things this task did not do, named rather than implied.**
- **A locale code is still a bare `string`** everywhere outside `payload-jobs-runner/store/types.ts`,
  where `LocaleCode` was added earlier the same day. It is the third meaning the audits named and no
  criterion here covers it.
- **The ~199 comment verdicts were applied in part, not in whole.** Comment lines over the four
  audited file sets went 913 → ~800. What was applied: every verdict that removed a false, stale,
  misplaced or duplicated statement, and the deletions where a block restated the symbol below it.
  What was not: most of the shortenings of blocks that are merely long. Each would be a judgement
  call on prose nobody has challenged, and the diff is already wide.

### Checks

| | |
|---|---|
| `bunx vitest run` | 190 files / 2503 checks, green |
| `bun run check-types` (package and `apps/dev`) | 0 errors |
| `bunx oxlint .` | 43 warnings, 0 errors — the baseline |
| `bunx turbo run build` | green |
| `bun run test:integration` | 56 files / 225 checks, 8 skipped |
| `sp-lint-delta` | `mode=two-run`, nothing introduced |
| `sp-diff-checks` | two test-integrity rows, both from earlier passes on this branch |

### A slip worth recording

The `filteredData` → `reconciledData` rename appeared to run and had not: `sed -i '' 's/\bfoo\b/.../'`
is a silent no-op on macOS, whose `sed` does not know `\b`. The regression sweep caught it because it
counted survivors rather than trusting the command's exit status. The rename was redone in Python and
verified by count.
