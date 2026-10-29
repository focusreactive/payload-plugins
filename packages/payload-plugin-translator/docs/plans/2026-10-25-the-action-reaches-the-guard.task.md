Build step: 2026-10-25-asking-payload-everywhere.design.md #4

## Task restatement

The published `AccessGuard` is asked one question today — "is this a trusted caller" — with no idea
what the caller is about to do. This step gives the question an **action**, and hardens how the
answer is read.

Three changes, one seam:

- **`TranslatorAction`** — a closed, published union of the nine route actions, in `src/types/`.
- **`withAccessCheck(handler, access, action)`** — the action reaches the guard's argument, which
  becomes `check({ req, action })`.
- **The answer is read strictly**: only the literal `true` allows, and a guard that throws is a
  refusal rather than a crash.

Covers **R1** (the question carries actor + action + target), **R4** (a new action is one change) and
**R6** (what becomes of `AccessGuard`, and how a host migrates).

Out of scope, by the design's own sequence: the record question at enqueue (#5), jobs resolving to
documents (#6), the brand at the queue sink (#7), the three-valued identity (#8), the module seam (#9),
the pins and `@since` sweep (#10).

## Measured, not assumed

| Claim in the design | Measured today |
|---|---|
| nine routes | **nine** `withAccessCheck(...)` call sites across eight route files (`staleness/route.ts` builds two) |
| two widgets | **two** direct `access.check(...)` calls, both in `.server.tsx` widget components |
| ~thirteen test files | **ten** test files construct or assert the guard; **three** assertions pin the exact argument `{ req }`, all in `withAccessCheck.test.ts` |
| three sites in `apps/` | **three**: `apps/cms/.../plugins/index.ts:351`, `apps/dev/src/payload.config.ts:101`, `apps/dev/.../bootTestPayload.ts:158` |
| `if (!hasAccess)` accepts any truthy value | **confirmed by probe**: a guard answering `"yes"` returns **200** today |
| a throwing guard yields a 500 | **worse than stated**: the rejection **escapes `withAccessCheck` entirely**, because `withAccessCheck` wraps `withErrorHandler` on the *outside*. Probe returned `{"kind":"escaped"}` |

## What already exists — platform · installed · project · verdict

| Rung | Found | Verdict |
|---|---|---|
| platform | Payload's `Operation = 'create'\|'delete'\|'read'\|'update'` | **not this vocabulary.** "cancel someone else's bulk job" and "dismiss a staleness marker" have no CRUD equivalent, and the guard is not a Payload access function |
| platform | Payload's `docAccessOperation` | answers the *record* question, which D1 keeps separate from the coarse one. Already used by `mayWrite` |
| project | `AccessGuard` / `AccessGuardRequest` (`src/types/AccessGuard.ts`) | **kept and extended**, per D3 |
| project | `AnyAccessGuard` | unchanged — it ignores its argument |
| project | `TargetSelectionMode = "single" \| "multi"` | the naming idiom for a published union here: lowercase, unnamespaced, kebab for multi-word |
| project | `accessIsNotOptional.pins.ts` | the existing compile-time pin for "no route without a guard" — the place a "no route without an action" pin belongs |
| project | client → server imports already exist (both widget `.export` files import `AnyAccessGuard` from `server/shared`) | a shared asker in `server/shared/access/` **is** reachable from the widgets |

Nothing new is installed.

## Decisions

### D1 — the nine literals, and their names

**Chosen:** `"enqueue" | "run" | "cancel" | "cancel-by-collection" | "document-status" |
"collection-status" | "document-staleness" | "dismiss-staleness" | "translate-field"`, in
`src/types/TranslatorAction.ts`, re-exported from `src/index.ts`.

Named for **what the caller is asking to do**, not for the HTTP route that carries it, so the union
survives a route being renamed or moved. Kebab-case and unnamespaced, matching `TargetSelectionMode`.

**Rejected — namespaced pairs (`"translation:enqueue"`).** No second namespace exists or is planned,
so the prefix is a constant repeated nine times. The package has no precedent for it.

**Constraint cited:** D8 fixes the union at the nine route actions and makes it plugin-owned and
closed; the naming idiom is `src/types/TargetSelection.ts`.

### D2 — where the strict reading lives  *(settled at the gate)*

The answer must be read strictly in **three** places, not one: `withAccessCheck` and both widgets,
which today each write their own `if (!hasAccess)` with no `catch`.

**Chosen — one shared asker**, `askTheGuard(access, req, action): Promise<boolean>` in
`server/shared/access/`, holding the strict `=== true` and the throw-is-refusal rule once. Three
callers already in the codebase, so **ST1** is satisfied without a hypothetical.

**Rejected — put the rule only in `withAccessCheck`.** The two widgets would keep a truthy check and
an uncaught throw, so a host whose guard misbehaves is refused on the HTTP route and crashes the admin
page render. Two readings of one answer is the drift this step exists to remove.

**Constraint cited:** the probe above — the current widget code is `if (!hasAccess) return null` with
no `catch`, measured at `TranslateDocument.server.tsx:19` and `BulkTranslationDashboard.server.tsx:18`.

### D3 — what the two widgets pass  *(settled at the gate)*

**Chosen — both pass `"enqueue"`**: it is the action each widget's primary control performs, so a
host that hides enqueueing from a user also stops rendering the control that offers it.

**Rejected — give the widgets their own two literals.** D8 fixes the union at the *nine route
actions*; a widget is not a route, and two UI-only members would make the union mean two things.

**Rejected — the dashboard passes `"collection-status"`.** It reads status first, but it exists to
start bulk translations; gating the whole widget on the read would leave it visible to someone who may
never use it.

### D4 — the dead second copy of `AccessGuard`  *(settled at the gate)*

`src/client/shared/types/AccessGuard.ts` declares `AccessGuard` and `AccessGuardRequest` a second
time. **Measured: zero importers** — all four widget files import the root `src/types/AccessGuard.js`.

**Chosen — delete it in this step.** It is a second declaration of the exact type this step
changes; left alone it silently loses the `action` property and the next reader cannot tell which is
authoritative.

**Rejected — leave it and change both.** Keeping two declarations in sync by hand is the defect, not
the fix.

**Rejected — leave it untouched.** It would then differ from the real type, which is worse than today.

### D5 — the shape of the guard's argument (shape check)

Triggers that fired: an exported function gains a parameter (`withAccessCheck`); a field is added to a
type that is **published and implemented outside this package** (`AccessGuard.check`'s argument).

| | `check({ req, action })` *(chosen)* | `check(req, action)` |
|---|---|---|
| cost of the next field of this kind | 0 edits at any call site that destructures | every call site and every implementer |
| states admitted vs produced | 9 admitted, 9 produced — gap **0** | same |
| second caller already in the repo | `withAccessCheck` + two widgets | same |
| breaks outside this repo | only a host that **constructs** the argument; implementers destructuring `{ req }` are unaffected | every implementer's signature |

**Chosen:** the first — which is what D3 of the design already decided. The shape check confirms the
ADR rather than re-opening it. `action` is **required**, not optional: an optional action would admit
a tenth state ("asked about nothing") that the system never produces.

### D6 — a throw is a refusal, and nothing is logged away silently

Adopted from the design's **D7** without re-litigation: fail closed on throw, strict `true`, **no
timeout**. The refusal is a `403`, and the original error is surfaced through the existing
`console.error` channel so a host can still find a broken guard.

### D7 — a framework navigation signal is not an answer *(added in Phase 5, after review)*

**Found in review, and it was a regression this step introduced.** Before this change neither widget
caught anything, so a guard calling Next's `redirect()` or `notFound()` propagated and the navigation
happened. `askTheGuard`'s blanket catch swallowed it: the widget vanished and a line went to the log.

**Chosen:** rethrow an error carrying a `digest`. Verified against the installed Next 16.3.6 —
`redirect-error.d.ts` and `http-access-fallback.d.ts` both mark their errors with a `digest` string,
and `unstable_rethrow` keys on the same class.

**Rejected — import `unstable_rethrow` from `next/navigation`.** `src/server/` imports nothing from
Next today (measured: zero matches), and `next` is not even a declared dependency of this package. A
property check needs no import and keeps that true.

**Rejected — rethrow at the two widget call sites instead.** It would put the rule back in three
places, which is what D2 was decided to avoid.

**Why this is safe on the HTTP path too:** a rethrow there escapes `withAccessCheck` — but that is
exactly what *every* guard throw did before this step (measured in the pre-flight: `{"kind":"escaped"}`).
So the narrow class is no worse than the baseline, and the broad class is now caught where it was not.

### D8 — the asker is not generic *(corrected in Phase 5, after review)*

The first implementation declared `askTheGuard<R extends AccessGuardRequest>(…)`, justified as
"so the host's guard still sees the caller's own request type". **That justification was wrong**, and
a probe proved it: `AccessGuard.check` is itself generic over `R`, so inside a host's `check` the
request is `R` constrained to `AccessGuardRequest` and nothing more — `({ req }) => req.searchParams`
fails to compile both before and after this change. The generic bought nothing a host could see, so
it is gone: `req: AccessGuardRequest`, which every call site satisfies.

## Acceptance Criteria

| # | Covers | Criterion | How it is checked (binding) |
|---|---|---|---|
| AC1 | R4 | `TranslatorAction` is a closed union of exactly the nine literals in D1, declared in `src/types/TranslatorAction.ts` and re-exported from `src/index.ts` | a type test using `expectTypeOf` that a tenth literal is **not** assignable, plus `grep` on `src/index.ts` |
| AC2 | R4 | `withAccessCheck(handler, access)` — two arguments — no longer compiles | a new `@ts-expect-error` line in `accessIsNotOptional.pins.ts`; `bun run check-types` is the check |
| AC3 | R1 | Each of the nine routes passes its own literal, and the guard receives it | one assertion per route in that route's existing `route.test.ts`, asserting `check` was called with `{ req, action: "<its literal>" }` |
| AC4 | R1 | A guard answering a truthy non-`true` value is refused with `403` and the handler does not run | unit test in `withAccessCheck.test.ts`; **mutation-proven** by restoring the truthy check |
| AC5 | R6 | A guard that throws is refused with `403`; the rejection does not escape and is not a 500 | unit test in `withAccessCheck.test.ts`; **mutation-proven** by removing the `catch` |
| AC6 | R1 | Both widgets pass their literal, render nothing when refused, and render nothing when the guard throws | unit tests on the two `.server.tsx` components |
| AC7 | R6 | A host guard written as `({ req }) => boolean` still compiles untouched | the three `apps/` sites type-check unchanged; `bunx turbo run build` across the workspace |
| AC8 | R6 | `src/client/shared/types/AccessGuard.ts` is gone and nothing imports it | `grep` returns nothing; `check-types` and the build stay at 0 |
| AC9 | R6 | The baseline holds: real `turbo build` green, integration **225 passed / 8 skipped** | run both; any moved count explained in the report |

## Pre-flight — each check run against the CURRENT, untouched tree

| # | Polarity | Result now | Evidence |
|---|---|---|---|
| AC1 | must FAIL | **fails** | `grep -rn TranslatorAction src/ ../../apps` → no matches |
| AC2 | must FAIL | **fails** | `withAccessCheck(handler, guard)` is the *positive control* in `accessIsNotOptional.pins.ts` today |
| AC3 | must FAIL | **fails** | no route passes a third argument; `grep "withAccessCheck("` shows nine two-argument calls |
| AC4 | must FAIL | **fails** | probe: a guard answering `"yes"` returned **200** |
| AC5 | must FAIL | **fails** | probe: the rejection **escaped** — `{"kind":"escaped","message":"guard exploded"}` |
| AC6 | must FAIL | **fails** | neither widget passes an action; neither catches |
| AC7 | must PASS | **passes** | the three `apps/` sites build green today |
| AC8 | must FAIL | **fails** | the file exists |
| AC9 | must PASS | **passes** | 193 files / 2502 checks, build green, 225/8 |

## Risk notes

**High risk, and it binds.** This changes a **published, required** interface (`AccessGuard`, required
since 0.14.0) and the single chokepoint every HTTP route passes through.

- **The accepted break (D3):** a host that *constructs* the guard's argument itself must add `action`.
  A host that merely *implements* `check({ req })` is unaffected — all three `apps/` sites are of the
  second kind, which is the evidence that the common case is safe.
- **The behaviour change hosts will notice:** a guard that throws now answers `403` instead of
  crashing the request. Strictly safer, and it needs a release note — which belongs to step #10, so
  this step records the obligation rather than writing the note.
- **A guard returning a non-boolean today silently allows.** After this step it silently refuses. That
  is the intended direction, but it can turn a working host deployment into a 403, so it must be in
  the same release note.
- **Three review angles are required** in Phase 5b, and a test is required before done.
- **The regression sweep is mandatory and evidenced**: it must name what was grepped and how many call
  sites were read.

## Human choices

**2026-10-25, at the gate.** All three questions were put with a recommendation, and all three
recommendations were taken.

1. **One shared asker** (D2). `askTheGuard(access, req, action)` holds the strict `=== true` and the
   throw-is-refusal rule once, for the route wrapper and both widgets. The alternative — strictness in
   `withAccessCheck` only — was declined because it would leave a misbehaving host guard refused on
   the HTTP route and *crashing the admin page render*, which is two readings of one answer.
2. **Both widgets pass `"enqueue"`** (D3). The two alternatives offered were the dashboard passing
   `"collection-status"` (declined: the widget exists to start translations, so gating it on the read
   leaves it visible to someone who can never use it) and two UI-only union members (declined: it
   breaks D8's "nine route actions" and makes the union mean two things).
3. **Delete the dead copy** `src/client/shared/types/AccessGuard.ts` (D4). Zero importers, measured.
   Keeping two declarations in sync by hand was declined as the defect rather than the fix.

## Review log

**2026-10-25 — comment audit (closing Phase 3).** 10 candidate blocks, 10 verdicts: 4 KEEP (the three
compile-time pins, whose comments *are* the pin names, and the "written out, not derived" note in the
union's type test), 5 REWRITE-COMMENT, 1 DELETE. The three docblocks it cut hardest were the new ones:
`askTheGuard` 9 lines → 2, `TranslatorAction` 10 → 4, `AccessGuard.check` 8 → 3.

Two of its cuts were substantive rather than stylistic:
- `{@link AccessGuard}` in `TranslatorAction.ts` had **no referent** — that file imports nothing, and
  adding a type-only import would have created a cycle, since `AccessGuard.ts` imports it. Replaced
  with backticks.
- The `check` docblock said a refusal means `403`. Since this step that is **incomplete**: the same
  answer now also hides the admin widgets. Both that docblock and the interface's own headline
  ("Gate for the translation API endpoints") were corrected to say so.

It also raised three things outside its own remit, two of which were real and are fixed: `as never`
casts in the new widget fixtures (the owner's rule forbids them — replaced with named
`as unknown as <Props>` casts) and a `console.error` spy restored in the test body rather than in
`afterEach`, so a failing assertion would have leaked it. The third led to D8 below.

**2026-10-25 — Phase 5b, three independent angles**, run because the Risk notes classify this high
risk: it changes a published, required interface.

| Angle | Asked to break | Outcome |
|---|---|---|
| the published contract | every host implementer shape; the generic; strictness; the throw path | additive as claimed; **one unrecorded regression found** (R1) |
| the tests | mock interception, revert-sensitivity, shared spies, compile-time checks | no toothless check; **one real gap** (R2) |
| shape and placement | cycles, barrels, the `client/ → server/` edge, the published surface | no cycle; **barrel surplus found** (R3); the generic disproved (D8) |

### R1 — a framework navigation signal was being swallowed (found, fixed; now D7)

`askTheGuard`'s catch turned **every** throw into a refusal, including Next's `redirect()` and
`notFound()`, which are non-local returns rather than failures. Before this step the widgets caught
nothing, so those propagated and worked. Verified against the installed Next 16.3.6 rather than from
memory: both `redirect-error.d.ts` and `http-access-fallback.d.ts` mark their errors with a `digest`,
and `unstable_rethrow` keys on the same class. Fixed by rethrowing a `digest`-bearing error; one new
check, proven by two mutations in opposite directions (catching the signal reddens only it; rethrowing
everything reddens only the ordinary-throw check).

### R2 — no check proved the allowed path renders anything (found, fixed)

All eight widget checks would have passed on a widget that returned `null` unconditionally: the one
positive case only inspected the guard call. Added "renders something when allowed" for both widgets.

### R3 — the change added four barrel re-exports with no importers (found, fixed)

The package's `CLAUDE.md` makes this mechanical: find the files importing the barrel, collect the
names, subtract. `TranslatorAction` had been added to three barrels and `askTheGuard` to one, and
nothing imported any of them through a barrel — both widgets and `withAccessCheck` import by path.
All four removed. The published re-export from `src/index.ts` stays: a host writing a per-action
policy table needs to name the type, and the alternative is
`Parameters<AccessGuard["check"]>[0]["action"]`.

### Recorded, not fixed here

- **`@since` on `TranslatorAction`** — the package requires it on anything re-exported from
  `src/index.ts`. It depends on the release version, and the design puts the `@since` sweep in step
  #10. Owed there.
- **The release note.** Three host-visible changes need one: a guard returning a truthy non-boolean
  now refuses where it allowed; a guard that throws now refuses where it escaped; and the deep import
  `@focus-reactive/payload-plugin-translator/client/shared/types/AccessGuard`, undocumented but
  resolvable through the `./client/*` export, stops resolving. `README.md`'s "Access control" section
  still says only "Return `false` and the request is rejected" — the README is the owner's, so the
  text is proposed rather than written. Step #10.
- **The union's naming is not uniform** — `enqueue`/`run`/`cancel` are verbs, `document-status`/
  `collection-status`/`document-staleness` are noun phrases, and `dismiss-staleness`/`translate-field`
  are verb-plus-object. A host cannot guess a tenth name from the pattern. The names are settled (D1,
  owner-approved), so this is an observation for a later step, not a defect.

### Verification after every fix

`check-types` 0 · oxlint 43 warnings / 0 errors (baseline) · package suite **196 files / 2523 checks**,
up from 193 / 2502 by exactly +3 files and +21 checks (5 asker + 1 navigation signal + 2 wrapper +
10 widget + 2 type + 1 from the per-source-file throw test, since `askTheGuard.ts` is a new file under
`src/server`) · real `turbo build` green, forced and uncached · integration **225 passed / 8 skipped**,
unchanged · `sp-diff-checks` clean · `sp-lint-delta` introduced nothing.

**Out of scope and not caused here:** `apps/dev`'s own `build` script fails on a `SeoFieldPaths`
mismatch from `packages/payload-plugin-seo` and a vitest config overload. Both files are untouched by
this change, and the integration suites pass regardless.
