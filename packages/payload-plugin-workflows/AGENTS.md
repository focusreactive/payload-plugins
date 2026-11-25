# payload-plugin-workflows — for coding agents

## The model

1. A workflow is a list of stages; each stage has actions (or, for parallel tasks, activities) and transitions.
2. A document has a run: one row in `workflow-instances` with the current stage, the run's fields and what the engine needs to decide (activities, `visit`, `visited`, `nextSeq`). Its history is `workflow-events`: one row per entry, append-only, numbered per run (`seq`).
3. An action changes fields; after every change the engine settles: auto actions, then the first open transition, repeated.
4. A stage's guard refuses publish / update / delete of the document while a run sits in it.
5. People (endpoints) and agents (`agent.ts`) call the same operation: fire an action. An agent acts as the user behind its token, with that user's permissions, and is recorded as `via: "agent"`; a caller action with `agents: "deny"` is the one thing it may not do (like `roles`, caller actions only).

Plain stage `actions` are normalised once by `defineWorkflow` into one activity named after the stage. The engine only ever sees `activities`; do not add branches for the short form.

## Files, in reading order

- `src/types.ts`: vocabulary, run state, `InstanceView`.
- `src/define.ts`: `defineWorkflow`, validation (`definitionIssues`), normalisation.
- `src/vocabulary.ts`: client-safe helpers: `labelText` (per-language titles), `isKnownEvent`.
- `src/engine/engine.ts`: pure engine (no Payload): `start`, `fire`, `patchFields`, `abort`, `settle`, `recordEffect`, `recordBypass`, `verdictFor`, `holdingGuards`, `holdMessage` (the words of a hold, shared by the guard refusal and the UI), `mayAbort`. Every operation returns `{ state, effects, events }`: events numbered from `state.nextSeq`, the system's stamped with `env.cause`. Read bottom-up.
- `src/engine/view.ts`: `view(def, state, caller, env, { events, language })` (it is given the recent events; it never loads), `waitingOnOf`. `src/engine/simulator.ts`: in-memory runs for tests (events kept in memory).
- `src/server/operations.ts`: start / fire / abort / settle / tick against Payload; access; `presentRun`.
- `src/server/queries.ts`: `getWorkflowState` (active runs + the latest finished), `getWorkflowHistory` (a page of events before a `seq`, one indexed read, with the caller's access), `listWorkflowInstances`, `workflowBoards` (the widget's columns, counted), `listWorkflowDefinitions`. Every list is paginated, sorted and counted in the database with the caller's access.
- `src/server/store.ts`: runs collection config (with the endpoints, `runsCollection({ endpoints, components })`), `createRun`, `mutateRun` (compare-and-swap: one `UPDATE … WHERE revision` per attempt; only the winner then queues the effect jobs and inserts the events), `pruneWorkflows`. `src/server/events.ts`: events collection config, `toRow` / `eventOf` (known fields to columns, the rest to `detail`; `actorColumns` / `actorOf` are the one place an actor is stored), `insertEvents`, `readEvents`. `src/server/access.ts`: `readWorkflows`, the one read rule both collections call (cached per request; part 2 reworks it here). `src/assignees.ts`: the `assignees` column's `|u:<id>|r:<role>|` tokens. `src/server/transaction.ts`: whether a failed write ended the request's transaction.
- `src/server/effects.ts`: effect and tick jobs. `src/hooks.ts`: guards, auto-start, settle on save, abort on delete.
- `src/endpoints.ts`: REST. `src/agent.ts`: the agent way in: `workflowTools` (the five operations, each a description, a zod schema and what it runs as `ctx.user`, always `via: "agent"`), `runWorkflowTool` (parses input, refusals as `{ error, code }`), and the two surfaces over them: `workflowAgentTools` (AI-SDK) and `workflowMcpTools` (`@payloadcms/plugin-mcp` custom tools; the user is `req.user`, which the MCP plugin sets to the API key's user). The MCP plugin is not a dependency; its tool shape is mirrored structurally. `src/plugin.ts`: options, config checks, wiring.
- `src/components/`: admin UI. `document/`: indicator + drawer (client, REST endpoints). `widget/WorkflowsWidget.tsx`: the dashboard widget, a server component that calls `listWorkflowInstances` / `listWorkflowDefinitions` as the viewer; registered and placed in the default layout by `withWidget` in `plugin.ts`. `list/`: cells of the runs collection's list view (its admin config lives with the collection in `server/store.ts`; rows link to the document via `formatDocURL`). Client components are exported from `src/client.ts`, server ones from `src/rsc.ts`. Pure helpers in `components/shared/*.ts` are unit-tested; `RunTone` / `PILL_STYLE` in `shared/indicator.ts` is the one status-colour mapping every surface uses.

## Invariants: do not break

- Access: every public operation needs a real `user` (`unauthorized` otherwise); the subject document is read with that user's access (unreadable = `unknown-subject`); default `access` allows only users of the admin user collection, and by default (no `access.abort`) a run whose current stage has a holding guard may be stopped only by someone with an allowed action there (`mayAbort` in the engine, used by `presentRun`'s `canAbort` and `abortRun`); runs on unreadable documents never appear in lists or totals.
- Concurrency: every run write goes through `mutateRun` and requires the `revision` it read (pass the run you already read as its first attempt; never write without the `where` on `revision`); `activeKey` stays unique (one active run per workflow and document).
- History: events are inserted only by `createRun` / `mutateRun`, after the run's row, in the same transaction (`insertEvents`, each insert in `writing`); never updated; deleted only by `pruneWorkflows` with their run. `seq` is exact because only a compare-and-swap winner inserts, numbering from the `nextSeq` it read (unique on `run` + `seq`). Nothing reads a whole history: views get the latest `HISTORY_IN_VIEW`, pages go by `seq`. Consumers handle entry types they do not know (`isKnownEvent`; the timeline names them). The system's entries carry a `cause`; the engine never knows about collections.
- Effects are queued with the same `req`, inside the same transaction as the state change, and run inline only when the operation owns its commit (`canRunInline`).
- Guards are enforced in collection hooks (including trash = delete and publish detection without `_status`); `WORKFLOW_BYPASS` only via `req.context`, and a bypassed write a guard would have held records `guard-bypassed` on the run. `WORKFLOW_SKIP` skips the hooks' auto-start and settle only, never guards or abort-on-delete.
- `afterChange` / `afterDelete` hooks never fail a save because of workflow logic: the error is logged and the save goes on. The one exception: if the error ended the save's transaction (`transactionLost` in `server/transaction.ts`: `req.transactionID` gone or changed, the adapter's session gone, or one of the plugin's raw writes, wrapped in `writing`, failed inside it), the hook throws a 500 `APIError` ("The document was not saved…"), because the save is already rolled back. Wrap every new raw `payload.db.*` write in `writing`.
- `startWorkflow` given a caller's `req`: losing the `activeKey` race rolls back the caller's transaction (Payload's failed `create`); the `already-running` error then says so. The `isRunning` pre-check keeps that rare.
- Field writes are type-checked; only `input: true` fields may be passed at start; names that are `Object.prototype` members are rejected; params are read as own properties only.
- `fire` and `view` share one verdict (`verdictFor`): an enabled button never fails for a knowable reason. Its last check is `agents: "deny"` against `actor.via === "agent"` (`reasonCode: "agents"`, code `not-allowed`), after the checks that refuse everyone; so every view an agent gets must be built with its `via` (`presentRun(…, via)`, `getWorkflowState({ via })`), never a hard-coded one.
- The runs and events collections are not writable over the API. Their `read` access (`readWorkflows` in `server/access.ts`, the same function for both, constraining only the subject columns both carry) is admin-collection users only, constrained to runs on documents the subject collections' own `read` access allows (a per-document rule is resolved to at most `READABLE_IDS_CAP` ids, above which that collection's runs are hidden and logged once; nothing readable is a never-matching constraint, not `false`, so the plugin's reads return empty instead of `not-allowed`). So the admin list, REST, GraphQL, counts and the plugin's own reads (`listWorkflowInstances`, `workflowBoards`, `getWorkflowState`) drop runs on unreadable documents in the query itself: read runs with `overrideAccess: false` and the user, never filter readability in code. The resolved constraint is cached on `req.context` per user, so pass one request through an operation; over the cap the answers carry `hiddenCollections`.
- "For me" (`scope: "mine"`) is two counted queries over the denormalised `assignees` column (`contains` a `|u:<id>|` / `|r:<role>|` token): active runs waiting on the caller or their roles, then active runs with neither in a stage their workflow still has (open to anyone). No definition is evaluated per row.
- Effects: a job carries the stage and visit (`state.visit`: transitions taken) that queued it, and its outcome entry the job id; `recordEffect` applies its `set` only in that visit, else records it `stale`. Recording an outcome retries on its own (`RECORD_ATTEMPTS`); after a handler succeeded nothing may throw, or the job reruns it.
- Views carry the last `HISTORY_IN_VIEW` history entries and `olderHistory`; never send a whole history to the client.
- Provenance: every run write stamps `schemaVersion` (`SCHEMA_VERSION`); `definitionVersion` is stamped at start and never changed.
- Endpoints are the runs collection's (`/api/workflow-instances/…`); `ENDPOINTS` in `constants.ts` is what the client calls. `enabled: false` keeps the runs collection and the job tasks, nothing else.

## Verify

```bash
bunx turbo run build check-types test --filter=@focus-reactive/payload-plugin-workflows --force
bunx ultracite check packages/payload-plugin-workflows apps/dev/src/workflows apps/dev/src/integration/workflows
cd apps/dev && bun run check-types && npx vitest run -c vitest.integration.config.ts src/integration/workflows
cd apps/dev && bun run generate:importmap   # after changing component paths
```

The integration suite runs on SQLite by default. On Postgres (each spec file gets a fresh schema, dropped on teardown; `POSTGRES_TEST_URL` defaults to the `apps/dev` Docker Compose database):

```bash
cd apps/dev && DB_ADAPTER=postgres POSTGRES_TEST_URL=postgres://postgres:postgres@127.0.0.1:5432/wf_test npx vitest run -c vitest.integration.config.ts src/integration/workflows
```

`concurrency.int.test.ts` runs only there (SQLite cannot interleave writers): parallel fires, starts and a fire racing a save, 20 rounds each. Run it after touching `store.ts`, `operations.ts` or `hooks.ts`.

Build the plugin before running `apps/dev`. Do not bump `version` (semantic-release owns it).
