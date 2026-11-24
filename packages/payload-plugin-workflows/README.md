# @focus-reactive/payload-plugin-workflows

[![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-workflows)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-workflows)

Editorial workflows for [Payload CMS](https://payloadcms.com/), defined in TypeScript next to your collections and run by editors and AI agents alike.

## The model

1. A **workflow** is a list of **stages**. Each stage has **actions** and **transitions**.
2. A document has a **run**: one record holding the current stage, the run's **fields** and its **history**.
3. An action changes fields. After every change the engine checks the stage's transitions and moves the run.
4. A stage's **guard** refuses publishing (or saving, or deleting) the document while a run sits in that stage.
5. A person and an agent do the same thing: **fire an action**, with the same permissions.

Editors see the run in a small indicator next to Save and Publish. It opens a drawer laid out like Payload's document view: in the main column the stages, whose turn it is, what is on hold and the actions they may take; in the sidebar the key facts and the history. Stopping a workflow lives in the drawer's "…" menu. Agents use the same operations through a set of tools.

## Example

```ts
// src/workflows/editorialReview.ts
import { defineWorkflow } from "@focus-reactive/payload-plugin-workflows";

export const editorialReview = defineWorkflow({
  name: "editorial-review",
  title: "Editorial review",
  collections: ["pages"],
  initialStage: "drafting",
  fields: [
    { name: "reviewer", type: "user" },
    { name: "decision", type: "string" },
    { name: "reason", type: "text" },
  ],
  stages: [
    {
      name: "drafting",
      title: "Drafting",
      actions: [{ name: "submit", title: "Submit for review", status: "done" }],
      // No `when`: leaves once the stage's actions are done.
      transitions: [{ name: "to-review", to: "review" }],
    },
    {
      name: "review",
      title: "Review",
      guards: [{ name: "hold", title: "Publishing is held until review", operations: ["publish"] }],
      assignee: "reviewer", // once set, only that user may act
      roles: ["editor"], // until then, anyone with this role
      actions: [
        // Automatic (`when`): on entering the stage, clear the previous round's decision.
        { name: "reset", when: () => true, set: { decision: null, reason: null } },
        { name: "claim", title: "Take this review", filter: ({ fields }) => !fields.reviewer,
          set: ({ actor }) => ({ reviewer: actor.id }) },
        { name: "approve", title: "Approve", status: "done", set: { decision: "approved" },
          effects: ["notify-author"] },
        { name: "reject", title: "Request changes", status: "done",
          params: [{ name: "reason", type: "text", required: true }],
          set: ({ params }) => ({ decision: "rejected", reason: params.reason }) },
      ],
      transitions: [
        { name: "approved", to: "approved", when: ({ fields }) => fields.decision === "approved" },
        { name: "back", to: "drafting", when: ({ fields }) => fields.decision === "rejected" },
      ],
    },
    { name: "approved", title: "Approved" }, // no transitions: entering it completes the run
  ],
});
```

`defineWorkflow` validates the definition and throws one error listing every problem with its path (`stages[1].transitions[0].to: transition target "ready" is not a declared stage…`).

## Setup

Requires Payload 3.84+, Next.js 15 or 16 and React 19; `zod` (3.25+ or 4) only for the agent tools.

```bash
pnpm add @focus-reactive/payload-plugin-workflows
```

```ts
// payload.config.ts
import { workflowsPlugin } from "@focus-reactive/payload-plugin-workflows";
import { editorialReview } from "./workflows/editorialReview";

export default buildConfig({
  plugins: [
    workflowsPlugin({
      workflows: [editorialReview],
      effects: { "notify-author": async ({ payload, instance }) => payload.logger.info(instance.subject?.title) },
    }),
  ],
});
```

Then run `pnpm payload generate:importmap`, and on SQL databases without `push` create a migration (the plugin adds the `workflow-instances` collection).

The plugin adds, to each collection a workflow names, the indicator (`admin.components.edit.beforeDocumentControls`) and the hooks; it adds no fields to them. It also adds the runs collection, the endpoints, two jobs tasks, the **Workflows** view at `/admin/workflows` (a Payload-style list of what waits on you or of all open workflows, or a board of one workflow's stages) and the admin strings.

To try it: save a page, press **Workflow** next to Save, start **Editorial review**, **Submit for review**, **Take this review**, and press Publish: it is refused with the guard's title. **Approve** completes the run and publishing goes through.

## Concepts

- **Stage.** Where a run is. Its task is a list of `actions`, with optional `assignee` and `roles`. A stage without `transitions` is terminal: entering it completes the run.
- **Action.** The only thing that changes a run. It may write fields (`set`, an object or a function of the context), mark the stage's task finished (`status: "done" | "skipped" | "failed"`), ask the caller for input (`params`: `string`, `text`, `number`, `boolean`, `date`, `select`), narrow who may fire it (`roles`, `filter`) and queue effects. An action with `when` is **automatic**: the engine fires it as soon as the condition holds, at most once per stage visit, and nobody can call it.
- **Transition.** After every change the current stage's transitions are checked in order, and the first whose `when` holds moves the run. Without `when` a transition opens once the stage's task is done or skipped. This repeats until nothing moves (at most 50 steps, against definitions that loop).
- **Run and fields.** The run's own state, never written to the document. Field types: `string`, `text`, `number`, `boolean`, `date`, `user`, `json`; every write is type-checked (`invalid-patch` otherwise) and `null` unsets. `initialValue` seeds a field; only fields with `input: true` may be passed when starting (`startWorkflow({ fields })`).
- **Guard.** While a run is in the stage, the listed operations on the document (`publish`, `update`, `delete`) are refused with the guard's title, unless its `unless` condition holds. It is enforced in collection hooks, so it holds for the admin, REST, GraphQL and the Local API. `publish` needs drafts on the collection (the plugin refuses the config otherwise) and covers publishing a draft and any non-draft save of a published document; moving to the trash counts as `delete`. To let one write through, for example an effect that publishes, pass `context: { [WORKFLOW_BYPASS]: true }` on that Local API call (never on a shared `req`).
- **Effect.** A handler registered under `effects`, run as a Payload job queued in the same transaction as the change. It gets `{ payload, req, instance, doc, effect }` and may return `{ set }` to write fields and move the run. Jobs are retried, so a handler runs at least once and may run again: make it idempotent.
- **Assignment.** If the `assignee` field holds a user, only that user may act. Otherwise anyone with one of the `roles` may, or anyone at all without roles. Roles come from `user.roles` or `user.role` unless you pass `roles`.
- **Conditions** (`when`, `unless`, `filter`) are synchronous functions of `{ fields, activities, allActivitiesDone, anyActivityFailed, doc, now, stage }`; `doc` is the latest draft. A `filter` also sees the caller (`actor`, `roles`, `assigned`). A condition that throws fails the operation and nothing is written.
- **Start.** `start: "manual"` (default) offers a Start button; `"onCreate"` or `{ on: "create", when }` starts a run when a document is created. A document runs at most one active run of a workflow.

**Activities: when a stage has several parallel tasks.** Instead of `actions`, a stage may declare `activities: [{ name, title, assignee, roles, filter, actions }]`, each finished separately by an action's `status`; the default transition waits for all of them. An activity's `filter` is evaluated on entering the stage, and `false` skips it. Plain stage `actions` are exactly one activity named after the stage, so the two forms behave the same; a stage uses one or the other. When firing an action in a stage with several activities, name the activity.

## Options

| Option | Default | What it does |
|---|---|---|
| `workflows` | — | The workflows. Names must be unique; their collections must exist |
| `effects` | `{}` | Effect handlers by name; every effect an action names must be registered |
| `roles` | `user.roles` / `user.role` | `(user) => string[]`: a user's roles, for assignment |
| `access` | a user of the admin user collection | `{ start?, fire?, abort? }`, each `({ req, user, workflow, collection, id, doc }) => boolean`. `user` is the user the operation acts for; only `true` allows |
| `enabled` | `true` | `false` leaves the config untouched |

## API

Every operation acts as `user`, which is required (`unauthorized` without one), and reads the document with that user's access: someone who cannot read a document can neither see nor move its workflow. `access` then decides who may start, fire and abort.

```ts
import { abortWorkflow, fireWorkflowAction, getWorkflowState, listWorkflowInstances,
  startWorkflow } from "@focus-reactive/payload-plugin-workflows";

const run = await startWorkflow(payload, { workflow: "editorial-review", collection: "pages", id, user });
await fireWorkflowAction(payload, { instanceId: run.id!, action: "submit", user });
await fireWorkflowAction(payload, { instanceId: run.id!, action: "reject", params: { reason: "Too long" }, user });
await abortWorkflow(payload, { instanceId: run.id!, reason: "Duplicate", user });
const { instances, available } = await getWorkflowState(payload, { collection: "pages", id, user });
const inbox = await listWorkflowInstances(payload, { scope: "mine", status: "active", user });
```

`fireWorkflowAction` takes `activity` only when the stage has several. The operations return an `InstanceView`: the stage, the stepper, the current actions with `allowed` and `reason` (from the same check `fire` runs, so an enabled button never fails for a reason the UI could have known), the guards holding, who it waits on (user ids and roles), the fields and the history. `listWorkflowInstances` leaves out runs on documents the caller cannot read, before paginating.

A refusal throws `WorkflowError` with a `code` (`isWorkflowError` narrows it): `unauthorized`, `not-allowed`, `invalid-params`, `invalid-patch`, `already-running`, `conflict`, `instance-not-active`, `activity-not-active`, `not-callable`, or `unknown-workflow` / `-instance` / `-subject` / `-stage` / `-activity` / `-action`. Concurrent changes to one run use optimistic locking: the loser re-runs on fresh state, and after three attempts it is `conflict`.

The same operations under your API route, for signed-in users (errors as `{ errors: [{ message, code }] }`; 401 / 403 / 400 / 404 / 409 by code):

| | |
|---|---|
| `GET /workflows/state?collection=&id=` | `getWorkflowState` |
| `POST /workflows/start` | `{ workflow, collection, id, fields? }` |
| `POST /workflows/fire` | `{ instanceId, action, activity?, params? }` |
| `POST /workflows/abort` | `{ instanceId, reason? }` |
| `GET /workflows/instances?scope=mine\|all&workflow=&status=&page=&limit=` | `listWorkflowInstances` |
| `GET /workflows/definitions` | the workflows with their stages |

**Agents.** `workflowAgentTools({ payload, user })` from `@focus-reactive/payload-plugin-workflows/agent` returns AI-SDK-shaped tools (`{ description, inputSchema, execute }`): `workflows_list_definitions`, `workflows_list_instances`, `workflows_get_state`, `workflows_start`, `workflows_fire_action`. They act as `user`, the history records `via: "agent"`, and they return `{ error, code }` instead of throwing. With `payload-content-agent`: `customTools: (ctx) => workflowAgentTools(ctx)`.

**Testing.** `createWorkflowSimulator(definition, { doc })` runs a definition in memory on the same engine, without Payload: `sim.fire("submit", { user: "ann" })`, `sim.fire("reject", { user: "bea", roles: ["editor"], params: { reason: "Too long" } })`, then assert on `sim.state.stage`, `sim.view(caller)`, `sim.effects`. It also has `setDoc(doc)`, `advance(date)`, `patch(fields)` and `abort()`.

**Conditions that read `now`.** The plugin re-checks a document's runs on every save, but nothing re-checks them as time passes. If a condition reads `now`, call `tickWorkflows(payload)` from your own schedule, or queue the `workflowTick` task on one; it settles every active run.

## How it is built

Read in this order:

1. `src/types.ts`: the vocabulary (definition, run state, view).
2. `src/define.ts`: `defineWorkflow`: validation, and plain stage `actions` turned into one activity.
3. `src/engine/engine.ts`: the pure engine: `start`, `fire`, `abort`, and `settle` (the cascade). No Payload.
4. `src/engine/view.ts`: what a caller sees and may do, from the same verdict as `fire`.
5. `src/server/operations.ts`: start, fire, abort and settle against Payload: access, the document, the answer.
6. `src/server/store.ts`: the runs collection and its two writes (create, compare-and-swap update), with effects queued in the same transaction.
7. `src/server/effects.ts`: the effect job. `src/hooks.ts`: guards and settle-on-save. `src/endpoints.ts`, `src/agent.ts`: the two ways in.

One action, from the button to the database: the drawer posts to `/workflows/fire` → `endpoints.ts` → `fireWorkflowAction` in `server/operations.ts` reads the run and the document as the user and checks `access.fire` → `mutateRun` in `server/store.ts` loads the run and calls `fire` in `engine/engine.ts`, which checks the verdict and params, applies the action and settles → the new state is written only if `revision` is unchanged, with its effect jobs → the operation runs the effects if it owns the commit and answers with the view.

## Known limits

- **Effects inline or queued.** An effect runs right after its change commits, in the same request, when that change owned its transaction or there was none. Otherwise (a Local API call given a `req` with an open transaction; a save that settles or starts a run while database transactions are on) its job waits for a jobs runner on the `workflows` queue: configure `jobs: { autoRun: [{ queue: "workflows" }] }`. The plugin warns once at startup if effects are declared and nothing covers the queue. With `jobs.runHooks: true`, Payload 3.90 fails to record a successful task, so the job can run again.
- **Changing a definition.** Runs follow the definition in code. A run whose stage was removed is **stuck** and can only be aborted; an activity added to the current stage is active at once, one removed no longer holds it.
- **Inside a save's transaction** the hooks' writes have no savepoint. If one of them fails in the database (Postgres aborts the whole transaction on any statement error), or a Payload operation they call throws (Payload then rolls back the request's transaction, on any adapter with transactions on), the plugin logs it and the save still reports success, but the save's own changes are rolled back. Under normal load this does not happen: concurrent writers are refused by `revision` and retried, not errored. SQLite can reuse a deleted document's id, so an old run can end up on a new document. Serialization failures under stricter isolation levels are not retried.
- **Not in the model** (compared with Sanity Workflows, which it follows): conditions are TypeScript, not GROQ; no subworkflows, partitions or reader models.

## License

MIT
