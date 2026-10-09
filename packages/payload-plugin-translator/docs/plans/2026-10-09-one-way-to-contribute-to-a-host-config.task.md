# One way to add something to a host's config

## Task restatement

Adding a plugin's contribution to a Payload config is written out by hand every time, and
the hand-written form is different at every site. In `PayloadJobsRunnerProvider.configure`
it is three separate shapes:

```ts
if (!config.jobs) config.jobs = {};
if (!config.jobs.tasks) config.jobs.tasks = [];
config.jobs.tasks.push(task);               // ← and the same four lines again for workflows

const existingAutoRun = config.jobs.autoRun; // ← and nine more lines for the three cases
if (Array.isArray(existingAutoRun)) { … } else if (typeof existingAutoRun === "function") { … } else { … }
```

Give it one name, with its own tests, so it is read once instead of re-read at every review.
**The owner's stated reason is review cost, not caller count** — a fiddly block that gets
re-read every time is worth a name even at one call site.

## What the helper must absorb

The three shapes a list-valued config field can be in, per Payload's own declaration
(`node_modules/payload/dist/queues/config/types/index.d.ts:127`):

```ts
autoRun?: ((payload: Payload) => MaybePromise<AutorunCronConfig[]>) | AutorunCronConfig[];
```

| Current value | Result |
|---|---|
| absent | `[contribution]` |
| an array | the array plus the contribution, skipping what is already there |
| a function | a wrapper that calls the original and appends, skipping what is already there |

**The function form cannot be de-duplicated at config time** — what it returns is only known
when it is called. So the wrapper defers the check:

```ts
async (payload) => {
  const existing = await previous(payload);
  return present(existing, entry) ? existing : [...existing, entry];
}
```

## Scope — hard boundary set by the owner

**Only files already in the working diff may be edited.** Of the config-mutating sites, only
`src/server/modules/task-runner/payload-jobs-runner/PayloadJobsRunnerProvider.ts` qualifies.

Out of scope, not to be touched: `server/modules/translation-levels/PluginConfigBuilder.ts`,
`server/modules/provenance/Provenance.wiring.ts`, `src/plugin.ts`, and every other package.
Converting those is a later pass.

Three call sites are in scope: `config.jobs.tasks`, `config.jobs.workflows`,
`config.jobs.autoRun`.

## Phase 1 — what already exists

Climbed the ladder before planning anything new.

- **The platform.** Payload exports nothing for registering a task, a workflow or an autoRun
  entry; every plugin writes into `config.jobs` directly.
- **Installed libraries.** No general-purpose utility library is a dependency — there is no
  installed `uniqBy` to lean on.
- **The project.** `src/server/shared/utils/pipe.ts` composes functions left-to-right, which
  is the "config pipeline" the owner remembered, but `PluginConfigBuilder.applyTo` does not
  use it — it runs its modifiers in a plain loop. Nothing in the shared layer appends
  without duplicating.
- **The nearest precedent, and it is two of them.**
  `PluginConfigBuilder.registerEndpoints` already builds `new Set(config.endpoints.map(endpointKey))`
  from what the config already carries and skips a repeat — the exact idea, written by hand,
  in a file this task may not touch. And the sibling package
  `packages/payload-plugin-scheduling/src/utils/overrideJobs.ts` folds its contribution into
  `jobsCollectionOverrides` by capturing the host's function and calling it first — the same
  chaining shape, hand-written again, in another plugin. Two plugins writing this twice is
  the evidence that it deserves a name.

**Blast radius.** One new file; three statements inside one file; the registered task,
workflow and autoRun entry Payload receives. Guarded by the existing characterisation test
`__tests__/jobInputFields.test.ts`, which compares the registered `Field[]` against a
baseline, plus the integration suite on a real database.

**Risk: low.** One file in scope, no public API, behaviour already pinned by a baseline test.
Phase 5 therefore runs one reviewer rather than three.

## The design

### D1 — `contribute` returns the new value; the caller assigns

```ts
config.jobs.autoRun = contribute(config.jobs.autoRun, [entry], cronKey);
```

*Rejected: mutate by key* — `contribute(config.jobs, "autoRun", …)`. To type it, the element
has to be pulled out of `T[] | ((p: Payload) => MaybePromise<T[]>) | undefined` with a
conditional type, and the signature becomes exactly the thing this task exists to stop
people re-reading. Returning also shows at the call site *where* the write lands, which a
mutation hides.

*Rejected: the zero option, `??=` and nothing else.* `(config.jobs ??= {}).tasks ??= []` does
collapse the four-line plumbing to one, and it is used — but it does not skip a repeat, and
skipping a repeat is the part that is missing and causing a defect (below).

Two overloads keep the types honest: an array in gives an array out, a possibly-polymorphic
field in gives a possibly-polymorphic field out. No call site needs a cast.

### D2 — the function form is wrapped, not refused

*Rejected: handle only arrays and let the caller deal with a function.* That leaves the
nine-line three-branch block at the `autoRun` site — the single ugliest piece here and the
reason the owner asked for this at all.

### D3 — it lives in `src/server/shared/payload/contribute.ts`

*Rejected: inside `payload-jobs-runner/`.* The folder convention recorded in the package's
`CLAUDE.md` splits that module into `store/` (shapes of what is stored) and `model/`
(decisions); a config-time helper is neither, and the three out-of-scope call sites will
want it shared.

*Rejected: a new shared workspace package.* The scheduling plugin writing the same kind of
machinery argues for a cross-package home, but that is a larger decision than this task and
the scope boundary forbids touching other packages.

### D4 — `config.onInit` joins, as a second helper named `chain`

**Settled at the gate, 2026-10-09.** It is the same family — fold this plugin's contribution
into whatever the host already had — but not the same operation: handlers return nothing, so
there is no list to append to and no identity to compare.

Measured, because the first instinct was to leave it out: the `autoRun` block is 14 lines of
which 12 are machinery and one is this plugin's own contribution; the `onInit` block is 12
lines of which only 3 are machinery — capture the host's handler, declare ours, call theirs
first — and 9 are this plugin's own business (`reclaimStaleJobs`, its catch, its log line).
So `chain` hides less than `contribute` does.

Taken anyway, for two reasons the owner weighed: after `contribute` lands, the `onInit` block
would be the **only** hand-rolled shape handling left in `configure`, and "almost none" is a
worse resting place than "none"; and those three lines hold the one thing that is easy to get
wrong — calling the host's handler, and awaiting it. The sibling package's
`overrideJobs.ts` writes the same chaining by hand, so a second caller exists, out of scope.

### New surface

Two functions. `contribute` has three callers today, all in the one file in scope, and two
more named but out of scope (`config.endpoints`, `config.admin.components.providers`).
`chain` has one caller in scope and one out of it.

### Written contract

Yes — `contribute` owes its callers three things a signature cannot state:

1. **Order.** The contribution lands after whatever the host already had.
2. **Identity.** The first entry with a given key wins; a later duplicate is dropped, never
   replaces.
3. **When the check happens.** For an array, at config time. For a function, at *call* time —
   so a host function that starts returning the same entry later still does not get it twice.

That is what Phase 3 writes tests against, before the implementation.

### Escalate to /sp-architect?

No. One module, one small helper, no new dependency, no data migration.

## The defect this fixes on the way

`configure` does not check whether the plugin is already registered. Measured by calling it
twice over one config: two tasks with slug `translate_document`, two workflows
`translate_document_locales`, and **two identical autoRun entries for queue `translations`**,
so that queue is polled twice per tick. Payload does not catch it —
`queues/config/collection.js` collects slugs into a `Set` only to validate, and throws only
when a task slug collides with a *workflow* slug.

## Acceptance criteria

| # | Criterion | How it is checked | Passes when |
|---|---|---|---|
| 1 | `contribute` on an absent value yields `[contribution]` | unit test | asserted |
| 2 | `contribute` on an array appends, and drops an entry whose key is already present | unit test, both directions | asserted |
| 3 | `contribute` on a function returns a function that calls the original and appends | unit test | asserted |
| 4 | The function form's duplicate check happens at call time | unit test: the wrapped function is called twice, the underlying one returning the contribution's key only on the second call; the result carries it once | asserted |
| 5 | A later duplicate never replaces the first | unit test comparing identity of the kept object | asserted |
| 6 | Calling `configure` twice over one config registers one task, one workflow, one autoRun entry | new test driving `createPayloadJobsRunner().configure(ctx)` twice | counts are 1, 1, 1 |
| 6b | `chain` calls the host's handler before this plugin's, and awaits it | unit test recording call order with an async host handler | order asserted |
| 6c | `chain` with no host handler calls only this plugin's | unit test | asserted |
| 7 | No hand-rolled shape handling remains in `PayloadJobsRunnerProvider.configure` — neither the three-branch `autoRun` block nor the `onInit` capture-and-call | read the file | both gone |
| 8 | The registered `Field[]` is unchanged | existing `__tests__/jobInputFields.test.ts` | stays green |
| 9 | Nothing outside the allowed file and the new helper changed | `git status --porcelain` filtered | only those paths |
| 10 | Unit suite | `bunx vitest run` | ≥ 2026 passing, 0 failing |
| 11 | Integration against a real database | `bun run test:integration:sqlite` | 224 passed / 7 skipped |
| 12 | Types and the real `tsc` declaration build | `turbo run check-types --force`, `turbo run build` | both green |
| 13 | The analyzer gains nothing | `sp-lint-delta.sh --base feat/translator-lifecycle-run-context` | nothing introduced |

## Criteria pre-flight — run 2026-10-09 against the untouched tree

| # | Result now | Reading |
|---|---|---|
| 1–5 | fail — `contribute` does not exist | correct polarity |
| 6 | **fails — measured: two tasks, two workflows, two autoRun entries** | correct; this is the defect |
| 6b, 6c | fail — `chain` does not exist | correct polarity |
| 7 | fails — both blocks are present | correct |
| 8 | passes — green today | correct for a must-stay-true criterion |
| 9 | passes trivially | correct |
| 10 | passes — 2026 / 144 files | correct |
| 11 | passes — 224 / 7 skipped | correct |
| 12 | passes — 9/9 packages, build green | correct |
| 13 | passes — nothing introduced | correct |

## Risk notes

- The `autoRun` wrapper changes a value Payload calls on a schedule. If the wrapper throws,
  the cron entry is lost rather than degraded. The original is called inside it, so a host
  function that throws already threw before — but the `await` is new, and a host function
  returning a non-array would now be spread. Worth a test.
- Two overloads can quietly pick the wrong one. The call sites are type-checked, and the
  `Field[]` baseline plus the integration suite catch a wrong registration.

## Human choices

- Review cost, not caller count, is the criterion for naming this — stated by the owner.
- Return rather than mutate — chosen by the owner over mutate-by-key.
- Scope limited to files already in the working diff — set by the owner.
- `config.onInit` joins, as a separate `chain` — chosen at the gate over leaving it inline
  (which would have left the only hand-rolled block in `configure`) and over folding it into
  `contribute` (two operations under one name).
- `README.md` is the owner's; this task does not touch it.
- No tracker issues. The git index is not to be touched.

## Review log

_(appended by each review pass)_

### 2026-10-09 · phase 5 verification

- **Checks:** unit 2045/146 files · `turbo run check-types --force` 9/9 · `bunx oxlint` 0 errors ·
  `turbo run build` green including the real `tsc` declaration build · integration on SQLite
  224 passed / 7 skipped · the `Field[]` baseline guard unmoved.
- **Gates:** `sp-diff-checks` clean, 5 checks; `sp-lint-delta --base feat/translator-lifecycle-run-context`
  (mode=two-run) nothing introduced — the single line it prints, `pickHost` in `model/planEnqueue.ts`,
  is a path artifact of an earlier folder move and warned identically before it.
- **Reviewer:** one, vector `full` (risk was low). **No findings.** It verified rather than read:
  ran the type-check and both suites itself, grepped the package for any other writer of
  `config.jobs.tasks/workflows/autoRun` and found none, and diffed against the branch to confirm
  `chain` leaves the host handler's error path exactly as it was.
- **One fact it established that the design had assumed:** Payload declares `jobs.tasks` and
  `jobs.workflows` as plain arrays (`queues/config/types/index.d.ts:197,203`); `jobs.autoRun` at
  :127 is the only polymorphic one. So the two `contribute` overloads cannot resolve wrongly at any
  in-scope call site, and the polymorphic branch exists for exactly one field.
- **Order of work:** contract → throwing stub → 15 checks written against the contract → red run
  15/15, every failure the stub's own error, none passing, no module-resolution error →
  implementation → green 15/15 → four mutations, one per contract clause, three of which turned
  exactly one named check red. The defect test was red against the real code first.
- **Criteria:** 13 of 13 met.
- **Comment gate:** not run as a skill; the five comments this change adds were judged by hand —
  four docblocks stating why a type or a promise exists, one inline note explaining why a fixture's
  host function changes its answer between calls. No comment restates what the code does.
- **Left open:** the three out-of-scope sites (`PluginConfigBuilder`, `Provenance.wiring`,
  `plugin.ts`) still hand-roll their own; `packages/payload-plugin-scheduling/src/utils/overrideJobs.ts`
  writes the same chaining by hand in another package.
- **Pin:** not set. The working diff holds three tasks' work and this pass reviewed only this one's
  files; a pin would claim more than was verified.
