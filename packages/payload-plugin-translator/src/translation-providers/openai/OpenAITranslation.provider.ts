import type { TranslationProvider } from "../../core/domain/translation-providers";
import type { DryRunConfig, SystemPromptBuilder } from "../shared";
import { createTranslationProvider } from "../shared";
import { loadOpenAIClient } from "./loadOpenAIClient";
import type { OpenAIClientShape } from "./OpenAI.shapes";
import { openAIComplete } from "./openAIComplete";
import type { OpenAISamplingParams, OpenAIStructuredOutput } from "./openAIComplete";

const DEFAULT_MODEL = "gpt-4o";

/** The SDK's own default is ten minutes — far too long when a translation blocks a live editor request. */
const DEFAULT_TIMEOUT_MS = 60_000;

type OpenAIProviderBase = {
  /**
   * Model used for translation.
   *
   * @default 'gpt-4o' — may move in a minor release; pin it if you need reproducibility.
   */
  model?: string;
  /**
   * Custom system-prompt builder. Receives the source and target languages plus the prompt this
   * package would otherwise send, so you can extend it rather than rewrite it.
   */
  systemPrompt?: SystemPromptBuilder;
  /**
   * Simulate translations without calling OpenAI — see {@link DryRunConfig}.
   *
   * @default false
   * @deprecated Pass your own `client`, or build a provider with `createTranslationProvider({
   * complete })`. Remove in next major. See docs/DEPRECATIONS.md#provider-dry-run
   */
  dryRun?: boolean | DryRunConfig;
  /**
   * Per-request timeout in milliseconds for the client this package builds.
   *
   * Ignored when you pass your own `client` — then the timeout is whatever you configured on it.
   *
   * @default 60000
   * @since 0.6.0
   */
  timeout?: number;
  /**
   * Maximum automatic retries on transient errors (429, 5xx, network) for the client this package
   * builds. Ignored when you pass your own `client`.
   *
   * @default the SDK's own default (2)
   * @since 0.6.0
   */
  maxRetries?: number;
  /**
   * Sampling parameters — see {@link OpenAISamplingParams}, which survives this option.
   *
   * @since 0.11.0
   */
  sampling?: OpenAISamplingParams;
  /**
   * Which structured-output envelope to send — see {@link OpenAIStructuredOutput}, which documents
   * the trade-off and survives this option.
   *
   * @since 0.11.0
   */
  structuredOutput?: OpenAIStructuredOutput;
};

/**
 * Configuration for {@link createOpenAIProvider}: an API key **or** a ready-made client, never both.
 *
 * @deprecated Construct the client yourself and pass it to `openAIComplete`, which stays.
 * Remove in next major. See docs/DEPRECATIONS.md#openai-client-construction
 */
export type OpenAIProviderConfig = OpenAIProviderBase &
  (
    | {
        apiKey: string;
        client?: never;
      }
    | {
        /**
         * A ready-made client — the OpenAI SDK client, Azure, OpenRouter, a proxy. On this path the
         * `openai` package is never loaded and `timeout` / `maxRetries` are yours, not ours.
         *
         * @since 0.11.0
         */
        client: OpenAIClientShape;
        apiKey?: never;
      }
  );

/**
 * Creates an OpenAI translation provider.
 *
 * @deprecated What this adds over `openAIComplete` is building the SDK client for you, and
 * carrying `openai` as an optional dependency to do it. Construct the client yourself instead:
 * `createTranslationProvider({ complete: openAIComplete({ client, model }) })`. Remove in next
 * major. See the recipe in the README and docs/DEPRECATIONS.md#openai-client-construction
 */
export function createOpenAIProvider(config: OpenAIProviderConfig): TranslationProvider {
  const { model = DEFAULT_MODEL, systemPrompt, dryRun, sampling, structuredOutput } = config;

  // The promise, not the client: two concurrent first calls would otherwise each start their own
  // import. Per instance, never module-level — one consumer's client must not reach a differently
  // configured provider in the same process.
  let clientPromise: Promise<OpenAIClientShape> | undefined;

  const loadClientAndForgetOnFailure = async (): Promise<OpenAIClientShape> => {
    try {
      // `apiKey` goes through unchanged — never defaulted to "". The SDK checks for `undefined`, so an
      // empty string would build a client that 401s on every request instead of saying the key is
      // missing.
      return await loadOpenAIClient({
        apiKey: config.apiKey,
        timeout: config.timeout ?? DEFAULT_TIMEOUT_MS,
        maxRetries: config.maxRetries,
      });
    } catch (error) {
      // A cached rejected promise makes one bad first call permanent — the job runner's retries
      // would replay the same stale error.
      clientPromise = undefined;
      throw error;
    }
  };

  const resolveClient = (): Promise<OpenAIClientShape> => {
    if (config.client) return Promise.resolve(config.client);

    clientPromise ??= loadClientAndForgetOnFailure();
    return clientPromise;
  };

  return createTranslationProvider({
    systemPrompt,
    dryRun,
    complete: async (request) => {
      const client = await resolveClient();
      return openAIComplete({ client, model, sampling, structuredOutput })(request);
    },
  });
}
