# Legacy sweep

Build step: 2026-11-13-admin-ui-on-stubs.design.md #12

## Requirements / Task restatement

R1, R5, R7: once the four 1.0 screens run on the repository, everything the old screens needed goes,
the temporary lint allowance goes with it, and the major's breaking changes are written down.

- Delete what no screen imports any more, each checked by a search for importers first: the old
  read hooks (`useDocumentTranslation`, `useDocumentStaleness`, `useCollectionTranslationStatus`),
  the `TranslationsApi` object, `model/types.ts`, `model/statusRows.ts`, the old derivations in
  `model/panelStatus.ts`, `ui/TranslationStatusList`, the `legacy.*` query keys,
  `NextApiError`/`handleNextApiError`, the form helpers and form controls, and every shared UI
  piece with no importer.
- Remove the `ofetch` allowance for `entities/translation/api/`; after it, `ofetch` is imported
  only in `client/shared/api/`.
- Remove the `targetSelection` setting and the unused constructor arguments it left behind.
- Append the major's migration notes to `docs/DEPRECATIONS.md`.
- Check the stub path over HTTP in the sandbox.

## Decisions

- **`TranslationsApi` is replaced by named exports** of the five mutation hooks from the entity
  barrel; its five callers import them by name. Rejected: keeping the object with only mutations —
  a namespace object exists for no reason once the read hooks are gone, and named exports are the
  barrel convention.
- **`handle-form-error.ts` is deleted, not narrowed to `ApiRequestError`.** No form calls it: the
  new panels have no react-hook-form form. With it go `NextApiError` and `handleNextApiError`.
- **`model/types.ts` and `model/enums.ts` are deleted outright.** Every type and the
  `DocumentTranslationStatus` enum were read only by the old hooks, `statusRows` and the old
  derivations; nothing needed moving.
- **`panelStatus.ts` keeps `PanelStatus`, `MarkerTone`, `MARKER_DOT` and `describePanelStatus`**,
  which the document trigger uses. The dot colour type it borrowed from `statusRows` becomes a local
  `DotColor`. `derivePanelStatus`, `deriveDocumentRunStatus` and `deriveCollectionPanelStatus` and
  their tests are deleted; the test of the colour vocabulary shared with the deleted list goes too.
- **The zero-importer sweep went past the named list.** With the old screens gone, these had no
  importer either and were deleted: `entities/translation/ui/{ActionButton,TranslationDirection}`,
  `shared/ui/{Alert,Description,Divider,Label,MultiSelect,Popup,StatusIndicator,Tooltip}`, the whole
  `shared/ui/form/` folder (including `FormCheckbox`), `shared/lib/forms/`, and the
  `AlertTriangleIcon`, `CheckIcon` and `ReloadIcon` assets. The widget barrels (`widgets/*/index.ts`,
  `widgets/*/ui/index.ts`) were left alone: a widget's barrel is its public face by convention.
- **Three dependencies with no importer left are dropped** from the package: `react-hook-form`,
  `@hookform/resolvers` and `@radix-ui/react-tooltip`. The lockfile was refreshed; the rest of its
  diff is hoisting of the same versions. Rejected: leaving them for a later cleanup — a published
  package installing three unused libraries into every host is a cost the major can drop for free.
- **`targetSelection` is removed with no deprecation path.** This is a major, and the panels have no
  target control to configure. Gone: the option, its resolution and default, the
  `TargetSelectionMode` type and its public export, the `targetSelection` argument of
  `TranslateDocumentExport`, and the `targetSelection` and `canStop` arguments of
  `BulkDocumentTranslationDashboard`. Whether the bulk panel offers Cancel already comes from the
  derived abilities, so `canStop` had no reader; its plugin test is deleted. `apps/dev` drops the
  option. The type-only pin in `seamShape.pins.ts` used `TargetSelectionMode` as its positive
  control and now uses `TranslatorAction`.
- **`autoTranslateSummary.server.ts` stays.** `app/cache/collectionFacts.ts` still builds
  `CollectionFacts` from it; the design's "retire it in favour of `CollectionFacts`" is already true
  in the direction that matters (no screen reads it directly).
- **Stale comments fixed only where they name something deleted:** `PanelStatusMarker`'s docblock
  pointed at the deleted status list; `TranslateKitConfig`'s said "server props" where the owner's
  step-2 finding made it client props.
- **The sandbox check is at the HTTP level only.** The canvas walkthrough (AC8 of the design) needs
  a person in a browser and is not part of this step.
- **README is not edited.** Proposed lines for the owner are below.

### Proposed README changes (for the owner)

- Delete the bullet "**Translate into several locales at once** — `targetSelection: 'multi'` …"
  (README line ~101).
- Delete the options-table row for `targetSelection` (line ~162).
- Delete the exports-table row for `TargetSelectionMode` (line ~496).
- Add to the components list: "`translationStatusColumn()` — a Translations column on every managed
  collection's list: per locale, translated, queued, translating or failed."
- Add under the document control: "Opens a side panel with one row per target locale, its state and
  its actions. Translations started here are saved as drafts — publish with Payload's Publish."

## Acceptance criteria

| AC | Covers | Criterion | How it is checked | Result |
|----|--------|-----------|-------------------|--------|
| AC1 | R1 | With the stub enabled in `apps/dev`, the document-state, list-state and enqueue routes answer over HTTP for a seeded document, behind the guard | built plugin; `apps/dev` with `TRANSLATOR_STUB=1`, seeded, on port 4040; REST login as `dev@example.com`; curl with the session cookie and an `Origin` header | `GET /api/translate/document-state/pages/1` → 200, `sourceLocale:"en"`, `excluded:["Slug"]`, locales de `empty` (mustInclude `["title"]`), fr `untracked`, es `filled`, all `run:null`. `GET /api/translate/list-state/pages?ids=1,2` → 200, doc 1 de `empty`, fr/es `filled`; doc 2 every locale `queued` on `stub-run-1`. `POST /api/translate/enqueue` `{source_lng:"en", target_lng:["de","fr"], collection_slug:"pages", collection_id:["1"]}` → 200 `{success:true, queued:2, assignments:[…de stub-run-2, …fr stub-run-2]}`; the same again → `{queued:0, busy:["1"], assignments:[]}`; document-state afterwards shows de and fr `queued` on `stub-run-2`. Without a session every route → 403 `{"message":"Forbidden"}`. Server stopped afterwards |
| AC2 | R5 | `ofetch` is imported only in `client/shared/api/`; lint refuses it in `entities/translation/api/` | `lintZones.test.ts` probe flipped to `refused: true`; search for `from "ofetch"` | probe passes; the only non-test importer is `client/shared/api/createRequest.ts`; the temporary zone and the guide's allowance sentence are gone |
| AC3 | R1, R5 | Nothing deleted had an importer outside its own folder and tests; nothing left in `src/client` lacks an importer except the widget barrels | search for importers per item before deleting; an import-graph scan of `src/client` after | 69 files deleted; the scan lists only widget barrels, boundary files and files named by component paths; `legacy.` and `TargetSelection` no longer appear in `src` or `apps/dev/src` |
| AC4 | R1 | `targetSelection` is gone from settings, exports, composition and `apps/dev`, and nothing compiles against it | `bun run check-types` in the package and in `apps/dev` | both clean |
| AC5 | R7 | The major's breaking changes are recorded for hosts | `docs/DEPRECATIONS.md` section "2026-11-13 — the 1.0 admin" | seven entries: drafts only, `targetSelection` removed, admin config in client props and throwing hooks, duplicate plugin routes refused, popover → side panel, the two read routes and their actions, `translationStatusColumn()` |
| AC6 | R1, R5 | Types, tests, lint, format and the declaration build are green | `bun run check-types`, `bunx vitest run`, repo-root `oxlint`, `oxfmt --check`, `bun run build` | check-types clean; vitest 252 files passed, 1 skipped, 2836 tests passed; oxlint 0 errors, 26 warnings, none introduced (the two in changed files — `parameter-properties` in `TranslateDocument.export.ts`, `consistent-function-scoping` in `plugin.test.ts` — predate this step); `oxfmt --check` flags only the two remaining pre-existing `.scss` files (the third was in the deleted `MultiSelect`); `bun run build`: swc 421 files, `tsc` declarations clean |

## Risk notes

- A cookie session from curl is not honoured without an `Origin` header (Payload's CSRF check); the
  browser always sends one. The first attempt without it read as 403, which is the guard, not a
  fault.
- The design's AC8 canvas walkthrough is still owed; it needs the sandbox in a browser.
- The two read routes are served only by the stub. Before 1.0.0 is published the real read modules
  must land (design R9), or a host gets an admin whose panels read 404.
- A host that passed `targetSelection` in a TypeScript config gets a type error on upgrade; the
  migration note says to delete it.
- The lockfile diff is larger than the three removed packages because the hoisted layout was
  recomputed; versions are unchanged.
- `apps/dev/.env` and `apps/dev/dev.db` were created for the sandbox check and left in place; both
  are git-ignored.
