Build step: ./2026-10-28-the-provider-port.design.md #3

# Step 3 — capabilities removed

The second of the three breaking steps that land together (2 to 4 of the design's build sequence),
and the only one that changes what the plugin sends a provider.

## Requirements / Task restatement

A provider stops declaring anything about inline marks, and the plugin stops asking.

1. `TranslationProvider.capabilities` is deleted, with every place that sets or forwards it:
   `TranslationProviderConfig.capabilities`, the built-in OpenAI provider's declaration, and the
   getter on `OpenAITranslationLegacy`.
2. `translateContent` stops choosing between two expander lists. Rich text always goes by container;
   the per-node path stays only as `RichContainerExpander`'s own fallback for containers it cannot
   serve (mark-shaped source, a single fragment, no translatable text, a non-text node inside a
   multi-leaf wrapper).
3. A container whose reply is rejected is no longer silent: its reason reaches the server log with
   the document, the target locale, the leaf's path and the reason.
4. `MarkFailure`'s docblock stops promising a per-node retranslation that does not exist. What
   happens to a rejected container — it keeps its source text and is reported — is stated on the
   pipeline's `RejectedReply`, not in the kernel, which does not know about the pipeline.

Covers R3 of the design.

**Out of this step, by the design's sequencing:** segments on the port, `failed` answers, the mark
utilities and the built-in provider's sections are step 4. Between this step and step 4 a provider
that does not handle marks leaves rich text untranslated; steps 2 to 4 ship in one pull request, so
no release carries that state.

## What already exists — platform · installed · project · verdict

- **Logging from a run:** `server/features/translate-document/reportNothingSent.ts` writes a reason
  to `run.payload.logger` with collection, document id and target locale. The same shape is used
  here.
- **The reason itself:** `parseInlineMarks` already returns `{ ok: false, reason: MarkFailure }`;
  `parseContainerReplies` in `Translation.stage.ts` discards it.
- **The core has no logger** and must not take one (dependency-free core), so the reason leaves the
  pipeline as data.

Verdict: nothing new is built beyond carrying an existing value out of the pipeline.

## Decisions

**Da — the reason leaves the core as part of the pipeline result.** Chosen: `PipelineResult` gains
`rejected: readonly { idPath: IdPath; reason: MarkFailure }[]`, and each server caller of
`translateContent` logs it. Lost: inject a logger into the core (the core is dependency-free by
design) · put the reason on `LeafOutcome` (a leaf can hold several containers, so one reason per
leaf would drop the others).

**Db — the container list becomes the default.** Chosen: `defaultExpanders` becomes
`[RichContainerExpander, PlainTextExpander]` and `translateContent` passes no list. Lost: keep the
choice in `translateContent` with a constant `true` — a branch that cannot be taken is a reader's
puzzle.

**Dc — both server callers log.** `translate-document` and `translate-field` both run
`translateContent`; a rejected container is logged from each, through one helper beside
`reportNothingSent`. Lost: log only from the document path — the field surface would stay silent
about the same failure.

**Dd — the integration suite stops testing the declaration.** `bootTestPayload`'s
`declaresInlineMarks` option and `apps/dev`'s capability toggle (`devToggles.ts`) go.
`inline-marks-capability.int.test.ts`, which asserts the node-by-node path for a provider that does
not declare, is rewritten to assert the opposite: a provider that declares nothing receives
containers. The other inline-marks suites lose the option and keep their assertions.

**De — `DEPRECATIONS.md` is corrected, the README is proposed.** The `experimental-inline-marks`
entry says `capabilities.inlineMarks` "survives" the flag's removal; a note records that the
provider-port design removed it (D2, D11). The README section that still describes the removed flag
and shows `capabilities: { inlineMarks: true }` is the owner's to rewrite; replacement text is
proposed in the pull request, not committed.

## Acceptance Criteria

| # | Criterion | Covers | How it is checked |
|---|---|---|---|
| 1 | `TranslationProvider` and `TranslationProviderConfig` have no `capabilities` member | R3 | `bun run check-types`; `rg "capabilities\?:\|inlineMarks: true" src` finds no provider-side declaration |
| 2 | A provider that declares nothing receives a multi-fragment paragraph as one marked container | R3 | unit test in `containerMode.test.ts`, red against the current code |
| 3 | Mark-shaped source, a single fragment and a non-text node inside a wrapper still go node by node | R3 | the existing `containerMode.test.ts` cases, unchanged except for the removed declaration |
| 4 | A rejected reply puts `{ idPath, reason }` into `PipelineResult.rejected` | R3 | unit test on `TranslationPipeline` with a corrupt reply, red against the current code |
| 5 | Both server callers log a rejected container with collection, document id, target locale, path and reason | R3 | unit tests on the two callers' logging, red against the current code |
| 6 | `MarkFailure`'s docblock no longer promises a retranslation; `RejectedReply` states the outcome | — | read |
| 7 | Package suite, both type-checks, lint, the real declaration build and the SQLite integration suite are green | — | `bunx vitest run` · `bun run check-types` · `bunx oxlint .` · `bunx turbo run build` · `bun run test:integration` in `apps/dev` after the build |

## Pre-flight

Run on the untouched tree, 2026-10-30.

- AC1 — `rg "capabilities\?:|inlineMarks: true|get capabilities" src` (tests excluded): 4 declarations
  (interface, `TranslationProviderConfig`, OpenAI provider, legacy getter) · change.
- AC2 — the test does not exist yet; it is written first and shown red · change.
- AC3 — `containerMode.test.ts`: 14 passed · invariant.
- AC4 — `PipelineResult` has no `rejected` member; the test is written first and shown red · change.
- AC5 — neither caller logs a rejected container; tests written first and shown red · change.
- AC6 — the `MarkFailure` docblock says "the caller retranslates the container per-node" · change.
- AC7 — package suite 207 files, 2529 passed / 9 skipped; `check-types` exit 0; oxlint 0 errors ·
  invariant. The integration suite is run once the plugin is rebuilt, as its own baseline.

## Risk notes

- **Behaviour change for third-party providers.** A host whose provider never declared the
  capability moves from node-by-node to container rich text. Until step 4 such a provider, if it
  cannot return marks, leaves rich text untranslated — now with a logged reason. Not released on
  its own.
- **Saved structure changes on retranslation.** Container mode may reorder the pieces of a
  paragraph; documents translated node by node keep their structure until retranslated. Already
  true for the bundled provider since #186.
- **The README is already stale**: it describes the `experimental.inlineMarks` flag removed in #186.

## Decisions by the owner

- 2026-10-30 — steps 2 to 4 land as one pull request, one commit per step, merged without squashing.
- 2026-10-30 — rich text crosses the port as numbered segments (D11); this step is the half that
  removes the declaration.
- 2026-10-30 — a rejected value's reason goes to the server log for now; showing it to a person is
  R15.
