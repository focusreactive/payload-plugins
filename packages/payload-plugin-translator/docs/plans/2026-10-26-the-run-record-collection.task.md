Build step: ./2026-10-26-the-plugin-keeps-its-own-record.design.md #1

# Step 1 — the run record collection

## Requirements / Task restatement

Register `translator-runs`, the collection that will hold the plugin's own record of translation
runs, together with the store that reads and writes it, the guard that refuses a colliding slug, and
the cascade that removes a document's rows when the document is deleted.

**Nothing reads or writes it in this step.** Writing is step 2, reading is step 3. This is a pure
addition: the only change to existing code is the plugin registering three config modifiers.

Covers R1 of the design.

## What already exists — platform · installed · project · verdict

- **Platform.** Payload 3.90.1 supports collection-level compound indexes, including `unique`
  (`collections/config/types.d.ts:565-573`). Used for the upsert key rather than hand-rolled.
- **Installed.** Nothing new is added.
- **Project.** `src/server/modules/provenance/` is the one precedent for a plugin-owned collection,
  and every piece of this step has a counterpart there: `Provenance.collection.ts`,
  `Provenance.store.ts` (upsert by key with a race retry), `slugGuard.ts`,
  `ProvenanceCleanup.hook.ts`, `Provenance.wiring.ts`.
- **Verdict.** Nothing new is designed. The shape is copied from provenance; the differences are
  recorded below as decisions.

## Decisions

**D1 — registered directly, not as a `TranslationModule`.**
Chosen: `plugin.ts` adds the three config modifiers through the builder, beside `runnerConfigModifier`.
Lost: wrapping it in a module for symmetry with provenance. Provenance is a member of the translation
chain because it *participates* in a translation — it records a receipt. The run record does not: in
this step it contributes only config modifiers, and in step 2 the write happens inside `report` in
`wireTranslateRunner`, not in a chain member. A module would add a `setup`, a name and a
`refuseDuplicateNames` entry for three calls.

**D2 — the slug is configurable: `runs?: { slug?: string }`.**
Chosen: an option mirroring `provenance?: boolean | { slug?: string }`, defaulting to
`translator-runs`. Lost: a fixed slug. The collection is **mandatory**, so a collision is a fatal
config-time error with no way out; a host that already owns `translator-runs` could not install the
plugin at all. Provenance carries the option for exactly this reason. Confirmed by the owner at the
gate.

**D3 — no port in `core/` yet.**
Chosen: a concrete `PayloadRunRecordStore`. Lost: a port in `core/domain/runs/` mirroring
`ProvenanceStore`. Provenance has a port because `core` code consumes it; here the second caller
arrives in step 4, when the run policy moves into `core/`. Until then a port would be an abstraction
with one caller, which the project's own rules forbid.

**D4 — honest field types, `checkbox` and `number`.**
Chosen: `publishOnTranslation` as `checkbox`, `attempts` as `number`. Lost: text for both, matching
`Provenance.collection.ts`'s self-imposed "only `text`/`date`". That rule is provenance's own choice,
not an adapter limit: the repository already uses `checkbox` 17 times and `number` 26 times across
the same three adapters.

**New surface.** One published option, `runs?: { slug?: string }`. The shape check fired on two
triggers — a field added to a published type, and the field being optional. Two shapes were weighed:
the nested `runs?: { slug?: string }` and a flat `runsSlug?: string`. The nested one was chosen: it
matches the neighbouring `provenance` option, and a second setting for this collection costs a key
rather than another top-level field.

**Written contract.** `upsert` owes callers something its signature cannot state: it is idempotent on
`(handle, targetLng)`, and it survives losing the unique-index race by finding the winner and
updating it. That is what AC5 and AC6 pin.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R1 | Booting the plugin registers a collection whose slug is `translator-runs` | `bunx vitest run src/server/modules/runs/__tests__/registration.test.ts -t "registers"` | exit 0, the case runs |
| AC2 | R1 | `runs: { slug: "x" }` registers it under `x` instead | same file, `-t "honours the configured slug"` | exit 0, the case runs |
| AC3 | R1 | The collection refuses read, create, update and delete, and is hidden in the admin | same file, `-t "closed to everyone"` | exit 0, the case runs |
| AC4 | R1 | A slug already taken by a host collection throws `TranslatorConfigError` at config time, naming the option | same file, `-t "collides"` | exit 0, the case runs |
| AC5 | R1 | Two upserts for one `(handle, targetLng)` leave one row, with the second's values | `apps/dev`: `bunx vitest run -c vitest.integration.config.ts src/integration/translator/run-record.int.test.ts -t "once"` | exit 0, the case runs |
| AC6 | R1 | When `create` throws because another writer won the unique index, `upsert` finds the winner and updates it | `bunx vitest run src/server/modules/runs/__tests__/store.test.ts -t "race"` | exit 0, the case runs |
| AC7 | R1 | Deleting a managed document deletes that document's run rows | `apps/dev` integration, `-t "deleting the document"` | exit 0, the case runs |
| AC8 | R1 | Deleting a document of a collection the plugin does not manage deletes no run rows | same file, `-t "unmanaged"` | exit 0, the case runs |
| AC9 | — | No new type errors | `bun run check-types` | 0 errors |
| AC10 | — | The package suite stays green and grows | `bunx vitest run` | ≥ 2620 passing, 0 failing |
| AC11 | — | No new lint findings | `bunx oxlint .` | 43 warnings, 0 errors |
| AC12 | — | Integration suites unchanged | `apps/dev`: `bun run test:integration` | ≥ 229 passing, 0 failing |
| AC13 | R1 | A fresh SQLite database reaches the new table through the dev app's migrations, not only through `push` | `apps/dev`: `DB_ADAPTER=sqlite … payload migrate` against an empty file, then the table exists | the migration applies and the table is present |
| AC14 | R1 | The same migration applies on PostgreSQL | `apps/dev`: `DB_ADAPTER=postgres bun run payload migrate` | applies cleanly — **needs the Docker service**; `not-verified` if it cannot be started |

## Pre-flight

Run against the untouched tree on 2026-10-26.

| AC | Command | Result | Kind |
|---|---|---|---|
| AC1 | a throwaway probe booting the plugin and listing `config.collections` | **FAIL** — `expected [ 'posts' ] to include 'translator-runs'` | change |
| AC2–AC8, AC13 | — | not run: their subject does not exist yet; AC1's probe stands for the whole group, since all of them presuppose the collection | change |
| AC9 | `bun run check-types` | **PASS** — 0 errors | invariant |
| AC10 | `bunx vitest run` | **PASS** — 2620 passing | invariant |
| AC11 | `bunx oxlint .` | **PASS** — 43 warnings, 0 errors | invariant |
| AC12 | `bun run test:integration` | **PASS** — 229 passing, 8 skipped (measured earlier today) | invariant |
| AC14 | both suites, on the containers started for this run | **PASS** — Postgres 235 passing / 2 skipped; Mongo 228 passing / 9 skipped | invariant |

### Baselines captured before any edit

| Adapter | Passing | Skipped |
|---|---|---|
| SQLite (default) | 229 | 8 |
| PostgreSQL | 235 | 2 |
| MongoDB | 228 | 9 |

The counts differ by adapter because suites skip themselves where a capability is absent; each is its
own baseline, and Phase 5 compares like with like.

## Risk notes

- **The schema is the expensive part.** Code here is small and isolated, but a field wrong in step 1
  costs a second migration later. The field list comes from the design's "The table" section, which
  was derived from what `alreadyCovered` and `pickHost` actually compare.
- **A mandatory collection is a schema change for every host**, including those who never enabled
  provenance. That is why D2 gives them a slug to move to.
- **The cascade must not roll back the host's delete.** Provenance deletes outside the caller's
  transaction for exactly this reason (`Provenance.store.ts:141-150`); the same rule applies here,
  and it is the opposite of the write rule that arrives in step 2.

## Human choices

- 2026-10-26 — *"В этом этапе"*: the `apps/dev` migration lands in this step rather than once at the
  end, so PostgreSQL and MongoDB are exercised before the shape is built on.
- 2026-10-26 — *"Настраиваемый"*: the collection slug is configurable, accepting one new published
  option.

## Review log

### Verification — 2026-10-26

| AC | Result |
|---|---|
| AC1–AC4 | PASS — `src/server/modules/runs/__tests__/registration.test.ts`, 8 checks |
| AC5 | PASS, **restated** — see below |
| AC6 | PASS — `__tests__/store.test.ts`, proved by mutation M4 (lost race) |
| AC7, AC8 | PASS — `apps/dev` `run-record.int.test.ts`, on all three adapters |
| AC9 | PASS — `check-types` 0 errors; `turbo check-types` 9/9; `turbo build` (real `tsc`) clean |
| AC10 | PASS — 2646 passing / 0 failing (baseline 2620) |
| AC11 | PASS — 43 warnings, 0 errors |
| AC12 | PASS — SQLite 235/8, PostgreSQL 241/2, MongoDB 233/10 |
| AC13 | PASS — fresh SQLite file → `payload migrate` → `translator_runs` with `handle_targetLng_idx` UNIQUE |
| AC14 | **not applicable as written** — see below |

Mutations, all restored: the store's five (always-create · handle alone · swallow a non-race
failure · drop the caller's transaction · join it on the cascade), the registration's five (never
add the collection · ignore the configured slug · drop the collision guard · hook every collection ·
open the record for reading), and two across the real database (drop the unique index · never
register the cascade). Each reddened its own checks and nothing else.

### Deviations from the contract

- **AC5 restated.** The criterion asked for two *upserts*, but `PayloadRunRecordStore` is internal to
  the package and `apps/dev` consumes only the published surface, so the integration spec cannot
  drive it. The two halves are split instead: the database refusing a second `(handle, targetLng)`
  is the integration check, and `upsert` choosing update-over-create is AC6's unit check. Together
  they cover what AC5 asked; neither alone does.
- **AC14 does not apply.** The dev app's committed migrations import `@payloadcms/db-sqlite` and
  carry SQLite DDL, so there is no "same migration" to run on PostgreSQL — that adapter reaches the
  schema through `push`. Verified that way instead: the full suite on PostgreSQL, 241 passing.
- **The generated migration was narrowed by hand.** `payload migrate:create` produced 16 `CREATE
  TABLE` statements, of which one was `translator_runs`; the other 15 are pre-existing drift between
  the dev app's config and its committed migrations (playground version tables). Shipping them under
  a name that says `create_translator_runs` would have hidden an unrelated schema catch-up inside
  this step, so the file keeps only the run record's statements. The adapter's `.json` snapshot was
  dropped with them, because a snapshot describing tables the migrations do not create is worse than
  none. **The drift itself is untouched and still owed.**

### Found along the way

- **MongoDB enforces the key only once the background index build finishes.** Measured on a fresh
  database: immediately after the collection's first write only `_id` and `createdAt` are indexed;
  the compound unique key appears about three seconds later. A duplicate written in that window is
  accepted. The integration check is skipped on MongoDB for that reason (`KEY_IS_ENFORCED_AT_ONCE`),
  and the design's "on the unique-index race, re-find and update" has no race to lose there — on a
  brand-new database two concurrent writers can both create a row. Narrow (one collection, once per
  database) but real, and it belongs in step 2's write rule rather than here.
- **Three provenance checks were counting the wrong thing.** `plugin.test.ts` asserted provenance's
  cleanup hook by the length of `afterDelete`, which a second injector breaks. They now count by the
  marker, matching the file's own `markedAfterChange`.
- **`bootTestPayload` had no unmanaged collection.** Every collection it registered was also handed
  to the plugin, so "a collection the plugin does not translate" was unobservable. Added
  `unmanagedCollections`, which AC8 needs.
