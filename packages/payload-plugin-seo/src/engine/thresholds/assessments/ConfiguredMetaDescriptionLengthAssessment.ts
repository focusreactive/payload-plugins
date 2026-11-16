import MetaDescriptionLengthAssessment from "yoastseo/build/scoring/assessments/seo/MetaDescriptionLengthAssessment";
import { applyOverrides } from "./yoastConfig";
import type { YoastConfig } from "./yoastConfig";

export class ConfiguredMetaDescriptionLengthAssessment extends MetaDescriptionLengthAssessment {
  private readonly lengths: YoastConfig;

  constructor(lengths: YoastConfig) {
    super(lengths);
    this.lengths = lengths;
  }

  getConfig(locale: unknown): YoastConfig {
    return applyOverrides(super.getConfig(locale), this.lengths);
  }
}
