import {
  createPayloadJobsRunner,
  createSyncRunner,
  createTranslationProvider,
  askOpenAI,
  documentTranslation,
  fieldTranslation,
} from "@focus-reactive/payload-plugin-translator";
import type {
  AskModel,
  TaskRunnerProvider,
  TranslationProvider,
  TranslatorPluginConfig,
} from "@focus-reactive/payload-plugin-translator";
import { translationStub } from "@focus-reactive/payload-plugin-translator/stub";

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

/**
 * `TRANSLATOR_STUB=1` serves the admin from the plugin's in-memory stub instead of the real modules,
 * with the scenario `TRANSLATOR_STUB_SCENARIO` names (`mixed` when unset). Provenance is off then:
 * it serves the dismiss route the stub serves, and the plugin refuses two modules on one route.
 */
export function resolveTranslatorModules(): Pick<TranslatorPluginConfig, "modules" | "provenance"> {
  if (process.env.TRANSLATOR_STUB === "1") {
    return {
      modules: [translationStub({ scenario: process.env.TRANSLATOR_STUB_SCENARIO || undefined })],
      provenance: false,
    };
  }

  return { modules: [documentTranslation(), fieldTranslation()], provenance: true };
}
