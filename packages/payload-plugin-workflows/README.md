# @focus-reactive/payload-plugin-workflows

[![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-workflows)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-workflows)

Editorial workflows for [Payload CMS](https://payloadcms.com/), defined in TypeScript next to your collections and run by editors and AI agents alike.

## The model

1. A **workflow** is a list of **stages**. Each stage has **actions** and **transitions**.
2. A document has a **run**: one record holding the current stage and the run's **fields**. Every step it takes is an **event**: one row of its **history**, append-only.
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

Then run `pnpm payload generate:importmap`, and on SQL databases without `push` create a migration (the plugin adds the `workflow-instances` and `workflow-events` collections).

The plugin adds, to each collection a workflow names, the indicator (`admin.components.edit.beforeDocumentControls`) and the hooks; it adds no fields to them. It also adds the runs collection, the endpoints, two jobs tasks, a dashboard widget and the admin strings. The components are referenced through the import map (`/client` for client components, `/rsc` for server ones), hence `generate:importmap`.

**On the dashboard**, a **Workflows** widget (Payload's modular dashboard, `admin.dashboard.widgets`): first *Waiting on you* (up to five documents waiting on you or one of your roles, then those open to anyone, each with its stage and how long it has waited), then a board per workflow with open documents (one column per stage, its count and the first three documents). It reads with the viewer's access, like the API below. Without a `defaultLayout` of yours it comes first, above Payload's collection cards; with one (an array, or a function) it is appended to it. Payload keeps a layout per user once they save one in the dashboard's edit mode; those users add **Workflows** from *Add* there (or *Reset layout*).

**The full list** is Payload's own list view of the runs collection, **Workflows** in the nav (for users of the admin user collection, each seeing only workflows on documents they may read): document, workflow, stage, status, who it waits on, last change, with Payload's filters and sorting. It is read-only (nobody can create, edit or delete a run) and a row opens its document, where the drawer shows and moves the workflow. The widget's *View all* opens it filtered to open workflows (`?where[status][equals]=active`).

To try it: save a page, press **Workflow** next to Save, start **Editorial review** and **Submit for review**; as another user, **Take this review** and press Publish: it is refused ("Publishing is on hold. A reviewer must approve this page first."). **Approve** completes the run and publishing goes through.

## Concepts

- **Stage.** Where a run is. Its task is a list of `actions`, with optional `assignee` and `roles`. A stage without `transitions` is terminal: entering it completes the run.
- **Action.** The only thing that changes a run. It may write fields (`set`, an object or a function of the context), mark the stage's task finished (`status: "done" | "skipped" | "failed"`), ask the caller for input (`params`: `string`, `text`, `number`, `boolean`, `date`, `select`), narrow who may fire it (`roles`, `filter`, `agents: "deny"` for a step only a person may take) and queue effects. An action with `when` is **automatic**: the engine fires it as soon as the condition holds, at most once per stage visit, and nobody can call it.
- **Transition.** After every change the current stage's transitions are checked in order, and the first whose `when` holds moves the run. Without `when` a transition opens once the stage's task is done or skipped. This repeats until nothing moves (at most 50 steps, against definitions that loop).
- **Run and fields.** The run's own state, never written to the document. Field types: `string`, `text`, `number`, `boolean`, `date`, `user`, `json`; every write is type-checked (`invalid-patch` otherwise) and `null` unsets. `initialValue` seeds a field: a value, or a function of the start (`({ actor, doc }) => value`, e.g. `actor.id` to hold who started it; unset when the system starts it); only fields with `input: true` may be passed when starting (`startWorkflow({ fields })`).
- **Guard.** While a run is in the stage, the listed operations on the document (`publish`, `update`, `delete`) are refused with what is on hold and the guard's title ("Publishing is on hold. A reviewer must approve this page first."), unless its `unless` condition holds. A workflow that starts on create is checked before the insert: creating a document already published is refused when the stage it would start in holds `publish`. It is enforced in collection hooks, so it holds for the admin, REST, GraphQL and the Local API. `publish` needs drafts on the collection (the plugin refuses the config otherwise) and covers publishing a draft and any non-draft save of a published document; moving to the trash counts as `delete`. To let one write through, see the two request flags below.
- **Effect.** A handler registered under `effects`, run as a Payload job queued in the same transaction as the change. It gets `{ payload, req, instance, doc, effect }` and may return `{ set }` to write fields and move the run. The `set` lands only while the run is still in the stage visit that queued the effect (`effect.stage`, `effect.visit`); if the run has moved on, or left and come back, the outcome is recorded as finished with its result ignored. A handler that throws is retried, so it runs at least once and may run again: make it idempotent. Recording a successful outcome retries on its own and never runs the handler again. With `jobs.enableConcurrencyControl: true` in your Payload config, the effects of one run are also run one at a time.
- **Assignment.** If the `assignee` field holds a user, only that user may act. Otherwise anyone with one of the `roles` may, or anyone at all without roles. Roles come from `user.roles` or `user.role` unless you pass `roles`.
- **Who takes part.** Only users of the admin user collection (`admin.user`). A `user` field, an assignee and an actor are ids of that collection. A user of any other auth collection (API clients, customers) is refused every operation and every read with `not-allowed`, whatever `access` returns: `access` can narrow who takes part, never widen it, so user 5 of `customers` is never mistaken for user 5 of `users`. An MCP plugin whose `userCollection` is another collection gets the same refusal on every workflow tool. Saves by such users still settle runs and pass guards as anyone's; the history records them as the system.
- **One locale.** A document has one run per workflow, judged in one locale: every condition (`when`, `filter`, `skipIf`, guard `unless`, `start.when`, `initialValue`, `visibility.fromDocument`) sees the document in the project's default locale, with Payload's usual fallback, whoever saves it in whichever locale. A save in another locale is read again in the default locale (only when a run is active, a workflow may start, or visibility values may have changed); a guard on a localized field is judged on its default-locale value. Editing a translation alone never moves a run.
- **Conditions** (`when`, `unless`, `filter`, `skipIf`) are synchronous functions of `{ fields, activities, allActivitiesDone, anyActivityFailed, doc, now, stage }`; `doc` is the latest draft. A `filter` also sees the caller (`actor`, `roles`, `assigned`). A condition that throws fails the operation and nothing is written.
- **Required to publish.** `requiredToPublish` on a workflow names the terminal stage (or stages) that approve, and makes the workflow a gate: **every publish of a document it covers needs a run of it that completed in one of those stages and that no publish has used yet**, and the publish uses it. `requiredToPublish: "approved"`, or `["approved", "approved-with-edits"]` for several approving endings; each must be a declared stage with no transitions (`true` / `false` are refused with a pointer to this form). A run that ended in another terminal stage (say `rejected`) counts as none. Refused otherwise, with what to do: no run or a stopped one, "Publishing requires a completed Editorial review. Start it from the Workflow button."; one in progress, "Publishing requires a completed Editorial review; it is in progress."; one that ended in a stage that does not approve, "The Editorial review ended without approval (Rejected). Publishing requires a new Editorial review; start it from the Workflow button."; the last one already used, "This version was approved and published; changes need a new Editorial review.". It uses the guards' publish detection (publishing a draft, creating a document published, a non-draft save of a published document); draft saves, autosave, unpublishing, trash and delete are never refused. The run records `published` and keeps the time (`publishedAt`). Several required workflows on one collection must all be completed, and are all used. The bypass flag lets a refused publish through and records `guard-bypassed` (guards `["requiredToPublish"]`) on the latest run, if there is one. Needs drafts on the collection (the plugin refuses the config otherwise). The indicator and the drawer say "Required before publishing", "Approved — ready to publish" (the indicator: "Ready to publish") or, once used, that further changes need a new workflow; a run that ended without approval shows as completed in the drawer, with a quiet note that it does not allow publishing, and the indicator is back to "Required before publishing"; Payload's Publish button stays as it is and a refused publish shows the message above.
- **Start.** Without `start` a person (or agent) starts a run from the drawer or the API. `start: { on: "create", when?: ({ doc }) => boolean }` starts one when a document is created (and `when`, if given, holds for it). A document runs at most one active run of a workflow.
- **Titles and descriptions** (of the workflow, stages, activities, actions, transitions, guards, fields and params) are a string or one per admin language, like Payload's static labels: `title: { en: "Review", de: "Prüfung" }`. Views resolve them for the request's language, else English, else the first given.
- **Free text is bounded.** A `string` or `text` param takes at most 5,000 characters (`TEXT_MAX_LENGTH`), or its own `maxLength`; a stop reason at most 5,000. Longer input is refused with `invalid-params`: it would be kept in the history for good.
- **Version.** Each run is stamped with the definition version it started from: `version` if you declare one (a string or number), else a short hash of the definition's structure (names of stages, activities, actions, transitions and fields, transition targets, field types; not titles, descriptions or functions). When the code's version differs from a run's, the drawer says so in one quiet line.

**Activities: when a stage has several parallel tasks.** Instead of `actions`, a stage may declare `activities: [{ name, title, assignee, roles, skipIf, actions }]`, each finished separately by an action's `status`; the default transition waits for all of them. An activity's `skipIf` is evaluated once, on entering the stage: `true` skips it for that visit (an action's `filter`, by contrast, decides every time whether a caller may fire it). Plain stage `actions` are exactly one activity named after the stage, so the two forms behave the same; a stage uses one or the other. When firing an action in a stage with several activities, name the activity.

## Options

| Option | Default | What it does |
|---|---|---|
| `workflows` | — | The workflows. Names must be unique; their collections must exist |
| `effects` | `{}` | Effect handlers by name; every effect an action names must be registered |
| `roles` | `user.roles` / `user.role` | `(user) => string[]`: a user's roles, for assignment |
| `access` | every user of the admin user collection | `{ start?, fire?, abort? }`, each `({ req, user, workflow, collection, id, doc, stage?, activity?, action?, run? }) => boolean`. `user` is the user the operation acts for; only `true` allows. `fire` also gets the run's `stage`, the `activity` (named, or the stage's only one), the `action` and the `run` (`{ id, fields }`); `abort` the `stage` and `run`. Without `abort`: while a guard holds, only someone who may act in the stage may stop the run, so stopping is never a way around a hold |
| `visibility` | — | `{ fields, fromDocument, read }`: who sees which workflows, from facts kept on the runs. See *Visibility and multi-tenancy* |
| `dashboard` | `true` | `false` leaves the dashboard alone (no widget) |
| `enabled` | `true` | `false` keeps the runs collection (its data and schema) and the job tasks, so queued effects still run; it leaves out the hooks and guards, the endpoints, the admin components and the widget |

## API

Every operation acts as `user`, which is required (`unauthorized` without one), and reads the document with that user's access: someone who cannot read a document can neither see nor move its workflow. `access` then decides who may start, fire and abort.

```ts
import { abortWorkflow, fireWorkflowAction, getWorkflowHistory, getWorkflowState,
  listWorkflowInstances, startWorkflow } from "@focus-reactive/payload-plugin-workflows";

const run = await startWorkflow(payload, { workflow: "editorial-review", collection: "pages", id, user });
await fireWorkflowAction(payload, { instanceId: run.id!, action: "submit", user });
await fireWorkflowAction(payload, { instanceId: run.id!, action: "reject", params: { reason: "Too long" }, user });
await abortWorkflow(payload, { instanceId: run.id!, reason: "Duplicate", user });
const { instances, available } = await getWorkflowState(payload, { collection: "pages", id, user });
const inbox = await listWorkflowInstances(payload, { scope: "mine", status: "active", user }); // waiting on you first, then open to anyone
const older = await getWorkflowHistory(payload, { instanceId: run.id!, before: run.olderHistory + 1, user }); // { entries, older }
```

`fireWorkflowAction` takes `activity` only when the stage has several. The operations return an `InstanceView`: the stage, the stepper (each stage `current`, `visited` or `unvisited` in this run) with `allowed` and `reason` (from the same check `fire` runs, so an enabled button never fails for a reason the UI could have known), the guards holding, who it waits on (user ids and roles), whether the caller may stop it (`canAbort`), the fields, who started it (`started`), the definition version it started from and whether the code's differs (`definitionVersion`, `definitionChanged`), and the most recent 50 history entries (`history`), with the count of older ones (`olderHistory`). Entries are numbered per run (`seq`: 1, 2, … without gaps), so `getWorkflowHistory({ before: seq })` reads the page before any entry, one indexed read whatever the history's length. `getWorkflowState` returns a document's active runs and its latest finished one. `listWorkflowInstances` pages, sorts and counts in the database, with the caller's read access, so runs on documents the caller cannot read are neither listed nor counted. The reads take the caller's `req` (`{ …, req }`) so access rules that read its headers or cookies see them. Without `visibility`, when runs are hidden because a per-document read rule allows more than 5,000 documents, the answer says so in `hiddenCollections`. With a workflow `requiredToPublish` on the collection, `getWorkflowState` also answers `publish: { clear, reason? }` (the check a publish would get), the runs carry `requiredToPublish` (the approving stage names: a completed run whose `stage` is not among them does not allow publishing) and `publishedAt`, and `available` entries `requiredToPublish`.

A refusal throws `WorkflowError` with a `code` (`isWorkflowError` narrows it): `unauthorized`, `not-allowed`, `invalid-params`, `invalid-patch`, `already-running`, `conflict`, `instance-not-active`, `activity-not-active`, `not-callable`, or `unknown-workflow` / `-instance` / `-subject` / `-stage` / `-activity` / `-action`. Concurrent changes to one run use optimistic locking: the loser re-runs on fresh state, and after three attempts it is `conflict`.

The same operations under your API route, for signed-in users (errors as `{ errors: [{ message, code }] }`; 401 / 403 / 400 / 404 / 409 by code):

| | |
|---|---|
| `GET /workflow-instances/state?collection=&id=` | `getWorkflowState` |
| `GET /workflow-instances/history?instanceId=&before=&limit=` | `getWorkflowHistory` |
| `POST /workflow-instances/start` | `{ workflow, collection, id, fields? }` |
| `POST /workflow-instances/fire` | `{ instanceId, action, activity?, params? }` |
| `POST /workflow-instances/abort` | `{ instanceId, reason? }` |

They are endpoints of the runs collection, so a collection of your own cannot shadow them.

Runs themselves are readable over Payload's own REST and GraphQL API for the `workflow-instances` collection (admin users only). Its `read` access, like the list view, shows a caller only the runs they may see (see below).

### Visibility and multi-tenancy

**Without configuration** a run is visible to whoever may read its document: each subject collection's own `read` access decides (`false`: none of its runs; `true`: all; a query constraint, i.e. a per-document rule: the runs on the ids it allows, resolved once per request with one query of at most 5,000 ids; above that the collection's runs are hidden from that user, a warning is logged once, and the plugin's lists, document state and dashboard widget say that some workflows are hidden). That is correct with nothing to set up, and fine for small sites.

**Configure `visibility`** when a subject collection has a per-document read rule over many documents, which is always the case with multi-tenancy (a tenant user's `read` is a query on the tenant). You say which facts about a document decide who may see its workflows, the plugin keeps them on the runs, and visibility is one ordinary Payload access rule over them, applied by the database: no ids resolved, no cap, no `hiddenCollections`.

```ts
visibility: {
  fields: [{ name: "tenant", type: "relationship", relationTo: "tenants", index: true }], // added to the runs, read-only
  fromDocument: ({ doc, collection, req }) => ({ tenant: doc.tenant }),                     // sync and pure; a populated relationship is stored as its id
  read: ({ req }) => …,                                                                       // a normal access function over those fields
}
```

- A run's values are written when it starts, and whenever a save changes them (or they differ from what the document's active runs hold) they are written to **every** run of the document, finished ones included, in the save's transaction. A save that changes nothing they depend on writes nothing more. They follow the save even with `WORKFLOW_SKIP`.
- They decide who sees the runs, so keeping them current is the one workflow failure that fails a save: if `fromDocument` throws for the saved document, or writing the new values fails, and the document has runs, the save is refused with a 500, "The document was not saved: its workflow visibility could not be updated…", and nothing of it is kept (a document without runs saves normally; the error is logged). A start whose `fromDocument` throws fails, and no run is created; for the automatic start on create, the document is saved without the run.
- A person's start reads the document again after inserting the run, in the same transaction, and corrects the run's values if the document moved meanwhile. Two transactions in flight at once (on Postgres, a move whose save has not committed when the start reads again, and whose sync ran before the run was inserted) can still leave the run with the previous values until the document's next save.
- Events follow their run: the events collection's `run` is a relationship, and `read` applies to events through it (`{ tenant: … }` reads `run.tenant`). Nothing is copied onto events, so they stay append-only.
- Runs are visible to a user of the admin user collection when the subject collection's `read` is not plainly `false` for them and `read` allows the run. `read` returning `false` shows nothing (an empty list, not a 403).
- `visibility` decides who **sees** runs and their history (lists, the widget, the runs list view, REST, GraphQL, counts). Acting is unchanged: starting, firing, stopping and the document's state still read the document with the caller's own access first, and `access` decides.
- Field names may not be one of the runs collection's own columns (checked at startup); each field needs a name.

With **`@payloadcms/plugin-multi-tenant`**, its `getTenantAccess` (from `@payloadcms/plugin-multi-tenant/utilities`) builds exactly the rule over the runs' own `tenant` field:

```ts
import { multiTenantPlugin } from "@payloadcms/plugin-multi-tenant";
import { getTenantAccess } from "@payloadcms/plugin-multi-tenant/utilities";

const allTenants = (user) => Boolean(user?.roles?.includes("super-admin"));

plugins: [
  workflowsPlugin({
    workflows,
    visibility: {
      fields: [{ name: "tenant", type: "relationship", relationTo: "tenants", index: true }],
      fromDocument: ({ doc }) => ({ tenant: doc.tenant }),
      read: ({ req: { user } }) => allTenants(user) || getTenantAccess({ fieldName: "tenant", user }),
    },
  }),
  multiTenantPlugin({ collections: { pages: {} }, userHasAccessToAllTenants: allTenants }),
];
```

Use a plain relationship field as above, and do not list `workflow-instances` or `workflow-events` in the multi-tenant plugin's `collections`: its tenant field takes its value from the editor's tenant cookie and validates the writer's tenants, while runs are written by the plugin from the document. Pass the same `userHasAccessToAllTenants` to both, as it is not part of `getTenantAccess`. What `visibility` does not do: it does not change who may read the documents themselves, does not filter by the tenant selected in the admin (the runs list shows all of a user's tenants), and does not decide who may act.

**History and audits.** A run's history is the `workflow-events` collection: one row per entry, inserted in the same transaction as the run's change (or not at all), never updated. Columns: `run` (a relationship to the run, never populated), `seq`, `type` (`started`, `action`, `transition`, `effect`, `completed`, `aborted`, `guard-bypassed`, `published`; a later version may add types: treat unknown ones as such, `isKnownEvent` narrows), `at`, `workflow`, `subjectCollection` / `subjectId` (copied, so an audit needs no join), `stage`, who (`actorId`, a user of the admin user collection, and `via`; none on the system's entries), `cause` (on the system's entries: `step` (a person's or agent's step in the same operation), `save`, `delete`, `start`, `tick`, `effect`), `activity`, `action`, `transition`, `toStage`, `effect`, `status` and `detail` (params, a reason, an error, the effect's Payload `job` id, who saved…). It is hidden from the admin nav and read-only over REST, GraphQL and the Local API, with the same rule as runs: an event is readable exactly when its run is. For example:

```ts
const events = (where: Where) => payload.find({ collection: "workflow-events", where, sort: "-at", user, overrideAccess: false });
// Who approved which page last month?
await events({ and: [{ workflow: { equals: "editorial-review" } }, { type: { equals: "action" } }, { action: { equals: "approve" } },
  { at: { greater_than_equal: "2026-10-01" } }, { at: { less_than: "2026-11-01" } }] }); // actorId, subjectId, at
// What was written past a hold (e.g. published without review)? `detail.operation` says which write.
await events({ type: { equals: "guard-bypassed" } });
// Everything agents did this week.
await events({ and: [{ via: { equals: "agent" } }, { at: { greater_than_equal: weekAgo } }] });
```

**Retention.** Nothing is deleted on its own: stopping a run, or deleting its document, keeps its history (the audit trail). `pruneWorkflows(payload, { finishedBefore: date })` deletes finished runs (completed or stopped) that finished before `date`, with their events, in batches of 200 runs, each in its own transaction, and returns `{ runs, events }`; active runs are never touched. Call it from your own schedule with the retention you need.

**Request flags**, set on a Local API call's `context` (never on a shared `req`): `context: { [WORKFLOW_BYPASS]: true }` lets the write through the guards, for example an effect that publishes as part of the workflow; when a guard would have held it, the run records a `guard-bypassed` entry with the operation and who wrote. `context: { [WORKFLOW_SKIP]: true }` makes the hooks neither start nor settle runs for that write (seeding, imports); guards still apply unless the bypass flag is set too, and deleting a document still stops its runs.

**Testing.** `createWorkflowSimulator(definition, { doc })` runs a definition in memory on the same engine, without Payload: `sim.fire("submit", { user: "ann" })`, `sim.fire("reject", { user: "bea", roles: ["editor"], params: { reason: "Too long" } })`, then assert on `sim.state.stage`, `sim.view(caller)`, `sim.events`, `sim.effects`. It also has `setDoc(doc)`, `advance(date)`, `patch(fields)` and `abort(reason, who?)`.

**Conditions that read `now`.** The plugin re-checks a document's runs on every save, but nothing re-checks them as time passes. If a condition reads `now`, call `tickWorkflows(payload)` from your own schedule, or queue the `workflowsPluginTick` task on one. It settles the active runs whose stage can move without a write (one with an automatic action or a transition with its own `when`), reading their documents a page at a time.

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
6. `src/server/store.ts`: the runs collection and its two writes (create, compare-and-swap update), each inserting the step's events and queueing its effects in the same transaction; `pruneWorkflows`. `src/server/events.ts`: the events collection. `src/server/access.ts`: the read rule of both collections (with or without `visibility`). `src/server/visibility.ts`: the runs' visibility values. `src/server/publishing.ts`: `requiredToPublish`.
7. `src/server/effects.ts`: the effect job. `src/hooks.ts`: guards and settle-on-save. `src/endpoints.ts`: REST. `src/agent.ts`: the five agent operations, once, as AI-SDK and MCP tools.
8. `src/components/`: the indicator and drawer (`document/`), the dashboard widget (`widget/`, a server component) and the list's cells (`list/`).

One action, from the button to the database: the drawer posts to `/workflow-instances/fire` → `endpoints.ts` → `fireWorkflowAction` in `server/operations.ts` reads the run and the document as the user and checks `access.fire` → `mutateRun` in `server/store.ts` calls `fire` on the run just read in `engine/engine.ts`, which checks the verdict and params, applies the action, settles and returns the new state with the step's events → the new state is written only if `revision` is unchanged, then its effect jobs and its events → the operation runs the effects if it owns the commit and answers with the view (the run and its latest 50 events).

## Known limits

- **Effects inline or queued.** An effect runs right after its change commits, in the same request, when that change owned its transaction or there was none. Otherwise (a Local API call given a `req` with an open transaction; a save that settles or starts a run while database transactions are on) its job waits for a jobs runner on the `workflows-plugin` queue: configure `jobs: { autoRun: [{ queue: "workflows-plugin" }] }`. The plugin warns once at startup if effects are declared and nothing covers the queue. With `jobs.runHooks: true`, Payload 3.90 fails to record a successful task, so the job can run again.
- **Jobs runners in parallel.** Payload 3.90 claims a job by reading it and then marking it, so two runner passes over the same queue at the same moment can both run a job; the handler then runs twice. One runner per queue avoids it.
- **"For me" matches tokens.** A role containing `|` is not supported; `%` and `_` in a role or id match like SQL wildcards, and matching is case-insensitive, so such a role may list a few runs too many (who may act is still checked exactly).
- **Changing a definition.** Runs follow the definition in code. A run whose stage was removed is **stuck** and can only be aborted; an activity added to the current stage is active at once, one removed no longer holds it.
- **Inside a save's transaction** the hooks' writes have no savepoint. A workflow error that does not touch the database (a condition that throws, a stuck run) is logged and the save succeeds; the exception is `visibility.fromDocument` throwing on a document with runs, which fails the save (see *Visibility and multi-tenancy*). If a run write fails in the database (Postgres aborts the whole transaction on any statement error), or a Payload operation the hook calls throws (Payload then rolls back the request's transaction, on any adapter with transactions on), the save's changes are already lost: the save fails with a 500, "The document was not saved: its workflow could not be updated…", and the cause is logged. Likewise `startWorkflow` with your `req` that loses a race for the same document rolls back your transaction, and its `already-running` error says so. Under normal load none of this happens: concurrent writers are refused by `revision` and retried, not errored. SQLite can reuse a deleted document's id, so an old run can end up on a new document. Serialization failures under stricter isolation levels are not retried.
- **Index names.** Payload names a compound index after its fields only, so on Postgres the events collection's `run_seq_idx` and `subjectCollection_subjectId_idx` share the schema's namespace with your collections' compound indexes; a collection of yours with a compound index on the same field names would clash.
- **`requiredToPublish` and Payload's other ways to publish.** Scheduled publishing runs as the user who scheduled it and goes through only if a completed, unused run exists when it fires (else the job fails with the refusal). Bulk publish from the list view checks and uses each document's run separately; the others fail with the message. Restoring a published version (not as a draft) is a publish; restoring one *as a draft* is also treated as a publish, because Payload hands the hooks the version's `published` status (the guards behave the same). Publishing one locale uses the approval: the next locale needs a new run. Duplicating a published document through the Local API without `_status: "draft"` creates it published, so it is refused (the admin's Duplicate makes a draft). Without database transactions, a publish that fails after the hook still used the run.
- **Not in the model** (compared with Sanity Workflows, which it follows): conditions are TypeScript, not GROQ; no subworkflows, partitions or reader models.

## Upgrading

Changes to the plugin's collections need a migration on Postgres and SQLite when you do not use schema push (`payload migrate:create`, then `payload migrate`):

- **Visibility, one locale, admin users, `requiredToPublish` (unreleased, before 1.0).** Stored shape: the runs collection gains `publishedAt` and the `visibility.fields` you configure; the events collection's `run` is a relationship to the run (`run_id`, a foreign key, instead of the text column `run`) and loses `actorCollection`. API: actors are `{ id, via }` and causes' `by` is `{ id }` (no `collection`: every actor is a user of the admin user collection); users of other auth collections are refused every operation, read and agent tool (`not-allowed`), whatever `access` says, and `access` callbacks no longer default to that check themselves; `workflows_list_definitions` needs a user too. New option `visibility`; new definition key `requiredToPublish` (the approving terminal stage name or names; `InstanceView.requiredToPublish` and `available[].requiredToPublish` are those names); new event type `published`; `InstanceState.publishedAt`; `InstanceView.publishedAt`; `WorkflowState.publish` and `available[].requiredToPublish`. Conditions always see the default locale (they saw the saving request's locale on saves). An event's `run` is the run's id as stored (a number on SQL), not text.

- **History as events (unreleased, before 1.0).** Stored shape: the runs collection loses its `history` column and gains `visit`, `visited`, `nextSeq`, `startedBy`, `schemaVersion`, and `definitionVersion`; a new collection `workflow-events` holds the history, one row per entry (unique on `run` + `seq`). There is no data migration: the package was not published with the old shape. API: `HistoryEntry` is now `WorkflowEvent` (`KnownWorkflowEvent | UnknownWorkflowEvent`; every entry has `seq` and the system's entries `cause`; an automatic action is an `action` entry whose actor is the system, no `auto` flag; a transition is `{ stage, transition, toStage }` instead of `{ from, to, transition }`; `completed` and `aborted` carry `stage`; effects carry `stage` and `job`; new type `guard-bypassed`). `getWorkflowHistory`'s `before` is an entry's `seq` (the page before a view: `olderHistory + 1`) and its `entries` are `WorkflowEvent`s. `InstanceView`: `stages[].state` is `current | visited | unvisited` (was `past | current | upcoming`), `started` is always set, new `definitionVersion`, `definitionChanged`; params carry resolved titles (`ViewParam`). Definitions: an activity's `filter` is `skipIf`, with the opposite sense (`true` skips); `start` is only `{ on: "create", when? }` (omit it for a manual start; `"manual"` and `"onCreate"` are gone); `version` is new; titles and descriptions may be per-language records; params take `maxLength`, and `string` / `text` params and stop reasons over 5,000 characters are refused. `access.fire` / `access.abort` get `stage`, `activity`, `action`, `run`. Effects' job input requires `stage` and `visit`. New exports: `pruneWorkflows`, `WORKFLOW_SKIP`, `EVENTS_SLUG`, `RUNS_SLUG`, `SCHEMA_VERSION`, `TEXT_MAX_LENGTH`, `isKnownEvent`, `KNOWN_EVENT_TYPES`, `labelText`, `definitionVersionOf`; the simulator has `events`.

- **Unreleased.** Who a run waits on is one indexed text column, `assignees` (`|u:<user id>|r:<role>|`), instead of the `assignedUsers` / `assignedRoles` lists (which lived in a `workflow_instances_texts` side table). There is a new index on `(subjectCollection, subjectId, status)`. In the generated migration, copy the lists over after the column is added and before the side table is dropped (Postgres; on SQLite use `group_concat`):

  ```sql
  UPDATE workflow_instances w SET assignees = '|' || t.tokens || '|'
  FROM (SELECT parent_id, string_agg(CASE path WHEN 'assignedUsers' THEN 'u:' ELSE 'r:' END || text, '|') AS tokens
        FROM workflow_instances_texts GROUP BY parent_id) t
  WHERE t.parent_id = w.id;
  ```

  The endpoints moved from `/api/workflows/*` to `/api/workflow-instances/*`; the queue is now `workflows-plugin` and the tasks `workflowsPluginEffect` / `workflowsPluginTick` (jobs queued under the old names are not run); the widget slug is `workflows-plugin` (someone who saved their own dashboard layout adds the widget again from the dashboard's edit mode).

## License

MIT
