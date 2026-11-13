# The engine stands alone

Part of the next major (#192). A step towards #203, which it does not close: #203 asks for the
traversal engine in a package of its own, published. This task gives it everything a package would
give except the npm name — its own place in the tree and a boundary that fails at edit time — and
leaves the published surface untouched.

## Task restatement

The traversal engine lives at `src/core/traversal/`. It is the one part of this package that
depends on nothing: no library, no framework, not even the plugin's own shared code. That property
is what makes it liftable later, and today nothing holds it.

Move it to `src/traversal/` and hold its boundary in both directions:

- nothing inside the engine may import anything above its own folder;
- nothing outside the engine may import its internals — only `traversal/index.js`.

No entry is added to `exports` and no name is added to `src/index.ts`: the contract stays internal,
so the address-token type and the entry-context type remain free to change without a major. The
build (`swc` + `tsc --emitDeclarationOnly`) is not touched and no package is added under
`packages/`.

## Why now, and what is actually broken

The engine's existing guard, `depends-on-nothing.test.ts`, rejects only *non-relative* specifiers.
A relative reach out of the engine passes it. Measured on the untouched tree: a file added at
`src/core/traversal/__probe.ts` importing `../domain/content-projection/idPath.js` left that suite
at **16 passed** and `oxlint` at **0 errors**. The surrounding `src/core` lint zone is weaker still
— it bans Payload, React and Next, and would let any sibling of the plugin through.

So the engine is depended-on-nothing by habit, not by rule.

## What already exists

- **Platform / installed** — `oxlint` (1.64.0, via Ultracite 7) implements `no-restricted-imports`
  with gitignore-style `group` patterns, negation included. Verified on this version rather than
  recalled: a probe config with `group: ["**/traversal/**", "!**/traversal/index.js"]` flagged
  `../traversal/contract.js` and `../traversal/errors/index.js`, passed `../traversal/index.js`,
  and did **not** flag `../kernel/field-traversal/index.js` — the near-miss that would otherwise
  have silently restricted twenty unrelated files.
- **Project** — the repository already pairs the two mechanisms this task needs. `oxlint.config.ts`
  carries zone T1 for `src/core/**` and names `src/core/__tests__/no-payload-boundary.test.ts` as
  its "cheap in-repo backstop", with the lint making the same boundary "fail at edit time too".
  Zone T2 exempts `src/core/**/*.test.ts`. Both precedents are reused rather than reinvented.
- **Verdict** — nothing new is built. One folder moves, one lint zone is added, one existing scan
  test is tightened.

## Decisions

### D1 — The engine moves to `src/traversal/`, out of `src/core/`

**Chosen:** `src/core/traversal/` → `src/traversal/`.

**Rejected: leave it where it is and add the lint zone there.** Strictly cheaper — no import
rewrites, and the path citations in `docs/plans/` records stay accurate. It loses on a mechanism
this repository has already been bitten by: `oxlint.config.ts` records that for a matching file the
*last* override wins and `no-restricted-imports` options **replace** rather than merge, and that
under exactly this layering the analytics GA4-isolation rule "was silently shadowed by the test-seam
block and never actually enforced". Leaving the engine inside `src/core/**` nests the new zone
inside T1 and recreates that shape. At `src/traversal/**` the two zones are disjoint.

**Cost accepted:** 35 files change an import path (counted, all mechanical). Records under
`docs/plans/` keep citing `src/core/traversal/...`; they are records of work done at the time and
are not rewritten.

### D2 — The boundary is held by the lint zone *and* the scan test, not either alone

**Chosen:** both, one direction each where it is exact.

- `oxlint.config.ts` — outside the engine, only `**/traversal/index.js` may be imported; inside the
  engine, nothing above its own folder (`../**` at the engine root, `../../**` one level down).
- `depends-on-nothing.test.ts` — extended to resolve every relative specifier and assert the result
  stays inside the engine folder.

**Rejected: lint alone.** The escape half has to be written per directory depth, so it is exact for
the two depths that exist today and silently absent for a third. The test, resolving paths, has no
such hole.

**Corrected during review.** The first version of the zone wrote *both* bans per depth, which left
every engine file two or more directories down with no framework ban at all — `*` does not cross
`/` in these globs, so `src/traversal/*.ts` and `src/traversal/*/*.ts` between them cover only the
root and one level. Probed: a file at `src/traversal/deep/deeper/` importing `payload` drew 0
errors. The framework ban does not depend on depth and is now written once, for
`src/traversal/**/*.ts`; only the "nothing above your own folder" ban stays depth-shaped, because
that is the one a glob genuinely cannot state. The same probe now draws the error, and the scan
test names the file for the relative escape.

**Rejected: the test alone.** It loses on feedback time, for the reason this repository already
states about the payload boundary: the scan is the backstop, the lint makes it fail while editing.

**Constraint cited:** the probe run above, and the existing payload-boundary pairing.

### D3 — Test files are exempt from the barrel-only rule

**Chosen:** `*.test.ts` may reach into the engine's internals.

Ten language test files import `sentTextOf` / `sentTextsOf` from the engine's own
`__tests__/fixtures/sentText.ts`.

**Rejected: move that fixture to a neutral folder.** It is the engine's own helper for reading what
a walk collected, and the engine's fixtures are its coverage rather than examples — relocating them
thins the suite that proves the contract is host-neutral. Zone T2 already exempts
`src/core/**/*.test.ts` for the same kind of reason.

### D4 — The guard on reaching into the languages covers both zones

**Chosen:** the file moves to `src/__tests__/imports-into-languages.test.ts` and scans two roots,
`src/core` and `src/traversal`.

It derives its root from its own location, so carried along inside the moved engine that root
becomes `src/` — it would scan the whole package and fail on `plugin.ts`, which imports a language
as a value by design. A root had to be chosen either way.

**Amended during the build.** The first answer was "it belongs to `src/core`, so it moves to
`src/core/__tests__/`". That was wrong on a fact not known when it was written: four of the
engine's own fixtures — `lexical`, `payloadFields`, `prosemirror`, `storyblok` — name
`EmbedResolver` / `EmbedIdentity` from `languages/embedCrossing.js`. All four are `import type`, so
the rule holds; but scoping the guard to `src/core` would have stopped checking that it keeps
holding, on the exact files whose job is to prove the engine can model a second host. The rule is
one rule over two host-neutral zones, so it is written that way.

**Rejected: keep it in the engine with the core path hard-coded.** The file would then live in a
folder it does not describe, and would still cover only one of the two zones.

### D6 — Three scan guards get the engine's new path, because the move moved it out of their reach

Three suites enumerate files and assert something about each. All three derived their roots from
`src/core`, so the move silently took the engine out of all three — a loss that shows up as a test
*count*, not as a failure.

| Guard | Lost | Restored by |
|---|---|---|
| `no-payload-boundary.test.ts` | 23 files: the engine's 14 shipped files and 9 test-support files | a second zone root |
| `every-throw-is-a-translator-error.test.ts` | the engine's throws — 14 checks | `"traversal"` added to its roots |
| `imports-into-languages.test.ts` | the engine's reach into the languages | D4 above |

For the engine's *shipped* files `no-payload-boundary` is now redundant — `depends-on-nothing`
rejects every non-relative specifier, which includes Payload. It is kept for the engine's **test**
files, which that scan skips and which would otherwise have no guard at all.

**Rejected: accept the drop and rely on `depends-on-nothing`.** It would have left the engine's
fixtures free to import Payload, which is the one thing that would end their value as a model of a
second host.

### D5 — No public surface moves

`src/index.ts`, `src/testing/index.ts` and `package.json` contain no reference to the engine
(checked). Nothing is added. Recorded so Phase 5 can check it stayed that way.

**New surface:** none. The shape check did not fire — no field, parameter, option or published type
is added.

**Escalate:** no. The destination was already decided by #203; this is a smaller step towards it and
introduces no seam the package does not already have.

## Acceptance Criteria

| AC | Criterion | How it is checked | Passes when |
|---|---|---|---|
| AC1 | The engine sits at `src/traversal/` and nothing remains at the old path | `test -d src/traversal && test ! -e src/core/traversal` | exit 0 |
| AC2 | An import of an engine internal from outside is rejected | plant `import type { Crossing } from "../../../traversal/contract.js"` in `src/server/features/translate-document/selectLeaves.ts`, run `bunx oxlint packages/payload-plugin-translator`, revert | at least one `no-restricted-imports` error naming that line |
| AC3 | An import of the barrel from outside is accepted | the same run, over the unmodified tree | no `no-restricted-imports` error on any `traversal/index.js` import |
| AC4 | A reach out of the engine is rejected by the lint | plant `import type { IdPath } from "../core/domain/content-projection/idPath.js"` in `src/traversal/collect.ts`, run `bunx oxlint packages/payload-plugin-translator`, revert | at least one `no-restricted-imports` error naming that line |
| AC5 | A reach out of the engine is rejected by the scan test | the same plant, `bunx vitest run src/traversal/__tests__/depends-on-nothing.test.ts`, revert | the suite is red, and names the planted file |
| AC5b | The engine's bans reach a file nested below the depths named in the zones | plant `src/traversal/deep/deeper/probe.ts` importing `payload` and `../../../core/domain/content-projection/idPath.js`; run `bunx oxlint` and `depends-on-nothing.test.ts`; delete it | lint errors on the framework import, the scan names `deep/deeper/probe.ts` |
| AC6 | `field-traversal` imports are not caught by the new patterns | `bunx oxlint packages/payload-plugin-translator` | 0 errors, at most 33 warnings |
| AC7 | The reach-into-languages guard still has something to scan, and covers both host-neutral zones | `bunx vitest run src/__tests__/imports-into-languages.test.ts` | exit 0, and its "reaches at all" case passes |
| AC7b | No scan guard lost the engine when it moved | `bunx vitest run src/core/__tests__ src/traversal/__tests__/depends-on-nothing.test.ts src/__tests__/imports-into-languages.test.ts` | 385 tests, matching the base commit |
| AC8 | No new type errors | `bun run check-types` | exit 0 |
| AC9 | Behaviour is unchanged | `bunx vitest run` | 222 files, 2616 passed, 9 skipped |
| AC10 | The engine's own suite is intact | `bunx vitest run src/traversal` plus `src/__tests__/imports-into-languages.test.ts` | 78 + 3 = 81 passed, the baseline's count. The split is D4's: the guard on reaching into the languages left the engine folder, so the engine alone now reads 22 files / 78 tests |
| AC11 | The published surface is untouched | `git diff -- src/index.ts src/testing/index.ts package.json` | empty |
| AC12 | The package still builds, and the built tree follows the move | `bun run build`, then `test -d dist/traversal && test ! -e dist/core/traversal` | build exit 0, both path checks exit 0 |
| AC13 | A real Payload boot against `dist` still works | from `apps/dev`, `bun run test:integration:sqlite` | 62 files passed, 248 passed, 7 skipped |

## Pre-flight

Every check below was run against the untouched tree on 2026-11-13.

| AC | Command | Result on the untouched tree | Class |
|---|---|---|---|
| AC1 | `test -d src/traversal` | fails — the engine is at `src/core/traversal` | change |
| AC2 | plant + `bunx oxlint` | 0 errors — no rule exists to fire | change |
| AC3 | `bunx oxlint` | 0 errors | invariant |
| AC4 | plant `../domain/...` in the engine + `bunx oxlint` | 0 warnings, 0 errors over 47 files | change |
| AC5 | the same plant + `depends-on-nothing.test.ts` | 16 passed — the escape goes unnoticed | change |
| AC5b | the depth-2 plant + `bunx oxlint` | 0 warnings, 0 errors over 46 files — nothing fires | change |
| AC6 | `bunx oxlint packages/payload-plugin-translator` | 33 warnings, 0 errors | invariant |
| AC7 | `bunx vitest run src/core/traversal/__tests__/imports-into-languages.test.ts` | exit 0 (at its present path) | invariant |
| AC7b | the four scanning suites, on a worktree at the base commit `c016d8ae` | 385 tests (15 + 98 + 3 + 269) | invariant |
| AC8 | `bun run check-types` | exit 0 | invariant |
| AC9 | `bunx vitest run` | 222 files, 2616 passed, 9 skipped | invariant |
| AC10 | `bunx vitest run src/core/traversal` | 23 files, 81 passed (at its present path) | invariant |
| AC11 | `git diff -- src/index.ts src/testing/index.ts package.json` | empty | invariant |
| AC12 | `bun run build`; `test -d dist/traversal` | build exit 0; `dist/core/traversal` exists, `dist/traversal` absent | change |
| AC13 | from `apps/dev`, `bun run test:integration:sqlite` | 62 files passed, 4 skipped; 248 passed, 7 skipped | invariant |

## Risk notes

- **The wide radius is mechanical and compiler-checked.** 35 files change an import path; every one
  of them is a type or value the checker resolves, so a wrong path cannot survive `check-types`.
- **The real risk is a lint pattern that is quietly wrong** — one that also matches
  `kernel/field-traversal`, or that stops matching after a rename and leaves the boundary open
  while reporting success. AC2, AC4 and AC5 plant a violation in each direction rather than trusting
  a clean run, and AC6 pins the near-miss.
- **Records go stale.** Several `docs/plans/*.md` cite `src/core/traversal/...` in their own
  acceptance criteria. They are records of completed work and are left as they are.
- **The depth-shaped half of the lint rule** covers the engine's root and one nested level, which is
  what exists. A third level would need a line; the scan test covers it meanwhile, which is why D2
  keeps both.
