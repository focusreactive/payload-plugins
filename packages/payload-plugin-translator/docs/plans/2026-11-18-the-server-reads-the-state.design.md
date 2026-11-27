## Architecture Design — the server reads the state

### The ask (ground truth)

Serve `document-state` and `list-state` from real code, so the admin can stop reading a stub.
Shaped by: the answer shapes are already fixed in `src/types/wire/*.ts`; no single source of field
config holds both `localized` and `label`/`required`; every read must honour the host's per-document
access; a list page must cost a bounded number of reads; and nothing stored may change.

Requirements: 2026-11-18-the-server-reads-the-state.md

**Vectors:** structure + runtime + security (leading: structure) — structure because the ask's real
question is where a walker the package does not have should live and how it coexists with a
projection that deliberately drops what that walker needs; runtime because a source read and a
hashing happen per document on every panel open and every poll, and a list page multiplies it;
security because both reads answer per document under the host's rules and a tree is a list of field
labels, which is exactly what a caller without read access must not receive.

**Stack packs:** headless-cms, nextjs.

### Facts established by reading the installed framework

Five things settled during adjudication that move the decisions, each verified in code:

- `sanitize.js:143-150` deletes an explicitly declared `localized` when an ancestor is localized —
  it removes the flag as **redundant**, so reconstructing `own || inherited` is Payload's own
  semantics. The behaviour is switched off by `PAYLOAD_DO_NOT_SANITIZE_LOCALIZED_PROPERTY`, which
  Payload's own comment says becomes the default in 4.0.
- `sanitize.js:70-72` applies the auto-label `toWords(field.name)` **inside** sanitize. So a
  pre-sanitize snapshot has correct `localized` and almost no labels; a post-sanitize read has the
  real labels and has lost `localized`.
- `walkFields` threads a caller-owned cursor through `enterObject`/`enterList` and the engine never
  reads it — `contentProjector.ts` already carries `{ data, segments }` this way. A walk can carry a
  path down. `combine` being bottom-up is true and irrelevant.
- `apps/dev/.../devToggles.ts:82-91` returns `[translationStub()]` **or** the real modules, never
  both, so the duplicate-path refusal is never reached in the sandbox.
- `configureProvenance` (`Provenance.wiring.ts:127-136`) returns only `{ module, criteria }` and
  keeps its store and staleness factories closed over. Every way of reaching them needs that to
  change, and no candidate said so.

### Decision points

- D1 [load-bearing] Where `label` and `required` come from, and where the tree walker lives (axis: placement · reversible)
- D2 [load-bearing] The four-way leaf verdict as one computation shared with the run's filter (axis: abstractions · reversible)
- D3 [load-bearing] What decides a locale's content state, and what the document answer costs (axis: execution-boundary · reversible)
- D4 [load-bearing] Where the per-document authorization decision is made (axis: authz-placement · reversible)
- D5 [load-bearing] How `run.locales[]` and `failedLocale` are assembled (axis: dataflow-state · reversible)
- D6 [load-bearing] Layout, and how the guard tests learn the new routes (axis: placement · reversible)
- D7 [load-bearing] What a list page costs, and the bound on `?ids=` (axis: cost-budget · reversible)
- D8 [load-bearing] Field-level read access, and whether the tree can leak a label (axis: data-exposure · reversible)
- D9 [load-bearing] How the reads reach the provenance store (axis: dependencies · reversible)

D1 was framed as irreversible on the belief that it would widen a published type. It does not:
`FieldLike`, `walkFields` and `CollectionSchemaMap` are not exported from `src/index.ts` and reach
the declaration graph only through an `@internal` context, so widening would have been additive
anyway — and the decided design widens nothing.

### How it lands on the system

**Reused:** `walkFields` and its cursor pattern · `isTranslatableLeaf` as the one predicate behind
tree, verdicts and run filter · `makeIdPath`/`elementSegment` for addresses · `fetchSourceDocument`
as the single access-enforced read · `visibleIds` for the page gate · `staleness.ts` and
`SourceFingerprint` · `sourceFingerprinter`, already wired · `statusOf`/`reportedRuns` ·
`findLiveForDocuments` · `ENDPOINTS` as the one spelling of each path · the stub as the behavioural
template for refusals.

**Touched:** `createTranslationRoutes.ts` gains two routes · `ModuleContext` gains one optional
field · `ProvenanceStore` gains one optional method · `latestPerTargetLocale` moves out of
`get-document-status` · the refusal strings move out of the stub · two hard-coded guard tables grow ·
`callEndpoint` learns a query string and a minimal `i18n`.

**Fits as:** two request-handler features beside the five that exist, with their deciding logic in
`core/domain` and every Payload-shaped read in `server/shared/payload`.

### The design

- **Abstractions**
  - `leafVerdicts(recorded, currentFields)` — `core/domain/provenance/leafVerdicts.ts`. How each leaf
    of one receipt stands against the source as it is now. Invariant: the non-`current` set is
    exactly what a run must translate. Callers: `staleness.ts`'s three derivations (existing, via the
    run filter) and the document-state model (new).
  - `resolveSourceLocale({ configuredSourceLocale, localization })` — `core/domain/locales/`.
    Invariant: `policy.sourceLocale ?? localization.defaultLocale`, never the viewed locale. Callers:
    both routes (new) and `AutoTranslateEnqueue.hook.ts:57-58` (existing, refactored onto it).
  - `runStateOf(rowsOfDocument, locale)` — `server/modules/runs/runStateOf.ts`. Invariant: the run
    handle never crosses the wire; `completed` and `cancelled` become `null`. Callers: both routes.
  - `ProvenanceStore.findByDocuments(collectionSlug, ids)` — an **optional** method on the existing
    port, with a per-id fallback. Invariant: one read per page, never one per row.
  - `readRefusals` — `server/shared/http/readRefusals.ts`. One spelling of `NOT_MANAGED`,
    `NO_LOCALIZATION`, `NOT_FOUND`. Callers: both routes and the stub, which imports them until it
    is removed.
  - `requireReadableDocument(req, collection, id, sourceLocale)` — the shared preamble that returns
    either the document or the 404 response, so the two routes cannot drift apart the way
    `get-document-status` already has.
  - Deliberately **not** abstractions, one caller each and therefore kept inside
    `server/features/get-document-state/`: the per-request label index and the tree walk.

- **Dependency direction**
  `composition → server/features → server/modules → server/shared → core/domain → core/kernel`, with
  `types/wire → core` for the `LeafVerdict` union. No feature imports a feature. No `shared` imports
  a module. Acyclic.

- **Placement**

  | Responsibility | Layer → module → file |
  |---|---|
  | per-leaf verdict | core → domain/provenance → `leafVerdicts.ts`; `staleness.ts` rewritten as derivations |
  | source-locale rule | core → domain/locales → `resolveSourceLocale.ts` |
  | run rows → wire | server → modules/runs → `runStateOf.ts`; `latestPerTargetLocale` **moved** here |
  | receipts in one read | core → domain/provenance → `ProvenanceStore.interface.ts`; server → modules/provenance → `Provenance.store.ts` |
  | refusal strings | server → shared/http → `readRefusals.ts`, **moved** out of the stub |
  | label index + tree walk | server → features/get-document-state → `model.ts`, `tree.ts`, `fieldLabels.ts` |
  | the two routes | server → features/{get-document-state,get-list-state}, composed in `createTranslationRoutes.ts` |
  | provenance reaching the routes | `plugin.ts` → `PluginConfigBuilder` → `ModuleContext.provenance?` → `documentTranslation()` |

- **Data flow & ownership**
  One access-enforced read of the source locale is at once the authorization decision, the 404, the
  tree's data and the "current" side of every verdict. Target content comes from one
  `fetchSourceDocument` per target locale, issued concurrently. Receipts come from the provenance
  store, runs from the run store, and both are only ever asked about ids that survived the decision.
  One owner each: structure and `localized` → the pre-sanitize schemaMap; `label` and `required` →
  the sanitized config; "the document as of locale X" → `fetchSourceDocument`; the verdict →
  `leafVerdicts`; run status → `statusOf`; refusal strings → `readRefusals`; paths → `ENDPOINTS`.
  Nothing is written. Nothing is cached across requests.

- **Runtime**
  - *Execution boundary* — server, per request, inside the Payload endpoint. The answer is per caller
    and must reflect drafts, so no earlier boundary holds it.
  - *Caching and invalidation* — none at request level. The only snapshot is the config-time
    schemaMap: it can be wrong for zero time because a Payload config cannot change at runtime, a
    restart makes it right, and nobody needs to notice. The label index lives and dies inside one
    request.
  - *Scheduling* — none. The admin polls; concurrent polls are independent stateless reads, so there
    is no overlap to guard and a failed poll is retried by the next.
  - *Budget* — document answer `1 (source) + (L−1) emptiness queries + 1 receipts + 1 runs = L+2`
    queries, the emptiness ones concurrent and each a bare existence check rather than a document
    read; about three sequential round trips, six queries at four locales, per open **and** per poll. List answer
    `L+3` reads for a whole page regardless of row count — seven at four locales, against the thirty
    the per-row shape would cost. Memory is bounded by the 100-id cap.

- **Security**
  - *Where the decision is made* — one order on both routes: guard → zod params → config refusals
    (400) → **the per-record decision** → everything else. The sidecar stores read with elevated
    access and are never touched before it.
  - *Tenant isolation* — the host's read rule folded into the query by `enforcedAtTheRead`, below the
    handler. The plugin writes no rule of its own.
  - *What leaves the server* — only leaves whose address the access-enforced read produced; a field
    Payload's `afterRead` removed has no address and no node. `run.message` is the client-safe
    projection, never the raw column. No run handle, no echo of `?ids`, and nothing distinguishing
    "unknown id" from "may not read".

### Requirement coverage

| R | Design element |
|---|---|
| R1 | `server/features/get-document-state/`, registered in `createTranslationRoutes` |
| R2 | `server/features/get-list-state/` — `?ids=` parsed and capped, order preserved, unknown id absent |
| R3 | the tree walk over the schemaMap and the source data, labels by name path from the sanitized config; a self-localized list becomes one `whole-list` node |
| R4 | `excluded` built from the **schema**, independent of data, so AC5 is a unit test as the criterion asks |
| R5 | `core/domain/provenance/leafVerdicts.ts`, with `driftedAddresses` derived from it |
| R6 | no translatable value in the target → `empty`, receipt ignored; value and no provenance → `filled`; value, provenance, no receipt → `untracked`; value and receipt → `tracked` |
| R8 | `runStateOf` — handle-mates fill `locales[]`, an abandoned row names the failed sibling |
| R9 | both routes behind `withAccessCheck(withErrorHandler(...))` on the existing two actions, plus a test that `TranslatorAction` gained nothing |
| R10 | `readRefusals.ts`, one spelling, imported by the stub |
| R11 | `callEndpoint` gains `query` and a minimal `i18n` |
| R16 | `requireReadableDocument` — null → 404 with one fixed body, nothing computed before it |

### Vector gates

- **structure** — no gate beyond ST1–ST6. The merged design was re-checked against all six: new seams
  have two or more callers (ST1), the gradient holds with the two moves that remove a feature→feature
  edge and a `shared ← stub` edge (ST2), no cycle once `LeafVerdict` is declared in core (ST3), one
  owner per value (ST4), every ADR cites a code constraint (ST5), no module grows a second subject (ST6).
- **runtime / the staleness gate** — one derived snapshot, the config-time schemaMap: wrong for zero
  time, made right by a restart, nobody needs to notice. No other cache exists.
- **security / the wrong-caller gate** — answered for both routes. No session: the guard refuses, and
  with no user the host's rule would refuse anyway. A valid user without access: 404 byte-identical
  to absent, with no tree, no locale list and no sidecar read performed. Another tenant guessing an
  id: the same 404, because the rule is folded into the query. Revoked a minute ago: nothing is
  cached, every request re-evaluates; the residual is a revocation landing mid-request, which can
  only let a caller finish an answer they were entitled to start.
- **headless-cms** — HC2 holds: Payload's field shapes become wire labels in one place. HC4 is kept
  as a constraint: the answers carry `draft: true` content and must never become publicly cacheable.
- **nextjs** — NX4 (a route authorises itself) refines SC1 and is met; NX2 is met by "dynamic, per
  request, never cached".

### Decisions (ADRs)

#### D1. Structure and `localized` from the pre-sanitize schemaMap; `label` and `required` by name path from the sanitized config
- **Context:** the sanitizer deletes a nested `localized` and adds the auto-label, so neither snapshot
  answers alone. The plugin already keeps the pre-sanitize one, with `blockReferences` resolved.
- **Options considered:**
  - walk the sanitized config and restore `localizedAbove` in the cursor (min-new-abstraction)
  - a second pre-sanitize projection into an `OutlineField` carrying label and required (cleanest-boundaries)
  - the split: schemaMap for structure, sanitized config for presentation (max-reuse)
  - widening the published `FieldLike` — nobody proposed it, and it would not answer, because
    pre-sanitize has no auto-labels
- **Decision:** the split, with the cursor mechanics of the second candidate and the label adapter of
  the third. One walk of the schemaMap with a `{ data, segments, path }` cursor — the shape
  `contentProjector.ts` already uses — so tree addresses and verdict keys are identical **by
  construction**, not by a parity test. Labels and `required` come from a per-request index over
  `req.payload.config.collections[slug]`, flattened with `classifyField`/`tabScopes` so transparent
  containers collapse the same way in both trees. A label is a string as written, a per-language map
  resolved against the admin language then `en` then the first entry, and otherwise the humanized
  field name. A list whose own `localized` is true becomes one `whole-list` node. Satisfies ST4 (one
  owner for structure, one for presentation — the two rejected options each create a second owner of
  structure), ST1 (one caller each, so the walk and the index stay inside the feature), ST2, ST5.
- **Consequences:** commits the package to the tree being this document's translatable shape rather
  than the collection's schema. A leaf with no translatable text in the source has no node — correct
  for a picker, since no run can translate an empty leaf, and it is what keeps tree and verdicts in
  step; the cost is that a leaf empty in the source but filled in a target cannot be chosen. A
  `RowLabel` function label shows as the humanized name, which can differ from Payload's own admin.
- **Reversible:** yes — one feature folder; deleting it deletes the decision.
- **Guarded by:** a unit test asserting the tree's leaf addresses **equal** the keys of
  `translatableFields(sourceDoc, schemaMap[slug], walk)` over a fixture with a nested localized group,
  a `blockReferences` blocks field and a localized array. Built in build step 4.

#### D2. `leafVerdicts` in core, and `staleness.ts` becomes derivations over it
- **Context:** R5 and AC7 require the run's filter and the admin's map to be one computation. Today
  `changedLeaves` answers two values and the run filter calls `driftedAddresses`.
- **Options considered:**
  - rewrite inside `staleness.ts` and delete `changedLeaves` (max-reuse)
  - rewrite both in place on top of the new function (min-new-abstraction)
  - a new `leafVerdicts.ts` with `staleness.ts` as thin derivations (cleanest-boundaries)
- **Decision:** the third. Order of tests: absent from the receipt → `unrecorded`; recorded
  `UNANSWERED` → `unanswered`; equal → `current`; else `drifted`. The union is declared in **core**
  and the wire file aliases it, because a `core → types/wire` import would be a sideways edge given
  `types/CollectionSchemaMap.ts` already imports from core. Satisfies ST4 and ST1 (three callers, two
  of them existing), and avoids ST3.
- **Consequences:** the run filter's output must not move. Commits the verdict vocabulary to core, so
  a future non-Payload packaging keeps it. Rules out a second "is this leaf behind" rule anywhere.
- **Reversible:** yes — a pure refactor inside one module.
- **Guarded by:** the **existing** staleness tests kept byte-identical, plus the AC7 assertion that
  the run's translate set equals the non-`current` verdicts. Build step 3.

#### D3. Content state from the target's own values, one source read per target locale, issued concurrently
- **Context:** R6 requires `empty` to be decided from the target's values and never from a receipt.
  `fetchSourceDocument` is declared the single source read precisely so two readers cannot drift, and
  nothing in the package reads `locale: 'all'` today.
- **Options considered:**
  - read only the locales that have no receipt (min-new-abstraction)
  - one `locale: 'all'` read plus a hand-written slicer (cleanest-boundaries)
  - read every target locale through the one source read (max-reuse)

  The first is rejected because it decides "not empty" from the presence of a receipt, which R6
  forbids in those words. The second is rejected because it stands up a second definition of "the
  document as of locale X" beside the function whose docblock exists to forbid exactly that, tied to
  the first only by a test.
- **Decision (revised 2026-11-19, by the owner):** emptiness is answered by **one `find` per target
  locale carrying `where: { or: [ <each translatable field>: { exists: true } ] }`**, scoped to the
  locale with the fallback off — not by reading the document and walking its values. Proven in
  `apps/dev/src/integration/translator/locale-existence-probe.int.test.ts`: a locale never written
  answers 0, a locale holding text answers 1, and a locale emptied again answers 0. The content rule
  is unchanged — no text → `empty` even if a receipt exists; otherwise provenance off → `filled`;
  no receipt → `untracked`; receipt → `tracked` with verdicts and `translatedAt`. Satisfies RT1
  (the database answers the question instead of the plugin re-deciding it from values), RT3 (the
  fan-out bound is the host's locale count and the queries are concurrent), RT4, ST4.
  Rejected on the way: "a locale that returns no document is empty" — the same test shows a read of
  an unwritten locale **still returns the document**, with only the localized values missing, so
  absence of a document cannot be the signal.
- **Consequences:** the plugin never decides what "empty" means — the database does, through
  `exists`. An emptied locale therefore reads `empty` again, which is what the owner asked for: one
  rule, no edge cases. A locale that is empty is offered only "translate everything", with no field
  picker; for a locale someone deliberately cleared that is a caution they did not need, since
  clearing a locale that holds a required localized field is itself refused
  (`apps/dev/.../clearing-a-locale.int.test.ts`) — the cost is one unnecessary "translate all" in a
  rare case. Still rules out `locale: 'all'` for the same reason as before.
- **Reversible:** yes — swapping to a single read later changes one function and no stored data.
- **Guarded by:** `locale-existence-probe.int.test.ts` (written 2026-11-19, five cases) plus an
  `apps/dev` test covering a locale with text and no receipt, a locale with no text **and** a
  receipt, and a locale with both — the second is what regresses if the receipt is ever trusted for
  emptiness. Build step 5.

#### D4. One ordered preamble; the per-record decision is the source read, and the 404 is indistinguishable
- **Context:** absent and refused must answer alike. The sidecar stores read with elevated access, so
  touching them before the decision leaks existence. `get-document-status` answers `200 []` for an
  invisible document, so the rule has already drifted between routes.
- **Options considered:**
  - each handler makes the decision itself, with the refusal strings re-exported by the stub (max-reuse)
  - the same, with the strings copied into the features (min-new-abstraction)
  - the same, with the strings **moved** out of the stub (cleanest-boundaries)
  - a shared `requireReadableDocument` preamble owning both the read and the 404 — not proposed by any
    candidate, raised at adjudication
- **Decision:** the shared preamble, with the strings moved. Both handlers obtain the document through
  one function that returns either the document or the 404, so the two routes cannot drift the way the
  existing one has. Satisfies SC1, SC2 (one function answers "may this caller see this document"),
  SC3, ST2 (the move removes a `shared ← stub` edge), ST4.
- **Consequences:** an unmanaged collection or a host with no localization stays distinguishable from
  404 — that discloses plugin configuration, not data, and matches the stub the client was built
  against. Commits both routes to never touching a sidecar store before the decision.
- **Reversible:** yes.
- **Guarded by:** structural rather than only tested — the assembly functions take the already-fetched
  document, and the surviving id set, as non-optional parameters, so there is no way to reach the
  stores without having passed the decision. Plus the 404 and invisible-id integration tests. Build
  steps 8 and 9.

#### D5. `runStateOf` in `server/modules/runs/`, with `latestPerTargetLocale` moved there
- **Context:** `latestPerTargetLocale` lives inside another feature, and two more features need it; a
  feature→feature import breaks the declared direction. `RunState` carries no handle, `completed` must
  become `null`, and `row.error` is nullable where the wire demands a string.
- **Options considered:**
  - import it across features and note that it "should" move (max-reuse)
  - put the new function in `runStatus.ts` beside `statusOf` (min-new-abstraction)
  - move it into `modules/runs` and add `runStateOf.ts` (cleanest-boundaries)
- **Decision:** the third. The status map, stated once: `pending → queued`, `running → running`,
  `failed → failed`, `abandoned → not-started`, `completed → null`, cancelled dropped by
  `reportedRuns`. `locales[]` is every handle-mate's target locale in configured order.
  `failedLocale` is the failed sibling with the earliest settlement, ties broken by locale code, so
  two polls agree; an abandoned row with no failed sibling is reported as `failed` with its own
  message, because the wire has no "abandoned without a cause". `message` goes through
  `toClientErrorMessage` at the read boundary. Satisfies ST2, ST6, SC4.
- **Consequences:** the separately-sequenced work that makes the raw failure reason survive the write
  may put internal text in that column; this ADR is what keeps it from reaching the admin verbatim.
  The 500-row cap can truncate a handle's siblings on a document with very many runs, which would show
  a short `locales[]` — bounded, known, not fixed here.
- **Reversible:** yes — a move and a new pure function.
- **Guarded by:** the two run-state integration tests, plus a one-line assertion that
  `features/get-document-status` no longer exports `latestPerTargetLocale`. Build step 6.

#### D6. Both routes are features composed in `createTranslationRoutes`; no new composition module
- **Context:** one candidate held that the stub and the real reads cannot share a host config and so
  need a separate module. The sandbox already returns one set or the other, never both, so the
  duplicate-path refusal is never reached.
- **Options considered:**
  - a new `composition/modules/translationState.ts` (max-reuse)
  - compose inside `createTranslationRoutes`, registered by the existing module (min-new-abstraction,
    cleanest-boundaries)
- **Decision:** the second. The two reads are request handlers exactly like the five that exist and
  need the same guard factory and deps; a second registration path for one family is the defect, not
  the safety. Satisfies ST6 and ST5.
- **Consequences:** `everyRegisteredRouteIsGuarded.test.ts` holds **two** hard-coded path lists — the
  full one and the sync-runner one — and both grow, because the state routes do not depend on runner
  capabilities. The real routes still cannot be exercised while the sandbox is in stub mode, which is
  what stub mode means.
- **Reversible:** yes — one line each.
- **Guarded by:** the boot-based guard test, which is also the only thing holding the
  `withAccessCheck(withErrorHandler(...))` order across nine route files. Build step 8.

#### D7. The list answers in `L+2` reads, and `?ids=` is capped at 100 with a 400
- **Context:** `ProvenanceStore` reads one document per call, so a page of 25 rows costs 25 receipt
  reads. The run store already shows the batched shape.
- **Options considered:**
  - per-id receipts under `Promise.all`, bounded by the cap (max-reuse, min-new-abstraction)
  - a batched `findByDocuments` (cleanest-boundaries)
- **Decision:** the batched method, **optional on the port with a per-id fallback**. A page is built
  from one `visibleIds` as the decision, `L−1` per-locale finds restricted to the survivors, one
  receipts read and **two** run reads — the live rows and the recently-failed ones, through the
  existing `findRecentlyFailedInCollection` with the window the collection-status route already
  uses. The second read is there because a run that failed is settled, so the live read filters it
  out, and a row that tried and broke would otherwise be indistinguishable in the list from one
  nobody ever translated (owner's decision, 2026-11-19: the list shows the failure, red, with the
  reason under the cursor, exactly as the panel does). `?ids=` is parsed with zod — split, trim, drop empties, dedupe
  keeping order — and more than 100 ids is a 400, never a silent truncation. Satisfies RT3, RT4, ST1
  (a method on an existing port driven by a named cost, with `findLiveForDocuments` as the precedent).
- **Consequences:** at the cap with six locales the request materializes up to 500 documents at depth
  0, and the cap is the only thing bounding that. The cap of 100 was confirmed by the owner on
  2026-11-19 as the right figure. Making the batched method optional is deliberate: `ProvenanceStore`
  is reachable in type position through the published graph, so a required method would break an
  outside implementer.
- **Reversible:** yes, while the method stays optional.
- **Guarded by:** a store test asserting one adapter call for N ids, and the zod schema as the
  mechanical cap — the 400 is the enforcement, not a comment. Build steps 7 and 9.

#### D8. The tree is pruned to what the access-enforced read produced; `excluded` comes from the schema
- **Context:** Payload removes a field the caller may not read during `afterRead`, so the single
  source read already carries the answer. `docAccessOperation` exists and is exported, but takes a
  fuller request than the integration harness builds and re-reads the document.
- **Options considered:**
  - compute field permissions explicitly through `docAccessOperation` (cleanest-boundaries)
  - prune to the addresses the access-enforced read produced (max-reuse, min-new-abstraction)
- **Decision:** pruning. A leaf appears only if the source projection produced its address, so tree,
  verdict keys and field-level access agree by construction and no second permission computation
  exists. `excluded`, by contrast, is derived from the **schema**, because exclusion is a
  collection-level fact, a label is not a value, and the criterion for it asks for a unit test over a
  fixture config. Satisfies SC4, SC1, SC2, SC3.
- **Consequences:** a deliberate asymmetry — a field hidden from the caller vanishes from the tree,
  but if it is marked excluded its **label** still appears in `excluded`. That is a label for a field
  nothing translates; named here so it is a decision and not an accident.
- **Reversible:** yes.
- **Guarded by:** an integration test with a restrictive **field-level** rule asserting the denied
  field appears in neither the tree nor the verdict keys, and the unit test for `excluded`. Build
  steps 4 and 10.

#### D9. One optional `ModuleContext.provenance`, filled in `plugin.ts`
- **Context:** D6 puts the routes inside the existing module, which sees only `ModuleContext`. The
  provenance wiring keeps its factories closed over, so every option needs that to change first.
- **Options considered:**
  - pass the factories as arguments into a new composition module (max-reuse) — falls with D6
  - a separate composition file holding an explicit deps object (cleanest-boundaries) — falls with D6
  - one optional field on `ModuleContext` (min-new-abstraction)
- **Decision:** the third. `ProvenanceContribution` gains its factories, `plugin.ts` puts
  `provenance?: { store, staleness }` on the builder, and the existing module forwards it exactly as
  it already forwards the run store factory. Absent provenance means content is `empty` or `filled`
  only, with no verdicts. Ordering verified: the parts exist before module setup runs. Satisfies ST2,
  ST6, ST1.
- **Consequences:** `ModuleContext` is `@internal` but reaches the published declaration graph; an
  added optional field is additive, not breaking. A third-party module still cannot reach the store,
  which is intended.
- **Reversible:** yes — remove the field and the two lines that fill it.
- **Guarded by:** nothing mechanical — the compiler is the guard, since the optional field forces the
  handler to deal with `undefined`. One unit test boots without provenance and asserts the answer
  carries `filled`/`empty` content and no verdicts. Build step 7.

### Build sequence

1. `mustInclude` and `dismissed` leave the contract — both fields out of the wire type, the locked set
   and its seeding out of the field picker, the `dismissed` branch out of the locale row, both values
   out of the stub fixtures. The dismissal feature is untouched. · covers: — · incremental
2. Field selection follows the drafts layer — where a collection has no drafts the admin offers only
   the whole document, and the enqueue route refuses a filtered run there rather than trusting the
   screen. · covers: — · incremental
3. The per-leaf verdict — `leafVerdicts.ts`, the union in core with the wire alias, the three
   derivations rewritten with their existing tests unchanged, and the shared-computation assertion.
   · covers: R5 · incremental
4. The document's shape — the per-request label index, the tree walk with the path cursor,
   `whole-list` for a self-localized list, `excluded` from the schema, and the address-parity guard.
   No route yet. · covers: R3, R4 · incremental
5. A locale's content — the four-way rule over the concurrent per-locale `exists` queries;
   `resolveSourceLocale` extracted and the auto-translate hook refactored onto it; the staleness
   service gains the verdict-map method. · covers: R6 · incremental
6. The run's locales — move `latestPerTargetLocale`, add `runStateOf.ts` with the full status map,
   the stable `failedLocale` rule, and the message through the client-safe projection.
   · covers: R8 · incremental
7. Receipts in one read, and the store reaches the routes — the optional batched method with its
   fallback, the provenance wiring exposing its factories, and the optional field on the context.
   · covers: — · incremental
8. The document route — refusals moved, the shared preamble, handler and assembly, registration, both
   guard tables updated, and the test that the action union gained nothing.
   · covers: R1, R9, R10, R16 · incremental
9. The list route — `?ids=` parsing with the 100 cap as a 400, `visibleIds` as the decision, the
   per-locale finds, the batched receipts read, the live run read **and** the recently-failed read,
   order preserved. · covers: R2 · incremental
10. The harness drives both routes — `callEndpoint` gains a query string and a minimal `i18n`, and the
    integration tests land. · covers: R11 · incremental

Nothing migrates stored data and every step leaves the suite green on its own. Step 1 changes a wire
type, but every consumer is in this repository and changes in the same commit.

### Open questions / unresolved

- **A locale whose own source locale cannot be read.** The definition's non-blocking default is to
  report it with no verdicts; all three candidates deviated to `tracked` with every address
  `unanswered`. The two read oppositely to a person — an empty map counts as zero fields behind, which
  looks up to date, while all-`unanswered` counts as everything behind. Changing what a wire value
  means is the owner's call. Interim: the definition's default plus a logged warning naming the
  collection, id and locale. Blocks no step; it is one branch inside step 5.
Both of the questions this design opened about the list route were settled by the owner on
2026-11-19 and are recorded as decisions below rather than left here. The revision of D3 opens two
narrower ones, neither blocking:

- **`exists` on a path inside a block or an array.** The probe was proven on top-level localized
  fields. A translatable leaf can sit inside a localized blocks field, and how `exists` reads such a
  path is unverified. Settle it in build step 5; if it does not answer, the fallback for those
  fields is the document read this revision replaced.
- **`exists` answers "has a value", not "has text".** A rich text saved with an empty editor state
  still holds a value, so such a locale would read as non-empty. Verify in build step 5 and decide
  whether a rich-text-only locale needs the text check after all.

### Accepted deviations (if any)

None. No invariant is knowingly left unmet and no owner decision is reopened.

### Rejected / grafted (for the record)

- min-new-abstraction as a whole — disqualified on the coverage gate: its content rule decides "not
  empty" from the presence of a receipt, which R6 forbids. Its cursor mechanics and its context field
  are grafted.
- Walking the sanitized config structurally — disqualified: ST4, a second implementation of "is this
  leaf localized and translatable", plus `blockReferences` the schemaMap already resolved.
- A second pre-sanitize projection — disqualified: ST4, and it must re-implement Payload's auto-label,
  so labels would differ from the host's own admin.
- A `locale: 'all'` read with a hand-written slicer — disqualified: ST4, a second definition of "the
  document as of locale X". Kept as a named follow-up, gated on the equivalence test its own author
  proposed.
- Explicit field-permission computation — rejected on cost, not feasibility: a second document read
  and a fuller request than the harness builds, to answer what `afterRead` already answered.
- A separate composition module for the two reads — rejected: its premise was false, and it adds a
  second registration path for one family.
- Importing `latestPerTargetLocale` across features — rejected: ST2.
- The stub re-exporting the refusal strings, and copying them — rejected: ST2 and ST4; the move was
  grafted instead.
- Per-row receipt reads — rejected: RT3 and RT4, in favour of the batched method.
- Grafted from max-reuse: the source split in D1, the per-locale read in D3, the `resolveSourceLocale`
  extraction, and the empty-first content rule.

### Next

A scenario walk across this file's seams — the design has more than three of them between
parts (the two routes,
the provenance store, the run store, the host's documents and the config), and the list route's run
read has a known hole that such a walk is the right instrument for. Then build step 1.
