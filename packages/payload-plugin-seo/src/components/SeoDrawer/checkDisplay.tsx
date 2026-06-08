"use client";

import type { ReactNode } from "react";
import type { CheckResult, Status } from "../../engine/types";
import type { CheckId } from "../../constants/checkIds";
import { DensityGauge } from "./parts/DensityGauge";
import type { Band } from "./parts/DensityGauge";
import { SegmentBar } from "./parts/SegmentBar";
import { DrillDown } from "./parts/DrillDown";
import { DistributionBar } from "./parts/DistributionBar";

type PillFn = (check: CheckResult) => ReactNode;

interface GaugeProps {
  bands: Band[];
  markerPct: number;
  markerLabel: string;
  markerColor: string;
  scale: [string, string, string];
}
interface SegmentProps {
  countLabel?: string;
  filledPct: number;
  filledColor: string;
  legend?: { color: string; label: string }[];
}
interface DrillProps {
  items: { left: string; right: string }[];
  label: string;
}
interface DistProps {
  positions: number[];
}

type DisplayEntry =
  | { type: "presence"; pill?: PillFn }
  | {
      type: "value-range";
      pill?: PillFn;
      toProps: (c: CheckResult) => GaugeProps | null;
    }
  | {
      type: "proportion";
      pill?: PillFn;
      toProps: (c: CheckResult) => SegmentProps | null;
    }
  | {
      type: "count-drilldown";
      pill?: PillFn;
      toProps: (c: CheckResult) => DrillProps | null;
    }
  | {
      type: "distribution";
      pill?: PillFn;
      toProps: (c: CheckResult) => DistProps | null;
    };

const num = (c: CheckResult) => (c.data ?? {}) as Record<string, number>;
const items = (c: CheckResult) => (c.data as { items?: { left: string; right: string }[] } | undefined)?.items;
const markerColor = (c: CheckResult) => `var(--seo-${c.status})`;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const CHECK_DISPLAY: Record<CheckId, DisplayEntry> = {
  // ── Keyphrase ──────────────────────────────────────────────────────────
  introductionKeyword: { type: "presence" },
  metaDescriptionKeyword: { type: "presence" },
  keyphraseInSEOTitle: { type: "presence" },
  slugKeyword: { type: "presence" },
  functionWordsInKeyphrase: { type: "presence" },
  singleH1: { type: "presence" },

  keyphraseLength: {
    type: "value-range",
    pill: (c) => {
      const { words } = num(c);
      return words != null ? plural(words, "word", "words") : undefined;
    },
    toProps: (c) => {
      const { words } = num(c);
      if (words == null) return null;
      return {
        bands: [
          { width: 12, color: "var(--seo-bad)" },
          { width: 50, color: "var(--seo-good)" },
          { width: 18, color: "var(--seo-warn)" },
          { width: 20, color: "var(--seo-bad)" },
        ],
        markerPct: Math.min(100, (words / 8) * 100),
        markerLabel: `${words}`,
        markerColor: markerColor(c),
        scale: ["0", "1–4 ideal", "8"],
      };
    },
  },

  keyphraseDensity: {
    type: "value-range",
    pill: (c) => {
      const { densityPct, textLength, count } = num(c);
      if (textLength != null && textLength < 100) {
        return count != null ? plural(count, "use", "uses") : undefined;
      }
      return densityPct != null ? `${densityPct.toFixed(1)}%` : undefined;
    },
    toProps: (c) => {
      const { densityPct, textLength } = num(c);
      if (densityPct == null) return null;
      // Under 100 words Yoast scores by count, not %; the 0–4% gauge would
      // contradict the (count-based) status, so suppress it and let the pill speak.
      if (textLength != null && textLength < 100) return null;
      return {
        bands: [
          { width: 8, color: "var(--seo-bad)" },
          { width: 5, color: "var(--seo-warn)" },
          { width: 54, color: "var(--seo-good)" },
          { width: 5, color: "var(--seo-warn)" },
          { width: 28, color: "var(--seo-bad)" },
        ],
        markerPct: Math.min(100, (densityPct / 4) * 100),
        markerLabel: `${densityPct.toFixed(1)}%`,
        markerColor: markerColor(c),
        scale: ["0%", "ideal 0.5–2.5%", ">4%"],
      };
    },
  },

  subheadingsKeyword: {
    type: "proportion",
    toProps: (c) => {
      const { matched, total } = num(c);
      if (total == null) return null;
      return {
        countLabel: `${matched ?? 0} / ${total}`,
        filledPct: total ? ((matched ?? 0) / total) * 100 : 0,
        filledColor: c.status === "good" ? "var(--seo-good)" : "var(--seo-warn)",
      };
    },
  },

  textCompetingLinks: {
    type: "count-drilldown",
    toProps: (c) => {
      const list = items(c);
      return list?.length ? { items: list, label: `Show ${plural(list.length, "link", "links")}` } : null;
    },
  },

  imageKeyphrase: {
    type: "proportion",
    toProps: (c) => {
      const { matched, total } = num(c);
      if (total == null) return null;
      return {
        countLabel: `${matched ?? 0} / ${total}`,
        filledPct: total ? ((matched ?? 0) / total) * 100 : 0,
        filledColor: "var(--seo-warn)",
      };
    },
  },

  keyphraseDistribution: {
    type: "distribution",
    toProps: (c) => {
      const positions = (c.data as { positions?: number[] } | undefined)?.positions;
      return Array.isArray(positions) && positions.length ? { positions } : null;
    },
  },

  // ── On-page ────────────────────────────────────────────────────────────
  textLength: {
    type: "value-range",
    pill: (c) => {
      const { words } = num(c);
      return words != null ? plural(words, "word", "words") : undefined;
    },
    toProps: (c) => {
      const { words } = num(c);
      if (words == null) return null;
      return {
        bands: [
          { width: 50, color: "var(--seo-bad)" },
          { width: 50, color: "var(--seo-good)" },
        ],
        markerPct: Math.min(100, (words / 600) * 100),
        markerLabel: `${words}`,
        markerColor: markerColor(c),
        scale: ["0", "≥300 good", "600"],
      };
    },
  },

  metaDescriptionLength: {
    type: "value-range",
    toProps: (c) => {
      const { chars } = num(c);
      if (chars == null) return null;
      return {
        bands: [
          { width: 20, color: "var(--seo-bad)" },
          { width: 8, color: "var(--seo-warn)" },
          { width: 55, color: "var(--seo-good)" },
          { width: 7, color: "var(--seo-warn)" },
          { width: 10, color: "var(--seo-bad)" },
        ],
        markerPct: Math.min(100, (chars / 180) * 100),
        markerLabel: `${chars}`,
        markerColor: markerColor(c),
        scale: ["0", "120–158 chars", "180"],
      };
    },
  },

  titleWidth: {
    type: "value-range",
    pill: (c) => {
      const { px } = num(c);
      return px != null ? `${px} px` : undefined;
    },
    toProps: (c) => {
      const { px } = num(c);
      if (px == null) return null;
      return {
        bands: [
          { width: 18, color: "var(--seo-bad)" },
          { width: 8, color: "var(--seo-warn)" },
          { width: 61, color: "var(--seo-good)" },
          { width: 4, color: "var(--seo-warn)" },
          { width: 9, color: "var(--seo-bad)" },
        ],
        markerPct: Math.min(100, (px / 600) * 100),
        markerLabel: `${px}px`,
        markerColor: markerColor(c),
        scale: ["0", "fits ≤ 580px", "600"],
      };
    },
  },

  images: {
    type: "presence",
    pill: (c) => {
      const { count } = num(c);
      return count != null ? plural(count, "image", "images") : undefined;
    },
  },

  externalLinks: {
    type: "proportion",
    pill: (c) => {
      const { total } = num(c);
      return total != null ? plural(total, "link", "links") : undefined;
    },
    toProps: (c) => {
      const { total, follow } = num(c);
      if (total == null) return null;
      const f = follow ?? 0;
      return {
        countLabel: `${f} / ${total}`,
        filledPct: total ? (f / total) * 100 : 0,
        filledColor: c.status === "good" ? "var(--seo-good)" : "var(--seo-warn)",
        legend: [
          { color: "var(--seo-good)", label: `${f} dofollow` },
          { color: "var(--seo-e300)", label: `${total - f} nofollow` },
        ],
      };
    },
  },

  internalLinks: {
    type: "proportion",
    pill: (c) => {
      const { total } = num(c);
      return total != null ? plural(total, "link", "links") : undefined;
    },
    toProps: (c) => {
      const { total, follow } = num(c);
      if (total == null) return null;
      const f = follow ?? 0;
      return {
        countLabel: `${f} / ${total}`,
        filledPct: total ? (f / total) * 100 : 0,
        filledColor: c.status === "good" ? "var(--seo-good)" : "var(--seo-warn)",
        legend: [
          { color: "var(--seo-good)", label: `${f} dofollow` },
          { color: "var(--seo-e300)", label: `${total - f} nofollow` },
        ],
      };
    },
  },

  // ── Readability ──────────────────────────────────────────────────────────
  subheadingsTooLong: {
    type: "count-drilldown",
    toProps: (c) => {
      const list = items(c);
      return list?.length
        ? {
            items: list,
            label: `Show ${plural(list.length, "section", "sections")}`,
          }
        : null;
    },
  },

  textParagraphTooLong: {
    type: "count-drilldown",
    toProps: (c) => {
      const ps = (c.data as { paragraphs?: { left: string; right: string }[] } | undefined)?.paragraphs;
      return ps?.length
        ? {
            items: ps,
            label: `Show ${plural(ps.length, "paragraph", "paragraphs")}`,
          }
        : null;
    },
  },

  textSentenceLength: {
    type: "value-range",
    toProps: (c) => {
      const { pct } = num(c);
      if (pct == null) return null;
      return {
        bands: [
          { width: 60, color: "var(--seo-good)" },
          { width: 15, color: "var(--seo-warn)" },
          { width: 25, color: "var(--seo-bad)" },
        ],
        markerPct: Math.min(100, pct),
        markerLabel: `${pct}%`,
        markerColor: markerColor(c),
        scale: ["0%", "", "50%+"],
      };
    },
  },

  textTransitionWords: {
    type: "value-range",
    toProps: (c) => {
      const { pct } = num(c);
      if (pct == null) return null;
      return {
        bands: [
          { width: 60, color: "var(--seo-good)" },
          { width: 15, color: "var(--seo-warn)" },
          { width: 25, color: "var(--seo-bad)" },
        ],
        markerPct: Math.min(100, pct),
        markerLabel: `${pct}%`,
        markerColor: markerColor(c),
        scale: ["0%", "", "50%+"],
      };
    },
  },

  passiveVoice: {
    type: "value-range",
    toProps: (c) => {
      const { pct } = num(c);
      if (pct == null) return null;
      return {
        bands: [
          { width: 33, color: "var(--seo-good)" },
          { width: 17, color: "var(--seo-warn)" },
          { width: 50, color: "var(--seo-bad)" },
        ],
        markerPct: Math.min(100, (pct / 30) * 100),
        markerLabel: `${pct}%`,
        markerColor: markerColor(c),
        scale: ["0%", "≤10% ideal", "30%+"],
      };
    },
  },

  sentenceBeginnings: {
    type: "count-drilldown",
    toProps: (c) => {
      const list = items(c);
      return list?.length
        ? {
            items: list,
            label: `Show ${plural(list.length, "group", "groups")}`,
          }
        : null;
    },
  },

  fleschReadingEase: {
    type: "value-range",
    toProps: (c) => {
      const { score } = num(c);
      if (score == null) return null;
      return {
        bands: [
          { width: 50, color: "var(--seo-bad)" },
          { width: 10, color: "var(--seo-warn)" },
          { width: 40, color: "var(--seo-good)" },
        ],
        markerPct: Math.min(100, score),
        markerLabel: `${score}`,
        markerColor: markerColor(c),
        scale: ["0", "60+ easy", "100"],
      };
    },
  },
};

const PRESENCE: DisplayEntry = { type: "presence" };

export function getDisplay(id: string): DisplayEntry {
  return (CHECK_DISPLAY as Record<string, DisplayEntry>)[id] ?? PRESENCE;
}

function defaultPill(status: Status): string {
  return status === "good" ? "Good" : status === "bad" ? "Problem" : "Needs work";
}

export function pillFor(check: CheckResult): ReactNode {
  const entry = getDisplay(check.id);
  return entry.pill?.(check) ?? defaultPill(check.status);
}

export function CheckViz({ check }: { check: CheckResult }) {
  const entry = getDisplay(check.id);
  switch (entry.type) {
    case "value-range": {
      const p = entry.toProps(check);
      return p ? <DensityGauge {...p} /> : null;
    }
    case "proportion": {
      const p = entry.toProps(check);
      return p ? <SegmentBar {...p} /> : null;
    }
    case "count-drilldown": {
      const p = entry.toProps(check);
      return p ? <DrillDown {...p} /> : null;
    }
    case "distribution": {
      const p = entry.toProps(check);
      return p ? <DistributionBar {...p} /> : null;
    }
    default:
      return null;
  }
}
