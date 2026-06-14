# SEO check → display-type mapping (for verification)

Maps every CheckRow-based check (Keyphrase / On-page / Readability tabs) to one of
five display types. **This file is the spec you verify before any code is written.**
Vitals, SERP, and Inclusive-language tabs are out of scope (bespoke layouts, kept as-is).

## The five display types

| # | Type | Component | Renders when `check.data` has… | Body when data missing |
|---|------|-----------|-------------------------------|------------------------|
| 1 | **Presence** | _(none — bare `StatusPill`)_ | n/a (binary good/bad) | — |
| 2 | **Value vs range** | `DensityGauge` | a single numeric value + a banded scale | falls back to Presence |
| 3 | **Count + drill-down** | `DrillDown` | a count + list of offending items | falls back to Presence |
| 4 | **Proportion / mix** | `SegmentBar` | matched / total (part-of-whole) | falls back to Presence |
| 5 | **Distribution** | `DistributionBar` | an array of positions (0–100) | falls back to Presence |

**Runtime rule (confirmed):** if a check is assigned a richer type but its `data` is
absent at render time, the row degrades to **Presence** (pill only). Never hide, never crash.

## Check-id constant (confirmed form)

A single source-of-truth constant, **grouped by tab**, replax`ces `partition.ts` and yields
the `CheckId` union that types every downstream map:

```ts
// src/constants/checkIds.ts
export const CHECK_IDS = {
  keyphrase:   ["introductionKeyword", "keyphraseLength", "keyphraseDensity", ...],
  onPage:      ["textLength", "metaDescriptionLength", "titleWidth", ...],
  readability: ["subheadingsTooLong", "textParagraphTooLong", "passiveVoice", ...],
} as const;

export type CheckId = (typeof CHECK_IDS)[keyof typeof CHECK_IDS][number];
```

- **Partition** derives from `CHECK_IDS` (keyphrase set / on-page set / readability is the
  fallback). `partition.ts`'s `KEYPHRASE_IDS` / `ONPAGE_IDS` are removed.
- **Open set:** the union enumerates all *currently known* ids. Unknown content ids that
  surface at runtime route to the Readability tab and render as **Presence** (the fallback
  rule already covers them). Exhaustiveness is a compile-time guarantee over known ids only.
- **Inclusive-language ids are excluded** — they are dynamic term keys, unbounded by design.

## Mapping mechanism (confirmed)

A single central registry **typed `Record<CheckId, DisplayEntry>` — exhaustive**, so omitting
any check is a build error (this is the root-cause fix for silent fallthrough). Each entry is
`{ type, pillLabel(check), toProps(check) }`; **Presence is an explicit `{ type: "presence" }`
entry**, never the absence of one. A generic `<CheckViz check={c} />` dispatcher reads the
registry, computes props via `toProps`, and renders the matching component (data missing →
Presence). Replaces the three per-tab `viz()` and `pill()` functions. Proposed location:
`src/constants/checkDisplay.tsx` (camelCase, matching `extractCheckData.ts` / `runAnalysis.ts`).

---

## Keyphrase tab

| Check id | Assigned type | Engine data needed | Status | Notes |
|----------|---------------|--------------------|--------|-------|
| `introductionKeyword` | **Presence** | none | ✅ no change | Keyphrase in first paragraph — binary. |
| `keyphraseLength` | **Value vs range** | `{ words }` | 🔧 NEW extract | research `keyphraseLength` → `{ keyphraseLength, functionWords }`; `words = keyphraseLength`. Gauge: ideal ≤ 4 content words. |
| `keyphraseDensity` | **Value vs range** | `{ densityPct }` | ✅ already emits | DensityGauge already wired. |
| `metaDescriptionKeyword` | **Presence** | none | ✅ no change | Keyphrase in meta description — binary. |
| `subheadingsKeyword` | **Proportion / mix** | `{ matched, total }` | 🔧 NEW extract | research `matchKeywordInSubheadings` → `{ count, matches, percentReflectingTopic }`; `matched = matches`, `total = count`. |
| `textCompetingLinks` | **Count + drill-down** | `{ count, links:[{left,right}] }` | 🔧 NEW extract | research `getAnchorsWithKeyphrase` → `{ anchorsWithKeyphrase: Node[], anchorsWithKeyphraseCount }`; `count = …Count`, items = `anchorsWithKeyphrase.map(a => a.innerText())`. Needs `paper.getTree()` (already built). |
| `imageKeyphrase` | **Proportion / mix** | `{ matched, total }` | ✅ already emits | SegmentBar already wired. |
| `keyphraseInSEOTitle` | **Presence** | none | ✅ no change | Binary (position detail dropped per "bare pill" decision). |
| `slugKeyword` | **Presence** | none | ✅ no change | Keyphrase in slug — binary. |
| `functionWordsInKeyphrase` | **Presence** | none | ✅ no change | Only surfaces for long keyphrases; pass/fail advisory. |
| `keyphraseDistribution` | **Distribution** | `{ positions:number[] }` | ✅ now live | Not registered on any library assessor by default — **now attached to `SeoAssessor` in `runAnalysis.ts`** (`addAssessment`). Emits whenever keyphrase + text exist; `extractCheckData` computes `positions`. Verified: 17 positions resolved on the integration fixture. The sole consumer of the Distribution type. |

## On-page tab

| Check id | Assigned type | Engine data needed | Status | Notes |
|----------|---------------|--------------------|--------|-------|
| `textLength` | **Value vs range** | `{ words }` | ⚠️ data exists, display change | Currently only a pill (`"N words"`). Promote to gauge vs 300-word minimum. |
| `metaDescriptionLength` | **Value vs range** | `{ chars }` | ✅ already emits | DensityGauge already wired. |
| `titleWidth` | **Value vs range** | `{ px }` | ✅ already emits | DensityGauge already wired. |
| `images` | **Presence** | `{ count }` | 🔧 NEW extract (cheap) | research `imageCount` → `number`. Binary body; pill shows count e.g. `"3 images"`. |
| `externalLinks` | **Proportion / mix** | `{ total, follow }` | ✅ already emits | SegmentBar (dofollow/nofollow). |
| `internalLinks` | **Proportion / mix** | `{ total, follow }` | ✅ already emits | SegmentBar (dofollow/nofollow). |
| `singleH1` | **Presence** | none | ✅ no change | Exactly one H1 — binary. |

## Readability tab

| Check id | Assigned type | Engine data needed | Status | Notes |
|----------|---------------|--------------------|--------|-------|
| `subheadingsTooLong` | **Count + drill-down** | `{ items:[{left,right}] }` | 🔧 NEW extract | research `getSubheadingTextLengths` → `[{ subheading, text, countLength, index }]`; filter `countLength > 300` (assessment default — confirm), items = `{ left: subheading\|\|snippet, right: "N words" }`. |
| `textParagraphTooLong` | **Count + drill-down** | `{ paragraphs:[{left,right}] }` | ✅ already emits | DrillDown already wired. |
| `textSentenceLength` | **Value vs range** | `{ pct }` | ✅ already emits | % of long sentences — gauge. |
| `textTransitionWords` | **Value vs range** | `{ pct }` | ✅ already emits | % sentences w/ transition words — gauge. |
| `passiveVoice` | **Value vs range** | `{ pct }` | 🔧 NEW extract | research `getPassiveVoiceResult` → `{ total, passives: string[] }`; `pct = round(passives.length / total * 100)`. (Offender sentences also available in `passives` if you ever want drill-down instead.) |
| `sentenceBeginnings` | **Count + drill-down** | `{ items:[{left,right}] }` | 🔧 NEW extract | research `getSentenceBeginnings` → `[{ word, count, sentences[] }]`; filter `count >= 3` (assessment default — confirm), items = `{ left: word, right: "N×" }`. |
| `fleschReadingEase` | **Value vs range** | `{ score }` | ✅ now live (synthesized) | No Yoast assessment exists in this build (research-only). **Synthesized in `runAnalysis.ts`** from `getFleschReadingScore`; status via our `fleschToStatus` bands (≥60 good / ≥50 warn / else bad). DensityGauge. Verified: score 56.7 resolved on the fixture. |

---

## Summary of work implied by this mapping

- **No engine change, display only:** `textLength` (promote from pill to gauge).
- **Synthesized / registered in the engine (the checks Yoast doesn't emit by default):**
  `keyphraseDistribution` (registered on `SeoAssessor` via `addAssessment`),
  `fleschReadingEase` (synthesized in `runAnalysis` from `getFleschReadingScore`). Both verified live.
- **Dropped — unavailable for EN in this yoastseo build:** `wordComplexity` (assessment exists but
  its research isn't registered on the English researcher → never applicable).
- **New `extractCheckData` cases (research keys + shapes verified against `node_modules/yoastseo`
  build source — see appendix):** `keyphraseLength`, `subheadingsKeyword`, `textCompetingLinks`,
  `passiveVoice`, `sentenceBeginnings`, `subheadingsTooLong`, `images` (count).
- **Genuine Presence (correct as-is, not a bug):** `introductionKeyword`,
  `metaDescriptionKeyword`, `keyphraseInSEOTitle`, `slugKeyword`, `functionWordsInKeyphrase`,
  `images`, `singleH1`.
- **Already correct, just move config into the registry:** `keyphraseDensity`,
  `imageKeyphrase`, `externalLinks`, `internalLinks`, `metaDescriptionLength`, `titleWidth`,
  `textParagraphTooLong`, `textSentenceLength`, `textTransitionWords`, `keyphraseDistribution`.

## Resolved decisions

1. **`fleschReadingEase`** — ✅ synthesized as a check + DensityGauge (no Yoast assessment exists).
2. **`images`** — ✅ Presence body + count in pill (engine emits `{ count }`).
3. **Research keys** — ✅ verified. The probe script (`apps/dev/scripts/seo-engine-probe.mjs`) no
   longer exists in the repo, so instead I read the keys + return shapes directly from the
   installed `yoastseo` build (`AbstractResearcher.js` registration + each research file). This is
   the authoritative source for names/shapes (a probe only samples them). See appendix.

## Build order (after you verify the table above)

1. Run the probe → replace every ⟦VERIFY⟧ key with the confirmed name/shape; update this file.
2. `src/constants/checkIds.ts` — `CHECK_IDS` (grouped) + `CheckId`; remove `partition.ts` Sets.
3. `src/constants/checkDisplay.tsx` — `Record<CheckId, DisplayEntry>` registry + `<CheckViz>` dispatcher.
4. Extend `extractCheckData.ts` for the 6 (+`images` count) confirmed cases.
5. Replace per-tab `viz()`/`pill()` in the three tabs with `<CheckViz>`.
6. Tests: registry exhaustiveness, dispatcher fallback-to-presence, new extract cases.

## Appendix — verified research keys & shapes (yoastseo build)

Names registered in `node_modules/yoastseo/build/languageProcessing/AbstractResearcher.js`;
shapes read from each research's `return` statement. `getResearch(name)` is try/caught in
`researcherAdapter.ts` → unknown/throwing names yield `undefined` → Presence fallback (safe).

| `getResearch(name)` | Returns | Used by | Extract → `data` |
|---------------------|---------|---------|------------------|
| `keyphraseLength` | `{ keyphraseLength: number, functionWords }` | `keyphraseLength` | `{ words: r.keyphraseLength }` |
| `matchKeywordInSubheadings` | `{ count, matches, percentReflectingTopic, text, textLength }` | `subheadingsKeyword` | `{ matched: r.matches, total: r.count }` |
| `getAnchorsWithKeyphrase` | `{ anchorsWithKeyphrase: Node[], anchorsWithKeyphraseCount: number }` | `textCompetingLinks` | `{ count: r.anchorsWithKeyphraseCount, links: r.anchorsWithKeyphrase.map(a => a.innerText()) }` |
| `getPassiveVoiceResult` | `{ total: number, passives: string[] }` | `passiveVoice` | `{ pct: round(passives.length / total * 100) }` |
| `getSentenceBeginnings` | `[{ word: string, count: number, sentences: Sentence[] }]` | `sentenceBeginnings` | filter `count >= 3`; `{ items }` |
| `getSubheadingTextLengths` | `[{ subheading: string, text: string, countLength: number, index? }]` | `subheadingsTooLong` | filter `countLength > 300`; `{ items }` |
| `imageCount` | `number` | `images` | `{ count: r }` |

**Still to confirm at implement-time (assessment defaults, not research shapes):** the exact
offender thresholds for `subheadingsTooLong` (word cap) and `sentenceBeginnings` (consecutive
count) — read from the corresponding `*Assessment` config so the drill-down list matches status.

**Tree dependency:** `getAnchorsWithKeyphrase` and `getSentenceBeginnings` read `paper.getTree()`.
`getLinkStatistics` already works today, so the paper tree is populated — confirm in `buildInput.ts`.
