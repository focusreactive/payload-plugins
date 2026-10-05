# @focus-reactive/payload-plugin-visual-editing — Agent Guide

Payload v3 plugin that adds click-to-edit overlays to server-rendered content via Vercel stega + a postMessage bridge back to the admin.

## Pipeline at a glance

Three layers. Each runs in a different context.

| Layer | Entrypoint | Runs in | Job |
|---|---|---|---|
| Server | `src/internal/{beforeOperationHook, afterReadHook, afterOperationHook}.ts` | Payload hooks (Local API draft reads only) | Stamp `_meta` on holders in `afterRead`, then in `afterOperation` weave `@vercel/stega` zero-width chars into text fields so the path survives SSR. |
| Client overlay | `src/client/VisualEditingOverlay.tsx` → `src/client/overlay/*` | User's frontend page, wrapped by `<VisualEditing.Overlay>` | `MutationObserver` scans for stega in text nodes, groups by `(collectionSlug, docId, path, anchor)`, picks a target element, writes `data-ve-target`, draws Edit badges. |
| Admin bridge | `src/admin/VisualEditingBridgeProvider.tsx` | Payload admin shell (injected via `admin.components.providers`) | Receives `postMessage` from the overlay, navigates to the correct doc if needed, resolves the path to a tab/collapsible/row chain, scrolls, focuses, sweeps. |

`src/internal/shared.ts` is the single source of truth for the transport shape (`VeIdentity = {collectionSlug, docId, path, kind}`).

## Non-obvious invariants

- **Group key must include collection + docId + path + anchor.** See `src/client/overlay/markerExtractor.ts`. Keying by `path` alone conflates sibling-rendered docs (three FeatureSet cards with `path="title"` collapse to one LCA-wide target). Anchor alone does not differentiate either — plain text nodes have `anchor=null`.
- **Scan skips `<script>`, `<style>`, `<noscript>`, `<template>`.** See `src/client/overlay/stegaScanner.ts`. JSON-LD emitted via `JSON.stringify` preserves stega zero-width chars; decoding those drags real targets up to the LCA of the script and the rendered element.
- **Payload virtualizes field groups below the fold** via `<RenderIfInViewport>` (IntersectionObserver with `rootMargin: 1000px`). Before polling for a row/collapsible/input id, scroll the deepest-mounted `field-<ancestor>` into view — see `scrollNearestAncestorIntoView` in `src/admin/expandAndFocus.ts`.
- **Stega is only embedded on `draft + Local API` reads.** See `src/internal/gate.ts`. REST reads (including those the admin panel makes) skip enrichment so stega doesn't leak into form inputs. `context.visualEditing` (boolean) overrides the gate; with `enrichment: 'explicit'` it is the only way in — no guessing, so server-side draft reads (plugins, jobs) stay clean.
- **`beforeOperationHook` filters on `operation === 'read'`** — that's Payload's v3 coarse-grained operation label for `find`/`findByID`/`findVersions`/etc. Don't "fix" it to `'find'`.
- **Stega zero-width chars get stripped from the live DOM** by `stegaBookkeeper` after scanning (to avoid layout surprises). Originals are restored on teardown. If you need the raw pre-scan HTML, fetch it server-side.
- **Field exclusion is per consumer config.** Multi-tenant consumers typically pass `excludeFieldNames: ['tenant']`; the schema cache respects this.

## Dev loop against an external consumer

If a consumer project pins this package as a `file:` dep, note that it which copies `dist/` at install time and does NOT auto-refresh on source change. After editing plugin source:

```bash
# in this package
bun run build
# then sync dist into the consumer
rsync -a --delete \
  packages/payload-plugin-visual-editing/dist/ \
  ../../<consumer>/node_modules/@focus-reactive/payload-plugin-visual-editing/dist/
```

Next.js may have cached the old chunk — hard-refresh the preview tab (Ctrl/Cmd+Shift+R) or restart `next dev` if client-bundle changes don't land.

To see what the overlay did: open the admin iframe, `document.querySelectorAll('[data-ve-target]')` shows every registered target; `data-ve-target` holds the stega path. Absent collection/docId attrs on those elements are expected — those live in the closure-held click handler, not the DOM.

## Testing

`bunx vitest run` inside this package. jsdom-backed tests live in `tests/*.int.spec.ts[x]`. jsdom lacks `scrollIntoView` and `window.scrollBy` — guard calls with `typeof el.scrollIntoView === 'function'` or surface errors as controlled warnings.

Prefer adding a failing test that reproduces a real observed DOM shape before touching the overlay modules — the grouping/target-selection rules have surprising interactions and regress silently.

## Publishing

Published to npm as a **public** package: `private: false` + `publishConfig.access: "public"`, released by semantic-release via the monorepo release flow (with provenance). Peer deps are pinned to a real supported band (`@payloadcms/ui`/`payload` `^3.79.0`), not a blanket `^3.0.0`, because the admin bridge depends on `useConfig().getEntityConfig` whose shape is not stable across all 3.x minors — widen the floor only after testing against the lower bound. First publish (manual `npm publish` + `gh release create` tag) follows the [`payload-plugins-add-package`](../../.claude/skills/payload-plugins-add-package/SKILL.md) flow.

## Gotchas to re-read before debugging

- `src/internal/encodeStega.ts` — terminal marker promotion for richText is the trickiest server-side bit.
- `src/client/overlay/targetSelector.ts` — `pickTargetForGroup` prefers `<a>`/`<button>` over LCA, and has a label→form-field expansion for floating-label inputs.
- `src/admin/resolveContainerChain.ts` — path → DOM instruction translation, including `_index-<n>` handling for unnamed ancestors.
