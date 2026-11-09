# @focus-reactive/payload-plugin-audit-log

Audit log for [Payload CMS](https://payloadcms.com/) v3. It records who changed which document or global and when, plus sign-ins and the AI agents and API keys that acted, in a read-only collection with CSV / NDJSON export. It records only what goes through Payload: operations, collection and global hooks, and auth hooks.

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

Place the plugin after every plugin that adds collections or globals. Payload applies plugins in order, so anything added later is not audited. It sorts plugins by ascending `order` (unset counts as `0`, ties keep their listed order), so a plugin with a positive `order` runs after every plugin without one, wherever it is listed: `@payloadcms/plugin-mcp` has `order: 10`, so to audit its API key collection give the audit plugin a higher order:

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

`status`, `actor.type`, `actor.source`, `via` and `target.kind` are select fields, which Postgres stores as enums. When an upgrade of the plugin adds or removes values of them, create and run a migration again.

## Events

| Action | When |
| --- | --- |
| `doc.create`, `doc.update`, `doc.delete` | A document is created (including by duplicating another), changed or deleted. In collections with `trash: true`, moving a document to the trash and restoring it are `doc.update` with `deletedAt` in `changes`; only deleting it for good is `doc.delete` |
| `doc.publish`, `doc.unpublish` | A document's status changes to `published`, or from `published` back to `draft` |
| `doc.restore` | A version is restored |
| `global.update`, `global.publish`, `global.unpublish` | A global is changed, published, or turned from published back to draft by a save that is not a draft save |
| `auth.login`, `auth.logout` | A login or logout through Payload |
| `auth.login_failed` | A failed REST or GraphQL login (`metadata.reason`: `invalid_credentials` or `locked`) |
| `auth.password_reset_requested`, `auth.password_reset` | Forgot-password and reset-password |
| `audit.export`, `audit.retention_purge` | The log was exported or purged |

A role change is a `doc.update` of the user with the role field in `changes`. API keys are documents too: a key in an API key collection such as `payload-mcp-api-keys` is a `doc.create`, `doc.update` or `doc.delete` of that collection, and switching `enableAPIKey` on an auth collection with `useAPIKey` is a `doc.update` with `enableAPIKey` in `changes`.

In the admin, `action` and `actor.type` show as colored Payload pills with a readable label (for example `doc.delete` as "Deleted"); hover a pill to see the stored code, which is what search and filters match.

Every event has `occurredAt`, `action`, `status`, `actor`, `onBehalfOf`, `agent`, `via`, `target` (`kind`, `slug`, `docId`, `label`, `locale`), `changes`, `overrideAccess`, `requestId`, `ip`, `userAgent` and `metadata`. Events of one request share a `requestId`. `occurredAt`, `action`, `actor.type`, `actor.docId`, `onBehalfOf.docId`, `target.slug`, `target.docId` and `requestId` are indexed.

- The events of a create, update or restore of a document or global have the `occurredAt` of the moment the operation started, taken in its `beforeOperation`, and operations that start in the same millisecond get consecutive milliseconds. So a save that a hook of the create runs on the same document, such as `@payloadcms/plugin-nested-docs` saving a new document again in `afterChange`, is listed after the create although its event is written first. The documents of one bulk update share the `occurredAt` of the bulk update. Other events have the time they are written.
- On auth collections `changes` includes `password` and `apiKey` when they are set or removed, by name only. They are taken from the data submitted to the operation, which is also what Payload stores, so a `beforeChange` hook that returns a new data object does not hide them. A password sent with a draft save is not stored by Payload and not reported.
- `ip` is the first address in the request's `x-forwarded-for` header, otherwise its `x-real-ip` header, and `userAgent` is its `user-agent` header, capped at 64 and 512 characters. Both are `null` when the request does not send them, such as a Local API call without headers. These headers are set by the client or by your proxy, so trust `ip` only behind a proxy that sets `x-forwarded-for` itself. Turn both off with `recordIpAndUserAgent: false`.
- Rows of array and blocks fields are compared by position. Their generated `id` is not reported, so inserting or moving a row lists the fields whose content changed at each position, not `blocks.N.id`.
- `target.locale` is set only for localized collections and globals, those with a localized field at any depth, including a localized named tab. It is the locale the operation started in, taken in its `beforeOperation`, or the locale a by-ID save or a global save publishes with `publishSpecificLocale`. A bulk update keeps the request locale, since Payload writes that locale. Reads in other locales by the project's hooks during the operation do not change it. Logout has no earlier hook, so its locale is the request's after the project's own `afterLogout` hooks ran.
- Autosave draft saves, which Payload keeps out of the stored document, are not logged: a save with `autosave` and `draft` that does not submit `_status: "published"`, in a collection or global whose drafts have autosave enabled (`versions.drafts.autosave`). Any other save that passes `autosave`, such as a create, a save without `draft`, a publish, or a save in a collection or global without drafts autosave (including one with `versions.drafts: true`), is logged like any save. In autosave collections and globals a publish is compared with the stored document it replaces, except a bulk publish with `draft: true`, which is compared with the latest draft (see [Database reads](#database-reads)). In a collection, that is the document live before the publish, so the comparison holds after `versions.maxPerDoc` removed the previous published version; a document that was not published before lists every field. Both are compared as stored, in every locale, so a publish in one locale also lists the localized fields an autosave changed in another locale, and only those. Hidden and read-restricted fields a publish submits are compared with the submitted values in the locale of the save only. In any collection or global with drafts, an unpublish, a save that is not a draft save and writes the latest draft over the published document or global, is compared with the published one it replaces, so it also lists what that draft changed.
- A save with `select` returns only the selected fields, so it is compared using the submitted data: the fields it leaves out count with the values it submitted, and fields it neither selected nor submitted are not compared. A change made only by a field `beforeChange` hook to a field left out of the selection is not reported.
- Hidden and read-restricted fields that the caller cannot see, at any depth (in groups, named tabs, array rows and blocks), are not reported as removed. A create lists those it writes by name, never by value, taken from the data it submits. A save that changes such a field is reported by its path, never its value: Payload reads the document before the save with every field, and the plugin compares that with the data saved for the field. For a global, the plugin takes these fields from the stored global Payload reads at the start of the update (in a global with drafts, its latest version), in the locale of the save.
- Localized fields saved in a locale that falls back to another locale are compared by the values saved in that locale, not the fallback values Payload shows, so clearing a value that another locale fills, or setting the value another locale shows, is reported. This holds at any depth, including inside array and blocks rows, whose rows are matched to the stored rows by `id`. For a document, the plugin takes these values from what the save writes to the database, after field `beforeChange` hooks, so a value a field hook derives or normalizes is compared as stored.

## Database reads

Most events come from what Payload has already loaded for the operation. The plugin reads the database itself only in these cases:

| Operation | Read |
| --- | --- |
| Publish by id over a draft in an autosave collection | One `findOne` of the stored document, the one live before the publish, to compare with it |
| Save by id that is neither a draft save nor a publish, while the latest version is a draft | One `findOne` of the stored document, to tell an unpublish from a draft save and to compare an unpublish with it |
| Export | The exported events |

Inside a Postgres or SQLite transaction each of these reads runs in a savepoint of its own, after the plugin's earlier statements on that transaction. A read that fails is rolled back to its savepoint and logged, so it never aborts the change's transaction, and the event falls back: a publish is compared with the document before the save, and a save is not taken for an unpublish. Single-document reads take their savepoint on the request's transaction, so in the rare case that one fails while your code runs by-id writes in parallel on one shared `req`, a concurrent write's statement can be rolled back with the savepoint. Bulk operations never read this way.

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
| `system` | A Local API call without a user, such as a seed script or a migration that writes through the Local API |
| `anonymous` | A request without a user |

The actor is taken from the first match of: `req.context.auditActor`, a `withAuditActor` scope, an MCP request, an API key, `req.user`, the Local API (`system`), otherwise `anonymous`. `actor.source` tells which one it was: `context`, `als`, `auth` or `inferred`. Events the plugin writes for itself, such as `audit.retention_purge`, have the source `plugin`.

`onBehalfOf` is the signed-in user when an explicit actor is set, unless the actor input names its own `onBehalfOf`. `via` is one of `admin`, `rest`, `graphql`, `local`, `mcp`, `job`. A REST call coming from the admin panel is `admin`. `job` is never detected, so label your task handlers if you need it.

### `withAuditActor`

Labels every Local API call made inside the callback, including calls without `req`:

```ts
import { withAuditActor } from "@focus-reactive/payload-plugin-audit-log";

await withAuditActor({ type: "system", label: "initial content" }, async () => {
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

Optional arguments: `status`, `changes`, `overrideAccess`, `metadata`, `actorOverride`, `req` to write inside the request's transaction, and `headers` to take `ip` and `userAgent` from when there is no `req`, such as the `Request` of a Next.js route. Events always go to the plugin's collection. The call does nothing when the plugin is not installed or disabled.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | `false` leaves the config untouched |
| `slug` | `"audit-events"` | Slug of the log collection |
| `excludeCollections` | `[]` | Collections not to log. The log itself is always excluded. Payload adds its internal collections and globals (jobs, preferences, locks, migrations, key-value store, job stats) after plugins run, so they are never audited. The folder collection (`payload-folders` unless `folders.slug` says otherwise) is audited through `folders.collectionOverrides`; list its slug here to leave it out |
| `excludeGlobals` | `[]` | Globals not to log |
| `retention` | not set | `{ days, queue?, cron? }`: delete events older than `days` (a positive integer, at most 36500). Recommended, see [Retention](#retention) |
| `access.read` | signed-in users of the admin user collection | Who can read and export the log |
| `recordIpAndUserAgent` | `true` | Store the client `ip` and `userAgent` of the request on each event; `false` stores neither |
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

- Anything that bypasses Payload's operations, by design: raw SQL, calls to the database adapter (`payload.db.create`, `updateOne`, `updateGlobal`, version writes and the rest), and the SQL a migration runs on its `db`. What a migration or a seed script writes through the Local API is recorded like any Local API call, as the `system` actor unless it is labelled with `withAuditActor`. Running a migration or a seed is not an event of its own. Call `logAuditEvent` if you need a record.
- Changes the database makes on its own, such as clearing a relationship or upload field (`ON DELETE SET NULL` on Postgres and SQLite) when the document it points to is deleted. The delete is logged, the cleared field of each referencing document is not, for example the `folder` of documents in a deleted folder.
- Failed logins through the Local API, and GraphQL logins that use an aliased mutation.
- Field values.
- Rows changed by anyone with direct access to the database, including the audit rows themselves. The log is read-only through Payload, not in the database.

## License

MIT
