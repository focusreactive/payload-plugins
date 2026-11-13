# New read hooks

Build step: 2026-11-13-admin-ui-on-stubs.design.md #8

## Requirements / Task restatement

R1, R4: the screens of steps 9 to 11 read translation state through the repository from context,
under the key factory, with one polling rule. The old read hooks stay untouched beside them until
the legacy sweep.

- **`useDocumentTranslationState`** (`client/entities/translation/queries/`) reads
  `repository.getDocumentState` under `translationKeys.document(collection, id)`, and sends nothing
  while the document has no id.
- **`useListTranslationState`** (same folder) reads `repository.getListState` once for a whole
  page, under `translationKeys.list(collection, idsKey)`, where `idsKey` is the page's ids joined in
  page order. An empty page sends nothing.
- **`pollWhileRunning`** (`queries/polling.ts`) answers `POLL_INTERVAL_MS = 20_000`, today's value,
  while any locale it is given has a run that is queued or running, and `false` otherwise. Both
  hooks use it as their `refetchInterval`.
- The entity barrel exports the two hooks, whose named consumers are the screens of steps 9 to 11.

## Decisions

- **One generic polling rule over locales,** `pollWhileRunning(locales)`, which reads only each
  locale's `run`. The document hook passes its locales, the list hook every row's locales
  flattened. Rejected: one function per wire shape, which would repeat the same test twice.
- **Only `queued` and `running` keep polling.** A `failed` or `not-started` run waits for the user,
  so polling it would only repeat the same answer. This narrows the design's "any run".
- **A missing request is expressed with `skipToken`, not `enabled` plus an assertion.** The query
  function is `skipToken` while the document has no id or the page has no ids, which disables the
  query and lets the type checker see that the request is complete when it runs. Rejected:
  `enabled` with a non-null assertion on the id.
- **The document hook takes `{ collection, id }` with `id` possibly `undefined`,** the shape a
  document view has before its first save. The key for that case uses `UNSAVED_DOCUMENT`, a named
  empty id; a skipped query never fetches or holds data, so the shared key is harmless. A
  collection is always known to a collection's document view; a global is not in scope.
- **`idsKey` is `ids.join(",")`,** the same separator the list-state path already uses for its
  query string. A different page order is a different key, which the design intends.
- **No hook-level polling test.** The rule is a pure function with its own test; that each hook
  passes it to `refetchInterval` is read in review. Rejected: a fake-timer test per hook, which
  would mostly test the query library.

## Acceptance criteria

| AC | Covers | Criterion | How it is checked | Result |
|----|--------|-----------|-------------------|--------|
| AC1 | R1, R4 | The document hook answers the state the repository in context returns | `readHooks.test.tsx` over the in-memory fake under the providers | passes; red on a stub hook that never fetched |
| AC2 | R1, R4 | After an enqueue through the repository and a refresh, the document hook shows the run on the enqueued locale | `readHooks.test.tsx` | passes: the `de` locale reads a `queued` run after the refresh; red on the stub |
| AC3 | R1 | The document hook sends no request while the document has no id | `readHooks.test.tsx` with a spied `getDocumentState` | passes: the spied `getDocumentState` is never called and `data` stays undefined |
| AC4 | R1, R4 | The list hook makes exactly one repository call for a page of N ids, with every id | `readHooks.test.tsx` with a spied `getListState` | passes: one call with all three ids, three rows answered; red on the stub |
| AC5 | R1 | The list hook sends no request for an empty page | `readHooks.test.tsx` | passes: the spied `getListState` is never called |
| AC6 | R1 | The polling rule answers the interval while a run is queued or running, and `false` for no run, a failed run, a not-started run and no locales | `polling.test.ts`, pure | 7 passed; the queued and running cases were red on a rule answering `false` |
| AC7 | R1, R4 | Types, tests, lint and the declaration build are green, and the refresh scan test still holds | `bun run check-types`, `bunx vitest run`, `oxlint`, `oxfmt --check`, `bun run build` | check-types clean; vitest 244 files passed, 1 skipped, 2798 tests passed (`refreshIsTheEntitys.test.ts` included); repo-root `oxlint`: 0 errors, 30 warnings, none in the new files; `oxfmt --check` flags only the pre-existing `.scss` files; `bun run build`: swc 461 files, `tsc` declarations clean |

## Risk notes

- Polling is not checked through the hooks; a hook that forgot `refetchInterval` would pass every
  test here. The document panel of step 9 shows it in the sandbox.
- A page whose ids change on every render with the same content keeps one key, since the key is the
  joined text; a page that reorders its ids refetches.
- The sandbox signal, only `/api/<basePath>/…` requests in stub mode, needs a running host and is
  not checked here.
