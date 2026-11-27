# A language's starting data is described once

Requirements: ./2026-11-13-the-language-declares-its-context.md

Every `file:line` below was read at commit `b36b049b`, the tree as it stood before this work —
including the ones naming where an edit lands, which are cited where the edit was made rather than
where it ended up.

Replaces this file's earlier draft, which was written from a partial reading of the handover and was
never approved.

## Requirements / Task restatement

When a walk begins, or when one language hands over to another, the receiver is given a set of data
to start from. Today that set's shape is written twice — once where it is packed, once where it is
read — and nothing connects the two. A member misspelled at the packing site compiles; the walk
then refuses at run time, far from the typo.

Give each shipped language's starting data one named type, and use that one type at both ends. The
engine's contract does not change.

Covers R1, R2, R3, R5 of the definition. R6 (a compulsory member for refusing) and R7 (any change
to `src/traversal`) are out of scope by the owner's decision: refusal stays a `null` from `enter`,
as decided on 2026-10-20 (N2).

## What already exists

- **Project, and it decides the placement.** `src/core/domain/content-projection/` is already
  shared ground: `PayloadFields.language.ts:1` imports `idPath.js` and `translatableLeaf.js` from
  it, and `translatableFields.ts` lives in it. Both ends of route 1 and route 3 can therefore name
  one type declared there, with no new import edge in either direction.
- **Project.** `src/core/kernel/field-traversal/types.ts` is the precedent for core owning a
  structural description of Payload's data that the languages implement against — `FieldLike`,
  `BlockLike`. A starting-data type sits in the same family.
- **Project.** Narrowing `unknown` into a named type is done here with an `is…` guard:
  `isSerializedLexicalRoot`, `isTranslatableLeaf`, `isObject`. No new technique.
- **Project.** `RichTextContext` (`PayloadLexical.language.ts:34`) already exists and is already
  used at the packing end (`:233`). Route 2 needs its reading end joined up, nothing more.
- **Verdict:** nothing new is built. One type, one guard per language, and the literals annotated.

## Decisions

### D1 — The Payload fields language's starting-data type is declared in `src/core`, not beside the language

**Chosen:** a new `src/core/domain/content-projection/FieldWalkStart.ts` holding the type and its
guard.

**The constraint that decides it.** Two of the three places that pack this set are core files —
`translatableFields.ts:22` and `WalkCollector.stage.ts:30` — and `src/__tests__/imports-into-languages.test.ts`
forbids any shipped file under `src/core` from importing `src/languages`, as a type or otherwise.
So a type used by both ends cannot live in the language's module.

**Rejected: declare it in `PayloadFields.language.ts` and type only routes 2 and 3** — the
definition's other answer to its question 7. It keeps the type where the concept belongs, and it
leaves the two core packers exactly as they are: untyped literals whose misspelling still compiles.
That is the half of the problem that is actually reachable today, so skipping it would leave the
task's own purpose unmet.

**Rejected: move the packing out of core**, by having the wiring supply a built entry and core call
it. It removes the coupling rather than naming it, and it is the better long-term shape. It loses
here because it changes `LanguageTable`, which is the engine's type (`src/traversal/collect.ts:13`)
— R7 puts that out of scope. Recorded as a follow-up.

**What this costs, stated plainly:** core gains a name for a shape that is specifically the Payload
fields language's, and no other host's. That is already true of `FieldLike` and `BlockLike`, so the
cost is a familiar one rather than a new kind — but it is a cost, and the better answer is the
rejected third option above.

### D2 — The file is named for what the data is, not for the language that reads it

**Chosen:** `FieldWalkStart` — what a walk over a Payload document starts from.

Core may not name the language, because it does not know languages exist. Naming the type
`PayloadFieldsContext` in core would state a dependency the import boundary denies. `FieldWalkStart`
describes the three values and nothing else.

**Rejected: `HostLanguageStart`.** It claims generality the type does not have: the engine's own
fixture host starts from `{ fields, source, target }`, a different shape. One host's starting data
is not every host's.

### D3 — The reading end narrows with a guard; the cast goes

**Chosen:** `isFieldWalkStart(context)` in the new module, and `isRichTextContext(context)` beside
`RichTextContext`. Each `enter` calls its guard and returns `null` when it does not hold — the same
refusal, the same place, as N2 decided.

**Rejected: keep the cast and only annotate the packing sites.** It would catch a misspelling where
the set is built, which is most of the value, and leave the reading end asserting a shape the
compiler never checks — so the two descriptions would still be two. A guard makes the reading end
reference the same type by name.

**What a guard cannot do.** `EmbedResolver` is a function type; a guard can see that a value is a
function and nothing more. `isRichTextContext` therefore carries the same assumption the present
cast carries. What changes is that the assumption is made once, in a named unit, and both ends of
route 2 point at one type.

### D4a — An absent starting set becomes a refusal rather than a break (added during the build)

The reader used to destructure the raw value before checking anything, so `null` or `undefined`
threw a `TypeError`, which the walk reports as `CannotEnterLanguageError` **with** the original on
`cause`. A guard that begins by asking whether the value is an object reports the same error
**without** a `cause`.

**Chosen: the refusal.** `cause` is what tells "this language broke on what it was handed" from
"this is not its own" (the decision of 2026-10-20, N3). Nothing is wrong with a language handed
nothing; there is simply no starting set there that could be its own.

**Rejected: a guard that reproduces the throw**, by destructuring before checking. It keeps the
present behaviour exactly, at the cost of a guard that throws — which no caller of an `is…`
function expects.

Neither case is reachable from the plugin: all three routes build an object. The change is
recorded because it is a change, and pinned by a new check so it is not undone by accident. That
check was proven to discriminate: restoring the old shape of the guard turns it red, naming it.

### D4 — `tree` stays as it is

`RichTextContext.tree` is `unknown` by the decision of 2026-10-21: only the language that walks a
tree knows its format, so the consumer narrows it. The guard checks that `embed` is present and
leaves `tree` alone, and `enter` keeps its own `isSerializedLexicalRoot` check and its refusal when
a tree and a handed-over value are both present (`PayloadLexical.language.ts:159`).

### Placement, surface, escalation

| Piece | Where | Why there |
|---|---|---|
| `FieldWalkStart`, `isFieldWalkStart` | new `src/core/domain/content-projection/FieldWalkStart.ts` | the one module both ends already import from; one named type per file is this package's convention |
| the two core packers | `translatableFields.ts:22`, `WalkCollector.stage.ts:30` | annotate the literal |
| the embed packer | `PayloadFields.language.ts:121` | annotate the literal |
| the Payload fields reader | `PayloadFields.language.ts:130` | guard instead of cast |
| `isRichTextContext` | beside `RichTextContext`, `PayloadLexical.language.ts` | the type is already there, and only this language may own it |
| the Lexical reader | `PayloadLexical.language.ts:153` | guard instead of cast |

- **New surface:** two types' worth of guard, both internal. Nothing is added to `src/index.ts`.
  The shape check fired on "a new exported function" and on "two predicates over the same input" —
  the second is the one that matters, and D3 answers it: the guard is the *only* predicate over the
  raw starting data, and `enter` holds none of its own beyond what D4 keeps.
- **Written contract?** None. Each guard owes its caller exactly what its return type states.
- **Escalate:** no. One package, no new seam; the rejected third option in D1 is the one that would
  need a design, and it is deferred.

### D5 — Testing order

Routine work: no new contract, no bug. The behaviour this protects is already specified by three
suites that pass today and must keep passing (AC5). The new checks are compile-time, and each is a
probe that must fail before the change and compile after — recorded in the pre-flight below, which
is the red-first evidence for them.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R2 | A member misspelled where the walk's entry is packed is a compile error | misspell `fields` in `translatableFields.ts:22`, run `bun run check-types`, revert | an error naming that file and `FieldWalkStart` |
| AC2 | R2 | The same, where the embedded block's entry is packed | misspell `fields` in `PayloadFields.language.ts:121`, run `bun run check-types`, revert | an error naming that file |
| AC3 | R2 | The same, where the rich-text entry is packed | misspell `embed` in `PayloadLexical.language.ts:233`, run `bun run check-types`, revert | an error naming `RichTextContext` |
| AC4 | R2, R3 | Neither shipped language forces a type on its starting data | `grep -nE "context as \|as EmbedResolver" src/languages/payload-fields/PayloadFields.language.ts src/languages/payload-lexical/PayloadLexical.language.ts` | no match |
| AC5 | R1 | **Unhappy path** — foreign starting data is still refused, by the same error, with no `cause`; and a language that throws on it still reports the original on `cause` | `bunx vitest run src/traversal/__tests__/entry.contextRefused.test.ts src/languages/payload-fields/__tests__/PayloadFields.refusesForeignContext.test.ts src/languages/payload-lexical/__tests__/PayloadLexical.refusesForeignContext.test.ts` | at least 23 passed, the three cases of D4a among them |
| AC6 | R1, R7 | The engine is not touched | `git diff --stat -- src/traversal` | empty |
| AC7 | R1 | No shipped core file imports the languages | `bunx vitest run src/__tests__/imports-into-languages.test.ts` | exit 0, all three cases |
| AC8 | — | No new type errors | `bun run check-types` | exit 0 |
| AC9 | — | Nothing else in the suite changes behaviour | `bunx vitest run` | 222 files, at least 2616 passed, 9 skipped |
| AC10 | — | No new analyzer findings | `bunx oxlint packages/payload-plugin-translator` | 0 errors, at most 33 warnings |
| AC11 | — | A real Payload boot against `dist` still works | `bun run build`, then from `apps/dev` `bun run test:integration:sqlite` | 62 files passed, 248 passed, 7 skipped |
| AC12 | R5 | Every `file:line` this contract and its definition cite resolves to the text claimed of it — including the ones the change itself moves | resolve each reference in both files against the tree as it stands at the end, and read the printed line beside each claim | every reference resolves, and each printed line is the one the claim describes |

## Pre-flight

Run against the untouched tree on 2026-11-13, at commit `b36b049b`.

| AC | Command | Result on the untouched tree | Class |
|---|---|---|---|
| AC1 | `fields` misspelled as `fieldz` in `translatableFields.ts:22`, then `bun run check-types` | **no error** — the literal reaches `context: unknown`, so the typo compiles and the walk would refuse at run time instead | change |
| AC2 | — | the same literal shape, packed at `PayloadFields.language.ts:124`, equally unchecked | change |
| AC3 | — | already typed: `const context: RichTextContext = { embed }` at `:233`, by the decision of 2026-10-21. This criterion is an invariant for route 2's packing end and a change for its reading end | invariant |
| AC4 | the grep | `PayloadFields.language.ts:131: context as {` and `PayloadLexical.language.ts:169: embed as EmbedResolver` | change |
| AC5 | the three suites | 23 passed | invariant |
| AC6 | `git diff --stat -- src/traversal` | empty | invariant |
| AC7 | `bunx vitest run src/__tests__/imports-into-languages.test.ts` | exit 0, 3 passed | invariant |
| AC8 | `bun run check-types` | exit 0 | invariant |
| AC9 | `bunx vitest run` | 222 files, 2616 passed, 9 skipped | invariant |
| AC10 | `bunx oxlint packages/payload-plugin-translator` | 33 warnings, 0 errors | invariant |
| AC11 | from `apps/dev`, `bun run test:integration:sqlite` | 62 files passed, 248 passed, 7 skipped | invariant |
| AC12 | the references in the definition, resolved against the tree | 25 references, 0 unresolved | invariant — and it will not stay one by itself: this change moves lines inside the files it cites, so the references must be re-resolved and corrected at the end |

## Risk notes

- **Low risk.** No behaviour is intended to change, the radius is six files, the compiler sees every
  one of them, and the refusal behaviour that could regress has three suites over it (AC5).
- **The guard could be stricter than the cast it replaces, and that would change behaviour.**
  Today's reader checks `Array.isArray(fields) && isObject(data) && isObject(source)`. The guard
  must check exactly that and no more: adding a check — that `fields` is non-empty, say — would
  turn a currently valid walk into a refusal. AC5 is the guard against it, and the three suites
  include the case where an empty node list is a valid answer rather than a refusal.
- **`source` and `data` are the same object on two of the three routes** (`translatableFields.ts`
  passes `doc` twice; `PayloadFields.language.ts:124` passes `data` twice) and different objects on
  the third. The type cannot tell them apart and must not try to; the existing docblock on
  `PayloadFieldsCursor` is where that distinction is written down.
- **The guard stops at "a list", and the entries are unchecked.** Measured: a `fields` list holding
  `null`, a string or a number throws a raw `TypeError` inside `step` — "Cannot read properties of
  null (reading 'type')" — rather than being refused at entry, and a list holding a bare object
  walks to completion in silence. That is unchanged by this task: the old reader claimed
  `fields as FieldLike[]` on the same evidence. Checking each entry would convert those crashes
  into refusals, which is a better behaviour and a different task; recorded as a follow-up rather
  than smuggled into this one.
- **The better shape is deferred, not dismissed.** D1's third option moves the packing out of core
  entirely. It is the right answer and it needs the engine's `LanguageTable`, which this task may
  not touch. Recorded so the follow-up is not re-derived from scratch.
- **The branch already carries one commit with a different reason** — the engine's move. This is a
  second commit on it, by the owner's decision.
