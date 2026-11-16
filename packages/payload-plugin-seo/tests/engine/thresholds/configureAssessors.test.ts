import { Paper, SeoAssessor } from "yoastseo";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SEO_THRESHOLDS } from "../../../src/constants";
import { makeResearcher } from "../../../src/engine/researcherAdapter";
import {
  configureReadabilityAssessor,
  configureRelatedKeyphraseAssessor,
  configureSeoAssessor,
} from "../../../src/engine/thresholds/configureAssessors";
import { resolveThresholds } from "../../../src/utils/config/resolveThresholds";

interface AssessmentResult {
  getIdentifier: () => string;
  getScore: () => number;
}

function titleWidthScore(titleWidth: number, maxTitleWidth?: number): number | undefined {
  const paper = new Paper("<p>Text.</p>", { title: "Title", titleWidth, locale: "en_US" });
  const assessor = new SeoAssessor(makeResearcher(paper));
  if (maxTitleWidth) {
    configureSeoAssessor(assessor, resolveThresholds({ titleWidth: { max: maxTitleWidth } }));
  }
  assessor.assess(paper);

  const results: AssessmentResult[] = assessor.getValidResults();
  return results.find((result) => result.getIdentifier() === "titleWidth")?.getScore();
}

describe("configureAssessors", () => {
  it("keeps the Yoast assessments when the thresholds are the defaults", () => {
    const addAssessment = vi.fn((_identifier: string, _assessment: unknown) => true);

    configureSeoAssessor({ addAssessment }, DEFAULT_SEO_THRESHOLDS);
    configureRelatedKeyphraseAssessor({ addAssessment }, DEFAULT_SEO_THRESHOLDS);
    configureReadabilityAssessor({ addAssessment }, DEFAULT_SEO_THRESHOLDS);

    expect(addAssessment).not.toHaveBeenCalled();
  });

  it("replaces only the assessments of configured checks", () => {
    const addAssessment = vi.fn((_identifier: string, _assessment: unknown) => true);

    configureSeoAssessor({ addAssessment }, resolveThresholds({ textLength: { min: 500 } }));

    expect(addAssessment.mock.calls.map(([identifier]) => identifier)).toEqual(["textLength"]);
  });

  it("scores the title width against the configured maximum", () => {
    expect(titleWidthScore(650)).toBe(3);
    expect(titleWidthScore(650, 700)).toBe(9);
    expect(titleWidthScore(300, 700)).toBe(9);
  });
});
