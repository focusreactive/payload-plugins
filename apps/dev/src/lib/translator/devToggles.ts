import {
  createOpenAIProvider,
  createPayloadJobsRunner,
  createSyncRunner,
  createTranslationProvider,
} from "@focus-reactive/payload-plugin-translator";
import type {
  TaskRunnerProvider,
  TranslationProvider,
} from "@focus-reactive/payload-plugin-translator";

import { failingComplete, reverseComplete } from "./fakeComplete";

// See apps/dev/docs/multi-db-verification.md.

/**
 * `TRANSLATOR_SYNC=1` → the sync runner: translations run inline on enqueue, so lifecycle callbacks
 * (onQueued/onCompleted/onFailed) fire deterministically without a jobs autorun. Otherwise the Payload
 * Jobs runner (the normal async flow).
 */
export function resolveTranslatorRunner(): TaskRunnerProvider {
  return process.env.TRANSLATOR_SYNC === "1" ? createSyncRunner() : createPayloadJobsRunner();
}

/**
 * The provider this sandbox runs on, driven by `TRANSLATOR_DRY_RUN`: `"1"` → a local fake, no API
 * spend; `"fail"` → a fake that throws, so the translation fails and `onFailed` fires. The fake is
 * also the default when no `OPENAI_API_KEY` is set.
 */
export function resolveTranslationProvider(): TranslationProvider {
  if (process.env.TRANSLATOR_DRY_RUN === "fail") {
    return createTranslationProvider({ complete: failingComplete });
  }

  if (process.env.TRANSLATOR_DRY_RUN === "1" || !process.env.OPENAI_API_KEY) {
    return createTranslationProvider({ complete: reverseComplete });
  }

  return createOpenAIProvider({ apiKey: process.env.OPENAI_API_KEY });
}
