# Design — translation-provider layering (#99)

- **Issue:** [#99](https://github.com/focusreactive/payload-plugins/issues/99) · epic [#98](https://github.com/focusreactive/payload-plugins/issues/98)
- **Research:** [2026-08-25-openai-provider-refresh-research.md](./2026-08-25-openai-provider-refresh-research.md) — findings, scope, acceptance criteria, decisions C1–C5
- **Date:** 2026-08-25 · **Status:** decided, two questions open (§6)

---

## 1. What is being built

The OpenAI adapter becomes three layers, so the vendor SDK leaves the package and consumers
configure the vendor themselves.

**Two public modules plus the port** — expressed to consumers as a four-rung ladder:

| Rung | What you write | What you take on |
| --- | --- | --- |
| 00 | `createOpenAIProvider({ apiKey })` | nothing — today's README, unchanged |
| 01 | `createOpenAIProvider({ client })` | nothing — you build the client (Azure, proxy, OpenRouter) |
| 02 | `createTranslationProvider({ complete })` | the call itself, its timeout and retries |
| 03 | `implements TranslationProvider` | everything — for a service that is not a language model at all (DeepL, Google Translate) |

| Module | What it is | Public? |
| --- | --- | --- |
| `TranslationProvider` (port) | The contract both modules implement, and what rung 03 implements by hand. Changes only by gaining an optional 4th parameter | yes, already was |
| `createTranslationProvider({ complete })` | A full provider over one consumer-supplied request function. Prompt, schema, validation, dry run, error normalization are ours; the request is theirs | **yes — new** |
| `createOpenAIProvider(...)` | Thin sugar over the above. Takes `apiKey` (as today) or a ready-made client | yes, exists today |
| `buildSystemPrompt` · `buildResponseSchema` · `parseAndValidateReply` · `runDryRun` | The pure functions the factory is built from | **no — internal (D11)** |

---

## 2. Decisions

| # | Decision | Why |
| --- | --- | --- |
| D1 | `complete` receives `{ systemPrompt, userContent, responseSchema, signal? }` and returns raw text | Without the schema a layer-2 consumer cannot ask their transport to enforce it, and every layer-2 provider falls back to the prompt-only hint this issue exists to remove. Raw text (not a parsed object) keeps parsing on our side |
| D2 | Parse and validate exactly once, inside layer 2, right after `complete` resolves | One boundary for untrusted input. A layer-2 consumer cannot bypass it; the only way around is writing a provider by hand, which was always allowed |
| D3 | The shared module lives in `src/translation-providers/shared/`, not in `src/core/` | The kernel extraction publishes `src/core` as its own package. The OpenAI adapter must stay outside core, so putting the shared module inside it would split the stack across two packages with separate release trains |
| D4 | The client slice fixes `chat.completions`; the vendor boundary is a **function** (`openAIComplete`), not the slice | Chat Completions is what Azure, OpenRouter and proxies implement — exactly the clients the slice exists to admit. And a slice is a type: it erases at compile time and translates nothing, so the response and error shapes need real code to stop them |
| D5 | The `openai` entry stays in `package.json`'s `optionalDependencies` this release; both static imports go; the SDK is loaded lazily on first `translate()` | `optionalDependencies` installs by default, so deleting that line now leaves every `apiKey` consumer without the SDK on a clean install — a runtime break the compiler cannot see. The real defect (a static import making an optional dependency mandatory in practice) is fixed regardless. Deleting the line is scheduled in the ledger for the next major |
| D6 | The error taxonomy lives in `shared/errors/`; **`src/core` gains no new outbound import** | An edge from the pipeline stage back into `translation-providers` runs the wrong way and becomes a circular dependency between two published packages after the kernel split |
| D7 | The port's 4th parameter is `options?: TranslationOptions`, declared **in `core/domain/` beside the port** | An options object absorbs call context and glossary later without a 5th parameter. Declaring it in `shared/` would recreate D6's forbidden edge |
| D8 | The abort registry belongs to the jobs runner; registration in the handler closure, abort in **`cancelInternal`** | See §3 — both placements are corrections of factual errors |
| D9 | Seven separately deployable steps (§5) | Each risky piece reverts on its own; the behaviour-changing ones land together as one release note |
| D10 | One file (`loadOpenAIClient.ts`) may name `openai`; a test scans `shared/**` **and** `openai/**` and allows only that file | `openai/**` is where the defect lived, so leaving it unscanned misses the case. Turns "the dependency is gone" from a fact into a property |
| D13 | **One factory, not two.** `createOpenAIProvider` keeps its name and accepts `apiKey` xor `client` as a discriminated config; the `apiKey` path is **not** deprecated | Splitting into a deprecated key-based factory plus a new client-based one was considered. It buys the same type-level strictness the union already gives, and costs three things: deprecation promises removal, but we do not want to remove the quickest entry point (it is every README example and all three in-repo consumers); what we actually need gone is the mandatory *dependency*, not the path — moving `openai` to optional peers in the next major achieves that while the key path keeps working for anyone who installs the SDK themselves; and the best name in the API would end up on the deprecated function. The one real merit of splitting — collapsing two ledger entries with the same trigger into one migration story — is taken instead by wording the single entry to cover both (see D5) |
| D12 | The client shape is **not versioned**. Instead: a conformance test (`const _: OpenAIClientShape = {} as OpenAI`) with `openai` in `devDependencies` | Writing a "v2" now means inventing a type for an unknown change — an abstraction with no caller. And `chat.completions.create` has survived every SDK major and become the de-facto shape Azure/OpenRouter/LiteLLM/Ollama copy. If they do break it, the conformance test turns our CI red on an SDK bump instead of a consumer's production. The real escape hatch already exists: rung 02 lets anyone route around us in six lines without waiting for a release |
| D11 | The pure functions are **internal**, not a third public layer | They have exactly one caller — the factory. The audience originally claimed for them splits in two, and neither half lands here: someone needing their own transport to a language model wants `createTranslationProvider`; someone whose service is not a language model (DeepL) has no use for a system prompt or a JSON schema. ST1 needs two callers with at least one already in the codebase; there is one. Exporting later is easy, un-exporting is not |

**Not reopened** (settled in the research, §12): the port keeps `| null` while deprecating it in
prose; a partial reply is applied and reported, not failed; the default model moves with a published
policy; cancellation is in scope with its multi-process limit documented.

---

## 3. Three facts that changed the design

Checked against the code, not assumed:

1. **`PayloadJobsTaskRunner.run()` never invokes the task handler** — it delegates to
   `payload.jobs.run(...)` (`:108`), and the handler closure lives in
   `PayloadJobsRunnerProvider.configure()` (`:135-158`). The `AbortController` must be registered
   there, and the handler's `{ req, input }` argument type has to widen to reach `job.id`.
2. **`enqueue()` calls `cancelInternal()` directly** (`PayloadJobsTaskRunner.ts:41`), bypassing
   `cancel()`. That is the supersession path. Hooking the abort into `cancel()` would let a
   superseded translation keep running and still write — the concurrent-overwrite bug the
   supersession logic exists to prevent. Hook `cancelInternal`.
3. **`src/core` imports nothing from `src/translation-providers` today**, and neither the lint zone
   nor the boundary test would catch it if it started to. That is what makes D6 a hard rule rather
   than a preference.

Also: the lazy client must be memoized **per provider instance**, not module-level — a module-level
cache leaks one consumer's client across differently configured providers and across test cases.

---


> **Implementation note (2026-08-25).** A `redactSecret` helper was specified here and then dropped
> during implementation: once `wrapTransportError` stopped quoting the vendor's message at all, there
> was nothing left to redact and the helper had no caller. The guarantee it existed for — a key never
> reaching a message that can be serialized into an HTTP response — is now structural rather than
> filtered, and is pinned by tests in `shared/errors/taxonomy.test.ts` and the adapter suite.
>
> Also from implementation: `loadOpenAIClient` tells a **missing** SDK apart from an **installed but
> broken** one, and wraps the SDK constructor — which the first cut left outside the guarded block, so
> an empty key threw raw, outside the taxonomy.

## 4. Where things go

```
translation-providers/openai  ──►  translation-providers/shared  ──►  core/domain, core/kernel
```

| What | Where |
| --- | --- |
| prompt · schema · parse + validate · dry run — **internal, not exported (D11)** | `shared/{prompt,schema,parsing,dry-run}/**` |
| error taxonomy (`TranslationProviderError` + 5 subclasses, `wrapTransportError`) — public | `shared/errors/` |
| the public factory | `shared/CompletionProvider.provider.ts` |
| client slice · vendor boundary · lazy load | `openai/{OpenAI.shapes.ts,openAIComplete.ts,loadOpenAIClient.ts}` |
| port + `TranslationOptions` | `core/domain/translation-providers/TranslationProvider.interface.ts` |
| job abort dispatch | `payload-jobs-runner/jobAbortRegistry.ts` |

**Ownership.** "Is this reply valid" — `parseAndValidateReply`, one call site. "Is this job
cancelled" — the job's database row, unchanged; the registry only answers "which controller is live
in this process" and is never read to decide job state. "Which SDK version" — the consumer, once a
client is injected.

**Failure behaviour.** Timeout and retry belong to whoever built the transport. Layer 2 adds no retry
and no timeout, and passes `signal` through so a caller can bound the call. The job path's retry is
the existing `retries: { attempts: 3, backoff: exponential }`. Every failure reaches the editor
through the existing error handler with a named cause — no route changes.

---

## 5. Build sequence

Every step reverts by reverting its commit; nothing writes data in a new shape.

1. **Add layers 1–2 and the taxonomy under `shared/`**, unwired and unexported.
   *Verify:* unit tests; full `turbo build` (the real `tsc` declaration emit, not just tsgo).
2. **Rewrite the OpenAI adapter onto the factory and export the two public modules.** Schema instead
   of the hint; key-set validation and report; sampling parameters only when configured; default
   model bumped with its policy; both `openai` imports deleted; `openai` added to `devDependencies`
   for the conformance test (D12); the package's own **60 s default timeout** replacing the SDK's ten
   minutes (`timeout` still overrides); the factory's declared return type is `TranslationProvider`.
   **Behaviour-changing — one deliberate release note.**
   *Verify:* the 22 adapter tests with the 3 null-asserting ones rewritten; the conformance test
   (`const _: OpenAIClientShape = {} as OpenAI`); `turbo build` **with and without `openai`
   installed**; one manual `apiKey` run in `apps/dev`.
3. **Machine enforcement** — lint rules plus the boundary test. **Must follow step 2**, or today's
   static import fails it. *Verify:* the test fails on a reintroduced import (check by temporary edit).
4. **Widen the port.** `TranslationOptions` in `core/domain/`; thread it through the pipeline and
   `TranslateContentArgs`; deprecate `null` in the JSDoc; reword the stage's generic message
   **without adding an import**. *Verify:* a 3-parameter provider still compiles and still runs.
5. **Wire `req.signal` at the field route.**
6. **Job cancellation.** `jobAbortRegistry.ts`; widen the handler argument type; register in the
   handler closure, release in `finally`; abort in `cancelInternal`; document the single-process
   limit. *Verify:* a cancel-during-run test **and a supersession-during-run test**.
7. **Docs and cleanup.** README correction and `Since` notes; ledger entries
   `translation-provider-null-return` and `openai-optional-dependency`; fix the ledger's stale path
   reference; update `create-ideal-cms/src/transforms.ts:95` and relax its forced placeholder key.

---

## 6. Open questions

Four were put to the owner on 2026-08-25 and answered — recorded in §6a. What remains open:

1. **The defect is only half fixed, and the release note must say so.** A strict schema stops a
   compliant model from dropping a field, key-set checking catches the rest, and the log names the
   missing index. But the job is still marked successful and the editor still sees untranslated text
   with nothing on screen. Closing it needs a separate channel carrying "this run was partial" from
   the factory through to the job row and the field response, plus an indicator in the interface —
   the wire format is frozen, so it cannot ride the return value. Nobody asked for that; it is a
   scope call. *Blocks:* nothing.

2. **Does `shared/` move at kernel phase 4?** After the split, the internal toolkit and the factory
   are unreachable to someone who installs only the kernel. Worth a tracked trigger on that slice
   rather than rediscovering it there. *Blocks:* nothing now.

## 6a. Answered by the owner — 2026-08-25

| Question | Answer | Where it lands |
| --- | --- | --- |
| Deleting the `openai` line from `optionalDependencies` — now, or deferred? Three of our own requirements (C5's "leaves the dependency list", C5's "`apiKey` keeps working", and the ledger's "removals ship in one major") cannot all hold this release. | **Deferred** to the next major | D5 stands. Step 7 writes the `openai-optional-dependency` ledger entry with its trigger and owner |
| `createOpenAIProvider`'s declared return type — the interface, or the concrete class? | **`TranslationProvider`** (the interface) | Step 2. Residual risk accepted: anyone who wrote `const p: OpenAITranslationProvider = createOpenAIProvider(...)` fails type-checking. No runtime impact — goes in the release note |
| The SDK's 10-minute default timeout, which blocks a live HTTP request at field level | **Our own 60 s default**; `timeout` still overrides | Step 2, plus the README option table |
| Issue #99's body describes three public layers and no cancellation | **Update it before implementation starts** | Done ahead of step 1 |

---

## 7. Considered and rejected

- **Positional strings without a schema in `complete`** — makes schema-driven output unreachable for
  every consumer of the factory.
- **Publishing the pure functions as a third public layer** — one caller, and its claimed audience
  does not exist (D11). Kept internal; exporting later stays cheap.
- **Moving the `openai` entry to `peerDependencies` (optional) now** — peers marked optional are not
  auto-installed, so this breaks a clean install on the `apiKey` path with no version boundary. It is
  the right *end state*, and is exactly what the `openai-optional-dependency` ledger entry schedules
  for the next major.
- **Letting the pipeline stage throw or read the new error type** — puts an import into `src/core`
  pointing back out of it.
- **A new `.registry.ts` role tag** — the convention already covers small topic-named helpers.
- **An injectable `onPartialMismatch` hook** — one caller, and it still carries the fact into no
  result. Use the plain log line.
