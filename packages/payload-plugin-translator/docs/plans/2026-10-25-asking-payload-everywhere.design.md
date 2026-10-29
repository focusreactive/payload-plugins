## Architecture Design — one permission decision point

### The ask (ground truth)

Give the plugin one place that answers "may this actor perform this action on this target", so that
permission checking stops being wired into the translation feature and every entry point asks the
same way.

Constraints that shaped it: `AccessGuard` is published and **required since 0.14.0**, and it receives
no document, no locale and no action — so it can only answer "is this a trusted caller" · the queue
worker has no `Headers`, only a requester stored on the job row · the inline path runs inside the
editor's `afterChange`, where Payload calls `killTransaction` from the catch of every operation and
`mustPropagate` treats any foreign error as having already rolled the transaction back · the package
is on `1.0.0-next.5`.

Requirements:
- R1 (in) One contract answers the policy question, carrying actor + action + target. No entry point asks it its own way.
- R2 (in) Every entry point asks: the HTTP routes, the queue worker separately from enqueue, auto-translate, the field route.
- R3 (in) Feature modules receive a port or a wrapper, never a mechanism.
- R4 (in) Adding a new action is a change in one place.
- R5 (in) All six measured gaps are closed.
- R6 (in) The design states what becomes of `AccessGuard` and how a host migrates.
- R7 (in) The existing Payload-rule ask still works: "ask before acting, never catch `Forbidden`" weakens on no path, and the compile-time guarantee that a write cannot be sent without the rules having been asked about exactly that payload survives.
- R8 (out) The translation pipeline, the stored job row, the client half.

**Vectors:** structure + security + contract (leading: security) — security because the whole ask is
"who may do what"; contract because `AccessGuard` is implemented outside this repo and both sides
cannot change in one commit, and because a host callback that throws inside the editor's transaction
is the sharpest failure here.

### Decision points

- D1 [load-bearing] The shape of the question and the type that carries it (axis: authz-placement, abstractions)
- D2 [load-bearing] Where it is asked, and what enforces that it is (axis: authz-placement)
- D3 [load-bearing] What becomes of the published `AccessGuard` (axis: versioning-compat, contract-shape)
- D4 [load-bearing] Where the port lives and where the asker lives (axis: placement, dependencies)
- D5 [load-bearing] How the non-HTTP entry points ask (axis: authz-placement)
- D6 [minor] What an actor-less request means (axis: authz-placement)
- D7 [minor] When the host's guard is slow, throws, or answers with the wrong shape (axis: failure-backpressure, trust-boundary)
- D8 [minor] The action enumeration (axis: abstractions, versioning-compat)

### How it lands on the system

**The finding that decides everything: the plugin does not need a policy of its own.** There are
three questions, not one.

1. *"May this person use the translator at all?"* — only a host can answer. **The port already
   exists**: `AccessGuard`, asked at `withAccessCheck` on all nine routes. It lacks only the action.
2. *"May this person act on **this document**?"* — the host already wrote it, once, in the
   collection's `update` rule. Five of the six gaps are this question, unasked.
   `translate-document/translationPermission.ts` already asks it correctly and serves exactly one path.
3. *"May this person act on **this job**?"* — the only residue, answerable from state the plugin
   already stores (`requester_id` / `requester_collection` on the job row). A **rule**, not a port.

**The six gaps, measured.** `POST /run/:id` runs a job by id with no ownership or document check ·
`POST /cancel` and `POST /cancel-by-collection` the same · `POST /enqueue` with an explicit
`collection_id` checks neither read nor update · `POST /field` reads under the requester's read rule
and pays the provider without asking about update rights · the module seam hands a host module the
live `Payload` plus the run's target.

**A seventh, found during adjudication:** `POST /translate/stale/dismiss` checks read access and then
**writes** — `rebaseSourceFingerprint` re-bases the receipt, so a read-only caller can mark
translations accepted across the project.

**An escalation inside gap 1, verified in the code:** a job executes under its **stored** requester,
not the caller's. So a caller may trigger a write attributed to someone else, and — the sharp case —
may trigger a job whose requester is `null`, which runs with Payload's access checks off entirely.
No document-level question catches that.

**Reused rather than rebuilt:** `AccessGuard` and `withAccessCheck` · `mayWrite` / `rebuildRequester`
(moved, unchanged) · the branded `Requester` and `identityOf` · `ApprovedSource` / `ApprovedWrite` as
the proven enforcement idiom · `visibleIds` (moved) · `swallowOrThrow`.

### The design

**Abstractions**

- `AccessGuard` — unchanged type, in `src/types/AccessGuard.ts`. Its argument gains `action`.
- `TranslatorAction` (new, `src/types/TranslatorAction.ts`) — a closed, published union of the nine
  route actions. Outcomes (`queued|delivered|failed|cancelled`) never appear in it.
- `mayWrite` / `rebuildRequester` / `RebuiltRequester` — **moved** to `src/server/shared/access/permission.ts`, unchanged.
- `mayInitiate` (new) — `mayWrite` with empty `data`: "could this person save this document at all".
  Never authorises a write; the write keeps its own ask with the real payload. Six callers.
- `refusedTargets` (new) — the bulk form over a list of ids, returning the refused ones. Two callers.
- `AuthorisedWork` / `AuthorisedHandle` (new) — symbol-branded values in the existing idiom, demanded
  by `TaskRunner.enqueue` / `run` / `cancel`. The auto-translate hook mints `authorisedByTheSave()`, a
  named value whose docblock carries the reason, so its deliberate non-ask is visible code rather than
  an absence.
- `JobAssignment` + optional `TaskRunner.assignmentsOf(handles)` (new) — `{handle, collectionSlug,
  collectionId, startedBy}`, one per job. Deliberately not a widened `EnqueueAssignment`: that type is
  per-locale and is handed to host lifecycle callbacks, which must not start carrying requester ids.
- `Identity` (reshaped `identityOf`) — three-valued: `named` · `nobody` · `unnameable`.
- `ModulePayload` (new) — the narrowed type of the seam's `payload`, refusing the run's own collection.

**Dependency direction.** `src/types/` (leaf) ← `server/shared/access/` ← `server/shared/payload/` ←
`features/*` and `modules/*`. All edges downward, no cycle. The move of `visibleIds` out of
`features/_lib/` into `shared/payload/` is what keeps `shared/` from importing `features/`.

**Placement**

| responsibility | file |
|---|---|
| "may this caller use the translator" | `src/types/AccessGuard.ts` *(unchanged)* |
| the action vocabulary | `src/types/TranslatorAction.ts` *(new)* |
| asking the port | `src/server/shared/http/withAccessCheck.ts` *(gains the action, strict `=== true`, a throw is a refusal)* |
| asking the host's record rule | `src/server/shared/access/{permission,mayInitiate,refusedTargets}.ts` |
| proof an ask happened | `src/server/shared/access/authorised.ts` *(new)* |
| who the actor is | `src/server/shared/payload/identityOf.ts` *(reshaped)* |
| read-visibility of a list | `src/server/shared/payload/collections.ts` *(moved)* |
| job → document + `startedBy` | `modules/task-runner/TaskRunner.interface.ts` + both runners |
| the module seam's write path | `modules/translation-run/ModulePayload.shapes.ts` *(new)* |
| the write's own ask | `features/translate-document/targetDocument.ts` *(untouched)* |

**Data flow & ownership.** The actor has one owner, the branded `Requester`, with the two mint sites
that already exist. The rule about a document is owned by the host, in `access.update`, asked through
one function; the plugin stores no copy and caches nothing. The rule about a job is owned by the
plugin: *a job may be cancelled by anyone who may initiate on its document, and run by them too,
unless it is unattributed.*

**Security.** The decision is made on the server, per record, on every path: coarse at the edge before
body parsing, record-level inside each handler once the target is parsed, and at the queue sink via
the brand. A refused document and an absent one answer identically, so neither documents nor job
handles can be probed for existence. Revocation is caught because both asks are evaluated live and the
worker re-reads the user per job.

**Contract.** The published surface gains one property on the guard's argument and one optional method
on `TaskRunner`; nothing is removed or narrowed, so the change is additive. The guard gets no timeout:
it is an in-process callback of the same class as Payload's own access functions, and under this
design it is never called inside a transaction, so a hanging guard costs one request.

### Requirement coverage

| R | Design element |
|---|---|
| R1 | `AccessGuard` for the coarse question, now asked as `check({req, action})`; `mayInitiate` / `refusedTargets` for the record question. One contract per question — a single contract is impossible because the read side of the host's rule is folded into Payload's query and cannot be fronted |
| R2 | all nine routes (coarse) + the six document-scoped handlers (record) · the worker's existing ask at `readSourceIfAllowed`, re-evaluated at run time · the hook's decided non-ask, made explicit by a named mint · the field route before the provider call |
| R3 | chain members receive `ModulePayload`; route factories receive the guard by injection; handlers import the shared asker, which is the plugin's own rule rather than a swappable policy |
| R4 | one literal in `src/types/TranslatorAction.ts` plus the new route's factory |
| R5 | gaps 1–3 `assignmentsOf` + `mayInitiate` + the unattributed-job rule · gap 4 `refusedTargets` · gap 5 `mayInitiate` before the provider · gap 6 `ModulePayload` |
| R6 | `AccessGuard` is kept, its meaning narrowed in documentation, its argument extended. No host migration |
| R7 | `translationPermission.ts` is moved, not changed; the two brands and their distinct symbols are untouched; the probe is a separate question and never mints `ApprovedWrite` |
| R8 | the pipeline, the job row and the client half are untouched |

### Vector gates

**security — the wrong-caller gate.** *No session:* the coarse guard decides, then every
document-scoped handler refuses an actor-less HTTP request. *A valid user who does not own the
record:* the host's `update` rule is asked per document; job routes resolve to the document and ask
the same rule. *Another tenant guessing an id:* the read side returns nothing, so the answer is 404,
identical to absent; job handles answer 404 for both "no such job" and "not yours". *Revoked a minute
ago:* both asks are live, and the worker re-reads the user before re-evaluating. Residue, named: the
coarse guard is not re-asked in the worker, so a host that revokes translator access while leaving
collection rights lets queued jobs finish.

**contract — the other-side-misbehaves gate.** *Slow:* no timeout, deliberately; the blast radius is
one HTTP request because the guard is never on the worker path and never inside a transaction.
*Down or throwing:* a throw is a refusal plus a log, not a 500. *A shape it did not promise:* only a
literal `true` allows; today `if (!hasAccess)` would accept the string `"false"`. `assignmentsOf`'s
answer is parsed at the seam before it authorises anything. *Delivered twice:* the guard is already
called twice per user action, and that idempotency obligation becomes documented rather than assumed.

### Decisions (ADRs)

#### D1. No new port: one coarse question to the host, one record question to Payload

- **Context:** the host has already written per-record rules in `access.update`. Five of the six gaps
  are that question, unasked. The read side of the host's rule is folded into Payload's query and
  cannot be fronted by a central policy.
- **Options considered:**
  - a new `TranslationPolicy.decide({actor, action, target})` beside the guard (`least-privilege`)
  - an `AccessPolicy.may(question, ctx)` replacing the guard (`centralised-policy`)
  - no new port: one coarse question and one record question (`data-minimisation`)
- **Decision:** the third. The first is disqualified under **ST5** — the constraint cited for the port
  is "a host may want to be stricter", which is the unverifiable future caller **ST1** excludes — and
  its only in-repo implementation would delegate back to Payload. Under **SC2** a host-implemented
  policy *creates* a second copy of a rule the host already wrote, and two copies of a permission rule
  drift. Clears **ST1** (every new name has two in-repo callers), **SC2**, **CT1**.
- **Consequences:** the plugin commits to Payload's `docAccessOperation` as its record authority; a
  host wanting a translator-specific record rule must express it in `access.update` or in the guard.
  Unverified: whether any host wants such a rule — none is known, and a port can be added later
  additively, which is the cheap direction.

#### D2. Coarse at the edge, record inside the handler, and a brand at the queue sink

- **Context:** `withAccessCheck` runs before body parsing, so it cannot see the target. A shared
  function alone has no mechanical choke point; the plugin has twice proved the branded-sink pattern.
- **Options considered:**
  - a route builder that is the only way to declare a route, so a route without an action does not compile
  - a shared function plus one pin test per route
  - pushing the owner filter into the job query itself — *not proposed by any candidate, raised at adjudication*
- **Decision:** the second, plus a brand demanded by `TaskRunner.enqueue/run/cancel` that only the ask
  can mint. The third is rejected as the sole mechanism because the host's document rule cannot be
  expressed as a query filter on the jobs collection; its concern (**SC3**) is answered by the brand.
  The first is rejected on cost: it rewrites every handler's parse path to buy a guarantee the brand
  already gives at the only sinks that have effects.
- **Consequences:** commits the plugin to brands as the enforcement idiom, a third family after
  `ApprovedSource` / `ApprovedWrite`. The field route stays guarded by a call plus a pin test rather
  than a type, because a brand there would have a single mint site today (**ST1**).

#### D3. `AccessGuard` is kept; its argument gains the action

- **Context:** published, required since 0.14.0; the ripple is three production call sites, one
  implementer, about nine type consumers, about thirteen test files, three sites in `apps/`, and every
  host that wrote a guard. The brief asserted the shape must change because the worker has no headers.
- **Options considered:**
  - keep it untouched and add a second port beside it
  - replace it, with one prerelease of deprecation and an adapter
  - keep it unchanged and narrow only its documented meaning
  - keep the type and extend the argument with the action — *grafted at adjudication*
- **Decision:** the fourth. The brief's premise dissolves under D1: the worker never calls the guard,
  so the guard never needs a shape that works without headers. The change is therefore **additive
  (CT1)**, not breaking — a host implementing `check({req})` is unaffected. Replacement is disqualified
  under **CT1** because its own migration adapter leaves revocation undetected: breaking *and* weaker
  has no version window that makes it safe.
- **Consequences:** one case breaks and is accepted — a host that constructs the argument itself must
  add `action`. No shim, therefore no shim-removal trigger to forget. The plugin permanently forgoes
  asking the host's guard on the worker path.

#### D4. The asker moves down into `server/shared/access/`

- **Context:** `src/types/` is not Payload-free; `src/core/` is, and is pinned by a test. The asker
  must be callable from an HTTP request, a React server component and the worker.
- **Options considered:** a new port in `src/types/` plus an asker in `shared/access/` · no port, and
  move the existing asker down.
- **Decision:** the second. `src/types/` gains only `TranslatorAction`. `visibleIds` and
  `getAllCollectionIds` move from `features/_lib/` to `shared/payload/collections.ts`, because
  otherwise `shared/` would import `features/` — an upward edge (**ST2**). Clears **ST2**, **ST3**,
  **ST6**.
- **Consequences:** two pure moves land before any behaviour change, which is what makes the rest of
  the sequence incremental.

#### D5. The worker asks Payload; the hook asks nothing; jobs resolve to documents

- **Context:** three paths — the worker (no request, a stored requester, runs later), the hook (inside
  the editor's transaction), the module seam. `mustPropagate` returns `true` for any foreign error.
- **Options considered:**
  - the worker and the hook both ask a policy, swallowing refusals
  - the worker asks Payload with the stored requester; the hook asks nothing
  - for the job question: `startedBy` on a job target · a new `describeJob` · an optional `assignmentsOf`
- **Decision:** the second, with the job variants merged into an optional `assignmentsOf` returning a
  `JobAssignment` that carries `startedBy`. The worker's existing ask at `readSourceIfAllowed` **is**
  the ask — with the real data, at the real target locale, against a freshly read user, before any
  spend, and it adds no round trip. The hook asks nothing: a host callback that throws there destroys
  the editor's save, and a refusal would only pre-empt a job the worker refuses anyway before paying.
  `run/:id` additionally refuses a job whose `startedBy` is null.
- **Superseded 2026-10-26 — `assignmentsOf` is required, not optional.** Optionality was chosen to
  keep step 6 non-breaking; the branch acquired two breaking commits regardless, so it bought only a
  worse failure — a project that builds while run and cancel answer `403`. See
  `2026-10-25-jobs-resolve-to-documents.task.md`, *Amended 2026-10-26*. Read every "optional
  `assignmentsOf`" in this document, and in the build sequence below, as "required".
- **Consequences:** `TaskRunner` gains a required method; a runner that omits it does not compile.
  **SC6 residue, named:** a run triggered by A on B's job is still attributed to B; closing that
  properly means a stored-row change, which is out of scope. An interim log line names both.

#### D6. Absence is trusted only when it was absence all along

- **Context:** `identityOf` today downgrades a user to unattributed, with a warning, when a project has
  several auth collections and the user carries no `collection` — and an unattributed request is fully
  trusted. The in-process trust is deliberate and pinned by an integration test.
- **Options considered:** fail closed everywhere with an escape flag · the host decides · refuse on
  HTTP but keep in-process trust.
- **Decision:** a three-valued `Identity` — named, nobody, unnameable — and the rule above. HTTP with
  no user is refused at the record ask. In-process with no user stays trusted, so the pinned test stays
  green. A request carrying a user the plugin cannot name is **refused**, not downgraded.
- **Consequences:** the silent privilege escalation — a real user becoming a trusted anonymous writer —
  is removed. No configuration flag is introduced, so there is none to forget.

#### D7. A throw is a refusal; only `true` allows; no timeout

- **Context:** `withAccessCheck(withErrorHandler(handler), access)` puts the error handler *inside* the
  guard, so a throwing guard yields a 500, and `if (!hasAccess)` accepts any truthy value.
- **Options considered:** bound the host call with a timeout and a fallback · fail closed on throw,
  strict `true`, no timeout.
- **Decision:** the second. No timeout, because the guard is an in-process callback of the same class
  as Payload's own access functions, and under D5 it is never inside a transaction (**CT6**).
- **Consequences:** a host whose guard throws now sees 403 instead of 500 — strictly safer, and worth a
  release note. A pathological guard can hang one HTTP request.

#### D8. The action union rides the coarse question only

- **Context:** R1 asks that the question carry an action; R4 asks that a new action be one change.
- **Options considered:**
  - an eleven-action union with a target-correlation table driving the record question
  - the same union inside a replaced port
  - no union at all: "there is one question"
  - a closed union carried by the coarse question only — *grafted at adjudication*
- **Decision:** the fourth. The record question does not branch on the action — every document-scoped
  action asks the same thing — and giving that function a parameter it never reads would break the rule
  that a signature claims only what the answer depends on. The coarse question genuinely can branch: it
  is the only place a host can say "editors may enqueue but may not cancel other people's bulk jobs".
- **Consequences:** the union is plugin-owned and closed; a host switching on it must keep a default
  branch, because it grows additively (**CT1**).

### Build sequence

1. Move the permission asker down to `shared/access/permission.ts` — no behaviour change; the test moves with it · covers: R7 · via /sp-task · incremental
2. Move `visibleIds` and `getAllCollectionIds` to `shared/payload/collections.ts` — removes the only `shared → features` edge the next steps would need · covers: R7 · via /sp-task · incremental
3. The field route asks: `mayInitiate` after parse, before the source read and before the provider · covers: R2, R5 · via /sp-task · incremental
4. The action reaches the guard: `TranslatorAction`, `withAccessCheck(handler, access, action)`, strict `=== true`, a throw becomes a refusal; nine routes and two widgets pass their literal · covers: R1, R4, R6 · via /sp-task · incremental
5. Enqueue asks per document: `refusedTargets` for the explicit-id path; `select_all` keeps its read filter · covers: R2, R5 · via /sp-task · incremental
6. Jobs resolve to documents: `JobAssignment` + optional `assignmentsOf` on both runners; run, cancel and cancel-by-collection ask; `run` refuses an unattributed job · covers: R2, R5 · via /sp-task · incremental
7. The brand at the sink: `AuthorisedWork` / `AuthorisedHandle` demanded by the runner's three methods, minted by the four handlers and by the hook as `authorisedByTheSave()` · covers: R2 · via /sp-task · incremental
8. Identity stops downgrading: the three-valued `Identity`; HTTP refuses `unnameable`; the hook skips it with a warning; the no-user case is untouched · covers: R2 · via /sp-task · incremental
9. The module seam: `ModulePayload` refuses the run's own target collection; provenance needs no change · covers: R3, R5 · via /sp-task · **big-bang for host chain members**, with a release note
10. Pins and docs: one pin per route for both asks, the field-route spend pin, `@since` on the guard's `action`, the idempotency obligation in its docblock · covers: R1, R6 · via /sp-task · incremental

### Open questions / unresolved

- **A seventh gap the framing never asked about.** `POST /translate/stale/dismiss` checks read access
  and then writes: `rebaseSourceFingerprint` re-bases the receipt, so a read-only caller can mark
  translations accepted across the project. It is closed by the same `mayInitiate` call as the others.
  **Recommend folding it into step 3**; reported rather than silently added because it was out of scope.
- **`run/:id` attribution.** The decided rule authorises by document and refuses unattributed jobs, but
  a run triggered by A on B's attributed job is still recorded as B's. Closing it properly means
  re-attributing the job (a stored-row change, out of scope) or splitting "who queued" from "who ran"
  in the receipt. Deferred with a log line. Blocks nothing.
- **Unverified:** whether any host wants a record rule that is translator-specific rather than
  collection-specific. None is known. If one appears, a port can be added additively later.

### Accepted deviations

- **SC1, "on every path", for in-process unattributed callers.** A save or local-API call carrying no
  user still produces a job that runs with Payload's checks off. Permitted by the pinned decision in
  `apps/dev/src/integration/translator/access-control-unattributed.int.test.ts` ("It was trusted before
  this change and stays trusted"). Cost: a host whose server-side code is compromised can translate
  into collections its users may not write. What would force revisiting: a caller reachable from
  outside the host's process without a user, or a host asking for a strict mode.
- **ST2, the pre-existing `modules/provenance → features/staleness` edge.** Untouched by this work.
  What would force revisiting: a second module needing a feature, or the staleness routes moving.

### Rejected / grafted (for the record)

- A `TranslationPolicy` beside the guard — disqualified: **ST5**, and **ST1** (its only verifiable implementation delegates to Payload).
- `OwnCollection` + `reserveCollection`, and `ModuleStore` + `ownedCollections` — disqualified: **ST1**, one in-repo caller each plus a hypothetical host module.
- Fail-closed unattributed with an escape flag — disqualified: it contradicts a pinned, deliberate decision; the flag is the admission.
- Replacing `AccessGuard` — disqualified: **CT1**, breaking a required published type with an adapter that weakens revocation detection.
- Asking the host policy inside `afterChange` — disqualified: a foreign throw propagates and destroys the editor's save.
- Routing the field route through `openTargetDocument` — disqualified: **ST2**, a sideways feature-to-feature edge, plus a question about data the route does not yet have.
- **Grafted:** the job question carrying `startedBy` · "a user that cannot be named is a denial" · the action union, narrowed to the coarse question · "a route cannot be registered without an action", in spirit, as the brand at the sink.
- **Replaced:** `assignmentsOf` returning `EnqueueAssignment` — that type is per-locale and reaches host lifecycle callbacks, which must not start carrying requester ids (**SC4**).
