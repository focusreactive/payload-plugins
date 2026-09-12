# Container-granular rich text on the per-field surface

PR #139 (issue #134) · branch `feat/translator-container-mode` · 2026-09-12

## Requirements / Task restatement

Manual verification of container mode against a live model found that the per-field
translate control never uses it. `createFieldRoute` accepts `inlineMarks` in its argument
type and does not forward it to the handler, so `translateContent` is always called with
`undefined` and always takes the per-node path. One of the plugin's three translation
surfaces silently ignores the option the release announces.

Four things follow from that, and a fifth rides along because the release is the one that
introduces the mode and should introduce it in the state we want to live with:

1. Forward the flag (the defect).
2. Make omitting it a compile error rather than a silent fall-back to the old path.
3. Cover the per-field surface with marks in the integration suite — nothing did.
4. Document the option in the README.
5. Measure whether the mark instruction in the system prompt can be improved, on the
   axis the live run showed to be weak.

### Evidence for the defect

Probed with the local stub, which reverses mark order, so the two modes are
distinguishable without a model:

| Surface | flag `1` | flag `0` |
|---|---|---|
| `POST /translate/field` | order unchanged | order unchanged |
| document translation | order reversed | order unchanged |

The document path forwards the flag (`wireTranslateRunner.ts:55`); the field path drops
it (`route.ts:18-24`).

## Decisions

### D1 — `inlineMarks` becomes required on the shared config context, not just on the field feature

**Chosen:** `readonly inlineMarks: boolean` on `TranslationContext`
(`server/modules/translation-levels/types.ts`) and on `FieldTranslationConfig`
(`server/features/translate-field/model.ts`), which `CreateFieldRouteArgs` derives from.

**Rejected — require it only on `FieldTranslationConfig`.** That makes `createFieldRoute`
forward it, but `fieldLevel.ts` passes `ctx.inlineMarks`, which stays `boolean |
undefined`, so the level would have to write `?? false` — the same silent default, moved
one frame up, and the next reader would have no way to tell the coercion from a real
decision.

**Constraint cited:** `plugin.ts:163` computes `experimental?.inlineMarks === true`, which
is always a definite boolean. The optionality described a state the system cannot be in.
A type that admits an impossible state is what turned a dropped argument into a working
build.

**Rejected — tighten `wireTranslateRunner` and the document handler in the same pass.**
They carry the same `= false` default. They are wired correctly and each has one caller,
so changing them is a refactor of code the defect never touched. Handled as the Phase 4
same-class sweep instead, where the evidence for acting is gathered rather than assumed.

### D2 — the guard is the type plus an integration spec, not a unit test at the seam

**Chosen:** the required field makes *this* defect a build error; the integration spec
proves the whole path from HTTP body to translated value.

**Rejected — a unit test asserting `createFieldRoute` forwards the flag to the handler.**
With D1 in place it can no longer fail, so it would assert what the compiler already
guarantees; and it would not have caught a handler that accepted the flag and ignored it,
which is the failure one frame further along.

**Constraint cited:** every existing mark suite drives the plugin through
`callEndpoint(payload, method, path, body)` against a booted Payload
(`apps/dev/src/integration/translator/callEndpoint.ts`). The per-field surface is an HTTP
endpoint on the same config, so it is reachable by the same precedent — no new harness.

### D3 — item 5 is a measured probe, not a rewording

`buildSystemPrompt.ts` carries an explicit constraint above the instruction:

> Wording validated against 396 live translations (French, German, Japanese × four
> models) before it shipped: the fallback rate was ~1% on gpt-4o and zero on newer
> models. Reword it only with the same measurement in hand.

The budget for this task is 4–5 live runs of one ten-paragraph document, one model, one
language. That is not the same measurement and cannot be made into one here.

**Chosen:** try variants, measure two axes, and change the wording only if mark integrity
stays perfect in the sample *and* the target axis clearly improves. Whatever ships records
in the docblock what it was actually measured against, so the next reader is not misled
into thinking the new line carries the old evidence.

- **Validated axis** (the one the warning protects): every mark returned exactly once, no
  duplicated or lost words, no container falling back to its source text.
- **Target axis** (what the live run showed to be weak): German word order actually
  corrected, and emphasis covering the same extent as the source.

**Rejected — reword to whatever scores best on ten sentences.** The axis the warning
protects is the one whose failure costs a user their content; the axis being improved is
one whose failure costs a clumsy sentence. Trading the first for the second on a
forty-times smaller sample is the wrong direction.

**Rejected — skip item 5.** The gap is real and was observed: the instruction already
permits reordering and the model took it in five paragraphs out of ten.

**Measurement hygiene:** the sandbox provider gets `sampling: { temperature: 0 }` for the
run, so variants differ by wording rather than by sampling. Dropped if the model rejects
the parameter.

### Placement

Everything lands in files that already exist: `route.ts`, `model.ts`, `types.ts`,
`route.test.ts`, `bootTestPayload.ts`, a new spec beside the other mark specs, `README.md`,
`buildSystemPrompt.ts`.

### New surface

None. No new abstraction, no new module, no new dependency.

### Written contract?

No unit here owes callers anything its signature cannot state once `inlineMarks` is
required. Items 1–3 are one bug fix, so Phase 3 takes the bug-fix path: the test goes red
against the broken code, never against a stub.

### Escalate to architecture?

No. One module, no new pattern, no data-model change, no migration.

## Acceptance Criteria

| # | Criterion | How it is checked | Passes when |
|---|---|---|---|
| 1 | With the mode on, a per-field translation of rich text returns marks the translation reordered | new spec, `apps/dev`: `bun run test:integration -t "field surface"` | green, **and red on the pre-fix code** |
| 2 | With the mode off, the same call keeps source order | same spec | green, and the two cases differ |
| 3 | A provider that does not declare the capability keeps the per-node path on this surface, even with the mode on | same spec | green; red if the capability gate is removed |
| 4 | Building the field route without the flag is a compile error | delete the argument at `fieldLevel.ts:35`, run `bun run check-types`, restore | the run names `fieldLevel.ts`; clean again after restore |
| 5 | Nothing already passing breaks | `bunx vitest run` (package) · `bun run test:integration` (apps/dev) · `bun run check-types` · `bun run lint` · `bunx turbo run build` | 1491 unit · 22 files/108 integration · types clean · lint 58 warnings 0 errors · build passes |
| 6 | The README documents `experimental.inlineMarks` with its version | read the config table in `README.md` | a row naming the option, its default, and `Since v0.13.0` |
| 7 | The shipped prompt wording loses nothing on the validated axis | live run of article "Word order" (10 paragraphs) into German, compared leaf by leaf against the English source | every mark present once, no duplicated or lost word, no container left in source language |
| 8 | The prompt decision is made on measurement, not impression | the same live runs, one per variant, recorded in this file | a table of variants × both axes, and a stated choice |

Criteria 7 and 8 can only be witnessed against a running sandbox and a live model. That is
a fact about them, recorded here rather than discovered at grading time.

## Pre-flight

Run against the untouched tree on 2026-09-12, before any edit.

| # | Command | Result | Class |
|---|---|---|---|
| 1–3 | spec does not exist yet | — | change — must be red on current code when written |
| 4 | `bun run check-types` | 5 tasks successful, clean | change — a call without the flag compiles today, so the criterion fails now: correct polarity |
| 5 | `bunx vitest run` | **1491 passed** | invariant — passes now |
| 5 | `bun run test:integration` | **22 files, 108 tests passed** | invariant — passes now |
| 6 | `grep -c experimental README.md` | **0** | change — fails now: correct polarity |
| 7–8 | baseline captured before this task from a live run of the same fixture | container mode: 5/10 correct German order, 0 duplicated, 0 lost, emphasis boundaries drift; per-node mode: 2/10 correct, 3 paragraphs with duplicated words | change — the baseline is a recorded observation, not an invented value |

## Risk notes

- **`TranslationContext` is shared.** `PluginConfigBuilderDeps` is it exactly;
  `StalenessConfig` and `TranslationRoutesDeps` derive by `Pick`/`extends`. Making a field
  required ripples to every constructor of those, including three test files. This is why
  the task is classified high risk.
- **The prompt is the one change no test can grade.** A wording that scores better on ten
  German sentences can be worse in Japanese or on another model. D3's asymmetry rule is
  the mitigation; the residual risk is accepted and recorded rather than removed.
- **Sample size.** Ten paragraphs, one model, one language, one run per variant. Enough to
  reject a clearly worse wording; not enough to certify a better one. Any change ships
  labelled with exactly that.
- **`importMap.js`** is regenerated by a running dev server and loses the analytics
  plugin's components on a machine without GA4 credentials. Reverted before every commit;
  it is a record of the environment, not a change.

## Human choices

- **2026-09-12** — the owner stepped away and instructed: no questions at the design gate,
  take the optimal decision, record it here, continue through all five items. Commits are
  allowed; pushing to the shared repository is not, until the owner returns.
- **2026-09-12** — the owner asked for the prompt work to try several wordings and to aim
  at "the minimum of model invention", while sparing the API budget (4–5 live runs total).
  D3 is the reading of that instruction against the constraint already recorded in
  `buildSystemPrompt.ts`.

## Review log

_(empty — appended by review passes)_
