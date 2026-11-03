import type { Paper } from "yoastseo";
import { assessors } from "yoastseo";
import { scoreInclusive } from "../../inclusiveScore";
import type { InclusiveResult, RawInclusiveFlag } from "../../inclusiveScore";
import { makeResearcher } from "../../researcherAdapter";
import type { InclusiveCategoryId } from "../../types/analysis";

const { InclusiveLanguageAssessor } = assessors;

/** Yoast's category ids, in display order. The UI names them. */
const INCLUSIVE_CATEGORIES: InclusiveCategoryId[] = [
  "age",
  "appearance",
  "culture",
  "disability",
  "gender",
  "sexualOrientation",
  "ses",
  "other",
];

function categoryOf(yoastCategory: string | undefined): InclusiveCategoryId {
  return INCLUSIVE_CATEGORIES.find((id) => id === yoastCategory) ?? "other";
}

interface YoastInclusiveResult {
  getIdentifier?: () => string;
}

interface YoastFoundPhrase {
  phrase: string;
  sentence: string;
}

interface YoastInclusiveAssessment {
  category?: string;
  inclusiveAlternatives?: string[];
  foundPhrases?: YoastFoundPhrase[];
}

interface YoastInclusiveAssessor {
  assess: (paper: unknown) => void;
  getValidResults: () => YoastInclusiveResult[];
  getAssessment: (identifier: string) => YoastInclusiveAssessment | undefined;
}

export function deriveInclusive(paper: InstanceType<typeof Paper>): InclusiveResult {
  const assessor: YoastInclusiveAssessor = new InclusiveLanguageAssessor(makeResearcher(paper));
  assessor.assess(paper);

  return scoreInclusive(extractInclusiveFlags(assessor), INCLUSIVE_CATEGORIES);
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

function extractInclusiveFlags(assessor: YoastInclusiveAssessor): RawInclusiveFlag[] {
  return assessor.getValidResults().flatMap((result) => {
    const identifier = result.getIdentifier?.();
    if (!identifier) return [];

    const assessment = assessor.getAssessment(identifier);
    const phrases = assessment?.foundPhrases ?? [];
    if (phrases.length === 0) {
      return [];
    }

    const category = categoryOf(assessment?.category);
    const suggestion = (assessment?.inclusiveAlternatives ?? [])
      .map(stripTags)
      .filter(Boolean)
      .join(", ");

    return phrases.map((found) => ({
      category,
      term: found.phrase,
      suggestion,
      location: found.sentence,
    }));
  });
}
