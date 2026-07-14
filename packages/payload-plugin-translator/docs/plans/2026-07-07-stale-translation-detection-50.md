# #50 — Detect & surface out-of-sync (stale) translations

Research / task definition. Feeds `/sp-task`. Builds directly on #47 provenance
(v0.7.0). Package: `packages/payload-plugin-translator`.

> Status: **research complete — proceeding on recommended defaults** (user away at
> Phase 4; see Clarifications). Fingerprint primitive + data model already shipped in #47.

## Clarifications (working defaults — confirm before/at `/sp-task`)

Both blocking questions were posed; the user was away, so v1 proceeds on the
**recommended** answers. Either can be revisited without re-doing research.

1. **Scope → Doc-panel only.** New dedicated `staleness read` endpoint + `dismiss`
   mutation + per-locale "out of date" indicator **in the document panel only**. The
   existing `get-document-status` / `get-collection-status` endpoints are **not touched**.
   Bulk-list staleness + the "runner-independent status merge" (design decision #7) are
   **deferred to #49**. → drops open questions 4 and the decision-#7 refactor from v1 scope.
2. **Computation → Lazy on-read.** Recompute `computeSourceFingerprint` on each staleness
   query; **no `afterChange` hook** on source collections, no materialized flag. Satisfies
   AC1 functionally (indicator appears on next panel view). Write-time materialization stays
   available later "if dashboard perf demands" (#49).

---

## Problem statement

When a source locale's content changes after a target locale was translated, the
target is now **out of date** — but nothing surfaces this to the editor. #47 shipped
the durable baseline (a per-`(collection, document, targetLocale)` provenance record
carrying the `sourceFingerprint` the translation was derived from, plus an unused
`dismissedFingerprint` column). #50 turns that latent data into a signal:
per-target-locale **staleness = `currentSourceFingerprint !== record.sourceFingerprint`**,
surfaced in the admin UI and **dismissable** (acknowledge without re-translating).

## What already exists (from #47 — do NOT rebuild)

- **Comparison primitive:** `computeSourceFingerprint(doc, schema)` —
  `src/core/content-projection/computeSourceFingerprint.ts:18` → `fingerprint(projectTranslatableContent(doc, schema))`,
  sha256, reorder-invariant. This is the single function #50 calls to get CURRENT.
- **Write path (baseline):** `TranslateDocumentHandler.handle` —
  `src/server/features/translate-document/handler.ts:84-106` — writes the record with
  `sourceFingerprint = computeSourceFingerprint(sourceData, schema)` where `sourceData`
  = `findByID({ locale: sourceLng, depth: 0 })` and `schema` = `schemaMap.get(collection)`.
  **#50 must recompute with the exact same inputs (`depth:0`, `record.sourceLocale`,
  same `schemaMap` entry) or untouched docs report spuriously stale.**
- **Store:** `PayloadProvenanceStore` (`src/server/modules/provenance/PayloadProvenanceStore.ts`)
  — `find(key)` returns the record; `upsert` already sets `dismissedFingerprint: null` on
  every (re)translation, so re-translating auto-clears staleness. No new store method needed
  for read; **a `dismiss` needs either a new store method or a direct `update`**.
- **Schema:** `dismissedFingerprint` text column already in the sidecar
  (`provenanceCollection.ts:43`). **No consumer migration is required for #50.**
- **Factory wiring:** `provenanceSlug` / `provenanceStoreFactory` resolved in
  `src/plugin.ts:150-159`; handler + cleanup hook already receive them.

## What's missing (the #50 build)

1. **Server read** — per target locale: `store.find(key)` → `findByID(source, depth:0, locale:record.sourceLocale)`
   → `computeSourceFingerprint` → `isStale = current !== record.sourceFingerprint && current !== record.dismissedFingerprint`.
2. **Dismiss write** — set `dismissedFingerprint = currentSourceFingerprint` for a key.
3. **Client query hook** exposing `isStale` per locale (mirror `useDocumentTranslation`,
   `src/client/entities/translation/api/queries/`) + a dismiss mutation.
4. **UI** — per-target-locale "out of date" indicator + dismiss control in the document
   panel (`src/client/widgets/translate-document/ui/TranslateDocument.tsx`), and
   possibly the bulk list dashboard (scope decision below).
5. **Client plumbing** — today only `basePath` crosses to the client
   (`TranslateKitConfigContext`); staleness rides its own endpoint so no extra config
   crossing is strictly required (endpoint returns empty when provenance is off).

## Non-functional scan

- **Performance** — *relevant*: recompute needs `findByID(source)+projection` per locale.
  Doc panel = 1 doc (fine). Collection-wide list = N docs × M locales (concern → scope Q1).
  Design doc allows write-time materialization later "if dashboard perf demands"; v1 is lazy-on-read.
- **Security / access control** — *relevant*: dismiss is a write; must reuse the existing
  `withAccessCheck` guard used by enqueue/cancel routes.
- **Accessibility** — *relevant*: indicator must not be colour-only (text/aria label). **Done** —
  "Out of date" text + `role="status"` + per-row `aria-label`.
- **i18n / localization** — *deferred*: the indicator strings ("Out of date" / "Dismiss") are
  hardcoded English, matching the rest of the plugin's admin UI (all hardcoded). Localizing this one
  component via Payload `t()` in isolation would be inconsistent; a plugin-wide i18n pass is the right
  home for it. Follow-up, not part of #50.
- **Observability** — *relevant*: recompute/read failures swallow-and-log via
  `req.payload.logger` (same best-effort posture as the write path) — never break the panel.

## Acceptance criteria (draft)

1. Source changed since translation (`current !== recorded`, `current !== dismissed`) ⇒
   staleness read returns `isStale:true` for that locale. *(test)*
2. Source unchanged since translation ⇒ `isStale:false`. *(round-trip test — must match write path exactly)*
3. A locale with **no** provenance record is reported absent, **not** stale. *(test)*
4. Document panel shows a per-target-locale "out of date" indicator for stale locales. *(manual/component)*
5. Dismiss writes `dismissedFingerprint = currentSourceFingerprint`; indicator hides while they match. *(test + manual)*
6. After dismiss, editing the source again (fingerprint changes) ⇒ indicator reappears. *(test)*
7. Re-translating clears staleness (`upsert` overwrites `sourceFingerprint`, resets `dismissedFingerprint:null`) ⇒ `isStale:false`. *(test — write path already does this)*
8. **Negative path:** provenance disabled, sidecar table missing, or source fetch fails ⇒
   read degrades gracefully (not-stale / empty, logged), never throws into the admin UI. *(test)*
9. **Access:** dismiss is guarded like other write routes; unauthorized ⇒ 403. *(test)*
10. `bun run check-types` + `bun run lint` + tests pass; test files type-checked via `tsconfig.check.json`. *(CI output)*

## Open questions

### Blocking

1. **Scope & architecture** *[blocking]* — how far does #50 reach? Design decision #7
   floated a "runner-independent status" refactor (merge per-locale translated/missing/stale
   into `get-document-status`/`get-collection-status`). The issue itself is narrower
   (stale indicator + dismiss). Matters because it swings effort/risk widely and decides
   whether we touch the existing status endpoints. → Q1.
2. **Staleness computation** *[blocking]* — lazy-on-read (recompute fingerprint each query)
   vs materialized (an `afterChange` hook on source recomputes and flags). Design doc leans
   lazy; but AC1 ("editing source marks stale") reads as event-driven. Matters for perf and
   for whether #50 adds another write-side hook. → Q2.

### Non-blocking (defaulted)

3. **Dismiss granularity** — per target locale (default) vs whole-document. AC wording is
   per-locale; default per-locale.
4. **Collection-list perf** — if Q1 includes the bulk dashboard, recompute for N docs is
   costly; default to a bounded/opt-in aggregation or defer to #49. Revisit under Q1.
5. **Formatting-only edits** — text-nodes-only fingerprint blind spot (formatting change ⇒
   not stale). Already accepted & documented in the #47 design; carried as-is.
6. **`updatedAt`/version fingerprint** — deferred per #47 decision #2; not in #50.

## Restate check (key terms)

- **stale** = current source-content fingerprint ≠ fingerprint recorded at last translation
  **and** ≠ dismissed fingerprint; only for locales that have a provenance record.
- **dismiss** = acknowledge current staleness without retranslating; persists
  `currentSourceFingerprint` into `dismissedFingerprint`; reappears when source changes again.
- **surface** = per-target-locale indicator in the document edit panel (± bulk list, per Q1).

## Risks & constraints

- Fingerprint recompute must byte-for-byte match the write path (depth, source locale from
  the record, original schema) — the single biggest correctness trap.
- Best-effort read: a missing table (consumer enabled provenance but didn't migrate) must
  not 500 the admin panel.
- No consumer migration for #50 (`dismissedFingerprint` already shipped in #47).
- Version bump: `feat` → **0.8.0** (from 0.7.x). Confirm at implementation via
  `bun run multi-semantic-release --dry-run`; any new public export gets `@since 0.8.0`.

## Comprehension

**9/10** — data model, fingerprint primitive, write path, and UI surface are fully mapped;
the two scope/architecture choices are resolved via recommended defaults (revisitable). No
unknowns remain that block implementation.

## Suggested next step

**Ready for `/sp-task`** on the defaulted scope (doc-panel only, lazy on-read). Worth a
one-line confirm from the user on Q1/Q2 before executing, since they were auto-defaulted.
