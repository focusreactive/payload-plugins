# Translation Levels — Phase 3: Field-level client (design)

**Date:** 2026-06-11
**Status:** Implemented — pending sandbox verification (UI)
**Plan:** [translation-levels-plan](./2026-06-08-translation-levels-plan.md) · **Phase 2 (server):** [phase2-field-server-design](./2026-06-10-translation-levels-phase2-field-server-design.md)

Phase 2 shipped the synchronous `POST {basePath}/field` endpoint but no caller in the
admin. This phase adds the **per-field control UI** so `fieldLevel` is usable end-to-end —
shipped together with Phase 2 as one minor, so we don't release a half-wired feature.

## Scope

- **`text`, `textarea`, and `richText`** — the control allowlist now matches the server
  resolver's `TranslatableField`. `richText` was the deferred one (writing a translated Lexical
  tree back into the editor's own serialized state); it's solved here via an **editor re-mount**
  write-back (see [richText write-back](#richtext-write-back)). The server was already permissive
  for all three.

## The control

Wrapping a `text` / `textarea` field with **`withFieldTranslation(field)`** (no second argument)
adds a small Translate control to it. There is no `control` flag — a plain wrap _is_ the control
intent; `{ exclude: true }` is the only config, and it opts the field out (no control, excluded
from translation). The control is **positioned** via the {@link FieldControlPositioner} seam
(see below); the default positioner **appends** it to the field's
**`admin.components.beforeInput`** (an array slot, so existing components are preserved). The
control is a single **icon button** (`shared/ui/Button` `$isIconButton` + `LanguageTranslateIcon`,
matching the icon-button style elsewhere in the plugin) that opens a **popup** (`shared/ui/Popup`)
with the translate options.

> **Why `beforeInput`, not the label.** We first tried `admin.components.Label` (the button
> beside the locale indicator), but a custom `Label` _replaces_ Payload's default label
> entirely — there's no "augment the label" slot — and we can't own the label. `beforeInput`
> is the robust slot: it renders inside the field's path context (so `useField()` resolves
> the field with no `path` prop), sits right above the input, and leaves the label untouched.

The endpoint itself is registered separately by `fieldLevel()` in `levels`; you need both (the
level for the route, the wrapper for the per-field button).

## Direction — target is always the current locale (reverse of doc/collection)

The field control's **target is always the locale the user is editing** (`useLocale()`); the
popup only chooses the **source**. This is deliberately the _reverse_ of the document- and
collection-level flows, which translate _from_ a source locale _to_ chosen target(s) (pushing
content outward). The field control pulls content _into_ where the user stands — which reads more
naturally for "fix this one field in the locale I'm looking at." We think this inverted model may
be the better default overall, but for now it applies **only at the field level**; document and
collection levels keep their existing direction. Implication: `targetLng` is pinned to
`useLocale()` and must never be derived from the source picker.

## The popup — compact direction row, undo

The trigger icon button opens a compact popup that reuses the plugin's recognizable
`source → target` direction pattern (as `TranslationDirection` does at the document/collection
level). One row, **no input labels** — direction is conveyed by the arrow:

```
[文A translate] [source Select] → [current locale]   [↺ undo]
```

- **Source `Select`** — locale codes only, **no "auto-detect" option**, excludes the current
  locale (it's the fixed target). Defaults to Payload's `defaultLocale` when that isn't the
  current locale; otherwise a disabled `—` placeholder and the user must pick (translate stays
  disabled until they do).
- **Arrow → current locale** — the target, rendered as fixed text (lowercased, matching
  `TranslationDirection`), never in the select.
- **Translate** (`文A` `LanguageTranslateIcon`, the primary action) and **Undo** (`ReloadIcon`,
  shown after a successful translate) are icon buttons.

**From-locale only.** The control always reads another locale's _saved_ value, so it needs a
**saved document** — it's hidden entirely while creating a new one (the source value doesn't exist
yet). There is no in-place mode (the endpoint requires `source_lng` + `doc_id`). Undo captures the
pre-translation value client-side — ephemeral, an immediate affordance, not history.

**Tooltips / a11y.** Every icon button carries a tooltip semantically tied to its action: the
in-popup Translate/Undo buttons use the `shared/ui/Tooltip` component (+ `aria-label`); the popup
_trigger_ can't also be a `Tooltip` trigger (Popover + Tooltip both want `asChild` on the same
node), so it uses a native `title` + `aria-label`. The unlabeled `Select` gets an `aria-label`.

## Data flow (field React context + one server fetch)

| Need                              | Source                                                                     |
| --------------------------------- | -------------------------------------------------------------------------- |
| current value (for undo) + path   | `useField()` → `{ value, path }` (path from field context)                |
| write-back + form dirty           | `useFormFields()` dispatch + `useForm().setModified`                       |
| target locale                     | `useLocale()` → `.code`                                                    |
| collection slug + document id     | `useDocumentInfo()` → `{ collectionSlug, id }`                             |
| available source locales          | `useLocaleOptions()` → `[{ value: code }]` (from `useConfig` localization) |
| base path                         | `useTranslateKitConfig()` → `basePath`                                     |
| the call                          | `useTranslateField()` mutation (below)                                     |

On **Translate**:

1. `mutateAsync({ collectionSlug, fieldPath: path, targetLng: locale.code, sourceLng, docId: id })` (no `value` — the server reads the source from the doc; `value` is only captured client-side for undo).
2. `status: "translated"` → capture previous value for undo, `writeFieldValue(result.value)` (see Write-back), `toast.success`.
3. `status: "noop"` → `toast.info` / `toast.warning` with `notice.message` (no write).
4. Error → `toast.error` (via `handleNextApiError`).

> **Sandbox verification points:** that `useField()` (no `path`) resolves value/path
> from the field path context when rendered in `beforeInput` (relied on, confirmed against
> `@payloadcms/ui` source: `path = pathFromOptions || pathFromContext || potentiallyStalePath`);
> that the icon-button-in-`beforeInput` layout reads well above the input; and that the config
> provider (`useTranslateKitConfig`) is in scope app-wide.

## Server — from-locale read (single mode)

`POST {basePath}/field` is from-locale only: `source_lng` and `doc_id` are both **required** (the
schema validates this — `doc_id` via the canonical {@link JobIdSchema}). The handler always
`payload.findByID({ collection, id: doc_id, locale: source_lng, fallbackLocale: false, depth: 0 })`,
reads the field value at `field_path` via `getByPath`, and translates _that_. `fallbackLocale:
false` so an empty source locale reads as empty → `noop`, instead of a fallback silently masking
it. (In-place — translating the request's current value, auto-detecting the source — was removed:
the UI never used it, and a value sent only to be ignored is misleading API.)

The byte-size guard now covers the **fetched source value** (held synchronously through the
provider call), not the request body — the request no longer carries a field value. `getByPath`
keeps the array indices (`items.0.label`) the schema resolver drops, so it reads the exact
instance's value, and the same doc disambiguates `blocks` (below).

## The API hook — `useTranslateField`

```ts
mutationFn: (vars: { collectionSlug; fieldPath; targetLng; sourceLng; docId }) =>
  ofetch(`/api${basePath}/field`, {
    method: "post",
    body: { collection_slug, field_path, target_lng, source_lng: vars.sourceLng, doc_id: vars.docId },
  });
```

No cache invalidation — the result is written straight to form state, not persisted.

## `withFieldTranslation` — conditional arity, no `control` flag

A plain wrap means "add a control"; `{ exclude: true }` means "exclude". A **conditional
rest-tuple** makes the second argument _optional for text-like fields_ and _required (`{ exclude:
true }`) for everything else_ — so `withFieldTranslation(numberField)` is a compile error (you
can't add a control to a non-text field; you must `exclude` it), while raw object literals on
text fields still resolve cleanly (a bare `<T extends FieldControlCandidate>(field: T)` overload
does **not** accept raw literals — confirmed empirically — but `T extends Field` + a conditional
on the rest args does, matching the proven inference of the prior signature):

```ts
type FieldControlCandidate = TextField | TextareaField | RichTextField;

export function withFieldTranslation<T extends Field>(field: T, ...rest: T extends FieldControlCandidate ? [config?: { exclude?: boolean }] : [config: { exclude: true }]): T;
```

The impl stamps `custom.translateKit` (`{}` for control, `{ exclude: true }` for exclude) and,
unless excluded, positions the control via the active `FieldControlPositioner`. The control
component is injected via `TranslateFieldControlExport implements RawPayloadComponentExport`
(no props — see the write-back below), mirroring `TranslateDocumentExport`.

## Forward-compat seam — `FieldControlPositioner`

Positioning is isolated behind one interface so a future field-slots/positioner plugin can take
it over without touching the control or the wiring:

```ts
// field-actions.ts
export type FieldControlPositioner = <T extends Field>(field: T, control: RawPayloadComponentExport) => T;
export const beforeInputPositioner: FieldControlPositioner = (field, control) => /* append to admin.components.beforeInput */;
```

`field-config.ts` holds the single swap point — `const activeFieldControlPositioner = beforeInputPositioner`.
The seam is intentionally **internal** for now (Option 1): we have only one implementation, so we
don't freeze a public contract before a second (the slots plugin) validates its shape. When that
plugin lands, exposing the positioner — as a plugin option or by detecting the plugin — is an
**additive, non-breaking** change; the control component (context-only, takes no props) and
`withFieldTranslation` stay untouched. The default `beforeInputPositioner` is the built-in
fallback that keeps the control working with zero external dependencies.

> The positioner call currently lives in `withFieldTranslation` (it targets the exact wrapped
> field, so no schema walk is needed). Relocating the _selection_ into the plugin — so the plugin
> can pick the positioner based on installed plugins — is a later, additive step behind the same
> `FieldControlPositioner` interface.

## Write-back (one path for all field types)

The deferred bottleneck was richText: `setValue(tree)` updates form state, but a Lexical editor
owns its own state and won't re-render from an external `value` change. Confirmed in Payload's
`RichText` field — it only re-mounts the editor when **`initialValue`** changes
(`setRerenderProviderKey` keyed on `initialValue`, PR #5010), and `beforeInput` renders _outside_
`LexicalProvider`, so the control can't reach the editor instance to push state directly.

The fix is a **single write path** used for every supported field type — a form dispatch bumping
**both** `value` and `initialValue` (`useFormFields` dispatch → `{ type: "UPDATE", path, value,
initialValue }`) plus `setModified(true)`:

- **richText** — the `initialValue` change re-mounts the editor, so it shows the new content.
- **text / textarea** — the input just re-renders from `value` (the `initialValue` bump is a no-op
  for it visually).

`setModified(true)` keeps the form dirty/savable (`value === initialValue` would otherwise read as
unchanged). Same path for Undo. So **no per-type flag** (an earlier `isRichText` clientProp was
removed) — one branchless `writeFieldValue`. Trade-offs: the value also becomes the field's
`initialValue` (so a form-level reset reverts to the translation, and the per-field "modified"
dot is suppressed — the form-level dirty state still drives Save), and the richText re-mount
resets cursor + the editor's own undo history. All acceptable for a whole-field translate.

Server-side richText was already handled (the resolver's `TranslatableField` includes it); the
only server tweak was raising `MAX_FIELD_VALUE_BYTES` to 256 KiB (a long Lexical doc exceeds 64 KiB).

> **Sandbox verification (richText):** that the `initialValue` bump re-mounts the editor and shows
> the translation; that the document still saves the change (hence `setModified(true)`).

## Files

```
client/entities/translation/api/mutations/useTranslateField.ts   # from-locale vars (sourceLng, docId)
client/widgets/translate-field-control/
  ui/TranslateFieldControl.export.ts   # RawPayloadComponentExport (stable path, no props)
  ui/TranslateFieldControl.tsx         # beforeInput popup + mutation + undo; one write-back path; hidden on create
  ui/styles.module.scss
  index.ts
field-actions.ts                       # FieldControlPositioner seam + beforeInputPositioner (default)
field-config.ts                        # conditional-arity overload (incl. RichTextField); marks + positions via the seam
server/shared/field-config/types.ts    # FieldTranslationConfig (control flag removed)
server/features/translate-field/
  model.ts                             # from-locale-only schema (source_lng + doc_id required, doc_id via JobIdSchema)
  handler.ts                           # findByID(source_lng) + getByPath; byte guard on the fetched source
```

## Tests

The repo has **no client/React test harness** (vitest `environment: "node"`; the existing
widgets ship untested). Following that convention:

- **Tested (node):** a plain `withFieldTranslation(field)` stamps `{}` and positions the control
  in `admin.components.beforeInput` (preserving sibling components + existing `beforeInput`
  entries); `{ exclude: true }` stamps `{ exclude: true }` and injects nothing; input not mutated;
  `richText` is an eligible control (same as text/textarea).
- **Tested (node):** the handler — reads the source-locale value via `findByID`
  (`fallbackLocale: false`) and translates _that_; empty source → `noop`; resolves a field inside a
  block via the doc's `blockType`; missing `source_lng`/`doc_id` → 400 (DB untouched).
- **Not unit-tested (convention):** the React control + the `useTranslateField` hook — manually
  verified in the sandbox like the existing widgets.

## Fields inside blocks

Supported for from-locale. A `blocks` field is polymorphic — which block (and thus which fields)
sits at an index lives in the *data* (`blockType`), not the path. Since the control reads from a
saved source locale, the handler hands the fetched document to `resolveFieldSubtree`, which passes
it to {@link findFieldByPath}; at a `blocks` segment it reads `data[name][index].blockType` and
resolves the block via `resolveBlockFields`. `findFieldByPath` is now data-aware (optional `data`
arg) — the one navigator handles it on the existing kernel, no second walker. When the source
document's element has no/unknown `blockType` (e.g. an empty source locale), resolution returns
`inside-blocks` → a calm `noop`.

**Localized `blocks`/`array` ancestor → guard.** If a `blocks`/`array` field on the path is itself
`localized`, its per-locale structure is independent (order/content differ), so a positional path
index is not a stable cross-locale identity. `findFieldByPath` detects this and returns a
`localized-list-ancestor` status, which the handler maps to a `noop` with a `warning` notice
("translate the whole document instead"). This is the field-level half of the cross-locale block
identity decision — see
[2026-06-12-cross-locale-block-identity](./2026-06-12-cross-locale-block-identity.md) (Decision 3);
the document level fixes the same root cause by matching elements by `id` (`matchElementById`).
The supported field-level shape is therefore a **non-localized** container with **localized
leaves**.

## Out of scope

- Persisted undo history (the undo is an immediate, ephemeral affordance only).

## Release

Phase 2 + 3 ship together as one `feat` (minor) so `fieldLevel` is complete for `text` /
`textarea` on release. Confirm the exact `@since` via `bun run multi-semantic-release --dry-run`
at ship time (after Phase 1's levels minor lands).
