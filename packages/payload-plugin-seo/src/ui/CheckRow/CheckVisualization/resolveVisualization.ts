import type { CheckResult } from "../../../engine/types/analysis";
import type { CheckId } from "../../../constants/checkIds";
import type { Visualization } from "./types";

const PRESENCE: Visualization = { type: "presence" };

const numericData = (c: CheckResult) => (c.data ?? {}) as Record<string, number>;

const drillDownItems = (c: CheckResult) => (c.data as { items?: { left: string; right: string }[] } | undefined)?.items;

const pluralize = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const getCheckResolver: Record<CheckId, (c: CheckResult) => Visualization> = {
  // Keyphrase
  introductionKeyword: () => PRESENCE,
  metaDescriptionKeyword: () => PRESENCE,
  keyphraseInSEOTitle: () => PRESENCE,
  slugKeyword: () => PRESENCE,
  functionWordsInKeyphrase: () => PRESENCE,
  keyphraseLength: (c) => {
    const { words } = numericData(c);
    if (words == null) return PRESENCE;

    return {
      type: "value-range",
      props: {
        bands: [
          { width: 12, status: "bad" },
          { width: 50, status: "good" },
          { width: 18, status: "warn" },
          { width: 20, status: "bad" },
        ],
        markerPct: Math.min(100, (words / 8) * 100),
        markerLabel: `${words}`,
        markerStatus: c.status,
        scale: ["0", "1–4 ideal", "8"],
      },
    };
  },
  keyphraseDensity: (c) => {
    const { densityPct, textLength } = numericData(c);

    if (densityPct == null) return PRESENCE;
    if (textLength != null && textLength < 100) return PRESENCE;

    return {
      type: "value-range",
      props: {
        bands: [
          { width: 8, status: "bad" },
          { width: 5, status: "warn" },
          { width: 54, status: "good" },
          { width: 5, status: "warn" },
          { width: 28, status: "bad" },
        ],
        markerPct: Math.min(100, (densityPct / 4) * 100),
        markerLabel: `${densityPct.toFixed(1)}%`,
        markerStatus: c.status,
        scale: ["0%", "ideal 0.5–2.5%", ">4%"],
      },
    };
  },
  subheadingsKeyword: (c) => {
    const { matched, total } = numericData(c);

    if (total == null) return PRESENCE;

    return {
      type: "proportion",
      props: {
        countLabel: `${matched ?? 0} / ${total}`,
        filledPct: total ? ((matched ?? 0) / total) * 100 : 0,
        filledStatus: c.status === "good" ? "good" : "warn",
      },
    };
  },
  textCompetingLinks: (c) => {
    const list = drillDownItems(c);
    if (!list?.length) return PRESENCE;

    return {
      type: "count-drilldown",
      props: {
        items: list,
        label: `Show ${pluralize(list.length, "link", "links")}`,
      },
    };
  },
  imageKeyphrase: (c) => {
    const { matched, total } = numericData(c);

    if (total == null) return PRESENCE;

    return {
      type: "proportion",
      props: {
        countLabel: `${matched ?? 0} / ${total}`,
        filledPct: total ? ((matched ?? 0) / total) * 100 : 0,
        filledStatus: "warn",
      },
    };
  },
  keyphraseDistribution: (c) => {
    const positions = (c.data as { positions?: number[] } | undefined)?.positions;

    if (!Array.isArray(positions) || !positions.length) return PRESENCE;

    return { type: "distribution", props: { positions } };
  },
  // On-page
  textLength: (c) => {
    const { words } = numericData(c);
    if (words == null) return PRESENCE;

    return {
      type: "value-range",
      props: {
        bands: [
          { width: 50, status: "bad" },
          { width: 50, status: "good" },
        ],
        markerPct: Math.min(100, (words / 600) * 100),
        markerLabel: `${words}`,
        markerStatus: c.status,
        scale: ["0", "≥300 good", "600"],
      },
    };
  },
  metaDescriptionLength: (c) => {
    const { chars } = numericData(c);

    if (chars == null) return PRESENCE;

    return {
      type: "value-range",
      props: {
        bands: [
          { width: 20, status: "bad" },
          { width: 8, status: "warn" },
          { width: 55, status: "good" },
          { width: 7, status: "warn" },
          { width: 10, status: "bad" },
        ],
        markerPct: Math.min(100, (chars / 180) * 100),
        markerLabel: `${chars}`,
        markerStatus: c.status,
        scale: ["0", "120–158 chars", "180"],
      },
    };
  },
  titleWidth: (c) => {
    const { px } = numericData(c);

    if (px == null) return PRESENCE;

    return {
      type: "value-range",
      props: {
        bands: [
          { width: 18, status: "bad" },
          { width: 8, status: "warn" },
          { width: 61, status: "good" },
          { width: 4, status: "warn" },
          { width: 9, status: "bad" },
        ],
        markerPct: Math.min(100, (px / 600) * 100),
        markerLabel: `${px}px`,
        markerStatus: c.status,
        scale: ["0", "fits ≤ 580px", "600"],
      },
    };
  },
  images: () => PRESENCE,
  externalLinks: (c) => {
    const { total, follow = 0 } = numericData(c);

    if (total == null) return PRESENCE;

    return {
      type: "proportion",
      props: {
        countLabel: `${follow} / ${total}`,
        filledPct: total ? (follow / total) * 100 : 0,
        filledStatus: c.status === "good" ? "good" : "warn",
        legend: [
          { tone: "good", label: `${follow} dofollow` },
          { tone: "muted", label: `${total - follow} nofollow` },
        ],
      },
    };
  },
  internalLinks: (c) => {
    const { total, follow = 0 } = numericData(c);

    if (total == null) return PRESENCE;

    return {
      type: "proportion",
      props: {
        countLabel: `${follow} / ${total}`,
        filledPct: total ? (follow / total) * 100 : 0,
        filledStatus: c.status === "good" ? "good" : "warn",
        legend: [
          { tone: "good", label: `${follow} dofollow` },
          { tone: "muted", label: `${total - follow} nofollow` },
        ],
      },
    };
  },
  singleH1: () => PRESENCE,
  // Readability
  subheadingsTooLong: (c) => {
    const list = drillDownItems(c);
    if (!list?.length) return PRESENCE;

    return {
      type: "count-drilldown",
      props: {
        items: list,
        label: `Show ${pluralize(list.length, "section", "sections")}`,
      },
    };
  },
  textParagraphTooLong: (c) => {
    const ps = (c.data as { paragraphs?: { left: string; right: string }[] } | undefined)?.paragraphs;
    if (!ps?.length) return PRESENCE;

    return {
      type: "count-drilldown",
      props: {
        items: ps,
        label: `Show ${pluralize(ps.length, "paragraph", "paragraphs")}`,
      },
    };
  },
  textSentenceLength: (c) => {
    const { pct } = numericData(c);
    if (pct == null) return PRESENCE;

    return {
      type: "value-range",
      props: {
        bands: [
          { width: 60, status: "good" },
          { width: 15, status: "warn" },
          { width: 25, status: "bad" },
        ],
        markerPct: Math.min(100, pct),
        markerLabel: `${pct}%`,
        markerStatus: c.status,
        scale: ["0%", "", "50%+"],
      },
    };
  },
  textTransitionWords: (c) => {
    const { pct } = numericData(c);
    if (pct == null) return PRESENCE;

    return {
      type: "value-range",
      props: {
        bands: [
          { width: 60, status: "good" },
          { width: 15, status: "warn" },
          { width: 25, status: "bad" },
        ],
        markerPct: Math.min(100, pct),
        markerLabel: `${pct}%`,
        markerStatus: c.status,
        scale: ["0%", "", "50%+"],
      },
    };
  },
  passiveVoice: (c) => {
    const { pct } = numericData(c);
    if (pct == null) return PRESENCE;

    return {
      type: "value-range",
      props: {
        bands: [
          { width: 33, status: "good" },
          { width: 17, status: "warn" },
          { width: 50, status: "bad" },
        ],
        markerPct: Math.min(100, (pct / 30) * 100),
        markerLabel: `${pct}%`,
        markerStatus: c.status,
        scale: ["0%", "≤10% ideal", "30%+"],
      },
    };
  },
  sentenceBeginnings: (c) => {
    const list = drillDownItems(c);
    if (!list?.length) return PRESENCE;
    return {
      type: "count-drilldown",
      props: {
        items: list,
        label: `Show ${pluralize(list.length, "group", "groups")}`,
      },
    };
  },
  fleschReadingEase: (c) => {
    const { score } = numericData(c);
    if (score == null) return PRESENCE;

    return {
      type: "value-range",
      props: {
        bands: [
          { width: 50, status: "bad" },
          { width: 10, status: "warn" },
          { width: 40, status: "good" },
        ],
        markerPct: Math.min(100, score),
        markerLabel: `${score}`,
        markerStatus: c.status,
        scale: ["0", "60+ easy", "100"],
      },
    };
  },
};

export function resolveVisualization(check: CheckResult): Visualization {
  const resolver = (getCheckResolver as Record<string, (c: CheckResult) => Visualization>)[check.id];

  return resolver ? resolver(check) : PRESENCE;
}
