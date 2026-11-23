# @focus-reactive/payload-plugin-workflows

[![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-workflows)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-workflows)

Editorial workflows for [Payload CMS](https://payloadcms.com/): draft → review → approve, or any process you describe, defined in TypeScript next to your collections. Editors move a document through it from a small indicator next to Save and Publish, which opens a drawer with everything else. Agents move it with the same operations, and the same permissions, through a set of tools. Every run keeps its state and a full audit history in a collection of its own, never in the document.

The model is a port of [Sanity Workflows](https://www.sanity.io/workflows). It uses the same vocabulary (workflow, stage, activity, action, transition, field, guard, effect) and the same semantics, so their guides transfer. The differences are listed under [Good to know](#good-to-know).

## What it does

- **Workflow indicator and drawer** on every document a workflow runs on. Next to Save and Publish, one compact button says where the document is: the current stage with a dot that marks whether it waits on you (or a guard holds the document), on someone else, or is stuck; "Workflow" when nothing runs but something can be started; nothing at all otherwise. Clicking it opens a drawer — no navigation, so unsaved changes in the form stay — with the stage stepper and who the run waits on, the guards holding, the current activities with one button per action (a disabled button says why), the history and, last, abort behind a confirmation. An action that needs input (a reason, a date, a choice) opens a small form in a nested drawer first. A reviewer approves in two clicks: the indicator, then **Approve**.
- **History as a timeline.** One line per step, newest first and grouped by day: time, a dot and a name that tell a person, a person through the API, an AI agent ("Ann via agent") and the workflow itself ("Automated") apart, then what happened ("Request changes → moved to Drafting"). The automatic steps an action caused (transitions, automatic actions, effects) fold under it; an action's inputs, such as the reason changes were requested, stay visible under its line.
- **Guards that hold for every writer.** A stage can refuse publishing, saving or deleting the document while a run sits in it. The refusal is enforced in collection hooks, so it applies to the admin, REST, GraphQL and the Local API alike. The indicator and the drawer show each guard that is holding, so an editor knows why Publish was refused.
- **Workflows view** at `/admin/workflows`, linked from the nav. **For me** lists the runs waiting on you or one of your roles. **All open** lists every active run. Pick a workflow to get a board with one column per stage.
- **Effects.** An action can trigger server code (notify someone, call an LLM, ping an approval service) as a Payload job, queued in the same transaction as the state change. The job is retried on failure, so a handler may run more than once: make it idempotent. A handler can report back by returning `{ set }`, which moves the run.
- **Agents.** `workflowAgentTools()` gives AI-SDK-shaped tools that list, inspect, start and advance runs as a given user. The history records that an agent did it.
- **Testable definitions.** `createWorkflowSimulator()` runs a definition in memory, so you can test every path in a unit test before an editor sees it.

## Requirements

- Payload **3.84** or later, Next.js 15 or 16, React 19.
- `zod` (3.25+ or 4) only if you use the agent tools.

## Setup

### 1. Install

```bash
pnpm add @focus-reactive/payload-plugin-workflows
```

### 2. Define a workflow

```ts
// src/workflows/editorialReview.ts
import { defineWorkflow } from "@focus-reactive/payload-plugin-workflows";
import type { EffectHandler } from "@focus-reactive/payload-plugin-workflows";

export const editorialReview = defineWorkflow({
  name: "editorial-review",
  title: "Editorial review",
  description: "Draft, review and approve a page before it is published.",
  collections: ["pages"],
  initialStage: "drafting",
  fields: [
    { name: "reviewer", type: "user", title: "Reviewer" },
    { name: "decision", type: "string" },
    { name: "reason", type: "text" },
  ],
  stages: [
    {
      name: "drafting",
      title: "Drafting",
      activities: [
        {
          name: "write",
          title: "Write the page",
          actions: [{ name: "submit", title: "Submit for review", status: "done" }],
        },
      ],
      // No `when`: leaves as soon as every activity is done.
      transitions: [{ name: "to-review", to: "review" }],
    },
    {
      name: "review",
      title: "Review",
      guards: [
        {
          name: "hold-publish",
          title: "Publishing is held until review is approved",
          operations: ["publish"],
        },
      ],
      activities: [
        {
          name: "review",
          title: "Review the page",
          assignee: "reviewer", // once set, only that user may act
          roles: ["editor"], // until then, anyone with this role
          actions: [
            // Automatic: fires on entering the stage, clears a previous round's decision.
            { name: "reset", when: () => true, set: { decision: null, reason: null } },
            {
              name: "claim",
              title: "Take this review",
              filter: ({ fields }) => !fields.reviewer,
              set: ({ actor }) => ({ reviewer: actor.id }),
            },
            {
              name: "approve",
              title: "Approve",
              status: "done",
              set: { decision: "approved" },
              effects: ["notify-author"],
            },
            {
              name: "reject",
              title: "Request changes",
              status: "done",
              params: [{ name: "reason", type: "text", title: "Reason", required: true }],
              set: ({ params }) => ({ decision: "rejected", reason: params.reason }),
            },
          ],
        },
      ],
      transitions: [
        { name: "approved", to: "approved", when: ({ fields }) => fields.decision === "approved" },
        { name: "back", to: "drafting", when: ({ fields }) => fields.decision === "rejected" },
      ],
    },
    // No transitions: terminal. Entering it completes the run.
    { name: "approved", title: "Approved" },
  ],
});

export const notifyAuthor: EffectHandler = async ({ payload, instance, doc }) => {
  payload.logger.info(`"${instance.subject?.title}" was approved`);
  // return { set: { … } } to write workflow fields and move the run
};
```

`defineWorkflow` validates the definition and throws one error listing every problem it found, each with its path (`stages[1].transitions[0].to: transition target "ready" is not a declared stage…`).

### 3. Register the plugin

```ts
// payload.config.ts
import { workflowsPlugin } from "@focus-reactive/payload-plugin-workflows";
import { editorialReview, notifyAuthor } from "./workflows/editorialReview";

export default buildConfig({
  plugins: [
    workflowsPlugin({
      workflows: [editorialReview],
      effects: { "notify-author": notifyAuthor },
    }),
  ],
});
```

The plugin adds the indicator (in `admin.components.edit.beforeDocumentControls`) and the hooks to the collections your workflows name; it adds no fields to them. It also adds the `workflow-instances` collection, the endpoints, two jobs tasks, the view with its nav link, and the admin strings.

### 4. Regenerate the import map

```bash
pnpm payload generate:importmap
```

### 5. Migrate (SQL databases)

The plugin adds the `workflow-instances` collection. On Postgres or SQLite without `push`, create and run a migration as for any new collection.

### 6. Try it

Save a page, press **Workflow** next to Save and Publish, and press **Start Editorial review** in the drawer. Then **Submit for review**, **Take this review**, and try **Publish changes**: it is refused with "Publishing is held until review is approved". **Approve** completes the run, and publishing goes through.

## Concepts

- **Workflow** — a named process over documents of the listed `collections`. A document runs at most one active run of a given workflow at a time. `start: "manual"` (default) shows a Start button. `"onCreate"` or `{ on: "create", when }` starts a run when a document is created.
- **Stage** — where a run is. A stage with no `transitions` is terminal: entering it completes the run. Terminal stages declare no activities.
- **Activity** — a piece of work in a stage. It is active from stage entry until an action resolves it `done`, `skipped` or `failed`. An activity `filter` is evaluated once on entry; `false` skips the activity.
- **Action** — the only thing that changes state. Without `when`, a person or agent fires it. With `when`, the engine fires it as soon as the condition holds, at most once per stage visit, and nobody can call it. An action may resolve its activity (`status`), write fields (`set`), ask for input (`params`: `string`, `text`, `number`, `boolean`, `date`, `select`), narrow who may fire it (`roles`, `filter`) and queue effects (`effects`).
- **Transition** — an edge to another stage. After every change the transitions of the current stage are checked in order, and the first whose `when` holds fires. The default `when` is "every activity is done or skipped". The cascade repeats until nothing changes, capped at 50 steps against definitions that loop.
- **Field** — the run's own state (`string`, `text`, `number`, `boolean`, `date`, `user`, `json`), not a document field. Conditions read fields; actions write them. Every write is type-checked: a `string`/`text` takes a string, a `number` a finite number, a `boolean` a boolean, a `date` an ISO date string, a `user` an id (a numeric id is stored as a string), a `json` anything JSON-serialisable; `null` unsets. Anything else is refused with `invalid-patch`. `initialValue` seeds a field at start. Only fields declared with `input: true` may be supplied by whoever starts a run (`startWorkflow({ fields })`); the rest are written by the workflow itself.
- **Guard** — while a run is in the stage, the listed operations on the document (`publish`, `update`, `delete`) are refused with the guard's title, unless its `unless` condition holds. `publish` needs drafts on the collection (the plugin refuses the config otherwise); it covers publishing a draft and any non-draft save of a published document. Moving a document to the trash counts as `delete`. To let one write through, for example an effect that publishes as part of the workflow, pass the flag as `context` on that Local API call: `payload.update({ …, context: { [WORKFLOW_BYPASS]: true } })`. Do not set it on a shared `req`: everything else using that `req` would skip the guards too.
- **Effect** — a handler registered under `effects` in the plugin options. It runs as a Payload job after the change that queued it has committed, and is retried on failure, so it runs at least once and may run again: make it idempotent. It gets `{ payload, req, instance, doc, effect }` and may return `{ set }`.
- **Assignment** — an activity may name an `assignee` (a `user` field) and/or `roles`. If the field holds a user, only that user may act. Otherwise anyone with one of the roles may act. With neither, anyone may act. An action's own `roles` and `filter` narrow this further. Roles come from `user.roles` (array) or `user.role` (string) unless you pass `roles`.

Conditions are plain synchronous functions of `{ fields, activities, allActivitiesDone, anyActivityFailed, doc, now, stage }`. `doc` is the latest draft of the document. Only an action's `filter` also sees the caller (`actor`, `roles`, `assigned`). The cascade itself acts for nobody in particular. A condition that throws fails the whole operation, and nothing is written.

## Options

| Option | Type | Default | What it does |
|---|---|---|---|
| `workflows` | `WorkflowDefinition[]` | — | The workflows. Names must be unique; the collections they list must exist |
| `effects` | `Record<string, EffectHandler>` | `{}` | Effect handlers by name. Every name an action lists must be registered here |
| `roles` | `(user) => string[]` | `user.roles` / `user.role` | A user's roles, for assignment |
| `access` | `{ start?, fire?, abort? }` | a user of the admin user collection | `({ req, user, workflow, collection, id, doc }) => boolean` — who may start a run, fire an action, abort a run. `user` is the user the operation acts for (not necessarily `req.user`); `doc` is the document as that user reads it. Only `true` allows |
| `tick` | `{ cron: string }` | — | Schedules the `workflowTick` task, which settles every active run with the current time. Needed only for conditions that read `now` |
| `instancesSlug` | `string` | `"workflow-instances"` | Slug of the runs collection |
| `overrides` | `{ access?, admin?, hooks?, fields? }` | — | Changes to the runs collection: `access`/`admin`/`hooks` are merged, `fields` maps the default fields. The collection is hidden in the admin by default |
| `translations` | `Record<locale, Partial<…>>` | — | Admin UI strings per locale, merged over the English defaults under the `workflows` namespace |
| `enabled` | `boolean` | `true` | `false` leaves the config untouched |

The runs collection can be read by users of the admin user collection (`admin.user`) and written by nobody over the API. State changes only through the plugin's operations, so the audit trail cannot be edited. Its `read` access (change it with `overrides.access.read`) also decides who may call `getWorkflowState` and `listWorkflowInstances`.

## Local API

All exported from the package root. Each one acts as `user`, which is required (a missing user throws `unauthorized`), and reads the document with that user's access: someone who cannot read a document can neither see nor move its workflow. On top of that, `access` (above) decides who may start, fire and abort; by default, users of the admin user collection.

```ts
import {
  startWorkflow,
  fireWorkflowAction,
  abortWorkflow,
  getWorkflowState,
  listWorkflowInstances,
  tickWorkflows,
} from "@focus-reactive/payload-plugin-workflows";

const run = await startWorkflow(payload, { workflow: "editorial-review", collection: "pages", id, user });
await fireWorkflowAction(payload, { instanceId: run.id!, activity: "write", action: "submit", user });
await fireWorkflowAction(payload, {
  instanceId: run.id!,
  activity: "review",
  action: "reject",
  params: { reason: "The intro needs a clearer offer." },
  user,
});
await abortWorkflow(payload, { instanceId: run.id!, reason: "Duplicate", user });

const { instances, available } = await getWorkflowState(payload, { collection: "pages", id, user });
const inbox = await listWorkflowInstances(payload, { scope: "mine", status: "active", user });
await tickWorkflows(payload); // { checked, advanced }
```

The operations return an `InstanceView`, the projection the drawer and the agents render. It holds the stage, the stepper, the current activities with each action's `allowed` and `reason` (from the same check that `fire` runs, so an enabled button never fails for a reason the UI could have known), the guards holding, who it waits on, the fields and the history. A disallowed action also has a `reasonCode`: `filter` (its own `filter` is false right now), `assignment`, `roles`, `not-active` or `error`. The drawer hides actions refused by their own `filter` and shows the others disabled with their reason. `getWorkflowState` and `listWorkflowInstances` also return `userLabels`: display names for the user ids they mention, read with the caller's access.

`listWorkflowInstances` leaves out runs whose document the caller cannot read. It does so before paginating, so `totalDocs` and `totalPages` count only the runs the caller can see. To do that it reads the matching runs as a slim list (id and document) and checks the documents in one query per collection, then loads only the requested page.

A refusal throws `WorkflowError` with a `code` (`isWorkflowError(error)` narrows it): `unauthorized`, `not-allowed`, `invalid-params`, `invalid-patch`, `already-running`, `conflict`, `instance-not-active`, `activity-not-active`, `not-callable`, or `unknown-workflow` / `-instance` / `-subject` / `-stage` / `-activity` / `-action`. Concurrent changes to one run are resolved with optimistic locking: the loser re-runs on fresh state, and after three attempts the error is `conflict`.

The package root also exports the types you need to write definitions and read runs: `WorkflowDefinition`, `StageDef`, `ActivityDef`, `ActionDef`, `TransitionDef`, `GuardDef`, `FieldDef`, `ParamDef`, `Condition`, `CallerCondition`, `ActionContext`, `Actor`, `HistoryEntry`, `InstanceState`, `InstanceView`, `InstanceSummary`, `EffectHandler`, `EffectHandlerArgs`, `WorkflowAccess`, `WorkflowAccessArgs` and `WorkflowErrorCode`.

## Endpoints

All under your API route, for signed-in users. Errors come back as `{ errors: [{ message, code }] }`.

| | |
|---|---|
| `GET /workflows/state?collection=&id=` | `getWorkflowState`: runs on the document, newest first, and the workflows that can be started |
| `POST /workflows/start` | `{ workflow, collection, id, fields? }` → `InstanceView`; `fields` only for `input: true` fields |
| `POST /workflows/fire` | `{ instanceId, activity, action, params? }` → `InstanceView` |
| `POST /workflows/abort` | `{ instanceId, reason? }` → `InstanceView` |
| `GET /workflows/instances?scope=mine\|all&workflow=&status=&page=&limit=` | `listWorkflowInstances` |
| `GET /workflows/definitions` | the configured workflows with their stages |

Status codes: no user 401, `not-allowed` 403, `invalid-params` / `invalid-patch` 400, `unknown-*` 404 (also a collection no workflow runs on), `conflict` / `already-running` / not-active 409.

## Agents

```ts
import { workflowAgentTools } from "@focus-reactive/payload-plugin-workflows/agent";

const tools = workflowAgentTools({ payload, user });
// workflows_list_definitions, workflows_list_instances, workflows_get_state,
// workflows_start, workflows_fire_action
```

Each tool is a plain `{ description, inputSchema, execute }` object with a zod schema, the shape the AI SDK expects. The plugin does not depend on `ai`. The tools act as `user`, with that user's permissions, and the history records `via: "agent"`. Like a person, an agent may pass start `fields` only for `input: true` fields. They return `{ error, code }` instead of throwing, so the agent can read a refusal and act on it.

With `payload-content-agent`, whose context carries `payload` and `user`:

```ts
customTools: (ctx) => workflowAgentTools(ctx),
```

## Testing

`createWorkflowSimulator` runs a definition in memory on the same engine as the server, without Payload or a database:

```ts
import { createWorkflowSimulator } from "@focus-reactive/payload-plugin-workflows";
import { expect, it } from "vitest";
import { editorialReview } from "./editorialReview";

it("sends a rejected page back to drafting with the reason", () => {
  const sim = createWorkflowSimulator(editorialReview, { doc: { title: "Hello" } });
  sim.fire("write", "submit", { user: "ann" });
  expect(sim.state.stage).toBe("review");
  expect(sim.view({ user: "ann" }).guards.map((g) => g.name)).toEqual(["hold-publish"]);

  sim.fire("review", "claim", { user: "bea", roles: ["editor"] });
  sim.fire("review", "reject", { user: "bea", roles: ["editor"], params: { reason: "Too long" } });
  expect(sim.state.stage).toBe("drafting");
  expect(sim.state.fields.reason).toBe("Too long");
});
```

The simulator also has `.setDoc(doc)` (as saving the document would), `.advance(date)` (as the tick would), `.patch(values)` (an effect reporting back), `.abort()`, `.effects` and `.view(caller)`.

## Good to know

- **Where the model differs from Sanity.** Conditions are TypeScript functions, not GROQ. Definitions live in code and are not deployed or versioned. Field writes are a single `set` (a patch, or a function returning one), not `ops`. Guards are enforced on the server for every writer, where Sanity's are advisory in Studio. Effects are Payload jobs, not Sanity Functions. There are no subworkflows, partitions or reader models.
- **Changing a definition.** Runs follow the definition currently in code. A run whose stage was removed is reported **stuck**: the indicator and the drawer say so, and it can only be aborted. The current stage's activities are read from the definition too: an activity removed from code no longer holds the stage, and one added while a run sits in the stage is active and can be acted on.
- **When effects run.** An effect runs inline, right after its change commits and in the same request, when that change committed its own transaction or there was none. Otherwise its job stays queued for the host's jobs runner on the `workflows` queue. That is the case when a Local API call passes a `req` that already carries a transaction (the jobs are not visible until the caller commits), and when a document save settles a run or auto-starts one while the database has transactions on (Postgres, MongoDB with a replica set, SQLite with `transactionOptions`). Without database transactions, those save effects run inline. An effect that fails inline also stays queued, with its retries. If your workflows declare effects, or set `tick`, and `jobs.autoRun` has no entry for the `workflows` queue, the plugin logs one warning at startup that says what will wait. Configure `jobs: { autoRun: [{ queue: "workflows" }] }` or another runner for that queue.
- **Effects are at least once.** A job is retried after a failure, and a handler can also run again if recording its outcome fails after it ran. With Payload's `jobs.runHooks: true` (some plugins set it), Payload 3.90 fails to record a successful task, so the job can run again. Write handlers that are safe to repeat.
- **The tick only fires if something runs it.** `tick: { cron }` attaches a schedule to the `workflowTick` task, but Payload only acts on schedules when `jobs.autoRun` covers the `workflows` queue. You can also call `tickWorkflows(payload)` from your own cron.
- **The document's state is not copied.** The run never writes to the document, and the document never stores its run. Conditions read the latest draft (`doc`), so a save can move a run. The plugin re-checks the active runs after every save.
- **Not handled yet.** When a save's hooks settle or start a run inside the save's transaction, those writes have no savepoint: on Postgres a database error in them fails the whole save, although the plugin catches it. SQLite can reuse the id of a deleted document, so an old run can end up pointing at a new document. Under isolation levels stricter than the database default, serialization failures are not retried.
- **Waiting on** lists user ids from the run. The API resolves them to display names (the user collection's `useAsTitle`, else the email) for callers who may read users, and the admin shows the id otherwise.

## License

MIT
