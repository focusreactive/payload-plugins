# Research — access control across the translator plugin's surface (#113 and wider)

Read against **0.13.1**, Payload **3.84.1**. Defensive audit requested by the maintainer.
Starting point is #113; the scope is the whole surface, not the one call it names.

## Problem statement

The plugin decides nothing about who may do what. It never asks Payload to apply a collection's
access rules to its own writes, and it ships with no gate on its HTTP endpoints. The identity of the
person who triggered a translation is available at the boundary and is thrown away one line later.
The result is that a host's own access rules — the ones they wrote to protect their content — do not
apply to anything the plugin does, and the plugin's endpoints answer to anyone who can reach the
server.

## Codebase map

**HTTP surface.** Nine endpoints, all registered on root `config.endpoints`
(`src/server/modules/translation-levels/PluginConfigBuilder.ts:160-173`), mounted at `/api` +
`basePath` (default `/translate`, `src/plugin.ts:146`):

| # | Method · path | Handler | Writes? |
|---|---|---|---|
| 1 | `POST /enqueue` | `src/server/features/enqueue-translation/handler.ts:23` | yes — queues jobs |
| 2 | `POST /run/:id` | `src/server/features/run-translation/handler.ts:14` | yes — runs a translation |
| 3 | `DELETE /cancel` | `src/server/features/cancel/handler.ts:14` | yes |
| 4 | `DELETE /cancel-by-collection/:slug` | `src/server/features/cancel-by-collection/handler.ts:17` | yes |
| 5 | `GET /document/:slug/:id` | `src/server/features/get-document-status/handler.ts:23` | no |
| 6 | `GET /collection/:slug` | `src/server/features/get-collection-status/handler.ts:19` | no |
| 7 | `GET /stale/:slug/:id` | `src/server/features/staleness/getDocumentStaleness.handler.ts:17` | no |
| 8 | `POST /stale/dismiss` | `src/server/features/staleness/dismissStaleness.handler.ts:13` | yes |
| 9 | `POST /field` (opt-in, `fieldLevel()`) | `src/server/features/translate-field/handler.ts:82` | no — but calls the provider inline |

**Guard.** `src/server/shared/http/withAccessCheck.ts:14` — `if (!access) return handler;`. All nine
are wrapped; `access` is optional with no default (`src/plugin.ts:39-41`). `AnyAccessGuard`
(`src/server/shared/access/AnyAccessGuard.ts`) exists but is used only by client widgets.

**Writes.** `overrideAccess` appears nowhere in `src`; `req.user` appears nowhere in `src` outside a
docblock example. Write sites: `src/server/features/translate-document/handler.ts:123-133` (target
locale), `:139-150` (publish), `src/server/modules/provenance/Provenance.store.ts:79,83-88,91-96,135-138`.

**Identity path.** Available at `withAccessCheck` (the guard receives `req.user`) and in the
auto-translate hook (`req.user`); dropped at both. Would have to travel through
`TransactionScope` (`src/server/shared/payload/TransactionScope.shapes.ts:8`), `TaskInput`
(`src/server/modules/task-runner/types.ts:22-36`), `StoredWorkflowInput`
(`src/server/modules/task-runner/payload-jobs-runner/types.ts:114-122`), and be rebuilt at
`src/server/modules/task-runner/payload-jobs-runner/PayloadJobsRunnerProvider.ts:133-153`.

**Prior art:** none. No existing plan covers access control; earlier docs only defer it.

## Framework facts, measured

1. **Payload does not authenticate custom endpoints.** `node_modules/payload/dist/utilities/handleEndpoints.js`
   contains no `auth`/`401`/`Unauthorized`/`user`; it matches method+path and calls the handler.
   `createPayloadRequest.js:79-85` resolves identity into `req.user`, defaulting to `null`. It
   identifies; it never rejects. Built-in collection routes are guarded; custom ones are the
   author's responsibility.
2. **A collection with no `access` block is not public.** `collections/config/defaults.js:57-65`
   stamps `defaultAccess` on all five operations, and `auth/defaultAccess.js:1` is
   `({ req: { user } }) => Boolean(user)`. So: any authenticated user, of any auth-enabled
   collection — anonymous is refused.
3. **`overrideAccess: false` with no user denies everything.** `auth/executeAccess.js:17-23` — with
   no rule declared, a user passes and no user throws `Forbidden`. Threading a user is therefore
   mandatory, not optional.
4. **Payload solves the deferred-write identity problem already.** Scheduled publish stores the
   requester on the job and rebuilds them at run time — `versions/schedule/job.js`:
   `input.user` is a relationship to the admin user slug; the handler does `findByID`, sets
   `user.collection`, and writes with `user` and `overrideAccess: user === null`.
5. **The job runner runs as nobody.** `queues/operations/runJobs/index.js:250` isolates only
   `transactionID`; the req it starts from has `user: null` (`queues/localAPI.js:177,191` →
   `createLocalReq.js:91`).

## The holes, by weight

### A. Writes bypass collection *and field* access control — #113
`src/server/features/translate-document/handler.ts:123-133`. Local API defaults `overrideAccess: true`
(`collections/operations/local/update.js:7`), which skips the collection rule
(`collections/operations/update.js:51`) **and** field-level access
(`fields/hooks/beforeValidate/promise.js:216-217`). Measured in #113: a collection declaring
`update: () => false` still accepted the translated value.
Reach: anyone who can trigger a translation, including through the auto-translate hook, causes writes
to fields and locales they could not write directly — and a publish of the target locale
(`handler.ts:139-150`).

### B. Every endpoint is open by default
`withAccessCheck.ts:14` + `plugin.ts:39-41`. Documented — README line 159 says "Omit to leave them
open" — but the default still ships an anonymous write surface. Anonymous callers can enqueue,
cancel, dismiss staleness, and read status.

### C. Unbounded provider spend from an anonymous request
`collection_id` has `.nonempty()` and no `.max()` (`enqueue-translation/model.ts:13`); `select_all`
calls `getAllCollectionIds` with `pagination: false` and no limit
(`_lib/collection-utils.ts:16-27`). Fan-out is `|documents| × |targets|`
(`enqueue-translation/handler.ts:80-89`), each task is one provider completion
(`core/translation-pipeline/stages/translation/Translation.stage.ts:32-37`), and the runner retries
three times by default (`PayloadJobsRunnerProvider.ts:31-37`, applied to both task and workflow).
Worst case per request ≈ `|collection| × (|locales| − 1) × 3` completions. Nothing in the plugin
bounds it.

### D. Raw error messages reach the caller, and can carry the provider key
`src/server/shared/http/withErrorHandler.ts:17-22` returns `e.message` verbatim on both branches.
The package already owns a sanitizer for exactly this —
`src/server/shared/http/toClientErrorMessage.ts`, whose docblock names
`401 Incorrect API key provided: sk-proj-…` and says such messages "sometimes [carry] secrets" — but
`withErrorHandler` calls only `failureReasonText`, which knows one catalogued reason and returns
`null` otherwise, so the `?? e.message` fallback is the normal path, in every environment.
Reachable path: `POST /field` calls the provider inline (`translate-field/handler.ts:155-162`).
Bounded by `fieldLevel()` being opt-in. The queued path is sanitized
(`get-document-status/model.ts:104-106`), so this is an asymmetry, not a missing idea.

### E. The two sidecar collections are readable and writable by any authenticated user
`Provenance.collection.ts:22-40` declares no `access`; `queues/config/collection.js:102-107` likewise.
Per framework fact 2 that means every logged-in user, however low-privileged.
- **Provenance** leaks the cross-product of (collection × document × translated locale), the time each
  locale was translated, and an equality-oracle hash of the source at that moment. Writable:
  `dismissedFingerprint` suppresses the staleness indicator (`Provenance.store.ts:119-128`,
  `core/domain/provenance/staleness.ts:20`); deleting rows makes everything look untranslated.
- **payload-jobs** leaks the same enumeration, and is **writable**. A crafted row is executed by the
  runner with access off. Bounded: `handler.ts:55-56` rejects a slug absent from `schemaMap`, so the
  blast radius is managed collections only — but within them it is arbitrary document + locale +
  publish. `admin.hidden` hides neither collection from the REST API
  (`collections/config/types.d.ts:412-414`, `collections/config/sanitize.js:86-88`).

### F. `POST /field` returns saved document content verbatim
Five noop paths return the value read from the document (`translate-field/handler.ts:19-28,121-168`),
fetched with `draft: true` (`shared/payload/sourceDocument.ts:25`) through the Local API, so
unpublished content is in scope and collection access does not apply. A `field_path` naming a group,
array or named tab returns that whole subtree (`resolveFieldSubtree.ts:68-69`); `getByPath` walks any
dotted path with no allowlist (`shared/utils/getByPath.ts:10-20`).

### G. Smaller, real
- **`cancel` is not scoped to the plugin's own jobs.** `PayloadJobsTaskRunner.ts:168-171` marks
  cancelled by id and queue only; only the follow-up delete is scoped by `ownJobs()` (`:173-176`).
- **`source_lng` is never validated** against configured locales on any endpoint; it reaches
  `payload.findByID({ locale })` (`translate-field/handler.ts`, `sourceDocument.ts:17-22`).
- **Field-path oracle.** `` `Field path "${field_path}" was not found in collection "${slug}"` ``
  (`translate-field/handler.ts:116-118`) distinguishes real fields from invented ones.
- **Managed-collection oracle.** The 400 on an unmanaged slug tells a caller which collections the
  plugin manages.

## What is already sound — do not "fix"

- **Slug validation is tight.** `isCollectionAvailable` (`_lib/collection-utils.ts:6-11`) is an exact
  `Set.has` against the configured collections, checked before any DB work, on all seven slug-taking
  endpoints; `translate-field` uses the equivalent `schemaMap.get`.
- **Stored job errors are sanitized** and gated on `NODE_ENV` (`toClientErrorMessage.ts:36-44`).
- **The auto-translate hook cannot reach another document** — the id comes from the hook's own `doc`
  (`AutoTranslateEnqueue.hook.ts:80`) and targets come from the collection policy, never the request.

## Size check — this is more than one task

Six independent decisions and three distinct subsystems. Proposed split, in the order the evidence
argues for:

1. **Identity and access on the plugin's own writes** (A) — the deepest change; carries the user
   through the same seam the transaction scope now uses, and needs Payload's scheduled-publish
   pattern for the deferred case. Everything else is smaller than this.
2. **Error-message sanitation** (D) — a few lines; the sanitizer already exists and is simply not
   called on this path. Cheapest fix of the highest-consequence leak. Could ship first, alone.
3. **Endpoint default posture** (B) and **spend bounds** (C) — one decision each, both breaking-ish,
   both about defaults rather than mechanism.
4. **Sidecar collection access** (E) — declare `access` on the provenance collection; document the
   `payload-jobs` exposure as a host concern or override it.
5. **Read-shape narrowing** (F, G) — smallest, and partly a product decision about what `/field`
   should answer with.

## Non-functional scan

- **Security / access control** — the whole subject. Relevant.
- **Performance** — relevant via C: an unbounded fan-out is also a database and pool event, not only
  a billing one.
- **Observability** — relevant: today a denied write would be indistinguishable from a silent no-op;
  see #124's lesson about failures with no trace.
- **i18n / localization** — relevant only as an input-validation gap (`source_lng`).
- **Accessibility** — N/A, no UI surface changes proposed.

## Draft acceptance criteria — first pass only (item 1, plus item 2)

1. **A collection rule denies the translated write.** A managed collection declaring
   `access: { update: () => false }` rejects the translation instead of accepting it.
   *Check: integration test asserting the target locale is unchanged and the failure is reported.*
   Fails now — this is #113's reproduction.
2. **A field rule denies the field.** A field declaring `access: { update: () => false }` is not
   overwritten while its siblings are. *Check: integration test.* Fails now.
3. **The inline path writes as the editor.** An auto-translation triggered by a save writes with the
   saving user's identity. *Check: unit test on the handler asserting the user reaches
   `payload.update`.* Fails now.
4. **The deferred path writes as whoever queued it.** A job carries the requester and rebuilds them
   at run time. *Check: integration test on the jobs runner.* Fails now.
5. **A job queued before this change still runs.** A row with no requester recorded does not throw.
   *Check: integration test seeding a pre-upgrade job row.*
6. **A provider error does not reach the caller verbatim.** `POST /field` with a failing provider
   answers the generic text outside development. *Check: unit test on the error wrapper asserting the
   raw message is absent.* Fails now.
7. **Nothing regresses.** *Check: full suite on all three adapters, both queue modes.*
8. **A job recorded with a requester who no longer qualifies fails with a stated reason**, visible in
   the status panel rather than silently. *Check: integration test.*
9. **The plugin refuses to start with neither an `access` guard nor an explicit opt-out.**
   *Check: unit test on plugin init.* Fails now — it starts silently.
10. **Checks clean:** unit, check-types both packages, lint at the repo baseline.

## Open questions

1. **Identity for the deferred write** *[resolved by the maintainer]* — write as whoever queued the
   translation, and check their rights. Matches Payload's own scheduled-publish precedent.
2. **A job with no requester recorded** *[resolved]* — see Clarifications.
3. **The requester was deleted or demoted while the job waited** *[resolved]* — see Clarifications.
4. **Endpoint default posture** *[resolved]* — see Clarifications.
5. **Spend bounds** *[non-blocking]* — a cap on `collection_id` length and on `select_all`, or left
   to the endpoint gate. Matters because: with a gate in place the anonymous case disappears, but an
   authenticated mistake can still be expensive.
6. **`/field` response shape** *[non-blocking]* — should a noop return the saved value at all?
   Matters because: it is the only place the plugin echoes document content back.
7. **Sidecar access rules** *[non-blocking]* — what the provenance collection should declare.
   `payload-jobs` is Payload's own collection; overriding it is a host decision the README could
   name.

## Clarifications

**A job with no requester recorded → bypass access, as Payload does.**
`overrideAccess: user === null`, matching `versions/schedule/job.js`. An upgrade does not strand work
already in the queue. The hole stays open for those rows only until the queue drains, which is
bounded and visible.

**A recorded requester who is gone or demoted → the translation fails, with a stated reason.**
Rights are checked when the write happens, not when it was asked for. The failure must be legible in
the panel and the log — #124's lesson is that a silent failure here costs more than the failure.

Note these two answers point in opposite directions on purpose, and the distinction is *what the row
knows*: "we never recorded a requester" is an old row we cannot judge, so it keeps today's behaviour;
"we recorded one and they no longer qualify" is an answer, and the answer is no.

**Endpoint default → the plugin refuses to start without an explicit decision.**
A host must supply an `access` guard or explicitly opt out of one. Not silently closed (that breaks
unauthenticated callers with no explanation) and not silently open (that is the present defect). The
upgrade cost is one deliberate edit to the config, and the host reads why while making it.

## Readiness

- Unresolved blocking questions: **0**.
- IN-scope items with no acceptance criterion: **0** for the proposed first pass.

Ready to design.

## Suggested next step

**Design first.** The identity thread crosses the hook, both runners, the job row and the provenance
module, and it changes a stored shape — that is a system-level decision, not a placement one.
Likely vectors: **contract** (what a job row stores, and what an upgraded install does with an old
one), **evolution** (a stored shape that already has rows behind it), **concurrency** (the identity
must survive a deferred, retried execution).

Item 2 — error sanitation — needs none of that and can be implemented on its own.
