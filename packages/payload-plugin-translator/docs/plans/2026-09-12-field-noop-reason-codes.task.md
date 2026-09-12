# A machine-readable reason on a field-translation noop

Branch `test/translator-field-surface-coverage`, off `feat/translator-container-mode` (PR #139) · 2026-09-12

## Requirements / Task restatement

`POST {basePath}/field` answers `200` with `status: "noop"` when it will not translate a
field. Which of several unrelated situations produced that answer is knowable only from a
sentence written for a human — and two of the situations share that sentence **word for
word**. Neither the admin control nor a test can tell "this field is empty" from "this
field opted out of translation".

Give the notice a machine-readable `reason` alongside its human `message`.

## What Phase 1 found, including a correction

**There are five noop branches, not the six the brief assumed.** "The field is empty in
the source locale" is not its own branch: an empty value resolves normally,
`translateContent` returns `null`, and it lands in the same branch as "the subtree held
nothing translatable".

| # | Branch | level | message today |
|---|---|---|---|
| 1 | `inside-blocks` | info | "Couldn't resolve the block for this field in the source document" |
| 2 | `localized-list-ancestor` | warning | "This field is inside a localized block — translate the whole document instead…" |
| 3 | `not-translatable` | info | **"Nothing to translate in this field"** |
| 4 | `excluded` | info | "This field is excluded from translation" |
| 5 | `!translated` (after `translateContent`) | info | **"Nothing to translate in this field"** |

Rows 3 and 5 are byte-identical. Four of the five share `level: "info"`.

**The distinction exists and is thrown away one step before the boundary.**
`resolveFieldSubtree` returns five named statuses, and its own docblock already records
the intent: `excluded` is *"Kept distinct from `not-translatable` so the notice can say
**why** (a deliberate opt-out, not a wrong type)"*. The handler then collapses five names
into two levels and four strings. This task finishes a job the code started.

**The "non-localized translatable field" gap the brief asked about is not a defect.**
`resolveFieldSubtree` judges translatability by type alone, so such a field resolves; the
core's `isTranslatableLeaf` then rejects it because it is not localized, `translateContent`
returns `null`, and it lands in branch 5. Nothing is translated and nothing is overwritten.
What is wrong is only the sentence: a field full of text is told "nothing to translate".

**Precedent:** `TranslationFailureCode`
(`src/translation-providers/shared/errors/TranslationProviderError.ts`) — a kebab-case
string-literal union declared beside the thing that reports it, with the human message
kept separate. The same idea, one floor down.

**Blast radius:** the notice type (not exported from `src/index.ts`), the `noop` helper and
five branches in `handler.ts`, one consumer (`TranslateFieldControl.tsx`, which reads
`level` and `message` and nothing else), 7 unit assertions and 18 integration checks.

**Risk: low** — one module, no data at stake, no public surface, strong existing coverage.
Consequences: one reviewer in Phase 5b rather than three; the regression sweep is done but
not ceremonially evidenced; a test is still required, because observability is the whole
deliverable.

## Decisions

### D1 — the reason is a string union on the wire type, not a class hierarchy

**Chosen:** `FieldTranslationReason`, a kebab-case string-literal union declared in
`src/types/wire/field-translation.ts` beside `FieldTranslationNotice`, which gains
`reason: FieldTranslationReason`.

**Rejected — a class per reason carrying a `code`, mirroring `TranslationProviderError`.**
That precedent's shape exists because those are *thrown* — a class is how a throwable
carries structured data through a `catch`. These are `200` responses whose value travels
as JSON in a body, so the class machinery buys nothing and costs five files.

**Rejected — reuse `FieldSubtreeResolution`'s status names directly as the wire reason.**
Two constraints kill it: branch 5 is produced *after* resolution and has no resolver
status at all, so the union could not cover it; and it would pin a wire format to the
vocabulary of an internal helper, so renaming a resolver status would be a breaking wire
change.

**Constraint cited:** the precedent's *idea* is "a stable kebab-case code beside the human
message"; its *implementation* is shaped by being throwable. Following the idea rather
than copying the machinery is what keeps this one union instead of five classes.

### D2 — one reason per existing branch, and no new branches in this task

**Chosen:** five reasons, one per branch as they stand. No condition is added, no
behaviour changes: the same request gets the same status, the same `level` and the same
`message` as before, plus a `reason`.

**Rejected — split branch 5 into three (`empty-source`, `not-localized`,
`nothing-translatable`).** Each names a genuinely different situation an editor meets, and
both predicates already exist (`isEmpty` in `src/core/kernel/utils/isEmpty.ts`,
`isLocalizedField` in `src/server/shared/guards/field-guards.ts`), so it is cheap. But it
is *new behaviour*, not observability: today the code does not make those distinctions, and
making them is a separate decision about what an editor should be told. Raised at the gate
as its own question rather than folded in silently.

**Constraint cited:** the stated problem is "five of six are indistinguishable", and five
codes on five branches solves exactly that. Anything beyond it is a second feature wearing
this one's clothes.

### D3 — `message` stays, unchanged

**Chosen:** `reason` is added; every existing `level` and `message` is left byte-identical.

**Rejected — replace the message with a code and let the client compose the text.** The
admin control renders `message` directly today, so removing it would require a matching
client change in the same commit, turning a server task into a two-surface one. The two
identical messages stay identical: `reason` is what tells them apart, and rewording is a
copy decision nobody has made.

### Placement

`src/types/wire/field-translation.ts` (the union + the field) and
`src/server/features/translate-field/handler.ts` (the `noop` helper's signature and its
five call sites). Nothing else changes.

### New surface

One type, `FieldTranslationReason`, in a file that is not exported from the package index.
Callers: the `noop` helper, and the tests that assert it. Not a public API addition, so
the package's `@since` rule does not apply — verified: `src/index.ts` re-exports neither
`FieldTranslationNotice` nor `FieldTranslationResult`.

### Written contract?

The behavioural contract for this surface was written in the previous task, as a docblock
above `TranslateFieldHandler`. **It must be corrected here**: its table lists six
situations where the code has five, and it names "the field holds nothing in the source
locale" as its own row. That correction ships with this change.

### Escalate to architecture?

No. One module, one file pair, no new pattern, no data-model change.

## Acceptance Criteria

| # | Criterion | How it is checked | Passes when |
|---|---|---|---|
| 1 | Each of the five noop branches answers with its own `reason` | new cases in `src/server/features/translate-field/handler.test.ts`: `bunx vitest run src/server/features/translate-field` | green, and red before the change (the field does not exist) |
| 2 | The two branches sharing a message word for word are told apart by `reason` | same file: one case asserting `not-translatable` and one asserting the branch after `translateContent`, both with the same `message` and different `reason` | green; red if both branches are given the same reason |
| 3 | Every existing `level` and `message` is unchanged | the 7 notice assertions already in `handler.test.ts`, plus the 18 integration checks | all still green, none edited to fit |
| 4 | The integration specs assert the reason rather than "some string" | `apps/dev`: `bun run test:integration -- translator/field-surface-` | green, and red before the change |
| 5 | Nothing already passing breaks | `bunx vitest run` (package) · `bun run test:integration` (apps/dev) · `bun run check-types` · `bunx ultracite check packages/payload-plugin-translator/src apps/dev/src/integration/translator` · `bunx turbo run build --filter='./packages/*'` | 1491 unit · 29 files/130 integration · types clean · 58 warnings 0 errors · 8 packages build |
| 6 | The admin control keeps working on the wider notice | `bun run check-types`, and read `TranslateFieldControl.tsx` to confirm it reads `level`/`message` only | compiles; the file needs no edit |
| 7 | The behavioural contract matches the code | read the docblock above `TranslateFieldHandler` | five situations, not six; no row claiming "empty source" is its own branch |

## Pre-flight

Run against the untouched tree, 2026-09-12, before any edit.

| # | Command | Result | Class |
|---|---|---|---|
| 1, 2, 4 | `grep -rn reason src/types/wire/field-translation.ts` | **no match** | change — fails now: correct polarity |
| 3, 5 | `bunx vitest run` | **1491 passed** | invariant — passes now |
| 3, 5 | `bun run test:integration` | **29 files, 130 passed** | invariant — passes now |
| 5 | `bun run check-types` | 5 tasks successful | invariant — passes now |
| 6 | `TranslateFieldControl.tsx:114-115` reads `notice.level` and `notice.message` | confirmed by reading | invariant |
| 7 | the docblock lists six situations | it does | change — fails now: correct polarity |

## Risk notes

- **Two identical messages stay identical.** After this change the only thing telling rows
  3 and 5 apart is `reason`. That is the point, but it means a future reader comparing
  messages will still see a duplicate and may "tidy" one away. The reason codes are what
  the tests assert, so such an edit would be caught.
- **The contract correction is the second time this table has been written.** It was
  written from the branches in the previous task and got the count wrong; it is being
  rewritten from them again. If it is wrong twice, the table is the wrong instrument and
  the branches should carry the documentation directly.
- **Uncommitted work from the previous task shares this tree** — the behavioural contract
  and three integration spec files. Whether it is committed first is a gate question.

## Human choices

- **2026-09-12** — the owner approved adding a machine-readable reason and asked for it to
  follow the existing code-taxonomy precedent rather than a fourth mechanism.
- **2026-09-12, at the gate** — asked whether to split branch 5 into three (empty source /
  not localized / nothing translatable inside): **codes only, branches untouched**. The
  split is a separate task; this one changes no behaviour.
- **2026-09-12, at the gate** — the previous task's work (the behavioural contract and three
  integration spec files) is committed on its own **before** this change, so the two diffs
  do not mix. The contract is committed as it stands, with its six-row table; correcting it
  to five is criterion 7 of this task.

## Review log

### 2026-09-12 · phase 5

- **Checks:** `bunx vitest run` → 1492 passed (was 1491; one new case) · `bun run test:integration`
  → 130 passed, 29 files · `bun run check-types` → 5 tasks successful ·
  `bunx ultracite check` over the package and the integration suite → 58 warnings, 0 errors, the
  main branch's level · `bunx turbo run build --filter='./packages/*'` → 8 tasks successful.
- **Gates:** sp-diff-checks clean (5 checks, no findings); sp-lint-delta mode=two-run, **no findings
  introduced**.
- **Reviewers:** one (`full`), the count Phase 1's low-risk classification calls for. One minor
  finding, fixed: the integration spec's header comment and `describe` title still said "six" while
  the same diff corrected that count in the handler's docblock — two disagreeing counts one file
  apart is exactly what criterion 7 exists to prevent.
- **Criteria:** 7 met · 0 partial · 0 not-run · 0 not met.
- **Left open:** splitting branch 5 into three (empty source / not localized / nothing translatable
  inside), declined at the gate as new behaviour rather than observability. Both predicates already
  exist, so it stays cheap whenever it is wanted.
- **Pin:** `e66925f8d789`.

#### What the green run turned up

One integration check failed on correct code, and it was a finding rather than a defect. Its
fixture named a `group` whose only leaf is excluded and expected `nothing-translatable`; the code
answered `not-translatable`, because `resolveFieldSubtree` judges a container by its own type
before anything walks inside it. The blind author of that spec had predicted exactly this
ambiguity and reported it as a place the contract was silent. The reason codes made it visible on
the first run. The check was renamed to say what it actually pins, its expectation corrected, and
the rule written into the contract — the resolver was not touched, and a reviewer confirmed that
independently from the file's history.
