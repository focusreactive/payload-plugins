# The table that proved itself

Retracts one requirement and one decision of
`2026-11-20-the-host-config-becomes-our-rules.design.md`. It is not one of that design's
build steps; those are all built.

## Requirements / Task restatement

`SUPPORTED_WORLDS` and its two supporting types leave the source tree. The guard they were
meant to be — nothing can quietly become a third kind of world — is rebuilt in the test,
where the compiler maintains it instead of a hand-written list. The design's enumeration
requirement, which that table carried, is recorded as dropped, and the decision that chose
the table as its carrier is recorded as retracted.

- R1 (in) The table, its supporting types and its proof column appear in neither the source tree nor the published package.
- R2 (in) A kind of world that the type allows but no host configuration produces, or a new kind nobody listed, makes a check fail.
- R3 (in) The design states that its enumeration requirement is dropped and its table decision retracted, each with the reason, and its deviations section agrees.
- R4 (out) The rules table the design names for a later step · the four findings left open by the verification run · the wording of the five step contracts · anything in `src/server`.

## What this starts from (measured)

- `SUPPORTED_WORLDS` (`src/core/domain/world/world.ts:15-18`) has exactly one reader, its own
  test. No production code reads it, and the module's entry point
  (`src/core/domain/world/index.ts`) exports only `World` and `resolveWorld`.
- It nevertheless ships: `files` in `package.json` publishes all of `dist` except `*.test.*`
  and source maps, and the table is present in `dist/core/domain/world/world.js`,
  `world.js.map` and `world.d.ts`.
- `World<Read>` (`world.ts:20-29`) is already the enumeration of worlds, and the compiler
  maintains it. The table is a second copy of that list, kept by hand. An identical
  hand-written copy in the same file was removed earlier in this work, when `WorldKind`
  became `World<unknown>["kind"]`.
- The `WORLD_RULES` table the design names for a later step was never built. The write and
  publish subjects landed as ordinary conditionals at `enqueue-translation/handler.ts:60`,
  `translate-document/targetLayer.ts:35` and `auto-translate/AutoTranslate.policy.ts:82`.

### What the table proves today — measured, not argued

A third variant was added to `World` and the suite was run:

- `src/core/domain/world/__tests__/world.test.ts` stayed **green, 21 of 21**. The meta-test
  whose stated job is "lists exactly the worlds the resolver can produce" does not notice a
  new world.
- `check-types` did fail, but at `src/server/features/translate-document/targetLayer.ts:39`,
  because that function narrows on one variant and then reads `autosave`. That is an
  incidental consequence of how one unrelated function is written, not a guard the table
  provides.
- Both proof-column rows name the file that contains the meta-test, so the table proves
  itself. The two checks on that column assert only that the path ends in `.test.ts` and
  exists on disk; any other test file in the package would satisfy them.

The planted variant was reverted and the file confirmed byte-identical to its snapshot.

## Decisions

### D1. The guard moves to a record the compiler maintains

- **Chosen:** in the test, a `Record<WorldKind, true>` naming each kind once, plus one case
  asserting that every kind it names is produced by some host configuration.
- **Why it bites both ways:** a new variant in `World` makes the record miss a key, which is
  a type error; `tsconfig.check.json` includes `src/**/*`, so `check-types` fails. Adding the
  key then turns the runtime case red unless some combination of host switches actually
  produces that kind. Neither half can be satisfied by accident.
- **Rejected — keep the table in the source tree:** it is what this task removes, and the
  measurement above shows it does not catch the case it names.
- **Rejected — no replacement at all:** honest, and the smaller diff, but it gives up a guard
  that now costs one line and that the measurement shows was never really there.
- **Rejected — a `satisfies` clause on the existing switch list:** it constrains the values
  already written and forces no coverage of a kind nobody listed.
- **Constraint cited:** the two pin files in this package already rely on `check-types`
  reading test sources; this uses the same mechanism rather than inventing one.

### D2. `WorldKind` keeps its export

The new record reads it, so it stops being an alias whose only reader is a test and becomes
the term the guard is written in. Inlining `World<unknown>["kind"]` at the use site would
work and would name the concept nowhere.

### D3. The proof column goes with no replacement

A path in a string cannot be checked for saying anything true; pointing the rows at other
files would move the weakness rather than remove it. Which tests demonstrate which behaviour
is a question about the suite, not something a column can answer.

### D4. The design records the retraction rather than quietly dropping it

The enumeration requirement is marked dropped with its reason, the table decision is marked
retracted, and the deviations section stops reading "None" while a stated requirement is
unmet.

**New surface:** none — one type alias inside one test file.
**Shape check:** no trigger fired; nothing is added to a published type or an exported signature.
**Written contract owed:** none.
**Escalate:** no. One source file, one test file, one document.

## Acceptance criteria

| # | Covers | Criterion | How it is checked | Pre-flight |
|---|---|---|---|---|
| AC1 | R1 | `SUPPORTED_WORLDS`, `SupportedWorld`, `ProofPath` and `provedBy` appear nowhere under `src/` | `grep -rn 'SUPPORTED_WORLDS\|SupportedWorld\|ProofPath\|provedBy' src/` returns nothing | **fails now** — 14 occurrences |
| AC2 | R1 | The published package no longer carries the table | `bunx turbo run build --filter=@focus-reactive/payload-plugin-translator`, then `grep -rl SUPPORTED_WORLDS dist/` returns nothing | **fails now** — present in `world.js`, `world.js.map`, `world.d.ts` |
| AC3 | R2 | A third variant added to `World` fails `check-types` **in the test file** | plant the variant, run `bun run check-types`, require an error naming `world.test.ts`, revert and confirm byte-identical | **fails now** — planted today, the only error named `targetLayer.ts:39` and the world test passed 21 of 21 |
| AC4 | R2 | Every kind the type allows is produced by some host configuration | remove one `drafts: false` row from the switch list, run the file, require red; restore | **passes now** — the equivalent assertion already holds, so this is a stays-true criterion |
| AC5 | R3 | The design records the enumeration requirement dropped and the table decision retracted, each with its reason, and the deviations section agrees | read the three sections; `python3 ~/.claude/sp-gates/sp-plan-check.py design <file>` passes | **fails now** — the requirement is listed as covered and the deviations section reads "None" |
| AC6 | R1, R2 | The baselines hold, with the test count changing by exactly the cases removed and added | `bun run check-types` 0 errors · `bunx oxlint .` 26 warnings 0 errors · `bunx vitest run` **3045** passed, 15 skipped · integration from `apps/dev` 278 passed, 2 expected failures, 7 skipped | **passed at 3051** — the table's section contributed 5 cases (1 + 2 + 2) and the replacement adds 1, giving 3047; two further cases were then deleted as tautological (see the decision below), giving 3045 |

The two expected integration failures belong to a probe for a defect a different design
fixes. Their staying red is that probe's own criterion; turning green would be a finding.

## Risk

**Low.** The code removed has no production reader, is not re-exported from the module entry
or the package entry, and is covered by a test this task rewrites. The one reach beyond the
package is the design document.

The real risk is not technical: dropping the enumeration requirement means the design's
stated goal — rules a reader can enumerate in one place — is formally abandoned while those
rules do live in three ordinary conditionals. That is the trade being chosen, and the design
must say so plainly rather than leave a requirement marked covered.

## Decisions by the owner

- 2026-11-20 — the enumeration requirement is dropped rather than built. The list of worlds
  is carried by the `World` union and maintained by the compiler; a second hand-written copy
  contradicts a duplicate removal already made in the same file.

- 2026-11-20 — the two cases named "autosave never moves a collection with drafts" are
  deleted. An audit of the suite proved them tautological: they compare two calls to each
  other, so they are satisfied whenever both answer the same, even when both answer wrongly.
  With the resolver mutated to ignore `drafts` altogether — the exact rule their titles claim
  to guard — they stayed green while four sibling cases, which assert the kind directly for
  all four switch combinations, went red. They cover nothing those four do not.
