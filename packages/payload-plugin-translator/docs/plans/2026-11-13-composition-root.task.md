# Composition root and actions

Build step: 2026-11-13-admin-ui-on-stubs.design.md #7

## Requirements / Task restatement

R4, R5: the admin's actions go through the repository that step 6 built, and the client gets the
one place where that repository, its transport and the cache are put together.

- **`CacheProvider`** (`client/app/cache/CacheProvider.tsx`, public path and default export kept)
  becomes the per-mount composition root: a fresh `QueryClient` per mount from
  `CacheClientProviderFactory`, a request over `useApiBase()`, an `HttpTranslationRepository` over
  it, mounted as `TranslateKitConfigProvider` > `TranslationRepositoryProvider` >
  `QueryClientProvider`.
- **`useTranslationRepository()`** (`client/entities/translation/api/TranslationRepositoryContext.tsx`)
  throws `TranslationRepositoryMissingError` outside its provider.
- **`translationKeys`** (`client/entities/translation/queries/translationKeys.ts`) imports nothing:
  `all` → `document(collection, id)` / `list(collection, idsKey)`, and `legacy.*` children of `all`
  for the old read hooks until the legacy sweep.
- **`useRefreshTranslation`** (`client/entities/translation/queries/useRefreshTranslation.ts`) is
  the only caller of `invalidateQueries`.
- **The six mutation hooks** move to `client/entities/translation/mutations/`, call the repository
  from context, and refresh when they settle, on success and on failure.
- **Errors:** actions now reject with `ApiRequestError`; `handleFormError` reads its `details` too,
  and keeps reading `NextApiError` while the old read hooks still throw it.

Verified in the installed Payload 3.90.1: the root layout renders the admin `providers` as children
of `RootProvider` (`node_modules/@payloadcms/next/dist/layouts/Root/index.js:113-127`), and
`RootProvider` renders its children inside `ConfigProvider`
(`node_modules/@payloadcms/ui/dist/providers/Root/index.js:58-99`). So `useConfig` works inside
`CacheProvider`, `useApiBase` stays, and no API base is computed at boot.

## Decisions

- **The repository is built in an inner component under `TranslateKitConfigProvider`,** because
  `useApiBase` reads the config context that `CacheProvider` itself mounts. The `QueryClient` is a
  `useState` lazy init in `CacheProvider`; the repository is memoised on the API base, which is
  fixed for a session. Rejected: computing `routes.api + basePath` inline in `CacheProvider`, which
  would duplicate `useApiBase`.
- **A fresh `CacheClientProviderFactory` per mount,** since the factory caches its client per
  instance. No module-level client remains.
- **`useRefreshTranslation()` answers a function that refreshes `translationKeys.all` by default
  and takes a narrower key.** The narrower key exists for the old document read, which refreshes
  only staleness when a locale completes. Rejected: a refresh per document only, which would leave
  the collection panel stale after a document action.
- **Every one of the six mutations refreshes on settle,** the field translation included. One rule
  is simpler than knowing which action changes server state; the cost is one extra read of the
  document panel after a field translation. Refresh is not awaited: a caller's `mutateAsync`
  settles with the action, not with the reads it triggers.
- **Public names and variables kept:** `TranslationsApi.useQueueDocumentTranslation` and the rest
  take the same variables. Two changes: `useTranslateField` resolves to the
  `FieldTranslationResult` itself rather than `{ data }`, and `useQueueDocumentTranslation`
  resolves to the server's `EnqueueResponse`. An enqueue with no document ids rejects `rejected`
  before any request, since the wire shape needs at least one.
- **The old read hooks lose their unused `invalidate` callbacks,** which no caller reads, so that
  `invalidateQueries` has one owner. Their keys move under `translationKeys.legacy`.
- **The barrel exports `useTranslateField`, `HttpTranslationRepository` and
  `TranslationRepositoryProvider`,** each used outside the entity (the field widget, the root, the
  tests). `rowActions.tsx` inside the entity imports the moved hooks directly.
- **Mutation keys are dropped;** nothing reads them.

## Acceptance criteria

| AC | Covers | Criterion | How it is checked | Result |
|----|--------|-----------|-------------------|--------|
| AC1 | R5 | A hook consumer rendered without the repository provider throws `TranslationRepositoryMissingError` and sends no request | `TranslationRepositoryContext.test.tsx` with a spied `fetch` | passes: `TranslationRepositoryMissingError` thrown, the spied `fetch` never called |
| AC2 | R4 | Two mounts of `CacheProvider` hold two different `QueryClient`s | `CacheProvider.test.tsx` | passes; replacing the per-mount client with a module-level one fails it |
| AC3 | R4, R5 | `invalidateQueries(` appears only in `queries/useRefreshTranslation.ts`, and no `queryKey: [` literal exists outside `translationKeys.ts` under `src/client` | `refreshIsTheEntitys.test.ts` | 3 passed; a planted `queryKey: ["x"]` in `shared/` fails it |
| AC4 | R4 | A mutation refreshes the translation reads when it fails as well as when it succeeds (a busy enqueue still refreshes) | `mutationsRefreshOnSettle.test.tsx` over the in-memory fake | 3 passed (success, busy enqueue, unknown run handle); refreshing on success only fails the busy case |
| AC5 | R4 | No mutation hook imports `ofetch`; each reaches the server through `useTranslationRepository()` | repo-root `oxlint` with the client zones; `grep ofetch` under `mutations/` | `grep ofetch` finds nothing under `mutations/`; repo-root `oxlint`: 0 errors, 30 warnings, none in the new files |
| AC6 | R5 | `handleFormError` sets field errors from an `ApiRequestError`'s `details` | `handleFormError.test.ts` | 3 passed: `ApiRequestError` details, `NextApiError` details, and a root error without details |
| AC7 | R4, R5 | Types, tests, lint and the declaration build are green; existing component tests pass under the providers | `bun run check-types`, `bunx vitest run`, `oxlint`, `oxfmt --check`, `bun run build` | check-types clean; vitest 242 files passed, 1 skipped, 2786 tests passed; `oxfmt --check` flags only the three pre-existing `.scss` files; `bun run build`: swc 458 files, `tsc` declarations clean |

## Risk notes

- Refresh on settle refetches every translation read on the page after each action; with the old
  reads that is up to three requests. The new reads (step 8) are one per screen.
- The sandbox check (enqueue, cancel, run now and field against real and stub modules) is not run
  here; it needs a running host.
- The old cancel and run-now buttons pass a job id where the repository names a run handle. On the
  current server those are the same value; the document panel (step 9) moves to real handles.
