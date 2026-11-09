# What the prompt builder is told

Closes: #109

## Requirements / Task restatement

Two seams are blind, and together they make a per-collection system prompt impossible.

- `SystemPromptBuilder` (`translation-providers/shared/buildSystemPrompt.ts:32`) returns `string`, and
  its whole context is `{ sourceLang, targetLang, defaultPrompt }`. No way to `await`, so nothing can
  be read from the CMS inside it; no collection, so nothing can be scoped to one.
- The provider's `translate(input, sourceLng, targetLng, options?)` is told the text and two language
  codes. `TranslationRequestOptions` exists but carries only `inlineMarks`.

The reporter's cost, from the issue: they inject a glossary that lives in the CMS. Unable to read it
from a builder, they stopped using `systemPrompt` entirely and wrap the whole `TranslationProvider`
in their own async `translate` that rebuilds `createOpenAIProvider` per call with the terms in a
closure — **a wrapper that exists only to get an `await`**. Scoping a term to one collection stays
impossible at any price, because neither seam knows which collection is being translated.

## What already exists — platform · installed · project · verdict

- **Project, and it decides D1.** `CompletionProvider.provider.ts:151` already calls the builder as
  `await asConfigurationFailure("systemPrompt builder", () => buildSystemPrompt({…}))`, and
  `asConfigurationFailure` is already typed `(what, run: () => T | Promise<T>)`. The await is in
  place; only the type forbids a promise.
- **Project, and it decides D2.** `TranslationRequestOptions`
  (`core/domain/translation-providers/TranslationProvider.interface.ts:36`, `@since 0.13.0`) was added
  for exactly this: *"What the core can tell a provider about the request beyond the text itself.
  Optional, so every implementation written before it keeps compiling and working."*
- **Project, and it constrains D3.** Neither `src/core` nor `src/translation-providers` imports
  anything from `payload` today — measured, zero matches for `from "payload"` in either. The package's
  `CLAUDE.md` prescribes `*.shapes.ts` for the case where a leaf needs a slice of a Payload type:
  *"Define a narrow structural interface with only the fields you touch."* `Provenance.shapes.ts` is
  the worked example.
- **Verdict.** Nothing new is built. Two existing extension points are widened and one value is
  threaded through a context that already exists.

## The gap this change has to cross

`PipelineContext` (`core/translation-pipeline/types/PipelineContext.ts`) carries schema, source and
target data and the two language codes — **not** the collection or the document id. So the values
have to travel:

```
translate-document handler (knows both)
  → PipelineContext
    → TranslationStage (the only caller of provider.translate)
      → TranslationRequestOptions
        → buildSystemPrompt
          → SystemPromptContext
```

That is the whole change. Each hop is an optional field; none of it is new machinery.

## Decisions

### D1 — the builder may return a promise; nothing else moves

**Chosen:** `SystemPromptBuilder` returns `string | Promise<string>`; `buildSystemPrompt` becomes
`async` and awaits the override.

**What lost:** a second, separate `asyncSystemPrompt` option. It lost because the call site already
awaits through a helper already typed to accept a promise, so a second option would add a choice
where there is no second behaviour.

**The constraint it cites:** `CompletionProvider.provider.ts:151`.

### D2 — the collection and document ride `TranslationRequestOptions`

**Chosen:** add optional `collection` and `documentId` to `TranslationRequestOptions`, carry them on
`PipelineContext`, and pass them into `buildSystemPrompt` so they surface on `SystemPromptContext`.

**What lost:** a fifth parameter on `translate`, or a parallel channel beside the options object.
Both lost to the type's own stated purpose, quoted above — this *is* "what the core can tell a
provider about the request beyond the text itself".

**One behaviour note:** `TranslationStage` currently calls `translate` with **three** arguments when
no marks were sent, deliberately, so a provider written before options existed sees the old call. That
stays true when the new fields are absent, and the call grows a fourth argument only when there is
something to say.

### D3 — the handle to read the CMS with · **the gate question**

The issue asks for `payload?: Payload` on the context. Three answers, and this one is the owner's:

| | What it gives | What it costs |
|---|---|---|
| **(a) raw `Payload`** | exactly what the issue asks | the **first** `payload` import into `src/translation-providers`, and the same type then has to cross into `src/core`'s options. Both layers are Payload-free today, and the core is slated to become its own published package |
| **(b) a narrow `.shapes.ts` slice** | the host can `find` what it needs | a new structural type to maintain, and it still names a Payload-shaped capability inside a Payload-free layer |
| **(c) no handle — `collection` and `documentId` only** | the builder is now **async**, so the host awaits its own lookup; it already owns a `payload` handle, or takes one with `getPayload({ config })` | the issue's literal ask is not met; the host writes one line it did not write before |

**Recommended: (c).** It solves the reported problem — the glossary read becomes possible because the
builder may await, and per-collection scoping becomes possible because `collection` arrives — without
putting Payload into two layers that have none. (a) is the only one that would be undone by the core
extraction.

### Placement

| Piece | Lands in |
|---|---|
| return type widened, `buildSystemPrompt` async, context fields | `translation-providers/shared/buildSystemPrompt.ts` |
| `collection` / `documentId` on the options | `core/domain/translation-providers/TranslationProvider.interface.ts` |
| the two fields on the pipeline context | `core/translation-pipeline/types/PipelineContext.ts` |
| passing them to the provider | `core/translation-pipeline/stages/translation/Translation.stage.ts` |
| filling them when the pipeline is built | `server/features/translate-document/handler.ts` |
| reading them into the prompt | `translation-providers/shared/CompletionProvider.provider.ts` |

### New surface

**None.** No new file, no new type, no new dependency — four existing types gain optional fields.

### Written contract?

**Yes, one — corrected during Phase 3, see below.** `SystemPromptBuilder` gains an obligation its
signature cannot state: `collection` and `documentId` are present whenever the request has a document
behind it, and absent only when it has none. A builder must treat them as optional rather than assume
a document. That sentence is what the tests are written against.

> **Corrected 2026-10-15, mid-implementation.** This contract first said both are *absent for a
> field-level translation*. That was wrong on the facts and worse as a design: the field route's input
> schema makes `collection_slug` and `doc_id` **required** (`translate-field/handler.ts:49`), so it
> knows both. Had it kept them to itself, a glossary a host scoped to one collection would silently
> fail to apply when an editor translated a single field on a document of that same collection — an
> inconsistency with no explanation. Both surfaces now pass them; absent means "no document behind the
> request", which is a caller driving `translateContent` directly.

### Escalate to /sp-architect?

**No.** It widens two extension points that were built to be widened. The one decision that could
outlive the task — whether Payload enters these layers — is D3, and it is being put to the owner
rather than improvised.

### D5 — the document is required inside the fourth argument (added 2026-10-15, at the owner's challenge)

**Chosen:** `TranslationRequestOptions.document: DocumentRef` — required. The parameter holding it
stays optional.

**What lost, and why:** `document?`, which is what D4 shipped. The owner asked why it was optional and
the honest answer did not survive the question. Measured: the **only** producer of that object is
`Translation.stage.ts:22`, and it always sets the document. A request description without a subject is
a state nothing in the codebase creates, so the type was admitting a shape the system cannot reach —
the second of the four counted questions, failed by the author of the check.

**Why an optional parameter may hold a required field.** The two question marks answer different
questions, and only one of them is about the domain:

- the **parameter** is optional — "does this caller say anything about the request at all?" A provider
  called on its own is asked to translate strings, and that is a complete request; a dozen of
  `CompletionProvider`'s own tests call it that way.
- the **field** is required — "if you do describe the request, what must you say?" Describing it
  halfway is what nothing produces.

An envelope you need not send, but may not send half-filled.

**What stays optional, with its reason:** `SystemPromptContext.document`. The builder is reached
through a provider that may have been called without a request description at all, so absence is
reachable there and is tested.

**The owner's deeper challenge, and where it went.** He pointed out that `translate` does not need the
document — `TranslationStage`, `CompletionProvider.translate` and `buildSystemPrompt` all carry it
without reading it; the only reader is the consumer's `systemPrompt` function. The alternative —
assembling the prompt in the plugin — was considered and rejected by his own test of it: `systemPrompt`
belongs to a language-model provider, not to the plugin. A GoogleTranslate provider has no system
prompt at all, so lifting the option would put an LLM-only concept where every provider must fit.
The carrying therefore delivers to where the reader lives; what is wrong is the delivery's *shape*.
That is recorded twice: `translate-positional-languages` in `docs/DEPRECATIONS.md` for the signature,
and open question 5 in `docs/plans/2026-08-21-translation-mechanism-kernel-extraction.md` for whether
`buildSystemPrompt` stays part of the provider or becomes something a provider *declares it accepts*,
the way `capabilities.inlineMarks` already works.

**Breaking, honestly:** requiring a field on a published type breaks anyone constructing one by hand
without a document. Nobody does — the plugin is the sole producer — but it belongs in the release note.

## Acceptance Criteria

| AC | Criterion | How it is checked | Passes when |
|---|---|---|---|
| AC1 | An async builder is accepted and its text reaches the request | unit on `CompletionProvider`: a builder returning a promise, assert the resolved text is sent | green |
| AC2 | A synchronous builder keeps working, unchanged | the existing `buildSystemPrompt` suite | green, no edits to its expectations |
| AC3 | A builder is told the collection and the document id | unit on `buildSystemPrompt` + an `apps/dev` integration case translating a document and asserting what the builder saw | green on sqlite · postgres · mongo |
| AC4 | The field surface tells the builder the same document the document surface would | unit on the field route's provider call | both present and matching the request |
| AC4b | A caller with no document behind the request leaves both absent | unit on `translateContent` without them | both `undefined` |
| AC5 | A provider that ignores the fourth argument still works | the existing three-argument call path, plus a provider double with a 3-arity `translate` | green |
| AC6 | The public surface grows only optional members | build `dist` declarations here and on `main`, diff them | only additive optional fields; `index.d.ts` export list unchanged |
| AC7 | No new type errors | `bun run check-types` here and in `apps/dev`; `bunx tsc --noEmit -p tsconfig.json` in `apps/dev` | 0 · 0 · 2 (both pre-existing) |
| AC8 | No new lint findings | `bunx oxlint .` here; `bunx oxlint src` in `apps/dev` | ≤ 46 / 0 errors · ≤ 5 |
| AC9 | Nothing regressed | `bunx vitest run`; the three integration suites | ≥ 2103 · ≥ 236 / 241 / 234 |

## Pre-flight — every check run against the untouched tree

| AC | Result now | Classification | Evidence |
|---|---|---|---|
| AC1 | **FAILS** | change | probe: `Type 'Promise<string>' is not assignable to type 'string'` |
| AC2 | passes | invariant | the suite is green today |
| AC3 | **FAILS** | change | probe: `Property 'collection' does not exist on type 'SystemPromptContext'`, same for `documentId` |
| AC4 | **not expressible yet** | change | the fields do not exist, so nothing can assert what the field route passes |
| AC4b | **not expressible yet** | change | same reason |
| AC5 | passes | invariant | `Translation.stage.ts:37` already calls with three arguments |
| AC6 | n/a until there is a diff | change | — |
| AC7 | 0 · 0 · 2 | invariant | measured; the two are `payload.config.ts:184` and `vitest.integration.config.ts:21` |
| AC8 | 46 / 0 · 5 | invariant | measured |
| AC9 | 2103 · 236 / 241 / 234 | invariant | measured on this branch |

## Risk notes

**Risk classification: HIGH.** `TranslationProvider`, `TranslationRequestOptions`,
`SystemPromptBuilder` and `SystemPromptContext` are all exported from `src/index.ts` and implemented
outside this package. The change also threads a value through `src/core`, the kernel slated to become
its own published package.

What that buys downstream, and will be honoured: this gate asks with `AskUserQuestion`; a test is
required before the change is called done; the Phase 4 sweep is evidenced and names what was grepped;
Phase 5 runs three review angles rather than one.

**Hazards:**

- **The field surface shares the pipeline but not the queue.** It must pass the same two values the
  document surface does, or a collection-scoped prompt would apply inconsistently between the two
  ways of translating the same document. AC4 exists for this; AC4b guards the genuinely document-less
  caller.
- **`TranslationStage`'s three-argument call is deliberate** and documented in a comment at
  `Translation.stage.ts:32`. Widening the options must not turn it into an always-four-argument call.
- **D3 decides whether Payload enters two layers that are clean today.** Chosen (c) keeps them clean;
  (a) would be undone by the core extraction
  (`docs/plans/2026-08-21-translation-mechanism-kernel-extraction.md`, status *designed*).
- `#142` (glossary, tone, protected terms) sits on this seam and is labelled `major`. This task
  unblocks it; it must not start implementing it.

## Human choices

- **2026-10-15** — do #109 now rather than defer it to the major: the owner judged the change
  additive and small, against the backdrop of a planned rework of the core and the provider wiring.
  Recorded with the caveat that the `TranslationRequestOptions` half may be reshaped by that rework.

- **2026-10-15** — **D3 resolved: (c), no handle.** The owner reached it independently — routing a
  handle "around the core" *is* `getPayload`, because the only channel from the handler to the
  provider runs through the pipeline, i.e. through `src/core`. So a `payload` field would put a
  Payload reference in the kernel, not merely in the vendor layer. Two further reasons recorded: the
  host already owns the handle it would be given back, and an optional `payload` would lie about
  lifetime — the field route and test doubles call a provider with no request-scoped instance, so the
  field would be sometimes-live and sometimes-absent with no way for a builder to tell. The lazy
  `@payload-config` import needed inside `payload.config.ts` is the accepted cost, and goes in the
  README example rather than being left for the host to discover.
- **2026-10-15** — **a `withPayload(builder)` convenience helper is deliberately not added.** One
  named consumer, and it would hide the module cycle instead of naming it. Revisit if a second host
  hits the same wall.
- **2026-10-15** — **the context gains `collection` and `documentId` and nothing else.** `strategy`
  is available at the call site and was rejected: the text sent is identical under either strategy and
  no use for it in a prompt could be named, which the package's own rule forbids. `publishOnTranslation`
  and `waitUntil` cannot affect wording. A run identifier does not reach the handler at all. Per-value
  field names were considered and deferred to #142 — they are a per-value shape, not a per-request one,
  and the chunks that carry them also carry live document references. The decision is cheap to revisit:
  this type is only ever read by a builder, so a further optional field breaks nobody.

## Verification — 2026-10-15

| AC | Verdict | Evidence |
|---|---|---|
| AC1 | met | red before: `expected '[object Promise]\n\nSome values conta…' to contain 'Glossary: ampere = Ampere.'` — an async override was concatenated unawaited, a live defect, not just a type gap. Green after; `CompletionProvider` covers the same at provider level |
| AC2 | met | the existing suite is green with its expectations untouched; only the calls gained `await` |
| AC3 | met | red before: `expected { collection: undefined, …(1) } to deeply equal { collection: 'machines', …(1) }`. Green after at unit level and through `prompt-context.int.test.ts` on sqlite · postgres · mongo |
| AC4 | met | `translate-field/__tests__/handler.test.ts` asserts the field surface names the same document; proven by a mutation that removed the two fields from the field handler and reddened that case alone |
| AC4b | met | `translateContent.test.ts` asserts a document-less caller is given no options; proven by a mutation making `requestOptions` always return an object |
| AC5 | met | `requestOptions` returns `undefined` when it has nothing to say, so the three-argument call survives; `OpenAITranslationLegacy` forwards the fourth argument verbatim and was read |
| AC6 | met, with one caveat below | declarations built on `main` and here and diffed: `index.d.ts` byte-identical; the only changes are two optional fields on `SystemPromptContext`, two on `TranslationRequestOptions`, and the widened `SystemPromptBuilder` return |
| AC7 | met | package 0 · `apps/dev` check-types 0 · `apps/dev` tsconfig.json 2 (`payload.config.ts`, `vitest.integration.config.ts`, both pre-existing) |
| AC8 | met | `Found 46 warnings and 0 errors`; `sp-lint-delta` two-run: *No findings introduced by this change* |
| AC9 | met | package **2111** passed / 151 files; sqlite **237** · postgres **242** · mongo **235**, each one above its baseline |

**AC6's caveat, stated rather than buried.** Widening `SystemPromptBuilder`'s return is safe for a host
that *assigns* a builder, and safe for the plugin, which is the only caller. It is **not** safe for a
host that calls its own builder through the published type and assigns the result to `string` — that
now fails to compile. Unlikely, and the remedy is one `await`, but it is not purely additive and the
release note should say so.

### Prevention — the sweep (high risk, so evidenced)

Every file naming a touched surface was read, not just counted:

- **`SystemPromptBuilder` — 5 files.** `index.ts` and `translation-providers/shared/index.ts` are
  barrels; `buildSystemPrompt.ts` declares it; `CompletionProvider.provider.ts` consumes it;
  `OpenAITranslation.provider.ts:132` forwards it into `createTranslationProvider` untouched.
- **`TranslationRequestOptions` — 5 files.** The interface, its barrel, `Translation.stage.ts` (the
  only producer), `CompletionProvider.provider.ts` (the only reader), and
  `OpenAITranslationLegacy.provider.ts:31`, which passes the argument through verbatim.
- **`buildSystemPrompt` — 4 files**, three source and its own test. Not exported from `src/index.ts`,
  so going async costs no consumer.
- **`PipelineConfig` — 3 files**: the type, its barrel, and `TranslationPipeline.ts`, which maps it
  onto the context.

Guardrail left behind: the integration case asserts the values at the provider on three databases, so
a hop lost anywhere between the handler and the provider fails a test rather than silently producing
a prompt with no scope.

### Comment gate

Comments added: the `requestOptions` docblock (why it answers `undefined`), a one-liner on
`PipelineContext` saying the two fields are carried but read by no stage, the `@since 0.18.0` blocks
required on public members, and a line on the test harness hook. One finding, applied: `@since` tags
had been put on `TranslateContentArgs`, which is **not** re-exported from `src/index.ts`, so the
package rule does not reach it — removed as noise.

### Noted, not acted on

`TranslationRequestOptions` is not exported from `src/index.ts` while `TranslationProvider` is, so a
third-party provider receives the fourth argument but cannot name its type. The gap arrived with the
type in 0.13.0; this change makes it likelier to matter. Left for the owner against ADR-0002.

### D4 — identity is named, not optional, and not an "option" (added 2026-10-15, after the gate)

**Chosen:** a named `DocumentRef = { collection: string; id: string }`, carried as one field
`document`. Required on `TranslateContentArgs`, `PipelineConfig` and `PipelineContext`; optional only
on `TranslationRequestOptions` and `SystemPromptContext`, where the parameter holding it is itself
optional for providers written before 0.13.0.

**What lost, and why:** two flat optional fields — the shape this task shipped at the gate. The owner
objected on two counts and both hold:

- **They are not options.** `TranslationRequestOptions` otherwise holds `inlineMarks`, a switch about
  *how* to translate. `collection` and `documentId` say *what* is being translated. One bag held both.
- **They were not optional.** Every real caller — the document surface, the field surface and
  auto-translate — has both. Optionality existed only for a caller that is not part of the published
  surface, so the type admitted a state the system never produces.

Grouping buys a third thing nobody asked for: "a collection with no document", and its mirror, stop
being expressible.

**Named `document`, not `target`,** because `target` sits one argument away from `targetLng` and would
read as the target *language*.

**What this costs, stated:** `requestOptions` no longer returns `undefined`, so a provider is now
always called with four arguments — three survives nowhere. One existing test asserted the
three-argument call (`TranslationPipeline.test.ts`) and was updated; that edit is the evidence of the
behaviour change, and it belongs in the release note.

**What was deliberately not done:** folding `sourceLng` and `targetLng` into the same object —
`translate(input, ctx)`. The owner raised it, it is the better shape, and it is breaking. Recorded as
`translate-positional-languages` in `docs/DEPRECATIONS.md` with status `planned`, to land with the
kernel extraction rather than being done twice. The README's recommended path,
`createTranslationProvider({ complete })`, is unaffected either way: `CompletionFn` already takes one
object.

## Review log

**2026-10-15 · three angles, high risk. Four findings applied, three recorded for the owner.**

Applied:

- **The public docblock still carried the sentence this contract corrected.** `SystemPromptContext`
  and `TranslationRequestOptions` both said the two fields are absent "for the field surface", which
  stopped being true the moment the field route started naming its document. The text had already
  reached `.d.ts`, so a builder's author would have read the opposite of the behaviour. Both rewritten:
  absent means the caller has no document.
- **`documentId` is narrowed from `string | number` to `string`.** Measured: `ID = string`, and the
  field route's `doc_id` goes through `JobIdSchema`, which ends in `.transform(String)`. The wider type
  promised a number the plugin never sends, three unit fixtures were asserting `7` — a value production
  cannot produce — and narrowing a published type after release is breaking while widening it is not.
- **The comment on `requestOptions` was telling a comfortable untruth.** It claimed a provider written
  before options existed still sees the three-argument call. Both surfaces now always name a document,
  so four arguments is the normal case; three survives only for a caller driving the pipeline with no
  document. Reworded to say that.
- **One tautology removed.** `"leaves both absent when the caller translates outside a document run"`
  passed before the implementation existed, because the fields did not. The behaviour is really guarded
  one level up, by `translateContent.test.ts`'s `toBeUndefined()` case, which a mutation reddens.

Recorded, not acted on — the first two belong in the release note, the third is the owner's:

- **The fourth argument now arrives on nearly every call.** Before, its presence implied `inlineMarks`.
  A third-party provider branching on `if (options)` rather than `options?.inlineMarks === true` would
  now enable mark handling on every request. Behaviour, not a type error.
- **A host that concatenates its own builder's result** — `` `${base(ctx)}\n…` `` — now silently
  interpolates `[object Promise]`, because a template literal accepts a promise. The compiler says
  nothing. Same class as the defect this change fixed inside `buildSystemPrompt`.
- **`README.md`** still describes the builder as receiving only the two language codes and the prompt,
  with no mention of awaiting or of the new fields, and the export table carries no version note. The
  README is the owner's; text offered separately, not applied.

Confirmed by review and left alone: every hop of the thread carries the values, including
auto-translate, which reaches the same document handler; `requestOptions` cannot return an empty
object; the inline-marks instruction is still appended after whatever the override returns; and
`TranslationRequestOptions` need not be exported — `Parameters<TranslationProvider["translate"]>[3]`
names it for the one shape (a class with `implements`) that cannot infer it.

Open question left for the owner, raised by the threading review: the two fields sit on
`PipelineContext`, which every stage reads, yet **no stage reads them** — the comment saying so is
itself the smell the owner's own rule warns about. The alternative is handing them to `TranslationStage`
through its constructor, the way the provider already arrives, leaving the kernel's working state about
document data only. Not changed unilaterally: the shape was approved at the gate.
