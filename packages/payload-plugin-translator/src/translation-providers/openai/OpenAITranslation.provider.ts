import type {
  TranslationInput,
  TranslationOutput,
  TranslationProvider,
} from "../../core/domain/translation-providers";
import type { DryRunConfig, SystemPromptBuilder } from "../shared";
import { createTranslationProvider } from "../shared";
import { loadOpenAIClient } from "./loadOpenAIClient";
import type { OpenAIClientShape } from "./OpenAI.shapes";
import { openAIComplete } from "./openAIComplete";
import type { OpenAISamplingParams, OpenAIStructuredOutput } from "./openAIComplete";

/**
 * The model used when a consumer does not name one; may change in a minor release — see `model` on
 * {@link OpenAIProviderConfig}.
 */
const DEFAULT_MODEL = "gpt-4o";

/**
 * Per-request timeout for the client this package builds, in milliseconds.
 *
 * The SDK's own default is ten minutes, which is far too long here: a translation blocks a job, and at
 * field level it blocks a live HTTP request the editor is waiting on.
 */
const DEFAULT_TIMEOUT_MS = 60_000;

type OpenAIProviderBase = {
  /**
   * Model used for translation.
   *
   * @default 'gpt-4o' — and see {@link DEFAULT_MODEL}: the default may move in a minor release, so
   * pin this if you need reproducibility.
   */
  model?: string;
  /**
   * Custom system-prompt builder. Receives the source and target languages plus the prompt this
   * package would otherwise send, so you can extend it rather than rewrite it.
   */
  systemPrompt?: SystemPromptBuilder;
  /**
   * Simulate translations without calling OpenAI. `true` reverses the text; an object supplies your
   * own transformer and an optional delay.
   *
   * A dry run reaches no network and loads no SDK, so it works with an empty `apiKey`.
   *
   * @default false
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
   * Sampling parameters. Omitted from the request entirely unless set — several models reject them.
   * Unset means the model's own defaults; pass `{ temperature: 0 }` for deterministic output.
   *
   * @since 0.11.0
   */
  sampling?: OpenAISamplingParams;
  /**
   * Which structured-output envelope to send.
   *
   * `json_schema` (the default) makes a compliant model structurally unable to drop a requested
   * field. It is OpenAI-specific, though: some gateways — OpenRouter with certain upstream models,
   * older Azure deployments, self-hosted proxies — reject it with a 400. Switch to `json_object` for
   * those; key preservation then rests on this package's key-set validation instead of on the API,
   * which reports a partial reply rather than preventing one.
   *
   * @since 0.11.0
   */
  structuredOutput?: OpenAIStructuredOutput;
};

/**
 * Configuration for {@link createOpenAIProvider}: an API key **or** a ready-made client, never both.
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
 * @example
 * ```ts
 * // Quick start — the SDK is loaded on first use
 * createOpenAIProvider({ apiKey: process.env.OPENAI_API_KEY })
 *
 * // Your own client: Azure, a proxy, OpenRouter — the `openai` package is never loaded
 * createOpenAIProvider({ client: myClient, model: "gpt-4o-mini" })
 * ```
 *
 * @since 0.11.0 — accepts `client` as an alternative to `apiKey`, and returns the
 * `TranslationProvider` interface rather than the deprecated concrete class.
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

/**
 * @deprecated Use {@link createOpenAIProvider} instead.
 * See docs/DEPRECATIONS.md#openai-translation-provider-class
 */
export class OpenAITranslationProvider implements TranslationProvider {
  private readonly inner: TranslationProvider;

  constructor(config: OpenAIProviderConfig) {
    this.inner = createOpenAIProvider(config);
  }

  translate(
    input: TranslationInput,
    sourceLng: string,
    targetLng: string
  ): Promise<TranslationOutput | null> {
    return this.inner.translate(input, sourceLng, targetLng);
  }
}
