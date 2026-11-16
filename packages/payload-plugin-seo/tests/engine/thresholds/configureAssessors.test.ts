import { Paper, SeoAssessor } from "yoastseo";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ensureLanguagePack } from "../../../src/components/SeoDrawer/languagePacks";
import { makeResearcher } from "../../../src/engine/researcherAdapter";
import {
  configureReadabilityAssessor,
  configureRelatedKeyphraseAssessor,
  configureSeoAssessor,
} from "../../../src/engine/thresholds/configureAssessors";
import type { SeoThresholds } from "../../../src/types/config";

interface AssessmentResult {
  getIdentifier: () => string;
  getScore: () => number;
}

type PaperAttributes = Record<string, unknown>;

function scoreOf(
  identifier: string,
  text: string,
  attributes: PaperAttributes,
  configured: SeoThresholds = {}
): number | undefined {
  const paper = new Paper(text, attributes);
  const assessor = new SeoAssessor(makeResearcher(paper));
  configureSeoAssessor(assessor, configured);
  assessor.assess(paper);

  const results: AssessmentResult[] = assessor.getValidResults();
  return results.find((result) => result.getIdentifier() === identifier)?.getScore();
}

const english = { title: "Title", locale: "en_US" };
const japanese = { title: "タイトル", locale: "ja_JP" };
const japaneseText = (characters: number) => `<p>${"あ".repeat(characters)}</p>`;

describe("configureAssessors", () => {
  beforeAll(async () => {
    await ensureLanguagePack("ja_JP", ["en", "ja"]);
  });

  it("keeps the Yoast assessments without configured thresholds", () => {
    const addAssessment = vi.fn((_identifier: string, _assessment: unknown) => true);

    configureSeoAssessor({ addAssessment }, {});
    configureRelatedKeyphraseAssessor({ addAssessment }, {});
    configureReadabilityAssessor({ addAssessment }, {});

    expect(addAssessment).not.toHaveBeenCalled();
  });

  it("replaces only the assessments of configured checks", () => {
    const addAssessment = vi.fn((_identifier: string, _assessment: unknown) => true);

    configureSeoAssessor({ addAssessment }, { textLength: { min: 500 } });

    expect(addAssessment.mock.calls.map(([identifier]) => identifier)).toEqual(["textLength"]);
  });

  it("scores the title width against the configured maximum", () => {
    const titleWidth = (width: number, configured?: SeoThresholds) =>
      scoreOf("titleWidth", "<p>Text.</p>", { ...english, titleWidth: width }, configured);

    expect(titleWidth(650)).toBe(3);
    expect(titleWidth(650, { titleWidth: { max: 700 } })).toBe(9);
    expect(titleWidth(300, { titleWidth: { max: 700 } })).toBe(9);
  });

  it("lets a configured number win over the language default", () => {
    const text = japaneseText(450);

    expect(scoreOf("textLength", text, japanese)).toBe(3);
    expect(scoreOf("textLength", text, japanese, { textLength: { min: 400 } })).toBe(9);
  });

  it("keeps the language default for a number that is not configured", () => {
    const text = japaneseText(450);

    expect(scoreOf("textLength", text, japanese, { textLength: { acceptableMin: 100 } })).toBe(6);
  });
});
