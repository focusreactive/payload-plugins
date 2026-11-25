# Emptiness is decided from the values

Requirements: `docs/plans/2026-11-18-the-server-reads-the-state.design.md`
Build step: 2026-11-18-the-server-reads-the-state.design.md #5

Revisits build step 5 of that design, which built the emptiness answer. A defect found by running
the sandbox against the real read modules, which the admin stub had been standing in for until it
was removed. D3 of the design above is the settled input being revised, and the reason it has to
be revised is measured below rather than argued.

## Requirements / Task restatement

Three routes answer 500 for any collection whose block holds more than one translatable field —
an ordinary shape, not an edge case. The panel cannot open, the list column cannot draw, and a run
naming single fields cannot be admitted.

The question behind all three is "does this locale hold any translatable text". Payload has no such
question, so it was assembled out of one `exists` condition per translatable field. Where several of
those fields sit in one block, the SQL builder joins that block's table once per condition under the
same alias and the adapter refuses.

The design's requirement ids are kept, so this contract traces to it directly.

- R6 (in, part) A locale's content is reported as `empty`, `untracked`, `filled` or `tracked` — for
  every collection, including one whose block holds more than one translatable field. The report is
  decided in one place, by the same walk that decides what a run translates, and the question stops
  being assembled from the schema so that it no longer grows with the field count.
- R1 (in, part) The document-state route answers rather than failing for such a collection.
- R2 (in, part) The list-state route answers rather than failing for such a collection.
- (out) Everything else R6 settles — the four content values themselves, the receipt rules and the
  verdicts — is unchanged · anything deferred past the major · the admin stub, already removed · the
  sandbox database, broken for an unrelated reason and the owner's to reset.

## What this starts from (measured)

Reproduction, red against the untouched code, all three with the identical message
`Alias "docs_blocks_hero" is already used in this query`:

- `GET /translate/document-state/docs/:id` — 500
- `GET /translate/list-state/docs?ids=:id` — 500
- `POST /translate/enqueue` naming single leaves — 500

The sandbox showed the same against the versions table, `_pages_v_blocks_hero`, because its
collection keeps drafts.

A probe established which shapes the database accepts, so the narrower fix could be priced rather
than assumed:

| asked | answer |
|---|---|
| one leaf of a block | works |
| two leaves of one block, joined by `or` | **collides** |
| two leaves of one block, joined by `and` | **collides** |
| two leaves of one **array**, joined by `or` | works |
| a top-level field plus one leaf of a block | works |
| the block container itself | malformed SQL — `where  is not null` |
| the array container itself | `Cannot find field for path at undefined` |

Three readings. The defect belongs to blocks, not arrays. It is not about `or`. And **there is no
predicate for "this block holds content"**, so asking once per block table is not expressible.

Other facts:

- `localesHoldingContent.ts:30-36` builds the condition; `localesHoldingContent.ts:13` runs it with
  access checks off, which is safe only because the query returns nothing but ids.
- Three callers, all of which only ever feed it `translatablePaths`:
  `get-document-state/handler.ts:101`, `get-list-state/handler.ts:112`,
  `enqueue-translation/handler.ts:63`. `translatablePaths` has no other consumer.
- `translatablePaths` and `fingerprintOf` are both built at `composition/modules/documentTranslation.ts:23,25`
  from the same two inputs, the schema map and the walk.
- `translatableFields(doc, schema, walk)` (`core/domain/content-projection/translatableFields.ts:15`)
  already returns the fields holding translatable text, and `sourceFingerprinter.ts:22` already calls
  it for exactly this document shape.
- Reads already carry `fallbackLocale: false`, and `locale-existence-probe.int.test.ts:64` already
  proved that an unwritten locale returns the document with its localized values missing — so a walk
  over that document finds nothing, which is the answer wanted.

## Decisions

### D1. The database stops being asked, and the existing walk answers instead

- **Chosen:** read the locale's document and decide from its values, using the walk the package
  already owns.
- **Why it bites:** the narrower repair — one condition per block table — is **not buildable**. The
  probe above shows the container predicate produces malformed SQL for a block and an error for an
  array. There is no way to ask the database the question without naming leaves, and naming two
  leaves of one block is the defect.
- **Rejected — one query per leaf, unioned in memory:** keeps the database as the authority and does
  work, but turns one query per locale into one per leaf per locale, and the condition count was the
  complaint that started this.
- **Rejected — the zero option:** every host with two translatable fields in one block has no panel,
  no list column and no partial run. That is an ordinary configuration.
- **Measured cost, because the owner asked for a number before choosing:** 50 documents, 3 locales,
  each document carrying three top-level localized fields and two blocks. Ids only — 3 ms. Whole
  documents — 14 ms and 36 KB. So about **+11 ms and +36 KB per list read**, server-side only: the
  values are walked on the server and never cross to the client, which keeps receiving booleans.
- **Constraint cited:** R6 of the design and ST4 of the upstream design — one owner per value.
  After this, "what counts as content" is decided by the same walk that decides what a run
  translates, instead of by two rules that can disagree.

### D1b. "Holds text" is named in the core, beside the rule it has to agree with

- **Chosen:** one predicate in `core/domain/content-projection/`, built from the schema map and the
  walk exactly as `sourceFingerprinter` is, answering whether a document holds any text a run would
  translate.
- **Why it bites:** the package already decides what counts as text, at
  `translatableLeaf.ts:47-49` — a string is trimmed, and nothing but whitespace reads as no text at
  all. That rule governs what every run translates. Emptiness has to give the same answer or the
  package holds two definitions of "text", which is the defect R6 and ST4 forbid.
- **Rejected — reuse `SourceFingerprinter` and test the map for keys:** it is already in one of the
  three configs and would add no type, but it hashes every field the walk reports, including one
  with no own text, so a non-empty map does not mean "holds text". Answering emptiness by counting
  hashes would also read as a riddle at the call site.
- **Rejected — decide it inside `localesHoldingContent`:** that file is a Payload adapter; putting
  the rule there separates it from the walk it must agree with, in a package whose core is
  deliberately Payload-free.
- **Written contract owed:** yes — that whitespace alone counts as no text, which the signature
  cannot state.

### D2. The two state reads swap their member; the run admission keeps both

- **Chosen:** `get-document-state` and `get-list-state` swap `translatablePaths` for the predicate.
  `enqueue-translation` takes the predicate **and** keeps `translatablePaths`, because it asks a
  second question the predicate cannot answer.
- **Why the second question survives:** admission refuses a run that names single fields when the
  target locale holds nothing, since a partial write would leave the locale's other fields empty.
  That refusal is meaningless for a collection with nowhere to put translatable text at all, and
  today's behaviour — admit it — is pinned by a case. From the values alone, "this document holds
  nothing" and "this collection can hold nothing" are the same answer; only the schema separates
  them.
- **Found by building it:** the first attempt dropped `translatablePaths` everywhere and deleted the
  guard with it, which turned that admission into a refusal. The pinned case caught it.
- **Rejected — give the predicate a third answer so one member serves both:** a value saying
  "nothing is translatable here" does not depend on the document, so the predicate would take an
  argument it ignores for that answer.
- **Rejected — hand the enqueue handler the schema map:** it would re-derive per request what one
  composition line already derives once per collection.
- **Shape check fired** on "a new parameter on an exported function" and on "fields always set
  together". The two shapes compared are the swap above and the schema-map version just rejected.

### D2b. A hidden field stops counting as content, which agrees with what a run can do

- **Found during review, measured:** a localized field declared `hidden: true` does not come back
  from an ordinary read — only a read passing `showHiddenFields` sees it. No read anywhere in this
  package passes that flag.
- **Consequence:** a locale whose only text sits in a hidden field used to report as holding
  content, because the database saw a non-null column, and now reports as empty.
- **Why that is the better answer rather than a loss:** a run cannot see such a field either, so
  the old answer offered the editor a field picker over text nothing could translate. The new one
  says what a run can actually do.
- **Pinned**, so it is deliberate rather than incidental.

### D2c. The read pulls whole documents, and no `select` is derived

- **Chosen:** read the documents without a `select`, and record the cost rather than trim it.
- **The numbers:** 50 documents, 3 locales — 3 ms and ids only before, 14 ms and 36 KB after. The
  list route bounds its id list at 100, and `depth: 0` pulls in no related documents, so the read
  is bounded by that list and the documents' own size.
- **Rejected — derive a `select` from the schema's top-level translatable roots:** it would trim
  most of the payload and keep the walk intact, but it reintroduces a schema-derived list of field
  names feeding a query, which is the shape this task exists to remove. Revisit if a real list page
  measures badly.

### D3. The upstream decision is revised in its own document, not silently contradicted

- **Chosen:** record the revision against D3 of `2026-11-18-the-server-reads-the-state.design.md`,
  whose text says emptiness is answered by the `exists` query "and not by reading the document and
  walking its values".
- **Why:** that decision is the owner's, dated, and its reason — let the database own the meaning of
  "empty" — is sound in principle. What defeats it is that the database has no such question to own.
  A reader of that document must find why it no longer holds.

**New surface:** one predicate type, built at the same composition site as the fingerprinter. It
replaces an existing member in two of the three configs and joins it in the third.
**Written contract owed:** yes — the predicate owes its callers that an unwritten locale reads as
empty only because the read carries `fallbackLocale: false`, which its signature cannot state.
**Escalate:** no — one module, no new seam, no stored shape.

## Acceptance criteria

| # | Covers | Criterion | How it is checked | Pre-flight |
|---|---|---|---|---|
| AC1 | R1, R6 | The document state answers 200 for a collection whose block holds two translatable fields | the reproduction case | **fails now** — 500, message quoted above |
| AC2 | R2, R6 | The list state answers 200 for the same collection | same file | **fails now** — same 500 |
| AC3 | R6 | A run naming single leaves is admitted for the same collection | same file | **fails now** — same 500 |
| AC4 | R6 | No query carries a condition per translatable field any more | no `exists` condition is built from the field list anywhere in the package | **fails now** — built at `localesHoldingContent.ts:35` |
| AC5 | R6 | A locale nobody wrote reads as empty | `locale-existence-probe.int.test.ts`, the case that reads an unwritten locale | **passes now** — stays-true, and the case that must not move |
| AC6 | R6 | A locale written and then emptied reads as empty again | the probe's emptied-locale case, rewritten onto the new path | **passes now** — stays-true in meaning; its mechanism changes |
| AC7 | R6 | A locale whose fields hold only empty or whitespace strings reads as empty, because that is what the package already counts as no text | a new case over the predicate, and one over the route | **fails now** — today `exists` reports such a locale as holding content |
| AC8 | — | The three callers still ask one question each, not one per field | the predicate is called once per document per locale | **fails now** — the condition count is the field count |
| AC11 | R6 | A locale holding only a hidden field reads as empty, matching what a run can translate | a case over the route | **fails now** — the database counts the hidden column, so the locale reads as holding content |
| AC12 | — | Every config member is read for what its type promises | the collection-level question answers `boolean`, since only its emptiness was ever read | **fails now** — it returns a path list and the one caller reads `.length` |
| AC9 | — | The baselines hold | package suite ≥ 3017 passed / 15 skipped · integration ≥ 290 passed / 7 skipped plus this file's cases · `check-types` 10/10 · `oxlint .` ≤ 26 warnings, 0 errors · build exits 0 | **passes now** — measured on `d09073ac` |

AC7 is where the visible behaviour moves, and it is stated rather than chosen: `translatableLeaf.ts`
already trims a value and reports whitespace as no text, so emptiness now answers the way a run
already answers. The panel offers a locale that reads `empty` the whole document rather than a field
picker (`localeRow.ts:72-86`), so this is the one user-visible consequence of the fix.

## Risk

**Medium.** No stored shape changes and no data is touched, so rollback is a revert. The exposure is
that "empty" is a user-visible verdict on three surfaces, and its edges move: `exists` asks whether a
column is null, while the walk asks whether a field holds translatable text. A locale holding an
empty string, an empty rich-text node or an array with no entries can flip. AC7 exists for that, and
the probe cases that pin the current mechanism are rewritten rather than deleted.

The measured cost is server-side and modest, but it scales with document size and locale count, and
the list page pays it on every poll. Named here so it is not discovered later.

## Decisions by the owner

- 2026-11-19 — emptiness is answered by the database rather than by the plugin re-deciding it from
  values, so that one owner holds the meaning of "empty".
- 2026-11-24 — a measured cost for the list page is required before choosing, not an estimate.
- 2026-11-24 — what counts as text is not reopened: the rule the runs already use governs emptiness
  too, so the package keeps one definition rather than two.
