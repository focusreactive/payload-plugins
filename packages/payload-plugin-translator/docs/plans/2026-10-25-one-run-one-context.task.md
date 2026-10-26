# One run, one context

**Risk: low.** No behaviour changes. One class, one production caller, and a path covered by 95 unit
checks in nine files plus the integration suites.

## Task restatement

The owner read `translate-document/handler.ts` and said he could not run his eye down it. He is
right, and the reason is measurable rather than stylistic: **`handle` is 117 lines of the file's
341**, and five or six values that no step decides are re-threaded through every private method.

Counted in the file as it stands: `payload` written 29 times, `collection` 21, `input` 21,
`requester` 19, `scope` 18, `targetLng` 12. Parameter counts per method:

| method | params |
|---|---|
| `saveTranslatedDocument` | **7** |
| `refuseUnlessAllowed` | **6** |
| `publishTargetLocale` | **5** |
| `leavesToSend` · `handle` | 3 |
| `answerTo` | 2 |
| `translateOrWrap` | 1 |

Each of the top three rebuilds the same set from scratch, in a different order, with a different
subset. That is the owner's own rule one level up from where he has been applying it: **values that
always travel together are a type nobody named.**

Second, `handle` mixes two altitudes. "Read the source document" sits beside
`payload.collections[collection].config.versions`, `depth: 0`, `draft: true`, `freshReq(scope)`.

**This is a readability change, not a correctness fix** — the same framing as
`2026-10-09-name-what-the-workflow-handler-does.task.md`, which did this for the workflow handler
sixteen days ago after the owner said the same thing about it.

## What already exists — platform · installed · project · verdict

**Nothing new is invented. The project already has this shape, twice, in the file this handler
imports from.** `TranslationRun.interface.ts:20` and `:30`:

```ts
export type BeforeTranslation = {
  readonly payload: Payload;
  readonly target: RunTarget;
  readonly scope: RequestScope;
  …
};
export type AfterSave = {
  readonly payload: Payload;
  readonly target: RunTarget;
  readonly scope: RequestScope;
  …
};
```

The module seam already opens every context with `{ payload, target, scope }`. Only the handler's
own private methods pass those three apart, positionally. `Run` is the handler-side sibling of two
types it already constructs.

**Precedent for the task shape:** `2026-10-09-name-what-the-workflow-handler-does.task.md` — a
readability task on a handler, same complaint, same package. Its D3 is the clause to copy: it
dropped one of three proposed extractions and said so plainly rather than slipping it in.

## Decisions

### D1 — one `Run` context, built once per call

**Chosen:** a type holding what every step needs and no step decides, assembled at the top of
`handle` and passed as the first argument to each step.

```ts
/** What every step of one run needs and none of them decides. */
type Run = {
  readonly payload: Payload;
  readonly target: RunTarget;
  readonly scope: RequestScope;
  readonly requester: RebuiltRequester | null;
  readonly schema: FieldLike[];
  readonly layer: TargetLayer;
};
```

**Rejected — keep threading.** The zero option, and it loses on the measurement above: three methods
carrying 5, 6 and 7 parameters, built from the same six values.

**Rejected — hold the per-request values as instance fields.** It reads tidiest of all and it is a
**bug**. `wireTranslateRunner.ts:44` constructs the handler once at boot and the closure at `:53`
calls `handle` for every job; Payload's runner takes a batch. Two concurrent jobs would write each
other's `requester` and `target`. This is a constraint from the code, not a preference.

**Constraint cited:** `TranslationRun.interface.ts:20-36` — the project already names this exact
triple as a context, twice.

### D2 — `Run` lives in `handler.ts` and is not exported

**Chosen:** declared beside the class that builds it.

**Rejected — its own file.** It has one producer and one consuming module. The brake is "prefer
editing an existing file to creating a new one", and the package's own barrel rule says a name
leaves its module only when something outside uses it. If a second feature needs it, it moves then,
and that move is cheap.

### D3 — `handle` reads as a list of named steps, with no Payload call in it

**Chosen:** every Payload API call moves behind a named step. The test is mechanical: if
`payload.findByID` appears in `handle`, a step has not been named. Two such calls are there today
(`payload.collections[...]` at :158, `payload.findByID` at :171).

**Rejected — extract everything that could be extracted.** `2026-10-09`'s D3 is the precedent for
restraint: it kept the least confusing of four mechanics inline because "the two that earned names
are the ones the owner could not read." The same applies here — `translateOrWrap` already has a name
and one parameter and is left alone.

### D4 — the duplicated condition collapses; publication keeps its position

`if (!translated?.translatedData)` and `if (translated?.translatedData)` stand back to back
(:225, :230). They become one `if/else`.

**Publication stays outside that block, where it is today.** `if (publishOnTranslation && layer.kind
=== "drafts")` at :249 runs whether or not anything was translated, so a run that sent nothing still
publishes the target locale when asked. An early return from `handle` — which the shape invites —
would change that silently. **See `## Human choices`: this is the owner's to confirm, not the
agent's to decide.** Whatever he chooses, the step is named so the fact is visible in the list
rather than inferred from brace position.

### D5 — the constructor takes one object

**Decided by the owner at the gate, 2026-10-25.** `criteria` is the fourth positional parameter
with an empty default; `handler.criteria.test.ts:49` passes `[]` for `modules` purely to reach it;
`wireTranslateRunner.ts:44` destructures four names from its own params type and reassembles them
positionally, with no transformation. It is the same disease as D1 one level out — a set of values
that travel together, pretending to be four unrelated arguments.

```ts
constructor(deps: {
  translationProvider: TranslationProvider;
  schemaMap: CollectionSchemaMap;
  modules?: readonly ChainMember[];
  criteria?: Criteria;
})
```

**Rejected — keep a positional overload for the old call shape.** Two forms instead of one, worse
than either end. **Rejected — defer it to its own task**, which was the agent's recommendation on
the precedent of `2026-10-09` ("existing tests not to be edited"); the owner overruled it, and the
reason the recommendation was weak is recorded under `## Human choices`.

Cost, counted: **12 construction sites** across nine test files, plus `wireTranslateRunner.ts:44`.

### Shape check

Fired: **"two or more fields are always set together"** — `Run` is six. Not fired: nothing is added
to a published or externally implemented type; no exported function gains a parameter (three lose
four to six each); nothing new is optional.

| | **one `Run`** (chosen) | two objects: `Request{payload,scope,requester}` + `Document{target,schema,layer}` | keep threading (zero option) |
|---|---|---|---|
| cost of the next value of this kind | 1 edit — add a field | 2 edits — pick an object, then add | 3–8 edits, one per signature |
| states admitted / produced | 1 / 1 — all six are always present | 1 / 1, but every step takes 2 args to say what 1 says | n/a |
| second caller already present | 6 — `leavesToSend`, `refuseUnlessAllowed`, `saveTranslatedDocument`, `publishTargetLocale`, the read step, the report step | same 6 | — |
| breaks for an implementor outside this repo | nothing — not exported, not published | nothing | nothing |

The second shape loses on the middle row: the split is drawn where the *values* come from, not where
any step draws a line, so every step would take both halves. Splitting a context nobody splits is a
distinction the code does not make.

### Placement

Everything stays in `translate-document/handler.ts`. **Files are not split in this task** — breaking
the file up before the shared type exists would scatter the same threading across several files, and
the decision to split is worth taking against the measured result, not against a guess. Recorded as
a follow-up, not a liberty.

### New surface

One type (`Run`), not exported, six consumers inside the file. Named steps replace inline blocks;
none is exported.

### Written contract

`Run` owes its readers one thing a signature cannot state: **it is per call, never per instance** —
the handler is a boot-time singleton serving concurrent jobs (D1's rejected alternative). That is
one sentence in its docblock, and it is the thing a future reader is most likely to get wrong.

No `/sp-red-test` path: no new interface, no new port, no suite that is itself the deliverable.

### Escalate to `/sp-architect`?

No. One class, one file, no new seam, no dependency change, no stored shape touched.

## Acceptance Criteria

| AC | Criterion | How it is checked | Passes when |
|---|---|---|---|
| AC1 | `handle` reads as a list of steps | count its lines: `awk '/^  async handle\(/{s=NR} /^  \}$/{if(s){print NR-s; exit}}' handler.ts` | ≤ 30 |
| AC2 | `handle` makes no Payload API call | the same `awk` range, piped to `grep -cE 'payload\.(findByID\|update\|collections\|create\|delete)'` | 0 |
| AC3 | No step rebuilds the context by hand | parameter count per method (script in the pre-flight below) | no method over 3; none over 2 besides `handle` and `leavesToSend` |
| AC4 | The file is shorter than it was | `wc -l handler.ts` | ≤ 260 |
| AC5 | **Behaviour is identical** | `bunx vitest run src/server/features/translate-document` **and** `git diff -- src/server/features/translate-document/__tests__/` | 95 passed, and the diff contains **no** changed `expect(` line — baseline captured 2026-10-25 against the untouched tree |
| AC6 | A run that translated nothing still publishes when asked | the existing check in `handler.test.ts` | green, unedited (invariant — unless the owner changes it at the gate) |
| AC7 | The duplicated condition is gone | `grep -c 'translated?.translatedData' handler.ts` | ≤ 1 |
| AC8 | No new type errors | `bun run check-types`, package and `apps/dev` | 0 each |
| AC9 | No new analyzer findings | `bunx oxlint .` | ≤ 43 warnings, 0 errors |
| AC11 | The constructor takes one object, and no caller passes a filler argument | `grep -rn 'new TranslateDocumentHandler(provider, schemaMap, \[\], ' src/` and the constructor's parameter count | 0 filler sites, 1 parameter |
| AC10 | The queue path still works end to end | rebuild from the root, then `bun run test:integration` in `apps/dev` | 225 passed / 8 skipped, unchanged |

## Pre-flight — run 2026-10-25 against the untouched tree

| AC | Result now | Kind |
|---|---|---|
| AC1 | **117** | change — fails now, correct |
| AC2 | **2** (`payload.collections` :158, `payload.findByID` :171) | change — fails now, correct |
| AC3 | **7** (`saveTranslatedDocument`), **6** (`refuseUnlessAllowed`), **5** (`publishTargetLocale`) | change — fails now, correct |
| AC4 | **341** | change — fails now, correct |
| AC5 | 95 passed; test diff empty | invariant — passes now, correct |
| AC6 | green | invariant — passes now, correct |
| AC7 | **2** | change — fails now, correct |
| AC8 | 0 and 0 | invariant |
| AC9 | 43 warnings, 0 errors | invariant |
| AC11 | **1** filler site (`handler.criteria.test.ts:49`), constructor takes **4** parameters | change — fails now, correct |
| AC10 | 225 passed, 8 skipped | invariant |

The parameter count for AC3 is taken with:

```bash
python3 -c "
import io,re
s=io.open('src/server/features/translate-document/handler.ts').read()
for m in re.finditer(r'^  (?:private |)(?:async )?(\w+)\(([^)]*)\)', s, re.M):
    n=len([p for p in m.group(2).split(',') if p.strip()])
    print(n, m.group(1))"
```

## Risk notes

- **The only way this task can do damage is by changing behaviour while claiming not to.** AC5 is
  the guard, and it has two halves on purpose: the suite passing is not enough, because a moved
  expectation also passes. The diff over `__tests__/` must be empty of changed assertions.
- **The publication ordering (D4) is the one real fork.** It is at the gate rather than decided
  here.
- `translateOrWrap`'s docblock explains why an `APIError` is re-thrown unwrapped while anything else
  is adopted. That reasoning must survive the move intact; it is load-bearing and was reviewed.
- The `Run` type must not become a bag. Six fields is the whole set; anything a step *decides* —
  `sourceData`, the selection, what came back — stays an ordinary argument.

## Human choices

**2026-10-25 — the owner asked for this after reading the file**, following a `/sp-abstraction` and
a `/sp-complexity` pass over it. His words: the code is hard to read, over 300 lines, and he wants
to run his eye down linear calls in order and understand what is happening.

**Answered at the gate, 2026-10-25:**

1. **Publication after a run that sent nothing — keep today's behaviour.** The task changes no
   behaviour at all; AC5 and AC6 guard it. The step is named so the fact reads from the list rather
   than from brace position.
2. **The constructor folds into one object, in this task** (D5). The agent recommended deferring
   it, on the `2026-10-09` precedent of not touching existing tests, and the owner overruled it.

**The agent's recommendation was weak, and the correction belongs here rather than being quietly
dropped.** It rested on a tension with AC5 that does not exist: AC5 pins that no **assertion**
changes (`expect(` lines), not that no line of a test file changes. Construction sites are setup,
not assertions, so folding the constructor leaves the guard fully intact. The real cost is 12 edited
construction sites and nothing else.

## Open, not solved here

- Splitting `handler.ts` into several files. Decide against the measured result, not a guess.
- The literal `"stale"` declared twice (`Provenance.criterion.ts:13`, `runTargets.ts:8`), held equal
  by two comments. Reported by `/sp-abstraction`; a consequence of two settled decisions.
- **`payload.collections[input.collection].config.versions` indexes unguarded**, so a slug Payload
  does not know fails as a bare `TypeError: Cannot read properties of undefined`, with the slug
  nowhere in the message. Eight lines above, the same method throws a named `TranslatorConfigError`
  for the `schemaMap` miss, and the nearest neighbour doing the same lookup
  (`translationPermission.ts:89`) writes `payload.collections[collection]?.config?...`. Raised by
  the comment audit as a MISSING note. **Pre-existing** — `git show HEAD:…/handler.ts:78` has the
  same unguarded index — and **not fixed here**, because a named error in place of a `TypeError`
  is a behaviour change and AC5 forbids one.
- `plugin.ts:176` takes criteria from one source, so a second rule from another module has nowhere
  to go. Settled as "no registry while there is one rule".

## Acceptance criteria — walked with their declared checks, 2026-10-25

| AC | Verdict | Evidence |
|---|---|---|
| AC1 `handle` ≤ 30 lines | **met** | 117 → **25** |
| AC2 no Payload API in `handle` | **met** | 2 → **0** |
| AC3 no step rebuilds the context | **met on its first clause, not on the second** | widest signature 7 → **3**. The stricter half I wrote — "none over 2 besides `handle` and `leavesToSend`" — is not met: `beginRun`, `runModulesBefore`, `runModulesAfter` and `translateOrWrap` each take 3, and each of the three is something the step genuinely needs |
| AC4 file ≤ 260 lines | **NOT MET** | 341 → **374**. See below |
| AC5 behaviour identical | **met** | 95 passed, and **0** changed `expect(` lines across the nine test files |
| AC6 publish after a run that sent nothing | **met** | unedited and green; a reviewer confirmed `publishIfAsked` still sits outside the save branch |
| AC7 the duplicated condition is gone | **met** | 2 → **1** |
| AC8 no new type errors | **met** | 0 in the package, 0 in `apps/dev` |
| AC9 no new analyzer findings | **met** | 43 warnings, 0 errors; `sp-lint-delta` `mode=two-run`: nothing introduced |
| AC10 queue path end to end | **met** | rebuilt, then 225 passed / 8 skipped in `apps/dev` — unchanged |
| AC11 constructor takes one object | **met** | 4 positional → **1**; filler sites 1 → **0**; all 13 construction sites converted |

### AC4 — why it failed, and whose error it was

**The file grew: 341 → 374.** That is the opposite of what the criterion asked for, and the
criterion was mine.

Where the lines are now: **38** import lines, **92** module level (the `Run` and `BothLocales`
types, the four reported messages, `emptyBecause`, and three write/seam helpers), **245** the class.
Reaching 260 means moving roughly 110 lines out of the file — which is exactly the file split that
**Placement** forbids in this task. **AC4 and the placement decision contradict each other**, and I
wrote both. The number came from an estimate ("expected: file ~250 lines") made before anything was
counted, and was then set as binding.

A shrink pass was run rather than the number being quietly lowered: `onTheSeam` and `writingTo`
pulled out what the two chain contexts and the two target-locale writes repeat, `asksPermission`
pulled out what the two permission questions share, and the two chain wrappers were flattened. That
took 404 → 374. The remaining gap is structural, not slack.

**What the change actually bought, stated honestly, since the identifier counts barely moved**
(`payload` 27 → 29, `collection` 20 → 21 — the values left the *signatures* and reappeared as
`run.payload`, `run.target.collection` in the bodies):

| | before | after |
|---|---|---|
| `handle` | 117 lines, two altitudes mixed | **25 lines**, a list of named steps, no Payload call |
| widest signature | 7 parameters | **3** |
| signatures rebuilding the same six values | 3 | **0** |
| constructor | 4 positional, 2 defaulted | **1 object** |

The owner's complaint was that he could not run his eye down the file. That is fixed. The file being
shorter was a second thing he asked for, and it is not.

## Review log

### 2026-10-25 · comment audit (fresh eyes, 9 blocks, 9 verdicts)

Volume was under budget (0.16 inline lines per 10 code lines). The finding was composition, not
density, and **two of the nine blocks asserted things that are false**:

1. `beginRun`'s docblock said "Everything the run is fixed on before it reads anything." It reads:
   `rebuildRequester` → `findRequester` → `payload.findByID`. Worse, it contradicted a second note
   two lines below in the same method, which said a read happens. Deleted.
2. The ordering note blamed `resolveTargetLayer` for throwing on an unknown collection. That
   function contains no `throw`; what throws is the unguarded index in its *argument*. The auditor
   also showed the restructure had **converted a structural ordering into a commented one** — HEAD
   had two statements, and the rewrite had folded them into one object literal whose property order
   became load-bearing. Both statements restored; both comment lines deleted.

Two more became code rather than prose, which is what the owner's rule asks for:

- `onTheSeam` → `moduleSeam`, annotated `Pick<BeforeTranslation, "payload" | "target" | "scope">`,
  so the claim "both chain contexts open with these three" is checked by the compiler instead of
  asserted in a sentence. Comment deleted.
- `asksPermission` → `permissionQuery`, annotated
  `Omit<PermissionQuery, "data"> & { user: RebuiltRequester | null }` (`PermissionQuery` was already
  declared in `translationPermission.ts` and is now exported). The old name read as "performs the
  check" when it builds arguments; the sentence existed to correct that. Comment deleted.

Four were true but derivable and were deleted: the `BothLocales` docblock (the field names say it),
`writingTo`'s (its own name says it), `readBothLocales`'s (every clause is in the five lines below
it — `Promise.all` and two `SourceUnreadable` throws), and the publish-placement note. That last one
matters: the placement is pinned by a **named** test — `handler.test.ts`, "publishes the target
locale even when there was nothing to translate" — so a reader who moves the call into the branch
gets that test red by name. The guard is structural; the note was an argument aimed at this diff's
reviewer.

`Run`'s docblock was shortened to the one fact that is not derivable, with its citation.

Net: **9 added comment blocks → 4**, two of which were false.

### 2026-10-25 · phase 5 verification

**One reviewer, low risk, aimed at falsifying "no behaviour change".** It found none, and checked
each merge field by field: `writingTo` against both original `payload.update` calls (identical, and
`layer.write` carries only `autosave`/`draft` so spread order cannot collide); `asksPermission`
against both permission calls (identical, with `user` overridden by the narrowed non-null value in
`refuseUnlessWriteAllowed`); publication still outside the save branch; `translateOrWrap`'s rebuilt
argument object field for field.

**One finding, fixed here.** `beginRun` evaluated `await rebuildRequester(...)` before
`resolveTargetLayer(...)`, reversing HEAD's order. The reviewer rated it negligible — both are a
read and a pure call, and the only visible difference is which error wins on a collection Payload
does not know. It was reversed back anyway, so that "no behaviour change" is exact rather than
nearly exact, and the ordering now carries a one-line why.

**Mechanical gates.** `sp-lint-delta` `mode=two-run`: nothing introduced. `sp-diff-checks`: three
test-integrity rows, **none from this task** — two are from earlier passes on this branch and one
from the fingerprint task earlier today.

**Regression sweep.** All 13 construction sites converted and verified by grep; no positional call
survives anywhere in `src/` or `apps/`. The four names this change removed
(`refuseUnlessAllowed`, `publishTargetLocale`, `NOTHING_CAME_BACK`, `sentNothingBecause`) have zero
occurrences left. `ModuleState` was added to `translation-run`'s barrel because `handler.ts` is now
a consumer outside that module, which is what the package's barrel rule requires.
`TranslateDocumentDeps` was left unexported: nothing outside the file names it.
