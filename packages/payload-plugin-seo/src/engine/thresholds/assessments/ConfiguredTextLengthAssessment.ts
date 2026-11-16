import TextLengthAssessment from "yoastseo/build/scoring/assessments/seo/TextLengthAssessment";
import { applyOverrides } from "./yoastConfig";
import type { YoastConfig } from "./yoastConfig";

function keepBelowBandsUnder(config: YoastConfig): YoastConfig {
  const slightlyBelow = Number(config.slightlyBelowMinimum);
  const below = Math.min(Number(config.belowMinimum), slightlyBelow);

  return applyOverrides(config, {
    belowMinimum: below,
    veryFarBelowMinimum: Math.min(Number(config.veryFarBelowMinimum), below),
  });
}

export class ConfiguredTextLengthAssessment extends TextLengthAssessment {
  private readonly bands: YoastConfig;

  constructor(bands: YoastConfig) {
    super(bands);
    this.bands = bands;
    keepBelowBandsUnder(this._config);
  }

  getLanguageSpecificConfig(researcher: unknown): YoastConfig {
    return keepBelowBandsUnder(
      applyOverrides(super.getLanguageSpecificConfig(researcher), this.bands)
    );
  }
}
