# The schema walk stands alone

Supersedes one line of `2026-06-11-field-traversal-utility-design.md`: "one engine". It becomes one
**dispatch** with two drivers — a data fold and a schema sweep — plus the path walk that design
already recorded as its honest seam.

## Task restatement

Walking a collection's schema **without a document** has no home. The engine the project has,
`walkFields`, is a data fold: its `enterList` asks the caller for one cursor per element, which a
reader with no document has to invent. So two readers wrote their own recursion over the same field
dispatch instead. This task gives the schema sweep its own entry point in the kernel and moves both
readers onto it.

## Requirements

- R1 (in) One schema-only walk lives in the kernel, driving the same field dispatch
  (`classifyField` / tab rules) as the data fold, and visiting both leaves and containers with the
  path each sits at.
- R2 (in) Both schema-only readers run on it — the leaf sweep and the presentation index — and
  neither keeps a recursion of its own.
- R3 (in) A block that contains itself terminates the walk instead of running forever, for both
  readers.
- R4 (out) `walkFields` and its four callers. The data fold is not touched.
- R5 (out) `findFieldByPath` and the payload-fields language. Both read data — one resolves a block
  element by reading `blockType` from the document, the other decides per value — so neither is a
  schema-only walk. They keep what they have.
- R6 (out) What the two readers produce. This is a move; every existing expectation stands
  unedited.

## Decisions

**D1 — a second driver over the one dispatch, not a second engine.** The alternative was to put both
readers on `walkFields` by fabricating one child cursor per block definition and one per array
shape. It works, and it was rejected twice over: the engine's vocabulary would then describe
elements that do not exist, with a meaningless `key` per child; and the schema projection is
deliberately cyclic — `projectFieldLike.ts` says in as many words that a consumer "must walk it by
data, never by schema alone" — so every schema-only caller would carry its own cycle guard inside a
cursor, which is the duplication this task exists to remove. `classifyField` and the tab rules stay
the single dispatch both drivers call.

**D2 — one callback over a tagged node, not a hook per kind.** `FieldWalker` has four methods
because a fold must assemble; a sweep only observes. One `visit(node)` with a `kind` keeps the
contract total — a reader that cares about leaves alone writes one `if`, and no caller has to leave
three methods empty.

**D3 — the kind comes from the dispatch, the children come from the field.** `classifyField` is
asked what a field is, but its narrowed payload is typed in the kernel's own `FieldLike`, which
would throw away the caller's richer field type. The walk is generic over the field, reads children
off it (`fields`, `tabs`), and hands the caller back its own type. `tabScopes` becomes generic for
the same reason, so the named/unnamed rule still lives in one place. Rejected: making
`classifyField` generic — a wide change to the type six call sites switch on, for no further gain.

**D4 — resolving a blocks field's definitions is the caller's, and it is required.** The
pre-sanitize snapshot carries its blocks inline; the sanitized config keeps slugs and a root list to
resolve them against. One parameter, no default, with `inlineBlocks` exported for the first case —
so neither caller reads a hidden default and both say which world they are in.

**D5 — the cycle guard belongs to the walk.** The leaf sweep has one today; the presentation index
does not, so a self-referencing shared block would make it recurse until the stack gives out. With
the guard in the walk both are safe. This is a behaviour change in a case that currently does not
terminate, and it gets its own test rather than being folded into the move.

**D6 — the element tokens move with the walk that mints them.** `#item` and `#<slug>` are the path
grammar the sweep writes; they move into the kernel beside it, and the two readers plus the tree
builder read them from there.

## Placement

| Responsibility | Where |
|---|---|
| the schema sweep, its node type and the path tokens | `core/kernel/field-traversal/walkSchema.ts` |
| the tab rule, now generic | `core/kernel/field-traversal/kernel.ts` |
| leaves of a schema | `server/features/_lib/schemaLeaves.ts` — a visitor, no recursion |
| labels and `required` by path | `server/features/get-document-state/collectionPresentation.ts` — a visitor, no recursion |

**New surface:** `walkSchema`, `SchemaNode`, `inlineBlocks`, and the two tokens moving in. Callers:
the leaf sweep and the presentation index, both existing. **Shape check fired** on the new exported
function's parameter object and on its generic parameter; both are answered in D2 and D3.

**Escalate?** No — but the superseding note above is the reason this was close. The decision is one
seam inside one module, and the owner chose the direction.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R1 | The sweep visits a group, a named tab, an array and its element, a blocks field and each block's element, and every leaf, each with the path it sits at | `bunx vitest run src/core/kernel/field-traversal` | one case per container kind over a fixture holding all of them |
| AC2 | R1 | An unnamed tab and a presentational container flatten into the parent path, and a `ui` field is visited as nothing | same suite | the flattening case passes |
| AC3 | R3 | A block whose fields contain itself terminates, and its inner shape is visited once on that branch | same suite, plus the presentation index over the same shape | both pass; the second does not terminate before this change |
| AC4 | R2 | Neither reader has a recursion of its own | `grep -rln "classifyField" src/server` | no match |
| AC5 | R6 | What the two readers produce does not change | `bunx vitest run src/server/features/get-document-state src/server/features/_lib` with expectations unedited | 0 failing, and the diff touches no expectation in those files |
| AC6 | R1, D4 | Each reader resolves blocks in its own world: inline for the pre-sanitize schema, slugs against the root list for the sanitized config | the two readers' existing block cases | both pass |
| AC7 | R4 — **negative** | The data fold and its callers are untouched | `git diff --name-only` over the task | no file under `walkFields.ts`, `contentProjector.ts`, `DataReconciler.ts`, `filterLocalizedFields.ts` |
| AC8 | — | No new type errors | `bun run check-types` | 0 errors |
| AC9 | — | The package suite stays green | `bunx vitest run` | 0 failing |
| AC10 | — | The sandbox suite stays green | `cd apps/dev && bun run test:integration:sqlite` | 0 failing |
| AC11 | — | No new lint findings | `bunx oxlint .` | at most 26 warnings, 0 errors |

## Criteria pre-flight — run against the current working tree, 2026-11-19

| AC | Result | Kind |
|---|---|---|
| AC1 | **FAIL** — `grep -rn walkSchema src` finds nothing | change |
| AC2 | **FAIL** — as above | change |
| AC3 | **FAIL** — no walk to test; the presentation index has no guard (`grep -c insideBlocks` is 0 there) | change |
| AC4 | **FAIL** — two files under `src/server` recurse over `classifyField` | change |
| AC5 | **PASS** — both suites green today, and they must stay so | invariant |
| AC6 | **PASS** — both readers resolve blocks correctly today | invariant |
| AC7 | **PASS** — nothing touched yet | invariant |
| AC8 | **PASS** — 0 errors | invariant |
| AC9 | **PASS** — 2953 passed, 15 skipped | invariant |
| AC10 | **PASS** — 69 files, 274 passed, 7 skipped | invariant |
| AC11 | **PASS** — 26 warnings, 0 errors | invariant |

## Results

| AC | Result | Evidence |
|---|---|---|
| AC1 | met | eleven cases over the walk; one per container kind, each asserting the kind and the path |
| AC2 | met | the flattening case passes: a row's leaf and an unnamed tab's leaf sit at the parent path, a `ui` field is visited as nothing |
| AC3 | met | the cyclic case passes for the walk, the leaf sweep and the presentation index — with the guard removed, two of the three end in `Maximum call stack size exceeded` |
| AC4 | met | no file under `src/server` recurses over `classifyField` |
| AC5 | met | the two readers' folders pass with no expectation edited: the presentation suite's own diff adds one case and removes nothing |
| AC6 | met | the leaf sweep has its own suite now — order, inline blocks, the shapes left out of a stored path — beside the index's inline and referenced cases |
| AC7 | met | the data fold and its four callers show no diff |
| AC8 | met | 0 errors |
| AC9 | met | 2974 passed, 15 skipped — twenty-one more, this change's own |
| AC10 | met | 69 files, 274 passed, 7 skipped — unchanged |
| AC11 | met | 26 warnings, 0 errors |

## Risk

**High, by what it touches rather than by what it changes.** The kernel is the one place every
traversal in the package goes through, and this adds an entry point beside its engine. Against
that: the data fold is not touched at all, both movers are covered by suites whose expectations may
not be edited, and the one deliberate behaviour change — terminating on a self-referencing block —
is a case that today ends in a stack overflow.

The working tree already holds an unfinished task. This one must stay separable from it: it touches
the kernel and the two readers, and nothing the other task owns.
