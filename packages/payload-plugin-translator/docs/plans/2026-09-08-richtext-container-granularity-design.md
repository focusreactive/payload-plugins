# Design — rich text container granularity (#134)

- **Issue:** [#134](https://github.com/focusreactive/payload-plugins/issues/134)
- **Date:** 2026-09-08 · **Status:** decided, two questions open (§7)

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
| D7 | Corrupt reply for a container ⇒ that container is retranslated per-node in one extra batched request | Degrades to today's quality rather than silently dropping inline marks. Pouring the whole translation into the first node would be *worse* than today — every link and emphasis inside that container lost. Bounded: one extra pass, never a loop; a second unusable reply leaves the container untranslated and reported |
| D8 | Granularity is an option, defaulting to `"node"` for this major version | Existing installs, including ones with hand-written providers, keep byte-identical output until they opt in |
| D9 | A provider opts in by declaring `capabilities.inlineMarks` | A machine-translation API behind `CompletionFn` would translate or strip marks. Absent declaration ⇒ per-node, whatever the option says |
| D10 | `translate()` gains an optional 4th parameter carrying which keys hold marks | One request mixes marked containers with plain `text` fields. Optional, so existing implementations are unaffected |
| D11 | The mark instruction is appended to the system prompt by the core, after any override | A `SystemPromptBuilder` that ignores `defaultPrompt` must not be able to drop the one instruction the format depends on |
| D12 | Adjacent fragments sharing one wrapper are not merged in v1 | Two text leaves inside one link keep that link as their `top`, so the rebuilt array holds it twice — the same node, adjacent. Rendering is unchanged; merging is polish, not correctness |
| D13 | Every issued number must come back **exactly once**; order is free, empty content is how a merge is expressed | One set comparison, no occurrence counting. Rejecting a repeated mark is what removes copying from the design entirely (D17) |
| D14 | Plain values and single-node containers are sent unmarked; stray marks in their replies are stripped and warned | No markup inside them to preserve, so marks would be pure token cost |
| D15 | Whitespace-only nodes are glued onto the preceding fragment, never marked on their own | A mark of its own can come back empty, and the gap between two words would be gone. Glued, the space rides inside a fragment that carries text |
| D16 | Edge whitespace is restored by the core after the reply, not by the provider | Models trim edges. The provider's contract is string in, string out — it must not know about nodes or gaps. This is exactly the logic that ossified as a "Fix spaces" patch inside the Storyblok plugin's model call |
| D17 | Nothing is copied: a fragment holds two live references — `node` (the text leaf) and `top` (the container's direct child) | Applying a translation is then `node.text = ...` plus a reordered `children` array. A repeated mark is the only case that would need a clone, and D13 rejects it |
| D18 | One walk, not two: `collectSerializedLexicalTextNodes` returns every text node (whitespace included) plus each one's `node`/`top` pair; the whitespace filter moves into `RichTextExpander` | Collecting is the walk's job, deciding what not to translate is the caller's. Removes a duplicate traversal, at the cost of D19 |
| D19 | Provenance records gain a fingerprint version; a record written under an older version is recomputed, not declared stale | D18 changes the join (`"Buyour product"` → `"Buy our product"`), so every stored fingerprint would stop matching — the admin would show every translation stale and auto-translate would retranslate everything at the customer's expense. `dismissedFingerprint` was added ahead of need for the same reason |

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

Container mode needs two things the walk does not currently give: whitespace-only nodes (it
filters them out, and they hold the gaps between words) and, per text node, the container's
direct child above it (the flat `{ node }` return cannot say a leaf sat inside a link).

Rather than a second walk, D18 extends this one and moves the whitespace filter into
`RichTextExpander`, where it is a policy of the per-node path rather than a property of
collecting. That keeps one traversal — and one shared answer to "which content is translatable" —
but it changes what the fingerprint hashes: `["Buy", " ", "our product"]` joins as
`"Buyour product"` today and `"Buy our product"` after. Every stored fingerprint would stop
matching, so D19 versions them and recomputes instead of declaring staleness. That migration is
the price of the single walk, and it is the one piece of work in this design that exists purely
because of an implementation detail rather than the feature.

**Reference mutation survives.** The pipeline's contract — chunks carry live references into
the tree `DataReconciler` built, and the applicator mutates through them — does not change.
Only the level changes: `containerRef.children = [...]` instead of `nodeRef.text = ...`. No
stage downstream of the applicator learns anything new.

**Nothing is copied at all.** The rebuilt `children` array holds the *same node objects* in a
new order — the only write into a node is still `node.text`. A clone would be needed for exactly
one model behaviour, a mark returned twice, and D13 rejects that reply instead of supporting it.
So there is one way the tree is built, not two.

---

## 4. Mark contract

### Emitting

Walking a container's inline level produces, in document order, one fragment per text leaf and
one per non-text inline node:

Each fragment carries a mark number and two live references, never a copy (D17):

| Fragment | Emitted as | `node` (where the translation is written) | `top` (what goes into the rebuilt array) |
| --- | --- | --- | --- |
| text leaf, direct child of the container | `<n>text</n>` | the leaf | the same node |
| text leaf inside a link (or any wrapper chain) | `<n>text</n>` | the leaf | the container's **direct child** — the chain above the leaf rides along inside it |
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

Both name that link as their `top`; the second's leaf also carries the emphasis. The parser reads
left to right and needs no stack, and a nested mark in the reply is simply corrupt.

The cost is D12: the same link node lands twice, adjacent, in the rebuilt array. Structure-mirroring marks
(`<4><5>docs</5></4>`) would avoid that and cost a stack in the parser plus a whole class of
model errors — declined in §8.

### Plain values carry no marks

`text` and `textarea` fields travel exactly as they do today, unmarked. So does a container
holding a single unformatted text node (D6). The rule: **marks appear only where a value holds
more than one fragment.**

One request therefore mixes marked and unmarked values, which the model can confuse. If marks
appear in the reply to a value that was sent unmarked, they are stripped and a warning is
emitted — the text itself is usually fine and losing it to the model's overreach would be worse.
Splitting marked and unmarked values into separate requests is declined in §8: an extra request
every time, and the whole-document context that keeps terminology consistent is exactly what it
would break.

---

## 5. Where things go

| Path | Change |
| --- | --- |
| `src/core/kernel/lexical/collectTextNodes.ts` | extended (D18): keeps whitespace-only nodes, returns each node's `top` alongside it |
| `src/core/kernel/lexical/collectInlineFragments.ts` | **new** — groups the walk's output into containers per D1 |
| `src/core/kernel/lexical/inlineMarks.ts` | **new** — serialize fragments to a marked string; parse a marked string back to `{ markId, text }[]`; pure, no Lexical knowledge |
| `src/core/translation-pipeline/types/TextChunk.ts` | `RichContainerChunk` joins `PlainTextChunk` and `RichTextChunk`, plus its guard |
| `src/core/translation-pipeline/stages/text-expander/RichContainerExpander.ts` | **new** — one chunk per container; falls back to `RichTextExpander` per D3/D6 |
| `src/core/translation-pipeline/stages/text-expander/TextChunkExpander.ts` | picks the expander by the configured granularity |
| `src/core/translation-pipeline/stages/translation/Translation.stage.ts` | parses and verifies marks, and owns the D7 retranslation pass — it is the stage holding the provider |
| `src/core/translation-pipeline/stages/translation-applicator/TranslationMutator.ts` | third branch: rebuild `children` from verified fragments; fast path per D5 |
| `src/core/domain/translation-providers/TranslationProvider.interface.ts` | optional 4th parameter (D10); optional `capabilities` (D9) |
| `src/translation-providers/shared/buildSystemPrompt.ts` | mark instruction appended after any override (D11) |
| `src/translation-providers/openai/openAIComplete.ts` | declares `capabilities.inlineMarks` |
| `src/core/translation-pipeline/stages/text-expander/RichTextExpander.ts` | takes over the whitespace filter (D18) |
| `src/core/domain/provenance/ProvenanceStore.interface.ts` · `src/server/modules/provenance/Provenance.collection.ts` | fingerprint version field (D19) |
| `src/core/domain/provenance/staleness.ts` · `src/core/domain/auto-translate/hasSourceContentChanged.ts` | recompute instead of declaring stale when the version is older (D19) |
| `README.md` | the option, the provider capability, the v1 limitation from D12 |

`buildResponseSchema`, `parseAndValidateReply` and `runDryRun` are untouched. `leafSourceText`
keeps its `join("")` — only its input widens, which is exactly why D19 exists.

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
5. **Provider seams** — capability declaration, 4th parameter, prompt instruction; assert marks
   survive `runDryRun`.
6. **D7 retranslation pass.**
7. **Fingerprint version (D19)** — field, recompute-on-older-version branch, and a test proving
   an upgrade does not flip existing translations to stale. Must land with step 2, not after it,
   since step 2 is what changes the join.
8. **Docs**, then flip the default in the next major.

---

## 7. Open questions

1. **What real content actually contains** — two counts from a live project, not guesses.
   (a) Which inline nodes appear inside paragraphs (`linebreak`, `inlineBlock`, mentions,
   uploads): the self-closing rule covers them structurally, but corrupt-on-missing is strict, and
   a node type models routinely swallow would send containers to the fallback often.
   (b) How often a container holds no direct text child (a paragraph of adjacent links), which is
   the limitation recorded in §4. Both counts decide whether the simple container rule stands.
2. **How often models drop empty marks** — D13 leans on the model returning a mark whose text
   moved elsewhere as `<n></n>` rather than omitting it. If models routinely omit instead, the
   fallback rate makes the whole mode pointless. Measure before flipping any default: a hundred
   real containers across the language pairs that matter, counting fallbacks. A high rate means
   rewording the instruction, or softening D13 — not shipping and hoping.
3. **Provenance fingerprint direction** — `leafSourceText`
   (`src/core/domain/content-projection/translatableLeaf.ts:41-49`) joins source text nodes with
   `join("")`. Everything read so far says fingerprints are computed from the source side only,
   which would make this change invisible to staleness. To be confirmed by test before step 3,
   because if any fingerprint touches the target side, every existing translation flips to stale
   on the first container-mode run.

---

## 8. Considered and rejected

| Option | Why not |
| --- | --- |
| Keep writing into the original nodes, move the formatting instead | Would require reading and writing `format`, and turning a text node into a link node with children. The layer would have to understand Lexical formatting — the one thing this design avoids |
| Structured output: an array of `{ mark, text }` per key | Cleaner than string parsing, but breaks `Record<number, string>` and with it every hand-written provider |
| Real HTML tags instead of numeric marks | Models "improve" real tags — adding attributes, swapping synonyms. Numeric marks have nothing to improve and are trivial to validate |
| Escape `<` in source text | An escape sequence is itself something the model may "fix" — decode it, duplicate it, drop it. Two directions to implement and test, a new class of failure, and D3 already covers the content it would protect |
| Rare Unicode delimiters instead of angle marks | The model does not recognise them as markup, so it drops them far more often than tags it knows |
| Send neighbouring fields as context, keep per-node granularity | Improves term consistency, not grammar: a fragment still has no correct form outside its sentence, and the context rides along in every request |
| Merge adjacent fragments sharing one wrapper (D12) | Correct output without it; deferred so v1 stays small |
| Structure-mirroring nested marks | Needs a stack in the parser, and nesting is the thing models break most often. Flat marks have no nesting to break |
| Separate requests for marked and unmarked values | An extra request on every document, and it splits the whole-document context that makes terminology consistent |
| A `parents` array on each fragment | Rebuilding nesting by hand, when pushing `top` carries it by reference. Two references (`node`, `top`) say everything the applicator needs |
| Cloning a node so a repeated mark can occupy two slots | Buys one model behaviour nobody needs and pays with a clone path, a leaf-lookup inside the clone, and a second way for the tree to be built. D13 rejects the repeat instead |
| A second walk beside `collectSerializedLexicalTextNodes` | Two traversals drifting apart on "what is a text node", to avoid one fingerprint migration. D18/D19 take the migration |
| Tolerate a missing mark by inspecting what it wrapped | The branch it buys is only needed because merging had no legal encoding; with empty marks it has one |
