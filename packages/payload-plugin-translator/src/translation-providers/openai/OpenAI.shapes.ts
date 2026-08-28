// Never import from `openai` here, in any position: an SDK type would enter this package's emitted
// declarations and force every consumer to install the SDK to type-check. Chat Completions rather
// than the Responses API — that is what Azure, OpenRouter and LiteLLM gateways implement.

export type OpenAIChatMessage = {
  role: "system" | "user";
  content: string;
};

/**
 * `schema` is `Record<string, unknown>`, not `unknown`: a widened field is not assignable to the
 * SDK's closed union and OpenAI.shapes.test.ts stops compiling.
 */
export type OpenAIResponseFormat =
  | { type: "json_object" }
  | {
      type: "json_schema";
      json_schema: { name: string; strict?: boolean; schema: Record<string, unknown> };
    };

export type OpenAIChatParams = {
  model: string;
  messages: OpenAIChatMessage[];
  response_format?: OpenAIResponseFormat;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
};

export type OpenAIChatResult = {
  choices: Array<{ message?: { content?: string | null } }>;
};

export type OpenAIRequestOptions = {
  signal?: AbortSignal;
};

/**
 * Any client with a `chat.completions.create` of this shape.
 *
 * Method syntax, not a property with a function type: property syntax is checked contravariantly
 * under strictFunctionTypes and the real SDK's overloaded `create` stops being assignable.
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
