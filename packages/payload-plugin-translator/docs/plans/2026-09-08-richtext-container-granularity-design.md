# Design — rich text container granularity (#134)

- **Issue:** [#134](https://github.com/focusreactive/payload-plugins/issues/134)
- **Reads against:** [2026-08-21-translation-mechanism-kernel-extraction.md](./2026-08-21-translation-mechanism-kernel-extraction.md) — the language/traversal design this must not fight (§8)
- **Date:** 2026-09-08 · **Status:** decided, three questions open (§7)

---

## 1. What is being built

The unit of rich text translation moves from the **text node** to its **inline container** —
the paragraph, heading, list item or quote that holds it. Fragments inside a container are
wrapped in numbered marks, the model returns them in whatever order the target language
needs, and the container's `children` array is rebuilt in that order.

Today each text node is translated alone and written back into the node it came from, so the
node order never changes: the translation keeps the source language's word order, and every
inline mark stays pinned to its source position. `a **red** car` becomes *une rouge voiture*
instead of *une voiture **rouge***, and no prompt can fix it — the model is never given the
chance to reorder anything.

A mark number is **a pointer to the original inline node, not an address to write into**.
That single idea is what keeps this layer from having to understand Lexical formatting:
formatting travels inside the nodes themselves.

```
sent:     { 7: "<1>a </1><2>red</2><3> car</3>" }
returned: { 7: "<1>une </1><3>voiture </3><2>rouge</2>" }
applied:  children = [ node1("une "), node3("voiture "), node2("rouge") ]
```

The boundary between core and provider is the string. The core finds containers, glues
whitespace, emits marks, and afterwards parses, verifies and rebuilds; the provider takes a
string and returns a string, knowing nothing about nodes, gaps or Lexical.

Reads stay within `type` / `text` / `children`. Writes are `text` on a leaf and `children`
on the container. `format`, `style`, `detail`, a link's `fields` and every other mark
representation are never read and never written — the same surface `kernel/lexical/types.ts`
already declares.

---

## 2. Decisions

| # | Decision | Why |
| --- | --- | --- |
| D1 | Unit of translation is the nearest node with at least one direct text child | Needs no knowledge of which node types are inline. Exotic trees degrade to today's behaviour instead of breaking |
| D2 | Mark syntax is `<n>text</n>`, self-closing `<n/>` for non-text inline nodes, always flat | Models have seen XLIFF and HTML; numeric names cannot collide with meaningful tags; flatness keeps the parser stackless and removes nesting as a failure mode |
| D3 | A container whose source text contains a mark-shaped sequence (`<12>`, `</12>`, `<12/>`) falls back to per-node granularity | Removes the whole escaping problem for the price of losing the optimisation on content that is close to nonexistent. Plain `<div>` or `5 < 10` are unaffected — only digits between angle brackets collide |
| D4 | Every fragment is wrapped, including unformatted ones | The layer then never constructs a node from scratch — every output node is an existing node with new text |
| D5 | Marks returned in their original order take the current write-into-the-node path | Most content, and all close-language pairs, land here. The new path runs only where it changes the result |
| D6 | A container holding a single unformatted text node emits no marks at all | Typical paragraph pays nothing — not a single extra token |
| ~~D7~~ | **Reversed 2026-09-10 by the owner.** A corrupt reply leaves the container in its source language and is **reported**; it is not retranslated per-node | The per-node result is the defect this whole design exists to remove — falling back to it silently hands the editor a calque and calls it success. An honest gap the editor can see beats a quiet downgrade. The per-node path stays for D3 and D6, where it is not a downgrade but the correct handling |
| D8 | One transitional flag, off by default, **deprecated the day it ships**: it is the single switch between the two paths, and the next major deletes it — container mode becomes the only mode. No other option is added | One bottleneck to test, one line to delete. Off by default so an upgrade changes nothing; deprecated from the start so nobody builds on it. Precedent: `DryRunConfig` already ships deprecated |
| D8a | The next major removes the **flag**, not the per-node code — that stays as an internal fallback (D3, D6, D7) | "Single mode" means the operator has no choice left, not that the mechanism has no fallback |
| D9 | A provider declares `capabilities.inlineMarks`; without it the core stays per-node whatever the flag says. This is part of the provider contract, not a config option | Rung 03 of the provider ladder is explicitly "a service that is not a language model at all (DeepL, Google Translate)" — it would translate or strip marks. Tolerable while the flag is opt-in; after D8 removes the flag it is the only thing standing between such an install and permanent double-billing |
| D11 | The core appends the mark instruction **after** the override's return value, not inside `defaultPrompt` | `buildSystemPrompt` returns the builder's string whole (`buildSystemPrompt.ts:39-41`), and a builder is free to ignore `defaultPrompt`. Putting the instruction inside it lets an install silently drop the one rule the format depends on, and the operator would have no way to see why every container falls back |
| D12 | One source wrapper holding several leaves becomes several adjacent wrappers in the result; they are not merged back in v1 | A link with an emphasised word inside renders identically as two sibling links with the same href. Merging siblings that share an origin is polish; correctness does not depend on it |
| D13 | Every issued number must come back **exactly once**; order is free, empty content is how a merge is expressed | One set comparison, no occurrence counting. Rejecting a repeated mark is what removes copying from the design entirely (D17) |
| D14 | Plain values and single-node containers are sent unmarked; stray marks in their replies are stripped and warned | No markup inside them to preserve, so marks would be pure token cost |
| D15 | Whitespace-only nodes are glued onto the preceding fragment, never marked on their own | A mark of its own can come back empty, and the gap between two words would be gone. Glued, the space rides inside a fragment that carries text |
| D16 | Edge whitespace is restored by the core after the reply, not by the provider | Models trim edges. The provider's contract is string in, string out — it must not know about nodes or gaps. This is exactly the logic that ossified as a "Fix spaces" patch inside the Storyblok plugin's model call |
| D17 | A fragment holds two live references — `node` (the text leaf) and `top` (what goes into the rebuilt array). `top` is the container's direct child, except when that child holds more than one leaf: then each fragment gets its **own copy of the wrapper containing just its leaf**, prepared during collection | Pushing a shared wrapper twice would duplicate its whole text, not reorder it. Preparing the copy at collection time keeps the applicator uniform — write `node.text`, push `top`, no special case. Copying an existing node is still not *constructing* one: no `format`, `fields` or version is ever read |
| D20 | Two granularities, one home: container collection is its own function beside the per-node walk, both owning Lexical knowledge in one place. The existing walk, its whitespace filter and its join are untouched | §4.3 of the core-kernel design makes the *language* the shared layer, not the traversal — and keeps the projection's own walk so "hash the pristine source before any write" is structural. Leaving the join alone also means no stored fingerprint changes: no versioning, no migration, no false staleness, no surprise auto-translate bill |
| D23 | A container left untranslated is reported: which field, which container, and the parse failure that caused it. The report travels as the task's result, so it reaches the client through the runner's existing normalized `Task` | Without it the editor publishes a French page with one English paragraph and never learns why. Reporting is what makes D7's reversal safe rather than merely honest |
| D21 | Dry run is documented as incompatible with marks, not fixed | Its default transformer reverses the string (`runDryRun.ts:18`), which destroys every mark, so a dry run would fall back on every container. The mechanism is already deprecated in favour of supplying a fake `complete` — which round-trips marks fine |
| ~~D22~~ | **Dropped 2026-09-10 by the owner.** No circuit breaker | It only existed to bound the cost of D7's retries, and D7 is gone: nothing is translated twice any more. It would also have switched the run to the defective mode automatically — the same silent downgrade D7 was reversed for |

---

## 3. Three facts that shaped this

**The text-node walk serves two subsystems, on purpose.**
`collectSerializedLexicalTextNodes` has two callers that ask it different questions:

| Caller | Question it answers |
| --- | --- |
| `RichTextExpander` (translation pipeline) | which pieces of text to send to the model |
| `leafSourceText` → `projectTranslatableContent` → `fingerprint` (provenance) | what counts as a field's content, so a later run can tell whether the source changed |

The sharing is deliberate — `contentProjector.ts:5-8` says why: projection and translation reuse
one traversal and one leaf predicate *"so projection and translation can never disagree on which
content is translatable"*. The second caller's output is hashed and **stored** in the provenance
store at translation time; `staleness.ts` compares that stored value against a freshly computed
one to decide whether a translation is stale (the admin indicator, and auto-translate's
source-changed check).

Container mode needs two things this walk does not give: whitespace-only nodes (it filters them
out, and they hold the gaps between words) and, per text node, the container's direct child above
it (the flat `{ node }` return cannot say a leaf sat inside a link).

The tempting fix is to widen this walk and move the whitespace filter into `RichTextExpander`.
It was considered and dropped (§9): widening changes what the fingerprint hashes —
`["Buy", " ", "our product"]` joins as `"Buyour product"` today and `"Buy our product"` after — so
every stored fingerprint stops matching. One document with one formatted paragraph is enough to
mark that document stale in every locale, and auto-translate then retranslates the store at the
customer's expense.

D20 takes the other route: a **separate collection function beside** the existing walk, both living
in the same home. That is what §4.3 of the core-kernel design asks for — the shared layer is the
*language* (per-structure knowledge), not the traversal, and the projection deliberately keeps a
walk of its own so "hash the pristine source before any write happens" is structural rather than a
rule to remember. §7 of that document goes further and keeps a guard test against a later tidy-up
merging the two.

**Reference mutation survives.** The pipeline's contract — chunks carry live references into
the tree `DataReconciler` built, and the applicator mutates through them — does not change.
Only the level changes: `containerRef.children = [...]` instead of `nodeRef.text = ...`. No
stage downstream of the applicator learns anything new.

**Copies are the narrow exception.** The rebuilt `children` array normally holds the *same node
objects* in a new order, and the only write into a node is still `node.text`. One shape forces a
copy: a wrapper holding more than one leaf, such as a link with an emphasised word inside. Pushing
that shared wrapper once per leaf would duplicate its entire text rather than reorder it, so each
fragment carries its own copy of the wrapper with just its leaf — prepared during collection, so
the applicator never learns there was a special case. A mark returned twice would be the other
candidate, and D13 rejects that reply instead of supporting it.

---

## 4. Mark contract

### Emitting

Walking a container's inline level produces, in document order, one fragment per text leaf and
one per non-text inline node:

Each fragment carries a mark number and two live references, never a copy (D17):

| Fragment | Emitted as | `node` (where the translation is written) | `top` (what goes into the rebuilt array) |
| --- | --- | --- | --- |
| text leaf, direct child of the container | `<n>text</n>` | the leaf | the same node |
| the container's direct child holds exactly one leaf | `<n>text</n>` | the leaf | that direct child — any chain above the leaf rides along inside it |
| the container's direct child holds several leaves (a link with an emphasised word) | `<n>text</n>` each | the leaf **inside the copy** | a copy of that child holding only this leaf (D17) |
| non-text inline node (line break, inline block, upload) | `<n/>` | — | the node |

`top` is the container's direct child, not the leaf's immediate parent: with `mark → link → text`
the immediate parent is the link, and pushing that would drop the annotation. Nesting is never
rebuilt by hand — it travels inside `top` by reference.

### Finding the container

**A container is a node with at least one direct text child.** Walk from the root down: on a
node that qualifies, stop and take it whole (its nested inline wrappers included); otherwise
descend into its children.

The rule deliberately names no node types, so it holds for paragraphs, headings, list items,
quotes — and for whatever Payload adds later.

```
paragraph                          ← container: has direct text children
├─ text "Buy "
├─ link → text "our product"          the link becomes one fragment inside it
└─ text " today"

list                               ← no direct text, descend
├─ listitem → text "first"         ← container
└─ listitem → text "second"        ← container (each item on its own, as it must be)

quote → paragraph → text           ← the paragraph is the container

root
├─ paragraph                       ← container
├─ block (fields, not children)       no text children, walked past — unchanged from today
└─ paragraph                       ← container
```

**Known limitation.** A container holding no direct text — a paragraph made of two adjacent
links, say — does not qualify, so each link becomes its own container with a single fragment and
takes the per-node path. The links keep their source order. Fixing that would mean either a list
of known block types (the Lexical knowledge this design avoids) or a depth rule, and depth
cannot work: text sits two levels deep both in a paragraph-with-link and in a list-with-items,
and collapsing list items into one fragment would be flatly wrong. Recorded as a limitation, to
be revisited if real content shows it is common (Q1).

### Whitespace

Editors routinely emit a node holding a single space:

```
paragraph
├─ text "Buy"
├─ text " "              ← this one
└─ text "our product"  formatted
```

Today's walk drops it (`collectTextNodes.ts:12`) — correct for translation, since a space needs
none — but the serialized string must keep it or the words collide as "Buyour product".

Per D15 it is **glued onto the preceding fragment** (onto the following one when there is no
preceding), gets no mark, and its node drops out of the result: one node fewer in the tree,
visually identical. A mark of its own would risk coming back empty, and with it the gap.

Per D16 the core then **restores edge whitespace after the reply**: a fragment whose source
started or ended with a space and whose translation does not gets it back. Non-empty fragments
only — merged fragments legitimately change their edges.

### Accepting a reply — all or nothing

**Every number issued must come back exactly once. Order is free, empty content is allowed,
anything else is corrupt.** One set comparison, no sub-cases — and rejecting a repeated mark is
what lets the whole design run without copying a single node (D17).

| Reply | Verdict |
| --- | --- |
| Same set of numbers, any order | valid |
| A mark carries empty text | valid — the fragment merged into a neighbour; its node drops out of the rebuilt array |
| A mark appears more than once | corrupt — one node cannot sit in two slots without a copy, and the copy is the complexity D17 removes |
| Stray whitespace inside a mark (`< 1 >`) | valid — tolerated rather than losing the container over a space |
| **Any issued number is absent** | corrupt |
| A number we never issued appears | corrupt |
| Unclosed or crossed marks (`<1>text</2>`) | corrupt |
| Nested marks (`<1><2>text</2></1>`) | corrupt |
| No mark carries any text | corrupt |

Merging is the case that makes strictness affordable. A translation legitimately turns three
fragments into two, and the model expresses that by returning the third mark **empty** rather
than dropping it. So "every number, exactly once" costs nothing that real translations need —
which is why the earlier bare-vs-wrapped distinction (was a link lost, or did words merge?) is
gone, along with the clone that a repeated mark would have required.

Splitting a fragment in two is the one thing the model may not do. If it wants to, the container
takes the per-node path and reads as it does today.

The instruction therefore has to say two things, and the second is easy to forget: **return every
mark, empty if its text moved elsewhere**, and **never introduce a mark into a value that had
none**.

Corrupt ⇒ D7: the container is queued for a per-node retranslation, batched with every other
corrupt container into one additional request. If that reply is also unusable, the container is
left untranslated and reported — never half-written, because a half-written container with its
markup gone is the failure nobody notices.

Verification runs in the translation stage, not the applicator: the retranslation needs the
provider, and the applicator has no access to it. The applicator receives fragments that are
already verified.

### Marks are flat

A mark denotes a **text leaf together with its whole wrapper chain**, not a markup element — so
nesting cannot arise by construction. A link containing an emphasised word (`read the **docs**`)
holds two leaves and therefore emits two flat, adjacent marks:

```
<4>read the </4><5>docs</5>
```

Each gets its own copy of that link as `top` (D17), the second's leaf carrying the emphasis. The
parser reads left to right and needs no stack, and a nested mark in the reply is simply corrupt.

The cost is D12: one source link becomes two adjacent links with the same href — identical on
screen, one node more in the tree. Structure-mirroring marks
(`<4><5>docs</5></4>`) would avoid that and cost a stack in the parser plus a whole class of
model errors — declined in §9.

### Plain values carry no marks

`text` and `textarea` fields travel exactly as they do today, unmarked. So does a container
holding a single unformatted text node (D6). The rule: **marks appear only where a value holds
more than one fragment.**

One request therefore mixes marked and unmarked values, which the model can confuse. If marks
appear in the reply to a value that was sent unmarked, they are stripped and a warning is
emitted — the text itself is usually fine and losing it to the model's overreach would be worse.
Splitting marked and unmarked values into separate requests is declined in §9: an extra request
every time, and the whole-document context that keeps terminology consistent is exactly what it
would break.

---

## 5. Where things go

| Path | Change |
| --- | --- |
| `src/core/kernel/lexical/collectInlineFragments.ts` | **new** — container walk (D20): containers per D1, fragments with `node`/`top`, whitespace kept |
| `src/core/kernel/lexical/inlineMarks.ts` | **new** — serialize fragments to a marked string; parse a marked string back to `{ markId, text }[]`; pure, no Lexical knowledge |
| `src/core/translation-pipeline/types/TextChunk.ts` | `RichContainerChunk` joins `PlainTextChunk` and `RichTextChunk`, plus its guard |
| `src/core/translation-pipeline/stages/text-expander/RichContainerExpander.ts` | **new** — one chunk per container; falls back to `RichTextExpander` per D3/D6 |
| `src/core/translation-pipeline/stages/text-expander/TextChunkExpander.ts` | picks the expander by the configured granularity |
| `src/core/translation-pipeline/stages/translation/Translation.stage.ts` | parses and verifies marks, and owns the D7 retranslation pass — it is the stage holding the provider |
| `src/core/translation-pipeline/stages/translation-applicator/TranslationMutator.ts` | third branch: rebuild `children` from verified fragments; fast path per D5 |
| `src/core/domain/translation-providers/TranslationProvider.interface.ts` | optional `capabilities` (D9) |
| `src/translation-providers/shared/buildSystemPrompt.ts` | mark instruction appended after any override (D11) |
| `src/translation-providers/openai/openAIComplete.ts` | declares `capabilities.inlineMarks` |
| plugin config surface | the transitional flag (D8), JSDoc naming its removal version |
| `docs/DEPRECATIONS.md` | an entry beside `provider-dry-run`, per the register's own format |
| `README.md` | the flag and its lifetime, the provider capability, the dry-run note (D21), the v1 limitation from D12 |

`collectTextNodes`, `RichTextExpander`, `leafSourceText`, the whole provenance path,
`buildResponseSchema`, `parseAndValidateReply` and `runDryRun` are untouched. No stored fingerprint
changes value, so this design carries no migration.

---

## 6. Build sequence

1. **Contract tests first, on a stub.** Serializer and parser tests written from §4, red before
   any implementation: French adjective, German subordinate clause, link with two formatted
   leaves, line break mid-paragraph, a mark-shaped sequence in the source text, a merge expressed
   as an empty mark, marks appearing in a reply to an unmarked value, a whitespace-only node
   between two words, a reply that trimmed an edge space, a paragraph of adjacent links, and every
   row of the reply table.
2. **`collectInlineFragments` + `inlineMarks`** — pure, no pipeline wiring. Turn the tests green.
3. **`RichContainerChunk` + applicator branch** with the D5 fast path, behind the option still
   defaulting to `"node"`.
4. **`RichContainerExpander`** and expander selection; D3 and D6 fallbacks.
5. **Provider seams** — capability declaration (D9) and the prompt instruction appended after the
   override (D11).
6. **D7 retranslation pass**, then the D22 circuit breaker on top of it.
7. **Fingerprint guard** — a test asserting that a container-mode run leaves stored fingerprints
   and staleness verdicts untouched (Q3). Cheap, and it pins D20 against a future tidy-up.
8. **Flag, deprecation entry and docs** (D8, D21), then delete the flag in the next major.

---

## 7. Open questions

1. **What real content actually contains** — two counts from a live project, not guesses.
   (a) Which inline nodes appear inside paragraphs (`linebreak`, `inlineBlock`, mentions,
   uploads): the self-closing rule covers them structurally, but corrupt-on-missing is strict, and
   a node type models routinely swallow would send containers to the fallback often.
   (b) How often a container holds no direct text child (a paragraph of adjacent links), which is
   the limitation recorded in §4. Both counts decide whether the simple container rule stands.
2. ~~**How often models drop empty marks**~~ — **answered 2026-09-09, D13 stands.** 99 containers
   × French/German/Japanese × four models = 396 translations through the real API:

   | Model | Usable | Corrupt | Cost |
   | --- | --- | --- | --- |
   | gpt-4o-mini | 98/99 | 1 × `missing-mark` | 0.29 ¢ |
   | gpt-4o (today's default) | 98/99 | 1 × `missing-mark` | 4.66 ¢ |
   | gpt-5.4-mini | 99/99 | none | 0.86 ¢ |
   | gpt-5.5 | 99/99 | none | 11.35 ¢ |

   Fallback rate ≈1% on the older models, zero on the newer ones — the per-container retranslation
   of D7 covers it comfortably. Models do use the empty mark rather than omitting it: gpt-4o-mini
   returned `<1>製品を購入</1><2></2><3>して20%節約しましょう。</3>`, merging mark 2 into its
   neighbour. Had D13 demanded text in every mark, that reply would have fallen back.

   Side finding, worth its own task: gpt-5.4-mini is both more accurate and **5× cheaper** than the
   `gpt-4o` this plugin still defaults to. gpt-5.5 buys nothing over it and spends 3× the output
   tokens (10896 vs 3826), presumably on reasoning a translation does not need.
3. **Group write in the language port** — §8 says the port needs a container-level write beside
   the per-unit one. Does that land here (a note in the kernel-extraction doc, implemented when its
   phase 2 runs) or does this design ship its own shape and the port adopt it later? Owner call.
4. **Provenance fingerprint direction** — `leafSourceText`
   (`src/core/domain/content-projection/translatableLeaf.ts:41-49`) joins source text nodes with
   `join("")`. Everything read so far says fingerprints are computed from the source side only,
   which would make this change invisible to staleness. To be confirmed by test before step 3,
   because if any fingerprint touches the target side, every existing translation flips to stale
   on the first container-mode run.

---

## 8. Fit with the core-kernel design

[2026-08-21-translation-mechanism-kernel-extraction.md](./2026-08-21-translation-mechanism-kernel-extraction.md)
turns each nested data structure into a **language** — one home per structure, answering "what text
is inside this value and how is each piece written back", with `Payload → Lexical → Payload`
nesting declared legal and unbounded. Checked against it, this design lands in three buckets.

**Lands cleanly.** The container walk, the container rule (D1), mark serialization and parsing are
all Lexical structural knowledge, which is exactly what a language owns. Keeping both granularities
in one home (D20) is that document's §4.3 restated: the shared layer is the language, not the walk.

**Sharpens a contract that is not built yet.** The language port exposes
`textUnits(leaf) → Array<{ text, write }>` — one independent `write` per unit. Container mode cannot
use that shape: the order of `children` depends on *all* the container's units at once, so writing
one unit in isolation is not a defined operation. The port needs a group write — "here are this
container's units, translated, in reply order; rebuild the children" — alongside the per-unit one.
Worth folding into that design now, while it is still on paper.

**Deliberately not done.** Merging the projection walk into the pipeline walk. That document's §7
already carries it as a risk with a guard test, and the reason is ordering, not migration: the
fingerprint must hash the pristine source before any write. This design leaves both walks alone.

One more borrowed detail: §7 there already plans `fingerprintVersion` for its own phase 5, and
treats a version mismatch as *unknown* rather than *stale*. If a join change ever becomes
unavoidable, that is the mechanism to hang it on — not something to invent for whitespace.

---

## 9. Considered and rejected

| Option | Why not |
| --- | --- |
| Keep writing into the original nodes, move the formatting instead | Would require reading and writing `format`, and turning a text node into a link node with children. The layer would have to understand Lexical formatting — the one thing this design avoids |
| Structured output: an array of `{ mark, text }` per key | Cleaner than string parsing, but breaks `Record<number, string>` and with it every hand-written provider |
| Real HTML tags instead of numeric marks | Models "improve" real tags — adding attributes, swapping synonyms. Numeric marks have nothing to improve and are trivial to validate |
| Escape `<` in source text | An escape sequence is itself something the model may "fix" — decode it, duplicate it, drop it. Two directions to implement and test, a new class of failure, and D3 already covers the content it would protect |
| Rare Unicode delimiters instead of angle marks | The model does not recognise them as markup, so it drops them far more often than tags it knows |
| Send neighbouring fields as context, keep per-node granularity | Improves term consistency, not grammar: a fragment still has no correct form outside its sentence, and the context rides along in every request |
| Joining a wrapper's leaves into one fragment (link → one mark, translation written to the first leaf) | No copy needed, but the emphasis inside the link is lost — and losing markup is the defect this design exists to fix |
| Treating a wrapper as a nested container with its own key | No copy needed and markup survives, but the paragraph's own request then shows a placeholder where the link's text was. The model loses exactly the context the whole change is for |
| An optional 4th `translate()` parameter listing which keys carry marks | No consumer: marks are visible in the text itself, so a provider that wants to handle them applies its handling to the whole set. Verifying the marks came back is the core's job, not the provider's |
| A permanent mode option, container mode merely becoming the default in the next major | The case it protects — "the model mangles marks, let me still get some translations" — is already covered by D7 falling back per container, and the double-billing worry by D22. What it costs is two supported modes forever: two test suites, two documented behaviours, and every later feature (glossary, brand voice, fingerprints) verified twice. A config option is a support promise, not a debug switch |
| Merge adjacent fragments sharing one wrapper (D12) | Correct output without it; deferred so v1 stays small |
| Structure-mirroring nested marks | Needs a stack in the parser, and nesting is the thing models break most often. Flat marks have no nesting to break |
| Separate requests for marked and unmarked values | An extra request on every document, and it splits the whole-document context that makes terminology consistent |
| A `parents` array on each fragment | Rebuilding nesting by hand, when pushing `top` carries it by reference. Two references (`node`, `top`) say everything the applicator needs |
| Cloning a node so a repeated mark can occupy two slots | Buys one model behaviour nobody needs and pays with a clone path, a leaf-lookup inside the clone, and a second way for the tree to be built. D13 rejects the repeat instead |
| Widening `collectSerializedLexicalTextNodes` and moving the whitespace filter into its caller | Tidier on paper, but it changes the fingerprint join, so every stored fingerprint stops matching: false staleness across the store and an auto-translate bill the customer never asked for. The drift it avoids is handled by keeping both granularities in one home (D20) |
| Merging the projection walk into the pipeline walk, now or in a later major | Not a migration question — an ordering one. The fingerprint must hash the pristine source *before* any write; a single walk turns that guarantee into a rule someone has to remember, and forgetting it makes every fresh translation read as stale. §7 of the core-kernel design keeps a guard test against exactly this |
| Tolerate a missing mark by inspecting what it wrapped | The branch it buys is only needed because merging had no legal encoding; with empty marks it has one |
