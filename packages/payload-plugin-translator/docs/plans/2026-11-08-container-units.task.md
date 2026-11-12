# Container units in the rich-text language

Build step: 2026-11-06-the-swap.design.md #2

The rich-text language cuts text one node at a time. The pipeline it will replace cuts one
container at a time — a paragraph, a heading, a list item — sending the whole container as one
value whose formatting travels as numbered marks, so the translated pieces can come back reordered.
Per node, `a **red** car` returns from French as `un **rouge** voiture`: ungrammatical, emphasis on
the wrong word. Per container it returns as `une voiture **rouge**`.

Swapping the walker before this step would regress every rich-text field, not only the ones holding
an embedded block.

## Requirements

- R1 (in) A container with more than one translatable piece is offered as one unit carrying its
  pieces, so the reply may reorder them.
- R2 (in) A block embedded inside a container is still crossed into and translated, including one
  sitting between words.
- R3 (in) A container the fragment collector marks skipped keeps today's per-node behaviour, and a
  tree whose containers are all skipped falls back per-node as a whole.
- R4 (in) A reply whose pieces do not match the ones sent writes nothing, leaving the container in
  its source language rather than half-translated.
- R5 (in) The rules for folding a reply back into a container exist once, not once per caller.
- R6 (out) Wiring the languages into the pipeline. That is build step 3.

## What the code settled before this was designed

**A container unit cannot carry its formatting inside a string.** Encoding `<1>a </1><2>red</2>`
into `TextUnit.text` is refuted by the provider path: `toSections` routes a `{ kind: "text" }` value
into the **plain** section, and the shipped instruction says of that section that anything in it
looking like a mark is part of the text, to be kept as it is. A pre-encoded container would have
its own markers translated as content. The marked wire format is the provider's to apply, from
structured segments, and `canEncodeSegments` is what decides whether it is safe at all.

So a container unit must carry segments, and `TextUnit` is fixed at `text: string`. The swap design
claims the contract "already anticipates both"; it anticipates the **cut**, not what a cut piece
carries.

**A container cannot be both a value and a parent.** `Step` is `children | value | skip`, and a
paragraph holding an inline block needs to be one unit *and* to be opened into, or the block's own
fields are never reached. Payload's `InlineBlocksNode` is genuinely inline — its instance
`isInline()` returns `true` and it renders as a `<span>` — so a block between words is an ordinary
shape, not a contrived one.

**The oracle has never compared containers.** The differential tests drive the old side with
`[RichTextExpander, PlainTextExpander]` — the per-node pair — while production's first expander is
`RichContainerExpander`. The suite is green and the first equality is false at the same time,
because nothing has been comparing it.

## Decisions

### D1. The embeds inside a container are walked as its siblings, not as its children

A container answers "value" and so is one unit. The embeds it holds are lifted to the list its
parent hands the walk, in document order, so each still gets its own crossing. Every node keeps
giving exactly one answer and the kernel's `Step` is untouched.

Measured on a throwaway prototype before this was chosen, against the current language over six
tree shapes — an inline block between words, two id-less inline blocks whose addresses are
ordinals, a standalone block between paragraphs, an inline block wrapped in a link, a rich text
nested inside a block, and id-less and named embeds interleaved. **Every embed address was
identical.** Nothing between the field and the embed reaches the address — descents carry no path
segments and only the embed contributes one — so lifting changes nothing an address is built from.

The same prototype showed the text sent matches the old expander exactly, including a single-word
paragraph arriving as plain text through the skip path, while additionally sending the embedded
blocks' own fields, which the old side never reaches.

- *Rejected — extend `Step` with a shape that is a value and opens onto children.* It would be a
  second change to the kernel's central contract inside one build step, and it would change the
  walk for every language to serve one.
- *Rejected — containers holding an embed fall back per-node.* It would lose reordering for exactly
  those paragraphs, which the old pipeline already does better. The prototype made this unnecessary.

### D2. `TextUnit` becomes a union, and the kernel declares its own segment type

A unit either carries one string or carries pieces, and `resolve` takes back what its unit sent.
`TranslationTarget` and `applyTranslations` follow the same union, because any other arrangement
has the kernel converting between the two — the parsing D1's reasoning rejected.

The kernel imports nothing, pinned by its own scan, so it cannot use the segment type the provider
port already has; it declares a structurally identical one.

- Decided by the owner, 2026-11-08, with the alternative of designing the contract change
  separately offered and declined.

### D3. Folding a reply back into a container moves to the kernel's Lexical module

`tryApplyContainer`, inside the old applicator's `writeAnswers.ts`, is Lexical knowledge: rebuild
`children` in the reply's order, drop the node of a mark that came back empty, leave out the node
that never had a fragment so its glued whitespace is not rendered twice. Two of those three rules
are non-obvious and carry their own explanations. Only `chunk.fragments` and `chunk.containerRef`
tie it to the pipeline.

It moves to `core/kernel/lexical/`, beside `collectInlineFragments` which produces the fragments and
`checkSegments` which judges the reply, and both the old applicator and the new language's `resolve`
call it. Left where it is, the language would reimplement the same three rules and the two copies
would have to agree for the whole swap window.

- *Rejected — leave it and let the language write its own.* Two implementations of the subtlest
  rules in this area, which is the duplication the audit behind this work was opened for.
- This is not polishing something scheduled to die. `writeAnswers.ts` is deleted at build step 3;
  moving the rules out is what lets them survive that deletion, and the old caller keeps one line.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R1 | A paragraph of formatted runs is one unit carrying its pieces, not one unit per run | a test reading the units for such a paragraph | one unit; its pieces are the runs in source order |
| AC2 | R2 | An inline block between words is still translated, and at the address it has today | a test comparing embed addresses against the current language | the block's field is a target, at the same address |
| AC3 | R1 | A reordered reply rewrites the container in the reply's order | a test resolving with the pieces swapped | the container's children follow the reply, each piece's formatting with it |
| AC4 | R4 | A reply whose piece ids do not match writes nothing | a test resolving with a missing and with an unknown id | no write; the container keeps its source text |
| AC5 | R3 | A single-leaf container keeps per-node behaviour | a test over a one-word paragraph | one plain string unit, as today |
| AC6 | R3 | A tree whose containers are all skipped falls back per-node as a whole | a test over such a tree | the units equal the per-node units for the whole value |
| AC7 | R5 | The fold-back exists once and both callers use it | `grep` for the rebuilt-children loop across the source | one definition; the applicator and the language both call it |
| AC8 | R1, R3 | The first equality holds: text sent for a rich text with no embedded block | the differential oracle, driving `RichContainerExpander` | texts equal, addresses equal, written document equal |
| AC9 | — | A plain text leaf is unchanged | the existing language suites | one string unit, as today |
| AC10 | — | Nothing already passing breaks | `bunx vitest run` | 221 files or more, no failures |
| AC11 | — | No type errors | `bun run check-types` | exit 0 |
| AC12 | — | No new lint findings | `bunx oxlint .` | 34 warnings, 0 errors |
| AC13 | — | The package still builds with the real declaration emitter | `bunx turbo run build --filter='./packages/payload-plugin-translator'` from the root | exit 0 |
| AC14 | — | The sandbox still boots and translates | `bun run test:integration:sqlite` in `apps/dev` | 248 passed, 7 skipped |

## Pre-flight

| AC | Result against the untouched tree | Kind |
|---|---|---|
| AC1 | `textUnits` handles a string leaf only; a formatted paragraph yields one unit per run | change — fails now |
| AC2 | passes now, and must keep passing: the prototype proved lifting preserves it | invariant |
| AC3, AC4 | no segment unit exists, so neither can be expressed | change — fails now |
| AC5, AC6 | the language has no skip path at all; every text node is its own unit | change — fails now |
| AC7 | the rebuilt-children loop exists once, inside the pipeline's applicator | change — fails now, for the second caller |
| AC8 | the oracle drives the per-node pair, so the equality is untested | change — fails now |
| AC9, AC10 | 221 files, 2639 passed, 9 skipped | invariant — passes now |
| AC11 | exit 0 | invariant — passes now |
| AC12 | 34 warnings, 0 errors | invariant — passes now |
| AC13, AC14 | exit 0 · 248 passed, 7 skipped | invariant — passes now |

## Risk notes

Classified **high**. It changes the kernel's central contract, which some thirty files name, and the
rich-text cut is the behaviour the whole epic is judged on.

- D1's lifting is the part that reads least obviously from the code: a child list assembled from
  the tree plus the embeds found under it is not what a reader expects from a walk. It earns a
  comment that says why, and a test that fails if the lifting is removed.
- The second fallback of D3's neighbourhood is the likeliest thing to get silently wrong: a
  **single** skipped container inside an otherwise translatable tree emits per-node chunks for
  itself alone. It is not in the design, and no existing test covers it.
- A target that carries pieces is a shape every consumer of `CollectedContent` must now handle. The
  sweep over them is mandatory at this risk level.
- Moving the fold-back touches a file build step 3 deletes. The move must leave the old side's
  behaviour byte-identical, which its own suite is the check for.

## Review

Filled by the verification pass; the run log lives beside this file.

## Decisions by the owner

2026-11-08 — `TextUnit` becomes a union of a string unit and a segment unit, rather than encoding
marks into the string or deferring the cut to build step 3.

2026-11-08 — a container's embedded blocks are walked as its siblings so that no second change to
the kernel's `Step` is needed and no paragraph loses reordering; chosen after the alternative was
measured on a throwaway prototype rather than argued.

2026-11-08 — the rules for folding a reply back into a container belong to the kernel's Lexical
module, called by both the old applicator and the new language, rather than written twice.
