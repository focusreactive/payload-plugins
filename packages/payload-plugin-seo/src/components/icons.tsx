"use client";

import { AlignLeft, Crosshair, Mail, Link2, BarChart3, Type, ArrowRight, Image as ImageIcon, Heading1, Ruler, ListOrdered, Clock, FileText, Film } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type CheckIconsMap = Record<string, LucideIcon> & {
  _default: LucideIcon;
};

export const CHECK_ICONS: CheckIconsMap = {
  // keyphrase (SeoAssessor)
  introductionKeyword: AlignLeft,
  keyphraseLength: Crosshair,
  keyphraseDensity: Crosshair,
  metaDescriptionKeyword: Mail,
  subheadingsKeyword: Type,
  textCompetingLinks: Link2,
  imageKeyphrase: ImageIcon,
  keyphraseInSEOTitle: Type,
  slugKeyword: ArrowRight,
  keyphraseDistribution: BarChart3,
  // on-page (SeoAssessor)
  textLength: AlignLeft,
  metaDescriptionLength: Mail,
  titleWidth: Ruler,
  images: ImageIcon,
  externalLinks: Link2,
  internalLinks: Link2,
  singleH1: Heading1,
  // readability (ContentAssessor)
  fleschReadingEase: FileText,
  subheadingsTooLong: Heading1,
  textParagraphTooLong: AlignLeft,
  textSentenceLength: AlignLeft,
  textTransitionWords: ArrowRight,
  passiveVoice: FileText,
  sentenceBeginnings: AlignLeft,
  listPresence: ListOrdered,
  // vitals
  readingTime: Clock,
  videoCount: Film,
  _default: FileText,
};
