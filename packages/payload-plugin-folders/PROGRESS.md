# Folders plugin (Payload 4) - build progress

Build lead log for the agent-built first version (29 Oct - 6 Nov 2026). Inputs: the internal
spec, ticket list and spec review for this plugin, kept outside this repo.

This file replaces the tickets' `BUILD-STATUS.md`: every failing or blocked ticket is recorded here.

---

## 1. Spec and ticket review before ticket 1

The revised spec and tickets were not re-reviewed after the devil's advocate pass, so the build lead
read both end to end first. Each item: what is wrong or missing, then the decision and why.

### Contradictions fixed in this branch

1. **Status file name.** The tickets write failures to `BUILD-STATUS.md`; the build-lead brief says
   `PROGRESS.md`. Decision: `PROGRESS.md` only (this file), and P-56 reads it.
2. **Failure rule.** The tickets say "if a ticket cannot pass, commit what exists and continue"; the
   brief says done needs `check.sh`, the tester's screenshot and the reviewer's "done", and a ticket that
   fails review twice is `BLOCKED`. Decision: the brief's rule, because it is the newer, stricter one.
3. **The localized-write grep test contradicts the folder writes.** P-09's unit test fails on any
   `db.updateOne` carrying `slug` or `name`, but spec §5.2 step 6 writes folder rows with `name`,
   `slug` and `fullPath` for every locale. Decision: the test covers page collections only; folder
   writes are allowed when they carry every locale, and P-12 adds the case "en values survive a de
   rename" to prove it. The rule exists for versioned pages, where a partial write deletes locales.
4. **Prefix query by path over-matches.** Spec §3.4 offers `where[folderPath][like]=/blog/` as
   Storyblok's `starts_with`. Drizzle's `like` is `%word%` per word, so it also matches
   `/archive/blog/x`, the same bug the Sanity review found in GROQ `match`. Decision: the README and
   `getAllPaths({ under })` use only `folder` plus `folder.ancestorIds contains /<id>/`, which is exact
   because ids are slash-delimited. The `like` recipe is dropped.
5. **Who is an admin for repair.** Spec §9 defines admins as users passing `folders.access.update`
   and `access.move`; with the defaults (`Boolean(req.user)`) every editor passes, yet P-51 expects an
   editor not to see "Rebuild full URLs". Decision: add `access.repair?: (args: { req }) => boolean`,
   defaulting to the spec's rule; the dev app sets it to the `admin` role.
6. **Dev roles.** Spec §11.3 lists `admin`, `editor`, `drafter`; P-20 also needs `editorLimited`.
   Decision: the dev app has all four.
7. **`payload run` acceptance (P-29).** `npx payload run dist/bin/repair.js` does not get
   `PAYLOAD_CONFIG_PATH` from the npm scripts. Decision: a `repair` npm script that builds and sets the
   env; P-29's acceptance calls `npm run repair -- --dry-run`.
8. **`check.sh` is not in the tickets.** The brief requires it first, with a browser smoke test of
   the admin "with the tree", but the tree view lands in P-33. Decision: `check.sh` comes with P-01;
   its smoke test loads `/admin` and the folders collection, and from P-33 on it asserts the tree.

### Gaps decided by the build lead

9. **Holding the tree lock across Payload hooks.** Folder creates and slug edits run inside Payload's
   own update operation, so `withTreeLock` cannot be "the first statement of the transaction", and a
   mutex taken in `beforeChange` has to be released after commit, which no single hook sees. Decision:
   the plugin-owned operations (move, repair, duplicate, delete, batches) use `withTreeLock` as
   specified; hook-driven writes (create, folder update) take the mutex in `beforeValidate`, update the
   tree-state row in `beforeChange`, and release in `afterOperation` and on error. P-06's "20 parallel
   creates" case on SQLite and Postgres is the proof; if it fails, creates move to the plugin endpoint.
10. **Draft conflict "warning".** Spec §2.6 says a draft save that conflicts is a warning shown in the
    edit view, but a Payload hook can only pass or throw. Decision: draft saves pass on the server; the
    warning is computed by the edit-view field (P-47) through `check-segment` against latest versions.
11. **`pathSegment` with `access.update: () => false`.** Field access strips incoming values before
    hooks; whether the field's own `beforeChange` hook can still set it on update is unproven.
    Decision: P-05/P-08 test it; if access blocks the hook, `pathSegment` drops field access and the
    structure guard overwrites any incoming value instead.
12. **Folder subtree writes and locales.** Whether `payload.db.updateOne` on folders accepts every
    locale at once is unproven. Decision: P-12 may use per-locale Local API updates with
    `context.foldersInternal` instead (folders are unversioned, so this is safe); the "en values survive
    a de rename" case decides.
13. **Admin login for testers.** The brief says the local admin needs no stored login. Decision: the
    dev config uses `admin.autoLogin` with the seeded admin user when `NODE_ENV !== 'production'`.
14. **Tester screenshots for server-only tickets.** P-02 to P-32 have no editor action of their own.
    Decision: the tester screenshots the stock admin showing the effect where one exists (a folder's
    full path in the folders edit view, a moved page's folder, a redirect row); pure library or test-only
    tickets (P-02, P-04, P-16 to P-18, P-53, P-55) record the acceptance output instead, noted per ticket.
15. **Screenshots in a public PR.** Decision: committed under `screenshots/` in the package so the draft
    PR can link them; flagged in the PR body for removal before any merge. (Done in review P-40 on
    `feat/folders-agents`: the 445 files, 27 MB, left git. The 9 the README shows moved to
    `docs/images/`, 684 KB; the rest are kept outside git by the session owner, so the
    `screenshots/` paths in the ticket log below are no longer in the repo.)
16. **Pre-push hook.** `lefthook` runs `bunx turbo run check-types` over the whole repo on every push,
    and `--no-verify` is forbidden. On a fresh worktree it fails in `apps/dev` and
    `apps/multi-tenancy-demo` until the workspace packages are built once
    (`bunx turbo run build --filter='./packages/*'`), because their types come from `dist/`. Built once
    on 29 Oct; the push then passed.

17. **Stopping servers.** `pkill` and `killall` are banned, because they match other sessions'
    processes. Every server an agent starts writes its PID to `.run/<name>.pid` and is stopped with
    `kill` on that PID only. Every developer and tester prompt carries this rule. From G10 the stop
    is `kill -- -<pid>`: `echo $$` followed by `exec npm` makes npm the group leader, and a plain
    `kill` on npm can leave the Next server listening.
18. **Deleting scratch folders.** An `rm -rf` on a command substitution (`rm -rf "$(cat file)"`) stops
    on a permission prompt that unattended runs cannot answer, and it stalled G2 for two hours. Every
    agent reads the path first with `cat`, then deletes the folder by its literal path. Every developer,
    tester and reviewer prompt carries this rule.
19. **Locale fallback for page segments is resolved in the query, not stored (G3, overrides spec
    §3.2's "store the effective segment for every locale" and P-09's per-locale refresh).** The G3
    review showed that storing fallback segments fails on two counts:
    - With `localizeStatus` (the beta.5 default for drafts plus localized fields), an en publish
      rebuilds the main row from published locales only, so an unpublished de segment becomes null and
      the de stock query finds nothing.
    - Writing a fallback segment creates a de locale row, which breaks collections with a required
      localized field and no drafts (NOT NULL), and makes de read a field's `defaultValue` instead of
      falling back to en.
    Decision: `pathSegment[locale]` holds only the page's own segment, or null. Every lookup by
    segment uses one exported query helper that matches `pathSegment = X`, or `pathSegment` absent and
    `pathSegment.<defaultLocale> = X` (a locale-qualified path, `payload/dist/database/getLocalizedPaths.js:98-102`).
    The README documents the helper and the raw `where` for REST. P-09's grep test still applies.
20. **Move conflicts count published pages only (G6).** Spec §5.4 says a move checks conflicts
    "against main rows", which includes draft-only pages, while §2.6 lets two drafts share a segment
    and only blocks publishing it, and G4's publish check and root-page check are published-only. The
    G6 planner mixed them: segment conflicts counted drafts, root-page conflicts did not. Decision:
    both move checks count published other pages only, the same rule as a save, so a move never
    blocks on another page that a save would ignore; the publish-time check still stops the second page
    going live. The moved page itself counts even as a draft, because it could never publish at that
    URL; the root-page rule behaves the same way.
21. **Shell commands are written out literally (G7).** A `bash -c` whose script comes from a variable,
    or a command built in a shell function, stops on a permission prompt that bypass mode does not skip.
    The G7 tester waited 15 minutes on one. Every agent writes each command in full, one per line.
    Every developer, tester and reviewer prompt carries this rule.
22. **Legacy uppercase page segments (G7).** Spec §2.6 keeps a segment saved before the plugin until it
    is edited, so a legacy page reads `/About`, while spec §3.1 makes URLs canonical lowercase and
    folder paths are always lowercased. Case-insensitive checks in every segment query would need a
    superset query plus an in-memory filter on each lookup, for data that exists only until repair.
    Decision: the reserved-root check compares lowercased (G7); P-29 verify lists uppercase legacy
    segments as drift and repair lowercases them, with a redirect from the old URL; until repaired, the
    P-31 resolver tries the exact path, then the lowercased one. Uniqueness stays case-sensitive, so a
    legacy `/About` next to `/about` is a known state that verify reports.
23. **A folder rename that changes live URLs needs publish rights (G8).** Spec §9 gates a move on
    publish rights when a published URL changes, but says nothing for a rename, which changes the same
    URLs. Decision: the folder save hook and the rename preview ask the same publish question
    (`update` with `_status: 'published'`) for the published pages beneath the folder, once per
    collection and folder, the same rule as a move. A drafter can still rename a folder with only
    draft pages beneath it. Extends decision 5: `canRepairTree` calls `access.move` with an empty
    item list, so a host gate written as `items.every(...)` passes for everyone; the README says so,
    and P-29/P-51 rely on `access.repair` for the repair button.
24. **A locale served through fallback counts as published (G8, for P-21).** Under decision 19 an
    en-only published page is live at its de fallback URL when fallback is on. Decision: when a move or
    rename reports URL changes, locale L counts as published when its own status is published, or
    when it has none, fallback is on and the default locale is published. P-21 writes redirect rows
    for those URLs; P-31 resolve must serve them the same way.
25. **`findRedirect` to a page in a folder takes 3 reads (G9, P-21).** Spec §5.6 promises two
    indexed queries "in the common case". A folder-prefix answer takes 2, and a test pins that. A
    page answer takes a third read, because the page's `fullPath` is composed from its folder at read
    time. Accepted: avoiding it would mean storing the page path, which the spec rules out. P-31 may
    revisit if the resolver budget needs it.
26. **Tree read shapes beyond spec §10.2 (G9, P-25).** A page in a folder the user cannot read comes
    back with an empty `fullPath`, `depth: null` and no `ancestorIds`, never an invented root path.
    Search answers `{ items, truncated }`: `truncated` is true when any collection had more
    candidates than the 500 it reads. When there are more than 5,000 child rows in one collection,
    child counts switch to one `count` per folder. The admin tree (G10+) must handle a null depth and
    show the truncated state.
27. **Move after a sibling carries the folder the caller saw it in (G11, P-39).** Spec §5.6's
    `after: ItemRef` gains an optional `expected: { parentId }`. Under the tree lock the server reads
    the anchor's current folder and answers 409 `stale` (preview: `ok: false`, stale block) when it
    differs; omitting it compares nothing, so Local API callers keep working. The admin sends it on
    every `after` request, Undo included, because Undo otherwise put an item after its old sibling
    wherever that sibling had moved since. G12 drag and drop sends it too. Other G11 calls: a plain
    click on a row toggles it while Cmd/Ctrl click on the name opens a new tab (spec §7.2 and P-36
    read differently); Undo restores the position, not the exact order key (§5.7), runs one request
    per source group and reports a partial undo as "Moved N of M items back" rather than one atomic
    inverse move; Duplicate in the toolbar follows `update` access, so P-46 must check `create`.
28. **Drag and drop shape (G12, P-42).** The whole row is the drag handle (5 px activation; checkbox,
    chevron and buttons excluded), not the separate handle column of spec line 775, because G10 built
    no handle column; P-44 decides whether keyboard users need a focusable handle. The bottom quarter
    of an open folder means `after: folder`, so its line is drawn under the folder's last open row,
    which can sit off screen in a large folder; this is the spec's letter, revisited in P-44.
    Dragging an unticked row carries that row only; a ticked row carries the selection. The reason
    a drop is refused rides on the drag overlay because the tree's overflow clips anchored tooltips.
    Access is not a client-side invalid target (spec §7.3 does not list it): a drafter learns about a
    published URL change only from the refusal dialog after the drop.
29. **Context menu, Move mode and create (G13, P-37, P-38, P-41).** Menu items whose dialogs come in
    later groups (Settings, Duplicate, Publish/Unpublish, Delete, Unset root page) are left out
    through an item registry those groups extend, rather than shown as stubs. Open on a folder expands
    it until zoom (P-35). Create entries need folder `update` access because tree rows carry no
    `create` flag; the server still decides. View page uses a new `GET /api/folders-tree/preview-url`,
    because `admin.previewUrl` is a function that cannot reach the browser. Set as root page re-reads
    the page before a live save and saves a draft when a newer draft exists, so an unreviewed draft is
    never published; on a draft it saves `?draft=true` without a confirm; its confirm has no redirect
    checkbox because REST cannot opt out. A page save that changes a live URL (root flag, published
    state, or any locale's effective path) now bumps the tree revision, inside the save's lock and
    transaction. Move mode shows a refused marker's reason as inline text, not the tooltip of spec
    §7.4, because the tooltip covered the folder name it explained; markers use one roving tab stop;
    Move mode ends after a successful move and stays on after a refusal or cancel. Create requests
    send no `locale`, so they write the default locale.
30. **Settings drawers, edit-view fields and the root flip (G14, P-40, P-47).** The plugin's partial
    saves that touch `isFolderRoot` (Set as root, Unset root, the page-settings live step) send the
    `updatedAt` of the latest version they just read as `?frFoldersIfUpdatedAt=`; under the tree lock
    `beforeValidate` refuses the save in either direction when the latest version has changed since,
    and the admin offers "Save as draft instead". A save without the marker, which includes the edit
    view's full-form Publish, is not checked, because it publishes exactly what the editor sees; a
    first heuristic that refused any live flip over a newer draft blocked ordinary publishes and was
    replaced. The edit view warns on a draft root-page clash through a new `GET
    /api/folders-tree/check-root` and disables the root box when the folder has another root. Folder
    renames confirm with the count of redirect entries instead of a redirect checkbox, as in decision
    29. Location crumbs link to the tree with `?folder=<id>` until zoom (P-35). The location field
    replaces the folder picker only for a saved page. F2 opens Settings for the focused row, not in
    text fields or with a modifier held. Drawers in a locale where the item has no own value show the
    default-locale value as a placeholder and write nothing for a field left alone.
    (Superseded in part by decision 41: folder renames now show the redirect checkbox.)
31. **Frontend API and locales (G15, P-24, P-31, P-32).** `resolve`, `tree` and `paths` allow
    anonymous reads: spec §10.2's "authenticated by the usual cookie or header" says how the user is
    read, and §9 describes anonymous output; the other tree endpoints still need a user. `draft: true`
    counts only for a signed-in user or `overrideAccess`. A case difference, a capitalised folder part
    and repeated slashes redirect to the canonical path; a trailing slash and a missing leading slash
    resolve in place (P-31 requires it; the URL form of answers: decision 42); a legacy segment such as `About` answers at its own case
    under a lowercase folder path (decision 22). A redirect is answered only when its target is live
    for the same reader. Unknown locales give 400. `getTree` and `getAllPaths` take `user` and
    `overrideAccess` (§9). `getTree` lists a folder's root page also as a child with `isFolderRoot`,
    hides a folder with no page the reader can see beneath it, honours `includeEmptyFolders` for a
    signed-in reader only, and caps `depth` at 20. The `paths` endpoint pages in the database, ordered
    by collection then id rather than by path (the path is composed after read), and with
    `locale=all` its `limit` counts pages, not rows; `getAllPaths` builds the whole list in path
    order. GraphQL `alternates` is a list of `{ locale, path }`. Answers carry `Vary: Cookie,
    Authorization`, plus `Cache-Control: private, no-store` for a signed-in or draft read. Create
    dialogs in a non-default locale write the typed name and slug into that locale and the default
    locale in one request, because a folder needs a default-locale name and slug; this supersedes
    decision 29's "create sends no locale". A page may be live in one locale only: each live locale
    needs an effective segment, its own or the default locale's live one through fallback, and the
    default-locale segment is required only when a live locale falls back to it. This relaxes G4's
    rule, which refused a de-first publish with the wrong message, and segment uniqueness now counts
    live locales only, matching decision 20.
32. **Batches, duplicate, publish and delete (G16, P-22, P-26, P-27, P-28, P-46).** An operation
    above `maxSyncDocuments` is stored in `folder-operations` and stepped 200 documents at a time,
    each step in a transaction under the tree lock. Only the user who started it may step it or
    abandon it (`POST /folders-tree/operations/:id/abandon`, for a failed run), and each user reads
    only their own records. Publish and unpublish run page by page through a normal update, so G4's
    `bulkUpdateGuard` still applies (G4 carry-over); collections without drafts are listed as always
    live and skipped (spec §7.5). Duplicate writes drafts placed on top with a `-copy` segment, copies
    folders deep with `allowedTypes` and `lockSubfolderTypes`, and turns a copied root page into a
    non-root draft. A copy into its own folder is allowed, as spec §7.10 asks no refusal, and is
    planned from a snapshot, so it cannot recurse. A stepped duplicate stores the dialog's locale.
    Delete is soft only when every affected collection has trash on, decided once at the start; a
    permanent delete also removes trashed descendants and counts them. Delete counts include rows the
    user cannot read: only numbers leak, and the sample is filtered by read access. Above 10 pages the
    user types the confirm word; a REST delete of a non-empty folder is 409. Every refusal carries the
    full `count` and the first 50 `items` (the publish refusal's list moved from `refused` to
    `items`), and the delete refusal asks access per document so the count is exact. The Duplicate
    entry reads create access from `useAuth` permissions and accepts both `true` and Payload's
    `{ permission: true, where }`.
33. **Verify, repair, zoom and banners (G17, P-29, P-35, P-51).** `verifyTree` reads everything and
    writes nothing; `repairTree` re-reads under the tree lock and fixes the whole tree in one
    transaction, not in batches, because cycle breaking, the order of path writes and lowercase
    conflicts need one consistent pass; a very large site should run the CLI (`npm run repair`, or
    `npx payload run dist/bin/repair.js`), and the dialog warns when the writes exceed
    `limits.maxSyncDocuments`. Repair fixes a capitals-only legacy segment to lowercase with a page
    redirect row, backfills a missing `pathSegment`, and writes those fixes into the latest version
    too, keeping a draft's own different segment. Conflicts are listed, never fixed: a page with a
    saved segment that another page claims, a folder whose new path a folder or a live page holds
    (with everything beneath it), a folder whose segment is reserved at the top level, and a second
    tree-state row. Pages with no saved segment that share a slug are backfilled, oldest first, so
    the install flow is "run repair, read its conflict list". Quick verify (one folders query) is for
    any signed-in user and carries `canRepair`; only users who can repair get the issue list. The
    drift banner shows while quick verify finds fixable problems, re-checked on load and whenever
    the tree revision changes. Zoom is `?folder=` with `pushState`; expanded folders come from
    `?expanded=` first, then the tab, then the `foldersTree.expanded` preference. Every folder row can
    be expanded, so an empty folder shows its "This folder is empty" row. Breadcrumbs are drop targets
    and, in Move mode, Move here targets.
34. **Keyboard, search, sidebar tab, locale display and large trees (G18, P-44, P-45, P-48, P-49,
    P-50).** The tree has one tab stop (roving tabindex) and the spec's key table. There is no
    keyboard dragging: Move mode, Alt+Up/Down, cut and paste and Move to... reach every drop spot, so
    dnd-kit's KeyboardSensor was removed. Alt+Up/Down presses within 800 ms make one move; presses
    still waiting when the editor leaves the tree are sent, and a move that would need a
    confirmation is dropped with its rows put back. Search waits 300 ms, keeps `?q=` and
    `?scope=all` in the address, and `/search` returns a `folders` map read through folders access.
    The Tree tab registers through `admin.components.sidebar.tabs` (slug `folders-tree`), renders
    only while it is the active tab, always shows the whole tree, and shares the tree view's store
    and open-folder list. With both trees on one page each workspace opens its own dialogs (a
    `useId` slug suffix), and Escape, `/` and undo answer in the workspace that holds the focus, else
    the one focused last, else the tree view, else the tab when it is alone. A fallback chip shows
    where the viewed locale has no value of its own; a field that is not localized counts as every
    locale's own. The default folder labels are `{ en, de }` records. Above 300 displayed rows the
    tree draws only the visible ones (`@tanstack/react-virtual` 3.14.21) and keeps the tab-stop row,
    the Move mode marker and the grabbed row mounted; at 300 or fewer the DOM is unchanged. Focus that
    falls to the page when the tree switches between the two goes back to the active row, and Load
    more keeps focus and then moves it to the first new row. The dev app offers German behind
    `FOLDERS_ADMIN_GERMAN=true`.
35. **The plugin-redirects mirror and the frontend example (G19a, P-23, P-52).** With
    `redirects.mirrorToRedirectsPlugin: true` every changed published page path also writes a
    plugin-redirects row: `from` is the old path with the `urls.localePrefix` prefix (capitals kept),
    a `reference` target when the collection is in the redirects plugin's `collections`, else a
    `custom` URL of the prefixed new path; a folder rename writes one row per page, because the
    redirects collection has no prefix form. Rows whose `from` is now a live path are deleted after
    every write. A change by a signed-in user above `limits.maxSyncDocuments` queues a
    `mirrorRedirects` operation (decision 32's runner); the step drops rows whose `from` became live
    and skips a row changed after the operation was queued. A change with no user (Local API with
    `overrideAccess`, seeds, `repairTree` and the CLI) writes every row in the change's own transaction,
    because nobody could step an ownerless operation. A delete or trash writes no row and removes
    reference rows to the document and custom rows to its current paths; a later move repoints
    custom rows aimed at the vacated path, host-authored ones included. Writes go through the Local
    API with `overrideAccess`, so host hooks on the redirects collection run. The resolved options,
    tree lock runtimes, operation handlers and snapshot maps live in a `Symbol.for` registry on
    `globalThis`, because Next's route layer imports a second copy of the plugin and the server
    helpers otherwise threw "plugin not active" on a page. The dev frontend answers 308
    (`permanentRedirect`, the only option in a page), and its public read access uses the exported
    `buildLiveInLocaleWhere`, because Payload's usual `_status equals published` read is evaluated in
    the request locale and hides pages that are live in a locale through fallback.
    (Corrected in G19b: the no-user rows are written in the change's own transaction, through
    `createNestedRequest`, not each in a transaction of its own.)
36. **README, its check, CI and the Postgres run (G19b, P-53, P-54, P-55).** The README is written
    for a host developer and carries every README item from the carry-over lists; options that are
    internal (`setTreeLockTimeoutMs`, the per-request rename marker) stay out. `scripts/check-readme.ts`
    compiles every ts/tsx block against the package's real types and checks relative links, and runs
    in check.sh after typecheck; `tests/int/readme-recipes.int.test.ts` reads the REST column of the
    README's stock-query table and runs each row, so a wrong row fails a test. The pull-request
    workflow (`.github/workflows/payload-plugin-folders.yml`) runs typecheck, the README check, build,
    unit and SQLite int in one job, Postgres int against a `postgres:17` service in a second, and the
    browser tests in a third, with every action pinned to a commit. Lint is left out as a cost choice
    (it needs the root bun install) and perf because shared runners make timing budgets flaky; both
    run in check.sh. `tsx` is declared as a devDependency. P-53: all 46 int files run on Postgres
    (597 passed, 5 skipped, also against a stock Postgres 17 with `max_connections` 100); each skip
    needs SQLite without transactions or a SQLite-only state, and its reason sits beside its `skipIf`
    or its runtime `skip()` (`verify-repair.int.test.ts:659`, `move.int.test.ts:1071`, the
    `order-keys.int.test.ts:449` describe, `folder-rename.int.test.ts:631`). Deviation from spec
    section 3.4: `afterPathChange` fires for folder updates, moves, deletes and repair only; the
    `create`, `publish` and `rootToggle` reasons are in the type but never sent, so a plain page
    publish reports nothing. The README says so first. Fixing it means sending them from the page
    hooks or removing the three values from the type. (Fixed by decision 41: the page hooks now send
    `create`, `publish` and `rootToggle`.)
37. **Final re-review of G8: access before content, and no names of unreadable pages (P-19, P-20).**
    A move asks the publish question in its first access pass, before any type, path or root-page
    conflict is read, and a folder move asks it for the pages beneath right after they are read, so a
    caller refused on publish rights gets 403 and learns nothing about other pages. The publish
    question goes as `update` with `{ _status: "published", folder }` and no `orderKey`, because the
    order key is not known in the first pass (spec section 9 lists `orderKey`; the late `update`
    question still carries it, and the dev roles and the README recipe read only `_status` and
    `folder`). Conflict messages in check-segment, move, move preview, rename preview and the root-page
    conflict name a page only when the caller may read it (`createConflictNamer`), else "a page".
    Preview samples and the items listed in delete and publish refusals hold only readable documents;
    the counts stay whole. The dev drafter may not create or update posts, a collection without drafts
    whose saves are always live: the plugin gates its own structural writes, and a stock save is gated
    only by the host's `update` and `create` access, which the README tells hosts to set the same way.
38. **Final re-review of G3: the plugin falls back to the default locale only (P-08, P-09).**
    A locale whose `fallbackLocale` is another locale (`{ code: "de-at", fallbackLocale: "de" }`)
    gives a read path that resolve and the stock query do not match, because stored folder paths,
    `locale=all` reads and `buildSegmentWhere` all fall back to the default locale. Following each
    locale's own chain would touch every path read and the mirror, so v1 keeps the default-locale
    fallback, warns at startup when any non-default locale falls back elsewhere (a list form warns
    too), and states it as a README known limit. A `locale=all` read applies the default-locale
    fallback even with fallback off; that is a README limit as well.
39. **Final re-review of G4: save refusals hide unreadable pages, and a create starts at revision 0
    (P-10, P-11).** Decision 37 now covers the save hooks too: a page save refused for a taken
    segment or root place names the holder only when the caller may read it or overrides access,
    else "a page" or the hidden-root message (`createSaveConflictDescriber`). A collection
    `beforeValidate` hook is not told `overrideAccess`, so a field hook on the segment field records
    it per request just before the collection hooks run (`src/hooks/pages/overrideAccessMark.ts`),
    and a missing mark counts as not overridden. A page create stores `structureRevision` 0 whatever
    the request sends. A page in the trash keeps its URL and root place until it is deleted for
    good, so a restore never collides; the README says so instead of re-checking on restore.
40. **Final re-review of G9: one redirect row per path and kind (P-21, P-25, P-30).** Spec section
    5.6 lets an exact page row and a folder's prefix row sit at one old path (the page row wins, the
    prefix row covers the paths beneath), so `lookupKey` is no longer unique on its own: a compound
    unique index on `(lookupKey, kind)` replaces it, and `writeRedirectRows` upserts by key and kind.
    Before this, a page that took a renamed folder's old path and then moved or changed its slug
    overwrote the prefix row, and every old URL beneath the folder stopped redirecting. Deleting a
    URL history row is a repair-level act and takes `canRepairTree` (decision 5); read stays open to
    signed-in users as spec section 9 lists it. (Superseded by decision 41: delete is open to any
    signed-in user, as the spec says.)
41. **Code review fixes on `feat/folders-agents` (review of 4 Nov, one commit per finding).**
    Decisions that changed: P-31 sends `afterPathChange` from the page hooks for create, publish,
    root toggle and a live slug change, and a duplicate (always a draft) sends nothing; this closes
    decision 36's deviation. P-33 lets any signed-in user delete a `folder-redirects` row, so an
    editor can drop a redirect that points the wrong way; this replaces decision 40's
    `canRepairTree` rule. P-38 gives a folder rename the same redirect checkbox as a move, ticked by
    default; the admin's save sends `?frFoldersRedirects=false` when it is unticked, a folder
    `beforeValidate` maps that to `context.foldersRedirects = false`, and only the value `false`
    counts, so it can never switch redirects on; this replaces the count-only confirm of decisions
    29 and 30. P-46 makes a queued delete leave a folder that gained content after the delete was
    planned, finish, and report the skipped folder, instead of failing on every retry. P-04 did not
    hold (a copied root page becomes a non-root draft by design, decision 32), so it is pinned by a
    test, not changed.
42. **URL form (review P-37, the session owner's ruling of 4 Nov).** The plugin adds no
    trailing-slash redirect: the framework (Next.js or Vercel) redirects one form to the other, and
    the plugin redirects only moves, renames, case and repeated slashes. `resolvePath` answers a path
    with or without a slash in place, in either setting, because Next passes route params without the
    slash and a plugin redirect would loop. One option, `urls.trailingSlash` (default `false`), sets
    the form of every URL the plugin hands out: page `fullPath` (virtual, formatted on every read),
    `resolvePath`, `findRedirect`, `getTree`, alternates, `computeFullPath`, `afterPathChange`, mirror
    rows, the preview endpoint, `buildUrl` (when passed `trailingSlash`) and the admin's URL displays
    (through `admin.custom`). Storage stays canonical (no slash): folder `fullPath`, `folderPath`,
    `folder-redirects` rows and `PathChange` inside the plugin, because they are `where` keys and
    are composed by concatenation. The root `/`, a file-like last segment (`feed.xml`) and
    `.well-known` never get a slash, copying Next's rule. After a switch of the option the mirror
    rows keep the old form: verify lists them as `mirrorSlashForm` and `repairTree` rewrites them,
    plain paths only, editor-made rows included, because a plain path in the other form is dead
    behind the framework's redirect. Not read: how Vercel decides what counts as a file extension.
    Sources in `docs/trailing-slash-research.md`. The spec's section 10.1 step 1 (redirect a
    trailing slash) is overruled; the `resolve.ts` doc comment carries the new wording.
43. **Folder slug changes through MCP (review P-36, decided, reversible by the session owner).**
    The spec allows a folder slug change through a normal update, and a REST `PATCH` still makes
    one. Through MCP `updateDocument` it stays refused until the plugin's own agent tools with a
    preview (`previewRename`, `applyTreeChange`) exist, because the stock tool shows the agent no
    changed URLs, languages or redirects, so it cannot ask the user first. No code change. The
    reasoning is in `docs/agents.md` under "The stock `updateDocument` path: refuse loudly".
44. **The loud structure refusal for every caller (review P-02).** The `beforeOperation` hook no
    longer refuses for MCP only. It refuses, with a 400 (`data.reason` `mcp-structure-change`), a
    deliberate edit from every non-internal request that runs field access (`overrideAccess` not
    `true`): REST, GraphQL, a host's own MCP tool, and the Local API with `overrideAccess: false`,
    which is Payload 4's Local API default. Deliberate means a different page `folder` or folder
    `parent`, or a different `orderKey`, that carries no `structureRevision` or one not older than
    the stored one. A missing revision is deliberate, because the admin's form, autosave and folder
    form always send the stored structure with its revision and a script sends none. An older
    revision stays a silent replace, and `null` counts as 0. A folder `slug` change is never refused
    for these callers (decision 43 keeps the MCP-only slug refusal). The Local API with
    `overrideAccess: true` is trusted and keeps `beforeChange`'s own rule. MCP keeps its stricter
    rule and messages. A `structureRevision` sent alone is still dropped silently, because it moves
    nothing. The admin's payload is pinned by `tests/e2e/admin-structure-replay.e2e.spec.ts`. This
    replaces the MCP-only pick in `docs/agents.md`, which now describes both.
45. **Review "After these" fixes (P-07, P-35, P-22, P-05, P-47).** P-22 renames
    `limits.maxItemsPerMove` to `limits.maxItemsPerOperation` (default 500), because it caps the
    selected items of one move, delete, duplicate or publish; a larger request is refused with a 400
    that names the limit, and there is no alias, as the package is private at 0.0.0. P-47: a page
    already in the trash that is deleted for good reports nothing to `afterPathChange` and deletes no
    custom mirror rows, because the trash step did both and a second report would name URLs the site
    had stopped serving; the redirect rows that reference the page and the tree revision bump still
    run, and a custom mirror row written after the trash step stays (it points at a 404 either way).
    P-07: a bottom create finds the largest key with two limit-1 queries per collection (the largest
    key, and whether an unkeyed row exists, since unkeyed rows sort last) instead of reading every
    sibling under the lock. P-05: an empty stored key is skipped when looking for the smallest or
    largest key. P-35: `getSubtreeFolderIds(payload, { folder, req? })` is exported from the server
    entry and includes the folder itself; the optional `req` lets an access function read on the
    request's own connection.
46. **Only the own slug is stored (review P-32, decided, reversible by the session owner).**
    Decision 19 stands: `pathSegment[locale]` holds the page's own segment or null, so a stock query
    for a locale that falls back needs the exported `buildSegmentWhere`. The review read this as a
    deviation from spec lines 46 and 97 (`pathSegment` stores the effective segment, and
    `{ path, locale }` resolves with a plain stock query). The orchestrator kept the code and amended
    the spec instead: on focusreactive-labs main in e1cf2f2a plus a wording fix,
    `projects/folders-plugin/spec/payload.md` lines 44-47, 97-101 and the `pathSegment` row of the
    field table now say own segment or null, with the fallback applied at read time through
    `buildSegmentWhere`. No code change here.
47. **A page with no title (review P-17).** The server keeps one English `untitledTitle`
    ("Untitled", `src/core/untitled.ts`) for its messages and the site tree. The admin swaps it for
    its translated `untitledPage` ("Ohne Titel" in German) where it lists tree rows, so a German
    editor no longer sees an English word in the tree. Refactors P-11 to P-16, P-18 and P-25 merge
    copied helpers into one shared copy each, with no behavior change.

### Owner decisions (from spec/review.md, the spec writer's pick applies)

- D14 Payload 3 port: not in this run; fund it right after v1.
- D19 npm: the package stays `"private": true`.
- D23 MongoDB: refused at config time.
- The four Sanity decisions do not touch this build.

### Scale and order

56 tickets at 134 agent hours, run one developer at a time, will not
all finish by 6 Nov. Decision: tickets run in groups, one developer run, one tester run and one
reviewer pass per group, in this order, so the Storyblok behaviours editors miss (drag and drop, move
with URL update and redirect, root pages) land before polish:

| Group | Tickets | What |
|---|---|---|
| G0 | P-01, P-02, `check.sh` | scaffold, dev app, SQLite and Postgres harness |
| G1 | P-03, P-04, P-05 | options, slug and path utilities, data model |
| G2 | P-06, P-07 | tree lock, order keys, folder paths |
| G3 | P-08, P-09 | page paths, stock queries, fallback segments |
| G4 | P-10, P-11 | structure guard, uniqueness, root-page rule |
| G5 | P-12, P-13 | folder rename subtree, allowed types |
| G6 | P-14, P-15 | move planner and apply |
| G7 | P-16, P-17, P-18 | the three blocker tests |
| G8 | P-19, P-20 | move endpoints, access |
| G9 | P-21, P-25, P-30 | redirects, tree read endpoints, dev seed |
| G10 | P-33, P-34 | admin tree view and rows |
| G11 | P-36, P-39 | selection, move dialog with URL confirm and undo |
| G12 | P-42, P-43 | drag and drop |
| G13 | P-37, P-41, P-38 | context menu, Move mode, create dialogs |
| G14 | P-40, P-47 | settings drawers, page edit-view fields |
| G15 | P-24, P-31, P-32 | locales, resolve, tree helpers |
| G16 | P-22, P-26, P-27, P-28, P-46 | batches, duplicate, publish, delete and their dialogs |
| G17 | P-29, P-35, P-51 | verify and repair, zoom and banners, rebuild action |
| G18 | P-44, P-45, P-48, P-49, P-50 | keyboard, search, sidebar tab, locale display, large trees |
| G19 | P-23, P-52, P-53, P-54, P-55, P-56 | mirror, frontend example, Postgres run, README, CI, PR |

The draft PR opens after G0 and is updated after every group.

---

## 2. Ticket log

One line per ticket: `check.sh`, tester evidence, reviewer verdict, commit.

| Ticket | check.sh | Tester | Reviewer | Commit |
|---|---|---|---|---|
| G0: P-01, P-02, check.sh | pass (5/5 int on SQLite and Postgres, smoke e2e) | `screenshots/g0-admin-dashboard.png`, `screenshots/g0-page-created.png`: auto-login admin, page created and listed | NOT DONE (getPayload cache returned a destroyed instance in a second boot), fixed in `11b43796`, re-review DONE | `f4010d2d`, `11b43796` |
| G1: P-03, P-04, P-05 | pass (43 unit, 19 int on SQLite and Postgres, smoke opens folders) | `screenshots/g1-folder-created.png`, `g1-folder-no-duplicate.png`, `g1-page-fields.png`, `g1-page-in-folder.png`: folder created, no Duplicate, injected page fields, page shown in folder (picked over REST, the picker is P-47) | NOT DONE (derived folder fields, page structureRevision and the tree-state global writable over REST; host slug index dropped; disabled test vacuous), fixed in `d7771fad`, re-review DONE | `8dc3bf5f`, `98a96a0b`, `e259e12b`, `b8994430`, `d7771fad` |
| G2: P-06, P-07 | pass (59 unit, 57 int on SQLite, 55 int on Postgres with 2 SQLite-only skips, smoke) | `screenshots/g2-nested-full-path.png`, `g2-de-full-path.png`, `g2-reserved-refused.png`, `g2-list-order.png`: nested path `/products/shoes/running`, de slug gives `/produkte` while en keeps `/products`, root `api` refused, newest folder first | NOT DONE (the locale write-back left the caller's req marked internal so later writes on it skipped validation; a flaky Postgres test; tree-state row touched after the stored doc was read), fixed in `53404584`, re-review DONE | `aeab7918`, `f7a870e1`, `53404584` |
| G3: P-08, P-09 | pass (62 unit, 82 int on SQLite, 80 int on Postgres with 2 SQLite-only skips, smoke; rerun by the build lead on `8f9272af`) | `screenshots/g3-page-full-path-blog-post.png`, `g3-page-api-folderpath-fullpath.png`, `g3-de-read-follows-rename.png`, `g3-site-root-page-folderpath-null.png`, `g3-stock-query-folderpath-pathsegment.png` and four more: page fullPath `/blog/post`, de follows an en rename, folderPath null at the site root, stock query finds the page; `g3-defect-de-stock-query-empty.png` shows the defect that led to decision 19 | DONE after the final re-review on `cf556df6` (final pass NOT DONE: a per-locale `fallbackLocale` chain gave read paths that resolve and the stock query do not match; plus should-fix: `locale=all` applies the fallback while fallback is off, the README top-level page row lacked the segment clause in a non-default locale; fixed in `6c502f5d`, `b1401613`, `a7804860`, `cf556df6` with decision 38, check.sh passed with 599 unit, 610 SQLite int, 608 Postgres int, 215 e2e; final re-review DONE). Before that, BLOCKED: failed review twice. Pass 1 NOT DONE (an en publish nulled the unpublished de segment; stored fallback segments created de rows that broke required localized fields; fullPath wrong under select), fixed in `045e0d1c` with decision 19. Re-review NOT DONE (a `locale: "all"` write still created a de row, `src/hooks/pages/pathSegment.ts:39`), fixed in `8f9272af` with create and update tests and verified by the build lead with check.sh; no third review ran | `6e1b1788`, `50fefa04`, `045e0d1c`, `8f9272af`, `6c502f5d`, `b1401613`, `a7804860`, `cf556df6` |
| G4: P-10, P-11 | pass (69 unit, 126 int on SQLite, 124 int on Postgres with 2 SQLite-only skips, smoke; rerun by the build lead on `c265eca6`) | `screenshots/g4-a-publish-conflict.png`, `g4-b-draft-save.png`, `g4-c-second-root.png`, `g4-d-reserved-admin.png`, `g4-e-duplicate.png`, `g4-f-version-restore.png`: duplicate URL refused on publish, draft with the same slug saves, second root page refused with the spec message, root `admin` refused, Duplicate gives a `-copy` draft with a fresh key, restore keeps the folder | DONE after the final re-review on `4565639f` (final pass NOT DONE: a save refused for a taken slug or root place named the holder page even when the caller could not read it; plus should-fix: a create kept a sent `structureRevision`, trashed pages keep their URL and are called published; fixed in `e070d8cf`, `99b04bc6`, `4565639f` with decision 39, check.sh passed with 599 unit, 617 SQLite int, 615 Postgres int, 215 e2e; final re-review DONE). Before that, BLOCKED: failed review twice. Pass 1 NOT DONE (restore failed after a rebalance; a de save gave the page its own de slug; publishing every locale and version restore could make a taken de slug live; a draft with no slug could publish), fixed in `c9626f98` with a uniqueness check after the write. Re-review NOT DONE (a bulk update commits despite the check's error; a host afterChange re-save cleared the snapshot), fixed in `c265eca6` (bulk URL-changing updates refused, a snapshot stack per page) and verified by the build lead with check.sh and the new tests; no third review ran | `e47ced94`, `edf14abb`, `c9626f98`, `c265eca6`, `e070d8cf`, `99b04bc6`, `4565639f` |
| G5: P-12, P-13 | pass (69 unit, 166 int on SQLite, 163 int on Postgres with 3 skips, smoke; reviewer reran check.sh on `dd0d93d3`; the developer's first run failed once on Postgres schema pull in `page-paths.int.test.ts`, a file the commit does not touch) | `screenshots/g5-a-team-full-path.png`, `g5-a-page-full-path.png`, `g5-b-team-de.png`, `g5-b-team-en.png`, `g5-c-folder-settings.png`, `g5-c-create-refused.png`, `g5-d-team-locked.png`, `g5-d-team-edit-refused.png`, `g5-d-team-editable-after-unlock.png`: a rename rewrites the subtree's paths and page paths follow, de and en paths after a de rename, allowed types refuse a create, a locked type refuses an edit until unlocked | NOT DONE (refusal message did not follow spec 7.7; a de rename reported paths for descendants with no de row that a read did not return; unlocalized apps got localized write shapes; afterPathChange lost the caller's url, method and context; host localized fields were wiped on rename; smoke regex refused a query string; G2 folder create failed with `localizeSegments: false`), fixed in `dd0d93d3`, re-review DONE | `c483e7f7`, `9c50bda4`, `dd0d93d3` |
| G6: P-14, P-15 | pass (69 unit, 215 int on SQLite, 211 int on Postgres with 4 skips, smoke, on `4b67cec9`; two earlier runs and the reviewer's run failed only on Postgres with "too many clients", the shared test cluster's connection limit, and the touched files pass alone) | `screenshots/g6-a-page-moved-to-news.png`, `g6-a-page-de-path-nachrichten.png`, `g6-b-page-en-path-blog-news-post.png`, `g6-b-page-de-path-blog-de-nachrichten.png`, `g6-b-folder-news-en-full-path-blog-news.png`, `g6-b-folder-news-de-full-path-blog-de-nachrichten.png`, `g6-b-folders-list-en.png`, `g6-move-output.txt`: a page moved into another folder, a folder moved under another folder with every path rewritten in en and de, a cycle refused with nothing written (moves run through `moveItems`, the admin move UI is G11) | NOT DONE (a dotted segment could move to the site root; drafts counted as segment conflicts but not as root-page conflicts; the blocked-move error was named `APIError`; allowed-types blocks capped at 20 items; about 6 reads per moved item; the versions-without-drafts fix untested), fixed in `4b67cec9` with decision 20, re-review DONE | `a805309a`, `c32bc403`, `be929cc9`, `4b67cec9` |
| G7: P-16, P-17, P-18 | pass (69 unit, 241 int on SQLite with 3 skips, 240 int on Postgres with 4 skips, smoke, on `a0ecd369`; the full Postgres suite passed 6 runs in a row after the harness fix) | `screenshots/g7-acceptance-output.txt`: every ticket case by name on SQLite and Postgres, and the concurrency file 3 of 3 runs on Postgres (test-only tickets, decision 14) | NOT DONE (a G7 change let legacy `Admin` and `API` move to the site root; a crossed-move test passed with the lock removed because a deadlock abort counted as a refusal; no concurrent 409 stale test; publish cases never isolated the guard), fixed in `a0ecd369` with decision 22, re-review DONE | `18e1fc3e`, `05913cd2`, `4abd2890`, `ebc2b668`, `5e277ed6`, `2264a0ef`, `a0ecd369` |
| G8: P-19, P-20 | pass (69 unit, 305 int on SQLite with 3 skips, 304 int on Postgres with 4 skips, smoke; rerun by the build lead on `1488c22f`) | `screenshots/g8-a1-admin-move-preview-post-into-news.png`, `g8-a2-admin-move-post-into-news-result.png`, `g8-a3-admin-revision-after-move.png`, `g8-a4-admin-post-folder-news-full-path-news-post.png`, `g8-b1-drafter-move-published-post-403-forbidden.png`, `g8-b2-drafter-move-draft-post-into-news-succeeds.png`, `g8-c-signed-out-revision-403-folders-read-200.png`, `g8-d-check-segment-taken-post-in-news.png`: admin preview, move and revision, drafter refused on a published page and allowed on a draft, signed-out 403, check-segment | DONE after the final re-review on `5c77db46` (final pass NOT DONE: the publish question ran after the conflict checks so a drafter got another page's title in a 409, check-segment and the move and rename previews named pages the caller could not read, and the dev drafter could change live post URLs with a plain save; plus should-fix: preview samples and delete and publish refusals listed unreadable documents; fixed in `ac6bb1f0`, `c0a1e0aa`, `67c608af`, `5c77db46` with decision 37, check.sh passed with 598 unit, 610 SQLite int, 608 Postgres int, 215 e2e; final re-review DONE). Before that, BLOCKED: failed review twice. Pass 1 NOT DONE (access ran after every other check, so a refused user got 409s naming foreign paths and titles; one title read per moved page; a folder move asked access once per page; a drafter could rename a folder over published pages; dev users could raise their own role), fixed in `c6fd83f0` with decisions 23 and 24. Re-review NOT DONE (the override flag for folder saves was kept per request and flipped by nested folder calls; the grouped publish check passed one page's id, so a per-document rule depended on row order; any dev user could delete users), fixed in `1488c22f` (rename check in a `slug` field hook with its own `overrideAccess`, grouped checks without an id, admin-only delete) and verified by the build lead with check.sh; no third review ran | `fdf5b074`, `74c8b6e5`, `c6fd83f0`, `1488c22f`, `ac6bb1f0`, `c0a1e0aa`, `67c608af`, `5c77db46` |
| G9: P-21, P-25, P-30 | pass (70 unit, 375 int on SQLite with 3 skips, 374 int on Postgres with 4 skips, perf p95 11.1 ms on SQLite, smoke; rerun by the build lead on `ff76d14a`) | `screenshots/g9-folders-list-seeded.png`, `g9-folder-redirects-after-seed.png`, `g9-children-blog-and-root.png`, `g9-search-blog-new-year.png`, `g9-ancestors-blog-2026-new-year.png`, `g9-limited-user-children-root-and-blog.png`, `g9-folder-renamed-products-to-catalog.png`, `g9-folder-redirects-after-rename.png`: the seeded tree, its redirect rows, children, search and ancestors JSON, the limited user's access flags, and an admin rename writing a new prefix row; a second seed run changed nothing | DONE after the final re-review on `cdd3aa62` (final pass NOT DONE: a page redirect row written at a folder's old path overwrote the folder's prefix row, so old URLs beneath the folder stopped redirecting; plus should-fix: any signed-in user could delete URL history rows, the README clear rule was not per kind; fixed in `a125aa8e`, `f2657a51`, `25a8add1`, `cdd3aa62` with decision 40, check.sh passed with 599 unit, 621 SQLite int, 619 Postgres int, 215 e2e; final re-review DONE). Before that, BLOCKED: failed review twice. Pass 1 NOT DONE (with unlocalized folders, prefix rows were written per page locale but cleared under the no-locale key, so a new folder at an old path kept redirecting and a rename back gave a self-redirect; decision 24's own-status guard and the tree read Where had no test; plus six should-fix items), fixed in `07f20d96`. Re-review NOT DONE (the new per-folder count fallback sent no locale, a 500 on SQLite and a wrong count on Postgres under a read Where on a localized field; the p95 test failed under parallel files), fixed in `ff76d14a` (count with every locale, p95 in its own perf project, internal limits clamped) and verified by the build lead with check.sh; no third review ran. Decisions 25 and 26 | `a3d78cdb`, `a95cdaad`, `f4f4f439`, `763a35d8`, `07f20d96`, `ff76d14a`, `a125aa8e`, `f2657a51`, `25a8add1`, `cdd3aa62` |
| G10: P-33, P-34 | pass (132 unit, 375 int on SQLite with 3 skips, 374 int on Postgres with 4 skips, perf p95 10.3 ms, 12 e2e; rerun by the build lead on `14375bc8`) | `screenshots/g10-top-level-tree.png`, `g10-blog-expanded.png`, `g10-root-page-icon-tooltip.png`, `g10-products-expanded-changed-page.png`, `g10-empty-folder-no-page-chip.png`, `g10-tree-locale-de-top-level.png`, `g10-tree-locale-de-expanded.png`, `g10-tree-theme-light.png`, `g10-tree-theme-dark.png`, `g10-page-edit-view-opened-from-row.png`, `g10-tree-editor-role.png`: the Content tree with paths, status dots, house icons and no-page chips, in en and de, light and dark, as admin and editor, and a row opening its edit view | DONE after the final re-review on `596f706d` (no fix round: every finding of both earlier reviews holds at HEAD and each fails a test when reverted, the store unit file 33/33 and the tree-renders and tree-rows e2e files 11/11; should-fix items are in the carry-over). Before that, BLOCKED: failed review twice. Pass 1 NOT DONE (the store recorded a revision as seen without refreshing the rows on screen, so a read of another folder, a failed refresh or a Load more click left the tree out of date for good; plus 8 should-fix: counts after rollback, cache across a user switch, raw keys in other languages, duplicate polling, an unchecked teardown PID, type labels in one language, accessibility), fixed in `ee0a1cf7`. Re-review NOT DONE (a poll could set the baseline before the first read; the Load more fix had no failing-on-revert test; a rollback after a user switch wrote the old user's rows; a failing folder made every poll re-read every folder), fixed in `c70ee1d0` and `14375bc8` and verified by the build lead with check.sh; no third review ran | `cddda6c7`, `b183c2c2`, `ee0a1cf7`, `c70ee1d0`, `14375bc8` |
| G11: P-36, P-39 | pass (187 unit, 381 int on SQLite with 3 skips, 380 int on Postgres with 4 skips, perf, 31 e2e; rerun by the reviewer on `da5dbd05`) | `screenshots/g11-three-rows-selected-bulk-toolbar.png`, `g11-move-dialog-products-chosen-live-preview.png`, `g11-confirm-move-url-change-and-redirect.png`, `g11-page-under-products-new-path-undo-toast.png`, `g11-after-undo-team-back-in-blog-old-path.png`, `g11-drafter-move-refused-neutral-message.png`, `g11-dark-theme-move-dialog.png` and nine more: range selection and the bulk toolbar, the folder picker with a live preview, the URL-change confirm with en and de paths and the redirect box, a move with its Undo toast and the Undo result, a drafter refused, dark theme. The tooltip and toast-alignment shots predate the fixes, and `g11-url-history-redirect-rows-for-moved-pages.png` was taken before Payload loaded the Target cells, so it shows `<No Target>` though the rows are correct | NOT DONE (Undo placed an item after its old sibling wherever that sibling now was, a published URL change with no confirm or redirect; plus 8 should-fix: partial undo reported as a failure, wrong child counts after a move into an unopened folder, an untested user-switch guard, the toast action unstyled, picker tooltips over other rows, toast Reload untested, Undo e2e without redirect assertions, a second move dropped silently), fixed in `ceac8048` and `da5dbd05` with decision 27, re-review DONE | `d84c7b3a`, `4139252b`, `7bd07849`, `ceac8048`, `da5dbd05` |
| G12: P-42, P-43 | pass (227 unit, 381 int on SQLite with 3 skips, 380 int on Postgres with 4 skips, perf, 51 e2e, on `bf8b4bbf`; the developer's first run on `b428e879` failed once on a Postgres rebalance test that passed alone 3 times, the known shared-cluster flake) | `screenshots/g12-01a-drag-before-line-on-page-row.png`, `g12-01b-drag-inside-highlight-on-folder.png`, `g12-03a-confirm-dialog-old-and-new-url.png`, `g12-03c-page-edit-view-new-full-path.png`, `g12-05b-three-item-drag-overlay-after-press-kit.png`, `g12-06a-invalid-folder-into-own-child-reason-bubble.png`, `g12-06b-invalid-page-into-posts-only-folder-reason-bubble.png`, `g12-07b-after-escape-and-release-nothing-changed.png`, `g12-11-url-history-after-move-targets-loaded.png` and 19 more: before, after and inside indicators, a reorder that holds after reload, a drop that asks to confirm the en and de URL change and shows the new full path in the edit view, auto-expand, a three-item drag, refused drops with their reasons, Escape, Undo, a drafter, dark and light themes, URL history with targets loaded | DONE on the first pass (no must-fix; 23 mutations, 22 killed). Should-fix items fixed in `bf8b4bbf` and verified by the build lead from the diff and check.sh: a click after Escape opened the page, a second drag could start during the preview read, optimistic order of rows from two folders differed from the server's, Reload cleared unrelated ticks, four test gaps. Decision 28 | `31cb4feb`, `b428e879`, `f2db8c99`, `bf8b4bbf` |
| G13: P-37, P-41, P-38 | pass (312 unit, 392 int on SQLite with 3 skips, 391 int on Postgres with 4 skips, perf, 85 e2e with 1 `test.fixme` for zoom (P-35); rerun by the reviewer on `d602f089`) | `screenshots/g13-01a-folder-menu-create-page-here.png`, `g13-02-contact-menu-set-as-root-disabled.png`, `g13-04b-order-holds-after-reload.png`, `g13-05a-contact-copy-url-toast.png`, `g13-06a` to `g13-06d`, `g13-07a` to `g13-07f`, `g13-09a` to `g13-09i`, `g13-10a` to `g13-10g` and more (53 in all): the folder and page menus with disabled reasons, Move down that holds after reload, Copy URL, Set as root with its confirm and redirect rows, keyboard-only Move mode into another folder, New folder with the segment following the name and a taken segment refused, New page making a draft and opening the editor, the posts drawer, drafter and limited menus, dark and light. Screenshots predate the fix round (drawer redirect, inline marker reasons, red field errors, dialog focus) | NOT DONE (Set as root chose a live save from a stale tree status and could publish an unreviewed draft; saving the posts drawer navigated away from the tree; plus 8 should-fix: page saves that change a live URL never bumped the tree revision, four untested guards, the `M` key in text fields untested, focus lost after Escape, a marker tooltip over the folder name, grey field errors, dialogs focused on the heading, every marker a tab stop), fixed in `27725676` and `d602f089` with decision 29, re-review DONE | `dc38c5a9`, `4102d6d3`, `26c064f2`, `d515e35c`, `27725676`, `d602f089` |
| G14: P-40, P-47 | pass (380 unit, 412 int on SQLite with 3 skips, 411 int on Postgres with 4 skips, perf, 115 e2e with 1 `test.fixme` for zoom (P-35), on `ece7488c`; the reviewer reran unit, SQLite int, the new int files on Postgres and the G14 e2e files) | `screenshots/g14-01-folder-settings-drawer.png`, `g14-02-folder-rename-confirm.png`, `g14-03-lock-confirm.png`, `g14-04-locked-subfolder-readonly.png`, `g14-05-page-settings-url-hint.png`, `g14-07-unroot-dialog-prefilled.png`, `g14-09-page-edit-sidebar.png`, `g14-10-page-edit-url-history.png`, `g14-11-breadcrumb-zoomed-tree.png`, `g14-12-draft-conflict-warning.png`, `g14-22-page-settings-root-refusal.png`, `g14-34-edit-view-after-move.png`, `g14-fix-save-as-draft-toast.png`, `g14-fix-locked-note.png` and more (45 in all): folder and page settings drawers, rename and lock confirms, locked subfolder fields read-only, the un-root dialog, the edit-view location breadcrumb, full path and URL history, the draft conflict warning, the "Save as draft instead" refusal, F2, Move... from the edit view. View page untested because the dev app sets no `admin.previewUrl`. Screenshots before `g14-fix-*` predate the fix round | NOT DONE (the segment chosen in the edit-view un-root dialog could revert to the stored slug and publish a URL nobody chose; the root-flip check refused ordinary edit-view publishes; no warning or disabled box for a second root page; the server's root-flag message hidden behind a generic toast; plus 5 should-fix: Unset root had the same stale-read race, the un-root dialog froze the folder before it loaded, the URL hint compared against the draft, drawers could not save in a fallback locale, a rename with a parent change was half-applied), fixed in `620527bf`, `49927ff2`, `d92c476b` and `ece7488c` with decision 30, re-review DONE | `4375da7a`, `a3191bc4`, `2ea5fd0e`, `f59b785a`, `620527bf`, `49927ff2`, `d92c476b`, `ece7488c` |
| G15: P-24, P-31, P-32 | pass (389 unit, 465 int on SQLite with 3 skips, 464 int on Postgres with 4 skips, perf, 116 e2e with 1 `test.fixme` for zoom (P-35), on `fd4f3dad`; the reviewer reran the four G15 int files on SQLite and Postgres, typecheck and lint on `bca2434e`) | `screenshots/g15-01-resolve-blog-admin.txt` to `g15-15`, `g15-20-graphql-foldersResolve-admin.txt`, `g15-21-graphql-foldersResolve-anonymous.txt`, `g15-30-tree-en-admin.txt` to `g15-39`, `g15-40-odd-input-admin.txt`, `g15-50-browser-resolve-de-page.png`, `g15-52-browser-tree-de.png`, `g15-55-graphql-playground-foldersResolve-de.png`, `g15-57-browser-anonymous-tree-draft-flags-ignored.png`, `g15-61-admin-new-folder-dialog-de-locale.png`, `g15-62-admin-after-create-de-folder.png`, `g15-68-browser-resolve-redirect-after-admin-rename.png` and more (68 in all): resolve with trailing slash, case redirect, site root, translated de paths, redirects after rename and move in en and de, never-published pages hidden from anonymous readers, GraphQL anonymous and signed in, tree and paths per locale with alternates, anonymous output hiding draft-only and empty folders, odd input answering 400 not 500, de create dialogs writing de and en. `g15-65-admin-first-publish-in-de-refused.png` shows the de-first publish refusal fixed in `c513254c`. Anonymous cases ran on a throwaway copy of the dev app with public read | DONE on the first pass (no must-fix; 12 mutations, 9 killed). Should-fix items fixed in `c513254c`, `8ee72b34`, `3c37e392` and `fd4f3dad` and verified by the build lead from the diff and check.sh: a page created in de could not be published in de first (G4 rule, wrong message), repeated slashes resolved in place, the paths endpoint built every row per page request and the client could loop, oldest-wins across collections and the root page at its own slug untested, `under` with `locale=all` read the default locale only, no cache headers, a capitalised folder part answered a legacy segment in place, create dialogs ignored `titleField` and `segmentField`. Decision 31 | `d3b9d73b`, `58d3d350`, `518937ca`, `bca2434e`, `9ef5713d`, `c513254c`, `8ee72b34`, `3c37e392`, `fd4f3dad` |
| G16: P-22, P-26, P-27, P-28, P-46 | pass (442 unit, 513 int on SQLite with 3 skips, 512 int on Postgres with 4 skips, perf, 123 e2e with 1 skipped, on `0ff93edc`) | `screenshots/g16-01-delete-dialog-12-pages-word-required.png`, `g16-04-delete-root-page-folder-url-warning.png`, `g16-08-bulk-duplicate-same-folder-refusal.png`, `g16-12-publish-dialog-counts-and-live-collections.png`, `g16-17-progress-dialog-mid-run-200-of-2000.png`, `g16-18-banner-after-closing-progress-dialog.png`, `g16-19-banner-after-reload-resumed.png`, `g16-22-two-tabs-tab2-resumed-unpublish-banner.png`, `g16-28-delete-dialog-2000-pages-word-typed-and-more-line.png`, `g16-33-drafter-context-menu-publish-delete-disabled.png`, `g16-43-banner-failed-step-try-again.png` and more (43 in all): the delete dialog with the typed word and the root-page URL warning, single and bulk duplicate with the same-folder refusal, the publish and unpublish dialogs with counts and always-live collections, 2,000-page publish, duplicate and delete runs with the progress dialog, the banner after closing and after a reload, two tabs stepping one run, drafter and limited-editor refusals, a failed step with Try again. `g16-34` and `g16-37` show the two tester bugs fixed in the fix round; soft delete and the restore guard are covered by int tests only, as the dev app has trash off | NOT DONE (Duplicate disabled for a role whose create access is a `Where`; the publish refusal counted the wrong field and every refusal stopped at 50; a stepped duplicate wrote the copy's name and slug into the default locale; plus 3 should-fix: mixed trash made the tree's delete fail with 409, a failed operation had no way out, any signed-in user could read every operation record), fixed in `1879960a` to `0ff93edc` with decision 32, re-review DONE | `307edaf7`, `dbd4419c`, `92f45cf8`, `3b9f0583`, `cc9939cb`, `80fbbd9a`, `63753e32`, `275a3294`, `8a82718b`, `29636da5`, `dea5b09e`, `f996986d`, `8edef2e0`, `b3d1c8a0`, `1879960a`, `53b47f27`, `e113fba1`, `aed72009`, `5bffadf0`, `829ed2b0`, `f6a605f3`, `88655b53`, `0ff93edc` |
| G17: P-29, P-35, P-51 | pass (529 unit, 555 int on SQLite with 3 skips, 553 int on Postgres with 5 skips, perf, 150 e2e, on `afb75c62`; the reviewer reran the verify-repair int file, the zoom and repair e2e files and its mutants) | `screenshots/g17-02-zoom-2026-breadcrumb.png`, `g17-04-forward-zoom-blog.png`, `g17-07-reload-with-expanded-in-address.png`, `g17-09-empty-folder.png`, `g17-14-zoomed-header-create-menu.png`, `g17-18-drop-breadcrumb-confirm.png`, `g17-23-depth-limit-refused.png`, `g17-27-move-mode-zoomed-company.png`, `g17-30-drift-banner-admin.png`, `g17-32-repair-dialog-dry-run.png`, `g17-34-repair-done.png`, `g17-35-editor-banner-no-rebuild.png`, `g17-38-cycle-after-repair.png`, `g17-42-dark-zoomed-drift-banner.png`, `g17-44-fresh-database-no-content-yet.png`, `g17-bin-dry-run.txt`, `g17-bin-repair.txt` and more (45 in all): zoom with breadcrumbs and Back and Forward, expanded folders after a reload, empty states, header Create under zoom, drops on a crumb and on the zoom header, the depth-limit refusal, Move mode under zoom, a drift written in the database raising the banner, the dry-run dialog and the rebuild clearing it, the editor's banner, a cycle broken, a duplicate URL left alone, the CLI dry run and repair. `g17-29` shows the `?folder=abc` bug and `g17-40`, `g17-41` the clash repair rewrote, both fixed in the fix round; screenshots predate the fix round's titled dialog lines. German UI not on screen, as the dev app offers English only | NOT DONE (repair fixed a legacy segment in the main row only, so the next publish of the draft restored it; repair rewrote the segment of a page in a duplicate-path clash and redirected its URL to the other page; plus 9 should-fix: `?folder=abc` showed a raw 400, quick verify gave editors the issue list, the banner showed for problems a rebuild leaves, dialog lines named items by id in English only, a folder could be rewritten onto a live page's URL, breadcrumbs were not Move mode targets, no warning before a long locked repair, the CLI could report a swallowed commit, three mutants survived), fixed in `b817440a` to `afb75c62` with decision 33, re-review DONE | `4f30f93c`, `55786ff6`, `a0e56fba`, `c315241e`, `fd896e4c`, `73b62324`, `8b398959`, `829f9b9e`, `55f40085`, `73a194bb`, `d737d34b`, `5e58bd40`, `de6135a9`, `b817440a`, `658652a1`, `7227b488`, `1045e1fa`, `78e36f8a`, `afb75c62` |
| G18: P-44, P-45, P-48, P-49, P-50 | pass (574 unit, 563 int on SQLite with 3 skips, 561 int on Postgres with 5 skips, perf, 204 e2e, on `d85f515f`; the reviewer reran the sidebar-tab, large-tree and keyboard e2e files and its mutants) | `screenshots/g18-01-keyboard-focus-ring.png`, `g18-02-alt-down-after-three-presses.png`, `g18-03b-paste-confirm-dialog.png`, `g18-05a` to `g18-05f`, `g18-06a` to `g18-06d`, `g18-07b`, `g18-08-german-content-locale-tree.png`, `g18-09a`, `g18-09b`, `g18-10a` to `g18-10i`, `g18-11c` to `g18-11e`, `g18-12-dark-tree-with-sidebar-tab.png` (34 in all): focus ring and the key table, three Alt+Down presses as one move, cut and paste with the URL confirm, search with filters, scope and no results, the Tree tab highlighting the open page, a drag in the tab updating the tree view, German paths with fallback chips and per-locale status, the confirm dialog counting both locales, the admin in German, 2,000 pages with under 40 rows drawn and a drag from the bottom to the top, dark theme. `g18-08` and the search screenshots show the fallback chip on posts, fixed in the fix round; `g18-11a` and `g18-11b` were taken before the headless page drew, so use `g18-11c` to `g18-11e` | DONE after the final re-review on `a357c5dd` (no fix round: every finding of both earlier reviews and the G17 carry-overs addressed here holds at HEAD and fails a test when reverted, the five acceptance e2e files 56/56; should-fix items are in the carry-over). Before that, BLOCKED: failed review twice. Pass 1 NOT DONE (the tab and the tree view shared dialog slugs, so a move in the tab replayed the tree view's earlier move and failed; focus fell to the page when a folder crossed 300 rows and after a keyboard Load more; posts, whose title is not localized, showed the fallback chip in every locale; plus 5 should-fix: Escape, undo and `/` answered in the wrong tree, Alt+arrow presses were dropped on navigation, unnamed search landmarks, the default label stayed English in German, no limited-user test for the search folders map), fixed in `9fb95a4d` to `11486ae0`. Re-review NOT DONE (`/`, Escape and undo from the page were ignored on an edit view where the tab is the only tree, a regression of the key scoping), fixed in `d85f515f` and verified by the build lead with check.sh; no third review ran. Decision 34 | `09b25db3`, `8964b054`, `8789a9b9`, `5fd54100`, `30fc5325`, `1557bbec`, `8aa6e780`, `7df11504`, `2254b76f`, `bdeeb577`, `12eb2fb6`, `9662ad0a`, `62d30038`, `b23fd875`, `b06829d6`, `b82a02fe`, `9fb95a4d`, `4fa510fc`, `ae77bbbc`, `87463532`, `c4cbcd4c`, `8072d69b`, `87942526`, `7e987c44`, `5e710927`, `11486ae0`, `d85f515f` |
| G19a: P-23, P-52 | pass (594 unit, 590 int on SQLite with 3 skips, 588 int on Postgres with 5 skips, perf, 215 e2e, on `4188f796`; the reviewer reran the mirror, public-read, registry and runtime files and its mutants) | `screenshots/g19a-01-frontend-blog.png`, `g19a-03-frontend-de-kontakt.png`, `g19a-05-sitemap.txt`, `g19a-08-confirm-dialog-mirror-line.png`, `g19a-10-redirects-after-hello-world-move.txt`, `g19a-11-admin-redirects-list.png`, `g19a-15-redirects-after-page-delete.txt`, `g19a-17-archive-rename-confirm.png`, `g19a-22-unticked-no-redirect-rows.txt`, `g19a-24-move-mode-tab-only.png`, `g19a-26-check-root-rest.txt`, `g19a-28-confirm-dialog-german.png`, `g19a-29-confirm-dialog-dark.png` and more (32 in all): the frontend in en and de with nav and 404s, a 308 from the old URL after a move, the sitemap without drafts, the mirror line in the confirm dialog and the Redirects rows it wrote, rows removed on a move back and on delete, a 150-page folder rename writing 300 rows in 3.4 s, no rows with the box unticked, Move mode in one tree with both on screen, `check-root` refusing an unknown locale, German and dark. `g19a-19-bug-de-fallback-page-404.txt` shows the de fallback 404 fixed in the fix round. Not testable in the dev app: a custom-URL row (both collections are in the redirects plugin) and a reader who cannot read drafts (every dev role reads them); int tests cover both | NOT DONE (the dev public read access hid every en-only page in de while the sitemap listed it; a queued mirror batch wrote a redirect from a path a page took after it was queued; a mirror batch started without a user could never be stepped, so its rows were lost; plus 3 should-fix: custom-URL rows chained and outlived a delete, no test of the rename preview's mirror count, Set as root promised no count), fixed in `665c1028` to `4188f796` with decision 35, re-review DONE | `a22d74eb`, `27585830`, `a35de828`, `0476cbac`, `23406459`, `7bfd396b`, `5422e418`, `56b1b877`, `d83bbac8`, `3ec8a136`, `3209d102`, `665c1028`, `6b3cae6a`, `60d1c608`, `9d12ce94`, `60fd011f`, `6a6bfb60`, `4188f796` |
| G19b: P-53, P-54, P-55 | pass (594 unit, 599 int on SQLite with 3 skips, 597 int on Postgres with 5 skips, perf, build, 215 e2e, on `ef778649`; the reviewer reran the README check with five broken blocks and the recipe tests on both databases) | `screenshots/g19b-01-check-readme.txt`, `g19b-02-action-validator.txt`, `g19b-03-recipes.txt`, `g19b-04-admin-tree-view.png`, `g19b-05-frontend-blog.png`, `g19b-06-frontend-redirect-landing.png`, `g19b-07-sitemap.png`, `g19b-08-admin-tree-expanded.png`, `g19b-09-readme-top-github.png`, `g19b-10-readme-config-reference-github.png`, `g19b-11-npm-pack.txt`: the README check passing and failing on a broken block, the workflow validator, every REST and GraphQL recipe against a fresh dev app, the frontend with 308s, 404 and sitemap, repair on forced legacy rows, the README rendered on GitHub, and a packed tarball whose `exports` point at `src` | NOT DONE (two de examples filtered `/blog` where the de path is `/aktuelles`; the capitals-only repair claimed a redirect row that is written only when the capitalised segment was saved; no warning that pre-plugin pages 404 until repair; plus should-fix: `tsx` undeclared, no build step in CI, the lint comment, recipe tests were hand copies), fixed in `9e1f642e` to `ef778649`. Re-review DONE (two should-fix carried over: the sort check passes for a wrong sort, two rows still hand copies). Decision 36 | `ad687695`, `753115ea`, `fbd32e21`, `e7a40ba8`, `f4f5f15e`, `9e1f642e`, `a793f9f8`, `50cced23`, `ef778649` |

---

## 3. Notes for the merge

- Carry-over for later tickets: a REST create still accepts a client `orderKey` and `pathSegment`; P-06 must assign `orderKey` on create and P-08 must compute `pathSegment` on create, overwriting any sent value. Page `folderPath` reads as undefined, not null, at the site root (P-08).
- Carry-over from G2: P-06 now assigns `orderKey` on create and drops a client value. P-08 must make the folder rule "no page with the same segment in that folder" read each page's segment with locale fallback (today `src/hooks/folders/beforeChange.ts` queries the page slug per locale with no fallback). The admin title of a folder with no name in the current locale shows the raw id (`useAsTitle` has no fallback); fix with the admin work (G10 or G14). P-17 should close two lock gaps: `seedTreeState` is a find then create, so two processes booting a fresh database can race, and a nested Local API call without `req` inside a tree write waits out the 30 s timeout (README "Known limits").
- Carry-over from G3: P-11 uniqueness and P-31 resolve must look pages up with `buildSegmentWhere` (decision 19), never a bare `pathSegment equals`. GraphQL has no locale-qualified `where`, so the fallback lookup has no GraphQL form; P-31 resolve covers it. P-29 repair must backfill `pathSegment` for pages that existed before the plugin. A read with `fallbackLocale: false` gives a null `fullPath` for a page with no own segment in that locale (README Known limits). `@payloadcms/graphql` is only a transitive dependency; add it as a devDependency at the next lockfile regeneration. G3 is BLOCKED by the review rule, but its last finding is fixed and tested, so later groups build on it.
- Carry-over from G4: P-47's edit view must show the draft conflict warning against latest versions (decision 10), built on `findSegmentConflict` and `findRootPageConflict`. P-27 batch publish must run page by page through the single-page path, because bulk updates that could change a URL are refused (`src/hooks/pages/bulkUpdateGuard.ts`) and the admin list's bulk Publish is unavailable for pages until then. Move-time depth cap and allowed-types checks belong to G6. Folder rebalances do not bump the folder revision; harmless while folders have no versions.
- Carry-over from G5: a required localized field a host adds through `folders.overrides` breaks every folder create (`NOT NULL constraint failed: folders_locales.title`), because the folder's own path write (`src/hooks/folders/afterChange.ts:56` into `src/core/subtree.ts:169`) inserts a locale row holding only `fullPath`; likely since G2. Refuse required localized folder fields at config time or document it (G19 README). The Postgres int harness shares one cluster and creates and drops a schema per file, so drizzle's schema pull can fail under load; P-17 should give each file its own database or run Postgres files one at a time. G6 reuses `runAfterCommit` and `queueAfterPathChange` for moves. The README must document `afterPathChange` (G19). A locked type's field is enforced on the server but not disabled in the admin form (G14).
- Carry-over from G6: the move's site-root check (`src/core/move.ts:658`) applies the whole segment pattern, so a page with a legacy segment such as `About` (spec §2.6 accepts it until edited) can move into a folder but not back to the root; block only reserved and dotted segments, and fix the refusal message at `move.ts:665`, which mentions dots for any refused segment (G7). Access (`forbidden`, `options.access.move`) is P-20, page redirect rows and the prefix writer are P-21 (the preview already counts them, so preview and apply disagree until then), mirror rows are P-23. `toFolder: 0` and a selected `after` item return 409 where 400 fits; the P-19 endpoints validate both. `findSegmentConflict` can miss a conflict with a folder row that lacks a locale's `fullPath` (raw writes or legacy data); P-29 verify should list such rows. The Postgres harness runs out of its 100 connections when about 11 files each hold one or two pools of 10: P-17 must raise `max_connections` in `tests/helpers/postgres.ts`, cap the pool size, or cap the Postgres workers, and that comes first in G7.
- Carry-over from G7: the Postgres harness now starts the cluster with `max_connections=500` and caps test pools at 4 (`tests/helpers/postgres.ts`, `tests/helpers/getTestPayload.ts`). `seedTreeState` is idempotent, but a dev database seeded by the old racy version may hold two tree-state rows, and `touchTreeState` locks whichever row `findFirst` returns; P-29 verify should report more than one row. A nested Local API call without `req` inside a tree write still waits out the lock timeout; it is a README Known limit with the `req: { ...req }` workaround, and the timeout message names the cause. `setTreeLockTimeoutMs` is internal (not exported from the entry points); tag it `@internal`. Decision 22 assigns case handling of legacy uppercase segments to P-29 and P-31. On SQLite the adapter's transaction mutex is the lock, so lock-removal mutations only show on Postgres.
- Carry-over from G8: `moveItems`, `planMove` and the previews default to `overrideAccess: false`, as Payload 4's Local API does; system callers pass `true` (README). The REST endpoints live under `/api/folders-tree/` and need a signed-in user. `getItemAccess` (update, delete, publish per tree item) is built but unused until P-25's children and search endpoints. Folder create and delete access keep the `Boolean(req.user)` default until P-26/P-27. Grouped publish checks call host access without an id, so a host whose access decides per document must return a `Where`; the README says so. The folders `beforeChange` hook marks a rename per request and folder for the `slug` field hook to read; a nested update of the same folder on the same req inside that window is untested. P-21 must apply decision 24 (fallback locales count as published) to its redirect rows. In the dev app, `autoLogin` acts as the admin for unauthenticated requests unless they send `DisableAutologin: true`; anyone on the local network reaches the dev admin (decision 13).
- Carry-over from G9:
  - `findRedirect` reads without access control and checks nothing about the answer unless `isLive` is passed. P-31 must pass `isLive` and must not return `target` to the caller.
  - `context.foldersRedirects: false` opts one Local API save out of redirect rows. REST has no such field for a rename or a publish.
  - A tree row's access flags come from one `getItemsAccess` call per collection with no id. Each collection whose access returns a `Where` adds one query to the 12-call budget, and the host's own access queries come on top.
  - The `candidateLimit` and `childCountReadLimit` options are internal, for tests only.
  - The dev roles restrict only `update`, so `delete` stays `Boolean(req.user)` until P-26/P-27.
  - The seed refuses to run in production or against any database that is not a local SQLite file.
  - The children p95 test runs alone in its own `perf` project, because 26 test files running in parallel push it past 300 ms.
- Carry-over from G10:
  - The tree store is in `src/admin/store.ts`, and G11 and G12 build on its optimistic apply and rollback.
  - A folder double click only toggles; P-35 wires `onOpenFolder` to zoom, and a double click on the chevron toggles twice.
  - The built package's `publishConfig.exports` has no `./server` entry, while the source exports do (G19, P-54).
  - The stock-list e2e test starts a second dev server on port 4079.
  - A poll waits while the current user's move is pending.
- Carry-over from G11:
  - The move dialog, URL confirm and Undo live in `src/admin/Move/`, selection and the bulk toolbar in `src/admin/Toolbar/`; G12 drag and drop reuses `runMove`, `undoMove` and the store's optimistic move.
  - `FOLDERS_CONFIRM_MOVES` and the other test switches are read only by the dev app (`dev/adminOptionsFromEnv.ts`) and never ship.
  - `readPageRows` (`src/core/pageRecords.ts:122`) reads without access checks, so a user who cannot read a page can learn its folder through `after` (the preview's `targetFolderId`, and now the stale answer). Predates G11; close it with the access work in G16.
  - No int test covers `after.expected.parentId: null` when the anchor has since moved into a folder; the code handles it.
  - Undo can start while another move is in flight; the server lock orders them.
  - A disabled child's tooltip in the picker still covers the parent row's name on 32 px rows (Payload places tooltips on top); a side placement would avoid it.
  - `src/admin/api.ts:221` says `after` always carries `expected`, but the type leaves it optional.
  - In the URL history list Payload fills the Target column only after its related titles load; a demo or screenshot must wait for it.
- Carry-over from G12:
  - Drag and drop is in `src/admin/DragAndDrop/`; drop geometry and the gap-to-request mapping are pure modules with unit tests. `@dnd-kit/core` `^6.3.1` is a regular dependency and dedupes with `@payloadcms/ui`.
  - P-35 (G17) must add breadcrumb and zoom-header drops, which P-42 lists but which need P-35's breadcrumbs. `resolveDrop` treats a target folder missing from the loaded rows as the top level (`src/admin/DragAndDrop/dropTargets.ts:307`), which applies top-level depth and reserved-segment checks wrongly once zoom exists.
  - P-44 must add real dnd-kit announcements (silenced now, they would read raw row keys) and keyboard dragging; the keyboard sensor is registered with the row as activator but is inert.
  - The click blocker after a cancelled drag waits for the next `pointerup`; a cancel with the mouse already up (window resize, tab switch) swallows the next click once.
  - Client-side drop checks read collapsed folders from the cache, so stale data can refuse a valid drop; Move to... or a reload recovers.
  - The table shifts 1 px when the selection toolbar replaces the header (G11).
- Carry-over from G13:
  - Context menu in `src/admin/ContextMenu/` and `src/admin/Menu/`, Move mode in `src/admin/MoveMode/`, create dialogs in `src/admin/Create/`. G14 (Settings), G16 (Duplicate, Publish/Unpublish, Delete) and the Unset root dialog add their entries to the menu registry.
  - Set as root page still has a race of one round trip between its re-read and its live save. G14's page settings save the same field: add a server check under the tree lock that refuses a live save flipping `isFolderRoot` when a newer draft exists, and use it from both places.
  - On an autosave collection, opening the document drawer (the create fallback after a 400) creates a draft, and Cancel leaves it in the folder. Delete a drawer-created, never-saved document on cancel (G16), or document it in the README (G19).
  - Create requests write the default locale, so a de editor's typed name lands in the en slot (G15).
  - The header Create menu works at the top level only until zoom (P-35).
  - The case "zooming while in Move mode keeps it active" is `test.fixme` in `tests/e2e/move-mode.e2e.spec.ts` until P-35.
  - `tabbableMarkerKey` has no unit test; the Move mode e2e covers it.
  - The dev app offers only English as the admin language, so German UI text was checked from the translation sources, not on screen.
- Carry-over from G14:
  - Settings drawers in `src/admin/Settings/`, edit-view fields in `src/admin/EditView/`, the folders edit view Save in `src/admin/FolderEdit/`. The G13 root-flip race and the G5 locked type field are closed; the G2 raw-id title is fixed on the folders edit view heading only, the stock list and relationship pickers still show the id (Payload offers no hook).
  - `fetchVersionMarker` (`src/admin/api.ts:375`) reads `/<collection>/versions`, so a host that limits `readVersions` to admins makes Set as root, Unset root and the page-settings root flip fail with a 403 for editors (fails closed). Fall back to the document's `updatedAt` or document it (G19 README).
  - `check-root` returns the title of a folder's root page, draft-only ones included, to any signed-in user, as `check-segment` does; it does not validate `locale` against the site's locales as `check-segment` does (`src/endpoints/checkRootPage.ts:20,45`). Close with the access work in G16.
  - With several server processes on Postgres, the cross-process lock is taken in `beforeChange`, after Payload reads `originalDoc`, so a draft committed by another process in that gap passes the marker check; the live save merges into the older version and the other draft stays in history (decision 9 limit, one README line in G19).
  - P-35 (G17) replaces the `?folder=<id>` handling (`src/admin/TreeView/useFolderFromQuery.ts`) with zoom and keeps the location crumbs pointing at it.
  - URL history lists rows targeting the page only, so a page whose folder was renamed shows no row for its old URL (the prefix row targets the folder); this follows the ticket text.
- Carry-over from G15:
  - Resolve, tree and paths live in `src/core/resolve.ts`, `siteTree.ts`, `allPaths.ts` and `publishedWhere.ts`; the endpoints in `src/endpoints/resolve.ts`, `tree.ts`, `paths.ts`; GraphQL in `src/graphql/foldersResolve.ts`; the REST client in `src/rest/index.ts` under the new `./rest` export. `./server` and `./rest` are now in `publishConfig.exports`, which closes the G10 note.
  - README (G19): `resolvePath`, `computeFullPath` (throws 404 on a missing folder; `admin.preview` callers should catch it), the `./rest` entry, the anonymous draft rule, that the frontend owns the trailing-slash policy, the paths endpoint order and `limit` meaning with `locale=all`, the client's `maxRequests` cap, and that redirect rows cover published URLs only, so an old draft URL after a rename is 404 even with `draft=true` (previews use `computeFullPath`).
  - The create drawer fallback (a collection without drafts, or a refused draft) still saves in the admin locale only.
  - A folder written raw with no de `fullPath` row (G5's legacy fixture) does not match `folderPath` in de, because the query has no folder fallback; P-29 verify should list such rows.
  - The paths client stops early if a whole window of documents yields no rows (every page in it under a folder the reader cannot read).
  - Folder `alternates` list every locale even where nothing in the folder is live; folders are public (spec D11).
  - The New page dialog's use of `titleField` and `segmentField` is unit tested through its helpers only, not through the dialog wiring.
- Carry-over from G16:
  - Batches in `src/core/operations.ts` with `src/endpoints/operationStep.ts` and `operationAbandon.ts`; dialogs, banner and runner in `src/admin/Operations/`, with menu groups `publish` and `danger` in `src/admin/ContextMenu/menuItems.ts`. P-51 rebuild (G17) can run through `runOrQueue`.
  - A failing step writes its failure after the lock is released and without a condition (`src/core/operations.ts:270-275`), so if it lands after an abandon commits it overwrites `abandoned` with `failed`; on SQLite that write can collide with the abandon and the step answers a raw `SQLITE_BUSY` 500. The reviewer saw `abandoned` win in 5 of 5 runs. Write the failure only when the status is not `done` or `abandoned`, and catch that write's error (G17).
  - Payload's drizzle adapter swallows a failed COMMIT (`@payloadcms/drizzle/dist/transactions/beginTransaction.js`, `commitTransaction.js`): a write can return success after a rollback. A step can then report progress the database did not record; the cursor is in the same transaction, so the next step redoes the slice. Two processes on one SQLite file hit this, which is why the draft seed helper (`tests/e2e/helpers/bulk.ts`) re-counts through the dev server. README (G19).
  - The exact delete refusal count costs one access call per document, about 2,000 queries for a 2,000-page refusal when the host's access queries the database. README (G19).
  - `mirrorRedirects` has no handler yet; P-23 (G19) must add delete cleanup for the plugin-redirects mirror.
  - The delete preview sample shows a trashed page with its last status, not "in trash". A page trashed while published and then deleted permanently may report its URL to `afterPathChange` a second time (unverified).
  - The duplicate dialog has no large-run note (it gets no dry run); a synchronous publish keeps the toolbar selection, which the reviewer accepted.
  - Unpublish has no e2e case of its own; German strings were checked from the translation sources, not on screen.
  - Not closed in G16 though earlier notes pointed here: `readPageRows` reads without access checks (G11 note), and `check-root` returns a draft root page's title and does not validate `locale` (G14 note). Fix with G17 or document in the G19 README.
- Carry-over from G17:
  - Verify and repair in `src/core/verify.ts`, `repair.ts`, `selectFolderWrites.ts`, `issueTitles.ts` and the `verify*.ts` files, endpoints `verify.ts` and `repair.ts`, CLI `src/bin/repair.ts`; zoom, breadcrumbs and empty states in `src/admin/TreeView/`, the dialog and banner in `src/admin/Repair/`. G16's note that P-51 could run through `runOrQueue` is superseded by decision 33.
  - The draft-edit filter in `writeLatestVersionSegments` (`src/core/repair.ts:240-242`) has no test: forced to `true`, every verify-repair test passes while an editor's different de draft segment is overwritten. Add a case with a legacy capital in the main row and a different draft (G18, first item). The held-locale branch at `repair.ts:247` is also untested (low impact, a publish recomputes it).
  - A clash that exists only through locale fallback still loses a page's URL: a locale is held back only when the clash is in that locale (`src/core/verify.ts:160-165`), but a de URL that falls back to the en segment changes when en is written. Needs a raw write; fix in G18 by holding the default-locale key too when a locale has no segment of its own.
  - Quick verify reads folders only, so a folder that would take a page's URL counts as fixable there while the full pass holds it back: the banner offers Rebuild and the dialog has Rebuild disabled. README line (G19).
  - `readPageRows` without access checks (G11 note) and `check-root` returning a draft root page's title without validating `locale` (G14 note) are still open; fix or document in G19.
  - The dev app offers English only, so German strings were checked from the translation sources; G18 adds `de` to the dev admin languages behind a flag.
- Carry-over from G18:
  - Keyboard in `src/admin/Keyboard/` (`useTreeKeyboard.ts`, `treeKeys.ts`, `reorder.ts`), search in `src/admin/Search/` and `src/core/treeSearch.ts`, the Tree tab in `src/admin/SidebarTab/` and `sidebarTabConfig.ts`, per-workspace dialogs in `src/admin/dialogScope.tsx`, virtualization in `src/admin/Tree/Tree.tsx`.
  - The guard that stops a move from opening a confirm after the tree view unmounted (`src/admin/Move/useMoveFlow.tsx:242`) has no test: without it, under `confirmMoves: "always"`, the tab's keyboard goes dead and the tab never resyncs. Needs an e2e on a server with `FOLDERS_CONFIRM_MOVES=always` (G19).
  - Move mode's document key listener is not scoped to one workspace (`src/admin/MoveMode/useMoveMode.ts:97-119`): with a selection in both trees, M enters Move mode in both and Escape leaves only one. Scope it like `isKeyForWorkspace` (G19).
  - `lastFocusedWorkspace` is module level (`useTreeKeyboard.ts:109`), fine for one admin per page.
  - Two G18a survivors: removing the typing guard fails no test (only `/`, Escape and undo depend on it, and `/` is covered), and the focus-keeping code after a move is unneeded in Chromium, so Firefox and Safari are untested.
  - The tab's own search text, selection and scroll reset on every page change, because Payload remounts the whole Nav; open folders survive in the store. A page beyond a Load more cut-off is not highlighted in the tab.
  - README (G19): pending Alt+arrow presses are sent on leaving the tree and a move that needs a confirm is dropped; default labels are `{ en, de }` records and a host can pass a string or a record; the tab and the tree view share one list of open folders, so opening an edit view with the tab showing opens its folders in the tree view and the saved preference; Payload's own Create button fails contrast (2.99:1).
  - `limit=10` in the folders list address comes from Payload's list route, not the plugin (unverified); `scope=all` stays in the address after Escape clears `q`, accepted.
- Carry-over from G19a:
  - The mirror in `src/core/mirror.ts`, wired into `applyMove.ts`, `subtree.ts`, `pageRedirects.ts`, `repair.ts`, `redirects.ts` and `src/hooks/pages/deleteHooks.ts`; `hasLivePageAt` in `src/core/resolve.ts`; the registry in `src/core/globalRegistry.ts`; the frontend example in `dev/app/(frontend)/` with `dev/helpers/revalidateFrontend.ts`. The G11 `readPageRows` and G14 `check-root` notes are closed (`0476cbac`, `23406459`), as are G18's Move mode scoping and unmounted-confirm test (`7bfd396b`, `5422e418`) and the missing `./server` export (`56b1b877`).
  - Two queued operations holding the same `from`: the one stepped first wins, so an older batch can keep a row over a newer one. Compare the existing row's `updatedAt` with the queuing operation's `queuedAt`.
  - The custom-row delete on trash (`src/hooks/pages/deleteHooks.ts:103`) has no test of its own.
  - `renamesByRequest`, `operationsThatAcquired` and `currentTreeLockTimeoutMs` stay per module copy (keyed per request or set by tests only).
  - Repointing covers custom rows only; a host's custom row aimed at a reference page's old URL keeps one extra hop.
  - The dev public read uses the config fallback, not the request's `fallback-locale`.
  - The dev nav and `<html lang>` ignore the locale (`dev/app/(frontend)/nav.tsx:25`, `layout.tsx:8`); a limit of the example.
  - README (G19b): the locale-aware public read recipe with `buildLiveInLocaleWhere` and the warning about `_status equals published`; the mirror repoints and deletes custom rows, host-authored ones included, and runs the host's redirects hooks; a no-user change writes every mirror row in one transaction (about 2 s per 2,000 rows) while a signed-in change above `maxSyncDocuments` queues an operation that the admin steps only while a tree view or tab is open (a headless caller gets `mirrorOperationId` and calls `stepOperation`); the mirror needs the redirects plugin's unique `from`; reference rows carry no locale, so the host reads it from the `/de` prefix and builds targets from `fullPath`; the example answers 308 and a literal 301 needs middleware; mirror timing SQLite 8.2 s and Postgres 8.9 s for 980 rows in 5 steps of 200 (`tests/results/` is git-ignored); adding `mirrorRedirects` to the operations `kind` select changes the Postgres enum, so hosts on migrations need a new one.
- Carry-over from G19b:
  - Before the first publish: `npm pack` ignores `publishConfig.exports`, so a packed tarball's `exports`, `main` and `types` point at `./src/...`, which `files: ["dist"]` leaves out (`screenshots/g19b-11-npm-pack.txt`). Point them at `dist` with a `source` condition for the dev app and tests, or publish with pnpm. There is no LICENSE file though package.json says MIT, and `dist/*.map` sources point at the unshipped `src`. `private: true` blocks a publish today.
  - `afterPathChange` never sends `create`, `publish` or `rootToggle` (decision 36), so the dev frontend's `revalidateFrontend` does not run on a plain page publish.
  - The CI workflow ran on [PR #220](https://github.com/focusreactive/payload-plugins/pull/220). The checks and Postgres jobs passed from the first run (the default `max_connections` of 100 is enough). The browser job failed twice on the GitHub runner (runs 41327615305 and 41331300029): a click on the type select before hydration (`settings.e2e.spec.ts:470`), a second dev server on 4079 that the `lsof`-based stop left running (`tree-renders:35`, `tree-zoom:633`), SQLite `database is locked` between two processes on one file (`frontend:59`), and a focus race after Escape in search that is a real plugin bug (`search:194`). Fixed in `fd8d6048` (the focus race, in `src/admin/TreeView/TreeWorkspace.tsx`), `98aeb62f` (the stock server stops its own process group and waits for the port), `b3e4c218` (hydration wait, one-call toast measure) and `236fa0fb` (`busyTimeout` and WAL behind `FOLDERS_SQLITE_WAL=true` in the e2e config); run 41336761550 is green: 598 unit, 599 SQLite int with 3 skips, 597 Postgres int with 5 skips, 215 e2e in 19.7 min. The focus fix had no opus review; the build lead read the 12-line diff.
  - Re-review should-fix: the recipe test's `sort=folderPath` check passes for a wrong sort, because the fixture pages are created in folder-path order (`tests/int/readme-recipes.int.test.ts:75-87`, `:196`); create the `/blog/2026` page first. The "Published pages only" and "A moved or renamed URL" rows are still hand copies, not parsed from the README.
  - The README quotes mirror timing as "a few seconds" per 1,000 rows; `tests/results/` is git-ignored, so the measured numbers live in decision 35 only.
- Carry-over from the G8 final re-review:
  - A stock save whose path is taken names the live page that holds it with no read check (`src/hooks/pages/beforeValidate.ts:372,389`, `src/hooks/pages/afterChange.ts:81,127`), e.g. 400 "/blog/taken is already used by Hidden Live Page (published)". The page is already live, so this is low; gate it with `createConflictNamer` or add a README Limitations line.
  - `README.md:968` says the plugin gates "the root toggle through its endpoints"; there is no root-toggle endpoint, the toggle is a stock PATCH gated by the host's `update` with `_status: "published"`. Fix the wording.
  - Still open from G8: the rename mark is kept per request and folder (`src/hooks/folders/renamePublishRights.ts:13-23`) with no test of a nested update in that window, and the move target folder is read without folder read access (`src/core/move.ts:551-566`), low while folder read is public.
- Carry-over from the G3 final re-review:
  - `tests/unit/no-localized-db-writes.test.ts:15` does not see repair's `pathSegment` writes, which are assigned outside the `db.*(` call (`src/core/repair.ts:178`, `:267`). Both carry every locale, so they are safe today; widen the grep or test repair's writes directly.
- Carry-over from the G4 final re-review (the G8 carry-over about save-hook conflict titles is fixed by decision 39):
  - A host collection `beforeValidate` hook runs before the plugin's; if it saves another opted-in page on the same request with an explicit `overrideAccess: true`, that save rewrites the override mark and the outer refusal names an unreadable page (`src/hooks/pages/overrideAccessMark.ts:12-13`, `src/fields/pageFields.ts:267`). Keep a stack per request pushed by the field hook and popped by the collection hook, or name through `canReadItem` whenever `req.user` is set.
  - The root branch of the after-write check (`src/hooks/pages/afterChange.ts:77-85`) has no test; every known route is refused earlier in `beforeValidate`.
  - A save that fails after the plugin's `beforeValidate` leaves its snapshot entry behind for the life of the process (`src/core/pageRecords.ts:209-243`); pop it on error or key the stacks per transaction.
- Carry-over from the G9 final re-review:
  - A database created before `a125aa8e` still has the unique index on `lookupKey` alone; there the first page row written at a prefix row's key fails the insert and the move or publish rolls back. Add a README line next to the `mirrorRedirects` enum note (`README.md:123-124`): hosts on migrations need one that drops the `lookupKey` unique index and adds `(lookupKey, kind)`. Low while the package is unreleased.
- Carry-over from the G10 final re-review (all should-fix, in `src/admin/store.ts` unless named):
  - `tests/unit/store.test.ts:649` passes when rollback subtracts deltas instead of restoring counts, because the re-read after rollback (`:1100`) masks it; set `server.failChildren = true` before `request.reject`.
  - A poll with an unchanged revision still calls `setState` (every tree re-renders every 10 s), marks collapsed folders stale and reads `ancestors` while zoomed (`:596-602`, `:617`); on an unchanged revision read only stale or failed visible folders.
  - A server revision lower than the seen one (a database restored from backup) never refreshes the tree (`:613`, `:662`); treat any different revision as a change and reset the baseline.
  - While one visible folder keeps failing and the revision has moved, every expand or Load more re-reads every visible folder (`:659-665` with `:568-584`); compare against the folder's own `entry.revision`.
  - After a failed first top-level read, polls never retry because the baseline stays null (`:847-849`); only the Retry button (`src/admin/Tree/Tree.tsx:140`) recovers.
  - The epoch guard on `commit` (`:1018`) has no test.
  - The root-page house icon's hint opens on mouse hover only and its `aria-label` is "Root page" (`src/admin/Tree/TreeRow.tsx:76-85`); put the hint in the accessible name or description.
- Carry-over from the G18 final re-review (should-fix):
  - The unmount flush of pending Alt+Up/Down presses (`src/admin/Keyboard/useTreeKeyboard.ts:170-175`) has no test of its own; changing `flush()` to `cancel()` passes every keyboard and sidebar-tab case. Add an e2e: Alt+Down, then click the Pages nav link within 800 ms, then expect the moved order through the API.
  - The sidebar tab renders `role="treegrid"` (`src/admin/Tree/Tree.tsx:536`, `README.md:1218-1219`) where spec section 7.6 says a `tree`; decision 34 does not record it. Treegrid is valid ARIA and axe passes; record the deviation or render the compact tree as `tree` with `treeitem` rows.
- Commit `42dee943` carries an earlier wording of this file that named internal tooling paths. Squash the branch on merge so it does not reach `main`.
