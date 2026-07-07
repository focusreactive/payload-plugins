import {
  createPayloadJobsRunner,
  createSyncRunner,
} from "@focus-reactive/payload-plugin-translator";
import type { DryRunConfig, TaskRunnerProvider } from "@focus-reactive/payload-plugin-translator";

// Dev-only env toggles for exercising the translator (kept out of payload.config.ts so the plugin
// wiring there stays declarative). See docs/multi-db-verification.md.

/**
 * `TRANSLATOR_SYNC=1` → the sync runner: translations run inline on enqueue, so lifecycle callbacks
 * (onQueued/onCompleted/onFailed) fire deterministically without a jobs autorun. Otherwise the Payload
 * Jobs runner (the normal async flow).
 */
export function resolveTranslatorRunner(): TaskRunnerProvider {
  return process.env.TRANSLATOR_SYNC === "1" ? createSyncRunner() : createPayloadJobsRunner();
}

/**
 * Dry-run mode for the OpenAI provider — a local mock, no API spend — driven by `TRANSLATOR_DRY_RUN`:
 * `"1"` → success (default reverse-text transform); `"fail"` → the transform throws so the translation
 * fails (drives onFailed). Also on by default when no `OPENAI_API_KEY` is set.
 */
export function resolveDryRun(): boolean | DryRunConfig {
  if (process.env.TRANSLATOR_DRY_RUN === "fail") {
    return {
      transform: () => {
        throw new Error("forced dry-run failure (TRANSLATOR_DRY_RUN=fail)");
      },
    };
  }
  return process.env.TRANSLATOR_DRY_RUN === "1" || !process.env.OPENAI_API_KEY;
}
