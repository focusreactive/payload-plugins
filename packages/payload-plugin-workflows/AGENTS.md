# payload-plugin-workflows — for coding agents

## The model

1. A workflow is a list of stages; each stage has actions (or, for parallel tasks, activities) and transitions.
2. A document has a run: one row in `workflow-instances` with the current stage, the run's fields and its history.
3. An action changes fields; after every change the engine settles: auto actions, then the first open transition, repeated.
4. A stage's guard refuses publish / update / delete of the document while a run sits in it.
5. People (endpoints) and agents (`agent.ts`) call the same operation: fire an action.

Plain stage `actions` are normalised once by `defineWorkflow` into one activity named after the stage. The engine only ever sees `activities`; do not add branches for the short form.

## Files, in reading order

- `src/types.ts`: vocabulary, run state, `InstanceView`.
- `src/define.ts`: `defineWorkflow`, validation (`definitionIssues`), normalisation.
- `src/engine/engine.ts`: pure engine (no Payload): `start`, `fire`, `patchFields`, `abort`, `settle`, `verdictFor`, `holdingGuards`. Read bottom-up.
- `src/engine/view.ts`: `view()`, `waitingOnOf`. `src/engine/simulator.ts`: in-memory runs for tests.
- `src/server/operations.ts`: start / fire / abort / settle / tick against Payload; access; `presentRun`.
- `src/server/queries.ts`: `getWorkflowState`, `listWorkflowInstances`, `listWorkflowDefinitions`.
- `src/server/store.ts`: runs collection config, `createRun`, `mutateRun` (compare-and-swap), effect jobs.
- `src/server/effects.ts`: effect and tick jobs. `src/hooks.ts`: guards, auto-start, settle on save, abort on delete.
- `src/endpoints.ts`, `src/agent.ts`: the ways in. `src/plugin.ts`: options, config checks, wiring.
- `src/components/`: admin UI (indicator + drawer, workflows view). Pure helpers in `components/shared/*.ts` are unit-tested.

## Invariants: do not break

- Access: every public operation needs a real `user` (`unauthorized` otherwise); the subject document is read with that user's access (unreadable = `unknown-subject`); default `access` allows only users of the admin user collection; runs on unreadable documents never appear in lists or totals.
- Concurrency: every run write goes through `mutateRun` and requires the `revision` it read; `activeKey` stays unique (one active run per workflow and document).
- Effects are queued with the same `req`, inside the same transaction as the state change, and run inline only when the operation owns its commit (`canRunInline`).
- Guards are enforced in collection hooks (including trash = delete and publish detection without `_status`); `WORKFLOW_BYPASS` only via `req.context`.
- `afterChange` / `afterDelete` hooks never throw: a workflow bug must not break saving content.
- Field writes are type-checked; only `input: true` fields may be passed at start; names that are `Object.prototype` members are rejected; params are read as own properties only.
- `fire` and `view` share one verdict (`verdictFor`): an enabled button never fails for a knowable reason.
- The runs collection is not writable over the API.

## Verify

```bash
bunx turbo run build check-types test --filter=@focus-reactive/payload-plugin-workflows --force
bunx ultracite check packages/payload-plugin-workflows apps/dev/src/workflows apps/dev/src/integration/workflows
cd apps/dev && bun run check-types && npx vitest run -c vitest.integration.config.ts src/integration/workflows
cd apps/dev && bun run generate:importmap   # after changing component paths
```

Build the plugin before running `apps/dev`. Do not bump `version` (semantic-release owns it).
