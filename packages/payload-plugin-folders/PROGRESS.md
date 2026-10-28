# Folders plugin (Payload 4) - build progress

Build lead log for the unattended run (29 Oct - 6 Nov 2026). Inputs: `spec/payload.md`,
`spec/tickets-payload.md` and `spec/review.md` from `projects/folders-plugin/` on `origin/main` of
focusreactive-labs. The orchestrator reads this file and `~/.local/state/vacation-run/status/folders-payload.md`.

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
    and `--no-verify` is forbidden. If an unrelated package fails it, the push is a blocker recorded here.

### Owner decisions (from spec/review.md, the spec writer's pick applies)

- D14 Payload 3 port: not in this run; fund it right after v1.
- D19 npm: the package stays `"private": true`.
- D23 MongoDB: refused at config time.
- The four Sanity decisions do not touch this build.

### Scale and order

56 tickets at 134 agent hours, one developer at a time, on seats near their weekly limit, will not
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
