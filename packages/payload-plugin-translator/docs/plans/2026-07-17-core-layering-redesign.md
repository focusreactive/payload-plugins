# Architecture design — `core/` layering redesign (translator)

**Date:** 2026-07-17
**Status:** designed (forward architecture · 3 candidates → adjudicated). Implementation pending approval.
**Method:** system map → 3 candidate designs (max-reuse · min-new-abstraction · cleanest-boundaries) → adjudication against the invariant checklist + requirement-coverage gate. Spine = cleanest-boundaries.
**Kind:** internal structural refactor — behavior-preserving, NO public API change → `refactor:` (patch) at most.

## The ask (ground truth)

Make `packages/payload-plugin-translator/src/core/` read as a coherent architecture map, and kill the
auto-translate "4 places / 3 near-identical names" friction. Pure moves/renames — tests stay green,
`core/` stays payload-free, and every `src/index.ts` export (the public surface) is untouched.

In-scope: **R1** kill the auto-translate spread · **R2** resolve `core/`'s 10 flat siblings into a
readable map · **R3** no public API change · **R4** behavior-preserving, payload-free core, tests green ·
**R5** honor conventions (role-tag naming, `.shapes.ts`, provenance reference) · **R6** incremental,
sequenceable plan.

## The design (decided)

**Three tiers under `core/`, tracing the *measured* dependency gradient** (verified acyclic, all edges
downward): `kernel < domain < pipeline`.

```
core/
  kernel/            # payload-free structural plumbing, zero translation vocabulary
    field-traversal/   (kernel.ts + guards/predicates/walkFields/types — barrel kept verbatim, fan-in 8)
    lexical/           (richText AST traversal)
    utils/             (isEmpty, isObject)
  domain/            # payload-free translation domain logic + ports
    content-projection/
    field-config/
    provenance/        (ProvenanceStore.interface.ts + staleness.ts — colocated port+predicate)
    translation-providers/  (TranslationProvider.interface.ts)
    auto-translate/    ← D1: the merged auto-translate core (see below)
  translation-pipeline/   # apex orchestrator — stays BARE at core/ root (a 1-module umbrella would be noise)
  index.ts                # selective barrel — stays at root; only its internal specifiers change
  no-payload-boundary.test.ts  # stays at root; recurses from core/ dirname → auto-covers the new umbrellas
```

- **Umbrellas are filesystem grouping, not code abstractions.** No `core/kernel/index.ts` /
  `core/domain/index.ts` barrel is created; nothing imports `"core/kernel"` as a unit. Deep specifiers
  persist (`core/kernel/field-traversal`, `core/domain/provenance`). So invariant #1 (≥2-caller) does
  **not** apply — a folder no code imports as a unit is not an abstraction.
- **Interface contracts stay domain-local** (D4): each `.interface.ts` travels with its module into its
  tier; no centralized `core/contracts/`.
- **auto-translate gets one core owner** (D1): `core/domain/auto-translate/` holds config types +
  `AUTO_TRANSLATE_CUSTOM_KEY` + `getAutoTranslateConfig` reader + `hasSourceContentChanged` drift
  predicate (mirrors the provenance template: port/types + pure predicate in one dir). Deletes both old
  `core/auto-translate/` and `core/auto-translate-config/`.

**Dependency gradient (verified, corrects candidate C's writeup):** kernel depends on nothing above it;
domain depends only on kernel + domain siblings; `translation-pipeline` is the apex, depending on
domain (`translation-providers`, `content-projection`) **and** kernel — downward, acyclic.

## Requirement coverage

| Req | Satisfied by | Status |
|-----|--------------|--------|
| R1 | D1 merges the two `core/` halves → 3 survivors in distinct layers | met |
| R2 | D3 structural grouping — the `ls core/` listing now expresses the architecture | met |
| R3 | `src/index.ts` does not deep-import `core/` at all; every moved path is internal | met |
| R4 | pure code-move; `no-payload-boundary.test.ts` recurses → auto-covers new dirs | met |
| R5 | domain-local interfaces + provenance template + role tags untouched | met |
| R6 | tier-by-tier build sequence, one green commit per move | met |

## Decisions (ADRs)

- **D1 — merge both auto-translate core halves into `core/domain/auto-translate/`.** Forced by D3
  (auto-translate is domain). Not a new abstraction (relocating existing fns); single owner for one
  cohesive cluster (config + reader + drift gate); edges stay downward. Fixes A/B's residual smell (their
  surviving `auto-translate-config/` would hold a non-config predicate). *Fallback:* if D3's umbrellas are
  rejected, land in the existing `core/auto-translate-config/` instead (this ADR flips with D3).
- **D2 — no renames; disambiguate the 3 survivors by layer path** (`core/domain/auto-translate` vs
  `server/modules/auto-translate` vs `src/auto-translate-config.ts`), mirroring the `field-config`
  precedent. The repeated domain name across layers is intended signal.
- **D3 (pivot) — group `core/` into kernel / domain / bare pipeline.** R2 is defined as "resolve the flat
  siblings" — the flat structure *is* the defect, so R2 requires structure, not a comment. A/B's
  flat+barrel-comment answer was **disqualified on the R2 coverage gate** (the map would live in a file
  comment, and `core/index.ts` is selective so the comment-map is incomplete by construction). A/B's
  invariant-#1 objection to umbrellas is a category error (a folder ≠ a code seam). The tiers are the
  minimal structure that makes the map true.
- **D4 — interface contracts stay domain-local.** A central `core/contracts/` would concentrate unrelated
  ports (invariant #6 pressure) and fight the sanctioned provenance template.
- **D5 (deferred) — no `field-traversal` internal split.** Files already role-named; touching a fan-in-8
  barrel with no requirement driving it is scope creep. Only reparent the dir under `core/kernel/`.
- **D6 (non-load-bearing) — `core/index.ts` stays selective.** Only its internal specifiers change;
  exported names untouched.

## Build sequence (tier-by-tier, one green commit each — build + tests + `no-payload-boundary`)

1. `core/kernel/` + move `utils` into it (kernel bottom, no core deps) — update `core/utils` importers.
2. Move `lexical` + `field-traversal` into `core/kernel/` — update importers (field-traversal fan-in 8);
   keep `field-traversal/index.ts` verbatim.
3. `core/domain/` + move leaf domain modules `field-config`, `provenance`, `translation-providers`.
4. Move `content-projection` into `core/domain/` (depends on step-3 siblings placed).
5. **D1:** merge `core/auto-translate` + `core/auto-translate-config` → `core/domain/auto-translate/`
   (merged barrel = union of symbols); delete both old dirs; update fan-in-1 predicate importer + fan-in-5
   config importers.
6. Update `core/index.ts` internal specifiers (`./field-traversal`→`./kernel/field-traversal`,
   `./provenance`→`./domain/provenance`, …); exported names untouched; confirm the boundary test still at
   `core/` root and green.

`translation-pipeline` needs no move; only its internal imports of moved modules update (folded into steps 1–4).

## Cost & de-risking

- **Cost:** ~35–40 **mechanical** internal import-specifier edits (path-prefix only, no symbol renamed),
  across server/, client/, core-internal. All R3-safe (public surface untouched). The heavy-fan-in modules
  (`field-traversal`, `utils`, `provenance`, `translation-providers`) are exactly what any real grouping
  must move — there is **no cheaper middle** that satisfies R2 (a kernel-only partial grouping still moves
  the heavy ones).
- **De-risk option (sequencing tool):** leave a one-line re-export shim barrel at each old flat path
  (`core/field-traversal/index.ts` → re-export from `core/kernel/field-traversal`) so steps 1–5 are
  zero-ripple, then delete the shims in a final cleanup commit. Only worth it if the edits must be split
  across many small PRs.

## Framing gaps (surfaced by the adjudicator)

- **Barrel completeness vs deep-import coupling** is the real driver of D3's cost: `core/index.ts` is
  selective, so external code deep-imports `core/<subdir>`, so a reparent touches many lines. A
  comprehensive/per-tier barrel would make future reparents a 1-file change — but trades away the
  single-import-path guarantee (D6). Not overriding D6 now; flagged.
- No low-cost middle between full-C and A/B-flat exists (verified).

## Rejected (for the record)

- **A/B flat + barrel comment** — fails the R2 coverage gate (map in a comment, not the directory; selective
  barrel makes it incomplete). Invariant-#1 objection to umbrellas was a category error.
- **A/B land auto-translate in existing `core/auto-translate-config/`** — incompatible with the chosen D3;
  kept only as the fallback if umbrellas are rejected.
