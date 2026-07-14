# Translation panel UI — consolidate to one status-aware entry + popup

**Date:** 2026-07-07
**Status:** design — part of #50 (staleness), lands in the same PR (feat → 0.8.0).
**Scope:** the document-panel client surface (`beforeDocumentControls`) only. No server / API change.

## Problem

The plugin injects its whole surface into the document edit panel's `beforeDocumentControls`
slot. It already stacks vertically and keeps growing:

- the translate popup trigger (`OpenDocumentTranslationPopup`);
- a run-status row (`CompletedTranslationStatus` / progress-failed / -running / -pending) — the last job;
- a **list** of `StaleTranslationsNotice` rows (one per stale locale, each with a full Dismiss button).

Each new capability (staleness now; dashboard, auto-translate, multi-target later) adds more rows
and eats the panel. The panel footprint must stay ~constant regardless of how much the plugin does.

## Direction

**Panel = one minimal, status-aware entry. Popup = the full surface.**

- The **panel** keeps exactly the single existing icon-button (the popup trigger). It gains a small
  **status marker + tooltip** that summarizes the most important current state at a glance — no extra
  rows. For #50 the marker means "a translation is out of date".
- The **popup** holds everything detailed and interactive: the translate form, per-locale status, the
  staleness list with Dismiss, and future features. It can grow freely — it's scrollable, off-panel.

This is the pattern every future feature follows: surface a glance-level signal on the trigger,
put the detail in the popup.

## Panel marker (this PR)

Overlay a small badge on the trigger icon + wrap it in a `Tooltip`. Single aggregate state, by
priority (most urgent wins):

Each marker carries a **distinct glyph (shape)**, so the state is legible without relying on colour;
colour is only an accent. The marker is driven by the derived `PanelStatus` (job status + staleness),
**not** by `Button $isLoading` (that flag reflects the query's initial fetch, not a running job).

| Priority | State | Marker (glyph · colour) | Tooltip |
| --- | --- | --- | --- |
| 1 | a job failed | `!` · red | "Last translation failed" |
| 2 | running / pending | spinning ⟳ · blue | "Translation in progress…" |
| 3 | **out of date** (#50) | **⚠ icon · amber** | **"Out of date: fr, es"** |
| 4 | all translated & fresh | `✓` · green | "Translations up to date" |
| 5 | nothing yet | no marker | "Translate this document" |

- #50's concrete ask is priority 3: an **amber warning badge on the icon + tooltip** naming the stale
  target locales. Needs a small warning glyph — add `AlertTriangleIcon` to
  `client/shared/lib/assets/icons/` (siblings: `LanguageTranslateIcon`, `ReloadIcon`, …).
- The marker is a positioned overlay on the existing `$isIconButton` trigger (no new row).
- Colour is never the only signal — the tooltip text carries the meaning (a11y).

## Popup content (this PR)

Move all detail into the popup body (`OpenDocumentTranslationPopup` children):

1. the translate form (already there);
2. a per-locale status section — compact rows/chips: `de ✓ · fr ⚠ Out of date [Dismiss] · es ⟳`;
3. the staleness list (relocate `StaleTranslationsNotice` here) with its Dismiss controls.

Net panel change: remove the stacked `CompletedTranslationStatus` + progress rows +
`StaleTranslationsNotice` from `TranslateDocument.tsx`; the panel renders only the trigger (+marker).

## Component changes

- `TranslateDocument.tsx`: stop rendering status rows on the panel; compute the aggregate state
  (from `useDocumentTranslation` + `useDocumentStaleness`) and pass it to the trigger; render the
  status/staleness detail inside the popup children. Remove the stray `console.log`.
- `OpenDocumentTranslationPopup`: accept a `status`/marker prop (or a `trigger` slot) so the trigger
  can show the badge + tooltip; keep the icon-button shape.
- New `client/shared/lib/assets/icons/AlertTriangleIcon.tsx`.
- Keep `StaleTranslationsNotice` (rendered inside the popup now) or fold into the per-locale section.
- New tiny helper: derive the aggregate panel state from the two hooks (pure, unit-testable).

## Non-functional

- **a11y:** every marker has a distinct **shape** (glyph), not colour alone; the full meaning is in
  the trigger's `aria-label` (always, for screen readers) and the native `title` (mouse hover).
- **i18n:** strings hardcoded EN for now, consistent with the rest of the plugin UI (deferred, per
  the #50 task doc).
- **perf:** no new requests — reuses the existing `useDocumentTranslation` + `useDocumentStaleness`.

## Out of scope

- Collection-list / bulk-dashboard staleness (deferred to #49).
- Real per-locale run-status matrix (the "runner-independent status" merge) — the panel marker uses
  the last-job run-status only; full per-locale run state is #49.

## Acceptance criteria

1. Panel renders **one** control (the trigger) — no stacked status rows — regardless of state.
2. When ≥1 target locale is stale, the trigger shows the amber ⚠ marker + a tooltip naming the stale
   locales; opening the popup shows the per-locale list with working Dismiss.
3. Marker priority: failed → running → stale → fresh → none (aggregate helper unit-tested).
4. No stray `console.log`; `bun run check-types` + `bun run lint` + tests green.
