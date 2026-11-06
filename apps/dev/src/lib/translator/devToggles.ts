import {
  createPayloadJobsRunner,
  createSyncRunner,
  createTranslationProvider,
  askOpenAI,
} from "@focus-reactive/payload-plugin-translator";
import type {
  AskModel,
  TaskRunnerProvider,
  TranslationProvider,
} from "@focus-reactive/payload-plugin-translator";

import { fakeAsk, failingAsk } from "./fakeAsk";

// See apps/dev/docs/multi-db-verification.md.

let openAIAsk: Promise<AskModel> | undefined;

/**
 * The SDK's own default is ten minutes, which would hold a live editor request that long.
 */
const OPENAI_TIMEOUT_MS = 60_000;

const buildOpenAIAsk = async (): Promise<AskModel> => {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: OPENAI_TIMEOUT_MS });

  return askOpenAI({ client, params: { model: "gpt-5.4-mini" } });
};

/**
 * Loaded on the first translation, not at module load, so the dry-run branches below never pay the
 * ~55ms / ~7MB of evaluating the `openai` module (openai@4.104.0, measured 2026-11).
 */
const askOpenAIOnFirstUse: AskModel = async (request) => {
  openAIAsk ??= buildOpenAIAsk();

  let ask: AskModel;
  try {
    ask = await openAIAsk;
  } catch (cause) {
    openAIAsk = undefined;
    throw cause;
  }

  return await ask(request);
};

/**
 * `TRANSLATOR_SYNC=1` picks the sync runner, which translates inline on enqueue, so lifecycle
 * callbacks fire without a jobs autorun; anything else gets the Payload Jobs runner.
 */
export function resolveTranslatorRunner(): TaskRunnerProvider {
  return process.env.TRANSLATOR_SYNC === "1" ? createSyncRunner() : createPayloadJobsRunner();
}

/**
 * `TRANSLATOR_DRY_RUN=1`, `TRANSLATOR_DRY_RUN=fail`, or no `OPENAI_API_KEY` — each keeps this
 * sandbox on a local fake and off the paid API.
 */
export function resolveTranslationProvider(): TranslationProvider {
  if (process.env.TRANSLATOR_DRY_RUN === "fail") {
    return createTranslationProvider({ askModel: failingAsk });
  }

  if (process.env.TRANSLATOR_DRY_RUN === "1" || !process.env.OPENAI_API_KEY) {
    return createTranslationProvider({ askModel: fakeAsk() });
  }

  return createTranslationProvider({ askModel: askOpenAIOnFirstUse });
}
