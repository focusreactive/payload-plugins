import OpenAI from "openai";
import type { ChatModel } from "openai/resources/index.mjs";

import { isObject } from "../../shared";
import type {
  TranslationProvider,
  TranslationInput,
  TranslationOutput,
} from "./TranslationProvider.interface";

/**
 * Function to transform text in dry run mode.
 * Receives the original text and returns the transformed text.
 */
type DryRunTransformer = (text: string) => string | Promise<string>;

/**
 * Configuration for dry run mode with custom transformer.
 */
export interface DryRunConfig {
  /** Custom transformer function for text */
  transform: DryRunTransformer;
  /** Delay in milliseconds before returning mock translation (simulates API latency) */
  timeout?: number;
}

/**
 * Context passed to the system prompt builder function.
 */
export interface SystemPromptContext {
  /** Source language code (e.g., 'en', 'de') */
  sourceLang: string;
  /** Target language code (e.g., 'fr', 'es') */
  targetLang: string;
  /** Default system prompt that can be extended or replaced */
  defaultPrompt: string;
}

/**
 * Function to build a custom system prompt for translation.
 */
type SystemPromptBuilder = (context: SystemPromptContext) => string;

export interface OpenAIProviderConfig {
  apiKey: string;
  /**
   * OpenAI model to use for translation.
   *
   * @default 'gpt-4o'
   *
   * @example
   * model: 'gpt-4o-mini'
   */
  model?: (string & {}) | ChatModel;
  /**
   * Custom system prompt builder for translation.
   * Receives context with source/target languages and the default prompt.
   *
   * @example
   * // Add custom instructions
   * systemPrompt: ({ sourceLang, targetLang, defaultPrompt }) =>
   *   `${defaultPrompt}\nUse formal language. Keep brand names unchanged.`
   *
   * @example
   * // Completely custom prompt
   * systemPrompt: ({ sourceLang, targetLang }) =>
   *   `Translate JSON values from ${sourceLang} to ${targetLang}. Be concise.`
   */
  systemPrompt?: SystemPromptBuilder;
  /**
   * When enabled, simulates translations without making actual API calls to OpenAI.
   *
   * - `true` — uses default transformer that reverses the text
   * - `{ transform, timeout? }` — custom transformer with optional delay
   *
   * @example
   * // Default behavior (reverse text, no delay)
   * dryRun: true
   *
   * @example
   * // Custom transformer with delay
   * dryRun: {
   *   transform: (text) => `[TRANSLATED] ${text}`,
   *   timeout: 1000, // 1 second delay
   * }
   *
   * @default false
   */
  dryRun?: boolean | DryRunConfig;
}

/** @deprecated Use `createOpenAIProvider` function instead */
export class OpenAITranslationProvider implements TranslationProvider {
  private openAiClient: OpenAI;

  constructor(private readonly config: OpenAIProviderConfig) {
    this.openAiClient = new OpenAI({ apiKey: config.apiKey });
  }

  async translate(
    content: TranslationInput,
    souceLng: string,
    targetLng: string
  ): Promise<TranslationOutput | null> {
    if (this.config.dryRun) {
      console.info("[DRY RUN] Translation simulation:", {
        content,
        provider: "OpenAI",
        sourceLang: souceLng,
        targetLang: targetLng,
      });

      const timeout = this.getDryRunTimeout();
      if (timeout > 0)
        {await new Promise((resolve) => setTimeout(resolve, timeout));}

      const transformer = this.getDryRunTransformer();
      return this.createMockTranslation(content, transformer);
    }

    const systemPrompt = this.buildSystemPrompt(souceLng, targetLng);

    const chatCompletion = await this.openAiClient.chat.completions.create({
      frequency_penalty: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(content) },
      ],
      model: this.config.model ?? "gpt-4o",
      presence_penalty: 0,
      response_format: { type: "json_object" },
      temperature: 0,
      top_p: 1,
    });

    const translatedContent = chatCompletion.choices[0].message.content;
    if (!translatedContent) {return null;}

    try {
      return JSON.parse(translatedContent);
    } catch {
      return null;
    }
  }

  /**
   * Builds the system prompt for translation.
   */
  private buildSystemPrompt(sourceLang: string, targetLang: string): string {
    const defaultPrompt = `Translate the values from the JSON that the user will send you${sourceLang ? ` from ${sourceLang}` : ""} into ${targetLang}. Keep all JSON keys exactly as they are, only translate the values.
The response should be a valid JSON object with the same structure and keys as the input, but with translated values.
Maintain any special formatting, placeholders, or variables within the values if they exist.`;

    if (this.config.systemPrompt) {
      return this.config.systemPrompt({
        defaultPrompt,
        sourceLang,
        targetLang,
      });
    }

    return defaultPrompt;
  }

  /**
   * Returns the transformer function for dry run mode.
   * If dryRun is an object with transform, returns it.
   * If dryRun is true, returns the default transformer that reverses text.
   */
  private getDryRunTransformer(): DryRunTransformer {
    if (
      typeof this.config.dryRun === "object" &&
      this.config.dryRun.transform
    ) {
      return this.config.dryRun.transform;
    }
    return (text: string) => [...text].toReversed().join("");
  }

  /**
   * Returns the timeout for dry run mode.
   * If dryRun is an object with timeout, returns it.
   * Otherwise returns 0 (no delay).
   */
  private getDryRunTimeout(): number {
    if (typeof this.config.dryRun === "object" && this.config.dryRun.timeout) {
      return this.config.dryRun.timeout;
    }
    return 0;
  }

  private async createMockTranslation(
    content: TranslationInput,
    transformer: DryRunTransformer
  ): Promise<TranslationOutput | null> {
    try {
      const mockTranslation = await this.transformObjectValues(
        content,
        async (value) => {
          if (typeof value === "string" && value.trim())
            {return transformer(value);}
          return value;
        }
      );

      return mockTranslation as TranslationOutput;
    } catch {
      return null;
    }
  }

  /**
   * Recursively transforms the values of an object or array using the provided transformer function.
   * @param obj The object or value to transform.
   * @param transformer The function to apply to each value.
   * @returns The transformed object, array, or value.
   */
  private async transformObjectValues(
    obj: unknown,
    transformer: (value: unknown) => unknown | Promise<unknown>
  ): Promise<unknown> {
    if (Array.isArray(obj)) {
      return Promise.all(
        obj.map((item) => this.transformObjectValues(item, transformer))
      );
    }

    if (isObject(obj)) {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = await this.transformObjectValues(value, transformer);
      }
      return result;
    }

    return transformer(obj);
  }
}

/**
 * Creates an OpenAI translation provider.
 *
 * @example
 * ```ts
 * // Basic usage
 * createOpenAIProvider({ apiKey: process.env.OPENAI_API_KEY })
 *
 * // With options
 * createOpenAIProvider({
 *   apiKey: process.env.OPENAI_API_KEY,
 *   model: 'gpt-4o-mini',
 *   systemPrompt: ({ defaultPrompt }) => `${defaultPrompt}\nUse formal language.`,
 * })
 * ```
 */
export function createOpenAIProvider(
  config: OpenAIProviderConfig
): OpenAITranslationProvider {
  return new OpenAITranslationProvider(config);
}
