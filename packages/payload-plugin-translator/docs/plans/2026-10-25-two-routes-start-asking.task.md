Build step: 2026-10-25-asking-payload-everywhere.design.md #3

## Task restatement

Two HTTP routes act on a document after asking only whether the caller may **read** it. Both start
asking whether the caller could **change** it, through one new function in the shared layer.

- **`POST /translate/field`** reads the source under the caller's read rule and pays the translation
  provider. It never asks about update rights. Gap 5 of the design, and its trace 1.
- **`POST /translate/stale/dismiss`** checks read access and then **writes**: `ProvenanceService.dismiss`
  calls `store.rebaseSourceFingerprint`, which re-bases the receipt so the out-of-date indicator goes
  quiet for everyone. The seventh gap, found at adjudication and recorded in the design's
  `## Open questions`.

Covers **R2** and **R5**. Nothing from steps 4–10 is in scope; the worker and the auto-translate hook
are not touched at all.

## What already exists — platform · installed · project · verdict

| Rung | Found | Verdict |
|---|---|---|
| project | `mayWrite` (`shared/access/permission.ts`) — asks the collection's `update` rule through Payload's own `docAccessOperation`, the evaluator behind `/api/<slug>/access` | **the mechanism.** `mayInitiate` is it with empty `data` |
| project | `identityOf` (`shared/payload/identityOf.ts`) — turns a request into a `Requester` (id + auth collection) | **not what `mayWrite` needs.** It wants a `RebuiltRequester`: the user *document* plus its collection key, because Payload's evaluator needs a user, not an id |
| project | `req.user` on the HTTP path | **is** a `RebuiltRequester` when it carries `collection`, which `TypedUser` does. No rebuild, no round trip |
| project | `ServerResponse.forbidden()` / `.notFound()` | reused unchanged |
| project | `provenance-access.int.test.ts` | the project already named this exact threat — *"overwrite the dismissal field to silence the out-of-date indicator on someone else's document"* — and closed the **direct** path by locking the sidecar collection. The route is the other door |

Nothing new is installed.

## Decisions

### D1 — one new function, `mayInitiate`, in `shared/access/`

**Chosen:** `mayInitiate` beside `mayWrite`, asking the same rule with `data: {}`.

**Rejected — call `mayWrite` directly from both handlers with an empty object literal.** It would put
the same undocumented `{}` at two call sites and leave nothing to name why it is empty. The empty
payload is the whole point: the question is "could this person save this document at all", not "may
this exact write go through", and a named function is where that distinction is stated once.

**Constraint cited:** `mayWrite` carries a stated precondition — "`data` must be the payload that
write will send" (`permission.ts`) — and both of these calls deliberately break it. A named function
is where that exception is stated once rather than re-explained at each site. Two callers exist today,
both in this task; later steps may add more, but a caller that is not in the codebase does not count
towards the two.

### D2 — what the dismiss route asks about

**Chosen:** the **source document** named in the request — the same document whose staleness is being
dismissed — not the provenance sidecar row.

**Rejected — ask about the sidecar collection.** The sidecar is deliberately closed to everyone
(`provenance-access.int.test.ts`), so asking there would refuse every caller, including legitimate
ones. The decision the route actually makes is "this person says this document's translation is
fine", which is a claim about the document.

**Constraint cited:** `ProvenanceService.dismiss` already takes `req.user` and reads the source
document under that user's read rule; the ask lands beside a check that is already about the source.

**Noted, not a defect:** `mayInitiate` asks with empty data, so a host rule that branches on `data`
answers a slightly different question than it would at a real write. For the field route this cannot
matter — it writes nothing. For dismiss, the write goes to the sidecar, not to the document, so no
`data`-dependent rule on the document would be the right thing to ask anyway.

### D3 — whether an actor-less request is refused

**This is the gate question.** Both routes can be reached with no user: `AnyAccessGuard` is a
supported configuration, and the integration helper `callEndpoint` defaults to `user: null`.

Today, everywhere in the plugin, "no requester" means the question is not asked
(`checkTranslationPermission`, `enforcedAtTheRead`, `enforcedAtTheWrite`). The design's step 8 is
where that policy is re-decided, through a three-valued identity. Doing it here would decide step 8's
question early — and three integration suites (`per-field-receipt`, `field-surface-noop`,
`field-surface-errors`) call the field route with no user, so it would turn them red.

Options and their costs are in the gate message.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R2 | `mayInitiate` exists in the shared layer and both handlers call it | `grep` for its declaration and its two call sites | 1 declaration, 2 callers |
| AC2 | R5 | A named caller the `update` rule refuses gets 403 from `POST /translate/field` | a new case in `src/server/features/translate-field/__tests__/` | exit 0, the case runs |
| AC3 | R5 | …and **the provider is never called** for that caller | the same case asserts the provider double got no call; **mutation**: move the ask after `translateContent` and the case must go red | red on the mutation |
| AC4 | R5 | A named caller the rule refuses gets 403 from `POST /translate/stale/dismiss`, and the receipt is unchanged | a new case in `src/server/features/staleness/__tests__/` asserting the store's write was not called | exit 0, the case runs |
| AC5 | R5 | Neither change is a blanket refusal: a caller the rule allows still gets a translation and still dismisses | the existing `read-access-field.int.test.ts` case *"still translates for a caller the rule allows"* stays green, plus the allowed half of the new cases | exit 0 |
| AC6 | R2 | The ask happens before the source is read | read the handler: `mayInitiate` precedes `fetchSourceDocument` | true, and AC3's mutation proves the order matters |
| AC7 | — | Behaviour is otherwise unchanged | `bunx vitest run`; count changed assertion lines in pre-existing test files | **0** changed assertion lines; any count change explained by the per-file suite |
| AC8 | — | End to end, with a real Payload | rebuild, then from `apps/dev`: `bun run test:integration` | **225 passed / 8 skipped**, or more with every addition named |
| AC9 | — | No new type errors, no new analyzer findings, the real build passes | `check-types` in the package and `apps/dev`; `sp-lint-delta.sh`; `turbo run build` | `0`, nothing introduced, exit 0 |

## Pre-flight

| AC | Result now | Kind |
|---|---|---|
| AC1 | `mayInitiate` appears **0** times in `src/` | must change — fails now ✓ |
| AC2, AC3 | the field handler names no update check; `fetchSourceDocument` at `:76` and `translateContent` at `:131` run for any caller the read rule allows | must change — fails now ✓ |
| AC4 | the dismiss handler names no update check | must change — fails now ✓ |
| AC6 | nothing precedes the read | must change — fails now ✓ |
| AC5, AC7 | 190 files / **2491** passing | invariant — passes now ✓ |
| AC9 | `check-types` 0; oxlint 43 warnings, 0 errors | invariant — passes now ✓ |
| AC8 | 225 / 8 at the last run on this tree | invariant — re-run in Phase 5 |

## Risk notes

- **High risk, and it binds.** This changes who may do what, on two routes, and one of them spends
  money. A test is required before it is called done, the regression sweep is evidenced, and Phase 5b
  runs several review angles.
- **A refusal must cost nothing.** The whole point of AC3 is that the ask precedes the provider call.
  An implementation that asks after reading but before writing would pass AC2 and still leak the
  spend — which is why AC3 is mutation-proven rather than asserted.
- **Three integration suites call the field route with no user.** They are the reason D3 is a gate
  question rather than a decision I take alone.
- **`callEndpoint` builds the request in-process**, so "no user" in those suites means "a request that
  carried no user", which in a deployment means the host's guard let an anonymous caller through.
- Not in scope: the action union (step 4), the enqueue ask (5), jobs resolving to documents (6), the
  brand at the queue sink (7), the three-valued identity (8), the module seam (9).

## Human choices

**2026-10-25, at the gate.** *"Не спрашивать, как везде"* — D3 resolves to asking only when the
request carries a nameable user. An actor-less request is treated exactly as every other path in the
plugin treats it today, and the policy for such requests is re-decided at step 8, where the design
introduces a three-valued identity.

The alternative — refuse an actor-less caller here — was offered and declined. It would have closed
more, but it would have decided step 8's question early, piecemeal, and without the reasoning step 8
is going to do; and it would have turned three integration suites red for a reason unrelated to what
they test.

## Review log

**2026-10-25, Phase 5b — three independent angles**, run because the Risk notes classify this change
high risk (it changes who may do what, and one of the two routes spends money).

| Angle | Asked to break | Outcome |
|---|---|---|
| the guarantee | every path to the effect that skips the ask, on both routes and both `route.ts` files | no way round it; one real defect found (below) |
| the new tests | whether either file is green-but-toothless — mock interception, revert-sensitivity, fixture honesty | no toothless case; both mocks resolve to the module the handler imports |
| the shape | whether `mayInitiate` earns its existence, its signature, and its placement | keep it; two wording findings, both applied |

### R1 — a document that is not there failed the ask instead of answering it (found, fixed here)

`mayInitiate` asks with empty `data`. Payload's `docAccessOperation` sets `fetchData: id ? true : false`,
and `getEntityPermissions` treats `{}` as "no data supplied", so it loads the document itself with
`findByID` — **without** `disableErrors`. A nonexistent id therefore threw `NotFound`, which `evaluate`
wrapped as `PermissionCheckFailed`, which is a `TranslatorError` rather than an `APIError`, so
`withErrorHandler` answered **500** carrying the "that save was rolled back" sentence.

Verified by probe rather than by reading: the real evaluator, driven with a `findByID` that rejects
with `NotFound`, returned `{"kind":"threw","name":"PermissionCheckFailed"}` instead of a boolean.

Before this task the field route answered `404` for a missing id, because `fetchSourceDocument` sets
`disableErrors: true` on purpose and `sourceDocument.ts` states that absent and refused are
deliberately the same answer. The ask broke that, so the defect belongs to this task and is fixed in
it: `absenceIsNotARefusal` lets an absent document through the ask and leaves the answer to the
caller's own read. Every other failure is still raised.

Three checks in `shared/access/__tests__/mayInitiate.absentDocument.test.ts`, written red (1 of 3 red,
for the right reason) and each proven by its own mutation — answering `false` for absence reddens only
the first; swallowing every failure rather than only absence reddens only the third.

### R2 — refused and absent are now distinguishable (recorded, deferred to step 8)

With R1 fixed, an existing document the caller may not update answers `403` and a document that is not
there answers `404`, so a caller who can reach the route can tell that a document exists. Before this
task both answered `404`. The leak is small — the route already requires whatever the host's own guard
demands, and ids are usually guessable — but it is a real change and it is the same question step 8
settles when identity becomes three-valued. Not closed here, because closing it means choosing between
`403` and `404` for both cases, which is a contract decision for the owner rather than a defect.

### Applied from the shape angle

- D1's justification above no longer rests on callers that do not exist; it rests on the precondition
  `mayWrite` states and these two calls deliberately break.
- The `scope` sentence in `mayInitiate`'s docblock was dropped: omitting the parameter already says it.
- `FieldTranslation`'s contract now says a `403` is something only a named caller can be, so a reader
  does not take "refused (`403`)" as covering an actor-less request.

### Verification after the fix

`check-types` 0 · oxlint 43 warnings / 0 errors (back to baseline; the one the fix introduced,
`no-use-before-define`, was removed by moving the helper above its caller) · package suite 193 files /
2502 checks, up from 192 / 2499 by exactly the three new ones · real `turbo build` green · integration
225 passed / 8 skipped, unchanged.
