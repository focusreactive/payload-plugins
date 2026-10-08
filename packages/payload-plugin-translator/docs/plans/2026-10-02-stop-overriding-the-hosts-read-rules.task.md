# Task contract — stop overriding the host's read rules

**Risk: HIGH.** Shared code with several callers, and the failure mode is asymmetric: too lax and
the plugin keeps discarding the host's configuration; too eager and translations stop happening, or
— the measured trap — an editor's save is destroyed by a refused read.

Upstream definition, adopted rather than re-derived:
`docs/plans/2026-10-01-reads-never-consult-access-rules.md`. Its census, its framework measurements
and its `## Decisions settled by the owner` are input here, not up for review.

## Requirements / Task restatement

The Local API wrapper defaults `overrideAccess` to `true`. All **seven** of the plugin's reads take
that default, which tells Payload to ignore the rules the host declared on their own collections.
Stop that — one value, no branch — and give the read a user so Payload has someone to judge.

Then apply the owner's rule to the three report endpoints: **readable document, visible history**.

## What already exists — platform · installed · project · verdict

- **Platform / installed:** Payload's local API already takes exactly what is needed —
  `overrideAccess`, `user`, and `disableErrors` (`collections/operations/local/findByID.d.ts:35,62,89`;
  the docblock on `user` says "If you set `overrideAccess` to `false`, you can pass a user to use
  against the access control checks"). Nothing to build. For list reads Payload folds the rule into
  the SQL (`collections/operations/find.js:74`), so filtering a list is a query condition, not a loop.
- **Project:** the write path is the precedent and the shape is already written —
  `enforcedAtTheWrite` (`translate-document/handler.ts:30-35`) returns `{ overrideAccess: false, user }`.
  Reads need the same two keys. `findRequester` (`translationPermission.ts:92`) already rebuilds a
  user from a stored id at the collection's auth depth.
- **Verdict:** build nothing new. Pass two options Payload already accepts, and reuse the requester
  the write path already rebuilds.

## Decisions

**D1 — the user comes from whoever already has one; no new source.**
Two origins, both already present:

| path | where the user comes from |
|---|---|
| HTTP endpoints (`/field`, the three reports) | `req.user` — Payload built it, at auth depth, before the handler ran |
| queued work and the hook (`translate-document`) | the requester rebuilt from `scope.requester` |

Rejected: rebuild from `scope.requester` everywhere. On an HTTP path `req.user` is already the
object `findRequester` would reconstruct, so rebuilding spends a users-collection read to arrive at
what the request already carried.

**D2 — the requester is rebuilt once, before the reads, by the handler.**
Forced by a constraint, not chosen for taste: `checkTranslationPermission` takes `data: sourceData`
(`translate-document/handler.ts:89-93`), so the rule cannot be asked until the source has been read.
A read that needs a user therefore cannot wait for the permission check that currently owns the
rebuild. `findRequester` is hoisted out of `checkTranslationPermission` so the handler rebuilds once
and hands the user to the reads **and** to the rule.

Rejected: `fetchSourceDocument` rebuilding internally. It would do a users lookup per read — two per
translation — and would put identity work inside a function whose whole job is one document read.

**D3 — `disableErrors: true` on the reads that run inside someone else's transaction.**
Measured, not assumed: `findByID.js:249` and `find.js:278` call `killTransaction` from their own
catch. The auto-translate hook runs inside the editor's save, so a `Forbidden` from a refused read
would roll their save back — the exact failure the two preceding tasks were about. With
`disableErrors` the operation returns `null` and nothing is rolled back; the plugin turns that
`null` into its own refusal.

Rejected: letting it throw and catching it. The throw has already run `killTransaction` by the time
anyone catches it; catching is too late by construction.

**D4 — the reports ask about the document, not about the rows.**
`get-document-status` and `stale/:slug/:id` each name one document: read it with access on under
`disableErrors`, and `null` means refuse. `get-collection-status` names many: collect the document
ids from the job rows and ask Payload for them in **one** `find` over the host collection with
`where: { id: { in: ids } }` and access on — the rule lands in the query. Rows whose document did not
come back are dropped.

Rejected: a permission call per row. It is the obvious shape and it is one query per document where
one query for all of them does the same work.

**Placement:** no new module. `sourceDocument.ts` gains the two options; `collection-utils.ts` the
same; `translationPermission.ts` exports the rebuild it already has; the three report handlers gain
the filter; `translate-document/handler.ts` reorders so the rebuild precedes the reads.

**New surface:** two Payload options and one already-written function made visible to its neighbour —
**plus, decided during Phase 3**, a `SourceUnreadable` error and a `source-unreadable` failure
reason. The alternative was reusing `TranslationRefused`, whose message says the requester "may not
**write**" — which would label a refused *read* as a refused write and send whoever is debugging to
the wrong rule. Internal: neither is exported from `src/index.ts`.

**Written contract owed:** yes, one — what `null` means from a read. It means "refused or absent",
and the two are deliberately not distinguished, because distinguishing them is the document-existence
oracle the upstream definition put out of scope.

**Escalate?** No. One mechanism, no new seam, no data-model change; the identity plumbing already
exists and is being extended by two keys.

## Acceptance criteria

| # | Criterion | How it is checked | Passes when |
|---|---|---|---|
| 1 | No read takes the `overrideAccess` default | `grep` over the seven read sites | every one passes `overrideAccess: false`; the requester lookup keeps its explicit `true` with its stated reason |
| 2 | A host rule that hides a document hides it from `/field` | integration: a rule refusing one user; that user's field call returns no content | refused, and the response carries no document value |
| 3 | A user the rule allows still gets their translation | the same fixture, allowed user | content returned — the fix is not a blanket refusal |
| 4 | `select_all` enqueues only documents the caller may read | integration: two documents, a rule hiding one | one job row |
| 5 | A refused read inside the editor's save does **not** destroy the save | integration on PostgreSQL: auto-translate on a document the editor may write but not read | the translation is refused **and** the editor's row is intact |
| 6 | The reports hide what the caller may not read | integration: the collection report lists only visible documents; the document report for a hidden one refuses | both |
| 7 | The collection report costs one extra query, not one per row | count `find` calls for a multi-row result | exactly one additional call |
| 8 | Checks clean | `bunx vitest run` · `check-types` · `oxlint` · `build`, then the three adapter suites | ≥1837 unit, types clean, lint 55/0, integration 152 / 157 / 151 |

## Pre-flight

| # | command | result | kind |
|---|---|---|---|
| 1 | read call sites in `src/server`, and how many pass `overrideAccess: false` | **7 reads, 0** | change — fails now ✓ |
| 2,3 | an integration fixture for a host read rule | none exists | change — fails now ✓ |
| 4 | `select_all` against a hidden document | no such case | change — fails now ✓ |
| 5 | a refused read today | reads cannot be refused, so "refused **and** intact" cannot hold | change — fails now ✓ |
| 6,7 | report filtering | none | change — fails now ✓ |
| 8 | all check commands | unit 1837 in 134 files · types clean · lint 55/0 · integration 152/157/151 | invariant — holds now ✓ |
| — | `freshReq` carries a user | it returns `{ transactionID? }` only | the plumbing D1 describes |

## Risk notes

- **Translations from scripts stop.** A seed, import or migration carries no user, and Payload
  refuses a rule-bearing read without one. That is Payload applying the host's rules, but the symptom
  ("translation stopped working") will not look like the cause. Release notes must say it.
- **The hook path is the dangerous one.** D3 exists for it; criterion 5 is its guard and it must be
  proved by mutation, not by a green run.
- **`Provenance.service.ts:183` drops the scope** before reading. Pre-existing, recorded upstream,
  and this change touches the same call — resist widening into it beyond passing what it needs.
- **Do not reopen** the swallow-or-propagate rule or the requester design; both are settled with
  their rejected alternatives in their own contracts.

## Amendment — the unconditional form was wrong, measured

The contract said one value, no branch. Built that way, **114 of 165 integration checks failed on
SQLite and 118 on PostgreSQL**. The cause is not the fixtures: the test collections declare no
`access` at all, and Payload refuses a rule-less read when no user is named
(`auth/executeAccess.js:17-22` — no rule plus a user is allowed, no rule plus nobody is `Forbidden`).
So the unconditional form made the plugin refuse to translate in a project that had declared nothing.

That is not honouring the host's decision; the host made none, and the refusal came from Payload's
default for anonymous callers.

**The shipped rule:** ask the host's rules when there is someone to judge; unattributed work stays
unchecked. This is not a new branch — it is the rule the write path already has and the owner already
accepted: `enforcedAtTheWrite` returns `{}` when no requester is named, and the write proceeds
unchecked. Reads now mirror it. Measured after the change: **158 passed on SQLite, 164 on
PostgreSQL**, and all eight criteria hold, because every one of them names a user.

**What this leaves open, stated rather than hidden:** an anonymous HTTP caller still reads unchecked.
The mandatory `access` guard is the whole of the protection there, which means a host who lets an
anonymous caller reach the plugin has made that decision explicitly.

## Human choices

- **2026-10-02 — a report the caller may see nothing in answers with an empty list, not a refusal.**
  The same answer as for a document that does not exist, so the response distinguishes nothing and
  cannot be used to probe for documents. Rejected: an explicit 403, which is kinder to a confused
  operator but makes the difference between 403 and empty a signal that something is there; and a
  split rule (refuse for one document, filter for a list), rejected for being two rules where one
  does the work.
- **2026-10-02 — scripts keep a way out.** A seed or migration that wants translations passes
  `user` to its own `payload.update(...)`; `req.user` is then set and the identity reaches the
  read. Not a plugin option — the host already has the lever. Belongs in the release notes.

## Review log

- 2026-10-02 — Phase 3, D1 challenged by its own guard and upheld. Criterion 3 ("still translates
  for a caller the rule allows") went red, which looked like D1 being wrong: reads take `req.user`
  as given rather than rebuilding it, and a *stub* user carries none of the fields a rule reads.
  Measured: with a full user document both cases pass, and in a real HTTP request Payload's auth
  strategy builds exactly that. The asymmetry with the write path is therefore justified rather than
  accidental — rebuild when you hold only a reference (a job row stores id + collection), use the
  object when the request already carries one. Recorded because the next reader will wonder.

- 2026-10-02 — contract written. Phase 1 found the constraint that shapes D2: the permission check
  consumes the source document, so the read cannot be deferred until after the rule is asked, and the
  requester rebuild has to move ahead of both.

### 2026-10-02 · phase 5
- **Checks:** unit **1840 in 134 files** · check-types clean · oxlint **55 warnings, 0 errors** ·
  integration **158 SQLite / 164 PostgreSQL / 157 Mongo** of 165. Each criterion was also run by
  name on PostgreSQL and is listed below.
- **Gates:** sp-diff-checks clean; sp-lint-delta 0 introduced, mode=two-run.
- **Reviewers:** correctness · regression · intent, concurrent. Four findings, two fixed, two declined
  with reasons.
- **Criteria:** 8 met.

What changed because of a reviewer:

- **The refusal named the wrong locale.** `if (!sourceData || !currentTargetVersion)` always threw
  `SourceUnreadable(collection, sourceLng)`. A host rule keyed on `req.locale` can let the source
  through and refuse the target, and the message then sends whoever is debugging to the wrong rule.
  Split in two, each naming the read that actually failed. Pinned by a unit case; the merged form
  reddens it.
- **The contract's "New surface: none" was inaccurate** once `SourceUnreadable` and its failure
  reason were added mid-build. Corrected above with the rejected alternative.

Declined, with reasons:

- **`dismiss` reports `{ success: true }` on a no-op.** It already had two early returns — no schema,
  no record — and the handler has always answered `success` for both. The unreadable-source path
  joins that set rather than breaking a contract, and the proposed fix (return a flag, change the
  response) would change the answer for the two pre-existing paths too, which is outside this task's
  boundary.
- **`/field` answers 404 for a refused read** where the handler's own docblock reserves HTTP status
  for a bad request. Kept deliberately: `null` merges *refused* and *absent* on purpose, so whichever
  answer is chosen deviates for one of them. 404 preserves what an absent document has always
  returned, and matches how Payload itself presents a hidden document (rules on plus `disableErrors`
  yields nothing, which the REST layer reports as not-found). The cost is real and recorded: a
  refused caller sees a generic failure toast rather than a graceful notice. Changing it would add a
  member to the public `FieldTranslationReason` union — new public surface this task was told not to
  grow.

Honest about the test order: criteria 2 and 3 had a genuine red run against the pre-change code.
Criteria 4, 5, 6 and 7 were written after the implementation and proved by mutation instead — each
mutation named in this log's sibling entries and re-run at the end.

- **Pin:** not set — the tree carries another session's uncommitted edits.

Criteria, each by its declared check:

| # | criterion | evidence |
|---|---|---|
| 1 | no read takes the `overrideAccess` default | four sites spread `{ overrideAccess: false, user }` when a requester is named; the fifth keeps an explicit `true` with its stated reason (`translationPermission.ts:101`) |
| 2 | a host rule hides a document from `/field` | "hands no content to a caller the rule refuses" ✓ — red against the pre-change code first |
| 3 | an allowed user still gets their translation | "still translates for a caller the rule allows" ✓ |
| 4 | `select_all` enqueues only readable documents | "queues nothing for 'translate everything' when the caller may read nothing" ✓; reddens when the rule is dropped |
| 5 | a refused read does not destroy the editor's save | "costs the translation and nothing of the editor's" ✓ on PostgreSQL; removing `disableErrors` rejects the save with `Forbidden` |
| 6 | reports hide what the caller may not read | three cases ✓; reddens when the visibility query stops asking |
| 7 | the collection report costs one extra query | "asks which documents are visible once, not once per row" ✓; the per-row shape reddens it |
| 8 | checks clean | the run above |

- **Left open:** an anonymous HTTP caller still reads unchecked — recorded in the amendment, held by
  the mandatory endpoint guard. Out of this task by the owner's boundary.

### 2026-10-02 · three audits over the diff

- **Comment audit — 22 verdicts.** Five docblocks this change had **falsified** were the real haul,
  and the worst was in `sourceDocument.ts`: the `user` field promised that "a caller with nobody to
  name gets `null`, not a free pass", while the code gives exactly a free pass. That text described
  the pre-Amendment build. Also stranded: the `docAccessOperation` paragraph was left on
  `rebuildRequester`, which does none of that, while `checkTranslationPermission` had no docblock at
  all. Both corrected, plus `dismiss`'s no-op enumeration and `makeCurrentFingerprint`'s now-nullable
  return. Then 8 deletions, 5 rewrites, 4 places where a name replaced the prose.
- **Complexity — one finding, applied at the owner's word.** The rule "ask the host's rules when
  someone is named, and never throw" was written out four times in three files. Named once as
  `enforcedAtTheRead`, the read-side mirror of the existing `enforcedAtTheWrite`.
  CHANGE 4 → 1, READ 6 → 3, STATE unchanged. Both halves mutated separately and each reddens a
  different check.
- **Abstraction — one finding, applied.** `checkTranslationPermission` returned `{ allowed, user }`
  where `user` was the caller's own input echoed back; the handler held the same object as
  `requester` and read it back four times under the other name. Measure 3, connascence of meaning.
  It now returns `boolean`; `TranslationPermission` and `ALLOW_ALL` are gone. The echo was created by
  this task's split — before it, the function derived the user itself.
  The other four measures passed. `RebuiltRequester` is deliberately loose because it crosses into
  the host's own `access` rule, whose read set is unknowable — the one place a narrow type would be
  the bug.
- **A coverage hole found while proving the above.** Mutating the pre-write re-check to receive
  `null` instead of the requester left the suite green: `refuseUnlessAllowed` returns silently
  without a requester, and nothing pinned it. The nearest-named test checks a different function.
  Closed with a case asserting `mayWrite` is asked about the requester; the mutation reddens it.

### 2026-10-02 · the deferred read, written red-first

The one gap the audits left: `access-control-queue.int.test.ts` pins the deferred path for **writes**
only, and nothing pinned a read on it — the path where the requester is rebuilt from a stored job row
minutes after the request that queued it is gone, with nobody watching the outcome.

`read-access-queue.int.test.ts` closes it, written against the pre-change state first:

- **Red**, with the access half of `enforcedAtTheRead` removed (exactly the behaviour this task
  replaced): `expected 'de:Closed' to be 'Eigener Titel'` — the queued job translated a document its
  requester may not read. The sibling case stayed green, so the red came from the rule and not from a
  broken fixture.
- **Green** with the fix in place.
- **Two mutations, each from a different side.** Dropping the access half reddens the refused case;
  making `rebuildRequester` yield nobody reddens it too. The first proves the rule is asked at all,
  the second proves it is asked about the requester rebuilt *from the row* — which is the composition
  neither half's own test covered.

Checks: unit **1842**, integration **160 SQLite / 166 PostgreSQL / 159 Mongo** of 167.

