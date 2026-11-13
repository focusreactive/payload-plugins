# Server seam for the 1.0 admin

Build step: 2026-11-13-admin-ui-on-stubs.design.md #2

## Requirements / Task restatement

The admin must learn, once and at boot, what this installation's server can do, and it must learn
it from the routes that actually registered, so the two cannot drift. Three server changes carry
that:

- Two of the plugin's own contributions may no longer claim one `method + path`. Today the second
  is dropped in silence and the first wins; from now on the plugin refuses at config time with a
  named error. A route the host's own config already holds still wins over the plugin's, as before.
- `deriveAbilities(registered routes, basePath)` turns the registered list into the wire
  `Abilities`, reading every path from the one endpoint table: `translate` from enqueue, `cancel`
  from cancel, `runNow` from run, `staleness` from dismiss, `translateField` from field. Every flag
  is always present.
- The cache provider's export carries the whole wire `TranslateKitConfig` — `basePath`,
  `abilities` and, per managed collection, its auto-translate targets — additively, so today's
  provider keeps reading `basePath`.

Boot tests pin the endpoint table to the real routes and the derived abilities to the runner.

## Decisions

- **Where the provider is made.** The provider export is now made by a function the builder calls
  inside `applyTo`, after every config modifier has run, and handed the final config and the
  plugin's own endpoints. Rejected: building it in `plugin.ts` before `applyTo`. The endpoints are
  already final there, but the auto-translate targets are not: the auto-translate modifier dedupes
  them and drops unknown locales while it runs, and only the config after it says what the existing
  controls show.
- **Abilities read the plugin's own endpoints**, not `config.endpoints`. A host route that shadows
  one of ours still serves that path, so both lists give the same answer for it; the plugin's own
  list cannot be turned on by an unrelated host route that happens to share a path.
- **The refusal is raised when a contribution is added**, not when the config is applied, so the
  builder's own list is unique by construction and `deriveAbilities` never sees a duplicate.
  Precedence against the host stays in `applyTo`, unchanged; applying the plugin twice to one
  config still works, because the second pass sees the first pass's routes as the host's.
- **The config travels in `clientProps`, not `serverProps`.** Payload hands a component's
  `serverProps` only to a server component, and the cache provider is a client component, so
  `serverProps` never reached it: a custom `basePath` has been silently lost in the browser. Rejected:
  `serverProps`, as the design wrote, because nothing put there arrives. Carried in `clientProps`,
  the config is plain data and reaches the provider; its `basePath` prop is now actually honoured.
- **Collection facts reuse `resolveAutoTranslateSummary`**, read off each managed collection in the
  final config: its targets, or `[]` when it is off or has no target left. The facts function sits
  beside the provider export in `client/app/cache/`, so the server half does not import a client
  entity. Rejected: re-deriving targets from the plugin's own collection list, which would restate
  the dedupe and known-locale filter.
- **One spelling of a route key**, `routeKey()`, shared by the builder, the error and
  `deriveAbilities`.
- **`DuplicateEndpointError` extends `TranslatorError`** with `mustPropagate = false`, as
  `TranslatorConfigError` does: the package requires every error thrown under `server/` to be one
  of its own, and a config refusal is raised before any Payload operation runs. Rejected:
  subclassing `TranslatorConfigError`, which the guard over thrown errors does not recognise as
  one of the package's own.

## Acceptance criteria

| AC | Covers | Criterion | How it is checked | Result |
|---|---|---|---|---|
| AC1 | R8 | Each action entry of the endpoint table (enqueue, cancel, cancelByCollection, runNow, dismissStaleness, translateField) is exactly a `method + path` the real modules register under the default `basePath` | boot test `theAdminIsToldWhatRegistered.test.ts` boots `documentTranslation()`, `fieldTranslation()` and provenance on a capable runner | met — 6/6 `the endpoint table names the routes the real modules register` cases green |
| AC2 | R1 | Derived abilities are all `true` with the three modules on a capable runner, and `cancel`/`runNow` are `false` on the sync runner | same boot test, read through the provider export's props | met — red on a skeleton returning all `false` (2 failures), green after `deriveAbilities` |
| AC3 | R1 | The provider export carries the full `TranslateKitConfig`: `basePath`, every ability flag, and per managed collection its auto-translate targets (source dropped, unknown locales dropped, `[]` when off) | same boot test | met — `posts: ["de"]` from targets `en, de, de, xx` with default `en`; `pages: []`; unmanaged `users` absent; `/i18n` base path carried |
| AC4 | R8 | Two of the plugin's own contributions with one `method + path` are refused with `DuplicateEndpointError`, both inside the builder and through the plugin; a host route sharing a path is not refused and keeps precedence | `PluginConfigBuilder.test.ts` and the boot test | met — red before the refusal (4 failures), green after; the host-precedence case stayed green throughout |
| AC5 | R8 | `deriveAbilities` only counts a route under the given `basePath` and with the table's method | `abilities.test.ts` | met — 5 cases green; the positive case was red on the skeleton |
| AC6 | R1, R8 | Nothing existing breaks: the route tests are unchanged and green | check-types, the full test run, lint, and the declaration build | met — check-types 0 errors; 225 test files / 2646 tests passed; oxlint 0 errors and no warning in a touched file; `bun run build` (tsc declarations) green |

## Risk notes

- The builder's own duplicate test changes meaning: it asserted the silent drop, which is the
  behaviour removed here.
- `clientProps` instead of `serverProps` changes what the browser receives: a host with a custom
  `basePath` now gets it in the admin, where before the admin quietly used the default. That fixes
  a defect rather than breaking a host.
- `addAdminProvider` now takes a function; it is internal to the builder, so no host sees it.
