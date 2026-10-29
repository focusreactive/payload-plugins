# @focus-reactive/payload-plugin-folders

A Storyblok-style content tree for Payload 4: folders, per-folder ordering, full paths, moves with
redirects. The package is private and under construction; this file only carries what a host
needs to know about the tree lock for now.

## Finding a page by its URL

A page stores `pathSegment`: its own slug in each locale, or null where it has none. A locale
without its own slug falls back to the default locale's, but the fallback is applied when you query,
not stored. A stored fallback would create a locale row for every page that never had one, which
breaks collections with a required localized field and replaces a field's fallback to the default
locale with its `defaultValue`. An en publish also rebuilds the published row from the published
locales only (`localizeStatus`), and would drop a stored fallback of a locale that was never
published.

So a lookup by segment in a non-default locale has to ask for both cases. Use the helper, with the
same `locale` as the request:

```ts
import { buildSegmentWhere } from "@focus-reactive/payload-plugin-folders";

const { docs } = await payload.find({
  collection: "pages",
  locale: "de",
  where: {
    and: [
      { folderPath: { equals: "/blog" } },
      { isFolderRoot: { not_equals: true } },
      buildSegmentWhere({ defaultLocale: "en", locale: "de", segment: "post" }),
    ],
  },
});
```

For the default locale the helper is a plain `pathSegment equals`. For any other locale it matches
`pathSegment equals X`, or no `pathSegment` of its own and `pathSegment.<defaultLocale> equals X`.
A client that is not JavaScript sends the same `where` as a query string (here for `de`, default
locale `en`):

```
GET /api/pages?locale=de
  &where[folderPath][equals]=/blog
  &where[isFolderRoot][not_equals]=true
  &where[or][0][pathSegment][equals]=post
  &where[or][1][and][0][pathSegment][exists]=false
  &where[or][1][and][1][pathSegment.en][equals]=post
```

Pages at the top level use `where[folder][exists]=false` instead of `folderPath`. Subtrees use
`folder.ancestorIds contains /<id>/` (or the `folder` field), never `like` on `folderPath`, which
also matches `/archive/blog/x`.

GraphQL cannot express the fallback half: its `where` input has no locale-qualified field such as
`pathSegment__en`, so `buildSegmentWhere` has no GraphQL form. A GraphQL client can read
`fullPath` (which applies the fallback) and filter by `folderPath` and by the page's own
`pathSegment`; to resolve a URL in a non-default locale use the resolve endpoint (P-31).

When you read with a `select`, naming `fullPath` also loads `folder`, `folderPath`, `isFolderRoot`
and `pathSegment`, because the path is composed from them. They appear in the result.

## Known limits

- `fullPath` is null for a reader who cannot read folders: it is composed from the folder's path,
  and folder reads are public by default.
- `fullPath` is also null for a page with no segment of its own in a locale when the read turns
  the locale fallback off (`fallbackLocale: false`, or `localization.fallback: false` in the host
  config), because the path has nothing to fall back to at read time. `buildSegmentWhere` still
  finds that page, since it falls back in the query.
- The host's own collection `afterRead` hooks run before the plugin's, so they see `fullPath`
  unset.
- A page that existed before the plugin was installed has a null `pathSegment` until it is saved
  again or repaired (P-29), so a segment lookup does not find it until then.
- A bulk update that could change URLs is refused with a 400: a `where` update that publishes,
  sets `publishAllLocales`, or sets the segment field, `isFolderRoot`, `folder` or `orderKey`.
  This includes the admin list's bulk Publish. Payload saves the matching pages in parallel and
  commits the ones that succeed even when others fail, so the uniqueness check could not keep two
  pages from going live at one URL. Publish pages one at a time until batch publish (P-27)
  exists. A bulk update of other fields, or of drafts, still works.
- Segment uniqueness is strict under `localizeStatus` (the Payload 4 default for drafts with
  localized fields). A page published only in `en` is live at its `en` path, and every other
  locale falls back to it, so it blocks another page's `de` slug through that fallback even
  though the first page has nothing published in `de`.
- A draft save passes the uniqueness rules, because the edit view shows the conflict as a warning.
  The rules bind when a save makes the segment live: the publish, a publish of every locale, a
  version restore or a scheduled publish. Each of those is checked again after the write, inside
  the same transaction, and a conflict rolls the save back.

Every write that changes the tree (a folder or page create, a folder update, a move) runs under
one tree lock per Payload instance. It lives as long as the write's database transaction.

- A host hook that calls `payload.create` or `payload.update` on a folder or page without passing
  `req`, inside a tree write, opens its own transaction and waits for the lock its caller holds. It
  fails after the 30 second lock timeout. Always pass `req` to nested Local API calls.
- On Postgres, queued tree writers each hold a pool connection while they wait. More parallel tree
  writes than the pool size starve other requests; size the pool for your write concurrency.
- On SQLite without `transactionOptions`, a failed operation keeps the lock until a 5 second
  watchdog releases it, and operations there are not atomic anyway. Pass `transactionOptions: {}`
  to `sqliteAdapter()`.
- Every page save takes the tree lock, autosaves included. A save queues behind a move, and on
  Postgres it holds a pool connection while it waits. The lock stays on drafts on purpose: without
  it a move between the structure guard's read and the version insert would leave the new version
  in the old folder.
- The after-write uniqueness check rolls a refused save back through the database transaction. On
  SQLite without `transactionOptions` there is no transaction, so the refused save has already
  written its row when the error is thrown and the conflict stays on the page. The startup
  warning names this; pass `transactionOptions: {}` to `sqliteAdapter()`.
