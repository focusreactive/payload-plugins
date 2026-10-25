Build step: 2026-10-25-the-run-as-a-list.design.md #2

## Task restatement

Two build steps in one task, in this order, with the checks green in between.

**Step 2** moves four blocks out of `handler.ts` into sibling files, while the class still calls
them from its private methods. Nothing about behaviour changes.

**Step 3** deletes the class. `handler.ts` becomes `translateDocument.ts` holding one module-level
function; `Handler<TInput,TOutput>` and `model.ts` go; the entry adopts the task runner's existing
`TaskHandlerInput`; `wireTranslateRunner` stops re-spelling the input field by field.

Covers **R2, R3, R4, R6, R7, R8** of the design. Step 4 (the module-seam write path) and step 5
(splitting lifecycle reporting out of the wire file) are **not** in this task.

## What already exists — platform · installed · project · verdict

| Rung | Found | Verdict |
|---|---|---|
| project | `TaskHandlerInput` in `modules/task-runner/TaskRunnerProvider.interface.ts:9-17` — `RunAsk` plus the same six fields as `TranslateDocumentInput` | **adopted.** `model.ts` is a duplicate of a type one layer down, and the duplicate is the one with no owner |
| project | `TaskHandler` in the same file — `(payload, input, scope?) => Promise<void>` | **not adopted as the signature.** Its `scope?` is optional, and an absent scope means an unattributed write with access checks off. Conformance is checked at the one wire site instead |
| project | `moduleSeam`'s `Pick<BeforeTranslation, "payload"\|"target"\|"scope">` | reused as the parameter type of the extracted module calls — it is already a structural slice naming exactly what the chain needs |
| project | `core/domain/selection`, `core/domain/content-projection` | unchanged; `selectLeaves` stays a thin shell over them |
| platform | nothing new | — |

## Decisions

### D1 — `Run` moves to its own file; the four siblings do not import the entry

**Chosen:** a new `run.ts` holding the `Run` type and `openRun` (today's `beginRun`).

**Rejected — leave `Run` in `translateDocument.ts` and have the siblings `import type` it.** A
type-only import is erased, so there would be no runtime cycle — but the source graph would show
`selectLeaves.ts` importing from the file that imports it, and the package has no linter to keep
that honest. **ST3** asks for zero cycles, not zero *runtime* cycles.

**Rejected — give each sibling a structural slice and never name `Run`.** Closest to "demand only
what you touch", and it needs no new file; it loses because the slices are four and five fields
wide, so each signature becomes the wide shape the previous task spent its effort removing.

**Constraint cited:** `selectLeaves` needs `payload`, `scope`, `target`, `schema`; `runModules`
needs `payload`, `target`, `scope`; `translateOrWrap` needs `schema`, `target`;
`reportNothingSent` needs `payload.logger` and `target`. No sibling needs all of `Run`, and none
needs the entry.

**This is a refinement of the design's file list**, which named four new files. The fifth is forced
by ST3 once the blocks leave the entry; recorded rather than taken quietly.

### D2 — the config-time dependencies travel as a parameter, sliced per callee

**Chosen:** `translateDocument(deps, payload, input, scope)`, and each extracted function takes only
the slice it reads — `deps.criteria`, `deps.modules`, `deps.translationProvider`.

**Rejected — pass the whole `deps` record to each.** Three of the four would then receive three
values they never read, which is the rule about signatures claiming only what the answer depends on.

**Constraint cited:** `wireTranslateRunner.ts:44` builds these four values once at config time and
nothing else ever writes them, so they are a plain immutable record, not state.

### D3 — `scope` is a required parameter of the entry

**Chosen:** `scope: RequestScope`, no default and no `?`.

**Rejected — adopt `TaskHandler` wholesale.** With no scope, `rebuildRequester` returns `null`,
`checkTranslationPermission` answers `true` and the write runs with Payload's default
`overrideAccess: true`. A caller that forgets the argument silently downgrades the run to an
unchecked write; today's `scope: RequestScope = {}` default makes that possible.

**Constraint cited:** `translationPermission.ts:152` returns `true` for a null user, and
`enforcedAtTheWrite(null)` adds nothing to the write.

**Consequence to watch:** every test that calls `handle(payload, input())` with two arguments must
gain an explicit `{}`. That is a visible change at each site, which is the point.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R3 | The class is gone; the entry is a function in `translateDocument.ts` | `test -f handler.ts` and `grep -c 'export class TranslateDocumentHandler'` across `src/` | file absent; count `0` (now 1 class, 13 construction sites) |
| AC2 | R3 | The false interface is gone | `src/server/shared/access/handler.ts` absent; `grep -rc 'Handler<'` in `src/` | file absent, `0` importers (now 4 files name it) |
| AC3 | R3 | `model.ts` is gone and the task runner's type is the survivor | file absent; `grep -c TaskHandlerInput src/server/modules/task-runner/index.ts` | `≥1` (now 0) |
| AC4 | R6 | The entry demands a scope | `grep -A4 'export async function translateDocument' translateDocument.ts` | the parameter is `scope: RequestScope`, with no `?` and no `= {}` |
| AC5 | R4 | The four concerns live in their own files | `selectLeaves.ts`, `translateOrWrap.ts`, `reportNothingSent.ts`, `runModules.ts` exist; none of their symbols is declared in `translateDocument.ts` | all four present; `REPORTED`, `emptyBecause`, `moduleSeam` not declared in the entry |
| AC6 | R2 | The order still reads as a list | count the **top-level statements** of the entry function body, one per step | ≤ 9 — see the amendment below |
| AC7 | R7, R8 | Behaviour is unchanged | `bunx vitest run`; then rebuild and `bun run test:integration` from `apps/dev` | 190 files and **2487** checks or more, all passing; **225 passed / 8 skipped** |
| AC8 | — | No module imports the entry except the wire and the tests | `grep -rl 'translateDocument.js' src/` | only `wireTranslateRunner.ts` and files under `__tests__/` |
| AC9 | — | The real declaration build passes | `bunx turbo run build --filter='./packages/payload-plugin-translator'` from the root | exit 0 |
| AC10 | — | No new type errors, no new analyzer findings | `bun run check-types` in the package and in `apps/dev`; `sp-lint-delta.sh -- bunx oxlint .` | `0` each; nothing introduced |
| AC11 | R8 | The other translation path is untouched | `git diff --name-only` | `src/server/features/translate-field/` absent from the list |

## Pre-flight

| AC | Result now | Kind |
|---|---|---|
| AC1 | `handler.ts` present, 1 class, **13** construction sites | must change — fails now ✓ |
| AC2 | `shared/access/handler.ts` present, **4** files name `Handler` | must change — fails now ✓ |
| AC3 | `model.ts` present; `TaskHandlerInput` in the task-runner barrel: **0** | must change — fails now ✓ |
| AC4 | the entry is a method with `scope: RequestScope = {}` | must change — fails now ✓ |
| AC5 | all four blocks declared in `handler.ts` | must change — fails now ✓ |
| AC6 | entry body **22** lines | invariant — passes now ✓ |
| AC7 | **190 files / 2487 checks**; integration 225 / 8 | invariant — passes now ✓ |
| AC10 | `check-types` 0; oxlint 43 warnings, 0 errors | invariant — passes now ✓ |
| AC9, AC11 | build green at the last run; `translate-field` untouched by step 1 | invariant — re-run in Phase 5 |

## Risk notes

- **High risk, and it binds.** 13 construction sites and a deleted shared interface, across seven
  test files of about 1,400 lines. The regression sweep is evidenced and Phase 5b runs several
  review angles.
- **Step 1 is in the working tree, uncommitted**, and this task builds on it. Everything here is
  measured against that state, not against `HEAD`.
- **The test rewrite is not all mechanical.** Mechanical: the 13 constructions and the import of the
  input type. Not mechanical: `handler.test.ts` holds five inline constructions and its narrowing,
  nothing-sent and provider-wrap cases now belong beside the files that own those concerns — what
  moves and what stays an end-to-end order check is judgement. `handler.spend.test.ts` changes
  meaning, proving at runtime what `ApprovedSource` proves at compile time; it stays, with the reason
  written down. `handler.moduleFailure.test.ts` changes fixture shape in step 2.
- **The two steps are verified separately.** Step 2 must be green before step 3 starts, so a failure
  in step 3 cannot be confused with a bad extraction.
- **Not in scope:** the module seam's unasked write path (design D6, step 4) · splitting lifecycle
  reporting out of the wire file (step 5) · moving the provider-error wrap into `core` (declined,
  it would change `translate-field`).

### AC6 amended during Phase 3, before it was graded

AC6 first said "the entry body is at most 22 lines, the number it is today". That measure fails for a
reason that has nothing to do with readability: the extracted functions take object arguments, which
is this package's idiom (`openTargetDocument`, `resolveTargetLayer`, `fetchSourceDocument`), and the
formatter breaks each of them across five lines. The body is 44 physical lines and **9 top-level
statements** — one per step, which is the property R2 actually asks for.

Changed to count statements rather than lines, and recorded here rather than quietly re-graded. The
same mistake — a line-count target set from a guess — is what made AC4 of
`2026-10-25-one-run-one-context.task.md` unmeetable.

## Human choices

**2026-10-25, at the gate.** *"В своём файле run.ts"* — D1 stands: `Run` and `openRun` move to
`run.ts`, and the four siblings import the type from there. The two alternatives were offered and
declined: a type-only back-import from the entry (erased at build time, but a cycle a reader can
see and nothing in the package can catch), and no shared type at all (honest about what each
function touches, at the cost of four- and five-field signatures).

## Result — every criterion walked with its declared check

| AC | Evidence | Verdict |
|---|---|---|
| AC1 | `handler.ts` absent; `class TranslateDocumentHandler`: **0** occurrences (was 1 class, 13 construction sites) | met |
| AC2 | `shared/access/handler.ts` absent; the one remaining `Handler<` is `withErrorHandler<T>`, an unrelated generic | met |
| AC3 | `model.ts` absent; `TaskHandlerInput` exported from the task-runner barrel and used by the entry | met |
| AC4 | `translateDocument(deps, payload, input, scope: RequestScope)` — no `?`, no `= {}` | met |
| AC5 | `run.ts`, `selectLeaves.ts`, `runModules.ts`, `translateOrWrap.ts`, `reportNothingSent.ts` all present; none of their symbols declared in the entry | met |
| AC6 | **8** top-level statements in the entry body, against the amended ceiling of 9 | met |
| AC7 | **190 files / 2490 checks**, all passing; integration **225 passed / 8 skipped** | met |
| AC8 | only `wireTranslateRunner.ts` and the seven test files import the entry | met |
| AC9 | `turbo run build` exit 0 — run again after the exports were narrowed, which is what proves `Owed` needs no export | met |
| AC10 | `check-types` 0 in the package and in `apps/dev`; `sp-lint-delta` `mode=two-run`: nothing introduced; 43 warnings / 0 errors, the baseline | met |
| AC11 | `translate-field/` absent from the changed-file list | met |

The package suite went 2487 → 2490 with no test added by hand. The difference is
`core/__tests__/every-throw-is-a-translator-error.test.ts`, which runs one check per source file
under `src/server` and `src/core`: step 2 added five files, step 3 removed three and added one.

`sp-diff-checks`: clean, 5 checks, no findings.

## Review log

### 2026-10-25 — comment audit (6 candidates, 18 entries including stranded comments)

DELETE 5 · REWRITE-COMMENT 11 · MISSING 2. Every verdict applied except the two MISSING, one of
which was applied (a rename) and one of which is debt (below).

**The finding that mattered: a new comment of mine claimed a protection the code does not give.**
The entry's docblock said `scope` is required "so a caller that forgets it would not downgrade the
run in silence". Checked and false: `RequestScope` has only optional fields, so `{}` type-checks and
downgrades exactly as `undefined` did, and the single production caller supplies that `{}` itself
(`wireTranslateRunner.ts:47`, `scope ?? {}`, because `TaskHandler`'s third parameter is optional).
Making the parameter required moved the default one call up; it did not remove it. Rewritten to the
one fact a caller needs: an empty scope is not neutral — with no requester, no rule is asked and both
the read and the write run with Payload's access checks off.

This is the third comment in this session to overclaim in the same way: an absolute ("cannot",
"always", "in silence") that turned out to be "usually" or "yes, but visibly".

Four docblocks were deleted as restatement. The clearest was the one on `Run`, which warned against
holding a run's state "per instance" — the instance it warned about no longer exists, because
removing the class removed that danger structurally.

Ten pre-existing comments were stranded by the move and rewritten: a `{@link TranslateDocumentHandler}`
that no longer resolves, five `describe` titles naming the deleted class, and three test comments
saying "the handler's".

### 2026-10-25 — three review angles (high risk)

**Behaviour equivalence — no findings.** Step order, every moved body line by line, the two
constructor defaults now applied per call, `openRun`'s effect order and its four-field mapping, the
`scope` default, and the discarded return value were each compared against the pre-split file.

One real difference it surfaced, below a defect: the wiring used to rebuild the job input as a
seven-field literal and now passes the runner's object straight through, so an extra property a
runner attached would travel inward. Nothing in the moved code reads beyond the seven fields, so
nothing observable changes.

**The test rewrite — no weakened tests.** Each `{ success: true }` assertion became
`toBeUndefined()`, which still fails on a rejection, and every one sits beside a real behavioural
check. Scopes carrying a requester or a transaction id were preserved at every site; `{}` was added
only where the call previously passed none — and the deleted file's default was `scope: RequestScope = {}`,
so those sites are equivalent. No double became shared, no `await` was dropped, no rename half-landed.

**Structure — two fixes applied, one declined, three recorded.**
Applied: `RunAddress` was exported with no consumer outside its file and, worse, its parameter name
`address` collides with this package's own meaning of "address" (a leaf's address in a document).
The type is gone and the parameter is now `taskInput`, which says where the value comes from.
`Owed` lost its surplus `export`, and the real `tsc` build was re-run to prove the declaration emit
does not need it.

Declined: making `reportNothingSent` and `publishIfAsked` take object arguments to match their three
peers. Both take two parameters and read fine positionally; an object argument for two values is
ceremony, and `publishIfAsked(run, input.publishOnTranslation)` already names its boolean at the
call site.

## Follow-ups — recorded, not done here

1. **`TaskHandler.scope` should be required.** Both in-repo runners already always pass one
   (`SyncTaskRunner.ts:76`, `PayloadJobsRunnerProvider.ts:139`), but the type is part of the
   published `TaskRunnerProvider` contract, so a third-party runner calling `handler(payload, input)`
   would stop compiling. It needs its own commit as a breaking change. Until then the silent
   `scope ?? {}` survives at the wiring, which is the one place the new signature could not reach.
2. **The seven test files are still named `handler.*.test.ts`** for a module called
   `translateDocument.ts`. Their `describe` titles were corrected; the filenames were left, because
   seven renames would add diff noise to an already large change.
3. **`reportNothingSent(run, reason: EmptyBecause | null)` hides a fourth state behind `null`** —
   `null` means "narrowing kept leaves but the collector sent none". Pre-existing shape, carried
   across unchanged; making it a named fourth member is its own small change.
4. **`data as ApprovedWrite`** remains the file's one type assertion, while `ApprovedSource` beside
   it needs none. The asymmetry has a stated cause (a runtime symbol key would be copied into the
   object handed to Payload as `data`), but whether Payload actually ignores symbol keys was never
   checked.
5. **`Provenance.module.ts:6` imports `features/staleness`** — a `modules` → `features` edge against
   the declared direction. Older than this work.
6. **The layering rule is not written down.** A reviewer looked for "features → modules/shared →
   core" in the package `CLAUDE.md` and did not find it; it exists as prose in the root guide and in
   the briefs. Worth stating in the package guide, which is the owner's file to edit.
