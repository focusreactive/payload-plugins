import type { Paper } from "yoastseo";
import { assessors } from "yoastseo";
import { scoreInclusive } from "../../inclusiveScore";
import type { InclusiveResult, RawInclusiveFlag } from "../../inclusiveScore";
import { makeResearcher } from "../../researcherAdapter";

const { InclusiveLanguageAssessor } = assessors;

const CATEGORY_LABELS: Record<string, string> = {
  age: "Age",
  appearance: "Appearance & body",
  culture: "Culture, race & religion",
  disability: "Disability",
  gender: "Gendered language",
  sexualOrientation: "Sexual orientation",
  ses: "Socioeconomic status",
  other: "Other",
};

const INCLUSIVE_CATEGORIES = Object.values(CATEGORY_LABELS);

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

    const category = CATEGORY_LABELS[assessment?.category ?? ""] ?? "Other";
    const suggestion = (assessment?.inclusiveAlternatives ?? []).map(stripTags).filter(Boolean).join(", ");

    return phrases.map((found) => ({
      category,
      term: found.phrase,
      suggestion,
      location: found.sentence,
    }));
  });
}
