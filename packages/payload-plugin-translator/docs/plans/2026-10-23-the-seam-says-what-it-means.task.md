# The seam says what it means

**Status:** built and verified, not committed · **Risk:** low · **Follows:** #198, same branch

## Requirements / Task restatement

Three findings from today's complexity and abstraction audits over the module seam built in #198.
All three are about the same moment — step 9 (#202), when the seam opens and hosts write modules —
and none of them breaks anything today.

1. **`beforeTranslation` returns `BeforeTranslation`, but only two of its seven fields are read.**
   `handler.ts` takes `moduleState` and `sourceChangedByLeaf`; `runChain.ts` deliberately reads
   `scope` from the run's own state; `sourceData`, `target`, `payload` and `previousAttempts` are
   read by nobody. A module that changes the source text — the first plausible thing a host module
   would do — is ignored with no error and no log line. Measured: 7 expressible / 2 honoured.
2. **`ChainMember.name` keys the module's slot in `moduleState` and must be unique.** The docblock
   says so; nothing checks it. Two modules sharing a name share one slot: the second overwrites, and
   the first reads back a value that is not its own.
3. **`TranslationModule` and `TranslationComponent` are re-exported from `src/index.ts` for nobody.**
   Proven twice: a consumer configuring the plugin without naming either compiles, and the package
   compiles without the two exports. `TranslationModule`'s own docblock says "writing your own is
   not supported yet", so publishing it invites what it forbids.

## What already exists — platform · installed · project · verdict

Nothing is invented. Each fix reuses a pattern the package already has:

| Need | What already does it |
|---|---|
| refuse at boot with the answer in the message | `plugin.ts` does this twice already — for `access`, and for missing `modules`/`components` |
| pin a compile-time guarantee | `*.pins.ts` with `@ts-expect-error`; `check-types` reads them, the build and vitest do not. Two exist: `claims.pins.ts`, `accessIsNotOptional.pins.ts` |
| merge a module's contribution | the chain already threads state; only what is threaded changes |

## Decisions

**D1 — `beforeTranslation` returns a contribution, not the state.**

```ts
export type RunContribution = {
  readonly moduleState?: ModuleState;
  readonly sourceChangedByLeaf?: ChangedLeaves;
};
beforeTranslation?(state: BeforeTranslation): Promise<RunContribution>;
```

The chain merges: `moduleState` shallowly by key; `sourceChangedByLeaf` is replaced unless the
contribution leaves it out, so no module can clear it.

*Rejected — have the handler honour the whole returned state.* It cannot: `runChain` deliberately
refuses a module's `scope`, so the type would still lie by one field. Worse, adopting `payload` or
`target` would let a module change which document is being translated half-way through a run. That
makes the type honest by making the behaviour wrong.

*Rejected — two parameters, the frozen run and the accumulating contribution.* Counted against D1 on
the four shape questions and it buys nothing: with the return type narrowed, a module already cannot
change the run, so the second parameter adds a signature change for a guarantee D1 already gives.

*Zero option — do nothing and record it for step 9.* Rejected by the owner, who asked for these
fixed now rather than carried.

**Supersedes D3 of `2026-10-18-the-rewiring.md`,** which reads "The first two take the state and
return it." They take the state and return their contribution. The clause was written when positions
one and two were both planned; position two was never built (D-a of the #198 contract), and the
measured cost of the literal reading is the 5 silently-dropped fields above.

*A second thing D1 buys, not in the finding:* the chain owns the `moduleState` merge, so a module can
no longer **drop** another module's slot by returning a whole `moduleState` object. It can still
overwrite one by name — the merge protects absence, not ownership. Today provenance spreads
`...state.moduleState` by hand to avoid exactly the dropping.

**D2 — module names are checked when the chain is assembled, in `plugin.ts`.**
*Rejected:* keying the chain by name in a `Map`. The chain is ordered and D1 of the rewiring plan
makes list order the execution order; a `Map` would make that order incidental.
*Rejected:* checking inside `runChain`. It runs per translation; a configuration mistake belongs at
boot, where the other two refusals already are.

**D3 — the two types leave `src/index.ts`, and `README.md`'s exports table with them.**
The `modules` / `components` rows of the options table keep naming the types: that table describes
the option's shape, which a reader needs whether or not the name is importable.
*No `DEPRECATIONS.md` entry:* both names were added to `src/index.ts` earlier today, in this same
unmerged change. Nothing shipped with them.

### Placement

| Piece | Lands in | Why there |
|---|---|---|
| `RunContribution`, the narrowed signature | `translation-run/TranslationRun.interface.ts` | beside the two state types it completes |
| the merge | `translation-run/runChain.ts` | the chain is what accumulates |
| the name check | `src/plugin.ts` | next to the two refusals already there |
| the unexport | `src/index.ts`, `README.md` | the published surface |
| the pins | `translation-run/__tests__/seamShape.pins.ts` (new) | the package's idiom for compile-time guarantees |

### New surface — the shape check

Fired: a new exported type (`RunContribution`), and two optional fields on it.

| | `RunContribution` (chosen) | `BeforeTranslation` as the return (today) |
|---|---|---|
| cost of the next field of this kind | 1 place | 1 place |
| states admitted / produced | **4 / 4** | **128 / 4** (7 fields a module may return changed; 2 read) |
| second caller already in the repo | the chain merges it; provenance produces it | — |
| breaks for an implementor outside this repo | nothing: the seam is unexported by D3 | — |

One shape survives. The two rejected alternatives are recorded under D1 with what ruled them out.

### Written contract

`runBeforeTranslation` owes its callers two things the signature cannot state: `moduleState` merges
by key rather than replacing, and a module that fails contributes nothing. Both go in its docblock
and both are pinned by a test.

### Escalate to `/sp-architect`?

No. One seam, four in-repo consumers, no new dependency, no stored data.

## Acceptance Criteria

| AC | Criterion | How it is checked | Passes when |
|---|---|---|---|
| AC1 | A module may return only its contribution, and the chain reads nothing else | `bun run check-types` with `translation-run/__tests__/seamShape.pins.ts`; AC2 covers what the chain reads | both contribution shapes compile — today neither does |
| AC2 | A module that returns only its own note does not wipe a sibling's | new case in `translation-run/__tests__/chainOrder.test.ts` | both keys are present in `moduleState` after the chain |
| AC3 | A module that fails still contributes nothing | `bunx vitest run src/server/modules/translation-run` | the existing failure checks stay green, unweakened |
| AC4 | Two modules with the same name are refused at boot | new case in `src/__tests__/plugin.test.ts` | the thrown message names the duplicated name |
| AC5 | A distinct-name chain still boots | same file | the existing plugin tests stay green |
| AC6 | The two types are not importable from the package entry | `bun run check-types` with the same pins file | `@ts-expect-error` on importing them from `../index.js` is a real error |
| AC7 | Provenance still records what it recorded | `bunx vitest run src/server/modules/provenance src/server/features/translate-document` | green, no assertion weakened |
| AC8 | Nothing else moves | `bunx vitest run` · `bun run check-types` · `bunx oxlint .` · `bunx turbo run build --filter='./packages/payload-plugin-translator'` · `bun run test:integration` from `apps/dev` | 183 files / ≥2443 checks, 0 type errors, ≤44 warnings and 0 errors, build green, 63 integration files green |

## Pre-flight — each check run against the untouched tree

Run against the untouched tree. The pins file was written, run, and parked in the scratchpad so the
tree is not left red at the gate.

| AC | Result on the base | Classification |
|---|---|---|
| AC1, AC6 | **three `@ts-expect-error` directives report "Unused"** — importing both types from the package entry is legal today, and so is returning the whole state | **change** — fails first, for the right reason |
| AC2 | **cannot be written in its final form against the current types**: a contribution-shaped return is `error TS2322: Type '() => Promise<{ sourceChangedByLeaf: {} }>' is not assignable to '(state) => Promise<BeforeTranslation>'`. That type error is its pre-flight failure | **change** |
| AC4 | no such refusal; two same-named modules boot silently | **change** |
| AC3, AC5, AC7 | passing | **invariant** |
| AC8 | 183 files / 2439 checks, 0 type errors, 44 warnings, build green, 63 integration files | **invariant** |

## One correction made while building

**AC1 overclaimed, and the probe said so.** It promised the type would *refuse* a module that
returns the whole run state. TypeScript cannot: a wider object is assignable to a narrower one, and
excess-property checking does not reach a return position. Probed three ways — returning the state
by reference, an object literal with an extra field, and a literal built by spreading the state —
and none is an error.

So the narrowed return **states** the contract rather than enforcing it. That is still worth having:
the signature now names the two things the chain reads instead of promising seven, a module written
against it has no reason to touch anything else, and the merge in AC2 is what actually protects a
sibling's slot. The pins file records the limitation in a comment rather than pretending to pin it.

## Risk notes

**Low.** Everything changed is internal: after D3 nothing about the seam is published, every consumer
is in this repository and compile-checked, and no stored data or access rule is touched.

Two things to watch:

- `chainOrder.test.ts` currently proves threading by having a module return a changed
  `previousAttempts`. That field stops being returnable, so the check must be rewritten to prove the
  same thing through `moduleState` — a rewrite, not a deletion, and the hygiene gate will see it.
- The `moduleState` merge moves from provenance to the chain. If the chain merged by replacement
  instead of by key, a second module would wipe the first's slot and no existing test would see it,
  because there is only one module today. AC2 exists for that.

## Human choices

- **Fix now rather than record for step 9.** The owner's words: "Я не хочу держать это в голове —
  если чиним, то давай сейчас."

## Open, not solved here

- The second deleted test flagged by the hygiene gate — `"returns empty when provenance is
  disabled"` in `staleness.test.ts` — still has no replacement. A symmetric type pin would close it;
  the owner has not decided.
- `previousAttempts` still has no reader (D-f of the #198 contract).

## Review log

### Fresh eyes over the twelve changed files — 2026-10-23

Verdict: the change itself is correct. The merge keeps a sibling's slot on every path, the name
check runs on the fully assembled chain and nothing else builds one, and provenance writes and reads
what it wrote and read before. The defects were all in what the tests prove, and three of them were
confirmed by mutation before being fixed.

| Found | Proof it was real | Done |
|---|---|---|
| Nothing covered the `?? state.sourceChangedByLeaf` fallback. A later module contributing only a note would wipe the leaf-change map at step 9 | dropped the fallback; **all 2443 checks passed** | new case in `chainOrder.test.ts`, reddens alone |
| Nothing covered a failure *between* two contributing modules. Resetting to the run's opening state on a failure would wipe an earlier module's slot | `: carried` → `: state`; **all 2443 checks passed** | new case in `moduleFailure.test.ts`, reddens alone |
| `@ts-expect-error` on the two unexport pins is satisfied by "cannot find module", so a path that stops resolving would hide a re-export | broke the path; **`check-types` reported 0 errors** | positive control on `TargetSelectionMode`, verified to redden the broken path |
| Nothing pinned that the check sees the *built-in* module names. Moving it above the chain assembly would let a host module take `"provenance"` | `refuseDuplicateNames(modules)`; the new case was the only one that reddened | new case in `plugin.test.ts` |
| The replacement for the old threading check duplicated `"carries one module's note through to the next"` | no mutation reddens it alone — only alongside two others | removed; the surviving case is the one that discriminates |
| `moduleFailure.test.ts` still returned the whole state from a module | — | returns `{}` |
| The merge rule sat on the private helper, not on the exported function the contract names | — | moved onto `runBeforeTranslation` |

Two overclaims in this document, corrected above: D1 said a module can no longer **overwrite**
another's slot (the merge protects against **dropping** one, not against overwriting it by name),
and said `sourceChangedByLeaf` merges by replacement (it is replaced only when the contribution
carries one, so no module can clear it).

Final state: **183 files / 2445 checks**, 0 type errors, 44 lint warnings and 0 errors, build green,
`apps/cms` and `apps/dev` type-check clean, integration **63 files, 236 passed / 8 skipped**.
