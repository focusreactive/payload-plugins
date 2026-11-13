## Architecture Design — admin client on stubs (repository seam, enforced client layers, server stub module)

### The ask (ground truth)
The 1.0 admin screens run end to end on mock data that the plugin's own endpoints serve. The browser reads through one repository, which talks HTTP from day one. When the real server replaces the stub, only the server module list changes. Nothing under `widgets/`, `features/` or the entity hooks changes. Constraints that shaped the design:
- The stub lives on the server as a separate module, and the sandbox enables either the stub or the real modules, never both.
- It answers the 23.10 contracts as types shared by client and server.
- Existing handlers are not touched.
- An in-memory repository exists only for tests.
- This is the next major, so breaks are allowed and listed in migration notes.
- The four public `componentPath`s are host-facing.

Requirements: 2026-11-13-admin-ui-on-stubs.research.md
**Vectors:** structure + evolution (leading: structure). Structure is selected because the ask is mostly "where does each responsibility live and which way do edges point". Evolution is selected because the design replaces live hooks, providers and access members in a major, and the stub is later swapped for the real server. Stack pack headless-cms is advisory: its rules refine vectors that were not loaded (CT, SC), except HC1, which refines EV5 and does not apply because nothing stored changes.

### Decisions by the owner (after the first draft)
- 2026-11-13 — abilities are derived as 23.10 §4 describes, from the routes that actually registered.
- 2026-11-13 — the stub is not published. It is the first stage of the implementation, lives only in the feature branch, and is removed in that same branch.
- 2026-11-13 — scenarios are chosen at boot; runtime switching stays declined.
- 2026-11-13 — the owner delegates the remaining forks to implementation, simplest option first, sacrificing non-essential behaviour. The answers to the seam trace (2026-11-13-admin-ui-on-stubs.seam-trace.md) are fixed here and override the ADRs below where they differ:
  - Finding 1: a `busy` answer to an action is an error (`ApiRequestError` reason `busy`); every action control is disabled while the document has a live run.
  - Finding 2: Cancel and Retry act on the whole run, as the server does; `RunState` carries the run `handle` and its `locales`. Accepted, not redesigned.
  - Finding 3 (reopens D5): mutations refresh on settle — success or failure.
  - Finding 4 (reopens D3): the API base stays relative — `routes.api + basePath` from Payload config, no `serverURL`; requests send `credentials: "include"`, as Payload's own admin does.
  - Finding 5 (reopens D6, D8): the contract suite holds only scenario-free invariants; stub scenarios are tested separately. The real-server check before stub removal runs in the `apps/dev` integration tests.
  - Finding 6 (reopens D7): no new `TranslatorAction` members. The document-state read is guarded by `document-status`, the list-state read by `collection-status`. Hosts change nothing.

### Decision points
- D1 [load-bearing] Client layer gradient, its written rules and its lint enforcement under the REPLACE semantics (axis: dependencies/placement · reversible; moving a public componentPath would not be, and none moves)
- D2 [load-bearing] Shared wire contracts: home, ownership, type-only vs runtime schemas, one path table (axis: abstractions · reversible inside the package; becomes the 1.0 contract once 1.0.0 is published)
- D3 [load-bearing] Repository shape, placement against the `api/` naming collision, injected transport, typed error, timeouts (axis: abstractions/placement · reversible)
- D4 [load-bearing] Composition root, throwing contexts, where TranslateKitConfig and abilities come from, the public CacheProvider (axis: dataflow-state/placement · reversible except the public provider path, which is kept)
- D5 [load-bearing] Query layer: key factory, refresh ownership, polling (axis: dataflow-state · reversible)
- D6 [load-bearing] Red-first contract suite: shape, location, bindings (axis: abstractions · reversible)
- D7 [load-bearing] Server stub module: placement, the single mock source, publication, scenarios, access actions, the never-both rule (axis: placement/dataflow-state · reversible: the stub never leaves the feature branch; the new TranslatorAction members are public after 1.0.0)
- D8 [load-bearing] Rollout from today's hooks, deletion triggers, the stub→real swap, the stub's lifetime (axis: rollout-sequence/cleanup-ownership · reversible per step; one-way door = publishing 1.0.0 stable)

### How it lands on the system
**Reused (verified in code):**
- `src/client/app/cache/CacheProvider.tsx` and `CacheProvider.export.ts`: the registered admin provider (`src/plugin.ts:288`). Its module-level `QueryClient` at `:8` is removed.
- `shared/providers/CacheClientProvider/CacheClientProvider.factory.ts`. It memoises per factory instance, so a fresh factory per mount gives a fresh client.
- `app/config/TranslateKitConfigContext.tsx`: moved down. It does not throw today and defaults to `/translate`.
- `shared/lib/errors/handleApiError.ts`: `NextApiError {message, details?: ZodIssue[]}`. `shared/lib/forms/handle-form-error.ts` reads its `details`, so they must survive. The twin `shared/lib/utils/errors/handleApiError.ts` has zero importers.
- `src/types/wire/field-translation.ts`.
- `ModuleContext.addEndpoints`.
- `withAccessCheck(handler, access, action)`, with the guard outside the error handler. This order is pinned by `everyRegisteredRouteIsGuarded.test.ts`.
- The `composition/modules/*` factory template.
- `apps/dev/src/lib/translator/devToggles.ts`.

**Touched:**
- The 9 hooks in `entities/translation/api/{queries,mutations}`.
- `entities/translation/model/types.ts`.
- `TranslatorAction.ts`, plus its two pin tests: `types/__tests__/TranslatorAction.test.ts` and `server/shared/access/__tests__/everyRouteNamesItsAction.test.ts`.
  - `server/shared/access/permission.ts` does **not** switch on actions, so the brief's expected ripple into it does not exist.
- `PluginConfigBuilder.ts`, `plugin.ts`.
- `oxlint.config.ts`, translator zones at `:405-475`.
- `apps/dev/src/payload.config.ts:94-108`.

**Facts verified during adjudication that change the design:**
1. **Silent first-wins dedup.** `PluginConfigBuilder.registerEndpoints` (`PluginConfigBuilder.ts:141-152`) drops a duplicate `method + path` without a word, and seeds its seen-set from the host's `config.endpoints` too.
2. **Provenance collides with the stub.** The provenance module is prepended to the chain by `plugin.ts:246-248`, outside `modules`. It registers `/translate/stale/dismiss` (`Provenance.module.ts:54-57`), the same path the stub must serve. With `provenance: true` (as in `apps/dev`), provenance's real dismiss would silently win over the stub's. No candidate saw this.
3. **The lint test exemption is narrow.** T6 (`oxlint.config.ts:471-474`) exempts only `*.test.ts(x)`. A contract suite or a `*.fixture.ts` under `__tests__/` is **not** exempt, so all three candidates' claim that "tests are exempt via T6" is false for exactly the files D6 creates.
4. **Today's client imports reach outside the client.**
   - Client files import `src/types/{TargetSelection,AccessGuard,PayloadComponentExport}`.
   - Four boundary files (`*.server.tsx`, `*.export.ts(x)`) import `src/server/shared`.
   - `entities/translation/model/autoTranslateSummary.ts` imports `core/domain/auto-translate`, and only `*.server.tsx` files call it.
   - A rule of "client may import only wire" (B, C) would fail on day one.
5. **`POST {basePath}/field` is synchronous over the translation provider.** The sandbox's provider timeout is 60 s (`devToggles.ts:22`), so a single 15 s client timeout (all three candidates) would abort legitimate field translations.
6. **The build already excludes `__tests__` twice.** `build:swc --ignore '**/__tests__/**'` and `tsconfig.json` `exclude: src/**/__tests__/**` both skip it. `tsconfig.check.json` includes it, so test files are type-checked.
7. **23.10 §4 derives abilities from routes.** It states abilities "are computed at boot from the routes that actually registered, so they cannot drift from reality". All three candidates instead added a *declaration* (`TranslationModule.abilities` / `ctx.declareAbilities`).

### The design
- **Abstractions:**
  - `TranslationRepository` (interface, `entities/translation/model/TranslationRepository.ts`)
    - Methods: `getDocumentState`, `getListState`, `enqueue`, `runNow`, `cancel`, `cancelByCollection`, `dismissStaleness`, `translateField`.
    - Invariant (TSDoc lists the obligations the signature cannot state): one request per call; `getListState` is one request for N ids; `untracked` is never reported as `empty`; every failure rejects with `ApiRequestError`.
    - Callers: the existing 9 hooks, rewritten. Implementations: HTTP, in-memory test fake, throwing red-step stub.
  - `HttpTranslationRepository` (`entities/translation/api/`): built over an injected `ApiRequest`. Callers: CacheProvider, the HTTP contract binding.
  - `TranslationRepositoryContext` + `useTranslationRepository()` (`entities/translation/api/`). It throws `TranslationRepositoryProviderMissing` outside a provider. Callers: every query and mutation hook, CacheProvider, component tests.
  - `createRequest` → `ApiRequest` (`client/shared/api/createRequest.ts`). It is an ofetch instance with `baseURL`, a named timeout, an optional injected `fetch`, and **one** catch that maps every failure to `ApiRequestError`. Callers: CacheProvider, the HTTP binding, the failure-path tests.
  - `ApiRequestError` (`client/shared/api/errors/ApiRequestError.ts`)
    - Holds a closed `reason`: `network | timeout | forbidden | not-found | rejected | server`, plus optional `status` and `details?: ZodIssue[]`.
    - It replaces `NextApiError`; `handle-form-error.ts` keeps working through `details`.
    - Callers: the repository, hooks' error state, forms.
  - `translationKeys` (`entities/translation/queries/translationKeys.ts`, imports nothing). Callers: query hooks, `useRefreshTranslation`, mutations.
  - Wire contracts in `src/types/wire/`:
    - `DocumentTranslationState.ts` (§1–3: LeafVerdict, ContentState, RunState, LocaleState, TreeNode)
    - `ListTranslationState.ts` (§5)
    - `TranslateKitConfig.ts` (§4: Abilities, CollectionFacts)
    - `ActionBodies.ts` (request/response bodies of the existing action paths, taken from today's client hooks)
    - `endpoints.ts` (a const table of `method` + path suffix per endpoint; no functions)
    - Callers: client repository, stub handlers, `CacheProviderExport`/`plugin.ts`, the ability derivation; later the real server (R9).
  - `deriveAbilities(registeredEndpoints, basePath)` (`server/modules/plugin-config/abilities.ts`). Callers: `plugin.ts`, the boot test. This is the 23.10 §4 mechanism, not a declaration.
  - `StubWorld` + `scenarios/` (`server/modules/translation-stub/{model,scenarios}/`). A payload-free in-memory state machine plus fixtures; the **one** mock source. Callers: stub handlers, the client in-memory test fake.
  - `translationStub(options)` module factory (`composition/modules/translationStub.ts`, reachable from `apps/dev` through a branch-only `./stub` entry that is deleted with the stub and never merged). Callers: `apps/dev`, the HTTP contract binding, the boot/guard tests.
  - `describeTranslationRepositoryContract(name, create)` (`entities/translation/__tests__/TranslationRepository.contract.ts`): bound to throwing (red), in-memory, and HTTP-in-process.
- **Dependency direction:**
  - Client: `app (CacheProvider) → widgets → features → entities/translation → client/shared → src/types (type-only; values only from src/types/wire)`.
  - Inside the entity: `ui → queries|mutations → api (context, Http impl) → model (interface) → types/wire`. `queries/translationKeys.ts` imports nothing. `model` imports no React and no Payload runtime.
  - Boundary files (`*.server.ts(x)`, `*.export.ts(x)`) may additionally import `src/server/shared` and `src/core/domain`. These are today's edges, kept and named rather than broken.
  - Server: `composition/modules/translationStub → server/modules/translation-stub/{http → model, scenarios} → server/shared/http + types/wire + types/TranslatorAction`. `translation-stub/{model,scenarios}` import only `types/wire`.
  - Removed edges:
    - The 9 hooks' `entities → app/config` edge.
    - The widget's deep import of `entities/translation/api/mutations/useTranslateField`; it goes through the entity barrel.
  - Test-only edge: `src/client/**/__tests__/** → server/modules/translation-stub`, legal through an explicit lint override (D1). No cycles.
- **Placement:**

  | Responsibility | Layer | Path |
  |---|---|---|
  | Wire contracts | below client and server | `src/types/wire/*` |
  | Interface | entity model | `entities/translation/model/` |
  | HTTP implementation + its injection context | entity api ("talking to the server" only) | `entities/translation/api/` |
  | Hooks | entity, new role folders | `entities/translation/queries/`, `entities/translation/mutations/` |
  | Config context | client shared | `client/shared/config/TranslateKitConfigContext.tsx` |
  | Transport + error | client shared | `client/shared/api/` |
  | API base hook (adapter) | client shared | `client/shared/lib/payload/hooks/useApiBase.ts`, beside `useLocaleOptions` |
  | Composition root | app | `client/app/cache/CacheProvider.tsx` (public path kept) |
  | Stub | server module | `src/server/modules/translation-stub/`, plus factory in `src/composition/modules/translationStub.ts` and entry `src/stub.ts` |
  | Ability derivation | server | `src/server/modules/plugin-config/abilities.ts` |
  | Written rules | package guide | new "Client layers" section of `packages/payload-plugin-translator/CLAUDE.md` |

- **Data flow & ownership:**
  - Translation state is owned by the server: `StubWorld` now, the real read model after R9. The single source of truth is the endpoint answer.
  - The only client copy is the per-mount QueryClient, keyed by `translationKeys`. The repository holds no state.
  - Abilities are owned by **what registered**: `deriveAbilities` over the builder's endpoint list.
  - Collection facts come from the managed collections' auto-translate config, read at boot.
  - Both reach the browser once, through `CacheProviderExport.serverProps` (the full `TranslateKitConfig`), into a read-only context.
  - Mock state: one `StubWorld` per stub-module instance (factory closure, no global), seeded from the scenario chosen at boot.
  - The QueryClient and the repository are owned by CacheProvider, per mount (`useState` lazy init).
- **Evolution — rollout, window, cleanup:**
  - **Approach:** strangler on the branch from `major/translator` (steps below).
  - **Compatibility window:** from step 7 to step 12. In it:
    - Old read hooks (old paths, old shapes) and new read hooks (new paths, new shapes) coexist. Neither reads the other's shape (EV5).
    - Mutations run on the repository against unchanged paths, so they behave the same against stub and real modules.
    - In stub mode the old popovers' reads hit paths the stub does not serve (owner: the stub serves the new reads only). The sandbox stays on real modules for the old UI until step 9.
  - **Shims and their triggers (EV3):**
    1. Legacy keys under `translationKeys.all`, so one refresh covers old and new reads.
    2. The lint exception allowing `ofetch` in `entities/translation/api/queries/**`.
    3. `entities/translation/model/types.ts`.
    - Removal trigger for all three: the last importer of the old read hooks is gone. Removal step: 12. Owner: the translator maintainer. The trigger is recorded in that step's task file.
  - **The stub is scaffolding of the feature branch** (owner decision, 2026-11-13). It is never published and never merged: it is removed in the same branch once the real read modules pass the contract suite (step 13). Every merge to `major/translator` publishes a prerelease, so the branch merges only after step 13.
  - **Per-step rollback and point of no return:**

    | Step | Rollback | Point of no return |
    |---|---|---|
    | 1–8 | revert the step's commit | none |
    | 9–11 | revert the screen's commit (the old popover returns from git and works in real mode) | none |
    | 12 | revert the sweep commit | none inside the branch |
    | 13 stub removal | revert the removal commit | none inside the branch; the branch does not merge before it |

    - Every merge to `major/translator` publishes a `1.0.0-next.N` prerelease, where breaking changes are tolerated.
    - The one-way door of the whole plan is publishing **1.0.0 stable**. After it, the wire types, the provider's serverProps and the two new TranslatorAction members are the contract. The stub is never part of it.

### Requirement coverage
| R | Design element |
|---|---|
| R1 | Repository + hooks (D3, D5) over the stub module (D7) with abilities in the provider (D4); screens built in steps 9–11, legacy removed in step 12 |
| R2 | `translationStub` module registering the new read paths and the existing action paths, each `withAccessCheck(withErrorHandler(…))`, on `{basePath}` from the shared endpoint table; `HttpTranslationRepository` over `serverURL + routes.api + basePath`; AC10 negative test |
| R3 | `TranslationRepository` interface → `describeTranslationRepositoryContract` run red against the throwing stub (artifact in `docs/plans/artifacts/`) → in-memory fake and HTTP implementation green |
| R4 | Hooks see only `useTranslationRepository()`; the HTTP class is constructed only in CacheProvider; one shared wire type; the swap is a server module-list change, gated by a third contract binding against the real handlers |
| R5 | Kept layer names, "Client layers" section in the package CLAUDE.md, oxlint client zones C1–C5 + client-tests override, `layersHold` scan test, lint probe test |
| R6 | Adopted from cibula: interface + Impl with injected transport, throwing context, per-mount root, key factory, entity-owned refresh, reusable suite bound per implementation, typed error, throwing red step. Adopted from esperanza: API base from Payload config, Payload imports confined to adapter/ui/boundary files (lint), the refs check as `componentPaths.test.ts`, failure paths tested by injected fetch. Declined with reasons in ADRs D1–D5 |
| R7 | Scenario set (uniform per canvas state, plus mixed for the list page; latency, hang, 500, forbidden, no-locales, provenance-off, abilities-limited) chosen at boot by `translationStub({ scenario })`, which `apps/dev` reads from `TRANSLATOR_STUB_SCENARIO`; no code edit, restart only |
| R8 | `src/types/wire/*` imported by stub handlers (return-typed), the HTTP repository (returns them unchanged), `CacheProviderExport`; AC9 tsgo probe; boot test pinning the endpoint table to the real routes' paths |

### Vector gates
- **structure** — no gate beyond ST1–ST6. The decided design clears each (see ADRs). The ST4 break shared by all three candidates (declared abilities beside registered routes) is removed by deriving abilities from what registered.
- **evolution** — rollback gate. Every build step names its rollback and point of no return (see Evolution above and each step). The only one-way door is publishing 1.0.0 stable. It is made safe by the contract suite, the AC8 walkthrough and the migration notes landing before it.
- **headless-cms (stack pack, advisory)** — HC1: not applicable, because nothing stored changes (23.10: every value is derived at read time). HC2: Payload field shapes stay on the server, and the browser sees only `TreeNode`/addresses; advisory, because CT is not loaded. HC3–HC6: not applicable; the stub serves fixtures and reads no drafts, tokens or references.

### Decisions (ADRs)

#### D1. Keep app > widgets > features > entities > shared, enforce it with lint zones plus a scan test, and name the boundary-file exception   [axis: dependencies/placement]
- **Context:**
  - The client is FSD-like but unenforced: `oxlint.config.ts` has zones only for core/traversal.
  - Options REPLACE and the last match wins, so every new zone must restate `ENGINE_BARREL_ONLY`.
  - T6 exempts only `*.test.ts(x)`.
  - Four public componentPaths live under these folder names.
  - Legitimate edges exist today:
    - client → `src/types/{TargetSelection,AccessGuard,PayloadComponentExport}`;
    - boundary files → `server/shared`;
    - `autoTranslateSummary.ts` → `core/domain`, called only from `*.server.tsx`.
- **Options considered:**
  - Keep names; per-layer zones; `import type` from all of `src/types` and values only from `src/types/wire`; a boundary-file exemption for server (max-reuse)
  - Keep names; zones banning everything outside `src/types/wire`, including server; a scan test for sibling imports (min-new-abstraction)
  - Keep names; client may import only a new `src/wire`; a Payload-adapter zone; sibling-feature zones generated from the directory listing (cleanest-boundaries)
  - Numbered `01-app … 06-shared` (cibula; declined by all three)
- **Decision:**
  - **Spine: max-reuse rules.**
    - Imports go strictly down.
    - No feature→feature and no widget→widget imports. Entity→entity is types only (vacuous today: one entity).
    - Client may `import type` from `src/types/**` and import values only from `src/types/wire/**`.
    - client → `core|traversal|composition|server` is banned, except in boundary files (`*.server.ts(x)`, `*.export.ts(x)`), which may import `server/shared` and `core/domain`.
    - `autoTranslateSummary.ts` is renamed `autoTranslateSummary.server.ts`, which makes its existing core edge a declared boundary edge. It is retired in slice 4, when `CollectionFacts` replaces it, **not** before. Retiring it in the lint step, as max-reuse did, breaks the marker (EV1).
  - **Grafted from cleanest-boundaries:** zone C4 bans runtime `payload`/`@payloadcms/*` imports in `entities/*/{model,api,queries,mutations}`. Type imports stay allowed. The constraint (ST5): research risk "`@payloadcms/ui` cannot be imported in vitest without mocking". Keeping it out of hooks and the repository means their tests need no mock.
  - **Grafted from min-new-abstraction:**
    - `src/client/__tests__/layersHold.test.ts` resolves every relative import and catches sibling imports like `../../other-feature`, which no glob can see. Precedent: `src/traversal/__tests__/depends-on-nothing.test.ts`.
    - The written rules go in a "Client layers" section of the package CLAUDE.md (one home for package conventions).
  - **Zones:**
    - C1 forbidden roots
    - C2 upward bans per layer
    - C3 boundary-file allowance
    - C4 Payload runtime in entity internals
    - C5 `ofetch` only in `client/shared/api`, plus a temporary allowance for `entities/translation/api/queries/**` (removed in step 12)
    - A **client-tests override** for `src/client/**/__tests__/**`, restating only `ENGINE_BARREL_ONLY`, placed after C1–C5 and before T6, which stays last.
  - The esperanza refs check is taken as `widgets/__tests__/componentPaths.test.ts`: every `*.export` class's `path` resolves to a file exporting the named component.
  - **Invariants:** ST2 (the declared gradient is enforced and the only upward edge is removed); ST3 (no back-edge remains); ST5 (each zone cites a defect: the `entities→app` edge, inline `ofetch`, the vitest/`@payloadcms/ui` constraint); ST6.
- **Consequences:**
  - The four public componentPaths do not move, so hosts need no importmap regeneration from this decision.
  - Path-glob bans are textual. Sibling imports rely on the scan test, not lint.
  - Numbered folders and namespace exports are declined. The rename touches every import and the public paths and adds no boundary the zones do not give. The existing `TranslationsApi` namespace export in the entity barrel stays as is.
- **Reversible:** yes — lint config, one test and one internal rename. Undoing a public path move would need a host importmap regeneration, which is why none happens.
- **Guarded by:** the checks listed below —
  - oxlint zones C1–C5 + client-tests override.
  - A lint probe test that places upward-import probe files at zone paths, runs oxlint with the repo config and expects refusal (AC5).
  - `layersHold.test.ts`.
  - `componentPaths.test.ts`.
  - All built in step 4.

#### D2. Type-only wire contracts in `src/types/wire`, with one const endpoint table   [axis: abstractions]
- **Context:**
  - R8/AC9: a field renamed on one side must fail type-check on the other.
  - Client and server ship in one package version.
  - `src/types/wire/field-translation.ts` already exists with client and server importers.
  - The package records that `tsc` declaration builds fail on zod-inferred types where tsgo passes (translator build note).
  - The role table says `wire/` holds "the shape our values take to cross".
- **Options considered:**
  - Type-only in `src/types/wire`, with path *builder functions* in `routes.ts` (max-reuse)
  - Type-only in `src/types/wire`, no path table (min-new-abstraction)
  - New top-level `src/wire` (moving `field-translation.ts`), a const `endpoints.ts`, and zod schemas `satisfies z.ZodType<T>` parsed at the client edge (cleanest-boundaries)
- **Decision:**
  - **Spine:** type-only in `src/types/wire` (max-reuse / min-new-abstraction). One file per 23.10 section, plus `ActionBodies.ts` for the existing action paths.
  - **Grafted from cleanest-boundaries:** the endpoint table as a **const** table of method + path suffix, with no functions. Each side fills parameters itself. This keeps `wire/` shapes-and-constants and gives each path one spelling (ST4). The real routes are not edited (owner), so a boot test pins the table's action entries to the paths the real modules register.
  - **Declined:**
    - zod at the edge. It is a second description of each type; `satisfies` does not catch a schema looser than its type; and the one-version constraint the candidates cite argues against it (ST5).
    - `src/wire` top-level. It moves a file and adds a root for no boundary that a lint rule on `src/types/wire` cannot give.
  - **Invariants:** ST1 (each type has client and stub callers, with the real server named by R9 and the owner's 2026-11-13 decision); ST2 (`types/wire` imports nothing above it); ST4 (one declaration per shape; `model/types.ts` is retired in step 12).
- **Consequences:**
  - Deploy skew is real in this codebase: `useDocumentTranslation.ts:42-44` normalises against a stale admin tab. A shape mismatch from skew will surface as a rendering failure, not a typed `malformed` error.
  - `HttpTranslationRepository` is the single edge, so adding a parse later is local and additive.
  - Per-leaf verdicts travel in the type; the 1.0 UI ignores them (R21 deferral).
- **Reversible:** yes inside the package until 1.0.0 stable. After it, changing a shape is a breaking change in a major.
- **Guarded by:** the checks listed below —
  - The AC9 probe: stub handlers are return-typed `ServerResponse<…>` on the wire types, and a `expectTypeOf` test pins fixture builders to them.
  - Zone C5-wire: `src/types/wire/**` imports nothing.
  - A boot test asserting each `endpoints.ts` action entry is registered by `documentTranslation()`, `fieldTranslation()` and provenance.
  - Built in steps 1–2.

#### D3. One `TranslationRepository`, interface in `model/`, HTTP implementation in `api/`, hooks moved to `queries/` and `mutations/`, one error class, two named timeouts   [axis: abstractions/placement]
- **Context:**
  - The owner requires two interchangeable implementations (HTTP and in-memory) behind one suite.
  - `entities/translation/api/` holds react-query hooks today, which collides with "api = talking to the server".
  - `NextApiError.details` is read by forms.
  - `POST {basePath}/field` translates synchronously through the provider.
- **Options considered:**
  - One 8-method repository; HTTP implementation in `api/repository/`; hooks stay in `api/`; an injected ofetch instance; `NextApiError` extended in place; one 15 s timeout (max-reuse)
  - Same shape with an `ApiRequest` alias; the twin deleted (min-new-abstraction)
  - Two repositories (document, collection) over a `Transport` interface; a new `ApiRequestError` with a closed reason union; hooks moved to `queries/` and `mutations/` (cleanest-boundaries)
- **Decision:**
  - **Spine: one repository** (max-reuse / min-new-abstraction). Eight methods over one data source and one entity form one cohesive boundary (ST6). The split adds a second context, suite and `Transport` seam whose only justification is the split itself (ST1).
  - **Transport:** inject `ApiRequest`, an alias of the ofetch instance type, built by `createRequest`. No `Transport` interface: with one repository it would have one consumer (ST1).
  - **Grafted from cleanest-boundaries:**
    - Hooks move to `entities/translation/queries/` and `mutations/`, which resolves the collision structurally: `api/` holds only the HTTP implementation and its context. New read hooks are new files anyway (new shapes), and the 6 mutation hooks move once, in step 7.
    - `ApiRequestError` with a closed `reason`, keeping `details` so forms continue to work. Both `handleApiError` files are deleted, and the mapping lives in `createRequest`'s single catch.
  - **Timeouts:**
    - `REQUEST_TIMEOUT_MS = 15_000` for reads and queued actions.
    - `FIELD_TRANSLATION_TIMEOUT_MS = 90_000` for `translateField` only. It is synchronous over a provider budgeted at 60 s in the sandbox, and a client that gives up first loses a result the server produced.
  - **API base:** `serverURL + routes.api` through `useApiBase` (esperanza `useApiUrl`), replacing the hard-coded `/api`.
  - **Invariants:** ST1 (interface: 9 existing hook callers + 3 implementations); ST2 (`model` imports no `api`); ST5 (the repository is forced by the owner's two-implementation decision; no Transport class because ofetch is already the seam); ST6.
- **Consequences:**
  - A test fake implements 8 methods.
  - If the real server later adds unrelated reads, split then, with one suite per half.
  - A host whose provider legitimately exceeds 90 s sees a `timeout` reason. This is an assumption about provider budgets the plugin cannot see.
  - The `NextApiError` name disappears; its only importers are internal.
- **Reversible:** yes — internal to the package.
- **Guarded by:** the checks listed below —
  - The contract suite on both bindings (D6).
  - Zone C5: `ofetch` importable only in `client/shared/api`.
  - The failure-path tests: injected fetch rejecting, hanging past the timeout, answering 403/404/500 or a non-JSON body, each mapped to its `reason`.
  - Built in step 6.

#### D4. CacheProvider stays at its public path and becomes the per-mount composition root; contexts throw; abilities are derived from what registered   [axis: dataflow-state/placement]
- **Context:**
  - `CacheProvider` is the registered admin provider (`plugin.ts:288`), and its path is host-facing.
  - Its `QueryClient` is a module singleton.
  - The config context defaults silently.
  - AC6 requires a named error, not a network call.
  - 23.10 §4: abilities travel through the provider's `serverProps`, every flag present, "computed at boot from the routes that actually registered, so they cannot drift".
  - `createTranslationRoutes.ts:38-52` already decides which routes exist from runner capabilities.
- **Options considered:**
  - CacheProvider builds everything inline; `TranslationModule.abilities?` declared per module (max-reuse)
  - Same root; the abilities field on three modules (min-new-abstraction)
  - A pure `createTranslateKitRuntime` factory under a thin shell; `ctx.declareAbilities`; an `excludes` list (cleanest-boundaries)
  - Abilities derived from the registered endpoint list — the mechanism 23.10 §4 itself names (not proposed — raised at adjudication)
- **Decision:**
  - **Root:** CacheProvider builds inline (max-reuse/min-new-abstraction) with `useState` lazy init: a fresh `CacheClientProviderFactory().create("client")`, `createRequest({ baseURL: useApiBase() + basePath })` and `new HttpTranslationRepository(request)`. It mounts `TranslateKitConfigProvider` > `TranslationRepositoryProvider` > `QueryClientProvider`.
  - **Declined:** `createTranslateKitRuntime`. Its only non-test caller would be CacheProvider, and tests use the fake, not this factory (ST1).
  - **Contexts:** `useTranslateKitConfig()` (moved to `client/shared/config/`) and `useTranslationRepository()` both throw a named error outside their provider.
  - **serverProps:** `CacheProviderExport.serverProps` becomes the full wire `TranslateKitConfig`, adding `abilities` and `collections` beside `basePath`. Additive, so today's provider ignores the extra keys.
  - **Abilities:** `deriveAbilities` reads the builder's registered endpoints against `endpoints.ts`:

    | Ability | Derived from |
    |---|---|
    | `translate` | enqueue registered |
    | `cancel` | cancel registered |
    | `runNow` | run registered |
    | `staleness` | dismiss registered |
    | `translateField` | field registered |

    Every flag is always present. This is the only form that holds ST4: the candidates' declarations would restate the capability→route rule of `createTranslationRoutes.ts:38-52` in a second place. All three candidates are disqualified on that sub-decision.
  - `CollectionFacts.autoTranslateTargets` comes at boot from the managed collections' auto-translate config.
  - **Invariants:** ST2 (the `entities→app` edge is gone); ST4 (one owner each: registrations for abilities, the root for the QueryClient and repository); ST6 (the root composes only).
- **Consequences:**
  - The stub's "abilities-limited" scenario works by registering fewer action endpoints, so the UI cannot show an ability the server cannot serve.
  - The file name `CacheProvider` no longer describes the whole job. It is kept to avoid a host importmap change.
  - A test or host rendering a widget outside the provider now fails loudly (migration note).
  - Per-user abilities (23.10 §4 Open) stay unsolved: a permitted-by-installation but refused-by-guard control renders and then shows `forbidden`.
  - Unverified: that Payload renders custom admin providers inside its `ConfigProvider`, so that `useConfig` works in CacheProvider. Fallback: compute `apiBase` server-side into `serverProps`.
- **Reversible:** yes — the public path is kept and the props change is additive. Removing a serverProps key after 1.0.0 would be breaking.
- **Guarded by:** the checks listed below —
  - The AC6 component test (no provider → named error).
  - A test that two mounts get two QueryClients.
  - A boot test asserting derived abilities: all true with `documentTranslation() + fieldTranslation() + provenance` on a capable runner; `cancel`/`runNow` false with `createSyncRunner()`, mirroring `everyRegisteredRouteIsGuarded.test.ts`.
  - Built in steps 2 and 7.

#### D5. Hierarchical keys in a file that imports nothing; hooks bind to the context directly; the entity owns refresh   [axis: dataflow-state]
- **Context:**
  - Today keys are inline arrays and mutations invalidate by string literal (`useQueueDocumentTranslation.ts:31-35`).
  - The owner requires refresh after translation and after save.
  - Polling must stop once no run is in flight.
  - 23.10 §5: a list page is one request under one key.
- **Options considered:**
  - Keys in `model/`; no curried options; `useRefreshTranslation` in the entity (max-reuse)
  - Keys in `api/`; no curried options; refresh hook (min-new-abstraction)
  - Keys plus curried `xQueryOptions(repo)(params)` in `queries/`; a lint-probed `invalidateQueries` ban (cleanest-boundaries)
- **Decision:**
  - `entities/translation/queries/translationKeys.ts`, hierarchical: `all` → `document(collection,id)` / `list(collection, idsKey)`. During the window it also carries `legacy.*` children of `all` for the old read hooks (shim, removed in step 12).
  - Hooks call `useTranslationRepository()` inline. Curried options are declined: one hook per query (ST1).
  - `queries/useRefreshTranslation.ts` is the only place `invalidateQueries` appears. Mutations call it on success, and widgets call it after save. The Payload save signal is a slice-4 question; ownership is decided here.
  - Polling: one named interval beside the query hooks (today's 20 s carried over; tuning is slice 4) while any `locale.run !== null` or any list row has a run.
  - Failure, loading and no-locales come from query state plus an empty `locales`.
  - **Invariants:** ST4 (the QueryClient is the only client copy of server state; no component copies it); ST1 (keys: queries, mutations, refresh; the refresh hook: 6 mutations plus the screens); ST2.
- **Consequences:** a non-React caller cannot reuse query options; none exists. Changing page means a new list key, which is intended.
- **Reversible:** yes.
- **Guarded by:** `refreshIsTheEntitys.test.ts`, a scan test asserting that `invalidateQueries(` appears only in `queries/useRefreshTranslation.ts` and that no `queryKey: [` literal exists outside `translationKeys.ts`. Built in step 7.

#### D6. One reusable contract suite under `__tests__`, bound to a throwing stub (red), the in-memory fake, and the HTTP implementation routed in-process to the stub's real handlers   [axis: abstractions]
- **Context:**
  - R3/AC2/AC3: red first, then the same suite passes on fake and HTTP.
  - `./testing` is a public entry for host runners.
  - `__tests__` is excluded from both build passes. Verified: `build:swc` ignore + `tsconfig.json` exclude; `tsconfig.check.json` type-checks it.
  - Vitest collects only `*.test.ts(x)`.
  - T6 exempts only `*.test.ts(x)`.
- **Options considered:**
  - Suite in `api/__tests__/`; fake over the stub's store; HTTP through an injected in-process fetch routing to the stub's handlers via a collecting `ModuleContext` (max-reuse)
  - Suite in `entities/translation/__tests__/`; a third binding, the throwing stub, as the recorded red run (min-new-abstraction)
  - Two suites (one per repository) plus a `vi.stubGlobal('fetch')` failure file (cleanest-boundaries)
- **Decision:**
  - `entities/translation/__tests__/TranslationRepository.contract.ts` exports `describeTranslationRepositoryContract(name, create)`, where `create(scenario)` returns a repository.
  - It is written from the interface TSDoc and the scenario list, never from an implementation.
  - **Bindings:**
    1. `ThrowingTranslationRepository.fixture.ts`: the red run, recorded in `docs/plans/artifacts/` before any implementation (from min-new-abstraction).
    2. `InMemoryTranslationRepository.fixture.ts` + `.test.ts`: a thin adapter over `StubWorld`.
    3. `HttpTranslationRepository.test.ts`: the real implementation over `createRequest({ fetch: inProcessFetch })`. The in-process fetch builds the stub module against a collecting `ModuleContext`, matches method and path, and calls the handlers. The real `withAccessCheck`/`withErrorHandler` and the wire format are therefore exercised with no socket and no global stub.
  - Failure paths (C's case list) run through an injected failing fetch, not a global stub.
  - **Invariants:** ST1 (three bindings now, a fourth against the real handlers at R9); ST5 (one suite because two implementations must stay interchangeable, R4).
  - The test-only edge into `server/modules/translation-stub` is made legal by D1's client-tests override, not by T6, which does not cover these files.
- **Consequences:**
  - Fake and stub share one world, so the fake binding proves the adapter, not the world. The HTTP binding and, at R9, the real-handler binding check the rest.
  - The in-process router mimics a slice of Payload's endpoint dispatch (path params, `json()`, `user`) and must follow Payload upgrades.
- **Reversible:** yes — test files only.
- **Guarded by:** the checks listed below —
  - The suite itself on all bindings.
  - The red artifact in `docs/plans/artifacts/`.
  - Exclusion from `dist` held by the existing `build:swc --ignore '**/__tests__/**'` and `tsconfig.json` exclude (both verified).
  - Built in steps 5–6.

#### D7. The stub is one server module with a payload-free world, branch-only and never published, behind new access actions; two of the plugin's own modules can no longer claim the same path   [axis: placement/dataflow-state]
- **Context:**
  - Owner decisions: a separate module serves the new reads and the existing action paths from in-memory state, and never runs beside the real modules.
  - `apps/dev` consumes `dist` through the package's exports map, so an unexported module cannot be listed there.
  - Dedup is silent and first-wins.
  - The provenance module (prepended outside `modules`) registers `/stale/dismiss`, the stub's dismiss path.
  - Stub endpoints must sit behind `withAccessCheck` and never be enabled by accident.
  - Today's `TranslatorAction` has `document-status` and `document-staleness` as distinct members; the new state read carries verdicts.
- **Options considered:**
  - Everything in `server/modules/translation-stub/`; reuse `document-status`/`collection-status`; boot-time env scenario; refuse in production; make dedup throw everywhere (max-reuse)
  - A payload-free `src/stub/` world; new members `document-state`/`list-state`; name-based refuse-both; pseudo-id scenario selection (min-new-abstraction)
  - `src/mocks/` + `src/stub/` barrel; new members; `excludes` list; `allowInProduction`; a runtime `POST /stub/scenario` guarded by `enqueue` (cleanest-boundaries)
- **Decision:**
  - **Placement (spine):** max-reuse — `src/server/modules/translation-stub/` with `model/StubWorld.ts`, `scenarios/*.ts`, `http/*` handlers and a latency/failure wrapper. Factory `src/composition/modules/translationStub.ts`; entry `src/stub.ts`; `package.json` export `./stub`.
    - Not added to `src/index.ts` or `composition/modules/index.ts`. The research requires the name and the path to say "stub".
  - **Grafted from min-new-abstraction / cleanest-boundaries:** `model/` and `scenarios/` import only `src/types/wire`, enforced by a zone. The client test fake can then import them without Payload. No new top-level folder (ST6, intended_arch unchanged).
  - **Access (grafted from B/C):** new members `document-state` and `list-state` for the new reads; actions keep their existing members.
    - Reusing `document-status` (max-reuse) is rejected. The state read now carries verdicts, so a host guard that refuses `document-staleness` but allows `document-status` would see drift through the back door. New members fail closed: an action a guard does not answer `true` to is refused.
  - **Never both:**
    - The plugin refuses at config time when two of its **own** contributions register the same `method + path`, with a named error. Precedence against the host's own endpoints is unchanged.
    - This replaces both B's name list and C's `excludes`, and it catches the provenance collision no candidate saw.
    - Stub mode in `apps/dev` therefore sets `provenance: false`; the provenance-off canvas state is a stub scenario anyway.
  - **No production guard:** the stub is never published and never merged, so no host can list it; the guard would protect a case that cannot happen.
  - **Scenarios (R7):**
    - *Uniform* scenarios: every document answers one canvas state (each LocaleState kind, running, failed run, dismissed, no locales, provenance off, the field control's seven states).
    - A *mixed* scenario for the list page: states spread by a stable hash of `collection:id`, so one page shows many.
    - Behaviour scenarios: `slow` (`latencyMs`), `hang` (past the timeout), `failing` (500), `forbidden`, `abilities-limited` (registers fewer action endpoints).
    - Chosen at boot by `translationStub({ scenario })`; `apps/dev` reads `TRANSLATOR_STUB_SCENARIO` in `devToggles.ts`, beside a `TRANSLATOR_STUB=1` stub-xor-real switch.
    - The runtime switch is declined. It needs a guard action: either a public union member for a dev tool or a dishonest reuse of `enqueue`. A restart needs no rebuild.
  - **Invariants:** ST4 (one mock source, one world per module instance); ST2 (composition → server → wire; the client never imports it outside tests); ST5 (each piece cites an owner decision or research risk); ST6 (data, state machine, HTTP adaptation and wiring are separate).
- **Consequences:**
  - The two members are public surface after 1.0.0; the stub is not.
  - The stub, its `./stub` entry and its world never ship: they are deleted in step 13, before the branch merges.
  - After removal the in-memory test fake keeps its data: the `StubWorld` and the scenarios move into the entity's `__tests__/` in step 13, where the build already excludes them.
  - The stub's action handlers must reproduce the old action response shapes, which stay untouched.
  - The `TranslatorAction` pin tests change from nine members to eleven, and the stub's routes serve the new two until R9.
  - Unverified: that one process evaluates the Payload config once in `apps/dev`. Two configs would mean two worlds, and actions invisible to reads. Step 3's signal (enqueue, then read shows `running`) catches it.
- **Reversible:** yes — the stub is branch scaffolding. Only the two TranslatorAction members outlive it and become public at 1.0.0.
- **Guarded by:** the checks listed below —
  - The duplicate-path refusal test (stub + documentTranslation; stub + provenance).
  - A stub variant of `everyRegisteredRouteIsGuarded.test.ts` (every stub route answers 403 to a refusing guard; AC10).
  - `TranslatorAction.test.ts` and `everyRouteNamesItsAction.test.ts` updated to eleven.
  - The payload-free zone on `translation-stub/{model,scenarios}`.
  - Type-level conformance of stub action bodies to `ActionBodies`, where the existing handlers' response types are nameable (unverified per handler).
  - Built in steps 2–3.

#### D8. Strangler on the branch; the old reads die with their last consumer; swapping is a module-list change; the stub is removed in the same branch   [axis: rollout-sequence/cleanup-ownership]
- **Context:**
  - 9 live hooks, old popovers and old read endpoints are in use.
  - The owner replaces the old UI in place on the new branch.
  - Each merge to `major/translator` publishes a `next` prerelease.
  - The stub must be swappable without browser changes (AC4).
- **Options considered:**
  - 8-step strangler; `./stub` dropped after R9 if unadopted; the module kept in-tree (max-reuse)
  - 7-step strangler, one hook per commit; stub permanent (min-new-abstraction)
  - 8-step strangler with lint zones switched on late; stub permanent (cleanest-boundaries)
- **Decision:**
  - Strangler, sequenced as in the build sequence below.
    - Lint zones land in step 4, after the only upward edge is fixed in the same step.
    - Mutations move onto the repository in step 7: same paths and bodies, so behaviour is identical against both server modes.
    - New read hooks land beside the old in step 8.
    - Screens move one at a time (steps 9–11).
    - The sweep (step 12) deletes the old read hooks, `useDocumentStaleness`, `model/types.ts`, legacy keys and the `ofetch` lint allowance when the last importer is gone.
  - **The stub is temporary scaffolding with a named trigger** (owner decision, 2026-11-13; EV3): it is removed when the real read modules pass the contract suite through the in-process HTTP binding. Removal is step 13, owned by this feature branch, and the branch does not merge before it.
  - **Swap (R9):** the real read modules register the same `endpoints.ts` paths with the same members. The contract suite gains a binding against the real handlers, which must be green before `apps/dev` and hosts list the real modules instead of `translationStub()`. The duplicate-path refusal makes listing both impossible.
  - **Invariants:** EV1 (each step deploys and reverts alone; the max-reuse plan's step retiring `autoTranslateSummary` before `CollectionFacts` existed is moved to slice 4); EV2 (no big-bang); EV3 (every shim has trigger, step and owner); EV5 (old and new reads never read each other's shapes); EV6 (signals per step below).
- **Consequences:**
  - Between steps 7 and 12 two ways of reading status coexist on purpose.
  - The old popovers do not work in stub mode during the window.
  - Migration notes list:
    - throwing config/repository hooks;
    - serverProps carry `TranslateKitConfig`;
    - `document-state`/`list-state` added (custom guards must answer them);
    - duplicate plugin paths now refused;
    - API base taken from Payload config;
    - `useDocumentStaleness` and the old popovers removed;
    - no componentPath moved.
- **Reversible:** yes per step until 1.0.0 stable. Publishing 1.0.0 stable is the one-way door.
- **Guarded by:** the zone C5 `ofetch` allowance scoped to `entities/translation/api/queries/**` (its removal is step 12's done-signal); `refreshIsTheEntitys.test.ts`; the contract suite as the swap gate.

### Build sequence
1. **Wire contracts:** `src/types/wire/{DocumentTranslationState,ListTranslationState,TranslateKitConfig,ActionBodies,endpoints}.ts`, zone C5-wire, the AC9 probe skeleton.
   - Establishes the one type; unblocks 2, 3, 5.
   - Rollback: revert. Signal: check-types and the real `tsc` declaration build are green.
   - covers: R8 · own task · incremental
2. **Server seam:**
   - Duplicate-path refusal among the plugin's own contributions.
   - `deriveAbilities`.
   - `CacheProviderExport.serverProps` carries the full `TranslateKitConfig`, additively.
   - The boot tests: endpoint table pinned to the real routes; derived abilities per runner.
   - Rollback: revert. Signal: the existing route tests are unchanged and the boot tests are green.
   - covers: R8, R1 · own task · incremental
3. **Stub module:**
   - `translation-stub/{model,scenarios,http}`, the `translationStub()` factory, and a branch-only `./stub` entry so `apps/dev` (which consumes `dist`) can list it.
   - `document-state`/`list-state` members and the two pin tests.
   - The payload-free zone.
   - The AC10 stub-guard test.
   - The `apps/dev` `TRANSLATOR_STUB` + `TRANSLATOR_STUB_SCENARIO` toggles, with `provenance: false` in stub mode.
   - Rollback: revert; nothing lists it by default. Signal: stub routes answer and refuse like real ones; enqueue then read shows `running` in the sandbox.
   - covers: R2, R7, R8 · own task · incremental
4. **Client layers:**
   - Move `TranslateKitConfigContext` to `client/shared/config/` with a throwing hook.
   - Delete the dead `handleApiError` twin.
   - Rename `autoTranslateSummary.ts` → `.server.ts`.
   - Zones C1–C5 + client-tests override.
   - `layersHold.test.ts`, the lint probe test, `componentPaths.test.ts`.
   - "Client layers" section in the package CLAUDE.md; wrap the two existing component tests in the provider.
   - Rollback: revert. Signal: the probes are refused and the existing suite is green.
   - covers: R5, R6 · own task · incremental
5. **Red-first repository:**
   - `TranslationRepository` interface, `ThrowingTranslationRepository` fixture, `describeTranslationRepositoryContract`.
   - Red run recorded in `docs/plans/artifacts/`.
   - In-memory fake over `StubWorld`, green.
   - Rollback: revert; no production caller yet. Signal: red is recorded before any implementation exists.
   - covers: R3 · own task · incremental
6. **HTTP implementation:**
   - `client/shared/api/{createRequest,errors/ApiRequestError}.ts` with both named timeouts, `useApiBase`, `HttpTranslationRepository`.
   - In-process HTTP binding green; failure-path tests; AC10 through the repository.
   - Rollback: revert. Signal: the same suite is green on the fake and on HTTP.
   - covers: R2, R3, R4 · own task · incremental
7. **Composition root and actions:**
   - CacheProvider becomes the per-mount root with both throwing contexts.
   - `translationKeys` (with `legacy.*`), `useRefreshTranslation`.
   - The 6 mutation hooks move to `mutations/` on the repository; the widget's deep `useTranslateField` import goes through the barrel.
   - AC6 test, `refreshIsTheEntitys.test.ts`.
   - Rollback: revert; paths and bodies are unchanged. Signal: the sandbox's enqueue/cancel/run-now/field work against both real and stub modules.
   - covers: R4, R5 · own task · incremental
8. **New read hooks:**
   - `queries/useDocumentTranslationState.ts`, `queries/useListTranslationState.ts` with the polling rule, beside the old reads.
   - Rollback: revert. Signal: in stub mode the network log shows only `/api/<basePath>/…` requests.
   - covers: R1, R4 · own task · incremental
9. **Document panel** on the new hooks; refresh after save is wired to the Payload save signal.
   - Rollback: revert the screen commit.
   - covers: R1, R7 · own task · incremental
10. **Collection list column and panel** on `getListState`.
    - Depends on 23.10 §8 (`ComponentContext.addConfigModifier`), which is open.
    - Rollback: revert the screen commit.
    - covers: R1, R7 · own task · incremental
11. **Field control** (seven states) on `translateField`.
    - Rollback: revert the screen commit.
    - covers: R1, R7 · own task · incremental
12. **Legacy sweep:**
    - Delete the old read hooks, `useDocumentStaleness`, `model/types.ts`, `legacy.*` keys and the C5 `ofetch` allowance.
    - Retire `autoTranslateSummary.server.ts` in favour of `CollectionFacts`.
    - Record the AC8 canvas walkthrough; finalise the migration notes.
    - Rollback: revert the sweep commit.
    - covers: R1, R5, R7 · own task · incremental

13. **Stub removal** (after the real read modules exist — R9, outside this design):
    - Bind the contract suite's HTTP binding to the real handlers; it must be green first.
    - Move `StubWorld` and the scenarios into `client/entities/translation/__tests__/` for the in-memory fake.
    - Delete the stub module, its factory, the branch-only `./stub` entry and the `apps/dev` stub toggles.
    - Rollback: revert the removal commit. Signal: the suite is green on the real handlers and `grep translationStub` finds nothing outside tests.
    - covers: R4 · own task · incremental

### Open questions / unresolved
- **Per-user abilities (23.10 §4 Open).** Abilities are installation-wide. A guard-refused control renders and then shows `forbidden`. Affects steps 9–11. Not resolvable here, because whether a server component can ask the guard per user is unverified.
- **D4 abilities mechanism — confirmed by the owner (2026-11-13).** It was not proposed by any candidate. It is taken from 23.10 §4's own text because all three proposals restated the capability→route rule (ST4). To confirm: the derivation table (`translate` ⇐ enqueue route, `staleness` ⇐ dismiss route). Blocks step 2 only if the owner disagrees.
- **List column placement.** Step 10 depends on 23.10 §8 (`ComponentContext.addConfigModifier`), which is open.
- **The Payload event behind "refresh after save"** is unverified. Step 9 owns finding it; ownership is already fixed (D5).
- **Runtime scenario switching is declined.** If the AC8 walkthrough shows restart-per-state is too slow, revisit. That needs an access-action decision (a new member vs. none) and touches step 3.
- **Deploy skew with no edge parse (D2).** Revisit if a stale-tab failure is observed. The change is local to `HttpTranslationRepository`.
- **Unverified facts each step must spike first:**
  - Step 4: `useConfig` availability inside custom admin providers (fallback: `apiBase` via serverProps); oxlint `allowTypeImports` support for zone C4 (fallback: ban only `@payloadcms/ui` values).
  - Step 6: ofetch `createFetch` custom-`fetch` injection and its timeout error shape.
  - Step 3: whether the existing action handlers' response types are nameable for the conformance check; single config evaluation per process in `apps/dev`.
  - Verified, not open: `PluginConfigBuilder` dedup is silent and first-wins (`PluginConfigBuilder.ts:141-152`); `NextApiError` is `{message, details?: ZodIssue[]}`; `permission.ts` does not branch on `TranslatorAction`.
- **R9 swap** (outside this design): the real read modules plus the fourth contract binding. Procedure in D8.

### Accepted deviations (if any)
None.

### Rejected / grafted (for the record)
**Scores against the ask (H/M/L):**

| Axis | max-reuse (A) | min-new-abstraction (B) | cleanest-boundaries (C) |
|---|---|---|---|
| requirement-coverage | H | H | H |
| placement | H | M | M |
| dependencies | H | L | L |
| abstractions | M | H | M |
| dataflow-state | M | M | M |
| rollout-sequence | M | H | H |
| compatibility-window | M | M | M |
| reversibility | H | H | H |
| cleanup-ownership | M | H | H |

- **Coverage gate:** no candidate is disqualified as a whole. Each meets R1–R8. Each self-reported R7 as partial, but boot-time env selection is selection without editing code.
- **Spine:** max-reuse. It is the only candidate whose layer rules match the code as it is (boundary files, `src/types` type imports, the core edge), and it has the most complete per-step rollback.

**Disqualified or declined, by source:**
- **All three:**
  - Declared abilities (`TranslationModule.abilities?` / `ctx.declareAbilities`). Disqualified: ST4 — a second statement of the capability→route rule in `createTranslationRoutes.ts:38-52`, contrary to 23.10 §4's derivation.
  - One 15 s timeout applied to synchronous `translateField`. Missed cost; replaced by two named timeouts.
  - "Tests exempt via T6" for `*.contract.ts`/`*.fixture.ts`. False (T6 covers `*.test.ts(x)` only); replaced by the client-tests override.
  - Never-both rules blind to the provenance module's `/stale/dismiss`. Replaced by the duplicate-path refusal.
- **max-reuse:**
  - Reuse of `document-status`/`collection-status` for the new reads. Rejected: it widens access to verdicts for guards that distinguish `document-staleness`.
  - Retiring `autoTranslateSummary` in the lint step. Disqualified: EV1 — it breaks the marker until `CollectionFacts` ships.
  - `routes.ts` path *builders* in `types/wire`. Replaced by the const table.
  - Making dedup throw globally, including against host endpoints. Narrowed to the plugin's own contributions.
  - Conditional removal of `./stub`, and later "permanent". Both replaced by the owner's decision: branch-only scaffolding removed in step 13.
- **min-new-abstraction:**
  - Rules banning client → all of `src/types` except wire, and → `server`. Defect: they fail on today's `TargetSelection` imports and four boundary files.
  - Top-level `src/stub/`. Placed inside the stub module instead.
  - Pseudo-id scenario selection. Unworkable on real Payload ids.
  - Name-based refuse-both. Replaced by the duplicate-path refusal.
- **cleanest-boundaries:**
  - `src/wire`, `src/mocks` and `src/stub` as new roots. No boundary gained over zones.
  - Zod schemas at the edge. A second description with a looser-schema hole (ST5).
  - Two repositories plus a `Transport` interface; `createTranslateKitRuntime`; curried query options. ST1: one non-test caller each, given one repository.
  - The runtime scenario switch guarded by `enqueue`. A dishonest action.
  - The same over-broad client→outside ban as min-new-abstraction.

**Grafted:**
- From **min-new-abstraction:** the `layersHold` scan test; rules in the package CLAUDE.md; the throwing-stub red binding; new TranslatorAction members (shared with C); a stub permanent by design (shared with C).
- From **cleanest-boundaries:**
  - `queries/`/`mutations/` folders with `api/` as transport only;
  - `ApiRequestError` with a closed `reason` (keeping `details` for forms);
  - the Payload-runtime zone for entity internals;
  - the const endpoint table;
  - a payload-free world;
  - `allowInProduction`;
  - the failure-path case list (run through injected fetch, not `vi.stubGlobal`);
  - the action-shape conformance check.

**Coherence of the merged whole, re-checked:**
- **Mock source vs build exclusion:** one mock source in `server/modules/translation-stub/{model,scenarios}`, outside `__tests__`, so it compiles for the server. Payload-free by zone, so the client fake can import it from `__tests__` through the explicit override.
- **TranslatorAction:** two new members, no other change.
- **zod:** declined; it stays a deliberate dependency used by forms.
- **Wire home and paths:** one wire home (`src/types/wire`); one path spelling (`endpoints.ts`).
- **One repository** and one context.
- **Per-mount root** at the kept public path.
- **Both contexts throw.**
- **R7:** scenarios chosen at boot.

### Next
Trace the seams of this file (the design has more than three seams: wire, repository, stub module, abilities derivation), then start build step 1.