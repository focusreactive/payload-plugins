# One document, or a list

## Requirements / Task restatement

A run can be narrowed to named leaves. A leaf's address carries the id of the element it sits in,
so an address names one document and no other. The enqueue route accepts a list of documents and a
list of filters side by side, and copies one filter list to every document in the request. With a
top-level address that is harmless; with a nested one every document but the first matches nothing,
translates nothing, and reports success.

The request shape is what permits it, so the request shape is what changes: one route takes a
single document, another takes a list, and a leaf address is only accepted by the first.

- R1 (in) A leaf address cannot be sent together with more than one document — not refused at
  runtime, but absent from the shape that reaches the server.
- R2 (in) A rule still narrows a run over any number of documents: a rule is a question the server
  answers per document, not an answer computed by the caller.
- R3 (in) The list route is a surface a host may permit separately from the single-document one.
- R4 (out) A filter naming top-level field names. It has no caller and no screen; the list route's
  filter type is shaped so it can join later without changing the request.
- R5 (out) `select_all`, which stays exactly as it is.
- R6 (out) Per-user abilities. The admin learns what registered, never what this user may do.

## What this starts from (measured)

- One route, `POST {basePath}/enqueue`, guarded by the action `enqueue`
  (`enqueue-translation/route.ts:24-26`).
- Its handler copies one filter list to every document: `workFor` builds one task per
  (document × target locale), each carrying `filters: asked`
  (`enqueue-translation/handler.ts:131-141`).
- The behaviour is pinned by a spec that asserts it on a top-level address, where it is harmless:
  `field-selection.int.test.ts:119`, "applies one leaf list to every document it was sent with".
- A rule is answered per run, with the document and target locale in hand
  (`translate-document/selectLeaves.ts:53-60`). One rule exists, `stale`.
- The handler already branches three times on `select_all` — which ids, which authorisation, which
  in-flight lookup (`handler.ts:147-154`, `:169-171`). The one/many distinction is not what those
  branches are about.
- **Precedent, same shape.** The reads were split this way: `document-state` and `list-state` are
  two routes, two handlers in two feature folders, sharing small helpers through `features/_lib/`.
  Both reuse an action that already existed — the guard table pins it, and a dedicated case says so
  out loud ("a read that answers better does not add an action").
- **Precedent, the guard table is total.** `routeForEveryAction` is a `Record<TranslatorAction, …>`,
  so adding a member to the published action union stops the compiler until the new route is mapped.
- The client's own test harness serves the same routes in process: `createStubRoutes` keeps a
  table of `{ name, action, handler }` and reuses the server's own input schema, so the split
  reaches it too — one row and one handler.
- The admin has two callers and one hook: `documentEnqueue` (one document) and `collectionEnqueue`
  (a list), both through `useQueueDocumentTranslation`. One repository method, `enqueue`, with an
  HTTP implementation, an in-memory fake and a contract suite over both.

## Decisions

### D1. Two routes, two handlers, one shared core, in the feature folder that already exists

- **Chosen:** `enqueue-translation/` keeps one folder and gains a second route factory and a second
  handler. What both do — resolve locales, build the work, authorise, refuse a locale holding
  nothing, admit against live runs, call the runner, shape the answer — moves into one unit both
  call with ids and filters already settled.
- **Why it bites:** the two differ in three lines of input handling and share some eighty of
  behaviour. The read split used two folders because its two handlers share almost nothing: they
  assemble different answers. Here they assemble the same work.
- **Rejected — two feature folders:** the shared core would move to `_lib` to be read from both,
  which is the same code one hop further from either reader.
- **Rejected — one route that refuses the illegal body:** a refusal is a runtime answer, and R1
  asks for a shape. It also leaves the combination expressible in the client's own types.

### D2. The single-document route keeps the path and the action; the list route takes new ones

- **Chosen:** `POST {basePath}/enqueue` keeps its path and the action `enqueue`, and now accepts
  exactly one document. The list route is `POST {basePath}/enqueue-list`, guarded by the new
  action `enqueue-list` — named after the pair the reads already use, `document-state` and
  `list-state`.
- **Why it bites:** a caller outside this repository most likely translates one document. Keeping
  that path spares the common case, and the published action union keeps the member it already has.
- **Rejected — rename both for symmetry** (`enqueue-document` / `enqueue-list`): a second broken
  path, for every caller rather than only the ones sending a list, to gain a tidier pair.
- **Consequence:** a host whose guard answers by an explicit list of action names refuses the list
  route until that host adds the new member. The refusal is quiet — the bulk panel's request
  answers 403 — so it belongs in `docs/DEPRECATIONS.md` and in the release note.

### D3. No second ability flag

- **Chosen:** the admin keeps one `translate` flag, derived from the single-document route.
- **Why it bites:** `deriveAbilities` reads which routes **registered**, not what the user may do,
  and both routes register together. A second flag derived from registration would always equal the
  first. The case it looks like it would serve — this user may translate one document but not a
  list — is the per-user gap that already exists for every action, and it is not this task's.
- **Rejected — a `translateList` flag:** a field on a published type that cannot carry a second
  answer.

### D4. The list route's filter type is a union with one member today

- **Chosen:** the list route accepts rule filters only, typed so a second kind joins by naming it.
- **Why it bites:** R4 keeps the field-name filter out, and this is what makes keeping it out free
  rather than a thing to undo.

### D5. The client repository gets two methods

- **Chosen:** `enqueueDocument` and `enqueueList` replace `enqueue`, each taking its own request
  type. The HTTP implementation, the in-memory fake and the contract suite follow.
- **Why it bites:** one method taking a union would let the admin's own types express the body the
  server no longer accepts, and the mistake would surface as a 400 at runtime rather than in the
  editor.
- **Rejected — keep one method and pick the route from the shape:** hides the distinction the task
  exists to draw.

**Also reached:** the client's in-process test harness, which registers the same routes.
**New surface:** two published route paths where there was one; one new member of the published
action union; two repository methods replacing one. The shape check fired on "a field added to a
published type" (answered by D3: no field is added) and on "a new parameter on an exported
function" (answered by D5: two named requests rather than one widened one).
**Written contract owed:** the list route's filter type owes its reader why a union of one exists.
**Escalate:** no — the shape was decided with the owner before this contract.

## Acceptance criteria

| # | Covers | Criterion | How it is checked | Pre-flight |
|---|---|---|---|---|
| AC1 | R1 | The single-document route translates the named leaves of its one document and leaves every sibling untouched | an integration spec over the document route | **passes now** — stays-true, through the route being reshaped |
| AC2 | R1 | A body naming more than one document is refused by the single-document route | same spec, reading the status and the message | **fails now** — such a body is accepted and executed |
| AC3 | R2 | The list route translates several documents and narrows them by a rule, each document answered on its own | a new integration spec over the list route | **fails now** — the route does not exist |
| AC4 | R1 | A body carrying leaf addresses is refused by the list route | same spec | **fails now** — same |
| AC5 | R3 | The list route asks about its own action, and a guard answering only `enqueue` refuses it before its handler runs | unit cases over both routes, the second with a guard naming one action | **fails now** — one route, one action |
| AC6 | R1, R2 | The admin's single-document path and its bulk path reach different routes | unit cases over the repository's two methods, each asserting the path its request goes to, with the existing panel cases staying green | **fails now** — one method, one path |
| AC7 | R4 | A rule filter is all the list route's request type admits, and admitting a second kind later needs no change to the request | the type, read by a case that tries a leaf filter and does not compile | **fails now** — the type does not exist |
| AC9 | R1 | A request asking for a whole collection is refused by the single-document route rather than quietly narrowed to the one document its body happened to name | a unit case over the document route | **fails now** — the key would be dropped and the request answered as a one-document run |
| AC8 | — | The baselines hold | package suite ≥ 3037 passed / 15 skipped · integration ≥ 316 passed / 7 skipped, 0 failed · `check-types` 10/10 · `oxlint .` ≤ 26 warnings, 0 errors · build exits 0 | **passes now** — measured |

AC1 is the one most easily lost: the single-document route is the existing route reshaped, and the
reshaping is where its current behaviour can quietly change.

## Risk

**High.** Three published surfaces move at once: a route path, the action union a host's access
guard answers, and the request bodies. A host upgrading gets a quiet 403 on bulk translation until
the new action is added to its guard, and that is the failure mode most likely to be reported as
"translation stopped working" rather than as a permission error.

The internal exposure is the shared core: one unit now serves both routes, and a mistake in it
breaks every translation rather than one path. That is why the behaviour specs for the existing
route are the ones that must stay green rather than be rewritten, and why the spec pinning today's
multi-document behaviour is rewritten deliberately and named in the report.

Rollback is a revert; nothing is stored differently and no migration is involved.

## Decisions by the owner

- 2026-11-25 — the routes are split rather than the body narrowed: a separate route is a place to
  hang a separate permission later, and the cross-collection dashboard will be another route
  regardless.
- 2026-11-25 — the list route is `/enqueue-list` with the action `enqueue-list`, and the
  single-document route keeps `/enqueue` and `enqueue`. Hosts add the new action to their guards. The
  alternative, reusing `enqueue`, was declined because it leaves the two sizes of request
  permanently inseparable.
- 2026-11-25 — a filter naming top-level field names waits for the screen that would use it.
- 2026-11-25 — `select_all` is left as it is in this task.
- 2026-11-25 — the tests for both routes are written before the split.
