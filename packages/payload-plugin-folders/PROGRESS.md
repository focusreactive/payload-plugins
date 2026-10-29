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
    `kill` on that PID only. Every developer and tester prompt carries this rule.
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

---

## 3. Notes for the merge

- Carry-over for later tickets: a REST create still accepts a client `orderKey` and `pathSegment`; P-06 must assign `orderKey` on create and P-08 must compute `pathSegment` on create, overwriting any sent value. Page `folderPath` reads as undefined, not null, at the site root (P-08).
- Carry-over from G2: P-06 now assigns `orderKey` on create and drops a client value. P-08 must make the folder rule "no page with the same segment in that folder" read each page's segment with locale fallback (today `src/hooks/folders/beforeChange.ts` queries the page slug per locale with no fallback). The admin title of a folder with no name in the current locale shows the raw id (`useAsTitle` has no fallback); fix with the admin work (G10 or G14). P-17 should close two lock gaps: `seedTreeState` is a find then create, so two processes booting a fresh database can race, and a nested Local API call without `req` inside a tree write waits out the 30 s timeout (README "Known limits").
- Carry-over from G3: P-11 uniqueness and P-31 resolve must look pages up with `buildSegmentWhere` (decision 19), never a bare `pathSegment equals`. GraphQL has no locale-qualified `where`, so the fallback lookup has no GraphQL form; P-31 resolve covers it. P-29 repair must backfill `pathSegment` for pages that existed before the plugin. A read with `fallbackLocale: false` gives a null `fullPath` for a page with no own segment in that locale (README Known limits). `@payloadcms/graphql` is only a transitive dependency; add it as a devDependency at the next lockfile regeneration. G3 is BLOCKED by the review rule, but its last finding is fixed and tested, so later groups build on it.
- Carry-over from G4: P-47's edit view must show the draft conflict warning against latest versions (decision 10), built on `findSegmentConflict` and `findRootPageConflict`. P-27 batch publish must run page by page through the single-page path, because bulk updates that could change a URL are refused (`src/hooks/pages/bulkUpdateGuard.ts`) and the admin list's bulk Publish is unavailable for pages until then. Move-time depth cap and allowed-types checks belong to G6. Folder rebalances do not bump the folder revision; harmless while folders have no versions.
- Carry-over from G5: a required localized field a host adds through `folders.overrides` breaks every folder create (`NOT NULL constraint failed: folders_locales.title`), because the folder's own path write (`src/hooks/folders/afterChange.ts:56` into `src/core/subtree.ts:169`) inserts a locale row holding only `fullPath`; likely since G2. Refuse required localized folder fields at config time or document it (G19 README). The Postgres int harness shares one cluster and creates and drops a schema per file, so drizzle's schema pull can fail under load; P-17 should give each file its own database or run Postgres files one at a time. G6 reuses `runAfterCommit` and `queueAfterPathChange` for moves. The README must document `afterPathChange` (G19). A locked type's field is enforced on the server but not disabled in the admin form (G14).
- Carry-over from G6: the move's site-root check (`src/core/move.ts:658`) applies the whole segment pattern, so a page with a legacy segment such as `About` (spec §2.6 accepts it until edited) can move into a folder but not back to the root; block only reserved and dotted segments, and fix the refusal message at `move.ts:665`, which mentions dots for any refused segment (G7). Access (`forbidden`, `options.access.move`) is P-20, page redirect rows and the prefix writer are P-21 (the preview already counts them, so preview and apply disagree until then), mirror rows are P-23. `toFolder: 0` and a selected `after` item return 409 where 400 fits; the P-19 endpoints validate both. `findSegmentConflict` can miss a conflict with a folder row that lacks a locale's `fullPath` (raw writes or legacy data); P-29 verify should list such rows. The Postgres harness runs out of its 100 connections when about 11 files each hold one or two pools of 10: P-17 must raise `max_connections` in `tests/helpers/postgres.ts`, cap the pool size, or cap the Postgres workers, and that comes first in G7.
- Commit `42dee943` carries an earlier wording of this file that named internal tooling paths. Squash the branch on merge so it does not reach `main`.
