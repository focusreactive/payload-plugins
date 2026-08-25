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

/** Reverses the text — recognisably "translated" without resembling any real language. */
const reverse: DryRunTransformer = (text) => text.split("").reverse().join("");

function transformerOf(config: boolean | DryRunConfig): DryRunTransformer {
  return typeof config === "object" && config.transform ? config.transform : reverse;
}

function delayOf(config: boolean | DryRunConfig): number {
  return typeof config === "object" && config.timeout ? config.timeout : 0;
}

/**
 * Simulates a translation without calling anything.
 *
 * Blank values pass through untouched, so a dry run leaves empty fields empty rather than filling
 * them with transformed whitespace.
 *
 * @since 0.11.0
 */
export async function runDryRun(
  input: TranslationInput,
  config: boolean | DryRunConfig
): Promise<TranslationOutput> {
  // Before v0.11.0 a dry run logged the whole document. That leaked content into shared logs, so it is
  // gone — but the *signal* it carried was worth keeping: an operator watching a staging deployment
  // used it to confirm nothing was being billed. This says the same thing without the content.
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
