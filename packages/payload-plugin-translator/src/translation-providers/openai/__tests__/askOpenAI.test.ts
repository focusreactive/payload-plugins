import { describe, expect, it } from "vitest";

import {
  createTranslationProvider,
  KeySetMismatchError,
  NoContentError,
  ProviderConfigurationError,
  TransportError,
  UnparseableReplyError,
} from "../../shared/index.js";
import type { SystemPromptBuilder } from "../../shared/index.js";
import { readFailureReason } from "../../../core/errors/failureReason.js";
import { askOpenAI } from "../askOpenAI.js";
import type { OpenAIParams, OpenAIStructuredOutput } from "../askOpenAI.js";
import type { OpenAIChatParams, OpenAIClientShape } from "../OpenAI.shapes.js";
import type {
  TranslationProvider,
  TranslationRequest,
} from "../../../core/domain/translation-providers/index.js";

const MODEL = "gpt-5.4-mini";

function openAIProvider(config: {
  client: OpenAIClientShape;
  params?: Partial<OpenAIParams>;
  structuredOutput?: OpenAIStructuredOutput;
  systemPrompt?: SystemPromptBuilder;
}): TranslationProvider {
  const { client, params, structuredOutput, systemPrompt } = config;

  return createTranslationProvider({
    systemPrompt,
    askModel: askOpenAI({ client, params: { model: MODEL, ...params }, structuredOutput }),
  });
}

function stubClient(reply: string) {
  const calls: OpenAIChatParams[] = [];
  const client: OpenAIClientShape = {
    chat: {
      completions: {
        create: async (params) => {
          calls.push(params);
          return { choices: [{ message: { content: reply } }] };
        },
      },
    },
  };
  return { client, calls };
}

function throwingClient(throws: () => never): OpenAIClientShape {
  return { chat: { completions: { create: async () => throws() } } };
}

function emptyChoicesClient(): OpenAIClientShape {
  return { chat: { completions: { create: async () => ({ choices: [] }) } } };
}

const DEFAULT_DOCUMENT = { collection: "docs", id: "1" };

function aRequest(over: Partial<TranslationRequest> = {}): TranslationRequest {
  return {
    sourceLng: "en",
    targetLng: "de",
    document: DEFAULT_DOCUMENT,
    ...over,
  };
}

const HELLO = { 0: { kind: "text", text: "Hello" } } as const;
const HALLO = { 0: { kind: "text", text: "Hallo" } };
const plainReply = (values: Record<string, string>): string =>
  JSON.stringify({ marked: {}, plain: values });
const HALLO_REPLY = plainReply({ 0: "Hallo" });

async function failureOf(provider: TranslationProvider): Promise<Error> {
  try {
    await provider.translate(HELLO, aRequest());
  } catch (cause) {
    return cause as Error;
  }
  throw new Error("expected the translation to fail");
}

describe("askOpenAI", () => {
  describe("with an injected client", () => {
    it("translates, returning the parsed reply", async () => {
      const { client } = stubClient(HALLO_REPLY);

      const result = await openAIProvider({ client }).translate(HELLO, aRequest());

      expect(result).toEqual(HALLO);
    });

    it("sends a strict JSON schema requiring exactly the input's keys", async () => {
      const { client, calls } = stubClient(plainReply({ 0: "Hallo", 1: "Welt" }));

      await openAIProvider({ client }).translate(
        { ...HELLO, 1: { kind: "text", text: "World" } },
        aRequest()
      );

      expect(calls[0].response_format).toEqual({
        type: "json_schema",
        json_schema: {
          name: "translation",
          strict: true,
          schema: {
            type: "object",
            properties: {
              marked: { type: "object", properties: {}, required: [], additionalProperties: false },
              plain: {
                type: "object",
                properties: { "0": { type: "string" }, "1": { type: "string" } },
                required: ["0", "1"],
                additionalProperties: false,
              },
            },
            required: ["marked", "plain"],
            additionalProperties: false,
          },
        },
      });
    });

    it("can fall back to the json_object envelope for gateways that reject a schema", async () => {
      const { client, calls } = stubClient(HALLO_REPLY);

      await openAIProvider({ client, structuredOutput: "json_object" }).translate(
        HELLO,
        aRequest()
      );

      expect(calls[0].response_format).toEqual({ type: "json_object" });
    });

    it("refuses json_object when a systemPrompt override dropped the word json", async () => {
      const { client } = stubClient(HALLO_REPLY);

      const failure = await failureOf(
        openAIProvider({
          client,
          structuredOutput: "json_object",
          systemPrompt: () => "Translate everything into German.",
        })
      );

      expect(failure).toBeInstanceOf(ProviderConfigurationError);
      expect(failure.message).toContain("json");
    });

    it("names the fix when the model rejects the schema envelope", async () => {
      const client = throwingClient(() => {
        throw new Error(
          "400 Invalid parameter: 'response_format' of type 'json_schema' is not supported with this model."
        );
      });

      const failure = await failureOf(openAIProvider({ client, params: { model: "gpt-4-turbo" } }));

      expect(failure).toBeInstanceOf(ProviderConfigurationError);
      expect(failure.message).toContain('structuredOutput: "json_object"');
      expect(failure.message).toContain("gpt-4-turbo");
    });

    it("advises a smaller subtree when the schema itself is rejected", async () => {
      const client = throwingClient(() => {
        throw new Error(
          "400 Invalid schema for response_format 'translation': object has too many properties."
        );
      });

      const failure = await failureOf(openAIProvider({ client }));

      expect(failure).toBeInstanceOf(ProviderConfigurationError);
      expect(failure.message).toContain('structuredOutput: "json_object"');
      expect(failure.message).toContain("smaller subtree");
    });

    const ECHOED_ENVELOPE = [
      {
        case: "a rate limit",
        message:
          '429 Rate limit exceeded for request {"model":"gpt-4o","response_format":{"type":"json_schema"}}',
      },
      {
        case: "a rate limit echoing the model name",
        message: '429 Rate limit exceeded for request {"model":"gpt-5.4-mini"}',
      },
      {
        case: "an unrelated invalid parameter",
        message:
          '400 Invalid parameter: \'temperature\' must be between 0 and 2. request: {"response_format":{"type":"json_schema"}}',
      },
    ];

    for (const { case: label, message } of ECHOED_ENVELOPE) {
      it(`leaves ${label} that merely mentions the envelope as a transport failure`, async () => {
        const client = throwingClient(() => {
          throw new Error(message);
        });

        const failure = await failureOf(openAIProvider({ client }));

        expect(failure).toBeInstanceOf(TransportError);
        expect(failure).not.toBeInstanceOf(ProviderConfigurationError);
      });
    }

    it("does not reinterpret a rejection when json_object was configured", async () => {
      const client = throwingClient(() => {
        throw new Error("400 Invalid schema for response_format 'translation'.");
      });

      const failure = await failureOf(openAIProvider({ client, structuredOutput: "json_object" }));

      expect(failure).toBeInstanceOf(TransportError);
    });

    const MODEL_ACCESS = [
      {
        case: "the SDK's own error code, whatever the message says",
        throws: () => {
          throw Object.assign(new Error("404 unrecognisable wording"), {
            code: "model_not_found",
            status: 404,
          });
        },
      },
      {
        case: "a gateway that forwards only the text",
        throws: () => {
          throw new Error(
            "404 The model `gpt-5.4-mini` does not exist or you do not have access to it."
          );
        },
      },
    ];

    for (const { case: label, throws } of MODEL_ACCESS) {
      it(`reports ${label} as a configuration failure naming the model option`, async () => {
        const client = throwingClient(throws);

        const failure = await failureOf(openAIProvider({ client }));

        expect(failure).toBeInstanceOf(ProviderConfigurationError);
        expect(failure.message).toContain(MODEL);
        expect(failure.message).toContain("`model`");
      });
    }

    const OTHER_CODES = ["rate_limit_exceeded", "unsupported_model_parameter"];

    for (const code of OTHER_CODES) {
      it(`matches the code exactly — "${code}" stays a transport failure`, async () => {
        const client = throwingClient(() => {
          throw Object.assign(new Error("400 something about model gpt-5.4-mini"), { code });
        });

        const failure = await failureOf(openAIProvider({ client }));

        expect(failure).toBeInstanceOf(TransportError);
        expect(failure).not.toBeInstanceOf(ProviderConfigurationError);
      });
    }

    it("classifies a model-access failure on the json_object path too", async () => {
      const client = throwingClient(() => {
        throw new Error("404 The model `x` does not exist or you do not have access to it.");
      });

      const failure = await failureOf(openAIProvider({ client, structuredOutput: "json_object" }));

      expect(failure).toBeInstanceOf(ProviderConfigurationError);
    });

    it("marks a model-access failure so the admin panel can name the reason", async () => {
      const client = throwingClient(() => {
        throw new Error("404 The model `x` does not exist or you do not have access to it.");
      });

      const failure = await failureOf(openAIProvider({ client }));

      expect(readFailureReason(failure.message)).toBe("model-unavailable");
    });

    it("leaves the schema rejections unmarked — the panel has no copy for them", async () => {
      const client = throwingClient(() => {
        throw new Error(
          "400 'response_format' of type 'json_schema' is not supported with this model."
        );
      });

      const failure = await failureOf(openAIProvider({ client }));

      expect(failure).toBeInstanceOf(ProviderConfigurationError);
      expect(readFailureReason(failure.message)).toBeNull();
    });

    it("still reports an ordinary API failure as transport", async () => {
      const client = throwingClient(() => {
        throw new Error("429 rate limit exceeded");
      });

      const failure = await failureOf(openAIProvider({ client }));

      expect(failure).toBeInstanceOf(TransportError);
    });

    it("allows json_object when the prompt still mentions json", async () => {
      const { client } = stubClient(HALLO_REPLY);

      const result = await openAIProvider({
        client,
        structuredOutput: "json_object",
        systemPrompt: ({ defaultPrompt }) => `${defaultPrompt}\nBe formal.`,
      }).translate(HELLO, aRequest());

      expect(result).toEqual(HALLO);
    });

    it("sends the model it was given", async () => {
      const { client, calls } = stubClient(HALLO_REPLY);

      await openAIProvider({ client }).translate(HELLO, aRequest());
      await openAIProvider({ client, params: { model: "gpt-4o-mini" } }).translate(
        HELLO,
        aRequest()
      );

      expect(calls[0].model).toBe(MODEL);
      expect(calls[1].model).toBe("gpt-4o-mini");
    });

    it("omits sampling parameters unless they are configured", async () => {
      const { client, calls } = stubClient(HALLO_REPLY);

      await openAIProvider({ client }).translate(HELLO, aRequest());

      expect(calls[0]).not.toHaveProperty("temperature");
      expect(calls[0]).not.toHaveProperty("top_p");
      expect(calls[0]).not.toHaveProperty("frequency_penalty");
      expect(calls[0]).not.toHaveProperty("presence_penalty");
    });

    it("carries every field of the body it was given, not a chosen few", async () => {
      const { client, calls } = stubClient(HALLO_REPLY);

      await openAIProvider({
        client,
        params: {
          model: "gpt-4o-mini",
          temperature: 0,
          top_p: 0.9,
          frequency_penalty: 0.5,
          presence_penalty: 0.75,
        },
      }).translate(HELLO, aRequest());

      expect(calls[0]).toMatchObject({
        model: "gpt-4o-mini",
        temperature: 0,
        top_p: 0.9,
        frequency_penalty: 0.5,
        presence_penalty: 0.75,
      });
    });

    it("sends the system prompt and the serialized input as the two messages", async () => {
      const { client, calls } = stubClient(HALLO_REPLY);

      await openAIProvider({ client }).translate(HELLO, aRequest());

      expect(calls[0].messages[0].role).toBe("system");
      expect(calls[0].messages[0].content).toContain("from en into de");
      expect(calls[0].messages[1]).toEqual({
        role: "user",
        content: '{"marked":{},"plain":{"0":"Hello"}}',
      });
    });

    it("applies a systemPrompt override", async () => {
      const { client, calls } = stubClient(HALLO_REPLY);

      await openAIProvider({
        client,
        systemPrompt: ({ defaultPrompt }) => `${defaultPrompt}\nBe formal.`,
      }).translate(HELLO, aRequest());

      expect(calls[0].messages[0].content).toContain("Be formal.");
    });
  });

  describe("failures name their cause", () => {
    const NO_CONTENT = [
      { case: "the reply has no content", build: () => stubClient("").client },
      { case: "choices is empty", build: emptyChoicesClient },
    ];

    for (const { case: label, build } of NO_CONTENT) {
      it(`throws NoContentError when ${label}`, async () => {
        const failure = await failureOf(openAIProvider({ client: build() }));

        expect(failure).toBeInstanceOf(NoContentError);
        expect(failure.message).toContain("OpenAI returned no content");
      });
    }

    it("throws UnparseableReplyError when the reply is not JSON", async () => {
      const { client } = stubClient("I cannot do that.");

      await expect(openAIProvider({ client }).translate(HELLO, aRequest())).rejects.toThrow(
        UnparseableReplyError
      );
    });

    it("throws KeySetMismatchError when the reply answers nothing", async () => {
      const { client } = stubClient(plainReply({ 9: "Hallo" }));

      await expect(openAIProvider({ client }).translate(HELLO, aRequest())).rejects.toThrow(
        KeySetMismatchError
      );
    });

    it("wraps a thrown SDK error as TransportError, keeping the original on cause", async () => {
      const boom = new Error("429 rate limited");
      const client = throwingClient(() => {
        throw boom;
      });

      const failure = await failureOf(openAIProvider({ client }));

      expect(failure).toBeInstanceOf(TransportError);
      expect((failure as TransportError).cause).toBe(boom);
    });

    it("does not copy the SDK error's text into the message it surfaces", async () => {
      const client = throwingClient(() => {
        throw new Error("401 — key sk-test-abcdef123456");
      });

      const failure = await failureOf(openAIProvider({ client }));

      expect(failure.message).not.toContain("sk-test-abcdef123456");
    });
  });
});
