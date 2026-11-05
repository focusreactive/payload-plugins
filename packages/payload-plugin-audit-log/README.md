# @focus-reactive/payload-plugin-audit-log

Audit log for [Payload CMS](https://payloadcms.com/) v3. It records who changed which document or global and when, plus sign-ins, API keys, AI agents, seeds and migrations, in a read-only collection with CSV / NDJSON export.

Only the paths of changed fields are stored, never their values. An event is stored only when the change it describes is committed.

## Install

```bash
bun add @focus-reactive/payload-plugin-audit-log
```

Peer dependencies: `payload` and `@payloadcms/ui` 3.90 or newer (the plugin relies on how Payload 3.90 runs operations and transactions), `react` 19.

```ts
import { buildConfig } from "payload";
import { auditLogPlugin } from "@focus-reactive/payload-plugin-audit-log";

export default buildConfig({
  plugins: [
    // ...plugins that add collections or globals
    auditLogPlugin(),
  ],
});
```

Place the plugin after every plugin that adds collections or globals. Payload applies plugins in order, so anything added later is not audited. It sorts plugins by ascending `order` (unset counts as `0`, ties keep their listed order), so a plugin with a positive `order` runs after every plugin without one, wherever it is listed: `@payloadcms/plugin-mcp` has `order: 10`, so to audit its API keys give the audit plugin a higher order:

```ts
const mcp = mcpPlugin({ collections: { posts: { enabled: true } } });

export default buildConfig({
  plugins: [mcp, Object.assign(auditLogPlugin(), { order: (mcp.order ?? 0) + 1 })],
});
```

With Postgres or SQLite, create and run a migration for the new collection, then regenerate the import map for the export buttons:

```bash
payload migrate:create add_audit_log
payload migrate
payload generate:importmap
```

`status`, `actor.type`, `actor.source`, `via` and `target.kind` are select fields, which Postgres stores as enums. When an upgrade of the plugin adds values to them, create and run a migration again.

## Events

| Action | When |
| --- | --- |
| `doc.create`, `doc.update`, `doc.delete` | A document is created, changed or deleted. In collections with `trash: true`, moving a document to the trash and restoring it are `doc.update` with `deletedAt` in `changes`; only deleting it for good is `doc.delete` |
| `doc.publish`, `doc.unpublish` | A document's status changes to `published`, or from `published` back to `draft` |
| `doc.restore` | A version is restored |
| `doc.duplicate` | A document is duplicated (`metadata.duplicateFrom` holds the source id when known, see below) |
| `global.update`, `global.publish`, `global.unpublish` | A global is changed, published, or turned from published back to draft by a save that is not a draft save |
| `auth.login`, `auth.logout` | A login or logout through Payload |
| `auth.login_failed` | A failed REST or GraphQL login (`metadata.reason`: `invalid_credentials` or `locked`) |
| `auth.password_reset_requested`, `auth.password_reset` | Forgot-password and reset-password |
| `user.role_changed` | A `roleFields` field changed on an auth collection. Relationship and upload roles are compared by id, so a role populated by a read at any `depth` is not a change. In an auth collection with drafts, a draft save changes no role: the role is compared when a save that is not a draft save, such as a publish, writes the draft to the document, with the document that was live before it |
| `apikey.created`, `apikey.revoked` | A document is created or deleted in an `apiKeyCollections` collection. On an auth collection with `useAPIKey`, switching `enableAPIKey` on writes `apikey.created` and switching it off writes `apikey.revoked`. With drafts, only a save that is not a draft save, such as a publish, does, compared with the document that was live before it |
| `system.unattributed_write` | A database write that no Payload operation accounts for (see below) |
| `system.migration` | A migration ran up or down (see [Seeds and migrations](#seeds-and-migrations)) |
| `system.seed` | Written by your seed script with `logAuditEvent` |
| `audit.export`, `audit.retention_purge` | The log was exported or purged |

In the admin, `action` and `actor.type` show as colored Payload pills with a readable label (for example `doc.delete` as "Deleted"); hover a pill to see the stored code, which is what search and filters match.

Every event has `occurredAt`, `action`, `status`, `actor`, `onBehalfOf`, `agent`, `via`, `target` (`kind`, `slug`, `docId`, `label`, `locale`), `changes`, `overrideAccess`, `requestId` and `metadata`. Events of one request share a `requestId`. `occurredAt`, `action`, `actor.type`, `actor.docId`, `onBehalfOf.docId`, `target.slug`, `target.docId` and `requestId` are indexed.

- On auth collections `changes` includes `password` and `apiKey` when they are set or removed, by name only. They are taken from the data submitted to the operation, which is also what Payload stores, so a `beforeChange` hook that returns a new data object does not hide them. A password sent with a draft save is not stored by Payload and not reported.
- A create remembers whether it is a duplicate, and of which document, on the data object it starts with. A `beforeChange` hook that returns a copy made with spread (`{ ...data }`) or `Object.assign` keeps that; a hook that builds a new object field by field, or clones it with `structuredClone` or JSON, loses it, and the event falls back to telling a duplicate from the document Payload copied, without `metadata.duplicateFrom`.
- Rows of array and blocks fields are compared by position. Their generated `id` is not reported, so inserting or moving a row lists the fields whose content changed at each position, not `blocks.N.id`.
- `target.locale` is set only for localized collections and globals.
- Autosave draft saves, which Payload keeps out of the stored document, are not logged: a save with `autosave` and `draft` that does not submit `_status: "published"`, in a collection or global whose drafts have autosave enabled (`versions.drafts.autosave`). Any other save that passes `autosave`, such as a create, a save without `draft`, a publish, or a save in a collection or global without drafts autosave (including one with `versions.drafts: true`), is logged like any save. In autosave collections and globals a publish is compared with the stored document it replaces, except a bulk publish with `draft: true`, which is compared with the latest draft (see [Database reads](#database-reads)). In a collection, that is the document live before the publish, so the comparison holds after `versions.maxPerDoc` removed the previous published version; a document that was not published before lists every field. Both are compared as stored, in every locale, so a publish in one locale also lists the localized fields an autosave changed in another locale, and only those. Hidden and read-restricted fields a publish submits are compared with the submitted values in the locale of the save only. In any collection or global with drafts, an unpublish, a save that is not a draft save and writes the latest draft over the published document or global, is compared with the published one it replaces, so it also lists what that draft changed.
- A save with `select` returns only the selected fields, so it is compared using the submitted data: the fields it leaves out count with the values it submitted, and fields it neither selected nor submitted are not compared. A change made only by a field `beforeChange` hook to a field left out of the selection is not reported.
- Hidden and read-restricted fields that the caller cannot see, at any depth (in groups, named tabs, array rows and blocks), are not reported as removed. A save that changes such a field is reported by its path, never its value: Payload reads the document before the save with every field, and the plugin compares that with the data saved for the field. For a global, the plugin takes these fields from the stored global Payload reads at the start of the update (in a global with drafts, its latest version), in the locale of the save.
- Localized fields saved in a locale that falls back to another locale are compared by the values saved in that locale, not the fallback values Payload shows, so clearing a value that another locale fills, or setting the value another locale shows, is reported. This holds at any depth, including inside array and blocks rows, whose rows are matched to the stored rows by `id`. For a document, the plugin takes these values from what the save writes to the database, after field `beforeChange` hooks, so a value a field hook derives or normalizes is compared as stored.

## Database reads

Most events come from what Payload has already loaded for the operation. The plugin reads the database itself only in these cases:

| Operation | Read |
| --- | --- |
| Publish by id over a draft in an autosave collection or in an auth collection with drafts | One `findOne` of the stored document, the one live before the publish, to compare with it and to tell a role or API key change |
| Save by id that is neither a draft save nor a publish, while the latest version is a draft | One `findOne` of the stored document, to tell an unpublish from a draft save, to compare an unpublish with it and, in an auth collection, to tell a role or API key change |
| Raw adapter write to a user that carries login or session fields next to other data, with `trackUnattributedWrites` | One `findOne` of the stored user |
| A migration rolled back (`migrate:down`, `migrate:refresh`, `migrate:reset`) | One `findOne` of each migration row before it is deleted |
| Export | The exported events |

Inside a Postgres or SQLite transaction each of these reads runs in a savepoint of its own, after the plugin's earlier statements on that transaction. A read that fails is rolled back to its savepoint and logged, so it never aborts the change's transaction, and the event falls back: a publish is compared with the document before the save, a role or API key change is taken from the latest draft, a save is not taken for an unpublish, a raw user write lists every submitted field, and a rolled-back migration is not recorded. Single-document reads take their savepoint on the request's transaction, so in the rare case that one fails while your code runs by-id writes in parallel on one shared `req`, a concurrent write's statement can be rolled back with the savepoint. Bulk operations never read this way.

Everything else adds no read:

- Globals. Payload reads the stored global at the start of every update, and in a global with drafts its latest version first. The plugin keeps these results and takes from them, in the locale of the save, the hidden fields and, in a locale that falls back to another locale, the localized fields it compares.
- Globals with drafts. The plugin also keeps the stored main global and the global the publish writes: a publish in an autosave global compares what it writes with the main global before it, which is the last publish or the last unpublish, and a save that turns it from published into a draft is `global.unpublish`, compared with that main global, so it also lists what the draft it writes to the main global changed.
- Bulk updates, which Payload runs for every document in parallel on one transaction, so a savepoint of one document could undo another's writes. Payload loads the documents it updates and the plugin compares with them:
  - Without `draft: true`, including the admin's bulk "Unpublish", these are the stored documents, so a publish is compared with them and an unpublish is detected from them. Such a bulk publish publishes the stored document with the submitted data, not a pending draft.
  - With `draft: true`, including the admin's bulk "Publish", these are the latest drafts, so a publish is compared with the latest draft of each document, not with its previous publish.

## Actors

| `actor.type` | Meaning |
| --- | --- |
| `user` | A signed-in user |
| `api_key` | A request authenticated with a Payload API key |
| `agent` | An MCP request, or code that labels itself as an agent |
| `seed`, `migration` | Labelled scripts |
| `system` | A Local API call without a user or label |
| `anonymous` | A request without a user |

The actor is taken from the first match of: `req.context.auditActor`, a `withAuditActor` scope, an MCP request, an API key, `req.user`, the Local API (`system`), otherwise `anonymous`. `actor.source` tells which one it was: `context`, `als`, `auth` or `inferred`. Events the plugin writes for itself, such as `audit.retention_purge`, have the source `plugin`.

`onBehalfOf` is the signed-in user when an explicit actor is set, unless the actor input names its own `onBehalfOf`. `via` is one of `admin`, `rest`, `graphql`, `local`, `mcp`, `job`. A REST call coming from the admin panel is `admin`. `job` is never detected, so label your task handlers if you need it.

### `withAuditActor`

Labels every Local API call made inside the callback, including calls without `req`:

```ts
import { withAuditActor } from "@focus-reactive/payload-plugin-audit-log";

await withAuditActor({ type: "seed", label: "initial content" }, async () => {
  await payload.create({ collection: "pages", data: { title: "Home" } });
});
```

Input fields: `type` (required), `docId`, `collection`, `label`, `onBehalfOf`, `agent` (`keyId`, `name`, `model`, `tool`), `via`.

Initialize Payload before you open a scope. Timers started inside the scope, such as the `jobs.autoRun` cron, keep its actor. The scope is kept on `globalThis`, so it reaches the plugin even when the app loads more than one copy of this package.

### `req.context.auditActor`

Sets the actor for one request, for example in `@payloadcms/plugin-mcp`:

```ts
import { CTX_ACTOR } from "@focus-reactive/payload-plugin-audit-log";
import type { AuditActorInput } from "@focus-reactive/payload-plugin-audit-log";
import { mcpPlugin } from "@payloadcms/plugin-mcp";
import type { MCPAccessSettings } from "@payloadcms/plugin-mcp";
import type { PayloadMcpApiKey } from "./payload-types";

mcpPlugin({
  overrideAuth: async (req, getDefaultMcpAccessSettings) => {
    const apiKey = (await getDefaultMcpAccessSettings()) as MCPAccessSettings & PayloadMcpApiKey;
    const keyId = String(apiKey.id);
    const label = apiKey.label ?? undefined;
    const user = typeof apiKey.user === "object" ? apiKey.user : undefined;
    const actor: AuditActorInput = {
      type: "agent",
      collection: "payload-mcp-api-keys",
      docId: keyId,
      label,
      agent: { keyId, name: label },
      ...(user ? { onBehalfOf: { collection: "users", docId: String(user.id), label: user.email } } : {}),
      via: "mcp",
    };
    req.context[CTX_ACTOR] = actor;
    return apiKey;
  },
});
```

Local API calls inside the request should get `req`. When a call must not share the request's transaction, pass the actor in its context. Such a call starts a request of its own, so its events get their own `requestId`:

```ts
import { CTX_ACTOR } from "@focus-reactive/payload-plugin-audit-log";

await req.payload.create({
  collection: "media",
  context: { [CTX_ACTOR]: req.context[CTX_ACTOR] },
  overrideAccess: true,
  data,
});
```

## `logAuditEvent`

Writes an event the plugin cannot see itself, such as an SSO login that sets its own cookie:

```ts
import { logAuditEvent } from "@focus-reactive/payload-plugin-audit-log";

await logAuditEvent(payload, {
  action: "auth.login",
  actorOverride: {
    actor: { type: "user", collection: "users", docId: String(user.id), label: user.email, source: "auth" },
    via: "admin",
  },
  target: { kind: "auth", slug: "users", docId: String(user.id) },
  metadata: { method: "oidc" },
});
```

Optional arguments: `status`, `changes`, `overrideAccess`, `metadata`, `actorOverride`, and `req` to write inside the request's transaction. Events always go to the plugin's collection. The call does nothing when the plugin is not installed or disabled.

## Seeds and migrations

Migrations are recorded without any setup. The plugin wraps the database adapter as soon as Payload creates it, so this covers `payload migrate` and the other `migrate:*` commands, which run without `onInit`, and `prodMigrations`, which run while the adapter connects. Each command runs as an actor of type `migration` labelled with the command (`migrate`, `migrate:down`, `migrate:fresh`, `migrate:refresh`, `migrate:reset`), so the changes a migration makes through the Local API are attributed to it. When Payload records or removes a migration, a `system.migration` event is written with `metadata`: `name`, `batch` and `direction` (`up` or `down`). The row Payload keeps for dev schema pushes is not a migration and is ignored.

The events of a migration, `system.migration` and everything it does, are written as soon as it commits, outside its transaction (right after Payload records it when the adapter runs it without a transaction), so a long command does not keep them in memory. On a new database the audit table is created by one of the migrations, so:

- Events that cannot be written yet, because the migration creating the audit table has not run, are kept without a log entry and written after the next migration commits. Every migration a command runs is recorded, including the ones before the migration creating the audit table, as long as that table exists when the command finishes.
- Events of a migration whose transaction rolls back are dropped with it. The SQL adapters stop the process when a migration fails; events of the migrations committed before it are already written.
- If the audit table does not exist when the command finishes, for example after a `migrate:down`, `migrate:reset` or `migrate:refresh` that removes it, the events cannot be written. One warning says how many were dropped and why, with no error stack.

Seeds are your own scripts, so label them and write the `system.seed` event yourself:

```ts
import { logAuditEvent, withAuditActor } from "@focus-reactive/payload-plugin-audit-log";

await withAuditActor({ type: "seed", label: "initial content" }, async () => {
  await seed(payload);
  await logAuditEvent(payload, {
    action: "system.seed",
    target: { kind: "system", slug: "seed", label: "initial content" },
  });
});
```

SQL run by a migration's `db` directly is not seen by the plugin.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | `false` leaves the config untouched |
| `slug` | `"audit-events"` | Slug of the log collection |
| `excludeCollections` | `[]` | Collections not to log. The log itself is always excluded. Payload adds its internal collections and globals (jobs, preferences, locks, migrations, key-value store, job stats) after plugins run, so they are never audited |
| `excludeGlobals` | `[]` | Globals not to log |
| `apiKeyCollections` | `["payload-mcp-api-keys"]` | Collections whose create / delete means issuing / revoking a key |
| `roleFields` | `["role", "roles"]` | Auth collection fields reported as `user.role_changed` |
| `retention` | not set | `{ days, queue?, cron? }`: delete events older than `days` (a positive integer, at most 36500). Recommended, see [Retention](#retention) |
| `access.read` | signed-in users of the admin user collection | Who can read and export the log |
| `trackUnattributedWrites` | `true` | Log database writes that bypass Payload operations |
| `maxChangedPaths` | `200` | Maximum entries in `changes` (a positive integer); a longer list ends with `…` |

An invalid `retention.days` or `maxChangedPaths` throws when the config is built.

Events cannot be created, updated or deleted through the REST or GraphQL API, the admin panel or the Local API, even with `overrideAccess`. Use `logAuditEvent` to write your own events.

## Admin list view

The log lists the newest events first. The search box matches `action`, `actor.label`, `target.label` and `target.docId`. `action` is a text field, so an event logged by a newer or older version of the plugin is still stored.

## Export

`GET /api/<slug>/export?format=csv|ndjson` streams the log, newest first. It accepts the usual REST `where` filter and a `search` term, which matches the same fields as the admin search box and is combined with `where` the way the list view combines them. The collection's read access applies.

```
GET /api/audit-events/export?format=ndjson&where[action][equals]=doc.delete
GET /api/audit-events/export?format=csv&search=jane&where[target.slug][equals]=posts
```

- At most 100,000 rows per request.
- Responds `401` without a signed-in user, `403` when read access is denied and `400` for a `where` the collection cannot be queried by.
- Each export writes an `audit.export` event with the filtered field names (including the searched ones), not the values or the search term.
- The admin list view gets **Export CSV** and **Export NDJSON** buttons that keep the current filter and search.

## Retention

Events are kept forever unless `retention.days` is set. Setting it is recommended: `auth.login_failed` is written for every failed login, by anyone who can reach the login endpoint, so without retention the log grows without bound.

```ts
auditLogPlugin({ retention: { days: 365 } });
```

This registers a scheduled job (queue `"default"`, daily at 03:00 unless `queue` / `cron` say otherwise). It counts the events older than `days` (by the indexed `occurredAt`), deletes them unless there are none, and writes `audit.retention_purge` with `metadata`: `deleted`, `days` and `before`. Something must run the jobs queue: `jobs.autoRun` in the Payload config, or an external cron calling `payload.jobs.handleSchedules()` and `payload.jobs.run()`.

## Unattributed writes

With `trackUnattributedWrites`, the plugin wraps the database adapter's write methods. A create, update or delete that reaches the adapter outside a Payload operation on that document, for example a script calling `payload.db.updateOne`, is logged as `system.unattributed_write`. Only collections and globals audited by the plugin are watched.

- An update or delete by id is covered while a Payload operation on that document runs in the same request: an update from its `beforeChange` until its `afterChange`, a delete from its `beforeDelete` until its `afterDelete`, a global update or version restore from its `beforeOperation` until its `afterChange`. A raw write on the same document before or after that, even with the same `req`, is logged, for example a migration that updates a document through Payload and then calls `payload.db.updateOne` on it. Nested operations on one document keep it covered until the outer one ends.
- Each running Payload create covers exactly one insert into its collection, its own. Another `payload.db.create` on that collection in the same request, for example in an `afterChange` hook, is logged.
- Coverage follows the `req`, not the code that writes. Project hook code that runs inside an operation with the same `req` can write raw to the document that operation covers, or insert before the operation's own create and use up its coverage, without a separate `system.unattributed_write`; the operation's own event is still logged.
- `updateMany` and `deleteMany` are always logged, whatever else runs in the request. Payload calls them only on its internal collections.
- When an operation fails, Payload rolls back its transaction and every operation of that request stops covering its documents. Without transactions (SQLite without `transactionOptions`, MongoDB without a replica set) Payload gives no signal on failure, so a Local API operation that throws keeps its documents covered for the rest of that `req`. REST and GraphQL requests end with the error.

Payload's own bookkeeping is ignored. Login, refresh and reset password write the whole user record, so their writes to that auth collection in the same request are ignored from the operation's `beforeOperation` until its `afterOperation`, which Payload runs after these writes. A raw write to that user with the same `req` after the operation, such as a role change, is logged. Logout, forgot password, unlock and email verification change only bookkeeping, and writes that only touch sessions, login attempts, locks, password hashes, reset and verification tokens, or job stats are ignored by content. A raw write to a user that carries such fields next to other data, such as a whole stored user written back, is compared with the stored user in the locale of the write, at any depth, and logged with the fields that changed, so a role changed this way is on record.

Other plugins that write a whole stored document through `payload.db.*` outside a Payload operation, such as the A/B plugin publishing a variant percentage, are recorded as `system.unattributed_write` with every submitted key in `changes`. To attribute such a write, pass a `req` whose `context.auditActor` (see [`req.context.auditActor`](#reqcontextauditactor)) names the plugin, and submit only the fields that changed so `changes` lists just those.

## Reliability

- Recording an event never fails the change. Errors in the plugin's hooks and adapter wrappers, such as a document value that cannot be serialized, are logged and the event is skipped.
- On Postgres and SQLite, events of a transaction are inserted right before it commits, inside one savepoint. If that batch fails, each event is retried in its own savepoint. A rolled-back transaction drops its events.
- MongoDB has no savepoints, so events of a transaction are written right after it commits, outside its session. A rolled-back or failed commit drops its events. If the process stops between the commit and these writes, the change is kept without its events.
- Without a transaction, each event is written right away.
- Without a transaction, a save that fails keeps what it already wrote: a change written before a later hook threw may have no event, and an event already written stays even though the save failed.
- Each update and bulk update keeps what it was asked to do (draft, autosave, `select`, a submitted password or API key) on a request of its own, which the plugin's `beforeOperation` hook returns in place of `args.req` and Payload passes to that operation's document hooks. Operations that overlap on one `req`, nested in a hook or run in parallel with `Promise.all`, so never take each other's flags, and nothing of them stays on `req.context`. Two cases fall back:
  - Payload runs `restoreVersion` with the `req` it was called with, so a restore is told apart from other saves of its collection on that `req` by which started last. A restore run in parallel with another save of the same collection on one shared `req` can give that save its flags.
  - A `beforeOperation` hook that runs after the plugin's and replaces `args.req` with a request it did not derive from the one it got leaves that operation's saves without their flags: a draft save of a published document is then recorded as `doc.unpublish`, an autosave tick as `doc.update`, and a password change is missing from `changes`.
- The reads listed in [Database reads](#database-reads) run in savepoints on Postgres and SQLite, so a failed read never aborts the change's transaction.
- `auth.login_failed` is written outside the request transaction, which is already rolled back.

## Not captured

- Raw SQL and direct database access. Call `logAuditEvent` if you need a record.
- Raw server-side version writes through the adapter: `payload.db.createVersion`, `updateVersion` and `deleteVersions`, and for globals `createGlobalVersion`, `updateGlobalVersion` and `deleteVersions` with `globalSlug`.
- Failed logins through the Local API, and GraphQL logins that use an aliased mutation.
- Field values, IP addresses and user agents.
- Rows changed by anyone with direct access to the database, including the audit rows themselves. The log is read-only through Payload, not in the database.

## License

MIT
