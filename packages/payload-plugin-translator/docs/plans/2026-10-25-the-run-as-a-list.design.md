## Architecture Design — the document-translation run

### The ask (ground truth)

Reshape everything between "a job says translate document D from locale A into locale B" and "the
document is written and published", so the run reads as a list, the access checks are not inlined
mid-procedure, and `TranslateDocumentHandler` in its current form does not survive.

Constraints that shaped it: the inline path runs inside the editor's `afterChange`, where Payload
calls `killTransaction` from the `catch` of every operation — hence the standing rule *ask before
acting, never catch `Forbidden`* · the handler is built once at config time and the queue runs jobs
in batches, so no per-run state may rest on it · two of the three checks ask about data that does
not exist until mid-run, so no wrapper around the entry can perform them.

Requirements:
- R1 (in) No path that writes the target document can skip the access decision, and the read-side
  decision cannot run after the provider has been paid.
- R2 (in) The run's order is readable as a list, without opening any step's body.
- R3 (in) `TranslateDocumentHandler`, the `Handler<TInput,TOutput>` interface it implements, and
  `TranslateDocumentOutput` do not survive.
- R4 (in) Adding a step, or a narrowing rule, is a change in one place.
- R5 (in) The data handed between steps stays compiler-checked. No untyped bag.
- R6 (in) No per-run state rests on a long-lived object.
- R7 (in) The design states what becomes of the module seam and what that costs.
- R8 (in) The transition is possible without observable behaviour change, or names where it is not.
- R9 (out) `core/translation-pipeline`'s internals · the enqueue route · the stored job row ·
  auto-translate · everything in `src/client/`.

**Vectors:** structure + security (leading: structure) — structure because the ask is literally
"where does each responsibility live and what shape is the run"; security because R1 is an
`authz-placement` question and SC1 ("every path passes the same decision") is the invariant the
current code fails. `contract` was considered and dropped: the module seam is not published
(`src/index.ts` exports none of its types, `package.json` `exports` blocks deep imports, and a grep
of `apps/` and every other package found zero references), and the one published seam this work
touches, `TranslationProvider`, is unchanged by it.

### Decision points

- D1 [load-bearing] How the run's order is made evident and, where it matters, enforced (axis: abstractions, dataflow-state)
- D2 [load-bearing] Where the read-side permission decision attaches (axis: authz-placement, abstractions)
- D3 [load-bearing] Whether the handler survives, and as what (axis: placement, dependencies)
- D4 [load-bearing] Where the four parked concerns go, and whether the module chain joins the list (axis: placement)
- D5 [minor] Whether a named step concept exists at all (axis: abstractions)
- D6 [minor] Whether every write path passes the decision, the module seam included (axis: authz-placement)
- D7 [minor] What replaces the entry's signature, and whether lifecycle reporting leaves the wire file (axis: placement, abstractions)

### How it lands on the system

**Reused rather than rebuilt:** the existing `Run` value and its "never on `this`" rationale ·
`targetDocument.ts`'s `ApprovedWrite` brand, which already closes the write side · `targetLayer.ts`'s
union, which keeps "publish only on a drafts layer" unbuildable · `runChain.ts`'s ordered fold with
`swallowOrThrow` · the whole leaf-narrowing algebra in `core/domain/selection` and
`core/domain/content-projection` · `TaskHandlerInput` from `modules/task-runner`.

**Affected:** `handler.ts` (becomes `translateDocument.ts`) · `targetDocument.ts` ·
`wireTranslateRunner.ts` · two barrel lines · `plugin.ts` (compile-only) · seven test files
(~1,400 lines) that construct the class · `shared/access/handler.ts` and `model.ts`, both deleted.

**Not a consumer, and this decides D5:** `translate-field/handler.ts` takes a `PayloadRequest`,
returns a `Response`, writes nothing, and has no scope, no requester, no module chain, no criteria
and no target layer. It shares `translateContent` and `fetchSourceDocument` and nothing else.

**The precedent that is deliberately not copied:** `core/translation-pipeline` types every stage
`(ctx: PipelineContext) => PipelineContext` over a context with seven required and six optional
fields, so misordering, dropping or swapping stages all type-check; the only guard is a runtime
throw. Its *declaration* style is readable; its *typing* would fail R5.

### The design

**Abstractions**

- `ApprovedSource` (new, `targetDocument.ts`) — carries the proof that the collection's rules were
  asked about this source payload. Invariant: unmintable outside `openTargetDocument`. Callers:
  `selectLeaves`, `runModulesBefore`, `translateOrWrap` — three, all existing.
- `TargetDocument` (existing, narrowed) — gains `readSourceIfAllowed(): Promise<ApprovedSource>` and
  **loses** `readBothLocales` and `refuseUnlessTranslationAllowed`, so unapproved source data is
  unrepresentable outside its file. `BothLocales` stops being exported.
- `Translated | NothingSent` (new) — a discriminated union returned by `translateOrWrap`, so a save
  cannot be written against a run that translated nothing.
- `ApprovedWrite` (existing, untouched).
- **No step interface, no step array, no registry, no `.stage.ts` tag** — ST1, on the verified fact
  that `translate-field` is not a second consumer. The package `CLAUDE.md` convention table is not
  extended.
- `TaskHandlerInput` (existing, adopted) — `model.ts` is deleted.

**Dependency direction.** `plugin.ts` → `features/translate-document/index.ts` (one export,
`wireTranslateRunner`) → `translateDocument.ts` → `{selectLeaves, translateOrWrap, reportNothingSent,
runModules, targetDocument, targetLayer}` → `server/modules/{translation-run, task-runner}` +
`server/shared/payload/*` → `core/*`. All edges downward, no cycle. The `features → modules/task-runner`
type edge the `TaskHandlerInput` graft needs already exists (`model.ts:2` imports from there today).

**Placement**

| Responsibility | File |
|---|---|
| the run's order | `translateDocument.ts` (renamed from `handler.ts`) |
| leaf narrowing (28 lines) | `selectLeaves.ts` |
| provider call + error wrap (21) | `translateOrWrap.ts` |
| "nothing was sent" (39) | `reportNothingSent.ts` |
| module-seam plumbing (31) | `runModules.ts` |
| the access decision | `targetDocument.ts` + `translationPermission.ts` (unchanged) |
| lifecycle reporting | `reportRunnerEvent.ts` (optional, last step) |
| deleted | `model.ts` · `server/shared/access/handler.ts` + its two barrel lines |

The directory stays flat, with a named trigger for revisiting: when the listing passes ~20 entries,
or a second Payload-I/O unit lands here, split by role then. The provider-error wrap stays beside
the translate step and does **not** move into `core/translateContent`, because `translate-field` is
that function's other caller and its behaviour would change.

The entry's body, which is the whole of R2:

```
const run     = await openRun(deps, payload, input, scope);
const source  = await run.doc.readSourceIfAllowed();
const owed    = await selectLeaves(deps.criteria, run, source, input.filters ?? []);
const state   = await runModulesBefore(deps.modules, run, source, input.previousAttempts);
const outcome = await translateOrWrap(deps.translationProvider, run, source, owed);
await saveOrReport(run, outcome, deps.modules, state);
await publishIfAsked(run, input.publishOnTranslation);
```

**Data flow & ownership.** One `Run` built once by `openRun`, never on an object (R6). `moduleState`
has one owner, `runChain.ts`'s fold, merged by module name. `ApprovedSource` owns the source payload
and has one minter; `ApprovedWrite` has one minter. No second source of truth is introduced.

**Security** — `authz-placement`: the read-side decision binds to the read (`readSourceIfAllowed`),
the write-side stays bound to the write (`approveWrite`), the publish asks about `{ _status }`. Three
payloads, three asks, one answering function (`translationPermission.ts`) — SC2. `authn-identity`:
`scope.requester` → `rebuildRequester`, once per run; the entry's `scope` parameter becomes
**required**, because the run's answer depends on it and an absent scope silently downgrades the run
to an unchecked write. `data-exposure` and `secrets-privilege`: unchanged, nothing new leaves the
server and no credential is created or moved.

### Requirement coverage

| R | Design element |
|---|---|
| R1 | `readSourceIfAllowed` → `ApprovedSource` (read-side, pre-provider, type-enforced) · `approveWrite` → `ApprovedWrite` (write-side, existing) · `publish` asks about `{_status}` · the module-seam path per D6 |
| R2 | the seven-line body of `translateDocument.ts`, first in its file; steps are hoisted top-level `function` declarations in sibling files |
| R3 | class deleted · `Handler<TInput,TOutput>` and `shared/access/handler.ts` deleted · `TranslateDocumentOutput` deleted, the entry returns `void` |
| R4 | a step is one sibling file plus one line in the list; a narrowing rule is one `criteria` entry, read only by `selectLeaves.ts` |
| R5 | `ApprovedSource` and `Translated \| NothingSent` as explicit hand-offs; no widening context |
| R6 | `openRun` returns a per-call `Run`; `deps` is the only long-lived value and holds no per-run state |
| R7 | the seam is **kept** — `ChainMember`, `BeforeTranslation`, `AfterSave`, `ModuleState` and `runChain.ts` unchanged — and called from the list through `runModules.ts`. Cost: it still hands a module a `Payload` (D6) |
| R8 | behaviour-preserving except the two points named in D6 and D2's consequences |

### Vector gates

- **structure** — no gate beyond ST1–ST6; applied per decision below. ST1 is the binding one and it
  is what rules out a step framework.
- **security, the wrong-caller gate** — **(a) no requester:** `rebuildRequester` returns `null`,
  `checkTranslationPermission` returns `true`, and the write runs with Payload's default
  `overrideAccess: true`. This is the existing documented rule for an internal job, preserved; the
  design hardens it one notch by making `scope` required, so the downgrade cannot happen by
  forgetting an argument. **(b) a valid user who may not update this document:**
  `readSourceIfAllowed` throws `TranslationRefused` before the provider is paid, and after this
  design, reaching `translateOrWrap` without an `ApprovedSource` does not compile. **(c) a rule that
  answers differently for source and translation:** three asks with three real payloads; `mayWrite`
  passes `data` to Payload's own evaluator, the same argument `updateByID` uses. **(d) revoked
  mid-run:** `enforcedAtTheWrite` sets `overrideAccess: false`, so Payload re-evaluates at the write.
  Two honest residuals, both pre-existing: Payload *strips* a field the requester may not write
  rather than throwing, so a field-level revoke yields a silently partial write; and the requester
  record is rebuilt once per run, so a user deleted mid-run is not re-fetched.

### Decisions (ADRs)

#### D1. A plain sequence, with a typed hand-off where the order is load-bearing

- **Context:** R2 wants a readable order, R5 forbids an untyped bag, and the repo's only stage
  precedent types every stage `(ctx) => ctx` over a context whose products are optional — so
  misordering type-checks and a runtime throw is the only guard.
- **Options considered:**
  - an ordered array of step objects, the repo precedent — disqualified by all three candidates, because the registry would have one consumer (ST1) and copying its typing fails R5
  - a plain sequence relying on data dependencies alone (`min-new-abstraction`)
  - a plain sequence **plus** branded hand-off values (`cleanest-boundaries`, agreed by `max-reuse`)
- **Decision:** the third. Top-level `function` declarations in sibling files, listed in the entry's
  first lines, with two typed hand-offs: `ApprovedSource` and `Translated | NothingSent`. Clears
  **ST1** (no new interface, no single-caller seam), **ST5** (the citation is R1 plus the measured
  unsafety of the precedent, not "pipelines are clean"), **ST4**, **R5**.
  The recorded counter-argument — *a closure forces steps below their use, so the list moves to the
  bottom* — is **refuted**: it applies to `const` arrows inside a factory, not to hoisted `function`
  declarations in sibling modules.
- **Consequences:** adding a step is one file plus one line. The order of `selectLeaves` relative to
  `runModulesBefore` stays list order plus tests, not types — forcing it would hand `translateOrWrap`
  a parameter its answer does not depend on, which the owner's signature rule forbids. That is the
  design's main residual stiffness and it is deliberate.

#### D2. The read-side decision binds to the read

- **Context:** the write side is already closed by `ApprovedWrite`; the read-side check is a bare
  call in the middle of `handle()` and only tests keep it before the provider call. A decorator and
  lifting to the caller are already ruled out.
- **Options considered:**
  - keep the explicit call (proposed by nobody)
  - merge read-and-ask and **remove** the old methods (`min-new-abstraction`, `cleanest-boundaries`)
  - merge but **keep** the old methods on the type, to spare a contract test (`max-reuse`)
- **Decision:** merge and remove. The third option is disqualified under **SC1**: leaving a reachable
  read path that skips the decision, on the very type that owns the decision, is the failure SC1
  names. Its stated justification was also checked and is false — `targetDocument.contract.test.ts`
  is 13 lines and asserts only about `ApprovedWrite`, referencing neither removed method. Clears
  **SC1**, **SC2**, **ST1** (three existing callers), **ST4**.
- **Consequences:** an unapproved source becomes unrepresentable outside one file. The earlier
  sanctioned ground — *the list should show that a permission is asked* — is honoured by naming: the
  line reads `readSourceIfAllowed` and the value is typed `ApprovedSource`. This is a real trade and
  the owner reopened it deliberately: the ask is no longer a standalone greppable call.

#### D3. Module-level functions and a deps parameter; no class, no factory

- **Context:** R3 kills the class, R6 forbids per-run state on a long-lived object, and the four
  config-time dependencies are built once in `wireTranslateRunner.ts`.
- **Options considered:**
  - the class (killed by R3)
  - a factory closing over deps (carries the "steps move to the bottom" objection)
  - module-level functions taking `deps` first (all three candidates)
- **Decision:** the third. Clears **R6**, **ST6** (the entry owns orchestration only), **ST1**.
- **Consequences:** `deps` is threaded explicitly into the three steps that need a slice of it, which
  is the honest cost and is also what makes each signature claim only what its answer depends on.
  Testing loses a construction step.

#### D4. Four siblings, flat; the module chain is a line in the list

- **Context:** ST6 — the entry must not keep four unrelated clusters.
- **Options considered:**
  - three siblings with the seam plumbing inline (`min-new-abstraction`)
  - four siblings including a file for the seam (`max-reuse`)
  - six files plus a `store/` folder holding the I/O trio and the four error classes
    (`cleanest-boundaries`)
- **Decision:** four siblings, flat, no `store/` folder. The seam gets its own file because with
  D6's guard the plumbing is no longer three lines. The `store/` folder is declined on the
  convention's own test — *would it change if Payload changed its storage format?* — which the four
  error classes fail; and because there is no import-boundary linter, so "steps → store, never back"
  would be prose. Clears **ST6** without churn no rule enforces.
- **Consequences:** ~17 entries, flat, with the named revisit trigger above.

#### D5. No named step concept

- **Context:** a `Step` interface is the obvious move and ST1 is the test.
- **Options considered:** a `PipelineStage`-like interface reused from `core/` · a new server-side
  step interface · none.
- **Decision:** none. Re-checked at adjudication against `translate-field/handler.ts` and confirmed:
  it returns `Response`, writes nothing, and has no scope, module chain, criteria or target layer, so
  a step interface would have one consumer. **ST1** disqualifies it; **ST5** holds because the reason
  is a verified fact rather than taste.
- **Consequences:** R4 is met as "one function plus one line", not "append to an array". Nothing in
  the requirements asked for data-driven registration.

#### D6. The module-seam write path — the one decision left to the owner

- **Context:** `moduleSeam` hands a module `{ payload, target, scope }` with `BeforeTranslation.payload`
  typed `Payload`, so a module can `payload.update` the target document with nothing asked, and with
  Payload's local-API default `overrideAccess: true`. This is an **SC1** violation on a path the
  design otherwise closes.
- **What was disproved:** all three candidates left it open citing "provenance needs the full
  `Payload`". Verified false: every provenance write names `this.collection`, its own sidecar, and
  `refuseACollidingSlug` → `assertProvenanceSlugFree` guarantees that slug differs from every host
  collection. Provenance never writes the target document. A `.shapes.ts` slice would not close it
  either, because the hole is about *which record*, not *which method*.
- **Options considered:**
  - leave it open and record it (all three candidates; rejected — the justification was false)
  - a `Proxy` over `payload` in `runModules.ts` refusing `update`/`delete` addressed at the run's own
    target (adjudication). Needs no assertion and no signature change, but it is runtime interception
    of a framework object whose type still says `Payload`
  - hand modules a capability instead of a `Payload` — structural, and it changes
    `BeforeTranslation`, `AfterSave` and the provenance service factory
- **Decision:** carried to Open questions. The evidence is settled; the remedy is the owner's call,
  because option two buys closure with a runtime trick the type system hides, and option three is a
  separate piece of work. Until it is decided, the hole stands as it does today.
- **Consequences:** build step 4 is blocked on this answer. Nothing else is.

#### D7. `TaskHandlerInput` is adopted; `scope` becomes required

- **Context:** the entry's signature must stop lying, and `model.ts` may be a duplicate.
- **Options considered:**
  - keep `TranslateDocumentInput` and delete only the `TranslateDocumentOutput` type
  - adopt `TaskHandler` wholesale, signature included (`max-reuse`)
  - adopt `TaskHandlerInput` but declare the entry's own signature
- **Decision:** the third. `TaskHandlerInput` is field-for-field identical to
  `TranslateDocumentInput`, both importing `RunAsk` from the same module — one shape with two owners.
  `model.ts` is deleted and the module's type survives, because the alternative forces a
  `modules → features` edge (**ST2**). `TaskHandler` itself is **not** adopted as the entry's type:
  it declares `scope?`, and an absent scope means an unattributed, access-overridden write, so the
  entry demands `scope`. Lifecycle reporting leaves the wire file (**ST6**, two unrelated clusters).
- **Consequences:** `wireTranslateRunner`'s seven-field hand-copy goes. `modules/task-runner/index.ts`
  gains one barrel line; `features/translate-document/index.ts` is pruned to the one export
  `plugin.ts` uses.

### Build sequence

1. `readSourceIfAllowed` and the `ApprovedSource` brand on `TargetDocument` — add the runtime
   `unique symbol`, the brand and the merged read-and-ask; remove `readBothLocales` and
   `refuseUnlessTranslationAllowed`; keep the existing call sites. The minting function must carry an
   explicit return type, or `[approvedSource]: true` widens to `boolean` and the assertion comes back.
   Verify with the real `turbo build`, not only `check-types`. — establishes the type that makes D1
   and D2 enforceable; unblocks 2 and 3 · covers: R1, R5 · via /sp-task · incremental
2. Extract the four parked concerns into `selectLeaves.ts`, `translateOrWrap.ts`,
   `reportNothingSent.ts`, `runModules.ts`, still called from the class's private methods — keeps
   every check green at each commit; unblocks 3 · covers: R4, R8 · via /sp-task · incremental
3. Delete the class — `translateDocument(deps, payload, input, scope)`; delete `Handler`,
   `shared/access/handler.ts` and its two barrel lines; delete `model.ts`; export `TaskHandler` and
   `TaskHandlerInput` from the task-runner barrel; drop the seven-field copy; prune the feature
   barrel. · covers: R2, R3, R6, R7 · via /sp-task · big-bang within the package (29 construction
   sites move in one commit; a compatibility shim buys nothing for an internal rename)
4. Close the module-seam hole, **blocked on D6's open question** · covers: R1 · via /sp-task · incremental
5. Split lifecycle reporting out of the wire file · covers: R4 · via /sp-task · incremental
6. Move `PermissionCheckFailed` out of `features/`, so `shared/payload/__tests__/swallowOrThrow.test.ts`
   stops importing upward across the gradient · covers: R8 · via /sp-task · incremental

**What in the test rewrite is not mechanical.** The rename at 29 sites is. What is not: `handler.test.ts`
(five inline constructions) must be split once the four concerns are sibling files, and deciding what
moves versus what stays an end-to-end order check is judgement · `handler.spend.test.ts` changes
meaning, proving at runtime what `ApprovedSource` now proves at compile time, and should stay with a
stated reason · `handler.moduleFailure.test.ts` changes fixture shape in step 2 and gains a case in
step 4 · `targetDocument.contract.test.ts` needs two cases **added**, not a rewrite. Checked and found
*not* at risk: `handler.access.test.ts` mocks `translationPermission.js` and asserts on call
arguments, which the merge preserves.

### Open questions / unresolved

- **D6 — how the module-seam write path is closed.** The evidence is settled (provenance is not the
  obstacle); the remedy is not. Blocks build step 4 only.
- **Who may run an unattributed translation.** "No requester → no check" lives in code comments, not
  in a recorded decision. Making `scope` required removes the accidental path but does not decide the
  policy. Blocks nothing; should be written down before the next access change.
- **`translate-field` pays a provider with no translation-permission ask.** It checks the collection's
  *read* rule and nothing else. It writes nothing, so R1 does not reach it, but it is a second path
  that spends money on a document. Its own decision; blocks nothing here.
- **What `core/translateContent` may assume about provider errors.** The wrap sits in the feature
  because moving it would change the field path, which leaves that function's error contract
  implicitly "whatever each caller wraps differently".

### Accepted deviations

None.

### Rejected / grafted (for the record)

- Keeping `readBothLocales` / `refuseUnlessTranslationAllowed` on the type (`max-reuse`) —
  disqualified: **SC1**; its cited justification was verified false.
- Minting the brand with `as ApprovedSource` (`min-new-abstraction`, `max-reuse`) — disqualified by
  the owner's binding "no type assertions to silence the checker". Both candidates flagged it
  themselves and shipped it anyway. The runtime-`Symbol()` mint needs none.
- The `store/` folder (`cleanest-boundaries`) — rejected on the package's own role-folder test.
- Seam plumbing inline in the entry (`min-new-abstraction`) — rejected: the entry would own a fifth
  concern, **ST6**.
- Lifecycle reporting staying in the wire file (`min-new-abstraction`, `max-reuse`) — rejected:
  **ST6**. Grafted from `cleanest-boundaries` as an optional last step.
- Grafted from `max-reuse`: `TaskHandlerInput` adopted and `model.ts` deleted (one shape, two owners,
  **ST4**; the survivor must be the module's or **ST2** breaks), and the warning that the source brand
  must not reuse the write brand's symbol — verified: a type alias gets an implicit index signature,
  so a shared symbol would make the read's result assignable to `ApprovedWrite`.
- Grafted from `cleanest-boundaries`: the assertion-free mint, the `Translated | NothingSent` union,
  removing `BothLocales` from the exports, the wire-file split.
- All three leaving D6 open "because provenance needs the full `Payload`" — **overruled on evidence**;
  the remedy is carried to Open questions rather than decided here.
