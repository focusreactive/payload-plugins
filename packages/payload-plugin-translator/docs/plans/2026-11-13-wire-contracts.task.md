# Wire contracts for the 1.0 admin

Build step: 2026-11-13-admin-ui-on-stubs.design.md #1

## Requirements / Task restatement

Give the admin, the server stub and the later real server one shared description of what crosses
between them. The description covers the per-document translation state, the per-page list state,
the admin config with its abilities, the bodies of the existing action routes, and one table of
endpoint paths. It must import nothing, so that both halves can depend on it. The bodies of the
existing routes must provably match what those routes accept.

## Decisions

- **Home:** `src/types/wire/`, beside the existing `field-translation.ts`. Rejected: a new
  top-level `src/wire`. It would move a file and add a root for a boundary a lint zone already gives.
- **Type-only, no runtime schema.** The client and the server ship in one package version.
  Rejected: zod at the client edge, which would give a second description of each type.
- **`RunState` is a union by status, and carries the run `handle` and its `locales`.** Cancel and
  retry act on the whole run, so the admin must know which locales one press affects.
- **`ContentState` adds `filled`** (content present, no records kept) beside the 23.10 kinds. With
  provenance off, every translated locale would otherwise read as `untracked` ("written by hand").
- **The tree adds `whole-list`:** a block list localized as a whole is offered as one item with all
  its leaf addresses.
- **The list read is `GET .../list-state/:collection_slug?ids=…`:** one request per page.
- **Request bodies use mutable arrays, and enqueue's ids are non-empty**, so they are assignable to
  the routes' zod inputs.
- **Named primitives** (`LocaleCode`, `LeafAddress`, `RunHandle`, `DocumentId`, `IsoDateTime`):
  the wire cannot import the core's branded address.

## Acceptance criteria

| AC | Covers | Criterion | How it is checked | Result |
|---|---|---|---|---|
| AC1 | R8 | Each action body type is assignable to its route's zod input, and the enqueue assignment output is assignable to the wire body | `src/types/wire/__tests__/actionBodiesConformToTheRoutes.test.ts` under `check-types`; a renamed field (`source_lng` → `source_locale`) makes check-types fail with 1 error | met |
| AC2 | R8 | A wire file importing anything but a sibling is refused by lint | a probe file importing `payload` and `../AccessGuard.js` gives 2 `no-restricted-imports` errors, while a sibling import passes | met |
| AC3 | R8 | Nothing existing breaks | check-types 0 errors; vitest 223 files passed | met |

## Risk notes

Low risk: purely additive types, no runtime caller yet. The lint script was already failing on
three unformatted `.scss` files on the base branch; this step adds no new lint finding.
