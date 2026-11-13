# Document panel

Build step: 2026-11-13-admin-ui-on-stubs.design.md #9

## Requirements / Task restatement

R1, R7: the document's translation panel is rebuilt on `useDocumentTranslationState` and the
repository's mutations, and shows every state the stub's scenarios can produce.

- **Trigger.** Today's widget (`widgets/translate-document`, mounted in `beforeDocumentControls`)
  keeps its public component path and its server guard. It renders an icon button with one aggregate
  status dot computed from `DocumentTranslationState`; pressing it opens a side drawer.
- **Header.** "Translations", a "From" select (default: the state's `sourceLocale`), and a close
  button.
- **One row per `LocaleState`,** with the state's wording and its action:
  - up to date and when; behind: "N fields behind", "N came back empty", Update, and a "⋯" menu with
    "Hide until the source changes";
  - Not translated → Translate (whole); Translating; Queued → Run now + Cancel;
    Failed and its message → Retry; Not started — the locale that failed first → Retry;
  - Written by hand → Translate, with the warning that translating replaces it;
  - provenance off: Translated → Translate again, Not translated → Translate.
- **Expanding a tracked locale** shows the field tree: a text filter, a checkbox per node with
  tri-state parents, a whole-list node as one item with a hint, the excluded fields behind one
  collapsed line, "N of M fields" and "Translate · N", which enqueues that locale with the filter
  `[{ kind: "leaves", addresses }]`. Leaves the locale must include are always checked and locked.
- **Expanding an empty locale** shows the tree without checkboxes, the required-fields info mark and
  "Translate all N" (whole).
- **Footer.** "Saved as drafts — publish with Payload's Publish." and "Translate all" (every target
  locale, whole). An auto-translate line when the collection's `autoTranslateTargets` is non-empty.
- Every action control is disabled while the document has a live run; a `busy` answer and every
  other failure is shown beside the control that met it.
- The state is read again after Payload saves the document.
- Enqueue bodies: `source_lng` = the chosen From, `target_lng` = the locale(s), `collection_id`
  `[id]`, the filters above, and no `publish_on_translation`.

## Decisions

- **Row state is one pure derivation, `localeRowOf(LocaleState)`** (`entities/translation/model/`).
  A run outranks content: a locale with any run reads as that run's state. Content then maps
  one-to-one: `empty` → not translated, `untracked` → written by hand, `filled` → translated, and
  `tracked` → behind or up to date. Rejected: deciding the wording in the component, where the
  untracked/empty distinction would be untestable without rendering.
- **"Behind" counts `drifted` and `unrecorded` leaves; "came back empty" counts `unanswered`.** A
  dismissed locale reads up to date. An unrecorded leaf has no record of a translation, so it needs
  one as much as a drifted leaf does.
- **Run controls stay live during a live run.** "Disabled while a run is live" applies to the
  controls that start or dismiss work (Translate, Update, Translate · N, Translate all, Hide); Run
  now and Cancel act on that very run, so disabling them would leave a queued run unstoppable.
- **Retry is Run now on the run's handle** and is not rendered without `abilities.runNow`. Rejected:
  falling back to a fresh enqueue, a second meaning for one button. Cost: on an installation
  without Run now, a failed locale is retried by translating it again after the run is superseded.
- **Which rows open:** a tracked locale (pick fields) and, with provenance on
  (`abilities.staleness`), an empty one (whole, no checkboxes). Written-by-hand, provenance-off and
  run rows do not open.
- **The pick tree preselects** the leaves the locale must include and the leaves behind; a
  whole-list goes in whole when any of its leaves is behind. Toggling a node selects or clears all
  its leaves, except locked ones; a node is "mixed" when only some of its leaves are selected.
  Counts are leaf counts, so a whole-list counts every leaf it holds.
- **Groups are always open.** The filter is the way through a long tree. Rejected: per-group
  collapse state, which the boards show but nothing else needs.
- **The side drawer is the plugin's own** (`client/shared/ui/SideDrawer`): a portal on
  `document.body`, a backdrop, Escape to close, `role="dialog"`. Rejected: Payload's `Drawer`,
  which spans the whole width less a gutter, so a 560 px panel needs CSS overrides, and whose
  `@payloadcms/ui` CSS imports cannot load in the component tests.
- **The ⋯ menu is a Radix popover** with one item, the dependency the plugin already has.
- **The save signal is `useDocumentInfo().lastUpdateTime`.** Payload's edit view sets it in
  `onSave` (`@payloadcms/ui/dist/views/Edit/index.js:257`). The widget refetches the document
  state whenever it changes after mount. It also changes when the lock state changes
  (`:212`), which only costs one extra read.
- **The server component passes the document's slug and id, and the host's locales with labels.**
  The client no longer reads the URL, and the From select and the row names have labels without a
  `useConfig` call. Payload's per-language label objects resolve to their `en` entry, else the
  first, else the code.
- **When the state read fails,** the panel says so with Try again, and "Translate all" still works
  over the host's locales minus the chosen source, as the board shows.
- **Errors show beside the control that met them;** each action feature renders its own mutation's
  error.
- **Placement:** pure rules in `entities/translation/model/` (`localeRow`, `fieldSelection`,
  `documentPanelStatus`, `documentEnqueue`); the state wording and the field tree in
  `entities/translation/ui/`; the actions in `features/locale-actions`, `features/translate-fields`
  and `features/translate-all-locales`; the composed panel in `widgets/translate-document`.
- **Legacy left for the sweep (step 12):** the old read hooks `useDocumentTranslation` and
  `useDocumentStaleness`, `statusRows`, `TranslationStatusList`, `derivePanelStatus` and
  `deriveDocumentRunStatus` lose their last consumer but stay; the entity barrel stops exporting
  them. Deleted now, because nothing else imports them: `features/open-document-translation-popup`,
  `features/translate-document-form` and `useCollectionDocumentUrlParams`.
- **The export's `targetSelection` argument stays accepted and unused**, so a host's config keeps
  compiling; the sweep decides whether it goes.

## Acceptance criteria

| AC | Covers | Criterion | How it is checked | Result |
|----|--------|-----------|-------------------|--------|
| AC1 | R1, R7 | Each `LocaleState` maps to one row state: each run kind, tracked behind / up to date / dismissed, empty, untracked (never empty), provenance-off filled | `localeRow.test.ts`, pure || 17 passed; red first on a throwing stub (all 47 model and time tests failed before the rules existed) |
| AC2 | R1 | The tree selection: preselection, tri-state parents, whole-list as one item, locked leaves stay selected, filter, counts | `fieldSelection.test.ts`, pure || 12 passed; red first on the stub |
| AC3 | R1 | The aggregate dot: failed over live over behind over translated over nothing | `documentPanelStatus.test.ts`, pure || 8 passed; red first on the stub |
| AC4 | R1 | Enqueue bodies carry the chosen source, the locale(s), `[id]`, the filter for the scope, and no publish flag | `documentEnqueue.test.ts`, pure || 4 passed; red first on the stub |
| AC5 | R1, R7 | The panel renders one row per locale with its state wording | `TranslateDocument.test.tsx` over the in-memory fake || passes: Deutsch up to date, Français "1 field behind" and "2 came back empty", Español not translated, Nederlands written by hand, the drafts hint and the auto-translate line |
| AC6 | R1 | Translate enqueues the locale whole; Translate · N enqueues the picked leaves | `TranslateDocument.test.tsx` with a spied `enqueue` || passes: Translate Español sends `target_lng: ["es"]` with no filter; Translate · 3 on Français sends the three preselected leaves; the empty locale's tree has no checkboxes and offers Translate all 8 |
| AC7 | R1 | While a run is live, the start controls are disabled and Cancel is not | `TranslateDocument.test.tsx` || passes; red when the live-run block is replaced by `false` |
| AC8 | R1 | A `busy` answer is shown | `TranslateDocument.test.tsx` || passes: an enqueue made behind the panel's back makes Translate Español show "Already translating" |
| AC9 | R1 | Without `cancel` and `runNow` abilities, Cancel and Run now are not rendered | `TranslateDocument.test.tsx` || passes: a queued run renders neither Cancel nor Run now |
| AC10 | R1 | A save makes the panel read the state again | `TranslateDocument.test.tsx` with a changed `lastUpdateTime` || passes; red (no second read) when the save hook is removed |
| AC11 | R1 | Types, tests, lint and the declaration build are green | `bun run check-types`, `bunx vitest run`, `oxlint`, `oxfmt --check`, `bun run build` || check-types clean; vitest 250 files passed, 1 skipped, 2851 tests passed; repo-root oxlint 0 errors, 30 warnings, none in the new files; `oxfmt --check` flags only the three pre-existing `.scss` files; `bun run build`: swc 473 files, `tsc` declarations clean |

## Risk notes

- The drawer's look against Payload's own admin is checked only in the sandbox; the component tests
  see structure, not style.
- Per-user abilities stay open (design): a control the guard refuses for this user renders and then
  shows `forbidden`.
- A locale whose label is the same as another's is told apart only by its position.
- The panel was not run in the sandbox for this step; the component tests and the build are the evidence.
