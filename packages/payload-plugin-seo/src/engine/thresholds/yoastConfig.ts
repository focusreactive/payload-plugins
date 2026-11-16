export type YoastConfig = Record<string, unknown>;

type ConfigAdjustment = (config: YoastConfig) => YoastConfig;

function isRecord(value: unknown): value is YoastConfig {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function applyOverrides(config: YoastConfig, overrides: YoastConfig): YoastConfig {
  for (const [key, value] of Object.entries(overrides)) {
    const current = config[key];
    if (isRecord(current) && isRecord(value)) {
      applyOverrides(current, value);
    } else {
      config[key] = value;
    }
  }

  return config;
}

export function adjustLanguageConfig<Assessment extends Record<string, unknown>>(
  assessment: Assessment,
  languageConfigMethod: string,
  adjust: ConfigAdjustment
): Assessment {
  const languageConfig = assessment[languageConfigMethod];
  if (typeof languageConfig !== "function") return assessment;

  return Object.assign(assessment, {
    [languageConfigMethod]: (...args: unknown[]) => adjust(languageConfig.apply(assessment, args)),
  });
}
