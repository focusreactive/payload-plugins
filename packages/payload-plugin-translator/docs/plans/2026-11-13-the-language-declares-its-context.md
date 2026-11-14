# How a language's starting data is typed and checked — the verified map

Issue: #236.
Source: 2026-11-13-the-language-declares-its-context.source.local.md

Every `file:line` below was read at commit `b36b049b`, the tree as it stood before this work.
The lines this change itself moves are therefore cited at their pre-change positions, on purpose:
this file describes the problem, not the result.

Supersedes the task contract `2026-11-13-the-language-declares-its-context.task.md`, which was
written from a partial reading — the engine's side of the handover only — and was never approved.
`/sp-task` rewrites it from this file once the blocking question below is answered.

## Problem Statement

When the traversal engine moves from one language to another, the language handing over packs a
set of data for the receiver — the receiver's *starting data*. The engine carries it across without
looking inside: `Crossing.context` is `unknown` (`src/traversal/contract.ts:200`), deliberately.
The receiver then has to work out what it was given. Today each receiver does that by hand inside
`enter`, and the compiler links neither the packing side nor the unpacking side to the other.

What #236 set out to fix rests on two claims. The first is true: the shape of a language's starting
data is described twice, once where it is packed and once where it is unpacked, with nothing
connecting the two descriptions. The second was overstated in conversation and is corrected here:
**in the plugin as it ships, no language ever packs starting data for a different language**, and
both shipped languages refuse foreign starting data correctly. The careless patterns that can drop
text silently exist only in the engine's test fixtures — which matter because they are the worked
examples a future host will copy once the engine is published (#203).

## Codebase map

Every location below was read on 2026-11-13 at commit `b36b049b`.

### The parts

| Part | Where | What it owns |
|---|---|---|
| The engine | `src/traversal/` | `Language<N, C>`, `Crossing`, `RegisteredLanguage` (`contract.ts`); entering a language and turning a refusal into `CannotEnterLanguageError` (`walk.ts:55`, `enterOrFail`); the registry (`registry.ts`) |
| The crossing vocabulary | `src/languages/contentCrossing.ts`, `src/languages/embedCrossing.ts` | `ContentCrossing` with its `open`, `ContentOffer`, `OpenedCrossing`; `EmbedResolver`, `EmbedIdentity`. Documented as "owned by neither host nor format, so neither imports the other" |
| The Payload fields language | `src/languages/payload-fields/PayloadFields.language.ts` | the host language. Holds the list of formats it may hand a field to (`crossings`) and the block definitions (`blocks`); calls each format's `open`; builds the crossing back into itself for an embedded block |
| The Lexical language | `src/languages/payload-lexical/PayloadLexical.language.ts` | the rich-text format. Publishes its own `ContentCrossing` entry, `payloadLexicalContent` (`:228`), whose `open` packs this language's own starting data |
| The wiring | `src/server/features/_lib/translationLanguages.ts:13` | registers the two languages; gives Payload fields `crossings: [payloadLexicalContent()]`; names Payload fields as the host |
| The walk entries | `src/core/domain/content-projection/translatableFields.ts:22`, `src/core/translation-pipeline/stages/walk-collector/WalkCollector.stage.ts:30` | the two places the plugin starts a walk |
| The engine's fixtures | `src/traversal/__tests__/fixtures/` | a second host modelled in tests: its own fields language, a Storyblok language, and two rich-text formats. It decides a crossing by a field property (`fixtures/payloadFields.ts:131`), not through `ContentCrossing` |

### Every route by which starting data reaches a language, in shipped code

There are three. No other place in shipped code builds a crossing or an entry.

| # | The handover | Packed by | Unpacked by | Same language at both ends |
|---|---|---|---|---|
| 1 | a walk begins | the plugin: `translatableFields.ts:22` and `WalkCollector.stage.ts:30`, always `{ fields, data, source }` | Payload fields `enter`, `PayloadFields.language.ts:130` | no — plugin code |
| 2 | a field is handed to the rich-text format | Lexical's own `open`, `PayloadLexical.language.ts:228`, annotated `RichTextContext` (`:34`) | Lexical `enter`, `PayloadLexical.language.ts:153` | **yes** |
| 3 | the rich text reaches an embedded block | Payload fields' own `resolveEmbed`, `PayloadFields.language.ts:121` | Payload fields `enter`, `PayloadFields.language.ts:130` | **yes** |

Route 2's resolver is supplied by route 2's caller: `PayloadFields.language.ts:207` calls
`crossing.open({ value, embed: resolveEmbed })`, so the Lexical language is never entered in
shipped code without its embed resolver.

The Lexical language is never the *first* language of a walk in shipped code: the host is always
Payload fields. The `tree` member of `RichTextContext` and the refusal at
`PayloadLexical.language.ts:159` (`tree` and a handed-over value both present) are exercised only
by tests (`PayloadLexical.refusesForeignContext.test.ts:40`, `src/languages/__tests__/fixtures/lexical.ts:127`).

### How each end describes the starting data today

| Route | Packing side | Unpacking side |
|---|---|---|
| 1 | an untyped object literal | `context as { fields?: unknown; data?: unknown; source?: unknown }`, then a run-time check, then `fields as FieldLike[]` |
| 2 | typed: `const context: RichTextContext = { embed }` — a misspelled key is a compile error here | `isObject(context)`, destructuring, a run-time check, then `embed as EmbedResolver` |
| 3 | an untyped object literal | the same `enter` as route 1 |

Both shipped `enter`s check every member they read and return `null` when one is missing, so a
mismatch between the two descriptions is caught — at run time, as `CannotEnterLanguageError`, not
at compile time.

### What the engine's fixtures do differently

These are the files the audit calls the kernel's coverage of a second host.

- `fixtures/payloadFields.ts` and `fixtures/storyblok.ts` force the starting data to a type and
  never refuse.
- `src/traversal/__tests__/fixtures/prosemirror.ts:68` and `src/traversal/__tests__/fixtures/lexical.ts:62` substitute `() => null` when no embed
  resolver was packed, so a missing resolver silently drops every embedded block. Shown on the
  untouched tree: a walk over prose plus an embedded block, with no resolver, collected only the
  prose and raised nothing.
- One existing test relies on that substitution: `walk.cycleGuard.test.ts:41` enters the
  prosemirror fixture with `{ tree }` and no resolver, because its subject is the cycle guard.
- `fixtures/payloadFields.ts:131` is the one place in the repository where one language packs
  starting data for a **different** language — the fixture host packing `{ tree, embed }` for a
  rich-text format. It always packs the resolver.

### Decisions already recorded that bind this work

| Where | Decision | Bearing on #236 |
|---|---|---|
| `2026-10-20-entering-a-language.task.md:50`, N2 | A language refuses by returning `null` from `enter`, **not** through a separate `accepts?(context): boolean`. Reason: two places that know the shape of the starting data can disagree; one place cannot disagree with itself. The package had already shipped that defect once, between `selects` and `boundary` | #236's path B adds a separate member. It is consistent with N2 only if that member *returns the parsed starting data* and `enter` reads nothing but that — then one place knows the raw shape and the compiler links it to the other. A predicate form would violate N2 |
| same file, `:40`, N1 | No type parameter on `Language` for the id. Reasons: every implementer pays for it while the registry erases it; and `Language` was then a published type, so a required parameter was a breaking change | path B adds a type parameter for the starting data. A default (`= unknown`) keeps it optional, which answers the breaking-change half. The registry still erases it; what makes the erasure safe is that the engine only hands `enter` what the same language's recogniser returned — the guarantee `contract.ts:217` already makes for nodes |
| same file, `:69`, N3 | A throw out of `enter` is wrapped into `CannotEnterLanguageError` with the original on `cause` | any new member that reads the starting data needs the same wrapping |
| `2026-10-21-the-lexical-language.task.md:369` | `Crossing.context` is `unknown` **by design**. The producer annotates its literal as `RichTextContext`; `tree` stays `unknown` on purpose, because only the language that walks it knows its format, so the consumer still narrows | route 2's packing side is already typed by this decision. Extending the same annotation to routes 1 and 3 is the change that touches no contract |
| `2026-11-06-the-crossing-surface.design.md:491`, withdrawal | `PayloadFieldsConfig` — `crossings`, `blocks` — is the only place a crossing is configured | nothing here adds a configuration channel |

### Published or not

Nothing in this map is published. `src/index.ts` exports none of `Language`, `Crossing`,
`ContentCrossing`, `EmbedResolver` or `RichTextContext`; `src/testing/index.ts` exports only the
task-runner invariants; the published plugin option `embeds` is typed with Payload's own `Block`
(`src/plugin.ts:87`), not with any type above.

Several of these types nevertheless carry `@public` in their JSDoc — a leftover from when the engine
was a package of its own. The tag misstates their status, and was what made them look published
on a partial read.

## External dependencies

None. The one external behaviour this relies on is the installed TypeScript checker's treatment of
a method-syntax member: measured on 2026-11-13 with the repository's `tsgo`, a `Language` whose
`enter` takes a concrete starting-data type assigns to the erased registry type, and
`registry.get(id).enter({ context: 42 })` compiles; written as a function-valued property, the same
assignment is refused with `TS2322`.

## Size check

One sentence: make each language's starting-data type declared once and checked where it is read.
Under the zero option below this is four files. Under path B it is twenty-two `Language`
implementations — six with real starting data, sixteen inline test languages — plus the engine's
entry function. Both are one step; neither needs a split.

## Requirements

- R1 (in) The engine stays ignorant of every language's starting data: it neither names nor checks
  the shape of what one language hands another.
- R2 (in) The type of a language's starting data is declared by that language.
- R3 (in) The change builds on the crossing vocabulary that already exists — `Crossing`,
  `ContentCrossing` and the producer-side annotation pattern of `RichTextContext` — and adds no
  parallel mechanism beside them.
- R4 (out) [inferred] A language knowing anything about the languages that hand to it or that it hands to — rests on: the owner asking whether this meant teaching each language the other languages' seams, and the engine's rule that each language publishes only its own crossing entry.
- R5 (in) Every statement this definition makes about the code names the file and line it was read
  from, and each such reference resolves to what it describes.
- R6 (out) A compulsory member through which a language refuses starting data that is not its own. Deferred to the engine's publication (#203), where outside languages first exist.
- R7 (out) [inferred] Any change to the engine's `Language` contract or to `src/traversal/` — rests on: the option the owner selected states that the engine's contract does not change.

### Non-functional scan

- **Performance** — N/A. Path B adds one function call per language activation; the zero option
  adds none.
- **Security / access control** — N/A. No data crosses a trust boundary here.
- **Accessibility** — N/A.
- **i18n** — N/A. This is about how content is walked, not about any user-facing text.
- **Observability** — relevant: `CannotEnterLanguageError` names the language and the address of
  the crossing (`src/traversal/errors/CannotEnterLanguageError.ts`). Whatever option is taken must
  keep both, and must keep a refusal distinguishable from a throw by the presence of `cause`.

## Acceptance Criteria (draft)

| AC | Covers | Criterion | How it is checked |
|---|---|---|---|
| AC1 | R1 | No file the engine ships names a language's starting-data type | `grep -rnE "RichTextContext\|PayloadFieldsContext" src/traversal --include=*.ts \| grep -v __tests__` finds nothing, and `src/traversal/__tests__/depends-on-nothing.test.ts` passes |
| AC2 | R2 | Each shipped language declares its starting-data type once, in its own module, and both the code that packs it and the code that reads it use that one type | a probe that misspells a member at the packing site, and a second that reads a missing member in `enter`; `bun run check-types` reports each as an error |
| AC3 | R3 | No new crossing type or crossing module is introduced | `git diff --stat` over `src/languages/*.ts` and `src/traversal/contract.ts` shows edits to existing files and no new one |
| AC4 | R5 | Every `path:line` in this definition's codebase map resolves to the text it describes | a script printing each referenced line beside its claim, read once |
| AC8 | R1 | The engine is not touched | `git diff --stat -- src/traversal` is empty |
| AC6 | R1, R2 | **Unhappy path** — a shipped language handed foreign starting data still raises `CannotEnterLanguageError` naming itself, with no `cause`; and a language that throws on it raises the same error with the original on `cause` | `bunx vitest run src/traversal/__tests__/entry.contextRefused.test.ts src/languages/payload-fields/__tests__/PayloadFields.refusesForeignContext.test.ts src/languages/payload-lexical/__tests__/PayloadLexical.refusesForeignContext.test.ts` |
| AC7 | R1, R2 | Nothing else in the suite changes behaviour | `bunx vitest run`: 222 files, at least 2616 passed, 9 skipped |

## Open Questions

1. **Which fix, now that production has no route where one language packs for another**
   *[resolved]* — option (c): name each shipped language's starting-data type now; the compulsory
   recogniser goes with #203. AC5, which pinned that recogniser, is withdrawn with R6. #236 chose path B on the strength of a statement that a forgotten embed resolver
   leaves text untranslated in the product. In shipped code it cannot: every starting set is
   packed either by the plugin or by the receiving language itself, the resolver is always supplied
   at `PayloadFields.language.ts:207`, and both shipped `enter`s refuse honestly. The silent drop
   exists only in the engine's fixtures. Three options, each consistent with N1, N2 and the
   2026-10-21 decision:
   - **(a) Path B now.** A recogniser member that returns the parsed starting data, `enter` reading
     only that, the type parameter defaulted. Twenty-two implementations change. Its main payoff —
     a host cannot forget to refuse — arrives when the engine is published, a step the owner has
     just moved out of the next major.
   - **(b) The zero option now.** Each shipped language names its starting-data type, the code that
     packs it annotates the literal with that type — the 2026-10-21 decision extended to routes 1
     and 3 — and `enter` narrows into it. The contract does not change. Four files. Refusal stays a
     `null` from `enter`, as N2 decided.
   - **(c) Path B, scheduled with #203.** Do (b) now if wanted, and take path B together with the
     publication, low priority, after the major.

   Matters because: twenty-two files against four, and an approach whose main payoff is tied to a
   step that has just been deferred.

2. **Path B against N2** *[non-blocking]* — compatible only in the form where the recogniser
   *returns* the parsed starting data and `enter` reads nothing else. A boolean predicate beside an
   `enter` that still casts is exactly what N2 rejected. Recorded so the next skill cannot drift
   into the predicate form.

3. **The fixture that relies on the silent fallback** *[non-blocking]* — `walk.cycleGuard.test.ts:41`
   enters the prosemirror fixture with no resolver. Any change that makes the fixtures refuse a
   missing resolver has to pass `embed: () => null` there explicitly, which is the honest version
   of what that test means.

4. **The `tree` member of `RichTextContext`** *[non-blocking]* — reached only from tests in shipped
   code. If the starting-data type changes shape, whether that member and the refusal at
   `PayloadLexical.language.ts:159` stay is a decision, not a side effect.

5. **`@public` on unpublished types** *[non-blocking]* — misleading, out of scope here. Worth one
   pass of its own before #203, since publication is when the tag would start meaning something.

6. **Route 3 hands the embedded block the same object as source and target**
   *[non-blocking]* — `PayloadFields.language.ts:124`, `source: data`. That is question Q3 of the
   contract-questions document, out of scope here.

7. **Where the type of the walk's first starting data lives** *[non-blocking]* — the starting data
   that begins every walk is packed in `src/core` (`translatableFields.ts:22`,
   `WalkCollector.stage.ts:30`). `src/__tests__/imports-into-languages.test.ts` forbids any shipped
   file under `src/core` from importing `src/languages`, even a type, so that type cannot be
   declared in the Payload fields language's module and used in `src/core`. Two answers fit the
   decision: declare it in `src/core`, beside the shapes it already owns and the languages import
   (`FieldLike` is the precedent), which makes it the core's description of what any host language
   is started with; or leave route 1 as it is and type only routes 2 and 3, where the same language
   packs and unpacks. The first makes R2 hold for the walk's host by the core's rule rather than the
   language's. Decided at design.

### Coverage scan

- **Failure and error states** — answered: a refusal or a throw becomes `CannotEnterLanguageError`
  (N3), pinned by AC6.
- **Empty states** — answered: an empty node list is a valid answer, not a refusal, and is pinned in
  `entry.contextRefused.test.ts`.
- **Boundaries and limits** — none.
- **Permissions** — none.
- **Concurrency, migration, compatibility** — nothing is published, so no outside implementer
  exists today. Compatibility becomes a real constraint at #203; that is the substance of
  question 1.

### Restate check

- *"Starting data"* — what `Crossing.context` carries, read once by the receiving language. Not the
  value at the place of handover, which reaches `enter` separately as `value`.
- *"The engine stays ignorant"* — the engine never names a language's starting-data type, in any
  file it ships. It may still call a member that every language has.
- *"Forgetting to refuse"* — writing an `enter` that never returns `null`. Writing one that returns
  `null` dishonestly is a different failure, and no option here prevents it.

## Risks & Constraints

- The 2026-10-20 decisions N1 and N2 stand unless explicitly re-opened. Any option has to be stated
  against them, not around them.
- `Crossing.context` stays `unknown` (2026-10-21). That is the engine not knowing, which R1 asks
  for.
- The engine's fixtures are its coverage of a second host. Changing what they do changes what is
  covered; it must be deliberate.
- The branch already carries one commit with a different reason, the engine's move. This is a
  second commit on it, by the owner's decision.

## Consistency self-check

- No criterion contradicts R4: AC1 checks the engine names no language's type, and no criterion
  asks a language to name another.
- AC5 holds only under path B, which R6 says.
- AC4 is checkable: the references were resolved once already when this file was written, and the
  same script reruns.
- R4 and R6 are `[inferred]` and each says what it rests on.

## Readiness

- Unresolved `[blocking]` questions: **0**.
- IN requirements without an acceptance criterion: **0**.

Question 7 is a placement choice inside the decided option and is left to the design.

## Decisions by the owner

- 2026-11-13 — decided by the owner: the engine is not taught any language's starting data; the
  language sets it. Recorded as R1 and R2.
- 2026-11-13 — decided by the owner: path B in #236, a language declaring and recognising its own
  starting data, over a global map from language id to type, because the map would give the engine
  knowledge of every language. *Re-opened by question 1*, because the choice was made on an
  overstated premise.
- 2026-11-13 — decided by the owner: the work goes on the branch `feat/translator-the-engine-stands-alone`,
  as a commit separate from the engine's move.
- 2026-11-13 — decided by the owner: name each shipped language's starting-data type now, without
  changing the engine's contract; the compulsory recogniser is deferred to #203, because its payoff
  arrives only when languages written outside this package exist.

Next: sp-task
