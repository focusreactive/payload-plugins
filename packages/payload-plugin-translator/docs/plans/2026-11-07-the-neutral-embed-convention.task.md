# The neutral embed convention

Build step: 2026-11-06-the-crossing-surface.design.md #1

One concept — "which language owns this embedded node?" — exists twice, in two signatures that
cannot be exchanged. The shipped one is spelled in Payload's vocabulary, and the second host in the
test suite wrote its own copy rather than adopt it. That is the evidence the vocabulary is wrong,
not the duplication: a convention owned by one participant cannot serve a second.

## Requirements / Task restatement

- R1 (in) One embed-resolution signature in the package, taken by every host that answers and every
  format that asks.
- R2 (in) Its vocabulary belongs to neither participant: not the host's editor-list names, not any
  format's node-type names.
- R3 (in) A format that cannot name its embed does not ask; a host that cannot place an unflowed
  embed answers `null` rather than guessing.
- R4 (in) The kernel's test fixtures take the real convention, and the direction that makes that
  safe is enforced mechanically rather than remembered.
- R5 (out) The rename of the shipped rich-text language to `PayloadLexical` — build step 2.
- R6 (out) Whether a crossing entry carries its own language id — build step 3, and its recorded
  motivation no longer holds.
- R7 (out) Any change to what text is found, how it is addressed, or how a crossing is placed.

## What already exists — platform · installed · project · verdict

- **Project.** The shipped rich-text language already performs the real mapping this step needs:
  `embedOf` turns a node type into a kind and guards a missing name. The work is to retarget it,
  not to invent it.
- **Project.** `depends-on-nothing.test.ts` is the precedent for the guard R4 asks for — a scan of
  import specifiers across the kernel's shipped files, with `__tests__` excluded. The new rule is
  the same shape over a different edge.
- **Platform / installed libraries.** Nothing here is a library's job; no search.

Verdict: no new abstraction beyond the convention the design already decided. One new test file.

## Decisions

D1–D3 are adopted from the design's D3 and are not reopened here: the signature takes one
`EmbedIdentity { name, flow?, data }`; `EmbedFlow` is `"block" | "inline"`; `name` is required and
`flow` is not. What follows is what this step had left to decide.

### D1. `EmbedKind` is deleted, not relocated

The host keeps two lists and maps `EmbedFlow` onto them where it reads them. `"block" | "inlineBlock"`
names Payload's editor lists, which is the defect; moving that union into a shared file would keep
it and only change its address.

- *Rejected — keep `EmbedKind` as the host's own internal union.* It would survive as a second
  spelling of a two-valued thing one function already maps, and the next reader would have to learn
  which of the two any given site means.

### D2. The convention file is named for the concept, not for one of its users

`src/languages/embedCrossing.ts` replaces `src/languages/richTextCrossing.ts`. The old name claims
the convention belongs to rich text; it belongs to the pairing. `ContentCrossing` is already named
this way in the same folder, so the shape is the folder's own.

### D3. `RichTextContext` moves to the format that builds and reads it

It is not part of the convention — it is what one format's crossing entry puts in a context and
that same format's `enter` takes out. Both sites are in `Lexical.language.ts`. Leaving it in the
shared file is what let the shared file look like rich text's property.

- *Rejected — leave it where it is.* It is the reason the old file could be named for rich text
  at all, and the design's R2 is that the convention names no participant.

### D4. A format guards the name; the resolver no longer has to

`name` is required, so the kernel's Lexical fixture must check its node carries one before asking,
exactly as the shipped language already does. Today it passes `undefined` through and the behaviour
is correct only because a `Map` lookup on `undefined` misses.

That is the whole of R3's first half, and it is a strictly better place for the check: a format
knows what a nameless node means in its own format, and a host does not.

### D5. The direction is enforced by a scan, not by a convention

A new test asserts that every import from `src/core/**` into `src/languages/**` is `import type`
and lives under `__tests__/`. Without it, the first non-type import reverses the dependency
direction the package is built on and nothing says so.

- *Rejected — a lint rule in the `src/core` zone.* The existing zone config bans packages, not
  relative paths into a sibling; expressing "type-only, and only under `__tests__`" there is more
  configuration than a nine-line scan, and the scan is already the precedent next door.

### Placement

| Piece | Lands in | Why there |
|---|---|---|
| `EmbedFlow`, `EmbedIdentity`, `EmbedResolver` | `src/languages/embedCrossing.ts` | the convention, owned by neither side |
| `RichTextContext` | `src/languages/Lexical.language.ts` | built and consumed only there |
| flow → list mapping | `src/languages/PayloadFields.language.ts` | the lists are the host's |
| node type → flow mapping | `src/languages/Lexical.language.ts`, in `embedOf` | the node types are the format's |
| the direction scan | `src/core/traversal/__tests__/imports-into-languages.test.ts` | it guards the kernel's edge |

New surface: `EmbedFlow` and `EmbedIdentity`, with two callers each already in the codebase — the
two shipped languages, and the four kernel fixtures. Shape-check triggers fired: a new optional
member (`flow?`) and a parameter object replacing three positional parameters; both were compared
against their alternatives in the design's D3.

Escalate? No — this is build step 1 of a design that already decided it.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R1 | One embed-resolution signature in the package | `grep -rn --include='*.ts' "^export type EmbedResolver" src \| wc -l` | prints `1` |
| AC2 | R1 | The kernel's private copy is gone | `test -f src/core/traversal/__tests__/fixtures/embed.ts` | exits non-zero |
| AC3 | R2 | The convention file is named for the concept | `test -f src/languages/embedCrossing.ts && test ! -f src/languages/richTextCrossing.ts` | exits 0 |
| AC4 | R2 | The convention names no participant's vocabulary | `grep -c "inlineBlock\|richText\|lexical\|Lexical" src/languages/embedCrossing.ts` | prints `0` |
| AC5 | R2, D3 | The rich-text context lives with its format | `grep -c "export type RichTextContext" src/languages/Lexical.language.ts` | prints `1` |
| AC6 | R3 | A format cannot ask about an embed it cannot name, and a node it cannot name yields no crossing while its siblings still walk | `bun run check-types` with the guard removed from the kernel's Lexical fixture, plus `bunx vitest run src/languages/__tests__/Lexical.embeddedBlock.test.ts src/core/traversal/__tests__/crossing.embeddedBlock.test.ts` | the mutant does not type-check; both suites exit 0 |
| AC7 | R3 | A two-list host answers `null` for an embed with no flow rather than guessing a list | a new test pairing a one-list format with the shipped host | exit 0, the case runs |
| AC8 | R4 | Every `src/core/**` → `src/languages/**` import is type-only and under `__tests__/` | `bunx vitest run src/core/traversal/__tests__/imports-into-languages.test.ts` | exit 0, and it has files to scan |
| AC9 | R4, R7 | The kernel's fixtures still exercise their cases | `bunx vitest run src/core/traversal` | 21 files or more, 73 cases or more, no failures |
| AC10 | R7 | Nothing already passing breaks, and every case the count moves by is accounted for | `bunx vitest run` | 219 files, 2622 passed, 9 skipped, and the delta reconciles as below |
| AC11 | — | No new type errors | `bun run check-types` | exit 0 |
| AC12 | — | No new lint findings | `bunx oxlint .` | 34 warnings, 0 errors |
| AC13 | — | Both apps still type-check against the package | `bunx turbo run check-types --force` from the repo root | 9 successful, 9 total |

## Pre-flight

Each check run against the untouched tree, before anything was written.

| AC | Command | Result | Kind |
|---|---|---|---|
| AC1 | the grep above | prints `2` | change — must fail now, and does |
| AC2 | the test above | exits 0, the file is there | change — must fail now, and does |
| AC3 | the test above | exits non-zero, `embedCrossing.ts` absent | change — must fail now, and does |
| AC4 | the grep above, against `richTextCrossing.ts` | prints `1` | change — must fail now, and does |
| AC5 | the grep above | prints `0` | change — must fail now, and does |
| AC8 | the suite above | the file does not exist | change — must fail now, and does |
| AC9 | `bunx vitest run src/core/traversal` | 21 files, 73 passed | invariant — passes now |
| AC10 | `bunx vitest run` | 217 files, 2614 passed, 9 skipped | invariant — passes now |
| AC11 | `bun run check-types` | exit 0 | invariant — passes now |
| AC12 | `bunx oxlint .` | 34 warnings, 0 errors | invariant — passes now |
| AC13 | `bunx turbo run check-types --force` | 9 successful, 9 total | invariant — passes now |

AC6's existing half passes now; its new kernel case cannot be pre-flighted against a convention that
does not exist yet. AC7 is the same.

### The case count, reconciled

The suite goes from 217 files / 2614 cases to 219 / 2622. Every one of the eight is accounted for,
because an unexplained case is how a silently removed test looks:

| Where | Cases | Why |
|---|---|---|
| `crossing.embeddedBlock.test.ts` | +1 | an embed whose node cannot be named |
| `Lexical.embeddedBlock.test.ts` | +1 | a node type that names a member every object inherits |
| `crossing.storyblok.test.ts` | +1 | an embedded component that names no type |
| `PayloadFields.embedFlow.test.ts` | +3 | new file: the one-list format against the two-list host |
| `imports-into-languages.test.ts` | +3 | new file: the direction guard |
| `no-payload-boundary.test.ts` | **−1** | it parametrises over every non-test `.ts` under `src/core`, including those inside `__tests__`, and this step deletes one of them |

## Risk notes

Classified **high**: seven files import the convention, two of them shipped languages, and the step
deliberately reverses a dependency direction in the kernel's fixtures. Accordingly the new cases
are written before the change is called done, the regression sweep names what was grepped and how
many call sites were read, and the diff gets several review angles.

- The behaviour that must not move is what a nameless embed does. Today it yields no crossing by
  accident — a `Map` lookup on `undefined` misses. After the change the format must guard instead.
  Measured: removing that guard leaves every test green and fails `check-types`, because `name` is
  required. The type owns the guard and the suite owns the consequence, which is the right division
  and is what AC6 now states — an earlier draft of it claimed a test held both.
- The one-list format against the two-list host is a new reachable state. The design records it as
  a consequence rather than a defect; it needs a case that pins the answer as `null`, so that a
  later "helpful" default cannot be added silently.
- The kernel fixtures are coverage, not examples. Two model hosts and two model formats; a change
  that collapses what any of them exercises removes coverage and the case counts are what show it.

## Review

Filled by the verification pass; the run log lives beside this file.

## Decisions by the owner

2026-11-07 — decided by the owner: work the build sequence autonomously, taking the optimal
decision at each fork rather than stopping to ask, and commit nothing.
