# Task contract — run the translator integration suite on all three DB adapters

Prerequisite for [#108](https://github.com/focusreactive/payload-plugins/issues/108), shipped separately so that fix's diff stays about the fix.

**Risk: LOW.** Test harness only; no plugin source is touched, and the default adapter's behaviour is unchanged.

## Design decisions

**D1 — the adapter resolver lives beside the app's, not in the harness.**
`resolveTestDbAdapter()` is added to `src/lib/database/resolveAdapter.ts`, next to the existing
`resolveDbAdapter()`. Rejected: resolving inline in `bootTestPayload`. The connection defaults and the
`DB_ADAPTER` vocabulary are already stated once in that file and documented in
`docs/multi-db-verification.md`; a second copy in the test tree would drift from it.

**D1b — tests get their own Postgres database, not a schema inside the app's.**
Payload documents `schemaName` as experimental and working *"only when there are not other tables or
enums of the same name in the database under a different schema"* — and the test collections collide
with the dev app's by construction. A schema inside `payload` is green only while `public` is empty;
it would start failing for anyone who had run `DB_ADAPTER=postgres bun run dev`. `POSTGRES_TEST_URL`
defaults to `…/payload_test`, which Postgres creates on first connect. Symmetric with `MONGO_TEST_SERVER`.

**D2 — isolation is a namespace per boot, not a shared database with a wipe.**
Each boot gets a Postgres **schema** / Mongo **database** named by a random run id, dropped by
`cleanup()`. Rejected: one shared database wiped between files — a wipe has to enumerate collections
to be correct, and gets it wrong the moment a spec adds a fixture collection. A namespace needs no
such knowledge. SQLite keeps its throwaway file: it already has this property for free.

**D3 — the drop runs before the connection closes, and logs on failure.**
Rejected: silent best-effort, matching the existing `destroy()` call below it. One leaked namespace
per boot is invisible until the server is full of them, and the twelve spec files each boot once.

**D4 — `MONGO_TEST_SERVER`, not `MONGO_URL`.**
The app's `MONGO_URL` carries a database name; appending a run id to it addresses a collection, not a
database. A separate server-only variable makes that unambiguous.

**D5 — one function returning the adapter paired with its teardown, not two that switch separately.**
`createTestDatabase(sqliteFile)` returns `{ db, drop }`, `drop` closing over the namespace name.
Rejected: a `resolve` / `drop` pair taking the id as a parameter — it switched on `DB_ADAPTER` twice,
so a branch could create a namespace with no matching teardown and leak silently, and its
`(runId, sqliteFile)` signature took two strings positionally, which a caller can swap without the
compiler noticing.

**New surface:** `createTestDatabase`. One caller, `bootTestPayload` — which uses both halves of what
it returns, so the pairing is what earns it rather than the count.

**Written contract owed:** none. Both functions are named for what they do and take no ambiguous
same-typed parameters.

**Escalate:** no.

## Acceptance criteria

1. **SQLite is unchanged.** `bun run test:integration` with no `DB_ADAPTER` set passes 70/70, as before.
2. **MongoDB passes.** `bun run test:integration:mongo` passes 70/70.
3. **Postgres passes except the known defect.** `bun run test:integration:postgres` fails exactly the three auto-translate cases of #124 and passes the other 67.
4. **No namespace is leaked on Postgres**, and on Mongo at most the one documented below: a full run leaves exactly one ~12 KB database, recreated after teardown by a late write from `auto-translate-unknown-locale.int.test.ts`. Bisected spec by spec; every other spec leaves nothing.
5. **`src/payload-types.ts` is untouched** after a run on every adapter.
6. **Per-adapter scripts exist**, named after the established `verify:provenance:*` pair.
7. **`docs/multi-db-verification.md` documents** the run, the isolation scheme, the measured cost, and the known Postgres failures.
8. **Checks clean:** `check-types` for both packages, plugin unit tests, lint at no worse than the repo baseline.

## Measured

| adapter | suite | wall time |
|---|---|---|
| sqlite | 70/70 | 26 s |
| postgres | 67/70 (#124) | 30 s |
| mongo | 70/70 | 28 s |

Per-boot schema creation on Postgres costs nothing measurable against the fixed fork-and-boot overhead — the concern that motivated measuring it did not materialise.

## Human choices

- **Run this before #108, as its own PR.** The user's call: mixing harness work into the fix would make the fix's diff mostly infrastructure.
- **Do not paper over the Postgres failures.** They are a real plugin defect (#124), found by this harness on its first run. Setting `transactionOptions: false` would turn the suite green and hide it; the suite reports it instead.

## Risks

- The harness now depends on Docker services for two of three adapters. SQLite — the default, and what everyone runs by habit — needs nothing, so the default path is unaffected.
- A namespace is leaked if the process is killed between boot and `cleanup()`. Run ids are random, so leaks accumulate rather than collide; the doc says where to look.

## Review log

**2026-09-04 — comment audit.** 23 comment lines over 51 of code (4.5 per 10) judged too dense.
Deleted or shortened 7, kept 2 with reasons (the `dropTestNamespace` contract; the loud `console.warn`
that deliberately differs from the silent `destroy()` below it). Three MISSING entries closed: a bare
`.slice(0, 20)`, an unexplained structural cast, and a connection default written twice. The stranded
pre-existing docblock on `bootTestPayload` — which still claimed isolation came from a SQLite file —
was rewritten; the diff had made it false.

**2026-09-04 — reuse and simplification.** No prior art to reuse: this is the repo's only multi-adapter
resolver and the first namespace drop. Three outright defects found and fixed — `test:integration:all`
chained with `&&` so Postgres, knowingly red, stopped the run before Mongo ever executed; `drizzle-orm`
was imported but declared in no `package.json`, resolving only through the hoisted linker; and the doc
pointed `docker compose up -d` at the repo root when the compose file lives in `apps/dev`.

**2026-09-04 — altitude.** Confirmed per-boot teardown is the right depth and `globalSetup` would be
wrong. Two findings taken: the `schemaName` experimental caveat (D1b above) and Payload's own
`dropDatabase()` recreating the schema, now noted in code so nobody "simplifies" to it. One deferred
with reasoning: a sweep of stale namespaces at run *start*, which would also cover a boot that throws
before `cleanup()` exists and a killed process. Deferred because D1b moves the leftovers into a
dedicated database where they are inert, and because it is new machinery the user has not seen.
