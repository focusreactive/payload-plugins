"use client";

import { StatusPill } from "./StatusPill";
import { CHECK_ICONS } from "../components/icons";
import { CheckViz, pillFor } from "../components/SeoDrawer/checkDisplay";
import type { CheckResult } from "../engine/types/analysis";
import { cn, ROW_SEPARATOR } from "../utils/style";

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
  functionWordsInKeyphrase: {
    name: "Function words in keyphrase",
    tip: "Your keyphrase is made up only of function words.",
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
  fleschReadingEase: {
    name: "Reading ease",
    tip: "Flesch Reading Ease (0–100); higher is easier. Aim for 60+.",
  },
};

interface CheckRowProps {
  check: CheckResult;
}

export function CheckRow({ check }: CheckRowProps) {
  const meta = LABELS[check.id] ?? { name: check.id, tip: "" };
  const Icon = CHECK_ICONS[check.id] ?? CHECK_ICONS._default;

  return (
    <div className={cn("relative px-[15px] py-[13px] overflow-visible", ROW_SEPARATOR)} data-status={check.status}>
      <div className="flex items-center gap-[9px]">
        <span className="w-[26px] h-[26px] rounded-rs bg-neutral-100 text-neutral-600 grid place-items-center flex-none [&_svg]:size-[15px]">
          <Icon size={15} />
        </span>

        <span className="flex-1 font-semibold text-[12.5px]">
          <span className="border-0 border-b border-dotted border-neutral-400 cursor-help" title={meta.tip}>
            {meta.name}
          </span>
        </span>

        <StatusPill status={check.status}>{pillFor(check)}</StatusPill>
      </div>

      <CheckViz check={check} />

      {check.recommendation && <div className="text-neutral-600 text-[11.5px] mt-[7px]">{check.recommendation}</div>}
    </div>
  );
}
