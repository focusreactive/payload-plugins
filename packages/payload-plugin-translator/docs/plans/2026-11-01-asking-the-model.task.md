# Asking the model

Build step: 2026-10-28-the-provider-port.design.md #7

## Requirements / Task restatement

Two defects in the surface a consumer writes, both cheap to repair only while the major is unreleased.

**The request is declared in two shapes.** `openAIComplete({ client, model, sampling })` splits the
fields of one request body into a required scalar and an optional bag. The split is not a property of
the data — both are fields of the same body, both are fixed once at wiring time — it is a property of
how the function happens to use them, which the caller has no reason to care about. `sampling` is
also a hand-curated `Pick` of four fields, so a fifth needs a code change here.

**Nobody can say what `complete` is.** The config key, the two published types (`CompletionFn`,
`CompletionRequest`) and the OpenAI factory (`openAIComplete`) all carry a vendor word that names a
different API shape than the one we call, and which says nothing about what the function does. It
sends one request to a language model and returns the reply as raw text.

Neither is a behaviour change. Both are breaking renames and reshapes of published names.

Out of this step: the `shared/` folder keeps its name (recorded debt, the owner's call — renaming it
would move sixteen files for a question this step does not ask). The README is not edited here.

## What already exists — platform · installed · project · verdict

Nothing is built. Full control over the request already ships and is unaffected: a consumer who
needs something this adapter does not offer writes their own ask function and hands it to
`createTranslationProvider`. That is the escape hatch every decision below leans on.

`OpenAIChatParams` already exists as the package's own structural slice of the request body, so the
new type is derived from it rather than written out.

## Decisions

**D1 — the request body is one object, derived rather than curated.** `model` and `sampling` become
`params: OpenAIParams`, defined as `Omit<OpenAIChatParams, "messages" | "response_format">`. The two
names in that `Omit` are the whole contract: the plugin owns the conversation with the model and the
schema it must answer, and everything else in the body is the caller's. A sixth field becomes
available by adding it to the slice — one additive line — instead of by editing a curated list.
Rejected: keep the split. It asks the caller to learn a distinction that exists only inside the
function, which reads `model` for its error messages and never reads `sampling`.

**D2 — the object stays closed; it does not become a passthrough bag.** The closure is the type's,
not a runtime filter: `...params` spreads whatever the object holds, so an untyped caller could
still send a field the type forbids. That is accepted rather than guarded, for two reasons. The
slice cannot express the failures D2 names — `OpenAIParams` carries `model` and four sampling
numbers and nothing else, so there is no `stream` or `n` to send — and a runtime pick of known keys
would rebuild the curated list D1 just removed. Rejected:
`OpenAIParams & Record<string, unknown>`, so a consumer can send anything. It loses because the
reply reader handles exactly one shape — `choices[0].message.content`. `stream: true` makes the SDK
return an async iterable, so `choices` is undefined and the failure surfaces as `NoContentError`
("the model produced nothing"), which is untrue and sends the reader the wrong way. `n: 3` silently
pays three times for one used answer. The closed set is the set this code can read.

**D3 — the vocabulary is "ask".** `complete` → `askModel`, `CompletionFn` → `AskModel`,
`CompletionRequest` → `ModelRequest`, `openAIComplete` → `askOpenAI`. Rejected: "call"
(`callModel` / `callOpenAI`) — accurate but colder, and the package's own vocabulary is plain verbs
(`admitWork`, `narrowSelection`, `markFailureReason`). Rejected: keep "completion" — it is vendor
jargon for a different API shape than the one this code calls, and it was the word that prompted the
question.

**D4 — the vendor argument is `params`, not `request`.** It is the SDK's own word for the body
(`chat.completions.create(params)`), and it keeps the vendor's object distinct from `ModelRequest`,
which is ours and holds something else entirely — the system prompt, the user content and the
schema.

**D5 — `shared/` keeps its name; the file is renamed.** `CompletionProvider.provider.ts` becomes
`AskModel.provider.ts`, so the file is named for the thing it exports, per the package guide. The
folder rename stays recorded debt.

**D6 — `createTranslationProvider` keeps its name.** The vocabulary of D3 covers what the caller
hands in; the constructor is named for what it returns, and what it returns is `TranslationProvider`
— the port the plugin publishes. A reader arriving from that port finds the constructor by its own
word. Rejected: `createModelProvider`. It names the input instead of the output and reads as "a
provider of models" rather than "a translation provider built on a model"; the input is already
visible without it, since the one required config key is `askModel`. The cost of keeping the name is
nothing; renaming it would spend a ledger entry, eleven README sites and every consumer's call,
because the name has been published since 0.11.0.

**Placement.** No module moves. Five files are renamed — the provider file and its two test files,
and `openAIComplete.ts` → `askOpenAI.ts` with its test — and only `askOpenAI.ts` changes beyond the
vocabulary, for D1's `params`.
`apps/dev`'s `fakeComplete.ts` follows the same vocabulary, so the sandbox stops teaching the old
word.

**New surface.** None added; `OpenAIParams` replaces `OpenAISamplingParams`, which is deleted.

**Shape check.** Fired: an exported signature changes, and a published type is removed. Two shapes
were considered and are recorded as D1 and D2. The next field of this kind costs one additive line
in `OpenAIChatParams` under D1, against one line in a curated `Pick` plus a decision about which bag
it belongs in under the shape being replaced. The type admits exactly the states the system
produces, because the slice is what the request builder reads. The second caller already exists:
both `apps/cms` and `apps/dev` configure it. An implementor outside this repo breaks at compile
time on a renamed key, which is the intent of a major.

**Escalate?** No. One module, no new seam, no dependency.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R18 | The completion vocabulary is gone from the package as a live name | `grep -rE "CompletionFn\|CompletionRequest\|CompletionProvider\|openAIComplete\|complete:" src --include "*.ts" \| grep -v "@since" \| wc -l` | prints `0` |
| AC2 | R18 | `OpenAISamplingParams` is gone | `grep -rc "OpenAISamplingParams" src --include "*.ts"` finds no file | no match |
| AC3 | R18 | The request type is derived from the slice, not curated | `grep -c "Omit<OpenAIChatParams" src/translation-providers/openai/askOpenAI.ts` | prints `1` |
| AC4 | R18 | Every field of the body reaches the request from one object | a test setting `model`, `temperature`, `top_p`, `frequency_penalty` and `presence_penalty` in one `params` and asserting all five land on the call | exit 0, the case runs |
| AC5 | R18 | The published surface names the new vocabulary and not the old | `src/index.ts` exports `AskModel`, `ModelRequest`, `askOpenAI`, `OpenAIParams`; names no `Completion*` | both hold |
| AC6 | — | Nothing already passing breaks | `bunx vitest run` | 210 files, no failures |
| AC7 | — | No new type errors in the package | `bun run check-types` | exit 0 |
| AC8 | — | Both apps work against the new surface | `bunx turbo run check-types` (repo root) | exit 0, 9/9 |
| AC9 | — | The built package still compiles with the real compiler | `bunx turbo run build --filter='./packages/payload-plugin-translator'` | exit 0 |

AC4 also closes the coverage gap step 6's review left open: `sampling` was asserted through
`temperature` alone, so dropping the spread of the other three would have gone undetected.

AC1's pass condition: no live name carries the old vocabulary.

**The vocabulary outside `src` is part of this step, and AC1 never looked there.** Three reviewers
found the same gap independently: `docs/DEPRECATIONS.md` is the live migration document, not a dated
record, and its recipe still read `complete: openAIComplete({ client, model })`, which no longer
compiles. It, the sandbox's own docblock and a test helper named `recordingComplete` were repaired.
The README stays the owner's.

## Pre-flight

Run against the tree as step 6 left it, before any criterion was written.

| AC | Command | Result | Kind |
|---|---|---|---|
| AC1 | the grep above | prints `33` | change — must fail now, and does |
| AC2 | the grep above | 4 files match | change — must fail now, and does |
| AC3 | `grep -c "Omit<OpenAIChatParams" src/translation-providers/openai/*.ts` | no file matches | change — must fail now, and does |
| AC4 | `grep -rl "frequency_penalty.*presence_penalty" src/translation-providers/openai/__tests__/` | no file matches | change — must fail now, and does |
| AC6 | `bunx vitest run` | 210 files, 2564 passed, 9 skipped | invariant — passes now |
| AC7 | `bun run check-types` | exit 0 | invariant — passes now |
| AC8 | `bunx turbo run check-types` | 9/9 | invariant — passes now |
| AC9 | `bunx turbo run build --filter='./packages/payload-plugin-translator'` | exit 0 | invariant — passes now |

## Risk notes

- **A rename of this size is mechanical, and mechanical is where a silent miss lives.** The guard is
  AC1 counting the old vocabulary to zero across the package, plus the type-check, which catches any
  reference the grep's pattern did not describe.
- **The published names break twice in one release.** A consumer upgrading past this major meets
  both step 6's removals and this step's renames. They land in the same pull request and the same
  release, so nobody sees an intermediate state — but the README note the owner applies has to carry
  both.
- **`ModelRequest` and `OpenAIParams` sit close together and mean different things.** The first is
  what the plugin asks for; the second is what the vendor's body carries. D4 keeps the words apart,
  and both docblocks say which side of the boundary they are on.

## Decisions by the owner

- 2026-11-01 — the vocabulary is "ask": `askModel`, `AskModel`, `ModelRequest`, `askOpenAI`.
- 2026-11-01 — the provider file is renamed; the `shared/` folder is not, and stays recorded debt.
- 2026-11-01 — this lands as its own commit, in the same pull request as step 6.
- 2026-11-06 — `createTranslationProvider` and `TranslationProviderConfig` keep their names.
