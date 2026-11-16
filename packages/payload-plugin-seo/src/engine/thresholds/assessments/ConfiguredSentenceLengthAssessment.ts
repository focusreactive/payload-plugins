import SentenceLengthInTextAssessment from "yoastseo/build/scoring/assessments/readability/SentenceLengthInTextAssessment";
import { applyOverrides } from "./yoastConfig";
import type { YoastConfig } from "./yoastConfig";

export class ConfiguredSentenceLengthAssessment extends SentenceLengthInTextAssessment {
  private readonly bands: YoastConfig;

  constructor(bands: YoastConfig) {
    super(bands);
    this.bands = bands;
  }

  getLanguageSpecificConfig(researcher: unknown): YoastConfig {
    return applyOverrides(super.getLanguageSpecificConfig(researcher), this.bands);
  }
}
