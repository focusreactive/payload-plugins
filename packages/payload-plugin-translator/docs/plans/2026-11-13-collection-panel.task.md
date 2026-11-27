# Collection list column and panel

Build step: 2026-11-13-admin-ui-on-stubs.design.md #10

## Requirements / Task restatement

R1, R7: the collection list shows each document's translation state in a column, and the bulk
control above the table is rebuilt as a side drawer on the repository, over every state the stub's
scenarios produce.

- **Config seam (23.10 §8).** A list column is a field, so a component must be able to add one.
  `ComponentContext` gains `addCollectionField`; the config builder writes the field into every
  managed collection and refuses, at boot, a collection that already has a field of that name.
- **The column.** `translationStatusColumn()` adds a `ui` field `translatorStatus`, label
  "Translations", whose `Cell` is a client component. Listed in `components`, it appears; not
  listed, nothing is added. It is public API (`src/index.ts`, `@since 1.0.0`).
- **The cell** reads the page's ids from Payload's list, asks `useListTranslationState` for them —
  every cell on the page shares one key, so one request — and marks each locale of its row:
  translated (and when), not translated (dashed), translating, queued, failed. No drift mark.
- **The toolbar** (today's `beforeListTable` widget, same component path): "Translate · N" with N the
  ticked rows, and "Cancel queued" (`cancelByCollection`) only with `abilities.cancel`.
- **The panel** (side drawer): "Translate N documents" and From; "Into" checkboxes over the host's
  locales minus the source; "Only what is behind the source" only with `abilities.staleness`, sending
  the `stale` rule, with an info hint; the ticked documents, each removable, a document with a live
  run marked "skipped"; the footer "N translations will be queued — D documents into L locales.
  Saved as drafts." with Close and Translate.
- **Nothing ticked.** "Take everything this view shows" reads the ids the list's current search and
  filters match from Payload's REST, shows the count, and continues into the same panel with those
  ids sent explicitly; "Back to the list" closes.
- A `busy` answer is shown as the panel's error; the refresh on settle updates the column.

## Decisions

- **`addCollectionField(make: () => Field)`, not `addConfigModifier`.** The builder stays the only
  writer of the config and already knows the managed collections; a modifier on the component would
  restate that set. The factory is called once per collection because Payload writes into the field
  configs it sanitizes. Rejected: `addConfigModifier` on `ComponentContext` — more power than one
  caller needs.
- **The clash check reads top-level named fields only.** A clash inside a row, a collapsible or an
  unnamed tab shares the same data level and is refused by Payload's own sanitizing
  (`DuplicateFieldName`). Listing the column twice is refused the same way.
- **The field name is `translatorStatus`.** Prefixed with the plugin's role, so a host is unlikely
  to have it.
- **No `disableListFilter`.** Payload's `UIField.admin` does not accept it, and a `ui` field holds no
  data, so Payload's filter options leave it out already.
- **No legend in the column header.** The header is Payload's sort control over the field's label;
  a custom header needs a component the field type does not offer. Each mark instead carries its
  meaning as hidden text for screen readers and as a `title`.
- **Mark rules are one pure derivation, `listChipOf(ListLocaleState)`.** A run outranks content;
  `not-started` reads failed, with "Not started: <locale> failed first".
- **Skipped documents are not sent.** The server rejects the whole enqueue as `busy` when any
  document has a live run, so the panel leaves out the documents the page's list state shows live
  and says so in the footer. When the list state is unknown nothing is marked, and a `busy` answer
  is the error.
- **The panel lists only the ticked rows.** Payload clears the selection when the query changes, so
  ticked rows are always on the page on screen and their titles come from Payload's list data
  (`useAsTitle`, else the id). With the whole view taken, the panel states the count instead of a
  list of possibly thousands.
- **"Select all across pages" takes the view's ids.** Payload's `AllAvailable` selection names no
  ids, so it goes straight to the panel over the REST read, as "Take everything" does.
- **Every target locale starts ticked.** The footer is meaningful at once; unticking is one click.
- **The source defaults to the host's default locale,** passed by the server component with the
  locales and their labels (`localeChoicesOf`, moved from the document widget to the entity model so
  both widgets use it).
- **The REST read sits in `shared/api/findMatchingIds.ts`**, over `createRequest` with Payload's
  `routes.api` as base (`usePayloadRequest`). `where` travels as JSON, which Payload parses
  (`payload/dist/utilities/parseParams/index.js`); `select` uses the bracket form, which it does not
  parse from JSON. The where is the list's search and filters merged with Payload's own
  `mergeListSearchAndWhere` (`payload/shared`), read through `useListView` (`useListQuery`). Its query
  key lives in the key file, outside `all`, so a translation refresh does not reread it.
- **After a successful Translate the drawer closes.** The refresh on settle updates the column.
- **The collection is named by its slug** in "Translate pages"; labels may be functions or per
  language and are not worth resolving for one heading.
- **The export's `targetSelection` and `canStop` stay accepted and unused**, as the document panel
  did with `targetSelection`; the sweep decides whether they go.
- **Legacy deleted now** (nothing else imports them): `features/collection-translation-form`,
  `features/collection-translation-popup`, `features/collection-translation-progress` and
  `shared/lib/payload/hooks/useCollectionDashboardUrlParams.ts`. **Left for the sweep (step 12):**
  `useCollectionTranslationStatus` and `deriveCollectionPanelStatus` (still in the entity barrel),
  `shared/lib/forms/{handle-form-error,pruneSourceFromTarget}.ts`,
  `shared/ui/form/{FormSelect,FormMultiSelect,FormCheckboxPublish}`, `shared/ui/{ProgressBar,
  StatusCounter}` and `autoTranslateSummary.server.ts`'s bulk caller (now gone; the document panel
  never used it).

## Acceptance criteria

| AC | Covers | Criterion | How it is checked | Result |
|----|--------|-----------|-------------------|--------|
| AC1 | R1, R7 | Each `ListLocaleState` maps to one mark: translated with or without a date, not translated, queued, translating, failed, not-started as failed | `listChip.test.ts`, pure | 7 passed; red first on a throwing stub (7 of 18 model tests failed before the rules existed) |
| AC2 | R1 | Live documents, selection editing (skip, remove), the queued-count line, the enqueue body (whole, `stale` rule, none without documents or locales) | `collectionBatch.test.ts`, pure | 11 passed; red first on the stub (11 of 18 failed) |
| AC3 | R1 | The column field is added to every managed collection only when the component is listed, with the cell; refused at boot on a name clash | `translationStatusColumn.test.ts`, a plugin boot | 3 passed; with the builder's field step removed, 2 of 3 fail |
| AC4 | R1, R7 | Each cell marks its own row's locales; N cells make one `getListState` call for the page's ids | `TranslationStatusCell.test.tsx` over the in-memory fake | 2 passed: translated with "… ago", not translated, ◷ queued, ⟳ translating; one call with ids `["1","2","3"]` |
| AC5 | R1 | Translate · N opens the panel; a live document is marked skipped and not sent; unticking a locale changes the body and the footer | `BulkTranslationDashboard.test.tsx` | passes: body `{source_lng:"en", target_lng:["de","fr"], collection_slug:"pages", collection_id:["1"]}`; footer "2 translations will be queued — 1 document into 2 locales. A document already queued or translating is skipped." |
| AC6 | R1 | Removing a document drops it from the heading, the list and the count | `BulkTranslationDashboard.test.tsx` | passes: "Translate 1 document", "3 translations … 1 document into 3 locales" |
| AC7 | R1 | "Only what is behind the source" sends the `stale` rule; without `staleness` it is not rendered; without `cancel` there is no Cancel queued; Cancel queued calls `cancelByCollection` | `BulkTranslationDashboard.test.tsx` | passes (3 tests) |
| AC8 | R1 | A `busy` answer is shown | `BulkTranslationDashboard.test.tsx`, a run enqueued behind the panel's back | passes: the alert reads "Already translating: 1. …" |
| AC9 | R1 | With nothing ticked, the view's ids are read from Payload's REST with the list's where and sent explicitly; Back to the list closes | `BulkTranslationDashboard.test.tsx` with a stubbed fetch; `findMatchingIds.test.ts` | passes: GET `/api/pages` with the where as JSON, `pagination=false`, `depth=0`, `select[id]=true`, `locale`; enqueue `collection_id: ["1","3"]` |
| AC10 | R1 | Types, tests, lint, format and the declaration build are green; the sandbox's import map names the cell | `bun run check-types`, `bunx vitest run`, `oxlint`, `oxfmt --check`, `bun run build`, `generate:importmap` | check-types clean; vitest 254 files passed, 1 skipped, 2871 tests passed; repo-root oxlint 0 errors, 30 warnings, none in the changed files; `oxfmt --check` flags only the three pre-existing `.scss` files; `bun run build`: swc 473 files, `tsc` declarations clean; `apps/dev` import map gains `translation-status-column/ui/TranslationStatusCell#default` |

## Risk notes

- The column is not in Payload's default columns unless the host lists it in
  `admin.defaultColumns`; otherwise it is turned on from Columns.
- A host with a field named `translatorStatus` must rename it or leave the column out.
- Taking the whole view reads every matching id in one unpaginated request; a very large collection
  makes that request, and the enqueue body, large.
- The where for "take everything" mirrors what the list sends; a list view that adds conditions of
  its own (trash, a join) is not reproduced.
- Per-user abilities stay open (design): a control the guard refuses renders and shows `forbidden`.
- The look against Payload's own list was not checked in the sandbox for this step; the component
  tests and the build are the evidence.
