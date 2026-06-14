import { describe, expect, it } from "vitest";
import { extractCheckData } from "../../src/engine/extractCheckData";
import type { PaperLike } from "../../src/engine/types/paper";
import type { YoastResearcher } from "../../src/engine/researcherAdapter";

// Mirrors verified yoastseo@3.6.0 research return shapes.
function makeResearcher(map: Record<string, unknown>): YoastResearcher {
  return { getResearch: (name: string) => map[name] };
}

function makePaper(over: Partial<Record<keyof PaperLike, () => string>> = {}): PaperLike {
  return {
    getTitle: () => "Best Running Shoes for Trail",
    getText: () => "<p>Running shoes are great. Buy running shoes today.</p>",
    getKeyword: () => "running shoes",
    ...over,
  };
}

describe("extractCheckData", () => {
  // Task 1: keyphraseDensity + unknown id
  it("maps keyphraseDensity to densityPct, textLength and count", () => {
    const r = makeResearcher({ getKeyphraseDensity: { density: 1.8, textLength: 250 }, getKeyphraseCount: { count: 5 } });
    expect(extractCheckData("keyphraseDensity", makePaper(), r)).toEqual({ densityPct: 1.8, textLength: 250, count: 5 });
  });

  it("returns undefined for an unknown id", () => {
    expect(extractCheckData("slugKeyword", makePaper(), makeResearcher({}))).toBeUndefined();
  });

  // Task 2: imageKeyphrase + externalLinks / internalLinks
  it("maps altTagCount to total + matched images", () => {
    const r = makeResearcher({ altTagCount: { noAlt: 1, withAlt: 2, withAltKeyword: 3, withAltNonKeyword: 4 } });
    expect(extractCheckData("imageKeyphrase", makePaper(), r)).toEqual({ total: 10, matched: 3 });
  });

  it("maps getLinkStatistics to external follow/total", () => {
    const r = makeResearcher({
      getLinkStatistics: { externalTotal: 5, externalDofollow: 3, internalTotal: 8, internalDofollow: 6 },
    });
    expect(extractCheckData("externalLinks", makePaper(), r)).toEqual({ total: 5, follow: 3 });
  });

  it("maps getLinkStatistics to internal follow/total", () => {
    const r = makeResearcher({
      getLinkStatistics: { externalTotal: 5, externalDofollow: 3, internalTotal: 8, internalDofollow: 6 },
    });
    expect(extractCheckData("internalLinks", makePaper(), r)).toEqual({ total: 8, follow: 6 });
  });

  it("returns undefined when link research is missing", () => {
    expect(extractCheckData("externalLinks", makePaper(), makeResearcher({}))).toBeUndefined();
  });

  // Task 3: metaDescriptionLength + textLength + fleschReadingEase
  it("maps metaDescriptionLength to chars", () => {
    const r = makeResearcher({ metaDescriptionLength: 142 });
    expect(extractCheckData("metaDescriptionLength", makePaper(), r)).toEqual({ chars: 142 });
  });

  it("maps wordCountInText to words", () => {
    const r = makeResearcher({ wordCountInText: 530 });
    expect(extractCheckData("textLength", makePaper(), r)).toEqual({ words: 530 });
  });

  it("maps a valid Flesch score", () => {
    const r = makeResearcher({ getFleschReadingScore: { score: 64, difficulty: "okay" } });
    expect(extractCheckData("fleschReadingEase", makePaper(), r)).toEqual({ score: 64 });
  });

  it("omits an invalid Flesch score (-1)", () => {
    const r = makeResearcher({ getFleschReadingScore: { score: -1, difficulty: "noData" } });
    expect(extractCheckData("fleschReadingEase", makePaper(), r)).toBeUndefined();
  });

  // Task 4: titleWidth + textTransitionWords + textSentenceLength
  it("approximates titleWidth px through the title helper", () => {
    // "Best Running Shoes for Trail" = 28 chars; Node fallback = Math.round(28 * 8.5) = 238
    expect(extractCheckData("titleWidth", makePaper(), makeResearcher({}))).toEqual({ px: 238 });
  });

  it("returns undefined titleWidth when paper has no title accessor", () => {
    const paper = makePaper({ getTitle: undefined });
    expect(extractCheckData("titleWidth", paper, makeResearcher({}))).toBeUndefined();
  });

  it("derives transition-word percentage", () => {
    const r = makeResearcher({ findTransitionWords: { totalSentences: 8, transitionWordSentences: 2 } });
    expect(extractCheckData("textTransitionWords", makePaper(), r)).toEqual({ pct: 25 });
  });

  it("derives sentence-length percentage from the paper text", () => {
    // One short sentence, one 21-word (long, > 20) sentence => 1/2 = 50%.
    const longSentence = `${"word ".repeat(21).trim()}.`;
    const paper = makePaper({ getText: () => `<p>Short one. ${longSentence}</p>` });
    expect(extractCheckData("textSentenceLength", paper, makeResearcher({}))).toEqual({ pct: 50 });
  });

  it("emits a real { pct: 0 } for textSentenceLength when no sentence exceeds 20 words", () => {
    // Default makePaper text: "Running shoes are great." (4 words) + "Buy running shoes today." (4 words)
    // Neither exceeds MAX_SENTENCE_WORDS=20, so pct must be 0 — not undefined.
    expect(extractCheckData("textSentenceLength", makePaper(), makeResearcher({}))).toEqual({ pct: 0 });
  });

  it("returns undefined for textParagraphTooLong when getParagraphLength returns an empty array", () => {
    // Empty array [] means research ran but found no paragraphs — distinct from research missing (null/undefined).
    const r = makeResearcher({ getParagraphLength: [] });
    expect(extractCheckData("textParagraphTooLong", makePaper(), r)).toBeUndefined();
  });

  // Task 5: keyphraseDistribution + textParagraphTooLong
  it("recounts keyphrase positions as percentages through the document", () => {
    // 4 sentences; keyphrase "running shoes" in sentences 0 and 2.
    // midpoints: (0+0.5)/4=12.5→13 ; (2+0.5)/4=62.5→63
    const paper = makePaper({
      getText: () => "<p>Running shoes rock. Nothing here. Buy running shoes now. The end.</p>",
      getKeyword: () => "running shoes",
    });
    expect(extractCheckData("keyphraseDistribution", paper, makeResearcher({}))).toEqual({ positions: [13, 63] });
  });

  it("returns undefined distribution when the keyphrase never appears", () => {
    const paper = makePaper({ getText: () => "<p>Nothing relevant here at all.</p>", getKeyword: () => "running shoes" });
    expect(extractCheckData("keyphraseDistribution", paper, makeResearcher({}))).toBeUndefined();
  });

  it("lists only over-long paragraphs with snippet + word count", () => {
    const r = makeResearcher({
      getParagraphLength: [
        { paragraph: { innerText: () => "A short paragraph." }, paragraphLength: 3 },
        { paragraph: { innerText: () => "This paragraph is far too long and rambles on well past the recommended limit." }, paragraphLength: 210 },
      ],
    });
    expect(extractCheckData("textParagraphTooLong", makePaper(), r)).toEqual({
      paragraphs: [{ left: "This paragraph is far too long and rambles on well past the rec…", right: "210 words" }],
    });
  });

  it("returns undefined when no paragraph is over-long", () => {
    const r = makeResearcher({ getParagraphLength: [{ paragraph: { innerText: () => "Short." }, paragraphLength: 1 }] });
    expect(extractCheckData("textParagraphTooLong", makePaper(), r)).toBeUndefined();
  });

  // ── New richer-type extractions ─────────────────────────────────────────
  it("maps keyphraseLength research to word count", () => {
    const r = makeResearcher({ keyphraseLength: { keyphraseLength: 2, functionWords: [] } });
    expect(extractCheckData("keyphraseLength", makePaper(), r)).toEqual({ words: 2 });
  });

  it("maps matchKeywordInSubheadings to matched/total", () => {
    const r = makeResearcher({ matchKeywordInSubheadings: { count: 4, matches: 1, percentReflectingTopic: 25 } });
    expect(extractCheckData("subheadingsKeyword", makePaper(), r)).toEqual({ matched: 1, total: 4 });
  });

  it("emits a real { matched: 0, total: 0 } for subheadingsKeyword when there are no subheadings", () => {
    // count 0 means the research ran but found no H2/H3 — distinct from research missing.
    // Emit data so the proportion bar renders (parity with imageKeyphrase) instead of degrading to presence.
    const r = makeResearcher({ matchKeywordInSubheadings: { count: 0, matches: 0, percentReflectingTopic: 0 } });
    expect(extractCheckData("subheadingsKeyword", makePaper(), r)).toEqual({ matched: 0, total: 0 });
  });

  it("returns undefined for subheadingsKeyword when the research is missing", () => {
    expect(extractCheckData("subheadingsKeyword", makePaper(), makeResearcher({}))).toBeUndefined();
  });

  it("maps getAnchorsWithKeyphrase to drill-down items", () => {
    const r = makeResearcher({
      getAnchorsWithKeyphrase: {
        anchorsWithKeyphraseCount: 2,
        anchorsWithKeyphrase: [{ innerText: () => "running shoes" }, { innerText: () => "best running shoes guide" }],
      },
    });
    expect(extractCheckData("textCompetingLinks", makePaper(), r)).toEqual({
      items: [
        { left: "running shoes", right: "competing" },
        { left: "best running shoes guide", right: "competing" },
      ],
    });
  });

  it("returns undefined competing links when count is zero", () => {
    const r = makeResearcher({ getAnchorsWithKeyphrase: { anchorsWithKeyphraseCount: 0, anchorsWithKeyphrase: [] } });
    expect(extractCheckData("textCompetingLinks", makePaper(), r)).toBeUndefined();
  });

  it("derives passive-voice percentage", () => {
    const r = makeResearcher({ getPassiveVoiceResult: { total: 8, passives: ["a", "b"] } });
    expect(extractCheckData("passiveVoice", makePaper(), r)).toEqual({ pct: 25 });
  });

  it("returns undefined passiveVoice when there are no sentences", () => {
    const r = makeResearcher({ getPassiveVoiceResult: { total: 0, passives: [] } });
    expect(extractCheckData("passiveVoice", makePaper(), r)).toBeUndefined();
  });

  it("lists only groups of 3+ consecutive sentence beginnings", () => {
    const r = makeResearcher({
      getSentenceBeginnings: [
        { word: "the", count: 3, sentences: [] },
        { word: "a", count: 2, sentences: [] },
        { word: "running", count: 4, sentences: [] },
      ],
    });
    expect(extractCheckData("sentenceBeginnings", makePaper(), r)).toEqual({
      items: [
        { left: "the", right: "3×" },
        { left: "running", right: "4×" },
      ],
    });
  });

  it("returns undefined sentenceBeginnings when nothing repeats 3+ times", () => {
    const r = makeResearcher({ getSentenceBeginnings: [{ word: "the", count: 2, sentences: [] }] });
    expect(extractCheckData("sentenceBeginnings", makePaper(), r)).toBeUndefined();
  });

  it("lists subheading sections longer than 300 words with a label", () => {
    const r = makeResearcher({
      getSubheadingTextLengths: [
        { subheading: "Intro", text: "short", countLength: 120 },
        { subheading: "Body", text: "long...", countLength: 410 },
        { subheading: "", text: "preamble before first heading that is very long", countLength: 350 },
      ],
    });
    expect(extractCheckData("subheadingsTooLong", makePaper(), r)).toEqual({
      items: [
        { left: "Body", right: "410 words" },
        { left: "preamble before first heading that is very long", right: "350 words" },
      ],
    });
  });

  it("returns undefined subheadingsTooLong when all sections are within range", () => {
    const r = makeResearcher({ getSubheadingTextLengths: [{ subheading: "Intro", text: "ok", countLength: 120 }] });
    expect(extractCheckData("subheadingsTooLong", makePaper(), r)).toBeUndefined();
  });

  it("maps imageCount to a count", () => {
    expect(extractCheckData("images", makePaper(), makeResearcher({ imageCount: 3 }))).toEqual({ count: 3 });
  });
});
