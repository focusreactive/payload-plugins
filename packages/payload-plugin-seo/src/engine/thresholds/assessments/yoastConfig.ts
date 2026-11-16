export type YoastConfig = Record<string, unknown>;

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
