# Plugin UI guidelines

How the admin UI of every plugin in this repo should look and behave. The goal: an editor
moving between Payload's own screens and a plugin never feels a seam.

## Who we design for

| Person | Comes to the plugin to | Needs first |
|---|---|---|
| Editor | finish a page and publish it | what to do next, in plain words, next to the field it concerns |
| Marketer | run an experiment, reuse proven sections | who sees what, and what a change does before they make it |
| SEO specialist | get a page to rank | the few things to fix first, then the evidence |
| Reviewer | leave and resolve feedback | every open thread on the page, where it belongs |

Design for scanning, not reading. People open the panel with one question; answer it in the
first line they see, then let them dig.

## Principles

1. **Payload first.** Reuse `@payloadcms/ui` (`Button`, `Pill`, `ConfirmationModal`, `Drawer`,
   `toast`, `useDocumentDrawer`) and Payload class names (`field-label`, `field-description`)
   before drawing anything. A plugin control sits beside a Payload field and must look like
   its sibling: same label size, same input height, same radius.
2. **Summary, then detail.** Show the state in one line (a score, a split, a count). Detail
   opens on demand: a row expands, a drawer opens, good results collapse.
3. **Problems first.** Lists of checks or threads sort by what needs action. Passing items are
   still reachable but never push problems below the fold.
4. **Say what happens.** Next to a control, say its consequence in the reader's words
   ("Applies to visitors after you publish"), not the mechanism.
5. **Empty states teach.** One sentence on what the feature does, one primary action. No
   illustration, no marketing.
6. **Destructive actions confirm in a Payload modal** that names what will be lost. Never
   `window.confirm`.
7. **One status language** across plugins: Good / Needs work / Problem, mapped to Payload's
   success / warning / error scales. Color is never the only signal: pair it with a word or
   an icon.
8. **No decoration.** No sparkles for AI, no gradients, no colored boxes around content that
   is not a status. Hierarchy comes from spacing, weight and one accent.

## Tokens

Use Payload's CSS variables only. They switch with the admin theme, so dark mode is free.

| Need | Token |
|---|---|
| Surfaces | `--theme-elevation-0` (field), `--theme-elevation-50` (raised row), `--theme-bg` |
| Borders | `--theme-elevation-150`; hover `--theme-elevation-250` |
| Text | `--theme-elevation-800` primary, `--theme-elevation-500` secondary, `--theme-elevation-400` hint |
| Status | `--theme-success-*`, `--theme-warning-*`, `--theme-error-*` (100 fill, 500 mark, 750 text) |
| Series / accent | `--color-blue-*` |
| Radius | `--style-radius-s` (3px) controls, `--style-radius-m` (4px) fields and cards, `--style-radius-l` (8px) floating panels |
| Spacing | multiples of `calc(var(--base) / 4)` (5px); fields stack at `var(--base)` |
| Type | 13px body and controls, 12px meta, field labels via `.field-label`; sentence case |

## Patterns

- **Section in the sidebar.** `.field-label` title, optional status `Pill` on the right, a
  `.field-description` line under it, content, then actions. Matches Payload's own fields.
- **Rows.** 36px min height, 12px side inset, `--theme-elevation-150` divider. Actions live in
  one overflow menu at the row's end, not a strip of icon buttons.
- **Status pill.** Payload `Pill` with `pillStyle` `success` / `warning` / `error`, or the
  plugin's own pill built on the same tokens and 3px radius.
- **Numbers.** Tabular figures (`font-variant-numeric: tabular-nums`) wherever values line up
  or change in place.
- **Motion.** 150ms ease for hover and expand; nothing moves on its own.

## Accessibility

- Every control has a name: visible label, or `aria-label` on icon buttons.
- Everything works with the keyboard; focus is visible (`:focus-visible` outline in
  `--theme-elevation-800`).
- Text contrast at least 4.5:1, control edges and state fills 3:1, checked in light and dark.
- Menus, number inputs and other composite widgets come from a library that implements the
  ARIA pattern (`@payloadcms/ui`, or `@ui-sdk/react` where Payload has none), never a
  hand-written `role=`.

## Code

- Styles live in a stylesheet next to the component, BEM classes with the plugin prefix
  (`ab-split__bar`, `presets-card__badge`). No inline styles for state; state goes in
  `data-*` attributes or modifier classes.
- Strings go through the plugin's translations where the plugin has them.
