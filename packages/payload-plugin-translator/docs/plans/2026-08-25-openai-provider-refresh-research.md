# Research — Refresh the OpenAI provider & extract a shared provider toolkit (#99)

- **Issue:** [#99](https://github.com/focusreactive/payload-plugins/issues/99) — part of epic [#98](https://github.com/focusreactive/payload-plugins/issues/98)
- **Date:** 2026-08-25
- **Status:** definition — not yet designed, not yet implemented
- **Hard constraint stated by the owner:** public API stays backward compatible.

---

## 1. Parsing summary

- **Source type:** GitHub issue (#99) authored in this repo + a verbal instruction to also review the
  `TranslationProvider` port itself, not just the adapter.
- **Stakeholders:** plugin maintainers (own the API surface); plugin consumers on `0.10.x` (must not
  be broken); editors in the Payload admin (feel the failure modes today).
- **Explicit requests:** modernize `OpenAITranslation.provider.ts`; extract the vendor-neutral parts
  into a shared module; review the port for defects; keep backward compatibility.
- **Implicit expectations:** the shared module must be good enough that Anthropic / Gemini /
  OpenRouter (#100) become thin adapters — that is the epic's whole premise.
- **Constraints:** `openai` stays an `optionalDependency`; `src/core/**` stays dependency-free;
  the port lives in the core and is re-exported from the package root, so any change to it is a
  public-API change.
- **Contradictions in the issue as written:** the issue asks for "typed, message-carrying errors",
  but the port's documented contract is *"Return null on translation failure"* and the current tests
  assert exactly that. **Resolved** — see §12, Clarification 1: the `null` contract is inherited, was
  never a decision, and the reference implementation does not honour it.

---

## 2. Codebase map

### Prior art

| Where | What it already decided |
| --- | --- |
| `docs/plans/2026-08-21-translation-mechanism-kernel-extraction.md` §10 | Names the correlation defect as an **inherent limitation** — *"Correlation with the provider rests on the numeric keys of `Record<number, string>` … A model that merges, splits, drops or renumbers entries misplaces translations silently. This design neither introduces nor fixes that."* #99 is where it gets fixed. |
| same doc §4.1 | Post-kernel, `Record<number, string>` **survives only as the provider wire format** — the port's shape is deliberately kept, the pipeline's internal `TextChunk` is what goes away. Anything decided here must survive that refactor. |
| same doc, Phase 4 notes | Only *types* cross the future package boundary and TypeScript is structural, so a custom provider written against an older shape keeps compiling. Relevant to how far the port may be widened. |
| `docs/plans/2026-06-30-slice7-...`, `2026-07-17-core-layering-redesign.md` | Why implementations live outside `core/`: the core barrel must not pull `openai`. |
| `git log -- src/translation-providers/` | Three commits, all mechanical moves during the core extraction. **The provider's logic has never been revised since it was written.** |

No prior plan doc covers the provider itself. No abandoned attempt found.

### Files in scope

| Path | Role |
| --- | --- |
| `src/translation-providers/openai/OpenAITranslation.provider.ts` | The whole adapter — 280 lines, the subject of this issue. |
| `src/translation-providers/openai/index.ts` | Vendor barrel; re-exports `OpenAITranslationProvider`, `createOpenAIProvider`, `OpenAIProviderConfig`, `DryRunConfig`, `SystemPromptContext`. |
| `src/translation-providers/index.ts` | Providers barrel; re-exports the port from the core "for convenience". |
| `src/translation-providers/openai/OpenAITranslation.provider.test.ts` | 294 lines / 22 cases. **Locks current failure behavior** (3 cases assert `null`). |
| `src/core/domain/translation-providers/TranslationProvider.interface.ts` | The port. `translate(input, sourceLng, targetLng) => Promise<Record<number,string> \| null>`. |
| `src/core/domain/translation-providers/index.ts` | Core barrel for the port. |
| `src/index.ts:17,19-20,43` | Public API surface: the port types, `createOpenAIProvider`, `OpenAIProviderConfig`, `DryRunConfig`, and the deprecated `OpenAITranslationProvider` class. |
| `README.md:287-356` | Provider docs — config table, `systemPrompt`, `DryRunConfig`, custom-provider recipe. |
| `packages/payload-plugin-translator/package.json` | `optionalDependencies: { openai: "^4.50.0" }`; installed today: **4.104.0**. `zod ^3.23` is already a direct dependency. |
| `docs/DEPRECATIONS.md` | Ledger; entries keyed by date + PR, removal target always "next major". |

### Files affected but not owned by this issue

| Path | Why it matters |
| --- | --- |
| `src/core/translation-pipeline/stages/translation/Translation.stage.ts` | The only caller of `provider.translate`. Converts `null` into `Error("Translation provider returned null")` — the generic message the issue complains about. |
| `src/core/translation-pipeline/stages/translation-applicator/TranslationMutator.ts` | `if (translation === undefined) continue;` — **this is where a dropped key becomes a silent no-op.** |
| `src/core/translation-pipeline/stages/text-expander/{PlainText,RichText}Expander.ts` | Where the numeric indices are minted. One index per plain leaf, one per Lexical text node. |
| `src/core/translation-pipeline/translateContent.ts`, `TranslationPipeline.ts` | Wrappers; pass the provider through. |
| `src/server/features/translate-document/handler.ts` | Document level — runs inside a Payload job. |
| `src/server/features/translate-field/handler.ts` + `model.ts` | Field level — runs **synchronously inside an HTTP request**, and is the only path with a size guard (`MAX_FIELD_VALUE_BYTES = 256 KiB`). |
| `src/server/features/cancel/handler.ts` | Cancel deletes the job record. It cannot abort an in-flight provider request — see finding P4. |

### Reuse opportunities

- `zod ^3.23` is already a dependency, and the installed `openai@4.104` ships `openai/helpers/zod`
  (`zodResponseFormat` / `zodTextFormat`) and `client.responses.*`. **Structured outputs and the
  Responses API are reachable without a major SDK bump.**
- The dry-run machinery, prompt builder and JSON parsing in the adapter are already vendor-neutral in
  substance — extraction is a move, not a rewrite.
- `MAX_FIELD_VALUE_BYTES` in `translate-field/model.ts` is the existing precedent for an input-size guard.

### Architectural constraints

1. `src/core/**` must not gain a runtime dependency on any vendor SDK. The shared toolkit therefore
   belongs in `src/translation-providers/shared/`, **not** in `core/`.
2. Everything re-exported from `src/index.ts` is public API: `TranslationProvider`,
   `TranslationInput`, `TranslationOutput`, `createOpenAIProvider`, `OpenAIProviderConfig`,
   `DryRunConfig`, `OpenAITranslationProvider`.
3. File-role naming applies: `.provider.ts` for adapters, `.interface.ts` for ports.
4. New public API needs `@since x.y.z` + a `Since vX.Y.Z` note in the README.
5. Deprecations go through `docs/DEPRECATIONS.md`, removal target = next major, never a guessed number.
6. `tsgo` (`check-types`) can pass while the real `tsc` declaration build fails — the acceptance bar is
   a full package build, not just the type-check.
7. Whatever is decided must still hold after the kernel extraction lands, where `Record<number,string>`
   survives *only* as the provider wire format.

### Size check

**One task, but only after the port questions are answered.** The code surface is small (one adapter,
one port, one test file, one README section). The risk is not size — it is that three of the findings
below are contract decisions, and deciding them wrong means #100 inherits the wrong shape three times
over. No split proposed.

---

## 3. Findings

### 3.1 The adapter (`OpenAITranslation.provider.ts`)

| # | Finding | Evidence | Severity |
| --- | --- | --- | --- |
| A1 | **No verification that the reply's key set matches the input's.** A model that drops, renames, merges or invents an index produces a silently half-translated document — `TranslationMutator` skips unknown indices with `continue`. | `provider.ts:159-166` parses and returns; `TranslationMutator.ts:20` | **high** — silent data defect |
| A2 | **`response_format: { type: "json_object" }` is a hint, not a schema.** Key preservation rests entirely on prompt wording. Structured outputs (`json_schema` + `strict`) are available in the installed SDK. | `provider.ts:153` | high |
| A3 | **Every failure collapses to `null`** — empty `choices`, content filter, unparseable reply, and (via the SDK throwing) transport errors all surface to the editor as one opaque `Error("Translation provider returned null")`. | `provider.ts:161-166`, `Translation.stage.ts:18` | high — support burden |
| A4 | **Sampling parameters are hardcoded** (`temperature: 0`, `top_p: 1`, `frequency_penalty: 0`, `presence_penalty: 0`) and sent on every request. Reasoning-family models reject some of these outright. | `provider.ts:147-152` | medium — blocks model choice |
| A5 | **Default model is `gpt-4o`.** | `provider.ts:146` | medium |
| A6 | **Deep import into SDK internals** — `import type { ChatModel } from "openai/resources/index.mjs"` for a type that only exists to autocomplete a string. Breaks on any SDK reshuffle, and pins the adapter to v4's file layout. | `provider.ts:11` | medium — upgrade blocker |
| A7 | **The dry-run walker is over-engineered for its input.** `transformObjectValues` recurses arrays and nested objects, but `TranslationInput` is `Record<number, string>` — a flat map. Dead generality carried into the shared toolkit if moved verbatim. | `provider.ts:213-247` | low |
| A8 | **Dry run logs the entire document content at `info` level** via `console.info`. Fine for a local sandbox, noisy-to-leaky in a shared environment. | `provider.ts:132-137` | low |
| A9 | **No input-size guard at the document level.** The whole document goes in one request; the field level has `MAX_FIELD_VALUE_BYTES`, the document level has nothing. A large document fails as a truncated/unparseable reply → `null` → A3. | `Translation.stage.ts`, `translate-field/model.ts:14` | medium (mitigation, not the fix) |
| A12 | **`openai` is declared optional but is mandatory in practice.** `src/index.ts:19` → `translation-providers/index.ts` → `openai/index.ts` → `provider.ts:1 import OpenAI from "openai"` — a static top-level import on the package's root entry path. Importing `translatorPlugin` pulls `openai` even for a consumer who wrote their own DeepL provider and never touches OpenAI. `optionalDependencies` states an intent the code does not honour. | `package.json` vs the import chain above | **high** — a dependency defect, not an ergonomics one |
| A11 | **The API call itself is not wrapped.** `chat.completions.create` is awaited with no `try/catch` — only `JSON.parse` is guarded. 401 / 429 / timeout / network all throw straight through, past the `null` contract. **The reference implementation has never honoured its own port contract**, and cannot: a network call can always throw. | `provider.ts:143` vs `provider.ts:163-166` | **high** — invalidates the contract, not just the code |
| A10 | **README documents the wrong failure semantics**: *"null aborts the translation for this chunk"*. It aborts the entire run. | `README.md:345` | low — but it misleads every custom-provider author |

### 3.2 The port (`TranslationProvider`)

| # | Finding | Why it matters | Compatible fix available? |
| --- | --- | --- | --- |
| P1 | **Correlation rests on numeric keys the model is asked, not required, to echo.** Already named as an inherent limitation in the kernel doc. | This is A1's root: the contract has no structural guarantee, so every vendor adapter must re-implement the same defence. | Yes — the *guarantee* can be enforced in the shared toolkit without changing the port's type. |
| P2 | **`null` as the failure channel is unhonourable in principle and unhonoured in fact.** Untyped, so retryable (429/5xx) is indistinguishable from fatal (bad key, bad model); nothing treats it as a *value* (`Translation.stage.ts:18` converts it to a throw immediately); and A11 shows the built-in provider throws for most real failures anyway. Today's behaviour is an undocumented hybrid, not the documented contract. | Drives A3. Root cause is provenance, not design — see §12/C1. | Yes — deprecate `null` in prose, keep `\| null` in the type. Removing it from the type breaks custom implementations at compile time. |
| P3 | **`Record<number, string>` is a lie in flight.** JS object keys are strings; `JSON.parse` returns string keys. It works only by coercion at `translations[chunk.index]`. Cosmetic today, a trap for any adapter that iterates keys. | Low. | Documentation, not a type change. |
| P4 | **No cancellation.** There is no `AbortSignal` in the signature, so `POST /cancel` deletes the job record while the provider request keeps running — and keeps billing. | Real money + a UI that lies about what stopped. | Yes — an optional 4th parameter is backward compatible for both implementers and callers (structural typing: an implementation that ignores it still satisfies the interface). |
| P5 | **No call context.** The provider receives text and two language codes — no field path, no collection, no glossary, no per-call overrides. The model translates `{"0":"Home"}` with zero context, and `systemPrompt` is fixed at construction time. | Translation quality; the top reason a customer would reject the plugin's output. | Yes, additive — but it is a feature, not a refresh. Recommend a separate issue. |
| P6 | **No usage/cost reporting.** Nothing flows back about tokens spent, so there is no way to show or cap spend. | Product gap, not a defect. | Additive; out of scope here. |
| P7 | **`sourceLng: ''` is a magic value** meaning "auto-detect", typed as a plain `string`. | Minor; documented in the port's JSDoc. | Documentation. |

**Verdict on the port:** it is sound in shape — a one-method adapter contract is right, and the epic's
premise depends on it staying that way. Its defects are P2 (no failure channel) and P4 (no
cancellation), both fixable additively. P1 is not a port defect so much as a missing *shared
enforcement*, which is exactly what this issue creates.

---

## 4. Problem statement

The plugin's only built-in translation provider has never been revised since it was written. It asks a
language model to preserve numeric keys and then trusts the answer without checking, so a model that
drops or renumbers an entry produces a document that looks translated and is not. When something does
go wrong, four unrelated causes collapse into one opaque error message, which makes every support
conversation start from zero. Meanwhile the parts of the adapter that are not OpenAI-specific — prompt
building, dry-run simulation, response parsing — sit inside the vendor file, so the three vendors
queued behind this issue would each copy them. Fix the correctness gap, give failures a cause, and
leave behind a shared toolkit thin enough that the next adapter is mostly an API call — without
breaking anyone on `0.10.x`.

---

## 5. Scope

### In scope

1. **A three-layer provider surface (§12/C5)**, replacing the single wrapper: pure toolkit
   (prompt / schema / parse / key-set validation) → `createTranslationProvider({ complete })` →
   `createOpenAIProvider(...)` as thin sugar. Layers 1 and 2 are **public API**.
1a. Client injection on layer 3: `client` accepted alongside `apiKey`; the SDK typed by a narrow
   structural slice (the `.shapes.ts` convention) so `openai` leaves the dependency list.
2. Enforced structured JSON output in the OpenAI adapter (schema, not a hint).
3. Key-set validation on every reply, with a defined policy for mismatch.
4. A failure taxonomy that distinguishes no-content / unparseable / key-mismatch / transport, and a
   pipeline error message that names the cause.
5. Un-hardcoding the sampling parameters.
6. Default-model bump and removal of the deep `openai/resources/*` import.
7. Tests for every failure path, including the ones that do not exist today.
8. README correction (A10) + updated provider table; `@since` on new API.
9. Deprecating the `null` return in the port's JSDoc + a `docs/DEPRECATIONS.md` entry (type unchanged).
10. **Cancellation (P4):** an optional `{ signal }` 4th parameter on the port, threaded through
    `translateContent` → `TranslationPipeline` → `TranslationStage` → both providers, and wired to
    `req.signal` at the field level. Background-job cancellation is bounded — see §12/C4.

### Out of scope

- **Chunking / splitting a document across requests** (A9's real fix). Belongs with the pipeline, not
  the adapter. A size *guard* that fails with a clear message is in scope; splitting is not.
- **Adding the Anthropic / Gemini / OpenRouter adapters** — that is #100.
- **Call context, glossaries, per-call prompt overrides** (P5) — a feature, own issue.
- **Usage/cost reporting** (P6).
- **Moving the port out of `core/`** or changing its single-method shape.
- **Admin-UI provider selection or key storage.**
- **Cross-process cancellation of a running background job** — see §12/C4 for why an in-process
  registry is the honest limit and what is deliberately left undone.
- **`openai` v5+ support** as a *declared range* — C5 removes the dependency instead, which makes the
  question moot for the package (the consumer owns the SDK version).

### Non-functional scan

| Dimension | Verdict |
| --- | --- |
| Performance | **Relevant.** One request per document with no size ceiling (A9); the SDK's 10-minute default timeout blocks a job for 10 minutes; the field level runs this synchronously inside an HTTP request. |
| Security / access control | **Relevant.** The API key must never reach a log or an error message — SDK errors can carry request metadata. Dry-run currently logs full document content (A8). No access-control surface in this issue. |
| Accessibility | **N/A** — no UI change. Error *text* reaches the admin UI, but through existing components. |
| i18n / localization | **Relevant** — it is the subject. Specifically the `sourceLng: ''` auto-detect path (P7) and locale codes passed verbatim into the prompt. |
| Observability | **Relevant and central.** The whole "one opaque error" complaint is an observability defect. Note `console.*` is the house pattern here (`withErrorHandler.ts`, `AutoTranslate.wiring.ts`) — not something to change unilaterally in this issue. |

---

## 6. Acceptance criteria (draft)

Numbered; each states how it is checked. Items marked ⚠ depend on an Open Question.

1. `src/translation-providers/shared/` exists and exports the prompt builder, dry-run machinery,
   response parsing, key-set validation and `BaseProviderConfig`; the OpenAI adapter imports them and
   holds no copy. — *check: file layout + no duplicated symbols (grep in review).*
2. Given an input of N entries, when the model replies with a JSON object whose key set differs from
   the input's, then the matching subset is still applied **and** the mismatch is reported: the count
   and the identity of the missing / unexpected keys reach the log, and the run's result carries the
   fact that it was partial. The run does not fail.
   — *check: unit test with a mocked reply missing key `1` — asserts key `0` applied, key `1` reported.*
2a. A fully-mismatched reply (zero input keys returned) is a failure, not a silent no-op — it throws.
   — *check: unit test with a reply whose keys are all renumbered.*
3. Given a valid input, when the provider calls OpenAI, then the request carries an explicit response
   **schema** (not `json_object`), and the schema requires exactly the input's keys.
   — *check: unit test asserting the request payload shape.*
4. Each failure cause — no content / empty `choices` / unparseable reply / key-set mismatch /
   transport error — **throws** a distinguishable, message-carrying error naming the cause. No path
   produces the bare string `Translation provider returned null`, and no path returns `null`.
   — *check: five unit tests, one per cause, asserting on the thrown error.*
4a. The port's JSDoc marks `null` as deprecated, states that implementations should throw, and states
   that a returned `null` is still treated as a failure. The `| null` member of the return type is
   unchanged. — *check: read + `tsc` on a fixture provider that still returns `null`.*
4b. A custom provider that returns `null` still compiles and still fails the run exactly as before.
   — *check: unit test with a minimal null-returning provider through `translateContent`.*
5. No sampling parameter is sent unless configured, and a model that rejects `temperature` completes
   a translation successfully. — *check: unit test asserting absent keys in the request payload; one
   manual run in `apps/dev` against such a model.*
6. `grep -r "openai/resources" src/` returns nothing. — *check: grep.*
7. `createOpenAIProvider({ apiKey })` with no other options still: returns a provider whose
   `translate` resolves to the same shape as before, accepts every option documented in
   `README.md:287-316` with unchanged meaning, and keeps `OpenAITranslationProvider` exported and
   constructible. — *check: the existing 22 test cases still pass, except the three asserting
   `null`-on-failure, which are rewritten to assert the thrown cause — deliberately, not deleted.*
8. The API key never appears in any thrown error message or log line, including SDK-originated errors.
   — *check: unit test asserting the redaction on a simulated SDK error.*
9. Dry run does not log document content at `info` level. ⚠(Q9, non-blocking)
   — *check: unit test on the console spy.*
10. An oversized input fails with a message that says the input was too large — not with a parse error. ⚠(Q8, non-blocking)
    — *check: unit test at the boundary.*
10a. `createOpenAIProvider` defaults to a current model, and both the README and the `model` JSDoc
    state the policy: **the default may change in a minor release; pin `model` for reproducibility.**
    — *check: read.*
10b. The port accepts an optional `{ signal }` argument; a provider called with an already-aborted
    signal rejects without issuing a request, and an in-flight request aborts when the signal fires.
    — *check: two unit tests per built-in provider.*
10c. A custom provider declared with the old three-parameter signature still compiles and still runs.
    — *check: `tsc` on a three-parameter fixture + one run through `translateContent`.*
10d. Field-level translation passes `req.signal` through, so a client that aborts the HTTP request
    aborts the provider call. — *check: integration test on the field route.*
11. `README.md:345` no longer claims null aborts "this chunk"; the custom-provider section states the
    real contract, including whatever Q1 settles. — *check: read.*
12. Every new public export carries `@since` and a `Since vX.Y.Z` README note. `docs/DEPRECATIONS.md`
    gains a `translation-provider-null-return` entry (date + PR, remove in next major).
    — *check: read.*
13. `bunx turbo run build --filter=./packages/payload-plugin-translator` passes (the real `tsc`
    declaration build, not just `check-types`), plus `bun run test` and `bun run lint`. — *check: run.*

---

## 7. Open questions

### Blocking

1. ~~**Failure channel — `null`, or throw?**~~ **RESOLVED 2026-08-25** — see §12, Clarification 1.

2. ~~**Key-set mismatch — fail the run, or apply what came back and report?**~~ **RESOLVED** — §12/C2. Original framing kept for the record:
   Today: silently apply the matching subset (`TranslationMutator` skips the rest). Options: (a) hard
   fail the whole run; (b) apply the matching subset and surface a warning naming the untranslated
   leaves; (c) retry once, then fail.
   **Matters because:** (a) turns today's silent partial success into a visible failure — safer, but a
   user who has been living with 98 %-good translations will experience it as a regression. (b) keeps
   today's behavior and only adds visibility. This is a behavior change either way and must be a
   deliberate call, not a side effect of adding validation.

3. ~~**Default model bump — silent, or opt-in?**~~ **RESOLVED** — §12/C3. Original framing:
   Changing `gpt-4o` to a newer default changes cost, latency and output for every existing user who
   never set `model`, on a patch/minor upgrade.
   **Matters because:** it is not an API break but it is a behavior break, and the compatibility
   constraint was stated in terms the user may well have meant to cover it. Options: (a) bump silently
   and note it in the changelog; (b) keep `gpt-4o` and document a recommended value; (c) bump and
   deprecate the implicit default so the next major requires `model` explicitly.

4. ~~**Does the port change in this issue, or the next one?**~~ **RESOLVED** — §12/C4. Original framing:
   `AbortSignal` (P4) is additive and cheap, but it means touching the port, the pipeline stage, the
   handlers, and the cancel feature to be worth anything.
   **Matters because:** including it roughly doubles the blast radius (core + server + client cancel
   path) for a benefit that is real but separable. *Recommendation: note it, do it in its own issue —
   cancel-that-does-not-cancel deserves its own acceptance criteria.*

### Non-blocking (defaults I will take unless told otherwise)

5. **Responses API vs Chat Completions.** *[non-blocking]* Default: move to `client.responses.create`
   with a schema, and keep a `chat.completions` compatibility mode as a documented option — #100's
   OpenRouter adapter reuses this client against a third-party base URL where the Responses API is not
   guaranteed.
6. **`openai` SDK range.** *[non-blocking]* Default: stay on `^4` (installed 4.104 has everything
   needed), and treat widening to `^5` as its own change with its own verification.
7. ~~**Where the shared toolkit lives.**~~ **OVERTURNED by §12/C5** — the toolkit is public API, not
   an internal helper set. The original default (keep it internal until #100 proves the shape) is
   incompatible with the layered design.
8. **Input-size guard.** *[non-blocking]* Default: add a guard with a byte ceiling mirroring
   `MAX_FIELD_VALUE_BYTES`, configurable, failing with a named error. Not chunking.
9. **Dry-run walker.** *[non-blocking]* Default: keep the recursive walker's behavior for the public
   `DryRunConfig` contract but stop pretending the input is a tree in the shared version.

### Restate check

- *"Backward compatible"* — I read this as: **no consumer's `payload.config.ts` needs editing, and no
  custom `TranslationProvider` implementation stops compiling or working.** It does **not**
  automatically mean "identical runtime behavior" — Q2 and Q3 are exactly the places where those two
  readings diverge, which is why they are blocking.
- *"Refresh the provider"* — I read this as correctness + failure visibility + removing upgrade
  blockers, **not** as new capabilities (context, glossary, streaming, cost tracking).
- *"Shared toolkit"* — vendor-neutral helpers **plus the enforced key-set guarantee**. If it were only
  helpers, each adapter in #100 could still ship the A1 defect.

---

## 8. Risks & constraints

- **Behavior change disguised as a fix.** Key-set validation (Q2) and the default-model bump (Q3) both
  change what existing users experience without changing any signature. The changelog entry matters as
  much as the code.
- **The three `null` tests are a contract, not an accident.** Rewriting them to assert the thrown
  cause is the point; deleting them silently is how the old contract gets lost.
- **Deprecating `null` in prose only.** The type keeps `| null`, so nothing enforces the new rule at
  compile time. A custom provider written today against the old JSDoc keeps working — which is the
  intent — but the ledger entry is the only thing carrying the removal to the next major.
- **The kernel extraction is in flight** on `docs/translator-kernel-extraction-design`. Its design
  keeps `Record<number, string>` as the wire format, so this work should not conflict — but the port's
  JSDoc is touched by both.
- **`check-types` is not the build.** tsgo passes where the real `tsc` declaration emit fails,
  historically on zod-inferred types — and this work will add zod schemas.
- **`openai` is optional.** Nothing added here may make the package fail to build or type-check when
  `openai` is absent.

---

## 9. Consistency self-check

- Every IN-scope item has at least one acceptance criterion: 1→AC1, 2→AC3, 3→AC2, 4→AC4, 5→AC5,
  6→AC5/AC6, 7→AC2/4/5/7/8/9/10, 8→AC11/12, 9→AC12. **0 uncovered.**
- No criterion contradicts an OUT-of-scope line — AC10 guards size without chunking; nothing asserts
  a port signature change.
- Every criterion names a check.
- Coverage scan: failure states → AC4/AC7/Q1; empty & zero states → the pipeline already short-circuits
  on an empty `textMap` (`Translation.stage.ts:10`), noted, no AC needed; boundaries → AC10/Q8;
  permissions → N/A, the provider runs server-side behind the existing route guards; concurrency &
  idempotency → each `translate` call is stateless and a retried job re-calls the provider (kernel doc
  §10), so no new idempotency surface; migration/back-compat → AC7 + Q1/Q2/Q3.
- `[inferred]` — nobody asked for AC8 (key redaction) or AC10 (size guard). Both rest on code reading
  (A8/A9), not on the issue text. Flagged rather than smuggled in.

---

## 10. Readiness

- **Unresolved blocking questions: 0.** Q1–Q4 all resolved 2026-08-25 (§12).
- **IN-scope items with no acceptance criterion: 0.**

→ **Ready to design.** Four non-blocking defaults (Q5–Q9) stand unless overruled during design.

**Scope grew during clarification.** The issue as filed (#99) covered the adapter and the shared
toolkit. C4 adds cancellation, which reaches `core/translation-pipeline`, both server handlers and the
field route. #99's body should be updated to match before implementation starts, or the issue and the
work will describe different things.

---

## 11. Suggested next step

**`/sp-architect`, then `/sp-task`.** Q1–Q4 are answered; the design questions that remain are
structural, not product.

Architecture vectors, in the order they matter here:

| Vector | Why it applies |
| --- | --- |
| `contract` | **Primary.** This is a third-party API boundary and an untrusted reply (a language model's JSON) crossing into a mutation path. The port is a published contract with unknown external implementers. |
| `evolution` | **Secondary.** Everything here replaces something already in use, under a hard no-break constraint, with an in-flight refactor (the kernel extraction) alongside it. Two deprecations (`null` return, and the model-default policy note) are scheduled here, not performed. |
| `concurrency` | **Added by C4.** Cancellation is a cross-process problem the moment more than one instance runs: the request that cancels and the process that translates need not be the same. The design must state what the in-process registry does and does not promise. |

Not `structure` alone — placement (`shared/` vs `core/`) is the easy part and is already answered by
the layering rules. The hard questions are all about what the contract promises and how it changes.

---

## 12. Clarifications

Answers folded back from the owner. Each supersedes the corresponding Open Question.

### C1 — Failure channel: built-in providers throw; `null` is deprecated, not removed *(resolved 2026-08-25)*

**Question asked:** the issue wants typed errors, the port says "return null on failure", three tests
assert it. Which wins?

**What the investigation found — the premise was wrong.** There was no decision to defend:

- `git log --follow` on `TranslationProvider.interface.ts` reaches `9a813628` (2026-05-12,
  *"migrate plugin into payload-plugins monorepo"*) and stops. The contract predates this repository.
  The only two later commits are the mechanical `src/core` extraction moves. **It was inherited, never
  chosen.**
- **The contract is unhonourable in principle.** A network call can always throw, so
  "return null on failure" cannot be a total rule for any real provider.
- **It is unhonoured in fact** (finding A11): `provider.ts:143` awaits `chat.completions.create` with
  no `try/catch`; only `JSON.parse` is guarded. 401 / 429 / timeout / network already throw past the
  contract today. Current behaviour is an undocumented hybrid — `null` for the three cases the author
  wrapped, exceptions for everything else.
- **`null` is not a value anyone consumes.** `Translation.stage.ts:18` converts it to a throw on
  arrival. It is an exception that lost its cause in transit.

**Decision.**

| Layer | Change |
| --- | --- |
| Port type | `Promise<TranslationOutput \| null>` — **unchanged**, purely for compatibility. |
| Port JSDoc | `null` marked deprecated; implementations *should throw* a typed, cause-carrying error; a returned `null` is still treated as a failure. |
| Built-in providers | Always throw — including the three cases that return `null` today. |
| `docs/DEPRECATIONS.md` | Entry `translation-provider-null-return`, status `live`, remove in **next major**. |
| Custom providers | Keep compiling and keep behaving identically: `null` still fails the run, as before. |

**Why not remove `| null` from the type now.** Narrowing the return type is safe for *callers*, but a
custom provider declared as returning `TranslationOutput | null` stops being assignable to the
interface — a compile error for a consumer who changed nothing. That is precisely the break the
compatibility constraint forbids. The removal is therefore scheduled, not performed.

**Consequences already folded in:** finding A11 added; P2 rewritten; AC-4 now requires throwing; AC-4a
and AC-4b added (deprecated JSDoc; a null-returning custom provider still works); AC-7 and AC-12
updated; scope item 9 and the risk list updated.

### C2 — Key-set mismatch: apply what came back, report loudly *(resolved 2026-08-25)*

**Decision.** Validate the reply's key set on every call. On a mismatch, still apply the matching
subset — today's behaviour — but stop being silent about it: report how many and which leaves came
back untranslated. A reply that matches *nothing* is a failure and throws (C1).

**Why not hard-fail on any mismatch.** It would convert today's silent partial success into a failed
job for users who have been living with 98 %-good translations. That is a regression they would
experience on a routine upgrade, caused by a change they did not ask for.

**Why not retry the missing keys.** Extra request, extra cost, extra latency, and it hides the same
signal one level deeper. If mismatches turn out to be common in practice, a retry can be added later
on top of the reporting — the reporting is what tells us whether it is needed.

**Consequence:** the guarantee this issue adds is *visibility*, not *completeness*. Worth stating
plainly in the README so nobody reads "key-set validation" as "translations are now complete".

**AC:** 2, 2a.

### C3 — Default model: bump it, and publish the policy *(resolved 2026-08-25)*

**Question raised by the owner:** make `model` required in the next major, or at least document that
the default may move in minor releases?

**Decision — do the second now, leave the first open.**

1. **Now:** bump the default to a current model, and state the policy in both the README and the
   `model` JSDoc: *the default is a quick-start convenience and may change in a minor release; pin
   `model` for reproducible output and cost.* Announced in the release notes.
2. **Not now:** making `model` required. **No `DEPRECATIONS.md` entry for it yet.**

**Reasoning.** The policy note solves the actual problem completely — the objection to a moving
default is "you changed my behaviour without warning", and a published policy is the warning. What a
required `model` solves is a different problem: making the user *think* about cost and quality. That
is a real goal, but it is bought with a worse first five minutes (`createOpenAIProvider({ apiKey })`
is the one-line quick start, and a newcomer asked to name a model has no basis to choose).

The ledger in this repo is a commitment, not a note. Entering `model`-required into it today commits
us to a call we cannot yet check. The moment to decide is **after #100 lands**: with four providers,
each with its own default (and OpenRouter with none, since there is no sensible default for a model
catalogue), we will see whether the defaults read as a coherent API or as four unrelated behaviours.
If it is the latter, required `model` becomes obvious and goes into the ledger then.

**Recorded as a decision point, not a deprecation:** revisit "make `model` required" when #100 is
complete.

**AC:** 10a.

### C4 — Cancellation: in scope for #99, with a named limit *(resolved 2026-08-25)*

**Decision.** The port gains an optional 4th parameter carrying an `AbortSignal`, threaded through
`translateContent` → `TranslationPipeline` → `TranslationStage` → the providers.

Backward compatible in both directions: an implementation with the old three-parameter signature stays
assignable to the widened interface (TypeScript ignores extra parameters the implementation does not
declare), and a caller that passes nothing behaves exactly as today.

**The part that actually works, and the part that does not.** This is why the limit must be written
down rather than discovered later:

| Path | What cancellation can do |
| --- | --- |
| **Field level** (`translate-field/handler.ts`) — synchronous, inside the HTTP request | **Works properly.** `PayloadRequest extends Partial<Request>`, so `req.signal` exists: the editor navigating away or aborting the request aborts the provider call. No new machinery. |
| **Document / collection level** — runs inside a Payload job | **Bounded.** `POST /cancel` arrives as a *separate HTTP request*. An `AbortController` is a per-process object, so cancelling a running job requires an in-memory registry keyed by job id — which works only when the cancelling request and the running job share a process. With several instances, or a separate worker, the cancel lands in the wrong process and the request keeps running. |

**What #99 delivers:** the port change, the threading, working cancellation at the field level, and an
in-process registry for jobs — with the single-instance limitation documented at the call site and in
the README, not left for a user to find via their bill. Cross-process cancellation (a cancellation
flag the job polls between stages, or a shared registry) is explicitly **out of scope** and belongs to
whoever takes on multi-instance job semantics.

**This adds a vector to the design brief:** `concurrency`. Cancellation across processes is a
correctness contract, not a plumbing detail, and `/sp-architect` should be told so.

**AC:** 10b, 10c, 10d.

### C5 — The vendor dependency comes out: three layers, not one wrapper *(resolved 2026-08-25)*

**Owner's request:** let the consumer configure the vendor SDK themselves — today's configuration is
limited to whatever the wrapper chose to expose.

**Agreed, with a sharper problem statement.** The complaint reads as "not enough options"
(no `baseURL`, no `defaultHeaders`, no custom `fetch`, no `organization`, no client reuse, no
per-request `seed` / `service_tier` / whatever OpenAI ships next — a wrapper forever chasing someone
else's API). The real defect is one level up: **the built-in provider is a step with nothing to step
onto.** Extension already exists — the port is public and a custom provider is ~15 lines — but the
moment you need `baseURL` you don't *adjust* the built-in one, you throw it away and lose the prompt,
the dry run, the parsing and (after this issue) the key-set validation. A cliff, not a step.

Finding **A12** turns this from ergonomics into a defect: `openai` is a static top-level import on the
package's root entry path, so it is mandatory for every consumer regardless of which provider they use.

**Decision — three layers.**

| Layer | Surface | Audience |
| --- | --- | --- |
| 1. Toolkit | Pure functions: build prompt, build response schema, parse + validate key set. No vendor knowledge. ~~**Public.**~~ **Superseded — internal only, see the design doc's D11.** | ~~Someone writing a provider from scratch~~ — that audience turned out not to exist: they either need layer 2, or their service is not a language model and none of these functions fit |
| 2. `createTranslationProvider({ complete })` | A full `TranslationProvider` over **one** consumer-supplied "send text, get text back" function. Prompt, schema, validation, dry run are ours; the request is entirely theirs. **Public.** | Someone who needs full control of the call |
| 3. `createOpenAIProvider(...)` | Thin sugar over layer 2. Accepts `apiKey` (as today) **or** a ready-made `client`. | Most people |

Each step between layers is small: missing an option in layer 3 → inject your own client; need control
of the request body → drop to layer 2 and write ~5 lines, losing nothing; need a different service
entirely → implement the port, as today. This is also what makes #100 cheap: three new vendors are
three layer-3s over one layer-2.

**The SDK type.** Layer 3 types the injected client with a **narrow structural slice** — the
`.shapes.ts` convention already established in this package for Payload's god types, applied to the
OpenAI SDK. Consequences: `openai` leaves the package's dependency list entirely (closing A12), and the
package stops being pinned to one SDK major — the consumer owns that version.

**Costs, accepted deliberately:**

1. **Three contracts instead of one.** More public surface that cannot be broken later.
2. **An injected client can break our guarantees** — e.g. a `baseURL` pointing at a service with no
   structured-output support. Decision: **fail with a named error**, do not silently degrade to
   prompt-only JSON. Silent degradation would return exactly the class of defect this issue exists to
   remove.
3. **Key hygiene narrows.** AC-8 (no key in errors/logs) can only bind to clients we construct.
4. **Compatibility holds.** `apiKey` stays; `client` is an alternative. No consumer's
   `payload.config.ts` changes.

**Consequence for this issue:** the "shared toolkit" of #99 is not an internal helper module — it is
layers 1 and 2, and it is public. Non-blocking default Q7 (keep it internal) is overturned. The code
is much the same; what changes is what is exported and how the SDK is typed.

**This is the question `/sp-architect` is being handed:** not "how do we refresh the provider" but
**"where exactly do the three seams fall, and what does each layer promise"**.

**AC:** to be derived during design — layer boundaries are the design's output, not its input.
