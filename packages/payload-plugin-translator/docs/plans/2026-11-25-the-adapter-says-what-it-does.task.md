# The adapter says what it does

## Requirements / Task restatement

Three reading passes over the queue adapter — one for surface cleanup, one for complexity, one for
boundaries — found two ways it can go quiet, one mechanism that excludes nothing, and one branch
that has been reopened four times in a month. The owner took six of their findings into this task.

- R1 (in) Applying the plugin twice registers its boot work once, as the suite already claims for
  everything else it registers.
- R2 (in) A collection of answers that is read as total is total: the channel the adapter uses to
  tell its own failure from the queue's stops folding two opposite situations into one value.
- R3 (in) A declaration that excludes nothing is removed, with the reason recorded.
- R4 (in) The decision the queue's errors are judged by is a unit that can be read and tested on
  its own, instead of twenty-nine lines inside a loop.
- R5 (in) Nothing in this file claims in its name something it does not do.
- R6 (out) The module barrel, the published `RunnerCapabilities`, replacing the local task-args
  type with Payload's, the duplicated milliseconds validator, moving option resolution into
  `config.ts`, splitting the file by role. Each is real and each is its own change.
- R7 (out) The guard that asks the queue's log whether a locale was already delivered, which
  duplicates the plugin's own settle-once rule and suppresses it when a record write is lost. Its
  path was confirmed, it is narrow, and the cure crosses a module boundary.

## What this starts from (measured)

- `configure` contributes a task, a workflow and a schedule through one helper that drops an entry
  whose key is taken, and then chains a boot hook with no such check. `registeredOnce.test.ts`
  carries the title "a plugin applied twice registers itself once" and asserts exactly the first
  three.
- The helper de-duplicates the task and the workflow under **different** keys. A host that already
  registered a task under this plugin's slug keeps its own and still gets this plugin's workflow —
  and then the mark the workflow reads is never written, every error is rethrown untouched, and no
  locale is ever given an ending.
- The mark has three values for four situations: no entry means both "the queue failed before this
  plugin was reached" and "the mark was dropped", and those mean opposite things. The second is
  possible only because the local task-args type makes `job` optional. Payload's own type requires
  it (`queues/config/types/taskTypes.d.ts:27`).
- The workflow declares a concurrency key of the run handle, and the handle is a fresh
  `crypto.randomUUID()` per enqueue (`PayloadJobsTaskRunner.ts:95`, through `:115` to `:137`, the
  only path that queues a workflow). Payload excludes a job only when its key matches one that is
  **already running** (`runJobs/index.js:65-110`). Two rows never share a key, so the declaration
  excludes nothing.
- Four casts of one value in one handler, all because the workflow's generic argument admits an
  `input` the stored shape does not. The field is read in exactly one place, which validates it.
- The catch is twenty-nine lines and has been rewritten by four of the last five commits that
  touched this file.
- `reclaimWithoutBlockingBoot` is awaited by the chain, and Payload awaits the whole hook. It
  blocks boot; the name describes the swallowed error, not the scheduling.

## Decisions

### D1. One question decides whether this plugin's registration won, and everything hangs off it

- **Chosen:** ask the contribution helper whether this plugin's task is the one in the list, and
  register the workflow and the boot hook only on that answer.
- **Why it bites:** it closes both holes with one fact. The boot hook stops being chained twice,
  and the workflow stops being registered beside someone else's task — which is the state in which
  no locale can ever be given an ending.
- **Rejected — give the boot hook its own key and de-duplicate it separately:** two answers to one
  question, and nothing would stop them disagreeing.
- **Rejected — de-duplicate the task and the workflow under one key:** the two live in different
  lists on the host's config and the helper is keyed per list.

### D2. The mark has one value per situation, and the fourth is made impossible rather than handled

- **Chosen:** the task's own argument type stops making `job` optional, because Payload requires
  it; the mark records `started` before the translation is called; and no entry then means exactly
  one thing — the queue failed before this plugin was reached.
- **Why it bites:** the dropped-mark case is the one that reports a translation that happened as
  one that never did, or leaves a record open for ever. Making it unrepresentable is cheaper than
  a branch for it.
- **Rejected — a fourth value for "the mark was dropped":** it would have to be set by the code
  that could not set a mark.
- **Shape check fired** on "anything optional". The two shapes compared are an optional `job` with
  a guard, and a required `job` with none; the second removes the guard and the situation together.

### D3. The concurrency declaration is removed, and the reason is recorded where it was

- **Chosen:** remove the declaration, the host flag it reads, the parameter that carried it and the
  cases that pin it.
- **Why it bites:** it is read as a safety belt and is not one. What it looks like it prevents —
  two runs of one document at once — is prevented upstream, by the rule that admits no second run
  while one is live.
- **Rejected — keep it and correct the key to something two rows can share:** that is a new
  feature, and the question it would answer is already answered elsewhere.

### D4. The stored input is typed as unvalidated, which is what it is

- **Chosen:** the stored job's `input` becomes `unknown`.
- **Why it bites:** one place reads it and validates it. Typing it as already-shaped is the claim
  that validation disproves, and four casts exist to work around the claim.
- **Rejected — widen the workflow's generic to the parsed shape:** it asserts the stored row is
  valid before anything has read it.

### D5. The verdict is a unit; the loop carries it out

- **Chosen:** what a locale's throw means becomes a named unit beside the other reasoning about
  attempts, returning one of three verdicts. The loop reads the verdict and acts.
- **Why it bites:** this decision has been rewritten four times in a month, always inside a loop,
  and it cannot be exercised today without standing up a task and a workflow together.
- **Rejected — leave it inline and name the arms with comments:** prose where a unit belongs.
- **Consequence accepted:** the package gains lines overall. What falls is the size of the branch
  that keeps being reopened, and what rises is that it can be tested alone.

### D6. The boot reclaim is renamed, not rescheduled

- **Chosen:** the name says it runs on boot.
- **Rejected — detach it so boot does not wait:** the schedule polls once a minute, so a lock left
  behind would survive a minute, and a floating promise would carry its own failure out of the
  handler that currently catches it.

**New surface:** one unit for the verdict, and its verdict type. Its two callers are the workflow's
loop and its own cases.
**Written contract owed:** none — the verdict's three cases are named at their definition.
**Escalate:** no.

## Acceptance criteria

| # | Covers | Criterion | How it is checked | Pre-flight |
|---|---|---|---|---|
| AC1 | R1 | Applying the plugin twice leaves one boot hook, not two | a case over the registered config, counting what boot runs | **fails now** — the hook is chained without a check |
| AC2 | R1 | A host that already registered a task under this plugin's slug does not get this plugin's workflow beside it | a case over the registered config | **fails now** — the workflow is registered regardless |
| AC3 | R2 | A locale whose translation ran is never answered as one that did not, whatever the queue did afterwards | the existing cases over the three answers, plus one that the fourth situation is unrepresentable | **passes now in part** — the three answers hold; the fourth is expressible |
| AC4 | R3 | Nothing in the registered workflow declares a concurrency key, and the host's flag is not read | a case over the registered config | **fails now** — both are present |
| AC5 | R4 | What a locale's throw means is decided by a unit exercised on its own, covering all three verdicts | cases over that unit | **fails now** — no such unit |
| AC6 | R4, R5 | The queue adapter's behaviour is unchanged: a landed translation is bought once, a genuine failure keeps its retries and its ending, a failure before this plugin is passed on | the integration specs and the unit cases that pin those three, unchanged | **passes now** — stays-true, and the direction this change is most likely to break |
| AC7 | — | The baselines hold | package suite ≥ 3054 passed / 16 skipped · integration ≥ 325 passed / 7 skipped, 0 failed · `check-types` 10/10 · a real `turbo build` exits 0 · `oxlint .` ≤ 26 warnings, 0 errors | **passes now** — measured |

AC6 is the one most easily lost: five of the six changes touch the handler that decides what became
of a locale, and the behaviour it decides was settled by the two commits before this one.

## Risk

**High.** Every translation passes through this adapter, and the change touches the branch that
three of this week's defects lived in. Two of the six items change behaviour at registration time,
where a mistake is invisible until a host applies the plugin in an unusual way.

The removal carries its own exposure: a declaration that excludes nothing today would exclude
something if the handle ever stopped being unique per enqueue. That is the one assumption the
removal rests on, it was read from the code that mints the handle, and the rule that makes a second
live run impossible is recorded separately.

Rollback is a revert; nothing stored changes shape.

## Decisions by the owner

- 2026-11-25 — behaviour and readability together, in one pass, as separate commits.
- 2026-11-25 — the boundary findings wait: the module barrel, the published capabilities type and
  the local task-args type are each their own change.
