# The walk does not write

Closes the write-ownership hazard recorded by
[the crossing surface's seam trace](./2026-11-06-the-crossing-surface.seam-trace.md), left open by
[the previous step](./2026-11-06-the-language-does-not-write.task.md).

A walk that is only asked to *find* text must not change the document it reads. Today it does: a
host hands a rich-text value to the format that claims it, and stores that format's working copy
over the field's value **while the walk is still running** — before the receiving language has been
entered, and whether or not any translation will ever be applied.

This is the last writer left inside a walk. Two earlier changes removed the others: crossings became
a list each language publishes its own entry for, and a language stopped performing leaf writes
(it now names them and the apply step performs them). The write that seats a crossing's working
copy was left behind, and it is the one that makes reading destructive.

## Requirements / Task restatement

- R1 (in) Collecting translation targets leaves every document it reads byte-identical, including
  when a crossing into another content format is configured.
- R2 (in) The write that puts a crossing's working copy where the host keeps it happens at the
  moment translations are applied, not during the walk.
- R3 (in) A caller cannot apply translations and skip that write; the two arrive and are performed
  together.
- R4 (in) What a receiving language walks and what the host stores are the same object by
  construction, not by two sides agreeing to name the same one.
- R5 (in) A walk that fails part-way — a language that refuses its context, a crossing budget spent
  — leaves the document as it found it.
- R6 (out) Whether a crossing hands over the source tree or the target tree. That is its own
  question and its own change.
- R7 (out) Any change to what text a walk finds, how it is addressed, or how it is cut into units.

## What already exists — platform · installed · project · verdict

- **Project.** `SlotWrite` (`{ slot, value }`) already names a deferred write, and `assignWrites`
  in the collect module already performs a list of them through `Reflect.set`, raising
  `WriteRefusedError` on a holder that refuses. The write this task defers is the same shape, so
  nothing new is needed to express or perform it.
- **Project.** A language that must walk content it was handed, rather than content named in its
  activation context, already has a worked form: the kernel's ProseMirror fixture reads
  `tree ?? value`. D7 follows it rather than inventing a second convention.
- **Platform / installed libraries.** Nothing here is a library's job; no search.

Verdict: no new abstraction. One new result type, because a function that returns two things cannot
return one array.

## Decisions

### D1. The crossing carries the write; nothing performs it during the walk

`Crossing` gains `placement?: SlotWrite` — where the receiving language's content must end up for
the walk's writes to survive. The host's `boundary` builds it and assigns nothing.

- *Rejected — leave it as it is.* It is the defect: a run that only computes source fingerprints,
  which is the other half of what one walk is meant to answer, rewrites the document it is
  measuring.
- *Rejected — the walk performs it as soon as the language has been entered.* It narrows the
  failure window but not the defect: a collection that applies nothing still writes.

### D2. Collection returns the targets and the placements together

`collectTranslationTargets` returns `CollectedContent { targets, placements }`.

- *Rejected — a second exported function that performs the placements.* A caller who forgets it
  gets every translation written into an object nobody saves: a total, silent failure of the
  feature, with a green type-check and a plausible-looking result.
- *Rejected — an `onPlacement` callback in the options.* The same forgetting, and it hands the
  caller responsibility for an ordering it has no reason to know about.

### D3. Applying translations takes the collected result, not a bare list of targets

`applyTranslations(collected, translations)`.

This is what R3 rests on — but on the forgetting, not on the arithmetic. A caller who collects and
applies cannot lose the placements by omission, which is the failure D2 argues against. It is not a
proof: `CollectedContent` is a structural record, so hand-assembling `{ targets, placements: [] }`
still compiles, and the type-level pin can only hold that a bare array is refused. Closing that
would take a brand minted by `collectTranslationTargets` alone, which costs a phantom member and
the ability to build a collection in a fixture, to forbid a state no caller has ever built. Worth
revisiting when the pipeline supplies the first real caller; not now.

- *Rejected — keep `(targets, translations)`.* Then placements can only arrive through a second
  call, which is D2's rejected shape spelled differently.
- Cost: every call site inside this package. None of this surface is re-exported from
  `src/index.ts`, so no consumer promise is broken and no `@since` is owed.

### D4. Placements are performed before the answers

The result does not depend on the order — a placement assigns by reference the very object the
answers write into — so the choice is made on failure behaviour: a placement into a frozen holder
raises before any text has been written, rather than half-way through.

### D5. The name is `placement`

It says what the write does: it puts the content where the host keeps it.

- *Rejected — `seat`.* The owner's own word, withdrawn as unclear.
- *Rejected — `crossingWrites`.* Names where the write came from, not what it accomplishes.
- *Rejected — `replacement`.* Collides with the other replacing this code does, of text by its
  translation.

### D6. A walk's entry places like any other crossing

`CollectOptions.entry` is a plain `Crossing`, and collection seeds the placement list from it.

This reverses the shape first built here, which typed the entry `Omit<Crossing, "placement">` on
the reasoning that nothing offered the entry a value, so there was no position to put one back
into. Review showed the type did not deliver it: `Omit` only rejects an excess property on an
object *literal*, so any variable already typed `Crossing` passed, and its placement was then
dropped without a word — the exact silent drop the decision existed to prevent.

Two ways out: raise on an entry that carries a placement, or honour it. Honouring it is chosen —
nothing offered the entry a value, but the *caller* may well have somewhere to keep the content,
and letting it say so removes the special case rather than guarding it. One rule now holds
everywhere: every crossing's placement is collected, performed only when answers are applied.

- *Rejected — raise on an entry that carries a placement.* A new error, and a rule to remember,
  for something no caller wants to do and that costs nothing to allow.

### D7. A receiving language reads placed content from `enter`'s `value`

The walk passes `crossing.placement?.value ?? value` into `enter`. `lexicalContent` stops naming
the tree a second time inside its context, so the tree the language walks **is** the tree the host
will store — one object, named once. This is R4.

`RichTextContext.tree` stays, and becomes optional, because a rich-text language is also used as a
walk's **entry point**, where nothing crossed in and there is no value to read. That is the case it
is for, and the only one the shipped Lexical language accepts it in: at a crossing the walk always
passes something — the placement's value, or the leaf's own — so a context that also named a tree
would be naming two, which is refused below. A language that resolves the two by precedence
instead can take both, and the kernel's ProseMirror and Lexical fixtures do exactly that, reading
`tree ?? value`; their hosts cross into content they already store and never place.

- *Rejected — `lexicalContent` keeps `tree: working` in its context.* Then the context and the
  placement can name two different trees, and the translated one is the one nobody saves.
- *Rejected — drop `tree` from `RichTextContext` entirely.* It would break every walk that enters a
  rich-text language directly, and remove the kernel fixture's coverage of a host that crosses into
  content it already holds.

Two channels could name two trees, so the language refuses when both arrive rather than choosing.
Review caught the first attempt reading `tree ?? value`, where a stale context tree beat the
content the crossing had just placed — reinstating, through the optional member, the drift this
decision removes. Its proposed cure, reading `value ?? tree`, only moves the silence: the loser is
then a format that places nothing and names its tree, whose translations go into the locale they
were read from. Neither precedence is safe, and a host that supplies both has made a mistake it
should hear about, so `enter` returns `null` and the walk raises.
`tree` is reached only where `value` is absent, which is a walk that starts in this language.

### D8. `OpenedCrossing.seat` becomes `OpenedCrossing.workingCopy`

What a format returns is its working copy; the host decides where it goes. "Working copy" is
already this package's word for it — the host cursor's docblock and the entry's own local variable
both use it.

The noun is carried in full. `working` alone was tried first and reads as an adjective waiting for
its subject, which is why it needed a sentence of docblock to explain; `workingCopy` needs none.

### D9. A format's answer is flat: it names a language and a context, never a crossing

`OpenedCrossing` is `{ languageId, context, workingCopy? }`, and the host builds the `Crossing`.

It first nested one, as `crossing: Omit<Crossing, "placement">`, which is the same mistake D6 had
already found at the entry and left standing here: `Omit` rejects an excess property only on an
object literal, so a format returning a variable already typed `Crossing` passed its placement
straight through, and the host dropped it without a word. The host grew a defensive comment saying
so, which is the diagnosis — the type was not carrying the rule.

Flat, the field cannot be named at all, the comment goes, and `contentCrossing.ts` stops importing
`Crossing` entirely.

- *Rejected — a base crossing and a placing variant in the kernel.* It would add a type to
  `core/traversal` to express something only `languages/` needs, making the kernel harder to read
  for one consumer's sake.

### D10. The kernel's barrel carries only what is taken from outside its module

`WriteRefusedError` was added to `core/traversal/index.ts` by this change and nothing outside the
module imports it from there; its one consumer already reaches it by path. Removed, per the
package's own barrel rule, which is checked by subtraction rather than argued.

Five names that predate this change are surplus by the same count — `PathSegment` and four more
error classes. They are left alone and recorded as a follow-up: this change did not bring them, and
a commit that fixes a feature should not also prune a barrel.

### Placement

| Piece | Lands in | Why there |
|---|---|---|
| `placement` on `Crossing`, `CollectedContent` | `src/core/traversal/contract.ts` | the kernel's vocabulary; both are read by the walk and by its callers |
| collecting and performing placements | `src/core/traversal/collect.ts` | it already holds `assignWrites` and already sees each crossing before handing it to the walk |
| passing placed content into `enter` | `src/core/traversal/walk.ts` | only the walk knows the crossing and the leaf value together |
| building the placement | `src/languages/PayloadFields.language.ts` | only the host knows which position the value came from |
| naming the working copy once | `src/languages/Lexical.language.ts` | only the format knows it made a copy |

New surface: one type, `CollectedContent`. Shape-check triggers fired — a new optional member on a
type the kernel publishes (`Crossing.placement`), and a changed parameter on two exported functions
— and both are compared against their alternatives in D1, D2 and D3.

Escalate to a design pass? No. The seam and its decisions were settled in the crossing-surface
design and its seam trace; this is the build step that closes the hazard they recorded.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R1 | Collecting over a document with a configured rich-text crossing leaves it identical, by identity and by value | `bunx vitest run src/languages/__tests__/PayloadFields.collectDoesNotWrite.test.ts` | exit 0 |
| AC2 | R2, R3 | After applying, the translated tree is the object stored in the target document | the same suite, a case that applies and reads the document back | exit 0 |
| AC3 | R5 | A crossing whose language refuses its context leaves the field's value untouched | the same suite, a case whose receiving language returns `null` from `enter` | exit 0, the stored object is the one it was |
| AC4 | R5 | A walk that spends its crossing budget leaves the document untouched | the same suite, a case with `maxCrossings: 0` | exit 0, the stored object is the one it was |
| AC5 | R2 | The host language performs no assignment | `grep -c "cursor\.data\[name\] = opened" src/languages/PayloadFields.language.ts` | prints `0` |
| AC6 | R4 | The entry's context no longer carries a second name for the tree | `grep -c "tree: working" src/languages/Lexical.language.ts` | prints `0` |
| AC7 | R3 | Answers cannot be applied without their placements | `bun run check-types` with `applyTranslations` called on a bare target list | the call does not type-check; pinned in `contract.pins.ts` |
| AC8 | R4, R6 | Text inside a block embedded in rich text is still found and still written back | `bunx vitest run src/languages/__tests__/Lexical.differential.test.ts src/languages/__tests__/Lexical.embeddedBlock.test.ts` | exit 0, same case count as the pre-flight |
| AC9 | — | The kernel's fixtures still exercise their cases, including a host that crosses without placing | `bunx vitest run src/core/traversal` | exit 0, same file and case count as the pre-flight |
| AC10 | — | Nothing already passing breaks | `bunx vitest run` | 215 files or more, no failures |
| AC11 | — | No new type errors | `bun run check-types` | exit 0 |
| AC12 | — | No new lint findings | `bunx oxlint .` | 34 warnings, 0 errors |
| AC13 | — | Both apps still type-check against the package | `bunx turbo run check-types --force` from the repo root | 9/9 |
| AC14 | R4 | A placement naming `null` hands the language `null`, rather than falling back to the value the host offered | `bunx vitest run src/core/traversal/__tests__/crossing.placement.test.ts` | exit 0, the case runs |
| AC15 | R2 | A placement carried by the walk's entry is collected and performed like any other | the same suite, a case whose entry carries one | exit 0, the case runs |
| AC17 | R4 | A context that names a tree for a crossing that already placed one is refused, not resolved by precedence | `bunx vitest run src/languages/__tests__/Lexical.refusesForeignContext.test.ts` | exit 0, raises `CannotEnterLanguageError` |
| AC16 | — | The package still builds, and the sandbox still boots against what it builds | `bunx turbo run build --filter='./packages/payload-plugin-translator'` from the root, then `bun run test:integration:sqlite` in `apps/dev` | build exit 0; 248 passed, 7 skipped |

## Pre-flight

Each check run against the untouched tree, before anything was written.

| AC | Command | Result | Kind |
|---|---|---|---|
| AC1 | the suite above | 1 failed — `working.body` was replaced during collection, "Jetzt kaufen" already overwritten by "Buy now" | change — must fail now, and does |
| AC5 | the grep above | prints `1` | change — must fail now, and does |
| AC6 | the grep above | prints `1` | change — must fail now, and does |
| AC8 | the two suites above | exit 0 | invariant — passes now |
| AC9 | `bunx vitest run src/core/traversal` | exit 0 | invariant — passes now |
| AC10 | `bunx vitest run` | 215 files, 2598 passed, 9 skipped | invariant — passes now |
| AC11 | `bun run check-types` | exit 0 | invariant — passes now |
| AC12 | `bunx oxlint .` | 34 warnings, 0 errors | invariant — passes now |
| AC13 | `bunx turbo run check-types --force` | 9/9 | invariant — passes now |

AC7 has no pre-flight of its own: the pin it describes cannot be written against a signature that
does not exist yet. It is written and proved in the build.

## Risk notes

Classified **high**: the change is to the kernel's own contract, every language and fixture reads
it, and getting it wrong writes translations into an object nobody saves — a failure that leaves no
error behind, only an untranslated document. Accordingly: the reproduction test is written and red
before the fix, the regression sweep over the changed surface is mandatory and evidenced, and the
diff gets several review angles rather than one.

- The widest surface is the call sites: every collection and every application inside this package
  changes shape. Each edit is mechanical, and the risk is a test quietly weakened in passing rather
  than a behaviour broken outright — so the sweep counts cases, not just exit codes.
- A host that crosses into content it already stores (no placement) and one that hands over a copy
  (a placement) are different paths. Both have coverage and both must keep it.
- Nested crossings place inside an outer placement. Order is safe because the outer placement
  assigns by reference, but it is the case most likely to be got wrong, and the differential suites
  are what prove it.

## Review

Filled by the verification pass; the run log lives beside this file.

## Decisions by the owner

2026-11-07 — decided by the owner: do every change that touches the contract now rather than
deferring it, since the surface becomes a promise at the next major.
2026-11-07 — decided by the owner: the write belongs with the other writes, performed when
translations are applied; the walk is for reading.
2026-11-07 — decided by the owner: proceed without the design gate, autonomously, and report at the
end.
