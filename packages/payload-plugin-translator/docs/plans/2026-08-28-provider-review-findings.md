# Provider layering — review findings and what was decided

Closing record for PR #101. Four review passes ran over the provider layering after it was written:
a comment audit, a red-test audit of the suite, a four-angle cleanup pass, and a deep correctness
review. This is what each raised, what was accepted, and what was rejected and why.

Read it before reopening any of these questions — several were argued twice already.

## Accepted and applied

### `KeySetMismatchError` told the wrong story for one of its two causes

`parseAndValidateReply` threw "answered none of the N requested keys" whenever nothing could be
applied. But two different failures reach that point:

| input | reply | the real cause |
| --- | --- | --- |
| `{0, 1}` | `{"9": "x"}` | the reply is about other keys entirely |
| `{0, 1}` | `{"0": 42, "1": true}` | the keys matched; the values are not text |

In the second row the old message sent the reader after a key-set mismatch that did not exist, and
contradicted the error's own payload — `unrequestedReplyKeys` empty while `missingInputKeys` was
full. The two are now told apart and named separately.

One class still covers both. The package branches on no error class anywhere, so what a human reads
is the message; splitting the class would have added a public failure code to buy nothing.

### Model-invented keys reached logs and serialized errors unguarded

`unrequestedReplyKeys` holds strings a language model chose. They were written to `console.warn`
verbatim and uncapped — a key containing a newline could forge log entries — and they sat in an
enumerable property, so `JSON.stringify(error)` carried them out. That contradicted the taxonomy's
own rule, which keeps `cause` non-enumerable for exactly this reason.

Now: quoted and capped in the warning, non-enumerable on the error. Reading
`error.unrequestedReplyKeys` still works.

The deep review scored this below its own survival bar and dropped it, because on the shipped
default (`json_schema` with `strict: true`) a compliant model structurally cannot return an extra
key. That reasoning is sound and is exactly why it was worth fixing anyway: the guarantee lasts
until the first consumer sets `structuredOutput: "json_object"`.

### The consumer-callback guard had drifted in both directions

The cleanup pass narrowed one `try` so it stopped blaming the consumer's prompt builder for
failures in our own code. It narrowed too far: `JSON.stringify(input)` and `buildResponseSchema`
ended up outside any guard, so a throw there escaped the taxonomy entirely.

Both are guarded again, under a label that names request construction rather than the caller's
builder. An input that cannot be serialized is still the caller's, so a typed configuration failure
is the honest answer.

The mirror image was true of the dry-run guard: it wrapped all of `runDryRun`, so a failure in our
own loop would have been reported as the consumer's transformer throwing. It now wraps the
transformer alone.

### `signal` promised cancellation that does not exist

`CompletionRequest.signal` had no docblock — a comment audit removed it as a restatement of the
type — while the factory's own `@example` shows it being wired into a service. The README discloses
that it is reserved and always `undefined` today; a reader working from editor hints saw only the
example. The contract fact is back in the docblock. The advice that was there before is not: the
audit was right to remove that half.

## Accepted: `dryRun` is deprecated

The option stays live and unchanged until the next major. What it does today, verified end to end:

1. `runDryRun` returns transformed strings, which `TranslationStage` treats as a real translation;
2. `saveTranslatedDocument` writes them to the target locale, publishing when `publishOnTranslation`
   is set;
3. `provenance.record` stores the source fingerprint as if the translation derived from it;
4. `isRecordStale` then compares equal, so the locale reads as up to date — the staleness indicator
   stays hidden and no re-translation is prompted.

The source locale is never touched. The harm is that a rehearsal leaves behind content marked as
current and correct.

Two use cases hid under one name:

- **run without an API key or network** — replaced today by supplying your own `complete`
  (`createTranslationProvider`) or `client` (`createOpenAIProvider`). Both shipped in this PR.
- **see what would happen without changing anything** — never existed here. A genuine dry run
  belongs at the operation level: run the pipeline, skip the write and the provenance record,
  return the would-be result. Separate work, no date promised.

Removal in the major does **not** wait for that work, because the second use case never worked.

The package deliberately ships no ready-made fake. Exporting one would be `dryRun` again under a new
name, with the same false promise; the README carries the recipe and the consumer owns the code.

Details in [DEPRECATIONS.md](../DEPRECATIONS.md#provider-dry-run).

## Rejected, with reasons

**Rename `isObject` to `isRecord`.** The helper's body is `typeof value === "object" && value !==
null`, so arrays and `Date` pass. The name is honest to JS semantics; what over-promises is the type
predicate `value is Record<string, unknown>`. Renaming without changing the body makes it worse —
the name would then promise exactly what the check does not do, and the dissonance that currently
makes call sites defend themselves disappears from view. Narrowing the helper is a separate task:
15 call sites, `getByPath` / `setByPath` walk arrays by numeric index, and
`core/kernel/lexical/guards.test.ts` pins array-passing as accepted behaviour.

**Drop the `Array.isArray` guard in `parseAndValidateReply` as redundant.** It is not: `isObject`
admits arrays, `["x"]` has key `"0"`, and a 0-based input would accept it by coincidence and yield
wrong data silently. Measured — removing the guard reddens exactly one check.

**Collapse the client memo into a `.catch` chain.** The repo's lint requires `try`/`catch` with
`await`, which is why the two-closure shape exists.

**Replace the runtime-keyed lookup objects in `loadOpenAIClient` with arrays.** Those keys replaced
trailing comments in an earlier pass; arrays would bring the comments back.

**Append the word "json" to a consumer's prompt** when `structuredOutput: "json_object"` needs it.
A behaviour change, and silently editing someone's prompt is worse than refusing with a message
that names the cause.

**Fix `runDryRun`'s reverse to be code-point aware.** It reverses by UTF-16 code unit, so text
outside the basic plane comes back mangled, and it disagrees with the `[...s].reverse()` helper the
integration suite uses — an emoji in any fixture would fail the suite today. Not worth changing
behaviour in an option that already has a removal date. Recorded in the ledger instead.

**The efficiency findings.** All measured as negligible against a network round trip: a per-call
completion closure, one array materialised to test emptiness, one object literal per schema
property. The change also removes the only cost that mattered — a static top-level SDK import.

## Open — needs a human, not another review

**The strict-schema property ceiling.** `buildResponseSchema` emits one required property per
translatable node with no cap, and the pipeline sends a whole document in one request. OpenAI's
strict `json_schema` mode has a property ceiling; a content-heavy page could hit it and fail the
whole document, where the pre-0.11.0 `json_object` default would have succeeded. The failure is
diagnosed with a message naming `structuredOutput: "json_object"`, so it is not silent — but it is
a hard failure and a behaviour change against 0.10.4.

Needed: the real ceiling for the model and account in use, checked against the largest documents in
the CMS installations. If it is close, the fix is an automatic fallback to `json_object` on a
schema rejection rather than surfacing the error.

**Which models rejected `json_schema`, as of 2026-08-28.** A snapshot, deliberately not in the
README: `gpt-4-turbo`, `gpt-4`, `gpt-3.5-turbo`, the `o1` family and older `gpt-4o` snapshots, plus
OpenRouter with certain upstream models, older Azure deployments and self-hosted proxies. Vendors add
structured-output support over time, so a list like this decays into advice to switch where switching
is no longer needed. Consumer docs therefore say only that older models and some gateways reject it
and that the error names the option; the enumeration lives here, dated.

**Unverified, and therefore not stated to consumers:** a rejection for an oversized schema appears to
arrive at request validation, before generation, which would mean an oversized document costs nothing
but the failure. That is the vendor's behaviour and its billing, neither of which this package can
promise. Confirm it by experiment before repeating it anywhere a consumer reads.

**Why the limit exists, kept here rather than in the README.** Strict mode constrains generation
itself: the service compiles the schema into a grammar before the model writes anything, which is
both why a compliant model cannot deviate and why the schema has a size limit — and why a rejection
arrives at request validation rather than after tokens are spent. That is OpenAI's mechanism, not
ours, and it has already changed once (the limits were raised). Consumer-facing docs therefore state
the *consequences* — a ceiling exists, it counts pieces of text not fields, measure it, a failure is
free — and never the mechanism or a number, so they cannot go stale into a lie.

**An automatic fallback was considered and is not the obvious answer.** The research doc settled the
same question for a different case and decided against silent degradation: "fail with a named error,
do not silently degrade to prompt-only JSON. Silent degradation would return exactly the class of
defect this issue exists to remove." If a fallback is added it has to be loud — a log line at
minimum, and arguably a mark on the document — or it re-creates the silent half-translation on
exactly the largest documents.

## Follow-ups, agreed but out of this PR

- **Migrate `apps/dev` off `dryRun`** (`payload.config.ts`, `integration/translator/
  bootTestPayload.ts`) to a stub `complete`. Not required by the deprecation — nothing breaks — but
  it is the only way to prove the advertised replacement carries the real case: an integration suite
  with no API key. The fake must reverse by code point and pass blank values through untouched, or
  the suite reddens. Also trivial: drop the now-pointless `dryRun: false` in `apps/cms`.
- **A genuine operation-level dry run**, as described above.
