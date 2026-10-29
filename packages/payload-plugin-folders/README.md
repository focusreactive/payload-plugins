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

## Access gates for moves and repair

`access.move({ req, items, toFolder })` is an extra gate on every move, asked after the `update` and
publish checks passed. `access.repair({ req })` decides who may verify and repair the tree. Without
it, `canRepairTree` lets a user through when the folders' `update` access passes and `access.move`
passes, and it calls `access.move` with an empty `items` list, because "every item" cannot be
listed. A gate written as `items.every(...)` passes everyone that way, so set `access.repair` to
keep repair for admins.

## Redirects

A move, a folder rename and a publish that changes a published URL write rows into
`folder-redirects` inside the same database transaction, so a rolled back write leaves none.

- A page row (`kind: 'page'`) for every locale in which the page was live at one path and is live at
  another, and one `folderPrefix` row per locale for a moved or renamed folder that has a live page
  beneath it. The prefix row stands for every path under the old folder path, so a rename writes one
  row, not one per page. A change that touches only a draft writes nothing.
- A locale counts as live when its own status is published, or when it has no status of its own and
  `localization.fallback` is on and the default locale is published (decision 24). An en-only
  published page is live at its de fallback URL, so its de URL gets a row too.
- Rows are upserted by `lookupKey`, `<locale>:<path>` (`-` without localization). Keys are per locale.
  A row whose path a live document now takes is deleted in the same transaction: a page row when a
  page takes the path, a prefix row when a folder does. Deleting a page or a folder deletes the rows
  that target it.
- `redirects: false` on a move request, or `context: { foldersRedirects: false }` on a Local API save
  (a folder rename, a publish), writes no row. `redirects.enabled: false` turns the rows off for
  every write.

`findRedirect(payload, { path, locale })` (from `@focus-reactive/payload-plugin-folders/server`)
answers `{ to, status: 301, target, hops }` or `null`. On a localized app a call without `locale`
reads the default locale's rows. A row whose answer is the requested path itself (a stale row of a
folder that sits at the old path again) is skipped, never returned as a loop. One query reads the rows of the path and every
prefix of it in that locale, an exact page row winning over the longest prefix row, and one reads the
target's current path, so a page moved twice redirects straight to its last path. A prefix row
appends the rest of the path to the folder's current one. Without `isLive` it returns the first
answer without checking that anything lives there; give it `isLive(path)` and it follows a dead
answer for at most 3 hops, returning `null` if none is live. A page that sits in a folder costs one
more read than a folder prefix, because its path is composed from its folder's.

## Tree read endpoints

For the admin tree, all of them need a signed-in user and read each collection through its own
`read` access (a collection the user cannot read contributes nothing):

- `GET /api/folders-tree/children?parent=root|<id>&locale=&limit=&cursor=` returns
  `{ items, hasMore, nextCursor, revision }`: the folders and pages inside one folder in tree order
  (by order key, rows without a key after the keyed ones, oldest first), with child counts,
  root-page flags, `status` (`draft`, `published`, `changed`, `live`) and `access` flags per row.
  Titles and paths follow the requested locale with the default-locale fallback. A page of up to
  100 rows across two page collections costs at most 12 database calls.
- `GET /api/folders-tree/search?q=&folder=root|<id>&scope=folder|all&locale=&types=&status=&limit=`
  returns `{ items, truncated }` ordered by full path (`truncated` below). Words are ANDed, `"a phrase"` is matched exactly, and a
  word equal to a page type's label (`article`, or `folder`) limits the results to that type. The
  scope is the folder's subtree by `ancestorIds`.
- `GET /api/folders-tree/ancestors?collection=&id=` returns `{ folders }`, root first.

The `access` flags are asked once per collection with no `id`, the way Payload asks for a bulk
operation, so a host whose rule depends on the document has to return a `Where`.

Costs beyond the 12 database calls of a user whose access answers `true`:

- A collection whose `update` access returns a `Where` costs one more query for the page: the
  `Where` is matched against the page's ids once, and `update` and the publish question share it
  when they return the same `Where`. A page of folders and two page collections that all answer
  with a `Where` costs at most 12 + 3 calls. Whatever queries the host's own access functions run
  (a role that looks up its folder subtree, for example) come on top, once per question.
- Child counts read the children of every folder on the page in one query per collection. When a
  collection has more than 5,000 such rows on the page, that read is dropped and the folders are
  counted with one `count` query each instead, so a page of 100 folders holding 1,000 pages each
  costs 100 cheap count queries and not 100,000 rows. Counts stay exact either way.
- `search` reads at most 500 candidates per collection. When a collection has more, the answer has
  `truncated: true` and the list may miss matches; narrow the search. A `status` filter is applied
  in the query where the main row decides it (the default locale), so the cap is not spent on pages
  that cannot match.
- A page whose folder the user cannot read comes back with `fullPath: ""`, `depth: null` (the
  `depth` of a `TreeItem` is `number | null`) and no `ancestorIds`: its place in the tree is not
  theirs to know, and none is invented.

## Admin tree view

The folders collection's list view (nav label "Content") is a tree: folders and pages with their
full paths, status dots, type labels and child counts, folders opening lazily with 100 rows per
request and a "Load 100 more" row. A page opens its edit view on click. The plugin registers the
view as `@focus-reactive/payload-plugin-folders/rsc#TreeViewServer`, so after installing or
updating the plugin run `payload generate:importmap` (Payload does it on startup in development).
`admin.treeView: false` keeps Payload's own list of folders.

Every tree on the page reads one shared store (`src/admin/store.ts`) that polls
`GET /api/folders-tree/revision` every 10 seconds and when the tab regains focus, and reads the
folders on screen again when the number changed. The store also applies a move to its rows before
the server answers and puts them back if the request fails (used by drag and drop, a later group).

The plugin's strings live under the `foldersTree` namespace of `config.i18n.translations`, in
English and German. A host that sets the same keys for a language keeps its own.

## Dev seed

`npm run seed` fills the dev app's database with a small site in English and German: a site root
page, `blog` (`aktuelles` in German) with a root page and an Article-only `2026` folder, `products`,
`shoes/running` (built under `products`, then moved to the top level with `moveItems`), `about`
(renamed to `company` with a folder update, so `/about/contact` redirects to `/company/contact`), an
empty folder, a draft page and a published page with a newer draft, and a user for each role
(`dev@payloadcms.com` as admin, `editor@example.com`, `drafter@example.com`, `limited@example.com`,
all with the password `test`). `SEED_LARGE=1 npm run seed` also adds 2,000 pages to an `archive`
folder (`SEED_LARGE=500` adds that many). Running it again changes nothing. The content is
synthetic. It refuses to run with `NODE_ENV=production`, or when `DATABASE_URI` is set to anything
but a `file:` SQLite database, because it creates users with a known password.

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
  `req`, inside a tree write, opens its own transaction and waits for the lock its caller holds,
  while the caller waits for it. The plugin cannot tell this from an ordinary second writer, so it
  cannot fail faster than the 30 second lock timeout; the error then says "Timed out after 30000
  ms waiting for the folder tree lock" and names the cause, and the outer write rolls back. Always
  pass `req` to nested Local API calls, as a shallow copy (`req: { ...req }`) if the nested call
  would change the caller's `context` or `locale`.
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
