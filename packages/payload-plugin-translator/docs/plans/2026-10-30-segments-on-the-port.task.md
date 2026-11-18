Build step: ./2026-10-28-the-provider-port.design.md #4

# Step 4 — segments on the port

The last of the three breaking steps that land together (2 to 4 of the design's build sequence).
Rich text crosses the provider port as numbered segments, marks become provider-side utilities,
and the run reports every value it could not translate, with a reason. It also takes in the
follow-ups the reviews of step 3 parked here.

## Requirements / Task restatement

1. `TranslationInput` maps each index to a `TranslatableValue`: `{ kind: "text", text }` or
   `{ kind: "segments", segments: [{ id, text | null }] }`. It is `Readonly`, and the stage hands
   the provider a copy. `inlineMarks` leaves `TranslationRequest`.
2. `TranslationOutput` maps each answered index to a `TranslatedValue`: `text`, `segments`, or
   `{ kind: "failed", code, message? }`.
3. The plugin checks a segments answer against its own fragment table — every id once, no unknown
   id, at least one segment with text, the answer in the kind it was asked — and writes it in the
   answered order. A value that fails, a `failed` answer and a key absent from the reply each leave
   the value in its source language and are reported with a reason.
4. Encoding segments as marks, decoding a model's reply, the check that a paragraph can be encoded
   (`MARK_SHAPED`) and the mark instruction leave the plugin's core and become utilities exported
   from the package root. The built-in provider uses them.
5. The built-in provider sends one call per document with two sections — marked values and plain
   values — and an instruction that names the marked section only. A paragraph it cannot encode
   travels as plain values, one per segment, and is assembled back into segments.
6. The deprecated dry-run option goes.
7. Carried over from step 3:
   - one outcome per leaf that says why it was not answered in full, replacing the separate
     `rejected` list;
   - one reporter for run outcomes, folding `reportNothingSent` and `reportRejectedReplies`;
   - the pipeline's `null` becomes an explicit result;
   - the pipeline's test-only `textExpanders` option goes;
   - handler tests build pipeline results through one fixture.
8. The reworded mark instruction is measured live before the step is called done.

Covers R4, R8 (the dry-run option), R12, R13, R17 of the design.

**Out of this step:** failure codes reaching a person (step 5); the rest of the deprecation sweep
(step 6); splitting a large document into several model calls (its own task).

## What already exists — platform · installed · project · verdict

- **The check and the edge-whitespace rule exist** in `parseInlineMarks`: the mark set, `no-text`,
  and `restoreEdges` for a reply of the same shape as the request. Split, not rewritten: the
  string half becomes the provider utility, the rest becomes the plugin's segment check.
- **`serializeInlineMarks`** is the encoder. **`MARK_SHAPED`** is the encodability check.
- **`REPORTED` in `reportNothingSent.ts`** is the reason → level and message table the one
  reporter extends.
- **The fragment table** (`RichContainerChunk.fragments`) is what the answer is checked against.

Verdict: one new public type family on the port and four exported utilities, all made from code
that exists. No dependency.

## Decisions

**Da — the port's shapes are the design's.** `TranslatableValue`, `TranslatedValue`, `Segment`,
`SegmentId` (a number, unique within one value) and `ValueFailureCode` as in "The port, after".
No alternative re-argued here: D11 settled it.

**Db — the mark parser splits along the port.** Chosen: the string half (tokenize, structural
checks, decode into segments in reply order) and the encoder, `MARK_SHAPED` and the instruction
move to `translation-providers/shared/inlineMarks.ts` and are exported from the package root;
the segment check (id set, `no-text`, edge whitespace on a same-shape answer) stays in the core
beside the fragment table. Lost: keep everything in the kernel and export it from the root — the
core would then own a wire format it no longer sends.

**Dc — edge whitespace is restored by the plugin, on a same-shape answer.** Chosen: the existing
`restoreEdges` rule moves with the segment check, so any provider whose answer keeps the order and
merges nothing — every machine-translation API, and the built-in provider's plain pieces — gets its
edge spaces back. Lost: an edge-whitespace utility each provider must remember to call (the
design's text) — it moves a rule the plugin already applies onto every implementer, and a provider
that forgets it reproduces "Klicken Siehier". Amends the design's "built-in provider under D11".

**Dd — one outcome per leaf.** Chosen: `LeafOutcome` becomes `{ idPath, answered: true }` or
`{ idPath, answered: false, failures: [{ code }] }`, one failure per value of the leaf that was
not written; `PipelineResult.rejected` goes. Codes are `ValueFailureCode`, plus `"not-answered"` for
a key absent from the reply and `"not-written"` for an answer that passed the check but could not be
written. The translation stage settles every chunk into one `SettledAnswer` (text, segments or
failed), the only thing the applicator and the outcomes read — not three parallel channels. Lost: keep `answeredInFull` and add `failures` beside it — admits a
leaf answered in full with failures (two states, one legal). `LeafOutcome` is internal (run modules
are not public), so the reshape breaks no host.

**De — the pipeline says whether anything was sent.** Chosen: `{ sent: false }` or
`{ sent: true, translatedData, leaves }` instead of `PipelineResult | null`. Lost: carry a reason
on `sent: false` — the pipeline cannot know why the selection was empty; the document path already
has that reason from leaf selection.

**Df — one reporter of run outcomes in `server/features/_lib`.** Chosen: one function taking the
logger, the target and either "nothing sent" with its reason or the leaves; reasons map to level and
message through one table. Both surfaces call it. Lost: two helpers in two styles (today).

**Dg — the pipeline takes no expander list.** Chosen: `textExpanders` goes; the outcome tests that
needed the per-node path reach it through real input (single-fragment paragraphs fall back to it).
Lost: keep it as a documented test seam — a configuration point production never uses.

**Dh — handler tests build pipeline results through one fixture** next to the features, so the
next field on the result is one edit. Lost: literal objects in each test (today, fifteen of them).

**Di — the built-in provider's request.** `userContent` is
`{ "marked": { key: markedString }, "plain": { key: string } }`, with a response schema of the same
shape; a paragraph that cannot be encoded contributes plain keys `"<index>.<segment id>"`. The
instruction says marks appear only in values under `marked`. A key missing from the model's reply
is left out of the answer (the plugin reports it `not-answered`); a marked reply that does not
decode is answered `failed` with the decoder's reason.

**Dj — dry run goes in this step.** `dryRun`, `DryRunConfig` and `DryRunTransformer` leave
`createTranslationProvider`, `createOpenAIProvider` and the package root; `DEPRECATIONS.md` marks
`provider-dry-run` removed. It cannot read segments, and keeping it until step 6 means teaching it.

**Dl — `malformed` joins the failure codes.** A marked reply that does not decode (a nested mark,
a close matching nothing, a mark never closed) is a string-format failure only the provider sees
now; the provider answers it `failed` with `malformed`. Lost: reuse `untranslatable` — it says the
value could not be sent, not that the reply could not be read.

**Dk — names.** The plainest that fit: `encodeSegments`, `decodeSegments`, `canEncodeSegments`,
`inlineMarksInstruction`, `reportRunOutcome`. The instruction ships as a function taking no
arguments, rather than the constant step 2 exported: the wording is expected to grow optional
arguments — a glossary, a tone of voice, the names of the sections it refers to — and a constant
cannot become a function without breaking every consumer, while an optional argument added to a
function breaks none. The wording it returns is unchanged, so the measurement below stands.

### Shape check

Fired: published types change (`TranslationInput`, `TranslationOutput`, `TranslationRequest`);
an optional field is added (`message?` on `failed`). `message?` is honest: its absence means "the
provider had nothing to add", and nothing branches on it. The rest is D11's shape, compared there.

### Written contract

Yes: a segments answer carries every input id exactly once, in target order; an empty text means
merged; a `null`-text segment's answered text is ignored. Stated on `TranslatedValue` and checked
by the plugin.

## Acceptance Criteria

| # | Criterion | Covers | How it is checked |
|---|---|---|---|
| 1 | `TranslationInput` values are `text` or `segments`; `TranslationRequest` has no `inlineMarks` | R12 | `bun run check-types`; `rg "inlineMarks" src/core/domain` finds nothing |
| 2 | The provider receives a copy: editing the input's nested segments does not change what the answer is checked against | R13 | unit test, red against the current code |
| 3 | A provider that translates each segment in order, with no marks, gets the paragraph written with its formatting | R12, R17 | unit test through the pipeline, red against the current code |
| 4 | The plugin refuses a wrong-kind answer, a missing, unknown or repeated id, and an all-empty answer; each leaves the value in the source language with its code in the leaf's failures | R17 | unit tests, red against the current code |
| 5 | A same-shape segments answer gets the source's edge whitespace back | R17 | unit test, red against the current code |
| 6 | A `failed` answer for one value leaves that value untranslated with its code; the document's other values are written | R12 | unit test, red against the current code |
| 7 | A key absent from the reply is recorded as `not-answered` | R12 | unit test, red against the current code |
| 8 | `encodeSegments`, `decodeSegments`, `canEncodeSegments` and `inlineMarksInstruction` are importable from the package root, and a provider built from them alone round-trips a paragraph | R4, R17 | consumer test importing only the package root, red against the current code |
| 9 | The built-in provider sends `marked` and `plain` sections; a plain field holding `<1>` is under `plain`; a paragraph that cannot be encoded travels as `<index>.<id>` plain keys and comes back as segments | R17 | unit tests on `createTranslationProvider`, red against the current code |
| 10 | No `dryRun` option, type or export remains; `provider-dry-run` is marked removed | R8 | `bun run check-types`; `rg -i "dryRun" src` finds no option; read `DEPRECATIONS.md` |
| 11 | `translateContent` and `TranslationPipeline.execute` never return `null`; both surfaces branch on `sent` | — | `rg "\| null" src/core/translation-pipeline/translateContent.ts src/core/translation-pipeline/TranslationPipeline.ts` finds nothing; the suite |
| 12 | One reporter logs both "nothing sent" and every leaf failure, for both surfaces; `reportNothingSent` and `reportRejectedReplies` are gone | — | unit tests on both surfaces; `rg "reportNothingSent\|reportRejectedReplies" src` finds nothing |
| 13 | The pipeline has no `textExpanders` option | — | `rg "textExpanders" src` finds nothing |
| 14 | Handler tests build pipeline results through the shared fixture | — | `rg -c "translatedData:" src/server/features/*/__tests__` counts only the fixture's callers' arguments, no literal result objects |
| 15 | The reworded instruction keeps marks no worse than the old wording on the same corpus (99 paragraphs × French, German, Japanese, sent in sections), and alters no mark-like text in plain values | R17 | the measurement script's output, recorded below |
| 16 | Package suite, both type-checks, lint, the real declaration build and the SQLite integration suite are green | — | `bunx vitest run` · `bun run check-types` · `bunx oxlint .` · `bunx turbo run build` · `bun run test:integration:sqlite` in `apps/dev` after the build |

## Pre-flight

Run on the untouched tree, 2026-10-30.

- AC1 — `inlineMarks` is a field of `TranslationRequest` (1 hit in `core/domain`) · change.
- AC2–AC9 — the tests do not exist yet; each is written first and shown red · change.
- AC10 — `dryRun` appears in 5 source files · change.
- AC11 — `| null` in both `translateContent.ts` and `TranslationPipeline.ts` · change.
- AC12 — the two reporters appear in 5 source files · change.
- AC13 — `textExpanders` appears in 2 files · change.
- AC14 — 18 literal `translatedData:` result objects in handler tests · change.
- AC15 — no measurement of the reworded instruction exists · change.
- AC16 — package suite 2532 passed / 9 skipped; `check-types` exit 0; oxlint 0 errors, 35
  warnings; integration (SQLite) 61 files, 247 passed / 7 skipped · invariant.

## Risk notes

- **Every third-party provider breaks once more**: input and output shapes change in the same
  major as steps 2 and 3. The release notes name it; the README section for provider authors is
  proposed in the pull request.
- **The prompt changes.** The measured instruction is reworded for the sections; criterion 15 is
  what stands between that and a regression in mark integrity. The original corpus is not in the
  repository, so the measurement is rebuilt on a new corpus of the same size and recorded here.
- **Edge whitespace** (Dc) is restored only on a same-shape answer, as today for marks; a language
  without spaces between words gets the source's edge space back, also as today.
- **Wide test churn**: about twenty test files build providers or pipeline results.

## Measurement — 2026-10-30

The 2026-09-09 corpus is not in the repository, so a new one was built: 33 sentences in three
formatting shapes (99 paragraphs of two to four segments) plus nine plain values holding mark-like
text, sent as nine documents of eleven paragraphs and one plain value, through the built-in
provider's real request (sections, schema, reply parsing) and checked with the plugin's own check.

| Run | Paragraphs usable | Failures | Plain mark-like values untouched |
|---|---|---|---|
| gpt-4o-mini, new wording, fr/de/ja × 1 | 297/297 | — | 27/27 |
| gpt-5.4-mini, new wording, fr/de/ja × 1 | 296/297 | 1 missing-segment (ja) | 27/27 |
| gpt-5.4-mini, new wording, ja × 3 more | 296/297 | 1 malformed | — |
| gpt-5.4-mini, **old** wording, fr/de/ja × 3 | 887/891 | 4 missing-segment | 81/81 |
| gpt-5.4-mini, **new** wording, fr/de/ja × 3 | 887/891 | 3 missing-segment, 1 malformed | 81/81 |

The rewording costs nothing measurable: both wordings fail about 0.45% of paragraphs on the newer
model, the rate of the model, not of the text; the old 0/99 could not tell 0% from that. Plain
values with mark-like text were untouched under both wordings — the sections, not the sentence
naming them, are what protect them. Every failure is visible: the paragraph keeps its source text,
the reason is logged, and the next run tries again.

## Decisions by the owner

- 2026-10-30 — the step-3 follow-ups land in this step, not a separate one.
- 2026-10-30 — the instruction's re-measurement is part of this step.
- 2026-10-30 — utility names: the plainest that fit, settled while building.
- 2026-10-30 — README text for provider authors is proposed in the pull request, not committed.
- 2026-10-30 — the instruction is judged against the old wording on the same corpus (A/B), since the
  old single-model 0/99 cannot distinguish a fraction of a percent; criterion 15 amended to match.
- 2026-10-31 — the instruction is exported as a function, not a constant, while the major is still
  unreleased and the change costs nothing; see Dk.
