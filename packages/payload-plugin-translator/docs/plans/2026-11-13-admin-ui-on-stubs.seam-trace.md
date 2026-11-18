## Seam trace — admin client on stubs

Source: [2026-11-13-admin-ui-on-stubs.design.md](./2026-11-13-admin-ui-on-stubs.design.md)
Saved: docs/plans/2026-11-13-admin-ui-on-stubs.seam-trace.md
Model: 9 parts · 5 seams (3 global) · 3 shared values
Confirmed by: the owner, with two answers (2026-11-13):
- the stub only imitates progress, in the simplest way, because it is removed later;
- the stub repeats the real server's admission rules: one live run per document, and cancel removes the whole run.
Lenses: contract, concurrency, ui-state (scenario choice); structure, evolution (growth) · stack packs: headless-cms
Runs: runtime + growth
Scenarios: 8 traced · kinds skipped:
- draft/publish leakage: the stub reads no drafts;
- webhook redelivery: none on these seams.
Growth axes: 3 traced (plus 1 found by the breaker) · 0 cut
Breaker: 7 breaks returned · 3 admitted (merged into findings 2, 3 and 6) · 4 dropped (listed below)

### The model

**Parts:**
- **Screens** (browser).
- **Entity data layer** (browser): hooks, keys, per-mount `QueryClient`, `TranslationRepository`.
- **Transport** (browser): `createRequest`, timeouts 15 s and 90 s, one error mapping.
- **Boot assembly** (server, once): endpoint registration and dedup, `deriveAbilities`, `serverProps`.
- **Stub module** (server, branch-only): handlers and `StubWorld`.
- **Real modules** (server): actions and provenance; no new reads until R9.
- **Host access guard** (server): fails closed on unknown actions.
- **Sandbox config** (`apps/dev`): stub or real; scenario at boot.
- **Contract suite** (vitest): three bindings; a real-handler binding is planned for step 13.

**Global seams:**
- G1 screens → data layer.
- G2 transport → server, as HTTP JSON under `{serverURL}{routes.api}/translate`.
- G3 boot → browser, through `serverProps` once per page load.

**Local seams:**
- S1 stub handlers → `StubWorld`.
- S2 contract suite → implementations, through `create(scenario)`.

**Shared state:**
- **`StubWorld`**: written by action handlers, read by read handlers. It reaches the browser only through polling (while a run is in flight) or a refresh after the browser's own mutation.
- **Query cache**: invalidated only by `useRefreshTranslation`.
- **Abilities**: computed once at boot from the action endpoints that registered.

**Promises, where the two columns differ:**
- **G1.** The screens assume a per-locale row with its own Translate, Cancel and Retry. The server works per run: one live run per document (`admitWork`), and one run covers several locales.
- **G2.** A second enqueue on a busy document answers 200 with the id under `busy`. The repository assumes "resolved = succeeded".
- **G3.** The screens assume "ability present ⇒ the server will serve it". The provider guarantees only "the action endpoint registered".
- **S2.** Suite cases are parameterised by `StubWorld` scenario names. Step 13 assumes the same suite binds to real handlers through the in-process router with a fake request.

**Growth axes:**
- a new action ("publish a locale", then "retranslate only unanswered");
- a new content state ("partial", then "acknowledged by hand");
- a new read screen (run history);
- a new host app (found by the breaker).

### Your worry

None given.

### Findings

#### 1. mismatch — a per-locale "Translate" on a document that already has a run does nothing, silently

- **Where:** Seam G2 → G1. Scenario T2, steps 2–4.
- **At that step:** es run `r1` is running. The user clicks Translate on fr. The server answers `200 {queued: 0, busy: ["42"], refused: []}`.
- **Guarantee:** "a second enqueue for a busy document answers 200 with the id under `busy`".
- **Assumption:** "an action that resolves succeeded".
- **Consequence:** fr stays `empty`. The button was enabled and pressed, and no message appears. The same happens to "Translate all" while any locale is queued or running.
- **Decision needed:** two questions.
  - Does the repository turn a `busy` answer into a rejection (`reason: "busy"`) or into a typed result the screen must read?
  - Do the screens disable per-locale actions while the document has a live run?
- **Who:** the owner for the screen behaviour; architecture, reopening D3, for the repository contract.

#### 2. mismatch — Cancel and Retry act on the whole run, while the screen shows them per locale

- **Where:** Seam G1 ↔ G2. Scenario T3, step 2, and breaker B1.
- **At that step:**
  - Run `r2` covers de and fr. Cancel on de cancels `r2`, so fr is cancelled too.
  - Run `r3` covers de and fr, with de `failed` and fr `done` and then edited by hand. Retry on de calls `run/r3`.
- **Guarantee:** "`cancel` takes run handles (one run covers several locales)", and "`run/:id` re-runs a queued or failed job".
- **Assumption:** "per-locale row has its own Translate / Cancel / Retry".
- **Consequence:**
  - The user cancels de and silently loses the queued fr.
  - Retry on de may translate fr again over the hand edits. Whether a re-run repeats completed locales is not stated in the model; see the open questions.
- **Not defined:** 23.10's `RunState` names no run handle and no locale list, so the screen cannot even say what a press will affect.
- **Decision needed:** does `RunState` carry `{handle, locales}`? And do Cancel and Retry name the whole run in the UI ("Cancel de, fr"), or does the server gain per-locale cancel and retry?
- **Who:** the owner. This reopens D2 (the wire contract) and touches the 1.0 UI decisions.

#### 3. half-done — an enqueue that times out leaves the browser showing "not started" while the server runs it, with nothing to repair it

- **Where:** Seam G2 → state "query cache". Breaker B4, traced.
- **At that step:**
  1. `POST enqueue {ids: ["42"], target: ["de"]}` takes 16 s, so the client gives up at 15 s with `timeout`, while the server creates `r5`.
  2. `onSuccess` never runs, so no refresh happens.
  3. Polling runs only while the cache shows `run !== null`, and the cache shows `null`, so there is no polling either.
- **Relies on:** "invalidated only by `useRefreshTranslation` (mutations on success …)". Nothing covers a failed mutation.
- **Consequence:** the server is translating de; the panel shows de `empty` plus an error. Every further Translate hits finding 1 and does nothing until a tab focus or reload.
- **Decision needed:** does a mutation refresh on settle (success **or** failure), so the cache re-reads the server after any action?
- **Who:** architecture, reopening D5.

#### 4. unstated — the transport builds the API base from `serverURL` but states no credentials policy

- **Where:** Seam G2. Scenario T1, step 2.
- **At that step:** `baseURL = serverURL + routes.api + basePath`, and ofetch defaults to `credentials: "same-origin"`. Payload's own admin requests send `credentials: "include"` (`@payloadcms/ui/dist/utilities/api.js:11`).
- **Relies on:** a session cookie reaching the endpoint. Nobody promises that.
- **Consequence:** where `serverURL` is set to an origin different from the one the admin is opened on (a preview domain, `localhost` against a configured public URL), every request goes without the session cookie. The guard answers 403 and every panel shows `forbidden`. Today's code uses a relative `/api`, so this is a regression only for such hosts.
- **Decision needed:** does `createRequest` send credentials the way Payload's own admin does, and is the API base taken from `serverURL` at all, or kept relative?
- **Who:** architecture, reopening D3.

#### 5. guard-gap — the swap gate in step 13 cannot run in the form described

- **Where:** Seam S2. Scenario T5, steps 1–2.
- **At that step:**
  - `create("mixed")` asks for a server in a stub scenario; real handlers have no scenarios.
  - The in-process router calls a real handler with a fake request, and the handler calls `req.payload.find(...)` with no Payload instance and no database.
- **Guarded by (D8):** "the contract suite as the swap gate"; D6 plans "a fourth [binding] against the real handlers".
- **Consequence:** the trigger that removes the stub (step 13: "the real read modules pass the contract suite") names a check that cannot be built as a unit binding. Step 13 then has no runnable done-signal, and the stub's removal falls back to judgement.
- **Decision needed:** where does the real-handler binding run, and how does a scenario become seeded data?
  - Option: the suite splits into scenario-free invariants (bindable anywhere) and scenario fixtures (stub only).
  - Option: the real binding runs in the existing `apps/dev` integration harness against seeded documents.
- **Who:** architecture, reopening D6 and D8.

#### 6. growth — every new read or action costs one edit in every host's access guard, or the feature answers 403

- **Where:** Axis "a new host app" and axis A1. Breaker, growth section, traced.
- **Counts:** `TranslatorAction` is closed and the guard fails closed. Adding `document-state` and `list-state` (this design) already requires every host guard to answer them. Each later read or action adds one more edit per host:
  - the 2nd addition costs 1 + N_hosts;
  - the 3rd addition costs 1 + N_hosts again, for every host.
- **Consequence:** an upgrade where a host does not touch its guard turns the whole new panel into `forbidden` errors. This repository alone has two hosts (`apps/dev`, `apps/cms`).
- **Decision needed:** are new reads gated by an existing action, which owns read permission as a family, or does every read keep its own member, with the migration notes as the only defence?
- **Who:** the owner, reopening D7 (the access members).

### Growth

| Axis | Next addition traced | Parts edited (2nd → 3rd) | Seam contracts changed | Central points edited | Class | Why |
|---|---|---|---|---|---|---|
| A1 new action | publish a locale → retranslate unanswered | ≈14 → ≈14 + host guards; the stub transition table grows with actions × run states while the stub exists | wire, repository, abilities | `endpoints.ts`, `ActionBodies`, `TranslatorAction`, `deriveAbilities` table, interface (4 implementations) | invasive | finding 6; the stub doubles every action until step 13 |
| A2 new content state | partial → acknowledged by hand | ≈5 + number of actions (each action's admission must decide the new state) → the 2nd also needs a write, so it is an A1 addition | wire union | `ContentState`, the per-row action matrix | invasive | the action matrix is per state |
| A3 new read screen | run history | ≈11; `StubWorld` must also record history in every existing transition (1 edit per action) | wire, repository, `TranslatorAction` | interface (4 implementations), `endpoints.ts` | invasive | the single interface widens per read (D3 already says "split then") |
| Host app | a third host | 2 + N_actions edits in its guard | none | host guard | invasive | finding 6 |

### Dropped breaks

- **B2, an ability is shown but the guard refuses it.** Already recorded as an open question: the design's D4 consequences say "Per-user abilities (23.10 §4 Open) stay unsolved: a permitted-by-installation but refused-by-guard control renders and then shows `forbidden`."
- **B3, the new reads are not served in real mode before R9.** The design's evolution section says the sandbox stays in stub mode for the new screens, and D8 / step 13 say "the branch does not merge before it". Real mode without the new reads never leaves the branch.
- **B6, a hot reload replaces the world.** Covered by the owner's decision on the State table: the stub is a simple imitation, branch-only and removed later. A reset on reload in development is accepted.
- **B7, which guard the HTTP binding carries.** D7's guard check, "a stub variant of `everyRegisteredRouteIsGuarded.test.ts` (every stub route answers 403 to a refusing guard; AC10)", tests the refusing guard separately. The suite binding uses an allowing guard. The real-handler side of B7 is part of finding 5.

### Open questions

1. **Re-running a job** (`run/:id`): does it skip locales that already completed, or translate them again? Finding 2's Retry consequence depends on it.
2. **Cancelling a finished run** (breaker B5): does it answer 200 (no-op) or 404? The screen shows either a false "cancelled" or an error after a race between the last poll and the click.
3. **Order of work at boot:** are the provider's `serverProps` computed after every module's endpoints are applied? If not, every ability reads `false` (T4, step 1). This belongs to step 2's spike.
4. **The Payload event for "refresh after save"** (T6). This belongs to step 9, as the design already says.

### Not knowable from the model

- Real provider latency against the 15 s and 90 s timeouts.
- Whether Next's dev server evaluates the Payload config once per process. This only affects the stub, which is branch-only.

### What held

- **T1, ordinary read in stub mode:** one request; abilities hide no rows wrongly.
- **T4, abilities against a sync runner:** Cancel and Run now are not rendered.
- **T7, a 70 s field translation:** finishes under the 90 s timeout.
- **T8, two tabs on one stub run:** progress is faster; accepted by the owner.
- **Stub and provenance on `/stale/dismiss`:** never both, because provenance is off in stub mode.
- **List plus panel on one page:** still one request per page for the list.
