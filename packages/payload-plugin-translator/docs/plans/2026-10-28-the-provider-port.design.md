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
- **The marks flag is request-wide; marks are a property of one value.** `inlineMarks` is set when
  *any* chunk in the request is a rich container, and the instruction is appended to the whole
  prompt. A plain `text` field whose value legitimately contains `<1>` — a template placeholder, a
  footnote reference — then travels under an instruction saying those marks are formatting whose
  order may change, and its reply is written back with nothing checked. The hazard is already known
  here: `collectInlineFragments` refuses a mark-shaped container (`MARK_SHAPED`) and `parseInlineMarks`
  checks the reply again before it is applied. Both guards sit on the chunk; the instruction sits on
  the request, so a value with neither guard receives an instruction meant for its neighbours.
- **`capabilities?` asks the provider to declare what the reply already proves.** It is optional, and
  absent means "nothing extra", so an author whose provider does preserve marks but never said so
  gets node-by-node translation with no error. The declaration also decides the plugin's chunking
  before any call, which is a second pipeline kept alive by a claim nobody verifies.
- **The instruction the plugin tuned is locked inside the plugin's own provider.**
  `INLINE_MARKS_INSTRUCTION` lives in `translation-providers/shared/buildSystemPrompt.ts`, and its
  docblock records that the wording was validated against 396 live translations across four models
  before it shipped. A third-party provider has no access to it and will reinvent it, worse.

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
- R3 (in) The port carries no capability declaration. Whether a provider uses a language model, a
  machine-translation API or anything else is its own business, and no provider loses rich text
  for the answer it gives.
- R4 (in) The instruction text the plugin tuned is reachable by any provider.
- R5 (in) A third-party provider satisfies the port without importing the built-ins' error classes.
- R6 (in) Test files live in `__tests__`, package-wide.
- R7 (in) `core/domain/translation-providers/` holds the contract and nothing else.
- R8 (in) The deprecations this step owns leave with it: positional languages
  (`translate-positional-languages`), the dry-run option (`provider-dry-run`), client construction,
  and the `OpenAITranslationLegacy` class that #196 allocated here.
- R12 (in) Which values are rich text is stated per value, not per request.
- R17 (in) The plugin's contract with a provider knows nothing of inline marks. Marks are one way a
  provider can talk to a language model, and the plugin supplies that way as utilities.
- R13 (in) The input map belongs to the plugin; a provider cannot empty it or edit it in place.
- R14 (in) A failure code reaches the person who asked for the translation, as text they can act on.
- R9 (out) Glossary and brand voice. A separate, unbuilt task. Nothing is built here; the shape must
  **admit** them later, which is checked in the scenario review, not implemented now.
- R10 (out) Auto-detecting the source language. Both codes stay required. Today an empty
  `sourceLng` means "detect it yourself" by provider convention; that convention goes. If detection
  ever lands it arrives as an explicit value, never as an empty string standing in for absence.
- R11 (out) Container mode for rich text and the public block list — they land with the swap, #199.
- R15 (out) A partial translation reported as partial. The port states that the output may be a
  subset of the input (R16); acting on that — a fourth run outcome, a receipt marked incomplete, the
  status a person reads — is its own step, because it touches the run, the receipt and the admin
  surface rather than the port.
- R16 (in) The port states that the output may be a subset of the input, and that a missing key
  means "not translated" rather than "translated to nothing".

## Decision points

- D1 [load-bearing] Two arguments: what to translate, and the request it belongs to.
- D2 [load-bearing] WITHDRAWN during scenario review — `TranslationProvider.capabilities` is removed, not made required.
- D3 [load-bearing] A failure is thrown and carries a code; the classes stay with the built-ins.
- D4 [load-bearing] The mark instruction is exported, not dictated.
- D5 [minor] Both language codes stay required.
- D6 [minor] `failureReason` leaves the seam for the layer that uses it.
- D7 [minor] The tidy lands first, as its own commit range, before any signature changes.
- D8 [load-bearing] The marks statement is carried by each value, not by the request.
- D9 [minor] The input map is the plugin's; the provider receives a copy it may not edit.
- D10 [load-bearing] Each failure code owns admin-facing copy, so a code reaches a person.
- D11 [load-bearing] Rich text crosses the port as numbered segments; marks become a provider-side utility.

## Requirement coverage

| | Design element |
|---|---|
| R1 | `TranslationRequest`, carrying both codes as named fields |
| R2 | `translate` returns `Promise<TranslationOutput>`; failure is a throw carrying `code` |
| R3 | `TranslationProvider.capabilities` deleted; rich text arrives as segments every provider can translate (D11) |
| R4 | the instruction ships with the mark utilities (D4, D11) |
| R5 | `TranslationFailureCode` moves to `core/`; the classes stay in `shared/errors/` |
| R6 | the tidy step, package-wide |
| R7 | `failureReason.ts` moves out of the seam |
| R8 | the dry-run option in step 4; the rest in the deprecation sweep, step 6 |
| R9 | not built — checked during scenario review |
| R10 | not built — the empty-string convention is removed, nothing replaces it |
| R11 | not built — #199 |
| R12 | `TranslatableValue` is either plain text or a list of segments; `TranslationRequest` says nothing about it (D11) |
| R13 | `TranslationInput` is `Readonly`; the stage hands the provider a copy |
| R14 | `TranslationFailureCode` maps to `UserFacingFailureReason`, which already owns copy |
| R15 | not built — its own step |
| R16 | stated on `TranslationOutput` |
| R17 | the port carries segments; encoding and parsing marks are exported utilities (D11) |

## The port, after

```ts
export interface TranslationProvider {
  translate(input: TranslationInput, request: TranslationRequest): Promise<TranslationOutput>;
}

/**
 * One piece of a rich-text paragraph. `text: null` is a line break or an inline block: it holds a
 * position and may move, but has no text to translate.
 */
export type Segment = { id: SegmentId; text: string | null };

/** A plain field is text; a rich-text paragraph is its segments, in source order. */
export type TranslatableValue =
  | { kind: "text"; text: string }
  | { kind: "segments"; segments: readonly Segment[] };

export type TranslationInput = Readonly<Record<TranslationIndex, TranslatableValue>>;

export type TranslationRequest = {
  sourceLng: string;
  targetLng: string;
  document: DocumentRef;
};

/**
 * The answer to one value: in the kind it was asked in, or `failed` with the reason.
 *
 * `segments` carries every id of the input exactly once, in the order the target language needs;
 * an empty `text` means the segment merged into a neighbour, a `null`-text segment's text is
 * ignored, and edge whitespace is the provider's to preserve. `failed` leaves the value
 * untranslated; `message` is logged, never sent to a client.
 */
export type TranslatedValue =
  | { kind: "text"; text: string }
  | { kind: "segments"; segments: readonly { id: SegmentId; text: string }[] }
  | { kind: "failed"; code: ValueFailureCode; message?: string };

/** Why one value was not translated. A failure of the whole call is a throw, see D3. */
export type ValueFailureCode =
  | "missing-segment" | "unknown-segment" | "repeated-segment" | "no-text"
  | "wrong-kind" | "refused" | "untranslatable";

/** Keys are a subset of the input's. A key that is absent was not translated. */
export type TranslationOutput = Record<TranslationIndex, TranslatedValue>;
```

**`inlineMarks` named two different things** — what the provider claimed about itself, and what the
plugin stated about the payload. The first is gone with D2. The second is gone with D11: the shape of
a value says what it is, and marks no longer cross the port at all.

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

### D2. WITHDRAWN during scenario review. `TranslationProvider.capabilities` is removed

**Proposed.** Make `capabilities` required rather than optional, so no provider silently gets the
lesser behaviour.

- **Options considered:** keep it optional, absent meaning nothing extra · make it required, as `RunnerCapabilities` already is · remove the declaration and let the reply decide, since the reply is already checked

**Withdrawn before it was built**, for two reasons that only appeared once the port was walked through concrete scenarios.

*It buys a guarantee the plugin already has.* The declaration exists to keep marks away from a
provider that would mangle them. But a mangled reply is already caught: `parseInlineMarks` rejects
it, `chunk.reply` stays unset, and `TranslationMutator` writes nothing — the field keeps its source
text. The check on the reply decides by evidence; the declaration decides by claim, and the claim is
never verified against the reply it is supposed to predict.

*It makes every later capability a breaking change.* With the field required, a second capability
must be required too, or the rule it enforces is abandoned. #142 brings exactly such a capability
(honouring protected terms), and it would land in a minor — breaking every third-party provider
compiled against 1.0.0, in a release nobody reads the notes for. The alternatives were a second major
within months, or an optional field, which is the ambiguity this decision set out to remove.

**Decision.** The `capabilities` field of `TranslationProvider` is deleted. The plugin always
expands rich text by container and always states, per value, whether that value carries marks. The
node-by-node path survives as the expander's own fallback for containers it cannot serve — decided
by the content, where `MARK_SHAPED` already decides it, not by a provider's claim.

**Consequences.**

- As first written, this decision forced every provider to handle marks: one that did not would
  see its rich text rejected and left untranslated. D11 removes that cost — rich text crosses the
  port as segments, which any provider can translate, and marks are a utility for the providers that
  want them.
- Four findings from the scenario review disappear with the type rather than being answered: capability
  growth, capabilities dropped by the dry-run branch, nothing requiring capabilities to be constant
  across calls, and the capability-shaped question #142 would otherwise have to ask.

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
provider cannot reach it.

- **Options considered:** leave it inside the built-in provider · export it as a constant any provider may use · put the text in the request, so every provider receives it · give the port a member asking the provider which instructions it needs

**Decision.** (b).

**Why the others lost.** (a) makes a third-party author reinvent a measured wording, worse and
silently. (c) assumes every provider has a prompt to put text in; a machine-translation API has
none, so the plugin would be dictating a shape only some implementations have. (d) adds a member to
a port this major is narrowing.

**Consequences.** The division is stated: the plugin encodes formatting as marks and says so, the
provider declares whether it copes, and *how* it makes a model comply is its own business. The
constant is a gift, not an obligation — nothing checks that a provider used it.

**Amended by D11.** The instruction is still exported, now as one of the mark utilities: the plugin
no longer encodes anything as marks, so the instruction belongs with the code that does.

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

### D8. The marks statement is carried by each value, not by the request

**Context.** `requestOptions` sets `inlineMarks: true` when *any* chunk in the request is a rich
container, and `buildSystemPrompt` appends the instruction to the whole prompt. The request is a
whole document, so a plain `text` field travels under it too. The instruction tells the model that
numbered marks are formatting and that their order may change — which is false for a `text` field
holding `Compare <1> and <2> plans`, where the marks are the customer's own placeholders. On the way
back `TranslationMutator` writes a plain chunk unconditionally: `chunk.dataRef[chunk.key] =
translation`. The two guards that exist, `MARK_SHAPED` at expansion and `parseInlineMarks` at
application, both sit on a rich container and neither sees a plain value.

The failure is silent and permanent: the placeholders come back reordered, the run reports
`delivered`, the receipt marks the field current, and nothing will select it again until the source
text changes.

- **Options considered:** keep the flag on the request and add a third guard screening plain values for mark-shaped text · split each request into a marked call and an unmarked call · carry the statement on the value

**Decision.** (c). `TranslationInput` stops being a map of strings and becomes a map of
`TranslatableValue`; `inlineMarks` leaves `TranslationRequest` entirely, because the
request no longer has anything to say about marks. The provider builds its instruction from the
values that declare them.

**Why the others lost.** (a) is a third guard for a question the first two already answer, bolted to
the only level where the answer is not available. (b) doubles the calls on an ordinary mixed document
and costs the model the rest of the document as context, which is where the quality of a short
field's translation comes from.

**Consequences.** Every provider reads `.text` rather than the value itself — a larger break for
third parties than the signature change alone, and it lands in the same major. `buildSystemPrompt`
takes the values instead of a boolean.

**Superseded in form by D11.** The principle stands — what a value is travels with the value — but no
flag is needed: a value is either `text` or `segments`, and only a provider that encodes segments as
marks gives a model the mark instruction. A plain field holding `Compare <1> and <2> plans` is a
`text` value and never travels under it.

### D9. The input map is the plugin's; the provider receives a copy

**Context.** `TranslationStage` passes `ctx.textMap` by reference, and `TranslationPipeline` checks
after *every* stage whether the map is empty and returns `null` when it is. A provider that deletes
each entry as it translates — an ordinary way to track what is left — empties the plugin's own map.
The pipeline then reads that as "there was nothing to translate", writes nothing, and the run reports
`delivered` after the model has been called and billed.

- **Options considered:** leave it by reference and document the ownership · hand over a copy and leave the type as it is · make the type `Readonly` and keep passing the same object · make the type `Readonly` and hand over a copy

**Decision.** (d). `TranslationInput` is `Readonly`, which states the ownership and stops the obvious
mistake at the type level, and `TranslationStage` hands over `{ ...ctx.textMap }`, which stops it for
everyone else. (a) leaves the failure exactly as it is; (b) fixes this call site and says nothing to
the next one; (c) is advice a provider written in JavaScript never receives. Separately, the empty-map check belongs after the stage that fills the map, not after
each stage in the loop.

**Consequences.** Three lines. The `Readonly` is the contract; the copy is what makes it true.

### D10. Each failure code owns admin-facing copy

**Context.** D3 obliges a provider to throw with `code`. Nothing in the plugin reads `code`. The path
a failure actually travels ends at `toClientErrorMessage`, which replaces any message without a
`[translator:…]` marker with `Translation failed. See the server logs.` — so even the plugin's own
`ProviderConfigurationError`, whose text names the remedy (`structuredOutput: "json_object"`),
reaches the person as that one sentence. Meanwhile the only channel that does reach a person writes
the reason into `message`, which D3 forbids putting anything into.

- **Options considered:** drop the obligation from D3, since nothing reads the code · map each code to a `UserFacingFailureReason` and mark the message from it · give the thrown error a second field that the HTTP layer reads instead of the message · let the provider supply its own user-facing text

**Decision.** (b). The five members of `TranslationFailureCode` map to `UserFacingFailureReason`, which
already obliges copy per member in `toClientErrorMessage`'s own catalogue. (a) is honest but gives up
the only thing that makes a third-party failure actionable. (c) cannot work: Payload's job queue keeps
only `message`, so a second field is gone before anything stores it — which is why the marker exists
at all. (d) hands vendor text to the response body, which is what D3 forbids. The handler marks the
message from the code. The contradiction with D3 resolves on *whose text* travels: the marked message
carries the marker and copy this package owns, never a word from the thrown error; the original stays
on `cause` and is logged by the plugin, so a key in a vendor message cannot reach the response body.

**Consequences.** D3's promise — that a plain `Error` carrying `code` is enough for a third party —
becomes true, which it is not today. Five catalogue entries are added, and the reason vocabulary is
now written in four places rather than three; the step-1 audit already flagged that growth and it is
worth one pass of its own later.

### D11. Rich text crosses the port as numbered segments; marks become a provider-side utility

**Context.** After D2 a provider cannot opt out of marks: the plugin sends a paragraph as one string
with numbered marks, accepts only a reply in which every mark returns exactly once, and leaves the
paragraph untranslated otherwise. That fits a provider built on a language model and nothing else. A
machine-translation API, or any provider that wants to translate pieces on its own, has no way to
take part, and a plain reply without marks is indistinguishable from a broken one.

The plugin already holds the paragraph as numbered pieces before it encodes anything:
`collectInlineFragments` numbers them and remembers which node each number belongs to, and
`TranslationMutator` rebuilds the paragraph from numbered pieces after `parseInlineMarks` has decoded
the reply. The marked string exists only on the wire.

- **Options considered:** keep marks on the wire and require every provider to handle them (D2 as
  written) · send both the marked string and its pieces, accept a reply in either form · send both,
  accept only a marked string, and export a helper that builds one from translated pieces · send
  the numbered pieces only, accept numbered pieces back, and export the mark encoding as utilities

**Decision.** (d), decided by the owner on 2026-10-30. A rich-text paragraph is a `segments` value:
its pieces in source order, each with an id. The answer is the same ids, each exactly once, in the
order the target language needs. Turning segments into a marked prompt and a model's reply back into
segments is done by exported utilities — `encodeSegments`, `decodeSegments`, the instruction, and the
check that a paragraph can be encoded at all — which the built-in provider uses and any other
provider may. The final names are settled in step 4.

**Why the others lost.** (a) shuts out every provider without a model, and loses their rich text
entirely. (b) puts two forms on the wire for one fact and two parsers in the plugin. (c) keeps marks
in the contract, so a provider that never touches a model still has to produce them, and a reply
without marks remains a rejection the type system cannot prevent. (d) leaves one form each way, and a
reply in the wrong kind is a compile error rather than a runtime refusal.

**Consequences.**

- The plugin keeps what it already does: number the pieces, check the answer (every id once, no
  unknown id), rebuild the nodes in the answered order. An answer that fails the check leaves the
  paragraph untranslated **and records why**; today `parseContainerReplies` discards the reason.
- `MARK_SHAPED` leaves the plugin. Source text that looks like a mark breaks only the string encoding,
  so the check moves into the encoding utility, and the built-in provider decides what to do with a
  paragraph it cannot encode — translating its segments one by one.
- A provider without a model translates each segment and returns them in order. It gets the
  piece-by-piece quality it gets today, from the same pieces the paragraph is cut into for marks;
  those differ from today's node-by-node cut on whitespace nodes, which is accepted.
- `TranslationOutput` is no longer a map of strings. Third-party providers break once more, in the
  same major as D1 and D8.

**Rules settled by the scenario review of D11** (2026-10-30, decided by the owner):

- *The plugin checks an answer against its own fragment table*, never against the input it sent:
  the copy handed over is shallow (D9), so a provider that edits the nested segment arrays in
  place would otherwise corrupt the reference it is checked against.
- *The check keeps every rule of today's parser that is not about string syntax*: each id once,
  no unknown id, and at least one segment with text. Without the last, a provider answering every
  segment empty erases the paragraph, and the receipt records it as translated.
- *A failure of one value is answered, not thrown.* A provider that cannot translate one value
  returns `{ kind: "failed", code }` for it; throwing would discard every value that did succeed.
  The plugin uses the same codes for the answers it rejects (`wrong-kind`, `no-text`, an id
  mismatch). Every such value is logged with document, locale, path, code and message, and the
  leaf is recorded as not answered in full, so the next run selects it again. Showing the reason to
  a person is R15.
- *The port has exactly two kinds of value.* Any new format — markdown, an HTML string — is reduced
  by the plugin to text or segments. A third kind would be a member every provider has to learn, so
  every new format would break every third-party provider.
- *An old provider is stopped by the compiler.* The input's shape changes, so a provider typed with
  `TranslationProvider` fails to compile, and `next build` type-checks by default. A provider that
  opts out of types (JavaScript, `any`, `ignoreBuildErrors`) is its author's risk; the release notes
  name the change.

**The built-in provider under D11:**

- One call per document, as today. The model receives two sections — values encoded with marks,
  and plain values — and the mark instruction names the marked section only, so a plain field
  holding `Compare <1> and <2> plans` is never read as formatting. The instruction is reworded for
  the sections and **re-measured before release**, against the same 396-translation baseline.
- A paragraph `encodeSegments` refuses (its text looks like a mark) goes into the plain section as
  one value per segment and is assembled back into segments by the provider.
- Every segment sent without marks passes through the edge-whitespace utility: the model and
  machine-translation APIs drop edge spaces, and "Klicken Sie" + "hier" would be stored as
  "Klicken Siehier" with nothing to catch it. The utility leaves an empty answer empty, since empty
  means merged.
- Escaping mark-shaped source text, so such a paragraph can still travel with marks, is a possible
  later improvement and needs its own measurement.

**Found by the scenario review, outside D11** — true today and not changed by it: a rejected value
overwrites an earlier good translation with source text; a large document can exceed one model
reply and then never translates; a host prompt that forbids tags breaks every marked paragraph; a
glossary change does not make existing translations stale. Each belongs to R15, R9 or its own step.

The large-document case is eased, not closed, by choosing fields to translate: a person can split a
large document across smaller runs. Automatic runs choose nothing — a first translation and a bulk
run send every stale leaf in one call, and after a reply cut off at its limit nothing is written, so
the next run sends the same leaves and fails the same way. The cure is the built-in provider
splitting a large call into several, which needs no contract change once a value can answer
`failed` on its own. A separate task, possible any time after step 4.

## Build sequence

Each step leaves the tree green and is reviewed on its own.

1. **The tidy** — tests to `__tests__` package-wide; `failureReason` out of the seam;
   `shared/errors/` reduced from ten files for one taxonomy; the three constraints whose comments
   were deleted in `OpenAITranslation.provider.ts` made structural rather than restored as prose. No
   behaviour change, no signature change. covers: R6, R7
2. **The signature** — `TranslationRequest` carrying both codes as named fields; `translate`
   returning `Promise<TranslationOutput>` with failure thrown; `TranslationFailureCode` moved to
   `core/`; `INLINE_MARKS_INSTRUCTION` exported; `TranslationOutput` documented as a subset.
   Breaking. covers: R1, R2, R4, R5, R16
3. **Capabilities removed** — `TranslationProvider.capabilities` deleted, the expander choice in
   `translateContent` collapsed to one path; a rejected paragraph records why, and `MarkFailure`'s
   docblock stops promising a per-node retranslation that does not exist. Breaking, and the only step
   that changes what the plugin sends. covers: R3
4. **Segments on the port** — `TranslatableValue` as `text` or `segments`; `TranslationOutput`
   answers in kind; the plugin checks ids instead of parsing marks; `encodeSegments`,
   `decodeSegments`, the instruction and `MARK_SHAPED` move to exported utilities the built-in
   provider uses; `inlineMarks` leaves the request; answers carry `failed` per value and the plugin
   logs them; `TranslationInput` becomes `Readonly` and the stage hands over a copy. The deprecated
   dry-run option is removed here rather than in step 6, since it cannot read segments. Breaking.
   covers: R4, R12, R13, R17

Steps 2 to 4 land as one pull request with one commit per step, merged without squashing: each
commit is reviewed and green on its own, and no release carries the state between them.
5. **The code reaches a person** — `TranslationFailureCode` mapped to `UserFacingFailureReason`
   with copy per member. Not breaking. covers: R14
6. **The deprecation sweep** — positional languages, client
   construction (which takes the optional `openai` dependency with it while `openAIComplete` and the
   client shape stay), and `OpenAITranslationLegacy`. Also the built-in prompt's branch for an
   empty `sourceLng` in `buildSystemPrompt`, which the plugin never takes. Breaking. covers: R8, R10

Steps 2 to 5 were one step when this design was written; the scenario review split them, because each
is breaking on its own and reviewing them together would hide the one that changes behaviour (3).

## Scenario review — what it found

Done on 2026-10-29, against the shape above as it then stood, before any of the reshape was built. It
answered the two questions this section originally posed and changed the design in four places.

**Will a glossary and a brand voice fit later?** Yes, on `TranslationRequest`: a field added there is
additive, since an implementation that ignores it still satisfies the interface, and per-target-locale
variation is natural because `targetLng` is already a field. The shape that could *not* absorb them
was `TranslationProvider.capabilities` — see D2, which the answer to this question is what withdrew.

**What does a provider that cannot preserve marks cost?** Under the shape above it received one value
per text node — `Hello <1>world</1> today` arriving as `{0:"Hello ", 1:"world", 2:" today"}` — so
formatting was perfect and prose degraded, worst in languages whose word order cannot be decided
within a fragment. Under D2 as first written that path no longer existed at the port, and such a
provider left rich text untranslated. Under D11 it receives the paragraph's segments and translates
them one by one — the same quality it has today, and nothing lost.

**What it broke, and where each break went:**

| Break | Outcome |
|---|---|
| The marks instruction is request-wide while both guards are per chunk | D8 |
| A provider that empties the input map makes the run a silent no-op reported as `delivered` | D9 |
| Nothing reads `code`, and the plugin's own actionable message is replaced by generic text | D10 |
| A second capability would break every third-party provider in a minor | D2 (withdrawn) |
| The dry-run branch drops configured capabilities, so a rehearsal exercises the other path | dissolved with D2 |
| Nothing requires `capabilities` to be constant between calls | dissolved with D2 |
| A partial reply is written and reported as `delivered`, and the receipt then hides it | R16 states it; R15 acts on it, as its own step |
| Publishing runs after the save commits, so a failed publish leaves three stores disagreeing | out of scope; the run's status will say "translated, not published" as part of R15 |

## Verification

From the package: `bunx vitest run`, `bun run check-types`, `bunx oxlint .`. From the root:
`bunx turbo run build` — the real `tsc` declaration build — and `bunx turbo run check-types`. From
`apps/dev`: `bun run test:integration` after `bunx turbo run build --filter`, because the dev app
consumes the built package, not the source.

Steps 2 to 5 change the public surface, so by the epic's rule they owe a prerelease under the `next`
dist-tag, exercised in `apps/cms` against a real database.

**That obligation is deferred, by decision.** The merge of #213 ran the release workflow, found three
commits since `1.0.0-next.6` and reported no relevant changes; npm still carries `1.0.0-next.6`. The
cause is not the `!` in `feat!:` — `1.0.0-next.5` was released from exactly such a commit. It is
unresolved and it is not being chased now: the prereleases are intermediate, and what has to work is
the 1.0.0 release at the end of the epic. Until then each step is verified by the package suite, both
type-checks, the real declaration build and the three integration adapters. The release mechanism is
resolved before 1.0.0, not before the reshape.

## Deliberately not done

- **No glossary, no brand voice.** A separate task. This step only owes them a shape they can land
  in.
- **No source-language detection.** See D5.
- **No fourth run outcome, no receipt marked incomplete, no status copy.** R16 states in the port
  that the output may be a subset; everything that acts on that statement is R15 and is its own step,
  because it touches the run, the receipt and the admin surface rather than the port. The same step
  carries the status for a translation that was saved but could not be published.
- **No rework of the node-by-node expander.** It survives as `RichContainerExpander`'s fallback for
  containers it cannot serve for structural reasons; the swap (#199) owns that path. A paragraph
  whose text merely looks like a mark is no longer one of them (D11).
