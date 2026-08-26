import type { TranslationInput, TranslationOutput } from "../../core/domain/translation-providers";

/**
 * Transforms one string in dry-run mode.
 *
 * @since 0.11.0
 */
export type DryRunTransformer = (text: string) => string | Promise<string>;

/**
 * Dry-run configuration: a transformer, and optionally a delay that imitates network latency.
 *
 * @since 0.11.0
 */
export type DryRunConfig = {
  /** Applied to every non-blank value. */
  transform: DryRunTransformer;
  /** Milliseconds to wait before returning, so a caller can see its own loading states. */
  timeout?: number;
};

const reverse: DryRunTransformer = (text) => text.split("").reverse().join("");

function transformerOf(config: boolean | DryRunConfig): DryRunTransformer {
  return typeof config === "object" && config.transform ? config.transform : reverse;
}

function delayOf(config: boolean | DryRunConfig): number {
  return typeof config === "object" && config.timeout ? config.timeout : 0;
}

/**
 * Simulates a translation without calling anything. Blank values pass through untouched.
 *
 * Logs the field count and never field content: the log reaches shared infrastructure.
 *
 * @since 0.11.0
 */
export async function runDryRun(
  input: TranslationInput,
  config: boolean | DryRunConfig
): Promise<TranslationOutput> {
  console.info(
    `[payload-plugin-translator] Dry run: simulated ${Object.keys(input).length} field(s), no API call made.`
  );

  const delay = delayOf(config);
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));

  const transform = transformerOf(config);
  const output: TranslationOutput = {};

  for (const [key, value] of Object.entries(input)) {
    output[Number(key)] = value.trim() ? await transform(value) : value;
  }

  return output;
}
