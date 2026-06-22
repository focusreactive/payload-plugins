# Captured Yoast assessment identifiers (yoastseo@3.6.0)

**Captured:** 2026-06-04 · **Source:** `apps/dev/scripts/seo-engine-probe.mjs` (Task 0.4), run under Node 22.

This file is the **authority** for every `⟦VERIFY-0.4⟧` marker in the plan / Phase 2 code.
The values below come from the real engine, not the plan's guesses.

> **API note (from Task 0.3):** the assessors are `SeoAssessor`, `ContentAssessor`,
> and `assessors.InclusiveLanguageAssessor`. There is **no** top-level `Researcher` export —
> use `import EnglishResearcher from "yoastseo/build/languageProcessing/languages/en/Researcher"`
> (default export) and construct `new SeoAssessor(new EnglishResearcher(paper))`.

## Raw probe output (verbatim)

```
=== SEO (16 results) ===
introductionKeyword	score=9	Keyphrase in introduction: Well done!
keyphraseLength	score=9	Keyphrase length: Good job!
keyphraseDensity	score=-10	Keyphrase density: The keyphrase was found 3 times. That's more than t
metaDescriptionKeyword	score=9	Keyphrase in meta description: Keyphrase or synonym appear in the meta
metaDescriptionLength	score=9	Meta description length: Well done!
subheadingsKeyword	score=3	Keyphrase in subheading: Use more keyphrases or synonyms in your H2 an
textCompetingLinks	score=8	Competing links: There are no links which use your keyphrase or synony
imageKeyphrase	score=9	Keyphrase in image alt attributes: Good job!
images	score=9	Images: Good job!
textLength	score=-10	Text length: The text contains 106 words. This is far below the recomm
externalLinks	score=7	Outbound links: All outbound links on this page are nofollowed. Add so
keyphraseInSEOTitle	score=9	Keyphrase in SEO title: The exact match of the focus keyphrase appears
internalLinks	score=9	Internal links: You have enough internal links. Good job!
titleWidth	score=1	SEO title width: Please create an SEO title.
slugKeyword	score=9	Keyphrase in slug: Great work!
singleH1	score=8	Single title: You don't have multiple H1 headings, well done!

=== Content (6 results) ===
subheadingsTooLong	score=9	Subheading distribution: Great job!
textParagraphTooLong	score=9	Paragraph length: There are no paragraphs that are too long. Great job
textSentenceLength	score=9	Sentence length: Great!
textTransitionWords	score=9	Transition words: Well done!
passiveVoice	score=9	Passive voice: You are not using too much passive voice. That's great!
sentenceBeginnings	score=9	Consecutive sentences: There are no repetitive sentence beginnings. Th

=== InclusiveLanguage (2 results) ===
crazy	score=3	Avoid using crazy as it is potentially harmful. Consider using an alte
whitelist	score=3	Avoid using whitelist as it is potentially harmful. Consider using an

=== distinct scores observed ===
-10, 1, 3, 7, 8, 9
```

## Score scale → status (authoritative)

From yoast's own interpreter `build/scoring/interpreters/scoreToRating.js` (the source of truth, not the sample above):

| Raw score        | Yoast rating | Our `Status` (D-spec) |
| ---------------- | ------------ | --------------------- |
| `-1`             | `error`      | treat as `bad`        |
| `0`              | `feedback`   | treat as `bad` (no data / N/A) |
| `<= 4` (incl. negatives like -10/-20, and 1, 3, 4) | `bad` | `bad` |
| `> 4 && <= 7` (5, 6, 7) | `ok`  | `warn` |
| `> 7` (8, 9)     | `good`       | `good`                |

```js
// scoreToRating(score):
//   score === -1 -> "error"
//   score === 0  -> "feedback"
//   score <= 4   -> "bad"
//   4 < score <= 7 -> "ok"
//   score > 7    -> "good"
```

### ⚠ Reconciliation for Phase 2 `engine/scoreStatus.ts` (`⟦VERIFY-0.4⟧`)

The plan's draft used `score >= 7 → good; >= 5 → warn; else bad`. **That is wrong** against the real engine:

- Score **7** is `ok`/**warn**, not good (`> 7`, not `>= 7`).
- The "warn" band is `> 4 && <= 7`, not `>= 5`.
- Negative scores and `0` must resolve to **bad** (`<= 4` already covers negatives; `0` is `feedback` → treat as bad/neutral).

Corrected `scoreToStatus`:

```ts
export function scoreToStatus(score: number): Status {
  if (score > 7) return "good";          // 8, 9
  if (score > 4 && score <= 7) return "warn"; // 5, 6, 7
  return "bad";                           // <= 4, incl. 0 and negatives
}
```

## Identifier sets (for `src/constants/partition.ts`, `⟦VERIFY-0.4⟧`)

### SEO assessor (`SeoAssessor`) — 16 identifiers observed

```
introductionKeyword, keyphraseLength, keyphraseDensity, metaDescriptionKeyword,
metaDescriptionLength, subheadingsKeyword, textCompetingLinks, imageKeyphrase,
images, textLength, externalLinks, keyphraseInSEOTitle, internalLinks,
titleWidth, slugKeyword, singleH1
```

**Corrections vs. the plan's `partition.ts` guesses:**

- `keyphraseDensity` — plan guessed `keywordDensity`. ❌ use `keyphraseDensity`.
- `slugKeyword` — plan guessed `urlKeyword`. ❌ use `slugKeyword`.
- `images` — plan listed `images` in ON-PAGE and also guessed `imageAltTags`; the real ids are `images` + `imageKeyphrase` (no `imageAltTags`).
- `singleH1` ✓, `titleWidth` ✓, `textLength` ✓, `metaDescriptionLength` ✓, `internalLinks` ✓, `externalLinks` ✓ all confirmed.
- Plan-guessed ids NOT present in this run: `keyphraseInImageAltTags`/`imageAltTags`, `urlKeyword`, `keyphraseDistribution`, `functionWordsInKeyphrase`, `titleKeyword`. (`functionWordsInKeyphrase` / `keyphraseDistribution` may surface only with multi-word/long keyphrases — re-probe if needed.)

Suggested partition (design's two SEO tabs):

- **Keyphrase tab:** `introductionKeyword`, `keyphraseLength`, `keyphraseDensity`, `metaDescriptionKeyword`, `subheadingsKeyword`, `textCompetingLinks`, `imageKeyphrase`, `keyphraseInSEOTitle`, `slugKeyword`
- **On-page tab:** `textLength`, `metaDescriptionLength`, `titleWidth`, `images`, `externalLinks`, `internalLinks`, `singleH1`

### Content assessor (`ContentAssessor`) — 6 identifiers observed

```
subheadingsTooLong, textParagraphTooLong, textSentenceLength,
textTransitionWords, passiveVoice, sentenceBeginnings
```

> Note: `fleschReadingEase` and `wordComplexity` did **not** appear on this sample. The earlier
> guess that they "surface on longer content" was **wrong** — verified against the build source
> (2026-06-08): the default `ContentAssessor` registers only 7 assessments (none of them these
> two). `fleschReadingEase` has **no assessment class at all** in this version (research-only —
> we now synthesize the check in `runAnalysis`). `wordComplexity`'s assessment exists but its
> research is **not registered on the English researcher**, so `isApplicable` is always false →
> dropped. Still treat the readability id list as open, but not because of these two.

### Inclusive language assessor (`InclusiveLanguageAssessor`)

Identifiers are the **flagged term keys themselves**, not a fixed list — e.g. `crazy`, `whitelist` (each score `3` = bad). The set is unbounded (depends on which non-inclusive terms appear). The UI must group these by the assessment's category rather than enumerate ids. Re-probe with text containing target terms to see category grouping.
