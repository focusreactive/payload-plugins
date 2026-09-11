# Task — wiring container mode into the pipeline (#134, step 2)

- **Design:** [2026-09-08-richtext-container-granularity-design.md](./2026-09-08-richtext-container-granularity-design.md) — D1–D22 settled
- **Step 1 (done):** [2026-09-08-richtext-container-granularity.task.md](./2026-09-08-richtext-container-granularity.task.md) — the two pure modules, review log, live-run results
- **Date:** 2026-09-09 · **Risk:** HIGH · **Scope:** build-sequence steps 3, 4, part of 5, and 8

---

## Why the risk is high

`TranslationMutator` is the write path of **every** translation this plugin performs. A defect
here does not fail loudly — it writes a wrong tree into a customer's document. Consequences
downstream: three review angles instead of one (Phase 5b), an evidenced regression sweep
(Phase 4), and a criterion proving byte-identical output while the flag is off.

## What this step builds

| Piece | Where |
| --- | --- |
| `RichContainerChunk` + guard | `src/core/translation-pipeline/types/TextChunk.ts` |
| Parsed fragments in the shared context | `src/core/translation-pipeline/types/PipelineContext.ts` |
| Parse + verify the reply | `.../stages/translation/Translation.stage.ts` |
| Rebuild `children`, with the D5 fast path | `.../stages/translation-applicator/TranslationMutator.ts` |
| `RichContainerExpander`, delegating to `RichTextExpander` on D3/D6 | `.../stages/text-expander/` |
| Expander list chosen by the flag | `translateContent.ts` → `TranslationPipeline` |
| `experimental.inlineMarks` flag | `src/plugin.ts`, threaded to the handlers |
| Mark instruction appended after any override | `src/translation-providers/shared/buildSystemPrompt.ts` |
| `capabilities.inlineMarks` | `src/core/domain/translation-providers/TranslationProvider.interface.ts`, declared by the OpenAI provider |
| Deprecation entry | `docs/DEPRECATIONS.md` |

**Out of scope:** D7 (per-container retranslation) and D22 (circuit breaker) — next step. Until
then a corrupt reply leaves that container untranslated, which is acceptable behind a flag that
is off by default. Changing the default model is a separate task.

## Implementation decisions

| # | Decision | Rejected alternative | Constraint it cites |
| --- | --- | --- | --- |
| W1 | The flag reaches the core as a boolean on `translateContent`; the core assembles the expander list | Handlers pass `textExpanders` themselves | An adapter must not know the expander classes. `TranslationPipeline.textExpanders` already exists and stays for tests |
| W2 | `RichContainerExpander` takes `RichTextExpander` as a fallback and delegates inside `expand` | `canExpand` returns false so the next expander in the list runs | `canExpand(chunk, value)` cannot answer without walking the tree, so the walk would run twice — once to decide, once to expand |
| W3 | The reply is parsed and verified in the **translation stage**, which puts fragments into the shared context; the applicator reads them | Parse inside the applicator | Owner's call, 2026-09-09. Step 3 (D7) retranslates a corrupt container, which needs the provider — the applicator has no access to it, so parsing there would have to move a step later |
| W4 | Public flag is `experimental?: { inlineMarks?: boolean }` | A flat `richTextInlineMarks?: boolean` beside `provenance` / `targetSelection` | Owner's call, 2026-09-09: a nest says "do not build on this" more plainly than a JSDoc tag, even though the project has no such nest yet |
| W5 | The mark instruction is appended to whatever `systemPrompt` returns, and its wording is the one the live run validated | Compose it into `defaultPrompt` | `buildSystemPrompt.ts:39-41` returns the builder's string whole, so a builder ignoring `defaultPrompt` would silently drop the rule the format depends on. The wording was proven on 396 translations |

**New surface:** `RichContainerChunk` (callers: the expander and the applicator, both in this step);
`RichContainerExpander` (caller: the expander list); `capabilities` on the provider port (callers:
the OpenAI provider and the core's mode decision). No speculative seams.

**Written contract:** the applicator owes callers that a container's `children` end up in the
reply's order, that the fast path leaves the original node objects in place, and that a corrupt
reply leaves the tree untouched. That is what puts the new units on the red-test path.

**Escalate to /sp-architect?** No — the design is decided in the companion document and W3/W4 were
settled by the owner at this gate.

## Acceptance criteria

| # | Criterion | How it is checked | Passes when |
|---|---|---|---|
| 1 | Flag off ⇒ output byte-identical to the captured baseline (per-node translation, structure intact) | new test asserting the recorded baseline: `['[Buy ]','[our product]','[ today]']` and `['[Read the ]', link(['[documentation]']), '[ first]']` | exit 0 |
| 2 | Flag on ⇒ a formatted paragraph is sent as one marked string | test on `textMap` | exit 0 |
| 3 | Reply with reordered marks rebuilds `children` in the reply's order | test on the resulting tree | exit 0 |
| 4 | Reply in the original order takes the fast path — the original node objects are still in the tree | test asserting object identity | exit 0 |
| 5 | Mark-shaped source text (D3) falls back to per-node with the flag on | test | exit 0 |
| 6 | A single-fragment container (D6) falls back to per-node with the flag on | test | exit 0 |
| 7 | **Negative path:** a corrupt reply leaves that container untranslated and the tree unmodified | test | exit 0 |
| 8 | The mark instruction survives a `systemPrompt` that ignores `defaultPrompt` (D11) | test on `buildSystemPrompt` | exit 0 |
| 9 | **Negative path:** a provider without `capabilities.inlineMarks` stays per-node even with the flag on (D9) | test | exit 0 |
| 10 | D20 holds — per-node walk, leaf text notion and provenance path untouched | `git diff --stat` over those paths | empty |
| 11 | No existing test breaks | `bun run test` | ≥ 1442 pass, 0 fail |
| 12 | Types and lint clean | `bun run check-types`; `bun run lint` | exit 0; ≤ 58 warnings, 0 errors |
| 13 | The flag is registered as deprecated | `grep` in `docs/DEPRECATIONS.md` | entry present |

### Pre-flight (untouched tree, 2026-09-09)

| # | Polarity | Result now |
|---|---|---|
| 1 | must PASS after the change; **baseline captured now** | Baseline recorded from the current code via scratchpad `baseline.ts`, output in `baseline-output.json` |
| 2–9 | must FAIL now | FAIL — no container mode, no flag, no capability, no mark instruction |
| 10 | must PASS now | PASS — empty diff |
| 11 | must PASS now | PASS — 1442 tests green |
| 12 | must PASS now | PASS — types clean; lint 58 warnings / 0 errors (recorded baseline) |
| 13 | must FAIL now | FAIL — no entry |

## Risk notes

- The fast path (D5) exists to keep today's behaviour for most content. If its "same order"
  test is wrong in the lenient direction, trees get rebuilt when they need not be — cosmetic. In
  the strict direction, nothing is ever rebuilt and the feature is inert. Criterion 4 asserts
  object identity precisely to pin this.
- A corrupt reply must never half-write a container. Criterion 7 is the one that would catch the
  data-loss shape of this change.
- Three files on the write path are shared by every translation. The regression sweep in Phase 4
  will name what was grepped and how many call sites were read.

## Human choices

| Question | Chosen | Why |
| --- | --- | --- |
| Where the reply is parsed | **Translation stage, with parsed fragments in the shared context** | The next step retranslates corrupt containers and needs the provider; parsing in the applicator would have to move |
| Flag shape | **`experimental?: { inlineMarks?: boolean }`** | A nest states "transitional" more plainly than a JSDoc tag |

## Review log

### 2026-09-09 · sp-task step 2 (wiring)

**Four data-corruption defects were found by review, not by the tests written alongside the code.**
Each got a red test first, then the fix, then the suite.

1. **The flag leaked** (regression angle, critical). `hasInlineMarks` was inferred by regex-testing
   every value, so a customer field containing `<1>` — a footnote marker, a template placeholder,
   an article about markup — would append the mark instruction with the flag **off**. My own
   rejection of an explicit parameter ("marks are visible in the text") was the cause: customer
   text is indistinguishable from a mark this pipeline emitted. Fixed by adding
   `TranslationRequestOptions` as an optional 4th parameter, stated by the translation stage. The
   three-argument call is preserved when no marks were sent, so an existing test asserting the
   exact call still passes.
2. **The fast path kept emptied nodes** (correctness + tests angles, both). `sameOrder` compared
   only mark order, while `parseInlineMarks`'s `sameShape` also requires non-empty text. A merge
   that kept its order therefore left a stray empty node in the tree — the same event dropped the
   node when any other mark had moved.
3. **A wrapper copy dropped nodes** (correctness angle). `copyChainToLeaf` keeps only the path to
   one leaf, so a line break sitting between two formatted words inside one link vanished from
   every copy, with no fragment and no warning. Such containers are now skipped
   (`unsupported-wrapper`).
4. **A glued space was written twice** (found by the *comment* audit, in its out-of-scope notes).
   A whitespace-only node is glued into a neighbour's text and only the rebuild branch drops it;
   the fast path left it in place, rendering `une  <link>`. Containers with glued whitespace now
   always rebuild.

**Test weaknesses fixed:** criterion 1 asserted only the first paragraph's texts, so structural
damage to a nested link would have passed — it now pins the full shape of a link-bearing
paragraph; the whole-field fallback (every container skipped) had no coverage; a mixed
plain+richText schema had none; the legacy-provider test pinned today's value instead of proving
delegation.

**Regression sweep (high risk, evidenced):** `TextChunk` discrimination — 2 sites, both read and
updated; `TranslationProvider` implementations — 3, all read, **and the deprecated wrapper was
found forwarding `translate` but not `capabilities`**, fixed and pinned by a test plus a mutation;
`TranslationMutator.apply` — 1 caller; `buildSystemPrompt` — 1 caller; `translateContent` — 2
callers; no import cycles; core boundary intact (71 tests).

**Comment audit:** density was 6.7 per ten added code lines, verdict too-dense, dominant defect
repetition — the same three sentences restated in 3–4 places. Applied: 47 contract-quote lines
deleted from the two kernel test files, six member docblocks restating their own member names,
the repeated rationale in `plugin.ts` replaced by a link to the deprecation register, and two
constants moved out from between a docblock and the function it documented. Kept with named
reasons: the provider capability contract, the measured prompt wording, the `top`-may-be-a-copy
rule, the backwards-glue note, and the frozen baseline marker.

**Gates:** `sp-diff-checks` clean (5 checks); lint 58 warnings / 0 errors — the recorded baseline,
after fixing one lint **error** and two warnings this change had introduced; `check-types` clean;
full suite 1461 passed.

**All 13 acceptance criteria met** by their declared checks.

**Still out of scope, by design:** D7 (per-container retranslation) and D22 (circuit breaker). A
corrupt reply currently leaves that container in its source language.
