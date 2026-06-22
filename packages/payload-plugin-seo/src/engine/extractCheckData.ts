import { getResearch } from "./researcherAdapter";
import type { YoastResearcher } from "./researcherAdapter";
import { getTitleProgressGuarded } from "./helpers/title-progress";
import type { PaperLike } from "./types/paper";

const MAX_SENTENCE_WORDS = 20;
const MAX_PARAGRAPH_WORDS = 150;
const SNIPPET_MAX = 64;

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/gu, " ");
}

function splitSentences(text: string): string[] {
  return stripHtml(text)
    .split(/[.!?]+/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

function sentenceLengthPct(text: string): { pct: number } | undefined {
  const sentences = splitSentences(text);
  if (!sentences.length) return undefined;
  const long = sentences.filter(
    (s) => s.split(/\s+/u).filter(Boolean).length > MAX_SENTENCE_WORDS
  ).length;
  return { pct: Math.round((long / sentences.length) * 100) };
}

function keyphrasePositions(text: string, keyphrase: string): number[] {
  const kp = keyphrase.trim().toLowerCase();
  if (!kp) return [];
  const sentences = splitSentences(text);
  const n = sentences.length;
  if (!n) return [];
  const positions: number[] = [];
  sentences.forEach((s, i) => {
    if (s.toLowerCase().includes(kp)) positions.push(Math.round(((i + 0.5) / n) * 100));
  });
  return positions;
}

function snippet(text: string): string {
  const t = text.trim();
  return t.length > SNIPPET_MAX ? `${t.slice(0, SNIPPET_MAX - 1)}…` : t;
}

export function extractCheckData(
  id: string,
  paper: PaperLike,
  researcher: YoastResearcher
): Record<string, unknown> | undefined {
  switch (id) {
    case "keyphraseDensity": {
      const r = getResearch<{ density: number }>(researcher, "getKeyphraseDensity");
      return r ? { densityPct: r.density } : undefined;
    }
    case "imageKeyphrase": {
      const r = getResearch<{
        noAlt: number;
        withAlt: number;
        withAltKeyword: number;
        withAltNonKeyword: number;
      }>(researcher, "altTagCount");
      if (!r) return undefined;
      const total = r.noAlt + r.withAlt + r.withAltKeyword + r.withAltNonKeyword;
      return { total, matched: r.withAltKeyword };
    }
    case "externalLinks":
    case "internalLinks": {
      const s = getResearch<{
        externalTotal: number;
        externalDofollow: number;
        internalTotal: number;
        internalDofollow: number;
      }>(researcher, "getLinkStatistics");
      if (!s) return undefined;
      return id === "externalLinks"
        ? { total: s.externalTotal, follow: s.externalDofollow }
        : { total: s.internalTotal, follow: s.internalDofollow };
    }
    case "metaDescriptionLength": {
      const chars = getResearch<number>(researcher, "metaDescriptionLength");
      return typeof chars === "number" ? { chars } : undefined;
    }
    case "textLength": {
      const wc = getResearch<number | { count?: number }>(researcher, "wordCountInText");
      const words = typeof wc === "number" ? wc : wc?.count;
      return typeof words === "number" ? { words } : undefined;
    }
    case "fleschReadingEase": {
      const r = getResearch<{ score: number }>(researcher, "getFleschReadingScore");
      return r && r.score >= 0 ? { score: r.score } : undefined;
    }
    case "titleWidth": {
      const title = paper.getTitle?.() ?? "";
      return title ? { px: getTitleProgressGuarded(title).actual } : undefined;
    }
    case "textTransitionWords": {
      const r = getResearch<{
        totalSentences: number;
        transitionWordSentences: number;
      }>(researcher, "findTransitionWords");
      if (!r || !r.totalSentences) return undefined;
      return {
        pct: Math.round((r.transitionWordSentences / r.totalSentences) * 100),
      };
    }
    case "textSentenceLength":
      return sentenceLengthPct(paper.getText?.() ?? "");
    case "keyphraseDistribution": {
      const positions = keyphrasePositions(paper.getText?.() ?? "", paper.getKeyword?.() ?? "");
      return positions.length ? { positions } : undefined;
    }
    case "textParagraphTooLong": {
      const ps = getResearch<{ paragraph: { innerText: () => string }; paragraphLength: number }[]>(
        researcher,
        "getParagraphLength"
      );
      if (!ps) return undefined;
      const long = ps.filter((p) => p.paragraphLength > MAX_PARAGRAPH_WORDS);
      if (!long.length) return undefined;
      return {
        paragraphs: long.map((p) => ({
          // oxlint-disable-next-line unicorn/prefer-dom-node-text-content -- Yoast tree node, not a DOM node; only innerText() exists
          left: snippet(p.paragraph.innerText()),
          right: `${p.paragraphLength} words`,
        })),
      };
    }
    case "keyphraseLength": {
      const r = getResearch<{ keyphraseLength: number }>(researcher, "keyphraseLength");
      return typeof r?.keyphraseLength === "number" ? { words: r.keyphraseLength } : undefined;
    }
    case "subheadingsKeyword": {
      const r = getResearch<{ count: number; matches: number }>(
        researcher,
        "matchKeywordInSubheadings"
      );
      return r && r.count > 0 ? { matched: r.matches, total: r.count } : undefined;
    }
    case "textCompetingLinks": {
      const r = getResearch<{
        anchorsWithKeyphrase: { innerText: () => string }[];
        anchorsWithKeyphraseCount: number;
      }>(researcher, "getAnchorsWithKeyphrase");
      if (!r || !r.anchorsWithKeyphraseCount) return undefined;
      return {
        items: r.anchorsWithKeyphrase.map((a) => ({
          // oxlint-disable-next-line unicorn/prefer-dom-node-text-content -- Yoast tree node, not a DOM node; only innerText() exists
          left: snippet(a.innerText()),
          right: "competing",
        })),
      };
    }
    case "passiveVoice": {
      const r = getResearch<{ total: number; passives: string[] }>(
        researcher,
        "getPassiveVoiceResult"
      );
      if (!r || !r.total) return undefined;
      return { pct: Math.round((r.passives.length / r.total) * 100) };
    }
    case "sentenceBeginnings": {
      const r = getResearch<{ word: string; count: number }[]>(researcher, "getSentenceBeginnings");
      if (!Array.isArray(r)) return undefined;
      const repeats = r.filter((g) => g.count >= 3);
      return repeats.length
        ? {
            items: repeats.map((g) => ({ left: g.word, right: `${g.count}×` })),
          }
        : undefined;
    }
    case "subheadingsTooLong": {
      const r = getResearch<{ subheading: string; text: string; countLength: number }[]>(
        researcher,
        "getSubheadingTextLengths"
      );
      if (!Array.isArray(r)) return undefined;
      const long = r.filter((s) => s.countLength > 300);
      return long.length
        ? {
            items: long.map((s) => ({
              left: s.subheading || snippet(s.text),
              right: `${s.countLength} words`,
            })),
          }
        : undefined;
    }
    case "images": {
      const n = getResearch<number>(researcher, "imageCount");
      return typeof n === "number" ? { count: n } : undefined;
    }
    default:
      return undefined;
  }
}
