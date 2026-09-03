# Cross-DB verification (SQLite · Postgres · MongoDB)

The dev app can run against any of the three Payload DB adapters so plugin behaviour — notably
translation **provenance** (#47) — can be checked on each. The adapter is chosen at runtime by the
`DB_ADAPTER` env var; everything else (collections, plugins, seed) is shared and DB-agnostic because it
goes through the Payload local API.

## How it's wired

- `src/lib/database/resolveAdapter.ts` — `resolveDbAdapter()` returns the adapter for `DB_ADAPTER`
  (`sqlite` default | `postgres` | `mongo`). SQL adapters use **push** (auto-sync schema) so a fresh DB
  comes up ready with no migration step; `PAYLOAD_DB_PUSH=false` disables it. Mongo needs no push.
- `docker-compose.yml` — Postgres (host `:5434`) + MongoDB (`:27017`) servers only; the app runs on the host.
- Connection defaults (overridable via env): `POSTGRES_URL`, `MONGO_URL`, `DATABASE_URL` (SQLite).

## Verify provenance on all three

```bash
docker compose up -d              # start Postgres + Mongo
bun run verify:provenance:all     # sqlite → postgres → mongo, in turn
# or one at a time:
bun run verify:provenance:postgres
```

`scripts/verify-provenance.ts` boots Payload against the active adapter and asserts, via the local API
(no OpenAI call): the sidecar collection exists, `dismissedFingerprint: null` round-trips, the composite
key `(collectionSlug, documentId, targetLocale)` is unique, and `deleteByDocument` (the query the
`afterDelete` hook runs) clears a document's rows across all locales. The SQLite run uses a throwaway
`.verify-sqlite.db` (push-created, gitignored) so it never touches your working `dev.db`.

Two adapter-specific notes surfaced by the harness (neither is a provenance defect):

- **Mongo — composite unique is a soft check.** Mongoose builds unique indexes in the background, so a
  rapid duplicate insert can slip through before the index is live; the check is informational on Mongo.
  The plugin's `upsert()` matches by find-first, so it doesn't rely on the DB constraint anyway.
- **Mongo — the end-to-end delete via a real document isn't exercised here.** The comments plugin patches
  every collection's `afterDelete` with a `documentId: Number(doc.id)` filter, which throws on a Mongo
  ObjectId (`Number(...) → NaN`). That's a comments-plugin × Mongo incompatibility, unrelated to
  provenance — so the harness tests the `deleteByDocument` query directly instead. The full hook path is
  covered by the plugin's unit tests and the SQLite/Postgres runs.

## Run the translator integration suite on all three

```bash
docker compose up -d              # from apps/dev
bun run test:integration:all      # sqlite → postgres → mongo, in turn
# or one at a time:
bun run test:integration:postgres
```

The three run one after another regardless of failures — separated by `;`, not `&&`, because Postgres
is knowingly red (see below) and `&&` would stop the chain before Mongo ever ran.

`bootTestPayload` picks its adapter from `DB_ADAPTER` through `resolveTestDbAdapter()`, the test-side
sibling of `resolveDbAdapter()` in `src/lib/database/resolveAdapter.ts`.

**Isolation.** Each boot needs a database of its own: the twelve spec files run serially but share
one server, so without it they would read each other's rows. SQLite gets this for free — a throwaway
file per boot. Postgres and MongoDB do not, so each boot is given a namespace named by a random run
id — a Postgres **schema**, a Mongo **database** — which `cleanup()` drops before closing the
connection. A failure to drop is logged rather than swallowed: one leaked namespace per boot is
invisible until the server is full of them.

**Tests get their own database, not just their own schema.** `POSTGRES_TEST_URL` defaults to
`…/payload_test` and `MONGO_TEST_SERVER` (default `mongodb://localhost:27017`) is a **server** url with
no database name — unlike `MONGO_URL`, which carries the app's own. Postgres needs this rather than
just a schema: Payload documents `schemaName` as experimental and working *"only when there are not
other tables or enums of the same name in the database under a different schema"*, and the test
collections collide with the dev app's by construction. Postgres creates the database on first
connect, so there is no setup step.

**Type generation is off in the harness** (`typescript: { autoGenerate: false }`). Without it a Mongo
run rewrites the committed `src/payload-types.ts` with Mongo's string ids — `defaultIDType` flips from
`number` to `string`, and every id type with it — leaving the working tree dirty after a test run.

**Cost.** Measured over the full 12-file suite: sqlite 26 s, postgres 30 s, mongo 28 s. Per-boot
schema creation on Postgres does not measurably change the total.

**Leftovers.** A namespace leaks if a boot throws before `cleanup()` exists, or if the process is
killed mid-run. Both land in the dedicated test database, away from the app's data.

**One database survives a full Mongo run.** `auto-translate-unknown-locale.int.test.ts` leaves a
`t…`-prefixed database holding a single `_docs_versions` collection: the namespace is dropped, and a
late write from the auto-translate path recreates it after teardown. It is ~12 KB and one per full
run, not per boot. Suspected to be the same "the hook's work outlives the operation that triggered
it" family as [#124](https://github.com/focusreactive/payload-plugins/issues/124); left alone here
because this work changes no plugin source. To clear leftovers:

```bash
docker exec dev-mongo-1 mongosh --quiet --eval \
  'db.adminCommand("listDatabases").databases.filter(d=>/^t[0-9a-f]{32}$/.test(d.name)).forEach(d=>db.getSiblingDB(d.name).dropDatabase())'
```

The pattern is exact on purpose: `startsWith("t")` would also drop a `test` or `todo` database of your
own on the same server. The Postgres equivalent, against `payload_test`:

```sql
SELECT 'DROP SCHEMA "'||nspname||'" CASCADE;' FROM pg_namespace WHERE nspname ~ '^t[0-9a-f]{32}$';
```

### Known failures on Postgres

Three of the five cases in `auto-translate.int.test.ts` and `auto-translate-unknown-locale.int.test.ts`
fail on Postgres and pass on SQLite and MongoDB. This is a real plugin defect, not a harness artefact: the
auto-translate hook hands the runner `req.payload` instead of `req`, so the work it starts runs
outside the transaction the hook is executing in and cannot see the still-uncommitted source
document. Setting `transactionOptions: false` on the adapter makes all five pass, which isolates the
cause — all five then pass. Tracked in
[#124](https://github.com/focusreactive/payload-plugins/issues/124); the suite reports it rather than
working around it.

## Running the full app on a non-default DB

```bash
docker compose up -d
cross-env DB_ADAPTER=postgres bun run dev
```

## push vs migrations

This harness uses **push** for speed on fresh/throwaway DBs. In production, enabling `provenance` on a
SQL database (Postgres/SQLite) requires a real migration (`payload migrate:create` + `payload migrate`);
`src/migrations/20260707_125950_create_translator_provenance.ts` is the SQLite example of that. MongoDB
infers the collection with no migration.
