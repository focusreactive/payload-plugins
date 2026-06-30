import type { SeoGenerationConfig } from "../../types/config";

export function resolveApiKey(config: SeoGenerationConfig | undefined): string | undefined {
  const explicit = config?.apiKey?.trim();
  if (explicit) return explicit;

  const env = process.env.OPENAI_API_KEY?.trim();
  return env || undefined;
}
