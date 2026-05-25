# @repo/database

Database wiring for Payload apps in this monorepo. Owns the **postgres adapter
configuration** and the **migrations directory**.

## Why a separate package?

- Single source of truth for connection / pool / adapter options.
- Migrations live next to the adapter that runs them, not inside an app.
- Apps depend on `@repo/database` and get a fully configured adapter back.

## Usage

```ts
// apps/<your-app>/src/payload.config.ts
import { buildConfig } from "payload";
import { createDatabaseAdapter } from "@repo/database";

export default buildConfig({
  db: createDatabaseAdapter({
    connectionString: process.env.DATABASE_URL,
  }),
  // ...rest of config
});
```

`createDatabaseAdapter` reads `process.env.DATABASE_URL` by default, sets
`push: false` (migrations are explicit), and points Payload at the migrations
directory inside this package.

## Running migrations

From an app that uses this package:

```bash
bun run payload migrate           # apply pending migrations
bun run payload migrate:status    # show migration status
bun run payload migrate:create    # generate a new migration file
bun run payload migrate:down      # roll back the latest migration
```

New migration files are written to `packages/database/migrations/` because the
adapter is configured with `migrationDir` pointing here. After
`migrate:create`, regenerate the index:

```bash
bun run payload migrate:create   # writes <ts>_<name>.ts + .json
# then update migrations/index.ts to include the new file
```

## Structure

```
packages/database/
├── src/
│   └── index.ts         # createDatabaseAdapter() + migrationDir
├── migrations/
│   ├── index.ts         # registers all migrations in order
│   └── <timestamp>_*.ts # individual migration files
└── package.json
```
