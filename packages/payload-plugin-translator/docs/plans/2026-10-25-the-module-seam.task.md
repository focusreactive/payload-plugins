Build step: 2026-10-25-asking-payload-everywhere.design.md #9

## Task restatement

A module on the translation-run chain is handed the whole `payload` (`BeforeTranslation.payload`,
`AfterSave.payload`). With it, it can write **the very document the run is translating** — past every
check steps 3–8 installed, because those guard the routes and the queue, not the chain.

This step hands modules a `payload` that refuses writes to the run's own collection.

Covers **R3** and **R5** (gap 6). Out of scope: the pins, `@since` and the release note itself (#10) —
but what breaks for a host is recorded here so step 10 can write it.

## Measured, not assumed — and the design is wrong on two points

| The design says | Measured |
|---|---|
| "`ModulePayload` — the **narrowed type** of the seam's `payload`" | **a narrowed type cannot work.** `Provenance.module.ts:63,74` passes `state.payload` into `ProvenanceStoreFactory = (payload: Payload, …)`. A type with fewer members is not assignable to `Payload`, so narrowing breaks provenance — which the same design says needs no change |
| "refuses the run's own target collection" (implied at the type level) | **inexpressible in types.** The target collection is a runtime value typed `CollectionSlug`, so `Exclude<CollectionSlug, typeof target.collection>` collapses to `never`. Proven by probe |
| "**big-bang** for host chain members" | **not a big bang.** Because the type stays `Payload`, nothing breaks at compile time. What changes is runtime: a module that writes to the run's own collection now throws where it used to succeed |
| "provenance needs no change" | **true, re-verified.** Its store writes only `this.collection`, the sidecar (`Provenance.store.ts:90-146`), and `assertProvenanceSlugFree` already refuses a sidecar slug that collides with a translated collection |

## What already exists — platform · installed · project · verdict

| Rung | Found | Verdict |
|---|---|---|
| platform | Payload's own access control | **does not help here.** The chain runs inside the worker with the requester's rights at best; a module calling `payload.update` with `overrideAccess` default writes unchecked |
| platform | `Object.create(payload)` | **the mechanism.** Payload is a class instance, so a spread would drop its prototype methods; prototype delegation keeps every member and lets three be overridden |
| project | `assertProvenanceSlugFree` | the precedent for "a module must not collide with a translated collection", already enforced at config time for the sidecar's **slug** |
| project | `TranslatorError` subclasses with `mustPropagate` | the error idiom; a refusal here must propagate, not be swallowed |

Nothing new is installed.

## Decisions

### D1 — a wrapper whose type stays `Payload`, not a narrowed type

**Chosen:** `payloadForModules(payload, target)` returns an object with `payload` as its prototype,
overriding `create`, `update` and `delete` to refuse the run's own collection. Its type is `Payload`.

**Rejected — a narrowed `ModulePayload` type** (the design's wording). Measured above: provenance
hands `state.payload` to a factory declaring `Payload`, so a narrower type breaks the one module the
design says needs no change. The narrowing would also buy nothing, because the refusal it is meant to
express is inexpressible.

**Rejected — a brand on the wrapper** (`Payload & { guarded: true }`). A module declares `Payload`,
so it would never see the brand; it would mark the seam without constraining anyone.

### D2 — the refusal is a runtime guard, and that is forced rather than chosen

Proven by probe: `Exclude<CollectionSlug, typeof runsOwnCollection>` is `never`, because the run's
collection is a value, not a literal type. No type can say "any collection but this one" here.

**Recorded consequence:** this step's guarantee is weaker in kind than step 7's. The brand at the
queue makes forgetting *not compile*; this makes writing to the wrong collection *throw*. Both are
real, and the difference should not be blurred in the release note.

### D3 — which operations are guarded

**Chosen:** `create`, `update`, `delete`. Reads are untouched.

**Rejected — guarding reads too.** A module legitimately reads the document under translation; the
staleness recompute does exactly that. Refusing reads would break a thing the plugin itself does.

### D4 — what a refusal looks like

**Chosen:** a `TranslatorError` subclass with `mustPropagate = true`, so it reaches the run rather
than being swallowed into a silent no-op.

**Rejected — returning without writing.** A module that believes it wrote and did not is worse than
one that fails loudly.

### D5 — shape check

Triggers: a field's **type** changes on a type implemented outside this package (`BeforeTranslation.payload`,
`AfterSave.payload`).

| | wrapper typed `Payload` *(chosen)* | a narrowed structural type |
|---|---|---|
| cost of the next guarded operation | one more override | one more member to list, and every module's declared type to match |
| states admitted vs produced | the type admits every write; the guard refuses one collection at run time — the gap is **real and named**, not hidden | admits only what is listed, but cannot express the one refusal that matters |
| second caller already in the repo | both seam sites (`beforeTranslation`, `afterSave`) | same |
| breaks outside this repo | nothing at compile time; a write to the run's own collection throws | **every** chain module, including read-only ones |

## Acceptance Criteria

| # | Covers | Criterion | How it is checked (binding) |
|---|---|---|---|
| AC1 | R5 | A module's `payload.update` on the run's own collection throws | a case in `translation-run/__tests__/` |
| AC2 | R5 | …and so do `create` and `delete` | two more cases |
| AC3 | R3 | A module's write to **any other** collection still goes through | a case asserting the underlying `payload.update` was called |
| AC4 | R3 | Reads are untouched, including of the document under translation | a case asserting `findByID` reaches the real payload |
| AC5 | R3 | Everything else on `payload` is still reachable | a case touching a member the wrapper does not override |
| AC6 | R5 | Provenance needs no change | its suites stay green **and its files unmodified** |
| AC7 | R5 | The refusal reaches the run rather than being swallowed | the error is a `TranslatorError` with `mustPropagate === true` |
| AC8 | R5 | The baseline holds | real `turbo build` green; integration **225 passed / 8 skipped** |

## Pre-flight — against the CURRENT tree

| # | Polarity | Now | Evidence |
|---|---|---|---|
| AC1–AC2, AC7 | must FAIL | **fail** | `grep payloadForModules src` → nothing; the seam hands the raw `payload` |
| AC3–AC5 | must PASS | **pass** | they describe what the raw payload already does, and must keep doing |
| AC6, AC8 | must PASS | **pass** | 204 files / 2570 checks, build green, 225/8 |

## Risk notes

**High risk, and the risk is not where the design put it.**

- **The guarantee is runtime, not compile-time** (D2). A reader who has followed steps 3–8 will
  expect the step-7 kind of guarantee and will not get it. The release note must say so plainly.
- **Prototype delegation is the mechanism** (D1). A module that enumerates `payload`'s own keys, or
  checks `instanceof`, would see a difference. No in-repo module does either — swept in Phase 4.
- **A host module that writes to the translated collection breaks at run time**, with no compile
  warning. That is the whole point, and it is also the thing most likely to surprise.
- A test is required before done; the regression sweep names what was grepped; Phase 5b runs several
  angles.

## Human choices

**2026-10-25.** The owner asked to be stopped only if the measurement showed `ModulePayload` breaking
**every** chain module including read-only ones. It showed the opposite — the honest implementation
breaks **nothing** at compile time — so no fork was raised. The design's wording is contradicted on
three points (narrowed type, compile-time refusal, big-bang), each recorded above with its
measurement rather than quietly re-interpreted.

## Criteria results

| # | Outcome | Evidence, by the check the criterion named |
|---|---|---|
| AC1–AC2 | met | `payloadForModules.test.ts` refuses all **five** guarded writes (three named in the contract, plus `duplicate` and `restoreVersion` found in review); **mutation**: disabling the guard reddens 5 checks |
| AC3 | met | a write to another collection reaches the real payload |
| AC4 | met | `findByID` on the document under translation reaches the real payload |
| AC5 | met | an unguarded member (`config.serverURL`) is still reachable |
| AC6 | met | provenance **unmodified** — `git status` on its directory is empty — and its suites green |
| AC7 | met | `mustPropagate === true`, with the condition now stated accurately |
| AC8 | met | real `turbo build` green, forced; integration **225 passed / 8 skipped** |

## Review log

**2026-10-25 — the measurements that contradicted the design**, taken before any code was written and
recorded above in `## Measured`: a narrowed type breaks provenance; the refusal is inexpressible in a
type (probe: `Exclude` collapses to `never`); and therefore the step is **not** the big bang the
design called it — nothing breaks at compile time.

**`/sp-complexity`.** Neighbourhood 6 files; history mute for the new ones. "A fourth guarded
operation": CHANGE 2 in one file, READ 2. "A new chain member": CHANGE 1, and the guard applies by
itself because it sits in `runChain`. Verified `forTheModule` is the only path to a module.
**No findings.**

**`/sp-abstraction`.** Audited by the author.

- **The honesty gap is real but forced.** The type admits writes to every collection; the system
  refuses one. It cannot be closed — the signature cannot carry it, so the docblock does.
- **Prototype delegation priced by probe, not assumed.** Surviving: `instanceof`, inherited members,
  unguarded methods, overridden methods. Differing, exactly two: `Object.keys` on the view returns
  the guarded names rather than Payload's own properties, and `hasOwnProperty` on an inherited member
  is false. **Swept: no module in the repo does either.**
- **Finding, fixed:** `operation: string` in the error, where exactly three values existed. Named as
  `GuardedWrite`.

**`/sp-red-test` in audit mode.** Replacing the guard with a pass-through reddened **5 checks in 3
files** — three on the refusal itself, two on the seam actually handing the guarded view. No toothless
check. Scaffolding deleted.

**`/sp-review-comments`.** 4 blocks, 4 verdicts + 1 MISSING: 1 KEEP… in fact 0 KEEP — 2
REWRITE-COMMENT, 1 DELETE, 1 REWRITE-CODE. Inline density 0.36 per 10.

- The 12-line docblock on `payloadForModules` was cut to 5. Two of its paragraphs argued with a
  **reviewer** ("why isn't this a type?", "`Object.create` keeps everything") rather than telling a
  caller anything; both facts already live in `## Decisions`. What replaced them is the consequence a
  module author actually needs: own-key enumeration sees only the guarded methods.
- The error's docblock said *"Propagates"* unconditionally. **False against the code**:
  `swallowOrThrow` rethrows only inside a transaction. Now states the condition.
- `forTheModule`'s note repeated its own name; the view is now built inside the closure handed to the
  module, so `carried` and `state` visibly stay unguarded and the note had nothing left to say.
- The MISSING entry was an unexplained cast; the helper was reshaped so the cast has one stated
  reason beside it.

**Found outside its own remit, and it was a real gap:** the guard covered `create`, `update` and
`delete` only. Checked Payload's surface — **`duplicate` and `restoreVersion` also write and also take
a collection**, and both were reachable. Added, with two checks and a mutation. `payload.db` reaches
the database directly and **cannot** be covered this way; that limit is now stated in the docblock.

### Verification after every fix

`check-types` 0 · oxlint 43 warnings / 0 errors · package suite **205 files / 2581 checks**, up from
204 / 2570 by exactly +1 file and +11 checks (9 for the guard, 2 from the per-source-file throw test
for the two new files) · real `turbo build` green, forced · integration **225 passed / 8 skipped** ·
both gates clean.

### Owed to step 10

A release-note line, and it must not overstate: this guarantee is a **runtime** refusal, unlike step
7's compile-time brand. It stops a module from forgetting, not from intending — `payload.db` and
reaching through the prototype both remain. A host module that writes the translated collection now
fails where it used to succeed.
