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
    PR can link them; flagged in the PR body for removal before any merge.
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
| G3: P-08, P-09 | pass (62 unit, 82 int on SQLite, 80 int on Postgres with 2 SQLite-only skips, smoke; rerun by the build lead on `8f9272af`) | `screenshots/g3-page-full-path-blog-post.png`, `g3-page-api-folderpath-fullpath.png`, `g3-de-read-follows-rename.png`, `g3-site-root-page-folderpath-null.png`, `g3-stock-query-folderpath-pathsegment.png` and four more: page fullPath `/blog/post`, de follows an en rename, folderPath null at the site root, stock query finds the page; `g3-defect-de-stock-query-empty.png` shows the defect that led to decision 19 | BLOCKED: failed review twice. Pass 1 NOT DONE (an en publish nulled the unpublished de segment; stored fallback segments created de rows that broke required localized fields; fullPath wrong under select), fixed in `045e0d1c` with decision 19. Re-review NOT DONE (a `locale: "all"` write still created a de row, `src/hooks/pages/pathSegment.ts:39`), fixed in `8f9272af` with create and update tests and verified by the build lead with check.sh; no third review ran | `6e1b1788`, `50fefa04`, `045e0d1c`, `8f9272af` |
| G4: P-10, P-11 | pass (69 unit, 126 int on SQLite, 124 int on Postgres with 2 SQLite-only skips, smoke; rerun by the build lead on `c265eca6`) | `screenshots/g4-a-publish-conflict.png`, `g4-b-draft-save.png`, `g4-c-second-root.png`, `g4-d-reserved-admin.png`, `g4-e-duplicate.png`, `g4-f-version-restore.png`: duplicate URL refused on publish, draft with the same slug saves, second root page refused with the spec message, root `admin` refused, Duplicate gives a `-copy` draft with a fresh key, restore keeps the folder | BLOCKED: failed review twice. Pass 1 NOT DONE (restore failed after a rebalance; a de save gave the page its own de slug; publishing every locale and version restore could make a taken de slug live; a draft with no slug could publish), fixed in `c9626f98` with a uniqueness check after the write. Re-review NOT DONE (a bulk update commits despite the check's error; a host afterChange re-save cleared the snapshot), fixed in `c265eca6` (bulk URL-changing updates refused, a snapshot stack per page) and verified by the build lead with check.sh and the new tests; no third review ran | `e47ced94`, `edf14abb`, `c9626f98`, `c265eca6` |
| G5: P-12, P-13 | pass (69 unit, 166 int on SQLite, 163 int on Postgres with 3 skips, smoke; reviewer reran check.sh on `dd0d93d3`; the developer's first run failed once on Postgres schema pull in `page-paths.int.test.ts`, a file the commit does not touch) | `screenshots/g5-a-team-full-path.png`, `g5-a-page-full-path.png`, `g5-b-team-de.png`, `g5-b-team-en.png`, `g5-c-folder-settings.png`, `g5-c-create-refused.png`, `g5-d-team-locked.png`, `g5-d-team-edit-refused.png`, `g5-d-team-editable-after-unlock.png`: a rename rewrites the subtree's paths and page paths follow, de and en paths after a de rename, allowed types refuse a create, a locked type refuses an edit until unlocked | NOT DONE (refusal message did not follow spec 7.7; a de rename reported paths for descendants with no de row that a read did not return; unlocalized apps got localized write shapes; afterPathChange lost the caller's url, method and context; host localized fields were wiped on rename; smoke regex refused a query string; G2 folder create failed with `localizeSegments: false`), fixed in `dd0d93d3`, re-review DONE | `c483e7f7`, `9c50bda4`, `dd0d93d3` |
| G6: P-14, P-15 | pass (69 unit, 215 int on SQLite, 211 int on Postgres with 4 skips, smoke, on `4b67cec9`; two earlier runs and the reviewer's run failed only on Postgres with "too many clients", the shared test cluster's connection limit, and the touched files pass alone) | `screenshots/g6-a-page-moved-to-news.png`, `g6-a-page-de-path-nachrichten.png`, `g6-b-page-en-path-blog-news-post.png`, `g6-b-page-de-path-blog-de-nachrichten.png`, `g6-b-folder-news-en-full-path-blog-news.png`, `g6-b-folder-news-de-full-path-blog-de-nachrichten.png`, `g6-b-folders-list-en.png`, `g6-move-output.txt`: a page moved into another folder, a folder moved under another folder with every path rewritten in en and de, a cycle refused with nothing written (moves run through `moveItems`, the admin move UI is G11) | NOT DONE (a dotted segment could move to the site root; drafts counted as segment conflicts but not as root-page conflicts; the blocked-move error was named `APIError`; allowed-types blocks capped at 20 items; about 6 reads per moved item; the versions-without-drafts fix untested), fixed in `4b67cec9` with decision 20, re-review DONE | `a805309a`, `c32bc403`, `be929cc9`, `4b67cec9` |
| G7: P-16, P-17, P-18 | pass (69 unit, 241 int on SQLite with 3 skips, 240 int on Postgres with 4 skips, smoke, on `a0ecd369`; the full Postgres suite passed 6 runs in a row after the harness fix) | `screenshots/g7-acceptance-output.txt`: every ticket case by name on SQLite and Postgres, and the concurrency file 3 of 3 runs on Postgres (test-only tickets, decision 14) | NOT DONE (a G7 change let legacy `Admin` and `API` move to the site root; a crossed-move test passed with the lock removed because a deadlock abort counted as a refusal; no concurrent 409 stale test; publish cases never isolated the guard), fixed in `a0ecd369` with decision 22, re-review DONE | `18e1fc3e`, `05913cd2`, `4abd2890`, `ebc2b668`, `5e277ed6`, `2264a0ef`, `a0ecd369` |
| G8: P-19, P-20 | pass (69 unit, 305 int on SQLite with 3 skips, 304 int on Postgres with 4 skips, smoke; rerun by the build lead on `1488c22f`) | `screenshots/g8-a1-admin-move-preview-post-into-news.png`, `g8-a2-admin-move-post-into-news-result.png`, `g8-a3-admin-revision-after-move.png`, `g8-a4-admin-post-folder-news-full-path-news-post.png`, `g8-b1-drafter-move-published-post-403-forbidden.png`, `g8-b2-drafter-move-draft-post-into-news-succeeds.png`, `g8-c-signed-out-revision-403-folders-read-200.png`, `g8-d-check-segment-taken-post-in-news.png`: admin preview, move and revision, drafter refused on a published page and allowed on a draft, signed-out 403, check-segment | BLOCKED: failed review twice. Pass 1 NOT DONE (access ran after every other check, so a refused user got 409s naming foreign paths and titles; one title read per moved page; a folder move asked access once per page; a drafter could rename a folder over published pages; dev users could raise their own role), fixed in `c6fd83f0` with decisions 23 and 24. Re-review NOT DONE (the override flag for folder saves was kept per request and flipped by nested folder calls; the grouped publish check passed one page's id, so a per-document rule depended on row order; any dev user could delete users), fixed in `1488c22f` (rename check in a `slug` field hook with its own `overrideAccess`, grouped checks without an id, admin-only delete) and verified by the build lead with check.sh; no third review ran | `fdf5b074`, `74c8b6e5`, `c6fd83f0`, `1488c22f` |
| G9: P-21, P-25, P-30 | pass (70 unit, 375 int on SQLite with 3 skips, 374 int on Postgres with 4 skips, perf p95 11.1 ms on SQLite, smoke; rerun by the build lead on `ff76d14a`) | `screenshots/g9-folders-list-seeded.png`, `g9-folder-redirects-after-seed.png`, `g9-children-blog-and-root.png`, `g9-search-blog-new-year.png`, `g9-ancestors-blog-2026-new-year.png`, `g9-limited-user-children-root-and-blog.png`, `g9-folder-renamed-products-to-catalog.png`, `g9-folder-redirects-after-rename.png`: the seeded tree, its redirect rows, children, search and ancestors JSON, the limited user's access flags, and an admin rename writing a new prefix row; a second seed run changed nothing | BLOCKED: failed review twice. Pass 1 NOT DONE (with unlocalized folders, prefix rows were written per page locale but cleared under the no-locale key, so a new folder at an old path kept redirecting and a rename back gave a self-redirect; decision 24's own-status guard and the tree read Where had no test; plus six should-fix items), fixed in `07f20d96`. Re-review NOT DONE (the new per-folder count fallback sent no locale, a 500 on SQLite and a wrong count on Postgres under a read Where on a localized field; the p95 test failed under parallel files), fixed in `ff76d14a` (count with every locale, p95 in its own perf project, internal limits clamped) and verified by the build lead with check.sh; no third review ran. Decisions 25 and 26 | `a3d78cdb`, `a95cdaad`, `f4f4f439`, `763a35d8`, `07f20d96`, `ff76d14a` |
| G10: P-33, P-34 | pass (132 unit, 375 int on SQLite with 3 skips, 374 int on Postgres with 4 skips, perf p95 10.3 ms, 12 e2e; rerun by the build lead on `14375bc8`) | `screenshots/g10-top-level-tree.png`, `g10-blog-expanded.png`, `g10-root-page-icon-tooltip.png`, `g10-products-expanded-changed-page.png`, `g10-empty-folder-no-page-chip.png`, `g10-tree-locale-de-top-level.png`, `g10-tree-locale-de-expanded.png`, `g10-tree-theme-light.png`, `g10-tree-theme-dark.png`, `g10-page-edit-view-opened-from-row.png`, `g10-tree-editor-role.png`: the Content tree with paths, status dots, house icons and no-page chips, in en and de, light and dark, as admin and editor, and a row opening its edit view | BLOCKED: failed review twice. Pass 1 NOT DONE (the store recorded a revision as seen without refreshing the rows on screen, so a read of another folder, a failed refresh or a Load more click left the tree out of date for good; plus 8 should-fix: counts after rollback, cache across a user switch, raw keys in other languages, duplicate polling, an unchecked teardown PID, type labels in one language, accessibility), fixed in `ee0a1cf7`. Re-review NOT DONE (a poll could set the baseline before the first read; the Load more fix had no failing-on-revert test; a rollback after a user switch wrote the old user's rows; a failing folder made every poll re-read every folder), fixed in `c70ee1d0` and `14375bc8` and verified by the build lead with check.sh; no third review ran | `cddda6c7`, `b183c2c2`, `ee0a1cf7`, `c70ee1d0`, `14375bc8` |
| G11: P-36, P-39 | pass (187 unit, 381 int on SQLite with 3 skips, 380 int on Postgres with 4 skips, perf, 31 e2e; rerun by the reviewer on `da5dbd05`) | `screenshots/g11-three-rows-selected-bulk-toolbar.png`, `g11-move-dialog-products-chosen-live-preview.png`, `g11-confirm-move-url-change-and-redirect.png`, `g11-page-under-products-new-path-undo-toast.png`, `g11-after-undo-team-back-in-blog-old-path.png`, `g11-drafter-move-refused-neutral-message.png`, `g11-dark-theme-move-dialog.png` and nine more: range selection and the bulk toolbar, the folder picker with a live preview, the URL-change confirm with en and de paths and the redirect box, a move with its Undo toast and the Undo result, a drafter refused, dark theme. The tooltip and toast-alignment shots predate the fixes, and `g11-url-history-redirect-rows-for-moved-pages.png` was taken before Payload loaded the Target cells, so it shows `<No Target>` though the rows are correct | NOT DONE (Undo placed an item after its old sibling wherever that sibling now was, a published URL change with no confirm or redirect; plus 8 should-fix: partial undo reported as a failure, wrong child counts after a move into an unopened folder, an untested user-switch guard, the toast action unstyled, picker tooltips over other rows, toast Reload untested, Undo e2e without redirect assertions, a second move dropped silently), fixed in `ceac8048` and `da5dbd05` with decision 27, re-review DONE | `d84c7b3a`, `4139252b`, `7bd07849`, `ceac8048`, `da5dbd05` |
| G12: P-42, P-43 | pass (227 unit, 381 int on SQLite with 3 skips, 380 int on Postgres with 4 skips, perf, 51 e2e, on `bf8b4bbf`; the developer's first run on `b428e879` failed once on a Postgres rebalance test that passed alone 3 times, the known shared-cluster flake) | `screenshots/g12-01a-drag-before-line-on-page-row.png`, `g12-01b-drag-inside-highlight-on-folder.png`, `g12-03a-confirm-dialog-old-and-new-url.png`, `g12-03c-page-edit-view-new-full-path.png`, `g12-05b-three-item-drag-overlay-after-press-kit.png`, `g12-06a-invalid-folder-into-own-child-reason-bubble.png`, `g12-06b-invalid-page-into-posts-only-folder-reason-bubble.png`, `g12-07b-after-escape-and-release-nothing-changed.png`, `g12-11-url-history-after-move-targets-loaded.png` and 19 more: before, after and inside indicators, a reorder that holds after reload, a drop that asks to confirm the en and de URL change and shows the new full path in the edit view, auto-expand, a three-item drag, refused drops with their reasons, Escape, Undo, a drafter, dark and light themes, URL history with targets loaded | DONE on the first pass (no must-fix; 23 mutations, 22 killed). Should-fix items fixed in `bf8b4bbf` and verified by the build lead from the diff and check.sh: a click after Escape opened the page, a second drag could start during the preview read, optimistic order of rows from two folders differed from the server's, Reload cleared unrelated ticks, four test gaps. Decision 28 | `31cb4feb`, `b428e879`, `f2db8c99`, `bf8b4bbf` |
| G13: P-37, P-41, P-38 | pass (312 unit, 392 int on SQLite with 3 skips, 391 int on Postgres with 4 skips, perf, 85 e2e with 1 `test.fixme` for zoom (P-35); rerun by the reviewer on `d602f089`) | `screenshots/g13-01a-folder-menu-create-page-here.png`, `g13-02-contact-menu-set-as-root-disabled.png`, `g13-04b-order-holds-after-reload.png`, `g13-05a-contact-copy-url-toast.png`, `g13-06a` to `g13-06d`, `g13-07a` to `g13-07f`, `g13-09a` to `g13-09i`, `g13-10a` to `g13-10g` and more (53 in all): the folder and page menus with disabled reasons, Move down that holds after reload, Copy URL, Set as root with its confirm and redirect rows, keyboard-only Move mode into another folder, New folder with the segment following the name and a taken segment refused, New page making a draft and opening the editor, the posts drawer, drafter and limited menus, dark and light. Screenshots predate the fix round (drawer redirect, inline marker reasons, red field errors, dialog focus) | NOT DONE (Set as root chose a live save from a stale tree status and could publish an unreviewed draft; saving the posts drawer navigated away from the tree; plus 8 should-fix: page saves that change a live URL never bumped the tree revision, four untested guards, the `M` key in text fields untested, focus lost after Escape, a marker tooltip over the folder name, grey field errors, dialogs focused on the heading, every marker a tab stop), fixed in `27725676` and `d602f089` with decision 29, re-review DONE | `dc38c5a9`, `4102d6d3`, `26c064f2`, `d515e35c`, `27725676`, `d602f089` |

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
- Commit `42dee943` carries an earlier wording of this file that named internal tooling paths. Squash the branch on merge so it does not reach `main`.
