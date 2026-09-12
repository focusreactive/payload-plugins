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

import { fakeComplete, failingComplete } from "./fakeComplete";

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
    return createTranslationProvider({
      capabilities: { inlineMarks: true },
      complete: fakeComplete(),
    });
  }

  return createOpenAIProvider({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Rich text is translated one container at a time, with numbered inline marks, so the translation
 * may reorder the pieces. On by default here, unlike the plugin itself: this sandbox exists to
 * exercise the current behaviour, and a run that silently used the old path would look like a
 * feature that does not work. `TRANSLATOR_INLINE_MARKS=0` returns to translating node by node.
 */
export function resolveInlineMarks(): boolean {
  return process.env.TRANSLATOR_INLINE_MARKS !== "0";
}
