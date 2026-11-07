# The language does not write

Amends: [2026-11-06-the-crossing-surface.design.md](./2026-11-06-the-crossing-surface.design.md)
(decisions D2 and D3), on findings 1 and the write-ownership question of
[its seam trace](./2026-11-06-the-crossing-surface.seam-trace.md).

Two changes, in order, each its own commit.

## Requirements / Task restatement

**A — a crossing entry is never handed the means to write.** `payloadFieldsLanguage.boundary`
builds `setValue = (next) => { cursor.data[name] = next }` and passes it to every entry *together
with* the question "is this your format?". Nothing says when an entry may call it. An entry that
assigns before it decides, then answers `null`, has already replaced the target's value — while the
caller's own assumption is that an entry answering `null` wrote nothing. The seam trace's finding 1
walks it with values: the German `body` ends up holding the English source, the previous translation
is gone, and the only signal is a report that says no text was found. The shipped entry happens to
use the safe order; the convention permits the other, and the design deliberately opens the door to
entries this package does not write.

**B — a language computes the write; the caller performs it.** `Step.setValue` and `TextUnit.write`
are closures a language calls, so a language mutates. A language is traversal policy; mutation
belongs to the caller.

Out of scope, named so they are not drifted into: the per-field declaration and its `custom` key;
a crossing entry carrying its language id; the rename to Payload's Lexical; the unified embed
resolver; container-mode units for the shipped rich-text language; source-tree-versus-target-tree
semantics.

## What already exists — platform · installed · project · verdict

Nothing is installed for this. `Reflect.set(target, key, value)` is the platform answer to "assign a
named slot on an object whose type has no index signature" — `lib.es2015.reflect.d.ts` types it
`(target: object, propertyKey: PropertyKey, value: any) => boolean`, which is what lets a slot hold
a typed node without a cast. The project's own precedent for "return the decision, let the caller
act" is the `Step` union itself: a language already answers *what a node is* and the kernel acts on
the answer. B extends that to writing.

The container unit in `__tests__/fixtures/prosemirror.ts` is the constraint that shapes B: it answers
one translated string and distributes it across many child nodes through `writeMarks`, honouring
marks. A plain slot cannot express that, and the same shape is what the shipped language's container
mode will need.

## Decisions

**D1 — an accepted entry returns what to seat; it is not given a way to write.** `ContentOffer`
loses `setValue`. An entry answers `OpenedCrossing = { crossing, seat }`, and the caller assigns.
Rejected: keep `setValue` and document the order — prose cannot bind an entry this package does not
write, which is exactly the case the design admits. Rejected: split the question into `recognises`
then `open` — two predicates over one input, the shape the package was already burned by when
`selects` and `boundary` both answered part of "is this mine" and neither owned the gap between
them.

**D2 — `seat` is optional, and an absent one seats nothing.** ~~Required, because every entry that
exists seats something.~~ Reversed under review: `seat: unknown` required does not forbid
`undefined`, and the host assigned it unconditionally — so the one spelling available to a format
with nothing to seat silently wiped the field. Optional with a skip removes that state. The
speculative-optionality objection loses to a type that admits a destructive answer.

**D3 — a slot is `{ holder: object; key: string | number }`, applied with `Reflect.set`.** The
alternative, `holder: Record<string, unknown> | unknown[]`, cannot hold the fixture's
`Piece = { text?: string }`: a type with named members and no index signature is not assignable to a
`Record`, so it would need the cast the owner's rules forbid. `Reflect.set` takes `object` and
assigns uniformly to objects and arrays, so one shape covers every holder in the population — a
Lexical text node, a Payload data object, an array element in the crossing test's language.

**D6 — a refused write is reported, not swallowed.** `Reflect.set` answers `false` where a plain
assignment would have thrown — a frozen holder, a getter-only member — so the change as first built
lost a translation silently. It now throws `WriteRefusedError`, a sibling of the walk's other error
classes, which is what the package's own "every throw constructs one of ours" test demanded when a
bare `TypeError` was tried first. Measured, not assumed: on a frozen holder `Reflect.set` returns
`false` and leaves the value, while `holder[key] = value` throws `TypeError` in strict ESM.

**D7 — the crossing gate is weaker than the translatability rule, and now says so.** The predicate
is named `isOfferable`, not `isTranslationPermitted`: it omits the field-type rule deliberately,
because which formats a value may be handed to belongs to the crossing list and not to the field
type. Three reviewers independently read the old name as the full rule and reported the omission as
a regression. It is not one — it is the decision taken when the crossing list landed — but it was
carried by neither a name nor a test. Both now exist.

**D4 — a unit answers `resolve(translated) => SlotWrite[]`, pure.** Rejected: a bare `slot` on the
unit — the container case distributes one answer across many nodes, proved by `writeMarks`.
Rejected: keep `write` on the unit — the whole point. `resolve` computes and returns; the kernel
performs.

**D5 — the slots stay inside the kernel.** `TranslationTarget` keeps `write`, and `collect.ts`
builds that closure from the unit's `resolve`, applying each pair with `Reflect.set`. The principle
holds — no language assigns — while the walk's result type, which the swap will be built on, does
not move. Rejected: carrying `resolve` out on `TranslationTarget` so a caller can inspect the writes
before performing them. It is the more honest shape and it reshapes the one type the next body of
work depends on, for an inspection nobody has asked for; the optionality can be added later with the
caller that needs it.

**Placement.** `Slot`, `SlotWrite` and the reshaped `Step`/`TextUnit`/`TranslationTarget` in
`core/traversal/contract.ts`; the single assignment in `core/traversal/collect.ts`; `ContentOffer`
and `OpenedCrossing` in `languages/contentCrossing.ts`. No module moves, no file is created.

**New surface.** `Slot` and `SlotWrite` — callers: `collect.ts` and all six language
implementations (two shipped, four fixtures). `OpenedCrossing` — callers: `lexicalContent`, the
host's `boundary` loop, and `noteContent` in the crossing test.

**Shape check.** Fired on three triggers: a field added to a type implemented outside this file
(`Step`, `TextUnit`), a new optional field (`seat`, resolved to required by D2), and two fields
always set together (`slot` + `value`, named as `SlotWrite` rather than spread). Two shapes were
compared for the slot and are recorded as D3. The next holder kind costs nothing — `Reflect.set`
already takes any object. The types admit no state the system does not produce: `seat` is required,
and `SlotWrite` has no partial form.

**Written contract.** Yes, and it is what the tests are written from, before the implementations are
touched: `resolve` must be **pure** — it returns the writes and performs none — and a `Slot.holder`
must be an object that is reachable in the tree the walk will hand back, because a slot into a
detached copy writes nowhere. Neither can be stated in a signature.

**Escalate?** No. The design was decided and traced; these are the two amendments its own trace
asked for, ordered by the owner.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | A | A crossing entry has no way to write | `grep -c "setValue" src/languages/contentCrossing.ts` | prints `0` |
| AC2 | A | An entry that declines cannot have changed the target | a test with two entries: the first clones and answers `null`, the second does not recognise; the field's stored value is the same object it was before the walk | exit 0, the case runs |
| AC3 | A | What the accepted entry asked to seat is what the walk descends into and writes back to | the existing crossing test and both differential suites, unchanged | exit 0, same case count |
| AC4 | B | The kernel hands a language no way to write: no `setValue` on a step, no `write` on a unit | `grep -c "setValue" src/core/traversal/contract.ts` | prints `0` |
| AC4b | B | A unit answers with writes to perform instead | `grep -c "resolve:" src/core/traversal/contract.ts` | prints `1` |
| AC5 | B | No language assigns during a walk | a test calling a language's `resolve` directly and asserting the tree is untouched until `applyTranslations` runs | exit 0, the case runs |
| AC6 | B | A container unit still distributes one answer across several nodes, marks honoured | `bunx vitest run src/core/traversal/__tests__/richText.granularity.test.ts` | 4 passed, as before |
| AC7 | B | A reply that is not entirely marks still writes nothing at all | the existing refusal case in the granularity suite | exit 0, the case runs |
| AC8 | — | The kernel's fixtures still exercise their cases | `bunx vitest run src/core/traversal` | same file and test counts as the pre-flight, plus the new cases |
| AC9 | — | Nothing already passing breaks | `bunx vitest run` | 211 files or more, no failures |
| AC10 | — | No new type errors | `bun run check-types` | exit 0 |
| AC11 | — | No new lint findings | `bunx oxlint .` | 34 warnings, 0 errors |
| AC12 | — | Both apps still type-check | `bunx turbo run check-types --force` from the repo root | 9/9 |
| AC13 | B | A position that refuses the write is reported | a test writing into a frozen holder | throws `WriteRefusedError`, the value unchanged |
| AC14 | A | An accepted crossing that seats nothing leaves the value alone | a test whose entry returns a crossing with no `seat` | exit 0, the stored object is the one it was |
| AC15 | A | A field of a type the package does not translate is still offered, when a format claims its value | a test with a localized `json` field holding a Lexical-shaped value | the value is crossed and translated |

## Pre-flight

Run against the untouched tree.

| AC | Command | Result | Kind |
|---|---|---|---|
| AC1 | the grep above | prints `2` | change — must fail now, and does |
| AC4 | the grep above | prints `3` | change — must fail now, and does |
| AC4b | the grep above | prints `0` | change — must fail now, and does |
| AC6 | the vitest run above | 1 file, 4 passed | invariant — passes now |
| AC9 | `bunx vitest run` | 211 files, 2586 passed, 9 skipped | invariant — passes now |
| AC10 | `bun run check-types` | exit 0 | invariant — passes now |
| AC11 | `bunx oxlint .` | 34 warnings, 0 errors | invariant — passes now |
| AC12 | `bunx turbo run check-types --force` | 9/9 | invariant — passes now |

AC2 and AC5 have no command until their tests exist; both are written red first, against the
untouched implementations, and their red output is the evidence.

## Risk notes

- **B touches the kernel contract, which the design called untouchable.** That framing is reversed
  here on the owner's instruction, and the reversal is recorded in the design doc rather than left
  implicit.
- **A slot write loses a type guard the closures carry.** Today `setValue` checks
  `typeof value === "string"` before assigning. `applyTranslations` only ever writes the strings it
  was handed and skips `undefined`, so nothing depends on the guard — but it is a real reduction in
  defensiveness and is recorded rather than dropped quietly.
- **Six implementations change at once**, four of them the kernel's own coverage. The guard against
  silently reducing what they exercise is AC8 comparing counts, not a reading of the diff.
- **`Reflect.set` returns a boolean nobody reads.** On a plain object it cannot fail; on a frozen
  one it would, silently. Nothing in the walk freezes, and a failed write would surface as an
  untranslated value, which AC5's test does not cover.

## Review

Three reviewers, one per angle, on the finished code. Eight findings; three converged across all
three readers and were fixed (the refused write, the `seat` wipe, the unnamed gate widening), one
was a fair hit on a test that had become vacuous, and four are recorded below rather than fixed.

**Recorded, not fixed.**

- *The host still assigns during a walk.* `boundary` seats before the kernel enters the crossing, so
  a throw from `enter` or the depth cap leaves the seat behind. The whole collect aborts in that
  case, so nothing reads it. Removing this last write means teaching the kernel what a seat is,
  which is a further contract change and not this task's.
- *`seat` and the crossing's own context can diverge.* Keeping them the same object is a stated
  convention the types cannot enforce; the shipped format and the test format both honour it. Making
  it structural needs the format to return one value the host derives both from, which reshapes the
  convention.
- *An entry can still mutate `offer.value`.* It is the host's live object. The claim the change
  delivers is "an entry is handed no writer", not "an entry cannot reach anything"; the docblocks
  were corrected to say only the former.
- *`parseMarks` accepts gapped mark ids*, so a reply with ids 1, 2 and 5 over three pieces writes two
  of them while its docblock says a reply that is not entirely marks is refused whole. Unchanged by
  this task, and the file is the kernel's own coverage, which this task may not alter the reach of.

## Decisions by the owner

- 2026-11-06 — the kernel contract may be edited for change B; a language must not mutate.
- 2026-11-06 — A and B land as two separate commits, riding with the current task.
- 2026-11-06 — the slots stay inside the kernel: `TranslationTarget` keeps `write`, built from the
  unit's `resolve`, so nothing outside `core/traversal/` changes shape (D5).
- 2026-11-06 — the `typeof value === "string"` guard the closures carry is dropped rather than moved:
  `applyTranslations` writes only the strings it was handed, so the guard is a branch no test can
  reach. Noted by two reviewers as the one thing the kernel no longer refuses from a third-party
  language; left as decided.
