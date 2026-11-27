# The deprecation sweep

Build step: 2026-10-28-the-provider-port.design.md #6

## Requirements / Task restatement

The last step of the provider port removes what the previous majors scheduled for removal here and
nothing else. Three ledger entries come due — `openai-client-construction`,
`openai-translation-provider-class` and `translate-positional-languages` — plus the built-in
prompt's branch for an empty `sourceLng`, which encodes the detection convention R10 removed.

What leaves the package: `createOpenAIProvider`, `OpenAIProviderConfig`, the `loadOpenAIClient`
module behind them, the `OpenAITranslationProvider` class, and the `openai` entry in
`optionalDependencies`. What stays: `openAIComplete`, `OpenAIClientShape` and `OpenAI.shapes.ts` —
vendor knowledge with no vendor dependency, as the ledger states.

Covers R8 and R10 of the design. Breaking.

Out of this step: everything under R15, and the README. The README's four mentions of the removed
path, and the one sentence about provider errors that step 5 made untrue, are proposed as text and
applied by the owner.

## What already exists — platform · installed · project · verdict

Nothing is built; this step only removes. The replacement each removal points at already ships and
is already the path the README recommends:

- `openAIComplete({ client, model })` — the whole of what `createOpenAIProvider` did, minus building
  the client. `model` is required there; the removed layer defaulted it.
- `createTranslationProvider({ systemPrompt, complete })` — the wiring `createOpenAIProvider`
  returned.
- `OpenAIClientShape` — the structural slice a hand-made client satisfies, so no SDK import is
  needed to pass one in.

No platform or library search: no hook, utility, wrapper or dependency is being added.

## Decisions

**D1 — the two consumers in this repository move to the README's recipe, not to a local copy of the
deleted factory.** `apps/cms/src/lib/plugins/index.ts:366` and
`apps/dev/src/lib/translator/devToggles.ts:39` both call `createOpenAIProvider({ apiKey })`. Each
constructs its own client and passes it to `openAIComplete`. Rejected: a small private helper in each
app that rebuilds the removed layer. That is the deleted code under a new name, in two places, and it
would hide the one thing this step is meant to prove — that the recipe every external host is now
sent actually works.

**D2 — `openai` moves from `optionalDependencies` to `devDependencies`, it does not leave the
package.json entirely.** `src/translation-providers/openai/__tests__/OpenAI.shapes.test.ts` imports
the real SDK **type** to assert that our hand-written `OpenAIClientShape` still accepts a real
client; it is the only guard that the slice stays truthful when the SDK is reshaped. The build
excludes `src/**/__tests__/**`, so nothing from it reaches `dist` and no consumer installs it.
Rejected: delete the conformance test with the rest. That would remove the dependency and the guard
together, and the guard is what makes shipping a hand-written client slice safe. The ledger's
objection is to carrying the SDK as an **optional dependency of ours** — a dev-only type dependency
is not that.

**D3 — the model stops having a default.** `createOpenAIProvider` defaulted `model` to
`gpt-5.4-mini`, with its own JSDoc warning that the default may move in a minor release.
`openAIComplete` demands the model, and keeps demanding it. Both apps name a model explicitly, so
their behaviour is unchanged. Rejected: give `openAIComplete` the default instead. It would move the
apology rather than the problem, and `openAIComplete` is vendor knowledge, not a convenience layer.

**D4 — the 60-second request timeout leaves with the client construction, and both apps set it
themselves.** The removed layer passed `timeout: 60_000` because the SDK's own default is ten
minutes, which blocks a live editor request. A consumer who follows the recipe and omits the timeout
silently inherits the ten minutes. Both apps set it explicitly, as the README recipe already shows.

**D5 — the empty-`sourceLng` branch is removed, not kept as harmless defensive code.**
`buildSystemPrompt` writes ` from ${sourceLng}` only when the string is non-empty; the empty string
was the old convention for "detect the source yourself". The port requires both codes, so the branch
is unreachable from this plugin and the test pinning it pins a convention that no longer exists.

**D6 — a consumer that may run without an API key builds the client lazily, not at module scope.**
Found in review, after the first implementation followed the README recipe literally. The removed
layer built the SDK client on the first `translate` call; the recipe's `const client = new OpenAI(…)`
at module scope moves that to import time, and the SDK's constructor throws when the key is
undefined (`node_modules/openai/index.js:72-75`, v4.104.0). `apps/cms` documents `OPENAI_API_KEY` as
not required (`apps/cms/README.md:140`), so the literal recipe would have stopped the whole CMS from
booting — `next build`, `generate:importmap` and every server start — rather than failing the
translation. It now memoises the client behind a function the `complete` callback calls, which
restores the old timing. `apps/dev` already guarded the case by falling back to its fake provider
when the key is absent. Rejected: make the key required and amend that README row — it turns an
optional integration into a hard boot dependency for every environment, which no requirement asks
for. **This is the one thing every external consumer following the recipe inherits**, and it belongs
in the README note the owner applies.

**Placement.** No file moves except one rename: `OpenAITranslation.provider.ts` holds nothing but the
two removed symbols and is deleted, so its 539-line test file is re-pointed at what it actually
exercises and becomes `__tests__/openAIComplete.test.ts`. The coverage itself — the strict JSON
schema, the `json_object` fallback, the schema-rejection advice, the model-access classification and
its mark — is kept in full, with `createOpenAIProvider({ client, … })` replaced by
`createTranslationProvider({ complete: openAIComplete({ client, model, … }) })` through one helper
in the test file.

**New surface.** None. The step only removes.

**Shape check.** None of the triggers fire: no field is added to a published type, no exported
signature gains a parameter, nothing new is optional, no two functions split one question.

**Escalate?** No. Removals of symbols whose replacements already ship.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R8 | The three symbols are gone from the published surface | `grep -cE "createOpenAIProvider\|OpenAITranslationProvider\|OpenAIProviderConfig" src/index.ts` | prints `0` |
| AC2 | R8 | The package no longer asks a consumer to install the SDK | no `openai` key under `dependencies`, `peerDependencies` or `optionalDependencies` in `package.json`; present under `devDependencies` | both hold |
| AC3 | R8 | No shipped file names the SDK | `grep -rl "\"openai\"" src --include "*.ts"` lists only `__tests__/OpenAI.shapes.test.ts` | one path |
| AC4 | R10 | The prompt always names the source language | `grep -c "sourceLng ?" src/translation-providers/shared/buildSystemPrompt.ts` | prints `0` |
| AC5 | R8 | The OpenAI path keeps its coverage under the surviving entry point | `bunx vitest run src/translation-providers/openai` | exit 0, the schema, envelope-fallback, schema-rejection and model-access cases all run |
| AC6 | — | Both apps in this repository work against the new surface | `bunx turbo run check-types` (from the repo root) | exit 0, 9/9 |
| AC7 | — | No new type errors in the package | `bun run check-types` | exit 0 |
| AC8 | — | Nothing already passing breaks | `bunx vitest run` | 210 files, no failures (three files removed) |
| AC9 | — | The built package still compiles with the real compiler, and `dist` does not import the SDK | `bunx turbo run build --filter='./packages/payload-plugin-translator'`, then `grep -rE "from ['\"]openai['\"]\|require\(['\"]openai['\"]\)\|import\(['\"]openai['\"]\)" dist` | exit 0; the grep prints nothing |
| AC10 | — | The ledger says what happened | three entries read `removed`, each with the date it actually left | all three |

AC9's check was corrected during verification. It first grepped `dist` for the bare word `openai` and
expected zero hits; that never measured the criterion, because two declarations match on the folder
name (`dist/translation-providers/index.d.ts:3`, `export * from "./openai/index.js"`) and on the word
inside a docblock (`dist/translation-providers/openai/openAIComplete.d.ts:28`). The pass condition is
unchanged — no import of the SDK anywhere in `dist` — and the command now measures it.

AC10's wording asked for "today's date" on all three. The `translate-positional-languages` entry
honestly carries 2026-10-29, the date its code actually left in step 2; the criterion is worded to
the fact rather than the ledger to the criterion.

## Pre-flight

Run against the untouched tree before any criterion was written.

| AC | Command | Result | Kind |
|---|---|---|---|
| AC1 | `grep -cE "createOpenAIProvider\|OpenAITranslationProvider\|OpenAIProviderConfig" src/index.ts` | prints `2` | change — must fail now, and does |
| AC2 | read `package.json` | `openai` sits under `optionalDependencies` | change — must fail now, and does |
| AC3 | `grep -rl "\"openai\"" src --include "*.ts"` | four paths | change — must fail now, and does |
| AC4 | `grep -c "sourceLng ?" src/translation-providers/shared/buildSystemPrompt.ts` | prints `1` | change — must fail now, and does |
| AC6 | `bunx turbo run check-types` | 9/9 | invariant — passes now |
| AC7 | `bun run check-types` | exit 0 | invariant — passes now |
| AC8 | `bunx vitest run` | 213 files, 2599 passed, 9 skipped | invariant — passes now |
| AC9 | `bunx turbo run build --filter='./packages/payload-plugin-translator'` | exit 0 | invariant — passes now |

## Risk notes

- **The 539-line test file is re-pointed, not rewritten.** It is the only coverage of the schema the
  plugin sends, of the envelope fallback and of how a vendor error is classified. The risk is a
  mechanical edit quietly dropping a case; the guard is that every `it` title survives unchanged and
  AC5 names the four groups that must still run.
- **A consumer who follows the recipe and omits `timeout` inherits the SDK's ten-minute default.**
  D4 is why both apps set it, and why the README proposal keeps it in the snippet.

  **Correction, found by audit after this step landed.** This note first said "nothing in the package
  can enforce it once the client is theirs". That is false. The slice already declares a per-request
  options argument (`create(params, options?)`, `OpenAI.shapes.ts:49`) and the SDK accepts `timeout`
  there (`node_modules/openai/core.d.ts:213`, v4.104.0); `askOpenAI` sends no options object today
  and `OpenAIRequestOptions` does not name the field, so the limitation is self-imposed. Of the
  examples this repository ships, the README's carries no timeout; `src/plugin.ts`'s (compiled into
  `dist/plugin.d.ts`, which is what a consumer sees on hover) now does, as do the two app call
  sites. Sending a timeout from `askOpenAI` is left as a proposal rather than applied,
  because a per-request timeout overrides a host's client-level setting, so it needs an argument to
  stay overridable — and adding an optional argument to a published signature is the owner's call,
  against the same reasoning D3 used to refuse a default `model`.
- **`openai` in `devDependencies` must stay out of `dist`.** The build config excludes
  `src/**/__tests__/**`, so it does today; AC9 checks the built declarations rather than trusting
  that.
- **Two apps, one of them not built in this step's verification by default.** `apps/cms` is private
  and large; AC6 runs the whole repository's type-check so its call site is covered, but nothing here
  starts it against a live Payload. The boot-without-a-key case D6 records was proved by running the
  SDK constructor both ways rather than by starting the app.
- **An empty `sourceLng` now produces a malformed prompt rather than an auto-detect one.** The
  convention R10 removes was documented on `translateContent`, which is internal — it is not
  re-exported from `src/index.ts`, and both HTTP boundaries reject a source locale the project does
  not configure (`enqueue-translation/handler.ts`, `translate-field/handler.ts`). No runtime guard is
  added: the type says `string`, the docblocks now say a concrete code, and a guard against a value
  no caller can supply would be code for an impossible case.

## Decisions by the owner

- 2026-11-01 — step 6 lands on `feat/translator-the-provider-reshape`, in draft PR #225, as its own
  commit; the PR leaves draft once this step is in.
- 2026-11-01 — the README is not edited here; its four mentions of the removed path, and the
  provider-errors sentence step 5 made untrue, are proposed as text for the owner to apply.
