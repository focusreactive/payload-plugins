# Admin UI 1.0 on stubs — a working interface over mock endpoints, on a hybrid FSD client

Follows [2026-11-13-admin-ui-1.0.research.md](./2026-11-13-admin-ui-1.0.research.md). The screens are
the "1.0 — first release" page of the design canvas; their behaviour and the decisions behind them
are recorded there and are not re-opened here.

Source: 2026-11-13-admin-ui-on-stubs.research.source.local.md

## Problem statement

The 1.0 admin needs server data that does not exist yet: per-locale content and run state, the
field tree, the abilities of the runner (designed in
[2026-10-23-what-the-admin-needs-from-the-server.md](./2026-10-23-what-the-admin-needs-from-the-server.md),
not built). Building the screens only after the server is done serialises the work and leaves the
contract untested by a real consumer. The interface is therefore built first, against the plugin's
own endpoints answering with mock data, so that replacing the mocks with the real server later changes
one implementation and nothing the screens see. To make that swap a one-line change, the admin client
needs what it lacks today: a data-access seam (a repository interface with interchangeable
implementations, proven by tests written before the implementation), and enforced layer rules, taken
from two reference projects — one for the client architecture, one for the Payload admin specifics.

## Requirements

- R1 (in) The 1.0 screens (document panel, collection list column and panel, field control) work in the admin end to end, driven by mock data.
- R2 (in) The mock data is served by the plugin's own endpoints, so the browser makes real requests to the same paths the real server will answer.
- R3 (in) Data access in the admin goes through a repository: an interface, a test suite written against the interface and run red first, then an implementation.
- R4 (in) The repository's implementation can be replaced — first the stub, later real requests to the plugin's server — without changing the screens or their hooks.
- R5 (in) The admin client follows a hybrid FSD layout with written rules, adopting what the client already has where it fits.
- R6 (in) Missing architecture pieces are taken from the two reference projects: FSD and repository design from the frontend one; Payload-admin specifics from the Payload one.
- R7 (in) [inferred] The mock answers cover every state drawn on the 1.0 canvas, selectable without editing code — rests on: the 1.0 page draws about twenty distinct states (every locale state, loading, failure, no locales, provenance off, the field control's seven states); a working UI on stubs that shows only the happy path cannot be checked against the design.
- R8 (in) [inferred] The wire shapes the stub endpoints return are the designed contracts of 23.10 §1–5, shared by the client and the server as one type — rests on: the swap in R4 is only free if the stub and the real server answer the same type; today only one wire type is shared and the others are kept in sync by hand.
- R9 (out) Building the real server read model behind the endpoints (slice 1 of the 1.0 research).

## Codebase map

Paths under `packages/payload-plugin-translator/` unless absolute.

### The client today

- Layout: `src/client/{app,widgets,features,entities,shared}` — FSD-like, **not enforced**: `oxlint.config.ts:405-474` (repo root) has zones only for `src/core` and `src/traversal`; nothing stops `entities` importing `widgets`.
- Data access: no seam. Each hook in `src/client/entities/translation/api/{queries,mutations}/*.ts` calls `ofetch` directly with an inline URL (`/api` hard-coded, e.g. `useDocumentTranslation.ts:34`). Query keys are inline arrays; mutations invalidate by string literal (`useQueueDocumentTranslation.ts:31-35`).
- Types: hand-written client models in `src/client/entities/translation/model/types.ts`; server models separate (`src/server/features/get-document-status/model.ts`, `staleness/model.ts`). Shared wire types: only `src/types/wire/field-translation.ts`.
- Providers: `src/client/app/cache/CacheProvider.tsx` — a module-level singleton `QueryClient` (`:8`) and the `TranslateKitConfig` context carrying `basePath` (`src/client/app/config/TranslateKitConfigContext.tsx:6-33`); registered through `CacheProvider.export.ts` as the plugin's admin provider (`src/plugin.ts:288`).
- Duplicates: `src/client/shared/lib/errors/handleApiError.ts` and `src/client/shared/lib/utils/errors/handleApiError.ts`.
- Payload registration: `*.export.ts(x)` classes with `path = clientComponentPath(...)` (`src/client/shared/utils/componentPath.ts:7-9`) → `@focus-reactive/payload-plugin-translator/client/...`, resolved from `dist` (`package.json` exports `./client/*`).
- Tests: one vitest config (`vitest.config.ts`, node env); component tests opt into jsdom per file; one render test (`features/collection-translation-progress/ui/__tests__/CollectionTranslationProgress.test.tsx`) mocks `@payloadcms/ui` with `vi.mock`; no hook is tested; no fetch mocking.

### The server today (where stubs plug in)

- Routes are built by per-route factories that construct their handler inside (`src/server/features/*/route.ts`, e.g. `get-document-status/route.ts:13-29`), wrapped in `withAccessCheck(withErrorHandler(...))`.
- Routes are contributed by **modules** — a list in the plugin config (`src/composition/modules/documentTranslation.ts:9-25`, `fieldTranslation.ts:11-25`, `server/modules/provenance/Provenance.module.ts:54-57`) through `ctx.addEndpoints` (`server/modules/plugin-config/PluginConfigBuilder.ts:85`). A stub module registering the same paths with mock handlers fits this seam without touching the route factories.
- Abilities: route registration already depends on runner capabilities (`createTranslationRoutes.ts:39-52`); 23.10 §4 designs abilities carried by the admin provider.

### The sandbox

- `apps/dev` consumes the built plugin (`workspace:*` → `dist`); `turbo dev` depends on `^build`. Plugin config at `apps/dev/src/payload.config.ts:94-105`. Dev switches already exist in `apps/dev/src/lib/translator/devToggles.ts` (`TRANSLATOR_SYNC`, `TRANSLATOR_DRY_RUN`). Seed: `bun run seed`. After component path changes: `bun run generate:importmap`.

### Reference: cibula (frontend, no Payload) — FSD and repositories

`/Users/FocusReactive/Documents/Projects/cibula/cibula/apps/web/src`, rules in `CLAUDE.md` and `.claude/rules/web/*.md`.

- Layers `01-app … 06-shared`, strictly downward; features never import features; entity-to-entity only types/DTOs, declared at the top of the importing entity's `index.ts`.
- One root `index.ts` per slice; export only what is imported; namespace exports (`*UI`, `*Queries`, `*Mutations`, `*Logic`).
- Repository: interface `XRepository` in the entity's model (`05-entities/ingredient/model/ingredient.repository.ts:88-95`), its TSDoc listing "obligations the signature cannot state"; implementation `XRepositoryImpl` receives its transport through the constructor (`api/ingredient.api.ts:22`); entity-owned `repository-context.tsx` with a factory, a provider, and a hook that **throws** when no provider is mounted (`:11-35`); one composition root builds all repositories per request, no module singletons (`01-app/providers/repositories.tsx:23-62`).
- Query options curried over the repository (`createXQueryOptions(repo)(params)`); hierarchical key factories in a file that imports nothing; refresh exposed by the entity, no `invalidateQueries` above it.
- Red-first: contract → throwing stub → tests red → implement. A contract with two implementations gets a reusable suite `describeXRepositoryContract(name, create)` (not named `*.test.ts`), bound once per implementation (`catalog-view.repository.contracts.ts:31`, bound in `url.catalog-view.repository.test.ts:58` and `catalog-view.fixture.test.ts:6`). Fakes live in `__tests__/*.fixture.ts`.
- Feature ports (`ActionPort`, `WithPorts`) above repositories for use-case actions.
- Wire `*.api-type.ts` vs domain `*.domain-type.ts`, mapped by `from-api` DTOs; typed `ApiError`.

### Reference: esperanza-homes-website (Payload 3.90) — admin specifics

`/Users/FocusReactive/Documents/Projects/esperanza-homes/esperanza-homes-website/apps/web`, plus the sibling plugin `payload-plugin-section-presets`.

- Admin components each in a folder with a `ref.ts` that returns the import-map reference without importing the component, typed by the slot's props (`ARCHITECTURE.md:159-167`, `cms/admin/AccentLineHint/ref.ts:7-13`); a test globs every `ref.ts` and checks the export exists (`cms/admin/__tests__/refs.spec.ts:1-30`).
- Repository on the site side mirrors cibula (`site/05-entities/lead/model/repository/*`, composition in `site/01-app/context/repositories.tsx:6-29`), its implementation currently **a stub** behind the interface — the same shape this task asks for.
- Plugin: `core` / `server` / `client` split; Payload reached only through adapter folders (`client/payload/*`), enforced by lint; ports with typed error-reason unions; REST adapters tested with `vi.stubGlobal("fetch")`; API base from `config.serverURL + config.routes.api` (`client/payload/apiUrl/useApiUrl.ts`).
- Theming only through Payload CSS variables; `@payloadcms/ui` used where it is plain to reuse (`Drawer`, `useModal`, `Pill`, `Button`, `Banner`); no `Tooltip`, `useSelection`, `useListQuery` usage to copy.
- Neither reference has stub endpoints, shared zod endpoint contracts, MSW, or `beforeListTable` — those parts are new here.

### What the client lacks against the references

| Piece | Here | Take from |
|---|---|---|
| Repository interface + Impl with injected transport | none | cibula |
| Provider that throws without a repository; composition root per mount | singleton `QueryClient`, no repositories | cibula / esperanza site |
| Contract suite bound to fake and HTTP implementations | none | cibula |
| Key factories; refresh owned by the entity | inline arrays, string invalidation | cibula |
| Enforced layer rules | none for `src/client` | cibula rules + esperanza lint zones |
| Shared wire contracts | one file | new (neither has it) |
| Stub endpoints | none | new — via a plugin module |
| Import-map reference test | none | esperanza `refs.spec.ts` |
| API base from Payload config | `/api` hard-coded | section-presets `useApiUrl` |

Prior art: none for stubs or repositories in this package; the 1.0 research and 23.10 define the data.

## External dependencies

None outside the repository. Payload extension points used by the screens are recorded and checked in
the 1.0 research.

## Non-functional scan

- Performance — N/A for stubs; the contracts must still allow one request per list page (1.0 research R10).
- Security / access — relevant: stub endpoints must sit behind the same access guard as the real ones, and must not be registered in a production build by accident.
- Accessibility — relevant: carried from the 1.0 research (R19 there).
- i18n — N/A: plugin strings stay English.
- Observability — N/A.

## Acceptance criteria

| AC | Covers | Criterion | How it is checked |
|---|---|---|---|
| AC1 | R1, R2 | With the stub module enabled in `apps/dev`, every 1.0 screen renders from responses of the plugin's endpoints; the browser's network log shows requests to `/api/<basePath>/…` and no other data source | manual check in the sandbox + integration test hitting the stub endpoints |
| AC2 | R3 | Each repository interface has a contract suite that fails against a throwing stub before any implementation exists | red run recorded in `docs/plans/artifacts/` |
| AC3 | R3, R4 | The same contract suite passes against the in-memory fake and against the HTTP implementation talking to the stub handlers | vitest |
| AC4 | R4 | Switching from stub to real server changes only the server module / implementation binding; no file under `widgets/`, `features/` or the screens' hooks changes | review of the swap diff (when slice 1 lands) |
| AC5 | R5 | Layer rules are written down and lint refuses an upward import inside `src/client` | oxlint run on a probe file |
| AC6 | R5 | A component test that forgets the repository provider fails with a named error, not a network call | vitest |
| AC7 | R6 | Every adopted piece from the reference table is either present or explicitly declined with a reason in the design | review of the design doc |
| AC8 | R7 | Every state on the 1.0 canvas can be shown in the sandbox by choosing a mock scenario, without editing code | manual walkthrough against the canvas |
| AC9 | R8 | The stub handlers and the client import the response types from one shared module; a field renamed on one side fails type-check on the other | tsgo probe |
| AC10 | R2 | A request without permission to the stub endpoints is refused like the real endpoint would refuse it (negative path) | integration test |

## Open questions

1. **Where the stub lives** *[resolved]* — the request names both "stubs on the plugin's endpoints" and "the implementation is first a stub, later real requests". Two readings: (a) the client repository is HTTP from day one and the **server handlers** behind the plugin's endpoints return mocks, later replaced; (b) the **client repository** has a stub implementation returning mocks in the browser, later replaced by HTTP. Matters because: (a) exercises the real transport, the access guard and the wire contract now; (b) needs no server work but proves nothing about the contract.
2. **Contracts first or current endpoints** *[resolved]* — do the stub endpoints answer the new designed contracts (23.10: per-locale content + run, tree, abilities, page-scoped list status), or the current endpoints' shapes? Matters because: the 1.0 screens cannot be drawn from today's shapes (no "not translated" row, no tree), and stubbing the old shapes would be thrown away.
3. **Old UI** *[non-blocking]* — the current popovers are replaced in place on the new branch, not kept beside the new ones. Assumed from the major and the earlier decision to build on a new branch.
4. **Mock scenarios** *[non-blocking]* — how a scenario is chosen in the sandbox (by document id, by a dev toggle, by a query parameter). Matters because: R7.
5. **How far the cibula rules go** *[non-blocking]* — numbered layer folders, namespace exports and feature ports are heavier than this small client may need. Matters because: adopting all of them is a large rename of a package about to ship a major.
6. **Shipping the stubs** *[non-blocking]* — is the stub module exported from the package (useful to hosts for demos and tests, e.g. through `./testing`) or kept in the sandbox only?

Restate check:
- "Repository" here = the client-side data access for the admin (browser → plugin endpoints), not the server's stores (`ProvenanceStore`, run records).
- "Stub" = a working implementation returning fixed mock data for every designed state, not a throwing placeholder; the throwing placeholder is only the red step of the tests.

## Decisions by the owner

- 2026-11-13 — the stub endpoints answer the new contracts designed in 23.10 (per-locale content and run, field tree, abilities, page-scoped list status), as types shared by client and server. Today's shapes cannot draw the 1.0 screens, and stubbing them would be thrown away.

- 2026-11-13 — the stub lives on the server. The browser's repository uses HTTP from day one. A separate stub module registers the new read endpoints, which answer with mocks. It also registers the existing action paths (enqueue, cancel, run now, dismiss, translate field) with handlers that change the mock state in memory. Existing endpoints and handlers are not touched. The sandbox enables either the stub module or the real modules, never both, because the action paths coincide. Replacing the stub later means switching modules; the browser code does not change. Reason: transport, access guard, wire format, base path and failure states are exercised now, not at the end. An in-memory repository exists only for tests, bound to the same contract suite as the HTTP one.

## Risks & constraints

- Client components load from `dist`: every sandbox check needs a rebuild (`turbo build`) and, after path changes, `generate:importmap`.
- `@payloadcms/ui` cannot be imported in vitest without mocking or inlining (CSS imports) — component tests need the esperanza approach (`server.deps.inline`) or the existing `vi.mock`.
- A stub module that registers real paths must never be enabled by a host by accident; its name and export path must say "stub".
- Renaming the client into numbered layers touches every import in `src/client` and the `componentPath` strings that hosts' import maps reference — a public-path change.

## Size check

Too large for one task. Proposed split:

1. **Client architecture design** — the hybrid FSD rules and the repository pattern for this package (one design doc, lint zones).
2. **Wire contracts + stub module** — shared response types per 23.10, a stub module serving every scenario.
3. **Repositories** — interfaces, contract suites (red), fake and HTTP implementations, composition root.
4. **Screens** — document panel, collection column and panel, field control, on the repositories.

## Consistency self-check

- R9 (out) is respected: AC1–AC10 test stubs and seams, never the real read model.
- R7 and R8 are inferred and kept: without R7 the stubs cannot be checked against the canvas; without R8 the swap in R4 is not free.

## Readiness

- Unresolved `[blocking]` questions: 0.
- IN requirements without an acceptance criterion: 0.

Next: sp-architect

`/sp-architect` for slice 1 (client architecture) — likely vectors `contract`
(shared wire types between stub and real server), `evolution` (replacing the stub without touching
the screens; renaming client paths hosts reference) and `ui-state` (providers, query keys, refresh).
