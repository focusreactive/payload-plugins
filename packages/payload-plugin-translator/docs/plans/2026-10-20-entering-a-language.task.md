# Entering a language, safely

Follows [2026-10-20-the-traversal-kernel.task.md](./2026-10-20-the-traversal-kernel.task.md),
whose decisions (D1–D7, E1–E15) stand and are not re-opened. Same branch, same diff.

## Requirements / Task restatement

`collectTranslationTargets` is entered with `entry: { languageId, context }` — a name the host
types by hand, and a package of data only the host knows the shape of. The two halves can diverge,
and today only one of them is guarded.

Three failure modes, all three observed on the untouched tree:

| Case | Today |
|---|---|
| the id names nobody | `UnknownLanguageError`, with the registered ids listed |
| the id names a registered language whose context this is not | `TypeError: Cannot read properties of undefined (reading 'root')` |
| the same, mid-walk, from an embed resolver | `TypeError: Cannot read properties of undefined (reading 'content')` |
| the same, to a language written defensively (`context.fields ?? []`) | **no error at all, zero targets** |

The last is the one that matters: a translation run that quietly translates nothing.

In scope: a compile-time check on the id; a named error in place of the raw `TypeError`; and a way
for a language to say "this context is not mine" so the silent case becomes loud.

Out of scope: validating the *content* of a context a language accepts, and anything in the plugin.

## What already exists — platform · installed · project · verdict

- **Platform:** the compiler can do the id half. A `const` type parameter over `languages` narrows
  `entry.languageId` to the union of the registered ids; verified with a probe before any design
  (`error TS2820 … Did you mean '"payload-fields"'?`). Nothing hand-written is needed for it.
- **Project:** the error family under `src/errors/`, one class per file, is the precedent for the
  new error. `activate` in `src/walk.ts` is the single place a language is entered — root and
  crossing alike (ADR-12), so one guard covers both doors.
- **Verdict:** one new error class; no new module, no dependency.

## Decisions

**N1 — the id is checked by a type parameter on the call, not by a parameter on `Language`.**
*Rejected:* `Language<N, C, Id extends string>`. It costs every implementor a type parameter, and
`RegisteredLanguage = Language<unknown, unknown>` erases it again the moment a registry holds it —
so the cost is paid where the benefit is not. The call site is where both halves of `entry` meet,
so that is where the check belongs.
*Cites:* `Language` is published and implemented outside this package; adding a required parameter
to it is a breaking change for a package about to ship.
*Degrades silently:* a language whose `id` is a plain `string` widens the union back to `string`,
and its callers compile exactly as they do today.

**N2 — a language refuses a context by returning `null` from `enter`, not through a separate
`accepts`.** All four example languages do the same thing in `enter`: cast the context to a shape
and destructure it. A separate predicate would need that same shape knowledge a second time, and
the two could disagree — which is the split-predicate trigger, and this package has already shipped
that defect once: `selects` and `boundary` answered parts of one question and left a case neither
claimed, so content the host never marked went out for translation.
*Rejected:* `accepts?(context: unknown): boolean`.

| | `accepts` + `enter` | `enter` returns `null` |
|---|---|---|
| places that know the context's shape | **2** per language | **1** |
| states admitted / produced | 4 / 2 — `accepts` true while `enter` fails, and false while `enter` would have worked, are both expressible and both meaningless | 2 / 2 |
| second caller, already written | four fixtures | four fixtures |
| breaks an outside implementor | no (optional member) | **no** — widening a return type leaves every existing `enter` valid |

Neither is enforceable, so neither closes the hole for an author who declines to use it. They
differ in whether the hole can open *between* two places that were both written. One place cannot
disagree with itself.

**N3 — a throw out of `enter` is wrapped, not propagated.** Whatever `enter` throws becomes the
same named error as a refusal, with the original on `cause`: to a caller the two are one event —
this language could not be entered with this context — and the response to both is to fix the
wiring. Wrapping is confined to `enter`, because that is where a context is read; `step` and
`textUnits` are left alone, their failures being about content rather than about who was handed it.
*Rejected:* letting it propagate, which is today's unreadable behaviour.

**Placement:** the type parameter on `collectTranslationTargets` (`src/collect.ts`); the guard in
`activate` (`src/walk.ts`), the one place a language is entered; the error in
`src/errors/CannotEnterLanguageError.ts`, beside its five siblings.

**New surface:** one error class, exported. `enter`'s return type widens. No new module.

**Shape check:** fired on two triggers — a published type's member changes signature, and the new
state is an absence. The table under N2 is the answer.

**Written contract?** Yes: `enter` now owes callers that `null` means "not my context" and nothing
else — not "nothing to walk", which is `{ nodes: [], cursor }`. That distinction is the whole point
and is the first thing a check must pin.

**Escalate?** No. One package, no new seam, no dependency.

## Acceptance Criteria

Commands from `packages/translator-core` unless stated.

| AC | Criterion | How it is checked | Passes when |
|---|---|---|---|
| AC1 | A typo in `entry.languageId` is a **compile** error | type-check a consumer outside the package that passes `"payload-field"` | `tsgo` reports TS2820 naming the registered ids |
| AC2 | The correct id still compiles, and so does a language whose `id` is a plain `string` | the same consumer file, two more cases | 0 errors |
| AC3 | **Unhappy path** — a context the entry language refuses | a language returning `null` from `enter`, entered | throws `CannotEnterLanguageError` naming that language |
| AC4 | **Unhappy path** — a context the entry language breaks on | a language whose `enter` throws | same error, with the original on `cause` |
| AC5 | **The silent case** — a defensive language handed a foreign context | the preflight's own fixture, now refusing | throws instead of returning zero targets |
| AC6 | The same guard holds mid-walk, not only at entry | an embed resolver handing over a context the host language refuses | same error, carrying the `idPath` of the crossing |
| AC7 | `null` and "nothing to walk" stay different | a language returning `{ nodes: [], cursor }` | no error; zero targets; no other check moves |
| AC8 | The thirty-six existing checks are unchanged in behaviour | `bunx vitest run` | every prior check still passes; count rises only by the new files |
| AC9 | Each new check discriminates | one mutation per new check, plus the prior battery of 17 | each turns its own check red and the 17 still discriminate |
| AC10 | No new check survives an empty implementation | the stub audit from the previous step, re-run | 0 green |
| AC11 | Clean types and lint | `bun run check-types`, `bunx oxlint .` | 0 errors; 0 warnings |
| AC12 | New public names documented to the property | read `dist/*.d.ts` | the error class and `enter`'s return carry docs; tags are ones oxlint accepts |
| AC13 | **Scope guard** — nothing outside the package | repo root `git status --porcelain` | names nothing under `packages/payload-plugin-translator/src` or `apps/` |

## Pre-flight

Against the untouched tree, 2026-10-20.

| AC | Command | Result now | Kind |
|---|---|---|---|
| AC1 | consumer with a typo | **compiles** — the id is a plain `string` | **change** — fails now |
| AC2 | consumer, correct id | compiles | **invariant** |
| AC3–AC4 | a language refusing or throwing | no such notion; a throw propagates raw | **change** |
| AC5 | defensive language, foreign context | **no throw, 0 targets** — measured | **change** |
| AC6 | mid-walk, foreign context | `TypeError: Cannot read properties of undefined (reading 'content')` — measured | **change** |
| AC7 | `{ nodes: [], cursor }` | already means "nothing to walk" | **invariant** |
| AC8 | `bunx vitest run` | 15 files, 36 checks, green | **invariant** |
| AC9 | the battery of 17 | all discriminate | **invariant** |
| AC10 | the stub audit | 0 green | **invariant** |
| AC11 | `check-types`, `oxlint` | 0 / 0 warnings, 0 errors | **invariant** |
| AC12 | `dist/*.d.ts` | the class does not exist | **change** |
| AC13 | `git status --porcelain` | the package, the lockfile and two plan docs | **invariant** |

## Risk notes

- **Risk: low.** One package, nothing imports it, and the suite is both mutation-proven and
  stub-audited. The one real hazard is AC7: making `null` mean "not mine" while `{ nodes: [] }`
  keeps meaning "nothing here" — collapse those two and an empty document starts throwing.
- Neither half of N2 is enforceable. An author who returns a value unconditionally is exactly where
  they are today; the change removes a way for two places to disagree, not the author's freedom to
  skip the check. Said plainly so nobody reads this as a guarantee.

## Human choices

- All three parts now, nothing deferred — owner, 2026-10-20.
- `enter` returning `null` in place of a separate `accepts` — owner, 2026-10-20, at the gate. He
  had approved `accepts` earlier in conversation; shown the duplication it forces on every language
  and the precedent of `selects`/`boundary`, he chose the single place.

## Decisions taken during execution

**X1 — AC5 was overstated, and the checks now say so.** It read as though the guard closes the
silent case. It does not: it gives a language the means to close it. A language that neither
refuses nor breaks still swallows a foreign context and walks nothing, and from outside that is
indistinguishable from an empty document — the kernel cannot tell. There is now a check that pins
exactly that limit (`entry.contextRefused.test.ts`, "cannot tell when a language neither refuses
nor breaks"), so nobody later reads the guard as a promise that carelessness is caught. AC5 is met
in the sense the contract's own Risk notes already stated, and the overstatement is corrected here
rather than quietly graded as met.

**X2 — the compile-time criterion is verified by `check-types`, not by the suite, and that is
deliberate.** AC1 declared a type-check as its evidence. The file holding it
(`entry.idIsChecked.test.ts`) keeps a never-called function carrying a `@ts-expect-error`, which
asserts the line *must* fail to compile — the opposite of silencing the checker — and no runtime
check is claimed for it, because a runtime check could not tell the difference. Proven by mutation:
removing the type parameter from `collectTranslationTargets` makes `check-types` report exactly one
error, in that file.

**X3 — three new checks survived an empty implementation on the first audit, all three asserting an
absence.** "An empty node list is not a refusal" asserted only `toEqual([])`; "accepts a registered
id" asserted only `not.toThrow()`; and the compile-time one asserted `typeof fn === "function"`.
Each now carries a positive anchor in the same check — the same language shown walking something,
a target actually collected — except the third, which was removed as a runtime check entirely
(X2). Second audit: 48 red, 0 green. This is the rule added to the development skills earlier
today, caught by its own instrument on the first change written after it.

**X4 — the four example languages were left alone.** They could demonstrate the refusal, but no
acceptance criterion asks for it, and the checks that exercise the mechanism wrap
`payloadFieldsLanguage()` rather than inventing a toy, so the realistic case is covered without
touching code the previous step's thirty-six checks are measured against. The real Payload
language, written later in the plugin, is where the refusal earns its place.

**X5 — three of the docblocks this change wrote stated things that are false.** The comment audit
checked every behavioural claim against the code, and three did not survive:

- `CannotEnterLanguageError.idPath` was documented as `<root>` at the entry. It is `[]`. `<root>`
  is only what `renderIdPath` prints when joining an empty path, so a consumer writing
  `if (err.idPath === "<root>")` would never match.
- `enter`'s rationale called its context "the only thing a language is handed that it did not
  produce itself". `claims(value)` is handed another language's value too — a fact stated earlier in
  this very work and then contradicted in a docblock written minutes later.
- The same docblock's summary said `enter` builds "the root nodes this walk starts from". It runs at
  every crossing, not only at the root.

All three were written by the author of the code they describe, which is the case this audit exists
for. The design rationale paragraph went entirely: it argued *why* the check lives in `enter`
rather than in a second function, which is an argument for a reviewer, has no second function for a
consumer to choose between, and belongs in this document — where it is, as N2.

**X6 — splitting a check reintroduced the tautology the stub audit had just removed.** The audit
advised splitting "an empty node list is not a refusal" into two named checks, one assertion each.
Applied literally, the first half asserted only `toEqual([])` — which an empty implementation
satisfies — and the next stub audit caught it immediately.
*Taken:* that check keeps both halves, because **its subject is the difference between them**. One
must throw and the other must not; either alone is satisfied by a walk that does nothing. "One
check, one reason" and "a negative assertion needs a positive anchor" collide here, and the second
wins: a check whose subject is a distinction cannot be split without losing its subject.

**X7 — the `cause` regression I introduced while "simplifying".** The first audit noted, out of
scope, that `throw undefined` inside `enter` would be indistinguishable from a refusal. Fixing it
looked like a simplification — drop the conditional, always pass `{ cause }` — and it made things
strictly worse: an options object carrying the `cause` key installs the property even when the value
is `undefined`, so **every refusal** then looked like it had wrapped a throw. Caught by review and
confirmed by probe (`'cause' in error === true`, `error.cause === undefined`).
*Taken:* back to the conditional. It is wrong only for `throw undefined`, which nothing does; the
"simpler" form was wrong for the common path. A check now pins the distinction, and a mutation
turning the conditional back into `{ cause }` turns exactly that check red.

**X8 — a kernel error raised inside a language's own `enter` is re-wrapped, and that is accepted.**
If a language starts a nested walk inside `enter`, an inner `TooManyCrossingsError` or
`TraversalCycleError` comes out as `CannotEnterLanguageError`, with the original on `cause`. Not
reachable on any supported path — crossings go through `cross()`, which is called from the visitor,
outside the guard — so this needs a language that re-enters the kernel from inside `enter`, which
the crossing protocol exists to make unnecessary.
*Taken:* left as is. The alternative costs a shared base class for the error family or six
`instanceof` checks, to rename an error nobody is in a position to receive. Recorded rather than
built, so the next reader finds the reasoning instead of the question.

**X9 — `filter` removed, and the measure that removed it.** `CollectOptions.filter` let a caller
reject individual leaves its language had already selected — the translation strategy, in the
design's words. Its only caller was the check written to prove it worked, which is not demand: a
consumer is code that needs a capability for its own job, and a check whose subject *is* the
capability cannot establish one.
*The measure, stated so it can be applied again:* a capability stays only when removing it loses
something a caller cannot recover from outside. `filter` fails it — the caller can filter the
returned targets, and loses only the building of text units for leaves it then discards.
`onSelectedWithoutText` passes it — a leaf that was selected and yielded no text is **invisible in
the result**, so dropping that callback destroys information nothing outside can rebuild.
`maxCrossings` passes it — without it a legitimately deep document cannot be walked at all.
*Direction:* adding an option later is not a breaking change; removing one after publication is.

**X10 — the claim fallback is gone.** `Language.claims` asked every *other* language to recognise a
raw value by its shape, for a host whose schema does not record what its own fields hold. Removed
with `AmbiguousClaimError` and the claim branch of the collector.
*Why:* the case it serves does not exist here. Every schema this kernel will meet already records
what a field holds, because the host needs that itself — Payload keeps `type: "richText"` and
`editor` to render the right editor, Storyblok keeps `type: "richtext"` in the component schema.
Recognition by shape is guessing, and the shapes it guesses between (Lexical, ProseMirror, Slate)
are near-identical. A claimed crossing also arrives with an empty context by construction — a host
that could not declare the boundary has no resolver to hand over either — so embeds inside claimed
content could never be walked.
*And it was expensive:* both defects review found in this package lived in this one feature — a
claim overruling a host that had declined, and a claimed value being written into the source
document rather than the copy. A second, independent implementation of the same design never built
it and had neither.
*Owner's rule, stated at the decision:* if a source does not record what its fields hold, the answer
is to fix the source or write a language that knows how to tell — not to let the kernel guess.

**X11 — `boundary` is required.** It was optional, so a language that can hold embedded content and
omits it translates its own prose and silently leaves everything embedded in it untranslated — the
exact defect this kernel exists to fix. Now `boundary: () => null` must be written, which turns
"nothing inside me is written in another language" from an omission into a statement.
*What this does not catch, said plainly:* a language that returns `null` when it should have crossed.
The kernel reads no content and cannot know. The only guard is a check by the language's own author
over a document with something embedded in it — which is what the `Payload → Lexical → Payload` case
is.
*Not reachable at all, by construction:* two languages both claiming one node. `boundary` is asked of
exactly one language — the one whose `step` produced that node — so there is no vote and no tie. That
was only possible under `claims`, which is gone.

## Review log

### 2026-10-20 — comment audit

16 blocks judged, every one: 2 kept with a named reason, 6 shortened, 5 answered by changing the
code, 3 deleted, plus 3 missing ones added. **Three carried false behavioural claims** (X5) — the
class of defect the audit's third check exists for, and the first change written after that check
was added to the development skills.

Answered by code rather than prose: `enterOrReport` → `enterOrFail` (the old name suggested
logging, which is why its docblock felt necessary); `picky` → `refusesWithoutFieldList`; `unnamed` →
`idTypedAsPlainString`, whose old name was actively wrong — the language has an id, it is the *type*
of the id that is widened; and `PAYLOAD_FIELDS_ID.slice(0, -1)`, a typo built by chopping a
character, became a named `UNREGISTERED_ID`.

Kept, with reasons: the helper that asserts a thrown class by instance rather than through
`toThrow`, because no name can say why `toThrow(SomeClass)` is unsafe when the class may be
`undefined` — a false green this task had already produced once; and the `@ts-expect-error`
justification, because an unjustified directive reads as a suppression and the next person tidying
the file would delete it along with the line it pins.

One sweep beyond the change: the line "Thrown by the walk; a consumer catches this class, it never
constructs one" sat on all six error classes. It says nothing the class name and signature do not,
so it came off all six rather than off the new one alone.
