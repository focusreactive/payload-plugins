# The provider port says what it means

Step 8 of the next major (#201, part of #192). Narrows the framing in #201 on one point: the source
language does **not** become optional — see R10.

## Why

The port grew by accretion, and every part of it now says something that is not true.

```ts
translate(
  input: TranslationInput,
  sourceLng: string,
  targetLng: string,
  options?: TranslationRequestOptions
): Promise<TranslationOutput | null>;
```

- **Two adjacent strings of the same type.** `sourceLng` and `targetLng` can be swapped at a call
  site and nothing complains. The compiler cannot help, and the symptom — every document translated
  into the language it was written in — looks like a provider fault.
- **`| null` is already a lie.** The built-in `CompletionProvider` throws; it has not returned `null`
  for several versions. A caller reading the signature still has to handle a case that cannot occur,
  and a caller trusting it learns nothing about what failed.
- **Capabilities default to the worse answer.** `capabilities?` is optional and absent means "nothing
  extra", so an author whose provider *does* preserve inline marks but who never declared it gets
  node-by-node translation — quieter output, no error, no way to notice.
- **The instruction the plugin tuned is locked inside the plugin's own provider.**
  `INLINE_MARKS_INSTRUCTION` lives in `translation-providers/shared/buildSystemPrompt.ts`, and its
  docblock records that the wording was validated against 396 live translations across four models
  before it shipped. A third-party provider that declares the capability has no access to it and
  will reinvent it, worse.

Two further things make this area hard to read, and they are in scope because the reshape has to
touch the same files:

- `core/domain/translation-providers/` holds the contract **and** `failureReason.ts`, which has
  nothing to do with providers: `markFailureReason` / `readFailureReason` are used by access errors
  (`PermissionCheckFailed`, `RequesterMissing`), by translation errors (`SourceUnreadable`,
  `TranslationRefused`) and by `toClientErrorMessage`. It is not even exported from the folder's
  barrel. The seam reads as "a folder that does nothing" because the one thing it visibly declares
  is a contract, and the one thing it implements belongs elsewhere.
- All 13 provider test files sit beside their source, while 124 of the package's test files sit in
  `__tests__`. The convention exists and is two-thirds kept.

## Requirements

- R1 (in) The two language codes stop being adjacent positional strings a call site can swap.
- R2 (in) A failure is reported by throwing, and what is thrown carries a cause the plugin can read
  without parsing a message.
- R3 (in) A provider states its capabilities; there is no default that silently picks the lesser
  behaviour.
- R4 (in) The instruction text the plugin tuned is reachable by any provider that declares it
  preserves inline marks.
- R5 (in) A third-party provider satisfies the port without importing the built-ins' error classes.
- R6 (in) Test files live in `__tests__`, package-wide.
- R7 (in) `core/domain/translation-providers/` holds the contract and nothing else.
- R8 (in) The deprecations this step owns leave with it: positional languages
  (`translate-positional-languages`), the dry-run option (`provider-dry-run`), client construction,
  and the `OpenAITranslationLegacy` class that #196 allocated here.
- R9 (out) Glossary and brand voice. A separate, unbuilt task. Nothing is built here; the shape must
  **admit** them later, which is checked when the port is modelled, not implemented now.
- R10 (out) Auto-detecting the source language. Both codes stay required. Today an empty
  `sourceLng` means "detect it yourself" by provider convention; that convention goes. If detection
  ever lands it arrives as an explicit value, never as an empty string standing in for absence.
- R11 (out) Container mode for rich text and the public block list — they land with the swap, #199.

## Decision points

- D1 [load-bearing] Two arguments: what to translate, and the request it belongs to.
- D2 [load-bearing] Capabilities are declared, never defaulted.
- D3 [load-bearing] A failure is thrown and carries a code; the classes stay with the built-ins.
- D4 [load-bearing] The mark instruction is exported, not dictated.
- D5 [minor] Both language codes stay required.
- D6 [minor] `failureReason` leaves the seam for the layer that uses it.
- D7 [minor] The tidy lands first, as its own commit range, before any signature changes.

## Requirement coverage

| | Design element |
|---|---|
| R1 | `TranslationRequest`, carrying both codes as named fields |
| R2 | `translate` returns `Promise<TranslationOutput>`; failure is a throw carrying `code` |
| R3 | `capabilities` required on the interface |
| R4 | `INLINE_MARKS_INSTRUCTION` exported from the package entry point |
| R5 | `TranslationFailureCode` moves to `core/`; the classes stay in `shared/errors/` |
| R6 | the tidy step, package-wide |
| R7 | `failureReason.ts` moves out of the seam |
| R8 | the deprecation sweep, step 3 of the build sequence |
| R9 | not built — checked at modelling |
| R10 | not built — the empty-string convention is removed, nothing replaces it |
| R11 | not built — #199 |

## The port, after

```ts
export interface TranslationProvider {
  capabilities: ProviderCapabilities;
  translate(input: TranslationInput, request: TranslationRequest): Promise<TranslationOutput>;
}

export type ProviderCapabilities = {
  /** The provider returns every numbered inline mark exactly once, moved where the target needs it. */
  preservesInlineMarks: boolean;
};

export type TranslationRequest = {
  sourceLng: string;
  targetLng: string;
  document: DocumentRef;
  /** The values carry numbered inline marks. A statement about the payload, not a request. */
  valuesCarryInlineMarks: boolean;
};
```

**The two `inlineMarks` are renamed apart.** Today the word names two different things: what the
provider claims about itself, and what the plugin states about this payload. One name for two
meanings is how a reader comes to believe the plugin is asking the provider to do something, when it
is only describing what it sent.

## Decision records

### D1. Two arguments: what to translate, and the request it belongs to

**Context.** `sourceLng` and `targetLng` sit adjacent, same-typed and positional. A call site can
swap them and nothing complains; the symptom is every document translated into the language it was
written in.

- **Options considered:** keep the four positional parameters · fold everything including the text map into one argument · two arguments — the text map, and a required request describing it

**Decision.** (c).

**Why the others lost.** (a) is the defect itself. (b) makes the large payload and its small
description one literal, and at every call site the text map dominates the read while the conditions
disappear into it.

**Consequences.** The trailing bag stops being optional: a request with no target language is not a
state the plugin produces, and `options?` pretended otherwise. Same move as the runner port at step
6, for the same reason.

### D2. Capabilities are declared, never defaulted

**Context.** `capabilities?` is optional and absent means "nothing extra". An author whose provider
preserves inline marks but who never declared it gets node-by-node translation: quieter output, no
error, nothing to notice.

- **Options considered:** keep it optional, absent meaning nothing extra · required, as `RunnerCapabilities` already is · infer it at runtime from what the provider returns

**Decision.** (b).

**Why the others lost.** (a) makes the lesser behaviour the default and leaves two ports in one
plugin answering the same question in opposite ways. (c) costs a wasted call and then guesses from
content — which `TranslationRequestOptions` already rejected in its own docblock, because customer
text can legitimately contain `<1>`.

**Consequences.** Every existing provider must add the field. The step is breaking regardless, so
the obligation costs nothing it was not already costing.

### D3. A failure is thrown and carries a code; the classes stay with the built-ins

**Context.** The port says `Promise<TranslationOutput | null>`; the built-in `CompletionProvider`
has thrown rather than returned `null` for several versions. The signature describes a case that
cannot occur and hides the one that can.

- **Options considered:** keep `| null` · return a defined failure value instead of `null` · throw, carrying a code, with the classes staying in the built-ins · throw, and require every provider to use the built-ins' error classes

**Decision.** (c).

**Why the others lost.** (a) is already false. (b) makes every caller branch on the result — the
ceremony this step exists to remove. (d) makes a third-party provider import ten files to report a
timeout.

**Consequences.** A plain `Error` carrying `code` satisfies the port. The shape already exists — it
is just in the wrong place:

```ts
// translation-providers/shared/errors/TranslationProviderError.ts
export type TranslationFailureCode =
  | "no-content" | "unparseable-reply" | "key-set-mismatch" | "transport" | "config";

export abstract class TranslationProviderError extends TranslatorError {
  abstract readonly code: TranslationFailureCode;
  readonly mustPropagate = false;
}
```

`TranslationFailureCode` and the one-line obligation move to `core/`: **a provider reports failure by
throwing, and what it throws carries `code`; the original failure travels on `cause` and is never
interpolated into `message`** — a vendor SDK error can carry an API key, and `message` reaches an
HTTP response body.

The classes stay in `shared/errors/` as a convenience the built-ins use. A third-party provider
satisfies the contract with a plain `Error` carrying `code`; it imports nothing.

**Throwing, not returning a failure value.** The built-in already throws, and a returned failure
would make every caller branch on the result — the ceremony this step exists to remove.

### D4. The mark instruction is exported, not dictated

**Context.** `INLINE_MARKS_INSTRUCTION` lives inside the built-in provider, and its docblock records
that the wording was validated against 396 live translations across four models. A third-party
provider that declares the capability cannot reach it.

- **Options considered:** leave it inside the built-in provider · export it as a constant any provider may use · put the text in the request, so every provider receives it · give the port a member asking the provider which instructions it needs

**Decision.** (b).

**Why the others lost.** (a) makes a third-party author reinvent a measured wording, worse and
silently. (c) assumes every provider has a prompt to put text in; a machine-translation API has
none, so the plugin would be dictating a shape only some implementations have. (d) adds a member to
a port this major is narrowing.

**Consequences.** The division is stated: the plugin encodes formatting as marks and says so, the
provider declares whether it copes, and *how* it makes a model comply is its own business. The
constant is a gift, not an obligation — nothing checks that a provider used it.

### D5. Both language codes stay required

**Context.** `sourceLng` is a required string whose empty value means "detect it yourself". #201
asked to make the parameter optional.

- **Options considered:** optional source language, as #201 asked · both codes required, and the empty-string convention removed

**Decision.** (b), narrowing #201.

**Why the other lost.** The plugin always knows the source locale — from the request or from the
project's configuration — so an optional parameter would admit a state the plugin never produces,
which is the same fault as the empty string it replaces.

**Consequences.** The empty-string convention goes with nothing in its place. If provider-side
detection is ever wanted it arrives as an explicit value, never as an empty string standing in for
absence. #201's text must be corrected so the clause is not restored later.

### D6. `failureReason` leaves the seam

**Context.** `core/domain/translation-providers/` holds the contract and `failureReason.ts`, whose
callers are access errors, translation errors and `toClientErrorMessage` — none of them a provider.
It is not exported from the folder's barrel.

- **Options considered:** leave it where it is · move it to the layer whose errors use it · keep it but export it from the seam's barrel, so at least the placement is declared

**Decision.** (b).

**Why the others lost.** (a) keeps a cross-cutting helper parked where a reader goes looking for a
contract, which is why the folder reads as doing nothing. (c) declares the wrong placement more
loudly.

**Consequences.** `core/domain/translation-providers/` holds the contract alone, which is what R7
asks for.

### D7. The tidy lands first

**Context.** The reshape and the tidy touch the same files. The tidy moves 83 test files and
relocates a helper without changing behaviour; the reshape breaks every third-party implementation.

- **Options considered:** one branch for both · tidy first, reshape second · reshape first, tidy after

**Decision.** (b).

**Why the others lost.** (a) is the failure #209 already demonstrated — one branch carrying two
bodies of work, with a name that said only one, and a review nobody could read. (c) moves files that
are about to change signature, so the move's diff and the reshape's diff overlap on the same lines.

**Consequences.** Two ranges, each reviewable alone. The tidy can land even if the reshape is
deferred.

## Build sequence

Each step leaves the tree green and is reviewed on its own.

1. **The tidy** — tests to `__tests__` package-wide; `failureReason` out of the seam;
   `shared/errors/` reduced from ten files for one taxonomy; the three constraints whose comments
   were deleted in `OpenAITranslation.provider.ts` made structural rather than restored as prose. No
   behaviour change, no signature change. covers: R6, R7
2. **The reshape** — `TranslationRequest` carrying both codes as named fields; `capabilities`
   required; `translate` returning `Promise<TranslationOutput>` with failure thrown;
   `TranslationFailureCode` moved to `core/`; `INLINE_MARKS_INSTRUCTION` exported; the two
   `inlineMarks` renamed apart. Breaking. covers: R1, R2, R3, R4, R5
3. **The deprecation sweep** — positional languages, the dry-run option and its types, client
   construction (which takes the optional `openai` dependency with it while `openAIComplete` and the
   client shape stay), and `OpenAITranslationLegacy`. Breaking. covers: R8

Steps 2 and 3 may merge if step 2 turns out small; decide once it is written, not before.

## Modelling, before the code

The port is modelled once step 2's shape is written and before it is built. Two questions it must
answer:

- **Will a glossary and a brand voice fit later?** R9 builds neither, but a shape that cannot admit
  them without a second breaking change has failed. The question is where per-project vocabulary and
  tone would attach: to `TranslationRequest`, to a capability, or to something the provider is
  configured with once.
- **What does a provider that declares `preservesInlineMarks: false` cost?** The plugin falls back to
  node-by-node translation today. That path crosses the swap (#199), so its contract should be stated
  here rather than discovered there.

## Verification

From the package: `bunx vitest run`, `bun run check-types`, `bunx oxlint .`. From the root:
`bunx turbo run build` — the real `tsc` declaration build — and `bunx turbo run check-types`. From
`apps/dev`: `bun run test:integration` after `bunx turbo run build --filter`, because the dev app
consumes the built package, not the source.

Step 2 changes the public surface, so by the epic's rule it owes a prerelease under the `next`
dist-tag, exercised in `apps/cms` against a real database.

**That obligation is currently unmeetable.** The merge of #213 ran the release workflow, found three
commits since `1.0.0-next.6` and reported no relevant changes; npm still carries `1.0.0-next.6`. The
cause is not the `!` in `feat!:` — `1.0.0-next.5` was released from exactly such a commit. It is
unresolved, and it blocks step 2 from being called finished.

## Deliberately not done

- **No glossary, no brand voice.** A separate task. This step only owes them a shape they can land
  in.
- **No source-language detection.** See D5.
- **No change to what the plugin does when a provider cannot preserve marks.** Node-by-node
  translation stays as it is; the swap owns that path.
