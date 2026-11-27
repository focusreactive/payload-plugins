# Field control

Build step: 2026-11-13-admin-ui-on-stubs.design.md #11

## Requirements / Task restatement

R1, R7: the per-field control above a field's input is rebuilt on `translateField` over the
repository, in the seven states of the 1.0 board, with no drift mark. The public component path
(`widgets/translate-field-control/ui/TranslateFieldControl`) and the `TranslateFieldControlExport`
class stay.

- **Ready.** A "Translate" button pulls into the locale being edited from the panel's source, the
  host's default locale. A caret beside it opens a menu of the other locales, the default one marked
  "the panel's"; the caret is there only when more than one other locale exists.
- **Choosing the source.** The menu is open; picking a locale translates from it.
- **Asking the provider.** "Translating" with a spinner; the input is read-only.
- **Just translated.** The value is written into the form and the form is marked modified; nothing
  is saved. "Undo" restores the value from before the translation, "Again" repeats the request.
- **The provider did not answer, or any error.** "Couldn't translate" inline as an alert, with
  "Try again". A `noop` answer shows its notice inline. No toasts.
- **Document not saved yet.** The control shows, disabled, with an info mark "Save the document to
  pull from another locale".
- **Inside a block list localized as a whole.** The button is disabled with the hint "Every locale
  has its own blocks here, so this block cannot be traced to an English one. Translate the whole
  document from the panel."
- **Hidden** when `abilities.translateField` is false.

## Decisions

- **The state is one pure derivation, `fieldControlView`,** over the ability, whether the document
  is saved, the source choices and the last outcome (idle, translating, translated, failed, noted).
  The component keeps only the outcome. Rejected: deriving the state inline in the component — the
  seven states and their precedence would be untested.
- **The localized-list state comes from the server's `noop` reason `localized-list`.** Deciding it
  on the client needs the collection's client field schema walked through tabs, rows and blocks,
  with the document's block types to pick a block's fields — the server's `findFieldByPath` work
  restated in the browser. Instead the first press answers it and the control stays disabled with
  the hint for the rest of the visit. Rejected: the client-side walk, as not cheap.
- **The menu is a split button: picking a locale translates from it.** The main button always uses
  the panel's source; "Again" and "Try again" repeat the last request with its source. Rejected: a
  menu that only changes the main button's source — one more click and a hidden state to show.
- **The default source is the host's default locale**, marked "the panel's" in the menu. When the
  editor stands in the default locale, the first other locale is the source and nothing is marked.
- **No other locale means no control.** With localization off or a single locale there is nothing
  to pull from; the control is not rendered.
- **Undo restores the value from before the first translation of a series.** "Again" keeps it, so
  Undo after Again still returns to the editor's own text.
- **Read-only while translating uses the form's processing flag** (`useForm().setProcessing`),
  Payload's only switch for an input's `disabled` (`useField` reads `processing || initializing`,
  `@payloadcms/ui/dist/forms/useField/index.js:114`). It makes the whole form read-only for the
  request, which also keeps a save from racing the write. Rejected: no read-only state.
- **Write-back is unchanged:** a form `UPDATE` of `value` and `initialValue`, then
  `setModified(true)`.
- **An error's own message is the alert's `title`;** the visible words are "Couldn't translate".
  A notice's level picks its tone (info or warning).
- **Legacy deleted now** (only this control used them): `shared/lib/payload/hooks/useLocaleOptions.ts`,
  `shared/lib/utils/react/useToggle.ts` and the `SendIcon` asset. `shared/ui/Select`, `shared/ui/Popup`,
  `ReloadIcon` and `LanguageTranslateIcon` keep other importers and stay.
- `localeChoicesOf` is re-exported from the entity barrel; the control reads the host locales from
  Payload's client config.

## Acceptance criteria

| AC | Covers | Criterion | How it is checked | Result |
|----|--------|-----------|-------------------|--------|
| AC1 | R1, R7 | Each input maps to one state: hidden without the ability or without another locale, unsaved, localized-list, translating, translated, failed, ready with or without a notice; precedence pinned | `fieldControl.test.ts`, pure | 16 model tests pass; red first on a throwing stub (16 of 16 failed) |
| AC2 | R1 | Source choices list the other locales, the default first and marked; the caret shows only with more than one; the default source falls back when the editor stands in the default locale | `fieldControl.test.ts`, pure | passes (5 tests in `fieldControl.test.ts`, part of the 16) |
| AC3 | R1, R7 | Pressing Translate sends the request from the panel's source, writes the value into the form and marks it modified, then shows Undo and Again; Undo writes the earlier value back; Again repeats the request | `TranslateFieldControl.test.tsx` over the in-memory fake | passes: request `{collection_slug:"pages", field_path:"title", target_lng:"es", source_lng:"en", doc_id:"1"}`; form `UPDATE` with `value` and `initialValue` `"[es] Summer"`, `setModified(true)`, `setProcessing` true then false; Again sends `source_lng:"en"` again; Undo writes `"Festival de verano"` back |
| AC4 | R1, R7 | A failed request shows "Couldn't translate" as an alert with Try again; a `noop` notice shows inline; no toast | `TranslateFieldControl.test.tsx` | passes: alert reads "! Couldn’t translate", nothing written, no toast, Try again repeats; the fake's noop notice "The fake does not translate." shows as a status, no toast |
| AC5 | R1, R7 | An unsaved document shows the control disabled with the save hint; a `localized-list` answer disables it with the block hint | `TranslateFieldControl.test.tsx` | passes: Translate disabled beside the info mark "Save the document to pull from another locale."; after a `localized-list` answer, disabled beside the block hint |
| AC6 | R1 | Without `abilities.translateField` nothing is rendered; picking a locale from the caret's menu translates from it | `TranslateFieldControl.test.tsx` | passes: empty container without the ability; the menu shows "English · the panel’s", picking Deutsch sends `source_lng:"de"`. The 8 component tests failed 8 of 8 against the previous control |
| AC7 | R1 | Types, tests, lint, format and the declaration build are green | `bun run check-types`, `bunx vitest run`, `oxlint`, `oxfmt --check`, `bun run build` | check-types clean; vitest 256 files passed, 1 skipped, 2895 tests passed; repo-root oxlint 0 errors, 30 warnings, none in the changed files; `oxfmt --check` flags only the three pre-existing `.scss` files; `bun run build`: swc 471 files, `tsc` declarations clean |

## Risk notes

- The localized-list state is known only after one press per visit; before it, the control looks
  ready.
- The form is read-only for the length of the request (up to the 90 s field timeout).
- The control was not walked in the sandbox for this step; the component tests and the build are
  the evidence.
- The menu's "the panel's" mark assumes the document panel's source is the host's default locale,
  as it is today.
