# Field Traversal Utility — design

**Date:** 2026-06-11
**Status:** Engine implemented (Steps 1–2 done) — `kernel.ts` + `walkFields.ts` green, sites not yet migrated (Step 3 pending). Approach: **B+** (one engine, see "Decision & interface" below).
**Scope:** Internal (`server/shared`) — not public API, no `@since` needed.

We hand-roll the same Payload field-schema recursion in **four** places. Each one
re-derives "how Payload containers nest and map onto data" (tabs → unnamed containers →
group → array → blocks, plus block-slug lookup). That structural knowledge is the
drift-prone, bug-prone part, and it is copy-pasted. This doc designs a single source of
truth for it.

## The four call sites

| File | Data trees | Output mode | Site-specific rules |
| --- | --- | --- | --- |
| `server/features/translate-field/resolveFieldSubtree.ts` *(new, uncommitted)* | 0 — navigates a `path` | locate one node, early-exit | statuses `inside-blocks` / `not-translatable` / `not-found`; drops numeric path segments |
| `server/shared/utils/filterLocalizedFields.ts` | 1 (`data`) | build a new pruned tree | keeps `id` on array items, `blockType`+`id` on blocks; drops empty containers; keeps only `isTranslatableField && isLocalizedField` leaves |
| `server/modules/translation-pipeline/stages/data-reconciler/DataReconciler.ts` | 2 (`source`, `target`) | build a new merged tree | **strips** `id` (Postgres rejects it), keeps `blockType`; emits **all** fields; target-priority merge at leaves |
| `server/modules/translation-pipeline/stages/field-collector/FieldChunkCollector.ts` | 3 (`filtered`, `source`, `target`) | flat `FieldChunk[]` + mutates `data` | tracks `path: string[]` incl. array indices; leaf kept if translatable && localized && `!excluded` && `strategy.shouldTranslate` |

### What is identical across all four (the duplication)

The structural dispatch, in this exact order:

1. **tabs** — `for (const tab of field.tabs)`; guard `hasFields(tab)`; if `tabHasName(tab)`
   → descend into `data[tab.name]` (a data boundary, group-like); else (unnamed) → descend
   in the **same** data scope.
2. **presentational container** — `!fieldAffectsData(field)` (row, collapsible) → if
   `hasFields(field)` descend in the **same** scope; UI leaves are ignored.
3. **group** — `fieldIsGroupType` → descend into `value` (object boundary).
4. **array** — `fieldIsArrayType` → iterate items (`isObject` guard), descend per item.
5. **blocks** — `fieldIsBlockType` → iterate items (`isBlockItem` guard), resolve
   `field.blocks.find(b => b.slug === item.blockType)`, descend into `block.fields`.
6. **leaf** — `fieldAffectsData`, no subfields → site-specific decision.

Every site already correctly imports the predicates from `payload/shared`
(`fieldAffectsData`, `fieldIsArrayType/BlockType/GroupType`, `tabHasName`). We are **not**
re-implementing predicates — we are re-implementing the *control flow that strings them
together*.

### What genuinely differs (must stay caller-controlled)

- **Arity** — 0/1/2/3 parallel data trees.
- **Output mode** — locate-and-stop vs build-tree vs collect-flat-list.
- **Leaf decision** — classify / keep-if-localized / always-emit / keep-if-strategy.
- **Container assembly** — keep `id` vs strip `id`; keep `blockType`; drop-empty vs keep;
  pass non-object array items through unchanged (reconcile only).

## Why not Payload's `traverseFields` / `getFieldByPath`

(Established in prior investigation — recorded here so we don't re-litigate.)

- `traverseFields` carries a **single** mutable `ref` (one data tree). Reconcile needs 2,
  the collector needs 3. No clean fit.
- `getFieldByPath` / `flatten*` want **sanitized/flattened** schema and resolve block
  references via `config.blocks`. Our pipeline deliberately runs on the **original,
  un-sanitized** schema (it preserves `localized: true` on nested fields and inlines
  `field.blocks`). Mismatch.
- `traverseFields` defaults `fillEmpty: true` and mutates `ref`.

So we build our own — but **one** of our own, not four.

## The kernel: a single classification of Payload field structure

The non-negotiable shared piece. One function encodes the dispatch order above:

```ts
// server/shared/field-structure/classifyField.ts
export type FieldStructure =
  | { kind: 'tabs'; field: TabsField }
  | { kind: 'transparent'; fields: Field[] }   // row / collapsible / unnamed presentational
  | { kind: 'presentational' }                  // UI leaf — no data, no subfields
  | { kind: 'group'; name: string; fields: Field[] }
  | { kind: 'array'; name: string; fields: Field[] }
  | { kind: 'blocks'; name: string; field: BlocksField }
  | { kind: 'leaf'; field: FieldAffectingData; name: string }

export function classifyField(field: Field): FieldStructure
```

Plus two helpers that absorb the other two duplicated details:

```ts
// Normalizes the named/unnamed + hasFields tab dance into a flat list.
export function tabScopes(field: TabsField):
  Array<{ named: true; name: string; fields: Field[] } | { named: false; fields: Field[] }>

// The block-slug lookup, in one place. Returns null for unknown/!block items.
export function resolveBlockFields(field: BlocksField, item: unknown): Field[] | null
```

This kernel is the floor: **every option below builds on it.** It alone kills the
drift-prone duplication (a new container type, or a `tab.localized` rule, is then a
one-file change). Each call site keeps its own recursion but `switch`es on
`classifyField` instead of re-deriving the dispatch.

The question is how much *further* to go.

## Options for the traversal layer on top of the kernel

### Option A — kernel only; each site keeps its recursion

Sites stay 4 separate recursive functions, but each one is a `switch (classifyField(f).kind)`
and uses `tabScopes` / `resolveBlockFields`.

- **Pros:** smallest abstraction; each site's data/leaf/assembly logic stays explicit and
  local (matches the codebase's hand-written, readable style); refactor one site at a time,
  behavior-preserving, under existing tests; zero new generic typing to fight.
- **Cons:** the recursion boilerplate (the `for` loop + recurse calls) is still written 4×,
  even if the *decisions* inside it are now centralized.
- **De-dup achieved:** the bug-prone ~80% (dispatch, tabs, block lookup). Leaves the benign
  ~20% (loop scaffolding).

### Option B — generic visitor `walkFields<Scope, R>`

The kernel drives a single recursive walker; callers supply a visitor. `Scope` is the
caller's opaque bundle of parallel data cursors (1/2/3 trees + path) — the walker never
reads data itself, it only asks the visitor to descend.

```ts
interface WalkVisitor<Scope, R> {
  enterObject(scope: Scope, name: string): Scope | null          // group / named tab
  enterList(scope: Scope, s: FieldStructure): ListEntry<Scope>[] | null  // array / blocks
  leaf(field: Field, scope: Scope, path: Path): R | undefined
  assemble(node: ContainerNode<Scope>, children: ChildResult<R>[]): R | undefined
}
function walkFields<Scope, R>(fields: Field[], root: Scope, v: WalkVisitor<Scope, R>): R
```

- Filter → `R = unknown`, `assemble` rebuilds objects/arrays (keeps id/blockType, drops empty).
- Reconcile → `Scope = {source,target}`, `assemble` strips id, target-priority at leaves.
- Collector → `R = void`, `leaf` pushes chunks + mutates; `assemble` is a no-op (accumulates in a closure).
- resolveFieldSubtree → **does not fit** — it is a targeted descent with early-exit, not a
  full-tree fold. Keep it on the kernel (Option A style) via a small `findFieldByPath`.

- **Pros:** removes the recursion boilerplate too; one tested traversal engine.
- **Cons:** 4-method visitor + generic `Scope`/`R` is a real cognitive and typing load; the
  "primary tree drives list iteration, others looked up by index" rule has to be encoded in
  `enterList`; heavier review surface; one of the four still can't use it.

### Option C — leaf generator + `setByPath`

`function* walkLeaves(fields, data): Generator<{ field, path, value }>`, and rebuild via the
existing `setByPath`/`getByPath` utils.

- **Pros:** elegant for collector (just `for…of` + `break`) and navigation.
- **Cons:** **build-tree sites lose container metadata** — `id` (array items) and `blockType`
  (blocks) are not schema fields, so a leaf-only stream can't reconstruct them; reconcile's
  "emit all fields, strip id, pass non-objects through" rule is unreachable. Fails 2 of 4.
  Rejected as a *unifier* (still fine as an internal detail of one site).

## Recommendation

**Adopt the kernel (`classifyField` + `tabScopes` + `resolveBlockFields`) now, and land
Option A.** Rationale:

1. It eliminates the genuinely dangerous duplication — the structural dispatch and block
   lookup — in one well-tested module, which is the actual source of drift risk.
2. It keeps each site's *different* logic (arity, assembly, leaf rules) explicit and local,
   matching how this codebase is written and keeping each refactor a small, behavior-
   preserving, independently-reviewable diff guarded by existing tests.
3. It is **forward-compatible with Option B**: the visitor walker, if we later want to kill
   the loop boilerplate too, is just a function that consumes the same kernel. We are not
   painting ourselves into a corner by starting with A.
4. Option B's full generic visitor is the kind of abstraction we should earn with a second
   concrete need, not front-load — and it still leaves resolveFieldSubtree on the kernel
   anyway.

**Sequencing:** build the kernel + its unit tests → migrate `resolveFieldSubtree` (new,
uncommitted, smallest blast radius) → then `filterLocalizedFields` → `DataReconciler` →
`FieldChunkCollector`, each as its own commit, each leaving the existing test suite green.

## Decision & interface (agreed 2026-06-11)

We chose **one engine** — Option B refined with a `stop` signal so it also absorbs the
exhaustive cases without losing early-exit (call it **B+**). It is the same pattern Payload
itself uses for `traverseFields` (callback + `next()`-skip + return-truthy-stop + a `ref`
data cursor), generalized with the two properties Payload's lacks and we need:
**a multi-tree opaque cursor** (1..n data trees instead of one `ref`) and **block resolution
from inline `field.blocks`** (original, un-sanitized schema).

**Module layout** — one module, `server/shared/field-traversal/`:

| File | Role |
| --- | --- |
| `types.ts` | the contract (`FieldStructure`, `WalkSignal`, `ChildCursor`, `ContainerInfo`, `ChildOutput`, `FieldWalker<Cursor, Out>`, `TabScope`) — pure types, erase to nothing |
| `kernel.ts` | `classifyField` / `tabScopes` / `resolveBlockFields` — the shared structural dispatch |
| `walkFields.ts` | the engine: DFS over the schema, drives `FieldWalker`, assembles containers bottom-up |
| `index.ts` | barrel |
| `*.test.ts` | behavioural specs (vitest) |

Plus a package-level `tsconfig.check.json` (extends `tsconfig.json`, re-includes tests) wired
into the `check-types` script — see "Type-safety" below.

**Leaf typing — `field.name` is not free.** `leaf` must NOT receive the raw `Field` union:
its presentational members (`row`, `collapsible`, `ui`, `tabs`, unnamed `group`) have no
`name`. Even `FieldAffectingData` is insufficient — it includes `TabAsField`, whose `name`
is optional, so `field.name` widens to `string | undefined`. The contract therefore exposes:

```ts
export type LeafField = Exclude<FieldAffectingData, ArrayField | BlocksField | NamedGroupField | TabAsField>
```

The engine resolves the union via the `fieldAffectsData` guard inside `classifyField`, so
`leaf` always gets a `LeafField` with a guaranteed `name`; callers never touch the raw union.

**Why types in `.ts`, not a hand-authored `.d.ts`** (the question that prompted this):
a `.d.ts` is the wrong tool here. (1) Our tests are **behavioural** (vitest imports and
*calls* the module) — a `.d.ts` has no runtime, so the tests can't run. (2) Once the impl
`.ts` lands, the `.ts` shadows a same-named `.d.ts` and the build emits its own `.d.ts`
from it anyway. `.d.ts` stays reserved for *ambient* declarations (`scss.d.ts`,
`vitest-env.d.ts`). The safe equivalent of "interface first" is `types.ts` (compiles to
empty JS) + throwing stubs so the contract type-checks and the red tests import cleanly.

**How the engine subsumes the shapes** (the cursor carries the data; the engine never reads it):

| Caller | `Cursor` | `enterObject` / `enterList` | `leaf` | `combine` |
| --- | --- | --- | --- | --- |
| filter | `{ data }` | descend if value present, else `'skip'` | keep if localized | rebuild object/array, drop empty, keep `id`/`blockType` |
| reconcile | `{ source, target }` | descend if `source` present | `target ?? source` | rebuild, **strip** `id`, keep `blockType` |
| collector | `{ data, source, target, path }` | descend if value present | push chunk + mutate | no-op (`undefined`) |

**Navigation stays on the kernel.** `resolveFieldSubtree` is targeted descent with early-exit,
not a full fold; it gets a small `findFieldByPath` built on `classifyField`, not `walkFields`.
This is the one honest seam in "one engine for all four" — recorded, not hidden.

**Type-safety: tests are now type-checked.** Previously `tsconfig.json` excluded `*.test.ts`,
and vitest runs through esbuild (strips types, no checking) — so type errors in tests went
undetected (it was exactly this gap that hid the `field.name`/`TabAsField` bug above). Fix:
a `tsconfig.check.json` that extends the build config but re-includes tests, wired into
`check-types` (`tsgo --noEmit -p tsconfig.check.json`). The build config (`tsconfig.json`,
used by `build:types`) still excludes tests, so no test `.d.ts` is emitted into `dist`.
Verified: full-package check is 0 errors with tests included.

**TDD state:** `types.ts` + stubs + `kernel.test.ts` + `walkFields.test.ts` (build-tree +
collect shapes) are in. `check-types` (incl. tests) is clean; all 14 tests are red on the
stubs. Implementation turns them green.

## Migration safety — Step 1: characterization tests (done)

Before swapping any implementation, each of the four sites was locked down with
characterization tests for the structural branches a recursion refactor is most likely to
break — added against the CURRENT (un-migrated) code and verified **green**, so they encode
real present behavior, not aspiration. This is the regression net: after each site delegates
to `walkFields`/kernel, its suite must stay 100% green.

| Site | Cases (before → after) | Gaps closed |
| --- | --- | --- |
| `resolveFieldSubtree` | 11 → 15 | path normalization (trim / empty / index-only segments), `group > array > leaf` |
| `filterLocalizedFields` | 25 → 28 | empty blocks dropped, unknown `blockType` dropped, non-object array items dropped |
| `DataReconciler` | 16 → 19 | non-object array items passed through, target array shorter than source, unknown `blockType` passed through verbatim (keeps `id`) |
| `FieldChunkCollector` | 37 → 39 | non-object array items skipped, per-item source/target index fallback when arrays differ in length |
| **Total** | **89 → 101** | |

Note a deliberately-locked asymmetry surfaced while writing these: on an **unknown
`blockType`**, `filterLocalizedFields` and `FieldChunkCollector` **drop** the item, whereas
`DataReconciler` **passes the source item through unchanged (id included)**. The new impl
must preserve this per-site difference — the tests now enforce it.

**Open migration caveat — `filterLocalizedFields` × named tabs.** A review of the engine
surfaced that `filterLocalizedFields` flattens **all** tabs into the parent data scope: it does
not check `tabHasName`, so a *named* tab's fields are read at the parent level rather than nested
under `data[tabName]`. `DataReconciler`, `FieldChunkCollector`, and the new engine instead treat a
named tab as a data boundary. So migrating `filterLocalizedFields` onto `walkFields` would *change*
its named-tab behavior, and the current characterization tests do **not** cover named tabs for this
site. Before migrating it: add a named-tab characterization test to pin today's (flat) behavior,
then decide explicitly whether to preserve it or fix the divergence.

## Migration safety — Step 2: engine implemented (done)

`kernel.ts` (`classifyField` / `tabScopes` / `resolveBlockFields`) and `walkFields.ts` are
implemented; all engine tests (17: 15 kernel + 2 walkFields) are green, `check-types` (incl.
tests) is clean, and the full package suite stays at 658 passing.

- `classifyField`'s dispatch order is the one fragile spot (a field can match several
  predicates; only the order disambiguates). Two junctions matter: the `fieldAffectsData`
  gate runs **before** the group check (so an unnamed group → `transparent`, not a `group`
  with `name: undefined`), and `tabs` is checked **before** the non-data-affecting branch
  (so a `tabs` field, which has no `.fields`, isn't mislabeled `presentational`). A dedicated
  `dispatch order (disambiguation)` test block locks both, and a mutation check (moving the
  group check above the gate) confirms the tests are not vacuous — it reds exactly those two.

- `walkFields` is a thin wrapper over an internal `FieldTreeWalker` **class**. A class (not
  nested functions) because `level`/`object`/`list` are mutually recursive — methods reference
  each other via `this` without tripping `noUseBeforeDefine`. Matches the codebase's
  class style (`DataReconciler`, `FieldChunkCollector`).
- One contract refinement landed while implementing: `TabScope`'s named variant now carries
  the `NamedTab` itself (`{ named: true; tab }`), since the walker must hand that object to
  `enterObject`; unnamed stays `{ named: false; fields }`.
- `classifyField` resolves `fieldAffectsData` first, which is what makes the two `as`
  narrowings sound (unnamed groups are already routed to `transparent`; `TabAsField` never
  reaches the leaf branch).

**Next:** Step 3 — migrate each site to delegate to `walkFields`/kernel, one commit each,
keeping that site's suite 100% green; mind the unknown-`blockType` asymmetry noted above.

## Resolved decisions

- **D1 — A or B?** → **B+** (one engine), per the conversation. A's kernel survives inside B+
  as `kernel.ts`; navigation uses the kernel directly.
- **D2 — kernel location:** → `server/shared/field-traversal/` (new folder). It is structural
  mapping, not a type guard.
- **D3 — array-index path segments:** → owned by the caller via the `Cursor` (the collector
  threads `path` in its cursor), not by the engine. Keeps the engine data-agnostic.
