# Provenance becomes an ordinary tenant

**Status:** in progress · **Risk:** high · **Issue:** #198 · **Step 4 of** `2026-10-18-the-rewiring.md`

## Requirements / Task restatement

`translate-document/handler.ts:112-151` knows provenance by name. It resolves the service, builds
its key, captures fingerprints, computes the drift map and writes the receipt, with four
`provenance?.` guards for the case where provenance is off. Nothing else can join a translation run:
a glossary that must read from the CMS before the request, or an audit entry after the save, has
nowhere to go without editing that handler again. Issue #109 is a consumer who hit exactly this and
wrapped the whole provider to get an `await`.

This step replaces those lines with **two positions any module can occupy**, and makes provenance
the first tenant with no privileges (D6). It also dissolves `levels` into `modules` + `components`,
the config-time half of the same move (D7, D12, D13).

It is a stopping point: nothing is exported, and the seam opens to hosts at step 9 (#202). Every
later step waits on it — #199, #48, #200, #201.

## What already exists — platform · installed · project · verdict

Nothing is invented. Every piece has a precedent in this package:

| Need | What already does it |
|---|---|
| a config-time contribution | `ConfigModifier` (`types/ConfigModifier.ts`), whose docblock already describes the `configure(ctx) → ConfigModifier` arrangement both `ProvenanceModule` and `AutoTranslateModule` implement |
| one sink that writes into the Payload config | `PluginConfigBuilder.applyTo` |
| swallow a module failure, but not one that took the caller's transaction | `swallowOrThrow` (`server/shared/payload/swallowOrThrow.ts`) |
| read the attempt count defensively | `isLastAttempt.ts:10` already reads `totalTried` |
| the two staleness endpoints as separable units | `createGetDocumentStalenessRoute` / `createDismissStalenessRoute` — standalone factories; nothing else in `createTranslationRoutes.ts:45-59` reads them |

## Decisions

Adopted from `2026-10-18-the-rewiring.md`: D1, D3–D10, D12–D14, D22. Settled in conversation and
recorded here because they depart from, or narrow, that plan.

**D-a — two positions, not three.** D2 names three: before the translation, after it but before the
save, after the save. The middle has no tenant at this step and none at step 5 either.
*Rejected:* building it anyway for symmetry — a position with no caller is a field, not a type, and
step 9 is where its first tenant arrives.

**D-b — no stored run-kind field here.** D21 assembles the built-in chain per trigger, which needs
the trigger to survive the queue as a stored field. At this step nothing turns on it: whether drift
shortens the field list is still decided by `strategy`, and `SkipExisting.strategy.ts:11` is the
only reader of the drift map. Both provenance modules are in every chain, and behaviour is
unchanged.
*Rejected:* adding the field now. It would be a second edit to the stored job schema — step 5 adds
`targets: [{ lng, selection? }]` and the run kind together.
*When it lands it names the kind of run, not who started it.* `TranslationStatusList.tsx:71-81` is a
person pressing a button and asking for the drift-only kind, so a field naming the caller would
break that button.

**D-c — one provenance module with two positions, not a recorder and a shortener.** *Reversed
during Phase 3, in the open.* The split was recorded first, citing step 5 as its consumer. On
contact with the code it lost: the shortening half needs the fingerprints the recording half
computes, so two chain entries would read each other's note under a foreign key and the document
would be hashed twice. One module captures once at position one, uses it for the drift map there,
and writes it at position three — which is what the hard-wired code already did.
*Rejected:* two entries now. Step 5 splits them where the choice between them is actually made, and
that is a local change inside `server/modules/provenance/`.
*Why the note cannot be dropped instead:* `handler.test.ts:481` pins that the receipt describes the
source the handler **read**, not whatever the pipeline handed back. Re-hashing after the save would
reverse that guard.

**D-d — the components option is named `components`.** Payload already says `admin.components`.
*Rejected:* a second word (`surfaces`, `controls`) — new vocabulary for a thing the host already
knows by that name.

**D-e — abilities are not threaded into module setup.** D23's `{ inspect, cancel, rerun, staleness }`
goes to the browser only. No module reads it, and adding the field later is additive.

**D-f — a module is told which attempt this is**, as `previousAttempts`, zero on the first run.
D11 recorded "a rule, not a flag"; the owner overruled that — the count is information a module may
use, and D11's rule (modules must survive a replay) still binds. The count already exists at
`payload-jobs-runner/store/types.ts:16`.

**D-g — a module's failure is left to `swallowOrThrow`, unadopted.** *Written one way, then
reversed on evidence. Both halves recorded, because the first was wrong in a way worth remembering.*

The original decision was that a module's bug must not cost an editor their save, so the chain
adopted any unrecognised failure as a harmless `ModuleFailed` — the same fork `translateOrWrap`
(`handler.ts:196-205`) makes for the translation provider.

**That was unsound, and a probe proved it.** The provider is given no `Payload` handle; a module is.
`ProvenanceService.record` already calls `swallowOrThrow` itself and *deliberately rethrows* when
the caller has work to lose — and the chain's adoption caught that rethrow and demoted it, so the
run reported success over a write the database had already rolled back. That is F2 in the rewiring
plan, arriving through the door built to prevent it.

*Chosen:* the chain passes the failure to `swallowOrThrow` unchanged. `mustPropagate`'s own rule
holds — "a foreign error may already have rolled the caller's transaction back, so assume it did" —
which is also what D10's exception says in words. `ModuleFailed` is deleted.
*The cost, accepted:* a module's own bug inside an editor's save does end that save. That is exactly
what provenance does today, so nothing regresses; what this step adds is that a host module gets the
same treatment rather than a weaker one.
*Pinned by:* "does not demote a failure a module raised deliberately"
(`translation-run/__tests__/moduleFailure.test.ts`).

**D-h — an address a per-leaf receipt does not name means "translate"; a document with no per-leaf
receipt at all still answers for nothing.** *Narrowed during Phase 3, with the owner, on measured
evidence.*

The rule as first written made no distinction, and that is right for the world after step 5. Applied
now it collapses `skip_existing` into `overwrite` for every document the plugin has not yet
recorded: **ten integration checks failed, including `strategies.int.test.ts:56`, which is the
strategy's own definition.** Narrowed, the same suite fails nothing and the case this task exists
for still passes.
*The deciding argument:* `2026-10-22-the-receipt-stops-guessing.task.md` accepted that a person's
text is overwritten **"once its source moves"**. With no receipt the source has not moved, so the
wider rule is a different trade from the one that was approved — and the editor's replacement for
the lost protection is the field picker in #48, which ships at step 5.
*Rejected:* keeping absence as *cannot tell* in both cases. A field whose source was emptied and
later refilled would then never be re-translated, because a run records the source as it stood and
an empty leaf is absent from it.

### Placement

| Piece | Lands in | Why there |
|---|---|---|
| the two state types, the chain's narrow member slice, the chain runner | `src/server/modules/translation-run/` (new) | it is server-side run-time wiring; `server/modules/` is where the other two modules already live |
| the two loops | `translate-document/handler.ts` | replacing the four blocks in place |
| the provenance module | `src/server/modules/provenance/Provenance.module.ts` | the module already owns its config-time wiring |
| the drift rule | `src/core/domain/provenance/staleness.ts` | `changedLeaves` is already there and `recordsEachLeaf` is reused |
| the two staleness routes | `src/server/modules/provenance/` | D8 — a module contributes its own endpoints |
| module and component factories | `src/composition/modules/`, `src/composition/components/` | replaces `src/composition/levels/` |
| `ModuleContext`, `ComponentContext`, `TranslationModule` | `src/server/modules/plugin-config/types.ts` (was `translation-levels/`) | `TranslationContext` loses `provenanceServiceFactory`, which existed only for the staleness routes — that is what removes the import cycle a unified module type would otherwise create |
| `previousAttempts` | `TaskHandlerInput` (`TaskRunnerProvider.interface.ts:10`) | the existing channel from runner to handler |

### New surface — the shape check

Fired: a new field on `TaskHandlerInput` (implemented outside this package by any custom runner);
two new state types.

**`BeforeTranslation` and `AfterSave` are separate types, not one with an extension.** By the save,
`schema`, `sourceData`, `targetData`, `requester` and the drift map are all spent — `AfterSave`
carrying them would be a type whose readers ignore most of its fields. Counted: `AfterSave` has 7
fields, all read by the recorder; an extension would have 13, of which 6 are dead.
*The second caller for both types is already in the codebase* — the recorder and the shortener.

**`previousAttempts` is a required `number`, not optional.** Optional would admit "no runner told
us", a state nothing produces: the sync runner answers 0 and the queue runner reads `totalTried`,
defaulting to 0. States admitted 1, states produced 1.
*Breaking for an implementor outside this repo:* a custom `TaskRunnerProvider` must now supply it.
Acceptable on the major line; it gets a `DEPRECATIONS.md` entry alongside the `levels` removal.

### Written contract

`swallowOrThrow`'s behaviour on a position-one failure is not in its signature: it returns
`undefined`, and the chain must then keep the state it had rather than adopt `undefined`. Stated in
the chain runner's docblock and pinned by AC5.

### Escalate to `/sp-architect`?

No. The design is `2026-10-18-the-rewiring.md`, which is the architecture document; this is one of
its build steps.

## Acceptance Criteria

| AC | Criterion | How it is checked | Passes when |
|---|---|---|---|
| AC1 | Staleness reports the same answers it does today | `bunx vitest run src/core/domain/provenance src/server/modules/provenance` | green, with the `changedLeaves` expectations rewritten per AC4 and no other assertion touched |
| AC2 | A field whose source drifted is refreshed while an untouched sibling is left alone | `bun run test:integration -- staleness-refresh` from `apps/dev` | `:64`, `:85`, `:137`, `:173`, `:227` unchanged and green |
| AC3 | The drift map and the receipt are the same values the hard-wired code produced | `bunx vitest run src/server/features/translate-document` | green with no assertion weakened |
| AC4 | **New** — a field whose source was emptied and later refilled is re-translated | new case in `apps/dev/src/integration/translator/staleness-refresh.int.test.ts` | the refilled field is translated, not left alone |
| AC5 | A module's failure is logged, and one that may have taken the caller's transaction is let out rather than reported as success | `handler.moduleFailure.test.ts` + `translation-run/__tests__/moduleFailure.test.ts`; `transaction-rollback.int.test.ts` stays green | inside a transaction it propagates; outside one it is swallowed, the translation is written, and the chain carries on with the state the module was given |
| AC6 | A module sees `previousAttempts: 0` on a first run and `1` on the first retry | new case under `src/server/modules/task-runner/payload-jobs-runner/__tests__/` | both values observed |
| AC7 | Provenance contributes its own two staleness endpoints, and the admin still works without them | `bunx vitest run src/server/features/createTranslationRoutes.test.ts src/__tests__/plugin.test.ts` | the bundle returns 6 endpoints; the two staleness paths appear only with provenance on, and `useDocumentStaleness` reads their absence as "nothing is out of date" |
| AC8 | A config with neither `modules` nor `components` fails at boot naming the replacement | new case beside `src/plugin.test.ts` if one exists, else a new `plugin.modules.test.ts` | the thrown message names `modules` and `components` |
| AC9 | Nothing else moves | `bunx vitest run` · `bun run check-types` · `bunx oxlint .` · `bun run test:integration` from `apps/dev` · `bunx turbo run build --filter='./packages/payload-plugin-translator'` | suite green, 0 type errors, 0 lint errors and ≤44 warnings, 63 integration files green, build green |

## Pre-flight — each check run against the untouched tree

| AC | Result on the base | Classification |
|---|---|---|
| AC1 | passing — but four `changedLeaves` checks assert the behaviour AC4 reverses | **mixed**: invariant except the four named below |
| AC2 | passing | **invariant** |
| AC3 | passing | **invariant** |
| AC4 | no such case | **change** — fails now |
| AC5 | no seam exists | **change** |
| AC6 | no such field | **change** |
| AC7 | the two routes are in the shared bundle | **change** |
| AC8 | `levels` defaults silently to two surfaces (`plugin.ts:140`) | **change** |
| AC9 | 180 files / 2405 checks green; baseline for types/lint/build carried from the previous task | **invariant** |

### What the absent-address rule inverts — named, so Phase 5 cannot gloss it

Four recorded expectations reverse, all in `staleness.test.ts`. Each is rewritten with its reason,
not deleted.

| Where | Title today | After |
|---|---|---|
| `staleness.test.ts:144` | "says nothing at all about a leaf the receipt never recorded" | answers `true` |
| `staleness.test.ts:167` | "answers only for the leaves it can answer for" | answers for every leaf the source has now |
| `staleness.test.ts:141` | "says a leaf changed when it is recorded but absent from the document now" | no entry — the map answers about the document as it stands |
| `handler.test.ts:614` | "hands the pipeline the leaves the receipt can answer for, and no others" | every leaf the source has now, an unrecorded one marked changed |

**Measured, not assumed.** The wider form of D-h — treating "no receipt at all" the same way —
failed ten integration checks across four files, among them `strategies.int.test.ts:56`
("skip_existing keeps a filled target but fills an empty sibling"), which is the strategy's own
definition. The narrowed rule fails none and still satisfies AC4. Both runs are in the Phase 5
evidence.

## Risk notes

**High.** The change moves the provenance write path, changes a public config option, and reverses a
documented protection.

- **A field the receipt was keeping and no longer names is re-translated**, including a target a
  person filled, and without the source having moved in the usual sense. That is D-h's point and the
  task's reason; it is bounded to documents the plugin has already recorded leaf by leaf.
- **`levels` is removed outright**, breaking every host that set it or relied on its default. All 63
  integration suites boot through `bootTestPayload.ts:160`, so a mistake there is invisible until
  the whole integration run is red.
- **The chain runs inside the editor's transaction** on the sync runner. D-g's wrapping is what
  keeps a module's failure from becoming a lost save; AC5 is the only thing proving it.
- `swallowOrThrow` returning `undefined` is easy to adopt into the state by accident, which would
  silently blank the run's fingerprints. Pinned by AC5.

## Human choices

- **One pass, not two.** The run-time seam and the `levels` → `modules` rename ship together.
  *Rejected:* splitting at the config boundary — the owner chose the single pass knowing it touches
  the boot path of all 63 integration suites.
- **The middle position is not built.** The owner's words: if nothing needs it, there is no reason
  to occupy it, and no interface requires a placeholder.
- **The run-kind field is deferred to step 5.** Proposed, then withdrawn after checking that
  `strategy` still decides this at step 4; the owner accepted the withdrawal.
- **The absent-address rule is narrowed to a receipt that exists.** Raised mid-build with both
  variants measured against the integration suite. The owner's words: *"Ты предлагаешь уважать
  стратегию пока она есть?"* — yes. While `skip_existing` exists, its promise is kept; the wider
  rule lands at step 5, where the strategy is deleted and #48 gives the editor the replacement.

## Open, not solved here

- A run that overwrites a person's text still says nothing about it (D21's second half) — #48.
- The field-level route writes no receipt at all.
- A run that answered nothing still writes a fresh `translatedAt`.
- The position after the translation and before the save — step 9, with its first tenant.
- **Step 5 must decide what "no per-leaf receipt at all" means, explicitly.** Removing the strategy
  does not settle it by itself — it makes it worse. Today `SkipExistingStrategy` reads an absent
  answer as *leave it alone*, and that is what protects a filled target. Once the pipeline takes a
  ready list of addresses instead, that list comes from `changedLeaves`, which answers for nothing
  here — so a first automatic run on an unrecorded document would translate **zero** fields rather
  than all of them. The answer there is D-h's wider form, which belongs with #48's field picker.

## Review log

### Comment audit over the whole change

59 blocks collected · 58 verdicts · 1 declined as scheduled for deletion at step S1. Applied:
16 deletions, 27 shortenings, 6 code rewrites, 9 kept with a named reason, 2 gaps closed.

**Nine false statements it caught in comments written during this build**, each checked against the
code rather than read:

| Where | Claimed | True |
|---|---|---|
| `plugin.ts` `components` | "controls are not deduplicated, so a duplicate renders twice" | `PluginConfigBuilder` collapses them by `componentKey`; pinned by its own test. Carried over from the old `levels` docblock, where it was already untrue |
| `runChain.ts` | an `APIError` is "the one failure" that escapes | a `TranslatorError` declaring `mustPropagate` escapes too, and a test pins it |
| `staleness.ts` `changedLeaves` | "a receipt that names no leaf at all answers for none" | false for a `fields` receipt holding an empty map — `recordsEachLeaf` accepts it |
| `TranslationRun.interface.ts` `AfterSave` | "carries no document" | it carried `sourceData`, the source document |
| `plugin-config/types.ts` | the list of types deriving from `TranslationContext` | wrong in two directions, and "every handler reads it" is false |
| `plugin-config/types.ts` `TranslationModule` | "not externally implementable" | `setup` is optional, so a host can satisfy it today |
| `Provenance.wiring.ts` | provenance is "a module the plugin lists like any other" and this is "the one place its wiring lives" | it is pinned ahead of every listed module, and its routes live in `Provenance.module.ts` |
| `ModuleNotes` | "the queue takes up to fifty jobs per pass" | 50 is `defaultAutoRun.limit`, which a host overrides; concurrency is the real reason |
| `ConfigModifier.ts` | the `types/` placement prevents a module cycle | that cycle went when `provenanceServiceFactory` left `TranslationContext` |

**One defect in the code, not the prose:** inserting `NEVER_RETRIED` above `SyncTaskRunner` stranded
the class's docblock on the constant, leaving the class undocumented and the constant with two.

**Three dead things removed, each found by asking who reads it:** `AfterSave.sourceData` (no
reader), `ResolvedProvenance.serviceFactory` (no reader — `configureProvenance` now returns the
module itself), and a `Record<string, Record<string, …>>` that became the named `TaskStatusByLocale`.

**One owner rule broken and repaired:** `state.notes[PROVENANCE_MODULE] as FieldFingerprints` was a
type assertion to quiet the checker. It is now the type predicate `isFingerprints`, the same idiom
as `recordsEachLeaf`.

**Declined:** the `sourceChangedByLeaf` docblock — step S1 deletes the field with the strategies.

### Complexity audit of `staleness.ts`, and what the owner saw in it

Two changes, the second worth more than the first.

**`leafChanged` dissolved into its two call sites.** It wrapped one comparison, and its signature
admitted a pair — both arguments absent — that neither caller can produce. Applied at the owner's
request; by this skill's own balance rule it is not a complexity finding, because nothing left the
system: CHANGE 0 → 0, READ unchanged. What did change is that one impossible state stopped being
expressible, and the file dropped two type imports it kept alive for that signature alone.

**`changedLeaves` stopped taking the whole stored vocabulary.** The owner's observation: the
function works only with a per-leaf map, yet took `SourceFingerprint | null` and narrowed inside, so
two of the three forms it accepted answered with an empty map. It now takes `RecordedFingerprints`,
and `Provenance.module.ts` narrows with `recordsEachLeaf` before calling it.

*Proof that the guard is now structural rather than a convention:* deleting it from the caller gives
two type errors at the call site — `'previous' is possibly 'null'` and `Property 'hashes' does not
exist on type 'SourceFingerprint'`. Before, the same mistake compiled and returned `{}`.

*A second state went with it.* `sourceChangedByLeaf` could be `undefined` or `{}`, indistinguishable
to its one consumer. The caller now simply omits the field, so there is one way to say it.

*Where the decision moved.* "A receipt that cannot answer per leaf tells the pipeline nothing" is a
policy, not a comparison, and it now lives with the module that owns provenance policy — pinned by
`server/modules/provenance/__tests__/Provenance.module.test.ts`, five checks, which the module did
not have before.

*Why neither audit caught it.* The abstraction audit's honesty measure is exactly the right
instrument (3 forms admitted, 1 used), but the brief that scoped it was written by the author of the
code and described this boundary by its return value. That is the failure its own Step 0 warns
about. The complexity audit cannot see it at all: its counters price a future change, not a
signature that over-claims.

### Fresh-eyes review of the whole change

Three findings, one of them the serious kind.

**Confirmed and fixed — the chain demoted a failure a module raised on purpose.** See D-g. Proved
with a throwaway probe: a module using `swallowOrThrow` itself, exactly as `ProvenanceService.record`
does, rethrows when the caller has work to lose — and the chain's `ModuleFailed` wrapper caught that
rethrow and reported success. The probe failed before the fix and passes after; it is now a standing
check rather than scaffolding.

**Checked and declined — the fingerprint note is written only after the receipt read succeeds.**
Unreachable: `lastTranslatedFrom` swallows and answers `null` outside a transaction, and inside one
a failure now ends the run, so there is no path where the note is lost while the run continues.

**Checked and declined — the chain judges a failure against the run's own `scope`, not one a module
returned.** Deliberate, and documented at the call site.

The reviewer also walked the four shapes a stored fingerprint can take, the `previousAttempts` key
path, and what config-time work moved, and found each sound.

**Fixed, not carried:** `useDocumentStaleness` requests the staleness route on every document mount,
and that route now exists only while provenance is on — so with it off the admin would have shown an
error where it used to show nothing. The hook reads a 404 as "no locale is out of date", which is
true however the plugin is configured and needs no flag in the browser. Telling the browser what the
plugin can do is D20's ability set, which this step deliberately does not build.

*Found by following the audit's note into `apps/cms`, which configures the plugin with provenance
off.* The same read also caught that `apps/cms` relied on the removed `levels` default and would not
have booted; it is migrated in this change.
