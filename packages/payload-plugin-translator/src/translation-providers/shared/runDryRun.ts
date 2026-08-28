import type { TranslationInput, TranslationOutput } from "../../core/domain/translation-providers";

export type DryRunTransformer = (text: string) => string | Promise<string>;

/**
 * Dry-run configuration: a transformer, and optionally a delay that imitates network latency.
 *
 * @since 0.11.0
 */
export type DryRunConfig = {
  /** Applied to every non-blank value. */
  transform: DryRunTransformer;
  /** Milliseconds to wait before returning. */
  timeout?: number;
};

const reverse: DryRunTransformer = (text) => text.split("").reverse().join("");

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

  const { transform = reverse, timeout = 0 } = typeof config === "object" ? config : {};

  if (timeout > 0) await new Promise((resolve) => setTimeout(resolve, timeout));

  const output: TranslationOutput = {};

  for (const [key, value] of Object.entries(input)) {
    output[Number(key)] = value.trim() ? await transform(value) : value;
  }

  return output;
}
