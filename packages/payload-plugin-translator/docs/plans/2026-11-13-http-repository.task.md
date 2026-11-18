# HTTP translation repository

Build step: 2026-11-13-admin-ui-on-stubs.design.md #6

## Requirements / Task restatement

R2, R3, R4: the admin's repository talks HTTP to the plugin's own routes, and the contract suite
that step 5 ran red and then green on the in-memory fake is green on the HTTP implementation too.
This step lands the transport, the API base hook and the HTTP repository. No production code
constructs the repository yet (step 7), and the existing hooks are untouched.

- **`createRequest`** (`client/shared/api/createRequest.ts`) builds an `ApiRequest`, the type of an
  ofetch instance: relative `baseURL`, `credentials: "include"` as Payload's own admin sends
  (`@payloadcms/ui/dist/utilities/api.js:11`), `REQUEST_TIMEOUT_MS = 15_000`, no retries, an
  optional injected `fetch`, and one mapping from every failure to `ApiRequestError`.
- **`useApiBase`** (`client/shared/lib/payload/hooks/useApiBase.ts`): Payload's `routes.api` plus the
  plugin's `basePath`, relative, never `serverURL`.
- **`HttpTranslationRepository`** (`client/entities/translation/api/HttpTranslationRepository.ts`)
  implements `TranslationRepository` over an injected `ApiRequest`, with paths from
  `types/wire/endpoints.ts`, the `{ data }` envelope unwrapped, the busy rule applied to enqueue,
  and `FIELD_TRANSLATION_TIMEOUT_MS = 90_000` on `translateField` only.
- **Bindings:** the contract suite runs over `createRequest({ fetch: inProcessFetch })`, where the
  in-process fetch routes each request to the stub module's real handlers, guard and error handler
  included. Failure paths run over injected failing fetches.

Verified in the installed ofetch 1.5.1 (`node_modules/ofetch/dist/shared/ofetch.CWycOUEr.mjs`):

- `create(defaults, globalOptions)` passes `globalOptions.fetch` to the new instance (`:164-169`,
  `:337-344`), so a test fetch is injected per instance, with no global stub.
- A timeout aborts the signal with an `Error` named `TimeoutError` (`:261-271`); the fetch rejects
  with it and `onRequestError` sees it as `context.error` (`:276-284`).
- A `GET` is retried once by default on a network failure and on 408/409/425/429/5xx, but only
  from the shared `onError` step (`:170-189`), which runs after the `onRequestError` and
  `onResponseError` hooks (`:279-284`, `:320-325`). Hooks that throw end the request first, so no
  retry is ever sent and no `retry` option is needed.
- Error statuses reach `onResponseError` with the parsed body as `response._data` (`:296-325`); a
  204 has no body and resolves `undefined` (`:286-290`).

## Decisions

- **The mapping is one function over the ofetch context,** called from the instance's
  `onRequestError`, `onResponseError` and `onResponse` hooks; each hook throws the
  `ApiRequestError` it returns. Rejected: wrapping the instance in a function, which would make
  `ApiRequest` something other than the ofetch type the design names.
- **Reasons:** `TimeoutError` or `AbortError` → `timeout`; any other fetch failure → `network`;
  401/403 → `forbidden`; 404 → `not-found`; 429 → `busy`; 5xx → `server`; every other 4xx →
  `rejected`, with zod `details` when the body carries an array under `details`. A successful
  answer whose body is not JSON (a proxy's login page) → `server`. The message is the body's
  `message` when it has one.
- **`FIELD_TRANSLATION_TIMEOUT_MS` lives beside `translateField` in the repository,** not in
  `shared/api`: it is a fact about one route. The 15 s default lives in `createRequest`.
- **No test-only timeout option on `createRequest`:** the timeout tests use fake timers against the
  real constants.
- **A list read sends its ids as one comma-separated `ids` query value,** as the stub reads them.
- **The stub's list read now leaves out an id the host does not hold,** checking each id with the
  same source read its field translation uses. The suite requires it of every server, and the stub
  previously answered every id it was asked about. Rejected: filtering in the in-process router,
  which would test the router instead of the stub.
- **The in-process router lives in `__tests__/inProcessFetch.fixture.ts`,** builds `translationStub`
  with the `empty` scenario against a collecting module context, and serves a minimal request:
  route params, search params, `json()`, a user, the host's locales, and a `findByID` that knows the
  given documents.

## Acceptance criteria

| AC | Covers | Criterion | How it is checked | Result |
|----|--------|-----------|-------------------|--------|
| AC1 | R3, R4 | The contract suite passes on the HTTP repository routed in-process to the stub's real handlers | `bunx vitest run` | `HttpTranslationRepository.test.ts`: the six contract cases pass; the busy case fails when the busy rule is removed from `enqueue` |
| AC2 | R2 | Requests go to a relative base, `routes.api` + `basePath`, with `credentials: "include"` | `useApiBase` test; a `createRequest` test reading the injected fetch's URL and init | `useApiBase.test.tsx` answers `/cms-api/custom-translate` with a `serverURL` set; `createRequest.test.ts` sees `/api/translate/enqueue`, `credentials: "include"`, one call |
| AC3 | R3 | Each failure maps to its reason: network, timeout (15 s, and 90 s for a field translation), 403, 404, 429, 500, a non-JSON body, and 400 with details | `createRequest.test.ts`, `HttpTranslationRepository.test.ts` | `createRequest.test.ts` 14 passed (network once, timeout at 15 s, 401/403/404/429/500/503/405, 400 with details, non-JSON 502 and 200); the field translation is still pending at 15 s and times out at 90 s |
| AC4 | R2 | A refusing guard makes a read through the repository reject `forbidden` | `HttpTranslationRepository.test.ts` | passes: `forbidden`, status 403 |
| AC5 | R2 | The repository answers cancel's 204 as `{ refused: [] }` and maps runNow's 429 to `busy` and an unknown handle to `not-found` | `HttpTranslationRepository.test.ts` | passes; removing the 204 normalisation fails the cancel case |
| AC6 | R4 | Only `client/shared/api` imports `ofetch` among the new files, and the repository imports no React or Payload value | repo-root `oxlint` with the client zones | repo-root `oxlint`: 0 errors, 31 pre-existing warnings, none in the new or changed files |
| AC7 | R2 | The stub's list read omits an id the host does not hold | `translationStub.test.ts` | `translationStub.test.ts` 16 passed, including the new omission case |
| AC8 | R2, R3, R4 | Types, tests, lint and the declaration build are green | `bun run check-types`, `bunx vitest run`, `oxlint`, `oxfmt --check`, `bun run build` | check-types clean; vitest 237 files passed, 1 skipped, 2775 tests passed; `oxfmt --check` flags only the three pre-existing `.scss` files; `bun run build`: swc 455 files, `tsc` declarations clean |

## Risk notes

- 429 maps to `busy` for every route. Only run-now answers 429 today; a rate-limiting proxy in front
  of the host would read as `busy` too.
- A caller's own abort reads as `timeout`; the closed reason union has no member for it, and a
  cancelled query's error is never shown.
- The in-process router imitates a slice of Payload's endpoint dispatch and must follow Payload
  upgrades.
- The stub's list read now costs one source read per id; acceptable for a branch-only stub.
