// Narrow structural slice of an OpenAI-compatible client — the `.shapes.ts` convention this package
// already uses for Payload's god types, applied to a vendor SDK.
//
// Nothing here is imported from the `openai` package, in any position. That is the point: a type
// imported from the SDK would travel into this package's emitted declarations, and every consumer
// would then need the SDK installed just to type-check their own project.
//
// The shape fixes Chat Completions rather than the Responses API deliberately. It is what Azure
// OpenAI, OpenRouter, LiteLLM and most self-hosted gateways implement, and admitting those clients is
// the entire reason the slice exists.

/** One message in a chat request. Only the two roles this package sends. */
export type OpenAIChatMessage = {
  role: "system" | "user";
  content: string;
};

/**
 * The structured-output envelope, in the two forms this package sends.
 *
 * Typed exactly rather than as `unknown`: the SDK declares this field as a closed union, and a
 * widened field is not assignable to a narrow one — so `unknown` here would break the very
 * conformance the slice exists to guarantee.
 */
export type OpenAIResponseFormat =
  | { type: "json_object" }
  | {
      type: "json_schema";
      json_schema: { name: string; strict?: boolean; schema: Record<string, unknown> };
    };

/**
 * The request fields this package sets. Sampling parameters are optional and are omitted entirely
 * unless configured — some models reject them outright.
 */
export type OpenAIChatParams = {
  model: string;
  messages: OpenAIChatMessage[];
  response_format?: OpenAIResponseFormat;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
};

/** Only the part of a reply this package reads. */
export type OpenAIChatResult = {
  choices: Array<{ message?: { content?: string | null } }>;
};

/** Per-request options this package passes through. */
export type OpenAIRequestOptions = {
  signal?: AbortSignal;
};

/**
 * Any client with a `chat.completions.create` of this shape — the real OpenAI SDK client, an Azure
 * client, an OpenRouter-pointed client, or a hand-built stub in a test.
 *
 * Declared with method syntax so a real SDK client, whose `create` is overloaded and typed more
 * precisely, stays assignable.
 *
 * @since 0.11.0
 */
export type OpenAIClientShape = {
  chat: {
    completions: {
      create(params: OpenAIChatParams, options?: OpenAIRequestOptions): Promise<OpenAIChatResult>;
    };
  };
};
