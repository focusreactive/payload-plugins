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
