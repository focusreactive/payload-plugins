import KeyphraseLengthAssessment from "yoastseo/build/scoring/assessments/seo/KeyphraseLengthAssessment";
import { applyOverrides } from "./yoastConfig";
import type { YoastConfig } from "./yoastConfig";

export class ConfiguredKeyphraseLengthAssessment extends KeyphraseLengthAssessment {
  private readonly bounds: YoastConfig;

  constructor(bounds: YoastConfig, isRelatedKeyphrase: boolean) {
    super({ parameters: bounds, parametersNoFunctionWordSupport: bounds, isRelatedKeyphrase });
    this.bounds = bounds;
  }

  getCustomConfig(researcher: unknown): YoastConfig {
    return applyOverrides(super.getCustomConfig(researcher), { parameters: this.bounds });
  }
}
