# @focus-reactive/payload-plugin-workflows

[![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-workflows)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-workflows)

Editorial workflows for [Payload CMS](https://payloadcms.com/), defined in TypeScript next to your collections and run by editors and AI agents alike.

## The model

1. A **workflow** is a list of **stages**. Each stage has **actions** and **transitions**.
2. A document has a **run**: one record holding the current stage, the run's **fields** and its **history**.
3. An action changes fields. After every change the engine checks the stage's transitions and moves the run.
4. A stage's **guard** refuses publishing (or saving, or deleting) the document while a run sits in that stage.
5. A person and an agent do the same thing: **fire an action**, with the same permissions (unless the action is reserved for a person).

Editors see the run in a small indicator next to Save and Publish (a check and the final stage once it completed; just the dot or check on narrow screens). It opens a drawer laid out like Payload's document view: in the main column the stages, whose turn it is, what is on hold and the actions they may take (an action with params opens a short form in their place; when a person's step with params sent the run back, a banner says who and why); in the sidebar the key facts and the history. Stopping a workflow lives in the drawer's "⋮" menu, asks for confirmation and an optional reason. Status colours are the same everywhere: your turn (warning), in progress (neutral), completed (success), stopped (muted), stuck (error). Agents use the same operations through a set of tools.

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
    // Whoever starts the run: the author owns the drafting and never reviews their own work.
    { name: "author", type: "user", initialValue: ({ actor }) => actor.id },
    { name: "reviewer", type: "user" },
    { name: "decision", type: "string" },
    { name: "reason", type: "text" },
  ],
  stages: [
    {
      name: "drafting",
      title: "Drafting",
      assignee: "author",
      actions: [{ name: "submit", title: "Submit for review", status: "done" }],
      // No `when`: leaves once the stage's actions are done.
      transitions: [{ name: "to-review", to: "review" }],
    },
    {
      name: "review",
      title: "Review",
      guards: [{ name: "hold", title: "A reviewer must approve this page first.", operations: ["publish"] }],
      assignee: "reviewer", // once set, only that user may act
      roles: ["editor"], // until then, anyone with this role
      actions: [
        // Automatic (`when`): on entering the stage, clear the previous round's decision.
        { name: "reset", when: () => true, set: { decision: null, reason: null } },
        { name: "claim", title: "Take this review",
          filter: ({ actor, fields }) => !fields.reviewer && actor.id !== fields.author,
          set: ({ actor }) => ({ reviewer: actor.id }) },
        { name: "approve", title: "Approve", status: "done", set: { decision: "approved" },
          filter: ({ actor, fields }) => actor.id !== fields.author, effects: ["notify-author"] },
        { name: "reject", title: "Request changes", status: "done",
          filter: ({ actor, fields }) => actor.id !== fields.author,
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

The plugin adds, to each collection a workflow names, the indicator (`admin.components.edit.beforeDocumentControls`) and the hooks; it adds no fields to them. It also adds the runs collection, the endpoints, two jobs tasks, a dashboard widget and the admin strings. The components are referenced through the import map (`/client` for client components, `/rsc` for server ones), hence `generate:importmap`.

**On the dashboard**, a **Workflows** widget (Payload's modular dashboard, `admin.dashboard.widgets`): first *Waiting on you* (up to five documents waiting on you or one of your roles, then those open to anyone, each with its stage and how long it has waited), then a board per workflow with open documents (one column per stage, its count and the first three documents). It reads with the viewer's access, like the API below. Without a `defaultLayout` of yours it comes first, above Payload's collection cards; with one (an array, or a function) it is appended to it. Payload keeps a layout per user once they save one in the dashboard's edit mode; those users add **Workflows** from *Add* there (or *Reset layout*).

**The full list** is Payload's own list view of the runs collection, **Workflows** in the nav (for users of the admin user collection, each seeing only workflows on documents they may read): document, workflow, stage, status, who it waits on, last change, with Payload's filters and sorting. It is read-only (nobody can create, edit or delete a run) and a row opens its document, where the drawer shows and moves the workflow. The widget's *View all* opens it filtered to open workflows (`?where[status][equals]=active`).

To try it: save a page, press **Workflow** next to Save, start **Editorial review** and **Submit for review**; as another user, **Take this review** and press Publish: it is refused ("Publishing is on hold. A reviewer must approve this page first."). **Approve** completes the run and publishing goes through.

## Concepts

- **Stage.** Where a run is. Its task is a list of `actions`, with optional `assignee` and `roles`. A stage without `transitions` is terminal: entering it completes the run.
- **Action.** The only thing that changes a run. It may write fields (`set`, an object or a function of the context), mark the stage's task finished (`status: "done" | "skipped" | "failed"`), ask the caller for input (`params`: `string`, `text`, `number`, `boolean`, `date`, `select`), narrow who may fire it (`roles`, `filter`, `agents: "deny"` for a step only a person may take) and queue effects. An action with `when` is **automatic**: the engine fires it as soon as the condition holds, at most once per stage visit, and nobody can call it.
- **Transition.** After every change the current stage's transitions are checked in order, and the first whose `when` holds moves the run. Without `when` a transition opens once the stage's task is done or skipped. This repeats until nothing moves (at most 50 steps, against definitions that loop).
- **Run and fields.** The run's own state, never written to the document. Field types: `string`, `text`, `number`, `boolean`, `date`, `user`, `json`; every write is type-checked (`invalid-patch` otherwise) and `null` unsets. `initialValue` seeds a field: a value, or a function of the start (`({ actor, doc }) => value`, e.g. `actor.id` to hold who started it; unset when the system starts it); only fields with `input: true` may be passed when starting (`startWorkflow({ fields })`).
- **Guard.** While a run is in the stage, the listed operations on the document (`publish`, `update`, `delete`) are refused with what is on hold and the guard's title ("Publishing is on hold. A reviewer must approve this page first."), unless its `unless` condition holds. It is enforced in collection hooks, so it holds for the admin, REST, GraphQL and the Local API. `publish` needs drafts on the collection (the plugin refuses the config otherwise) and covers publishing a draft and any non-draft save of a published document; moving to the trash counts as `delete`. To let one write through, for example an effect that publishes, pass `context: { [WORKFLOW_BYPASS]: true }` on that Local API call (never on a shared `req`).
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
| `access` | a user of the admin user collection | `{ start?, fire?, abort? }`, each `({ req, user, workflow, collection, id, doc }) => boolean`. `user` is the user the operation acts for; only `true` allows. Without `abort`: while a guard holds, only someone who may act in the stage may stop the run, so stopping is never a way around a hold |
| `dashboard` | `true` | `false` leaves the dashboard alone (no widget) |
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
const inbox = await listWorkflowInstances(payload, { scope: "mine", status: "active", user }); // waiting on you first, then open to anyone
```

`fireWorkflowAction` takes `activity` only when the stage has several. The operations return an `InstanceView`: the stage, the stepper, the current actions with `allowed` and `reason` (from the same check `fire` runs, so an enabled button never fails for a reason the UI could have known), the guards holding, who it waits on (user ids and roles), whether the caller may stop it (`canAbort`), the fields and the history. `listWorkflowInstances` leaves out runs on documents the caller cannot read, before paginating.

A refusal throws `WorkflowError` with a `code` (`isWorkflowError` narrows it): `unauthorized`, `not-allowed`, `invalid-params`, `invalid-patch`, `already-running`, `conflict`, `instance-not-active`, `activity-not-active`, `not-callable`, or `unknown-workflow` / `-instance` / `-subject` / `-stage` / `-activity` / `-action`. Concurrent changes to one run use optimistic locking: the loser re-runs on fresh state, and after three attempts it is `conflict`.

The same operations under your API route, for signed-in users (errors as `{ errors: [{ message, code }] }`; 401 / 403 / 400 / 404 / 409 by code):

| | |
|---|---|
| `GET /workflows/state?collection=&id=` | `getWorkflowState` |
| `POST /workflows/start` | `{ workflow, collection, id, fields? }` |
| `POST /workflows/fire` | `{ instanceId, action, activity?, params? }` |
| `POST /workflows/abort` | `{ instanceId, reason? }` |

Runs themselves are readable over Payload's own REST and GraphQL API for the `workflow-instances` collection (admin users only). Its `read` access, like the list view, shows a caller only runs on documents they may read: each subject collection's own `read` access decides (`false`: none of its runs; `true`: all; a query constraint: the runs on the ids it allows, resolved with one query of at most 5,000 ids; above that the collection's runs are hidden from that user and a warning is logged once).

**Testing.** `createWorkflowSimulator(definition, { doc })` runs a definition in memory on the same engine, without Payload: `sim.fire("submit", { user: "ann" })`, `sim.fire("reject", { user: "bea", roles: ["editor"], params: { reason: "Too long" } })`, then assert on `sim.state.stage`, `sim.view(caller)`, `sim.effects`. It also has `setDoc(doc)`, `advance(date)`, `patch(fields)` and `abort()`.

**Conditions that read `now`.** The plugin re-checks a document's runs on every save, but nothing re-checks them as time passes. If a condition reads `now`, call `tickWorkflows(payload)` from your own schedule, or queue the `workflowTick` task on one; it settles every active run.

## Agents

An agent can do exactly what the user behind its token can do (same access rules, assignments, roles and filters as in the admin), and every step it takes is marked as an agent's in the history (`via: "agent"`). Five tools: `workflows_list_definitions`, `workflows_list_instances`, `workflows_get_state`, `workflows_start`, `workflows_fire_action`. They answer a refusal with `{ error, code }` instead of throwing. Two ways in, both from `@focus-reactive/payload-plugin-workflows/agent` (needs `zod`):

**AI-SDK tools**, for [`payload-content-agent`](https://www.npmjs.com/package/payload-content-agent) or any AI SDK agent; they act as `user`:

```ts
import { workflowAgentTools } from "@focus-reactive/payload-plugin-workflows/agent";

contentAgentPlugin({ customTools: (ctx) => workflowAgentTools(ctx) }); // ctx: { payload, user }
```

**MCP tools**, for any MCP client through [`@payloadcms/plugin-mcp`](https://payloadcms.com/docs/plugins/mcp); a call acts as the user the MCP API key belongs to:

```ts
import { workflowMcpTools } from "@focus-reactive/payload-plugin-workflows/agent";
import { mcpPlugin } from "@payloadcms/plugin-mcp";

plugins: [workflowsPlugin({ workflows }), mcpPlugin({ mcp: { tools: workflowMcpTools() } })];
```

Each tool appears under the API key's "Tools" settings (`workflowsListDefinitions`, …) on by default for a new key, and can be switched off per key. The result is the tool's answer as JSON text, with `isError: true` on a refusal.

**Reserving a step for a person.** `agents: "deny"` on a caller action makes it unavailable to agents, whoever's token they hold; people see no difference. An agent gets the action back from `workflows_get_state` as not allowed, with `reasonCode: "agents"` and "This step is reserved for a person.", and firing it is `not-allowed`. For example, the final approval:

```ts
{ name: "approve", title: "Approve", status: "done", agents: "deny", set: { decision: "approved" } }
```

## How it is built

Read in this order:

1. `src/types.ts`: the vocabulary (definition, run state, view).
2. `src/define.ts`: `defineWorkflow`: validation, and plain stage `actions` turned into one activity.
3. `src/engine/engine.ts`: the pure engine: `start`, `fire`, `abort`, and `settle` (the cascade). No Payload.
4. `src/engine/view.ts`: what a caller sees and may do, from the same verdict as `fire`.
5. `src/server/operations.ts`: start, fire, abort and settle against Payload: access, the document, the answer.
6. `src/server/store.ts`: the runs collection and its two writes (create, compare-and-swap update), with effects queued in the same transaction.
7. `src/server/effects.ts`: the effect job. `src/hooks.ts`: guards and settle-on-save. `src/endpoints.ts`: REST. `src/agent.ts`: the five agent operations, once, as AI-SDK and MCP tools.
8. `src/components/`: the indicator and drawer (`document/`), the dashboard widget (`widget/`, a server component) and the list's cells (`list/`).

One action, from the button to the database: the drawer posts to `/workflows/fire` → `endpoints.ts` → `fireWorkflowAction` in `server/operations.ts` reads the run and the document as the user and checks `access.fire` → `mutateRun` in `server/store.ts` loads the run and calls `fire` in `engine/engine.ts`, which checks the verdict and params, applies the action and settles → the new state is written only if `revision` is unchanged, with its effect jobs → the operation runs the effects if it owns the commit and answers with the view.

## Known limits

- **Effects inline or queued.** An effect runs right after its change commits, in the same request, when that change owned its transaction or there was none. Otherwise (a Local API call given a `req` with an open transaction; a save that settles or starts a run while database transactions are on) its job waits for a jobs runner on the `workflows` queue: configure `jobs: { autoRun: [{ queue: "workflows" }] }`. The plugin warns once at startup if effects are declared and nothing covers the queue. With `jobs.runHooks: true`, Payload 3.90 fails to record a successful task, so the job can run again.
- **Changing a definition.** Runs follow the definition in code. A run whose stage was removed is **stuck** and can only be aborted; an activity added to the current stage is active at once, one removed no longer holds it.
- **Inside a save's transaction** the hooks' writes have no savepoint. A workflow error that does not touch the database (a condition that throws, a stuck run) is logged and the save succeeds. If a run write fails in the database (Postgres aborts the whole transaction on any statement error), or a Payload operation the hook calls throws (Payload then rolls back the request's transaction, on any adapter with transactions on), the save's changes are already lost: the save fails with a 500, "The document was not saved: its workflow could not be updated…", and the cause is logged. Likewise `startWorkflow` with your `req` that loses a race for the same document rolls back your transaction, and its `already-running` error says so. Under normal load none of this happens: concurrent writers are refused by `revision` and retried, not errored. SQLite can reuse a deleted document's id, so an old run can end up on a new document. Serialization failures under stricter isolation levels are not retried.
- **Not in the model** (compared with Sanity Workflows, which it follows): conditions are TypeScript, not GROQ; no subworkflows, partitions or reader models.

## License

MIT
