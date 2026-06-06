"use client";

import type { ReactNode } from "react";
import { StatusPill } from "./StatusPill";
import { CHECK_ICONS } from "../../icons";
import type { CheckResult } from "../../../engine/types";

const LABELS: Record<string, { name: string; tip: string }> = {
  introductionKeyword: {
    name: "Keyphrase in introduction",
    tip: "Whether the focus keyphrase appears in the first paragraph.",
  },
  keyphraseDensity: {
    name: "Keyphrase density",
    tip: "Occurrences relative to total words. Ideal 0.5–2.5%.",
  },
  metaDescriptionKeyword: {
    name: "Keyphrase in meta description",
    tip: "Whether the keyphrase appears in the meta description.",
  },
  imageKeyphrase: {
    name: "Keyphrase in image alts",
    tip: "How many images reference the keyphrase in alt text.",
  },
  keyphraseDistribution: {
    name: "Keyphrase distribution",
    tip: "Where the keyphrase occurs across the document.",
  },
  keyphraseInSEOTitle: {
    name: "Keyphrase in SEO title",
    tip: "Whether the keyphrase is in the SEO title, and where.",
  },
  slugKeyword: {
    name: "Keyphrase in slug",
    tip: "Whether the keyphrase appears in the URL slug.",
  },
  keyphraseLength: {
    name: "Keyphrase length",
    tip: "Word count of the keyphrase itself.",
  },
  subheadingsKeyword: {
    name: "Keyphrase in subheadings",
    tip: "Whether subheadings (H2+) use the keyphrase.",
  },
  textCompetingLinks: {
    name: "Competing links",
    tip: "Links that use your keyphrase as anchor text.",
  },
  textLength: {
    name: "Total word count",
    tip: "Total words vs the recommended minimum (300).",
  },
  metaDescriptionLength: {
    name: "Meta description length",
    tip: "Ideal 120–158 characters.",
  },
  titleWidth: {
    name: "SEO title width",
    tip: "Pixel width; over ~580px truncates.",
  },
  images: { name: "Images", tip: "Whether the text contains images." },
  externalLinks: {
    name: "Outbound links",
    tip: "Follow / nofollow mix of outbound links.",
  },
  internalLinks: {
    name: "Internal links",
    tip: "Follow / nofollow mix of internal links.",
  },
  singleH1: {
    name: "Exactly one H1",
    tip: "There is one H1, correctly positioned.",
  },
  subheadingsTooLong: {
    name: "Subheading distribution",
    tip: "Long sections without a subheading.",
  },
  textParagraphTooLong: {
    name: "Paragraph length",
    tip: "Paragraphs over the recommended length.",
  },
  textSentenceLength: {
    name: "Sentence length",
    tip: "Share of sentences over the recommended length.",
  },
  textTransitionWords: {
    name: "Transition words",
    tip: "Share of sentences using transition words.",
  },
  passiveVoice: {
    name: "Passive voice",
    tip: "Share of sentences in passive voice.",
  },
  sentenceBeginnings: {
    name: "Consecutive sentences",
    tip: "Repetitive sentence beginnings.",
  },
};

interface CheckRowProps {
  check: CheckResult;
  pillLabel: ReactNode;
  children?: ReactNode;
}

export function CheckRow({ check, pillLabel, children }: CheckRowProps) {
  const meta = LABELS[check.id] ?? { name: check.id, tip: "" };
  const Icon = CHECK_ICONS[check.id] ?? CHECK_ICONS._default;

  return (
    <div className="crow" data-status={check.status}>
      <div className="chk-head">
        <span className="t-ico">
          <Icon size={15} />
        </span>

        <span className="t-name">
          <span className="tip" title={meta.tip}>
            {meta.name}
          </span>
        </span>

        <StatusPill status={check.status}>{pillLabel}</StatusPill>
      </div>

      {children}

      {check.recommendation && <div className="rec">{check.recommendation}</div>}
    </div>
  );
}
