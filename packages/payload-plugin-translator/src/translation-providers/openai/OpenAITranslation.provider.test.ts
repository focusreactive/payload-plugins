import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  KeySetMismatchError,
  NoContentError,
  ProviderConfigurationError,
  TransportError,
  UnparseableReplyError,
} from "../shared";
import { createOpenAIProvider, OpenAITranslationProvider } from "./OpenAITranslation.provider";
import type { OpenAIChatParams, OpenAIClientShape } from "./OpenAI.shapes";
import { loadOpenAIClient } from "./loadOpenAIClient";

vi.mock("./loadOpenAIClient", () => ({
  loadOpenAIClient: vi.fn(),
}));

const loadClient = vi.mocked(loadOpenAIClient);

/** A client that records what it was asked and replies with whatever the test supplies. */
function stubClient(reply: string | (() => never)) {
  const calls: OpenAIChatParams[] = [];
  const client: OpenAIClientShape = {
    chat: {
      completions: {
        create: async (params) => {
          calls.push(params);
          if (typeof reply === "function") reply();
          return { choices: [{ message: { content: reply as string } }] };
        },
      },
    },
  };
  return { client, calls };
}

function emptyChoicesClient(): OpenAIClientShape {
  return { chat: { completions: { create: async () => ({ choices: [] }) } } };
}

describe("createOpenAIProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("with an injected client", () => {
    it("translates, returning the parsed reply", async () => {
      const { client } = stubClient('{"0":"Hallo"}');

      const result = await createOpenAIProvider({ client }).translate({ 0: "Hello" }, "en", "de");

      expect(result).toEqual({ 0: "Hallo" });
    });

    it("never loads the SDK", async () => {
      const { client } = stubClient('{"0":"Hallo"}');

      await createOpenAIProvider({ client }).translate({ 0: "Hello" }, "en", "de");

      expect(loadClient).not.toHaveBeenCalled();
    });

    it("sends a strict JSON schema requiring exactly the input's keys", async () => {
      const { client, calls } = stubClient('{"0":"Hallo","1":"Welt"}');

      await createOpenAIProvider({ client }).translate({ 0: "Hello", 1: "World" }, "en", "de");

      expect(calls[0].response_format).toEqual({
        type: "json_schema",
        json_schema: {
          name: "translation",
          strict: true,
          schema: {
            type: "object",
            properties: { "0": { type: "string" }, "1": { type: "string" } },
            required: ["0", "1"],
            additionalProperties: false,
          },
        },
      });
    });

    // Rung 01 exists to admit Azure, OpenRouter and self-hosted gateways, and several of those reject
    // `json_schema` with a 400. Without this escape hatch the headline new capability would fail on
    // every call for them.
    it("can fall back to the json_object envelope for gateways that reject a schema", async () => {
      const { client, calls } = stubClient('{"0":"Hallo"}');

      await createOpenAIProvider({ client, structuredOutput: "json_object" }).translate(
        { 0: "Hello" },
        "en",
        "de"
      );

      expect(calls[0].response_format).toEqual({ type: "json_object" });
    });

    // OpenAI rejects json_object unless "json" appears in the prompt. The built-in prompt contains it,
    // so this can only bite someone who *replaces* the prompt — and the resulting 400 reads as
    // unrelated to the prompt, which is why it is caught here with a message that names the cause.
    it("refuses json_object when a systemPrompt override dropped the word json", async () => {
      const { client } = stubClient('{"0":"Hallo"}');

      const failure = await createOpenAIProvider({
        client,
        structuredOutput: "json_object",
        systemPrompt: () => "Translate everything into German.",
      })
        .translate({ 0: "Hello" }, "en", "de")
        .catch((e: unknown) => e);

      expect(failure).toBeInstanceOf(ProviderConfigurationError);
      expect((failure as Error).message).toContain("json");
    });

    // Before v0.11.0 every request went out as json_object, which all models accept. gpt-4-turbo,
    // gpt-4, gpt-3.5-turbo and the o1 family reject the schema envelope — and because the vendor's own
    // explanation never reaches the surfaced message, without this the consumer would see a generic
    // transport failure with no route to the option that fixes it.
    it("names the fix when the model rejects the schema envelope", async () => {
      const { client } = stubClient(() => {
        throw new Error(
          "400 Invalid parameter: 'response_format' of type 'json_schema' is not supported with this model."
        );
      });

      const failure = await createOpenAIProvider({ client, model: "gpt-4-turbo" })
        .translate({ 0: "Hello" }, "en", "de")
        .catch((e: unknown) => e);

      expect(failure).toBeInstanceOf(ProviderConfigurationError);
      expect((failure as Error).message).toContain('structuredOutput: "json_object"');
      expect((failure as Error).message).toContain("gpt-4-turbo");
    });

    it("still reports an ordinary API failure as transport", async () => {
      const { client } = stubClient(() => {
        throw new Error("429 rate limit exceeded");
      });

      const failure = await createOpenAIProvider({ client })
        .translate({ 0: "Hello" }, "en", "de")
        .catch((e: unknown) => e);

      expect(failure).toBeInstanceOf(TransportError);
    });

    it("allows json_object when the prompt still mentions json", async () => {
      const { client } = stubClient('{"0":"Hallo"}');

      const result = await createOpenAIProvider({
        client,
        structuredOutput: "json_object",
        systemPrompt: ({ defaultPrompt }) => `${defaultPrompt}\nBe formal.`,
      }).translate({ 0: "Hello" }, "en", "de");

      expect(result).toEqual({ 0: "Hallo" });
    });

    it("defaults the model to gpt-4o and honours an override", async () => {
      const { client, calls } = stubClient('{"0":"Hallo"}');

      await createOpenAIProvider({ client }).translate({ 0: "Hello" }, "en", "de");
      await createOpenAIProvider({ client, model: "gpt-4o-mini" }).translate(
        { 0: "Hello" },
        "en",
        "de"
      );

      expect(calls[0].model).toBe("gpt-4o");
      expect(calls[1].model).toBe("gpt-4o-mini");
    });

    // Sampling parameters used to be hardcoded on every request, which several models reject.
    it("omits sampling parameters unless they are configured", async () => {
      const { client, calls } = stubClient('{"0":"Hallo"}');

      await createOpenAIProvider({ client }).translate({ 0: "Hello" }, "en", "de");

      expect(calls[0]).not.toHaveProperty("temperature");
      expect(calls[0]).not.toHaveProperty("top_p");
      expect(calls[0]).not.toHaveProperty("frequency_penalty");
      expect(calls[0]).not.toHaveProperty("presence_penalty");
    });

    it("sends sampling parameters when configured", async () => {
      const { client, calls } = stubClient('{"0":"Hallo"}');

      await createOpenAIProvider({ client, sampling: { temperature: 0 } }).translate(
        { 0: "Hello" },
        "en",
        "de"
      );

      expect(calls[0].temperature).toBe(0);
    });

    it("sends the system prompt and the serialized input as the two messages", async () => {
      const { client, calls } = stubClient('{"0":"Hallo"}');

      await createOpenAIProvider({ client }).translate({ 0: "Hello" }, "en", "de");

      expect(calls[0].messages[0].role).toBe("system");
      expect(calls[0].messages[0].content).toContain("from en into de");
      expect(calls[0].messages[1]).toEqual({ role: "user", content: '{"0":"Hello"}' });
    });

    it("applies a systemPrompt override", async () => {
      const { client, calls } = stubClient('{"0":"Hallo"}');

      await createOpenAIProvider({
        client,
        systemPrompt: ({ defaultPrompt }) => `${defaultPrompt}\nBe formal.`,
      }).translate({ 0: "Hello" }, "en", "de");

      expect(calls[0].messages[0].content).toContain("Be formal.");
    });
  });

  // These three replaced the cases that asserted `translate` resolves to `null`. The value carried no
  // information: an editor saw one generic message for four unrelated causes.
  describe("failures name their cause", () => {
    it("throws NoContentError when the reply has no content", async () => {
      const { client } = stubClient("");

      await expect(
        createOpenAIProvider({ client }).translate({ 0: "Hello" }, "en", "de")
      ).rejects.toThrow(NoContentError);
    });

    it("throws UnparseableReplyError when the reply is not JSON", async () => {
      const { client } = stubClient("I cannot do that.");

      await expect(
        createOpenAIProvider({ client }).translate({ 0: "Hello" }, "en", "de")
      ).rejects.toThrow(UnparseableReplyError);
    });

    it("throws NoContentError when choices is empty", async () => {
      const client = emptyChoicesClient();

      await expect(
        createOpenAIProvider({ client }).translate({ 0: "Hello" }, "en", "de")
      ).rejects.toThrow(NoContentError);
    });

    it("throws KeySetMismatchError when the reply answers nothing", async () => {
      const { client } = stubClient('{"9":"Hallo"}');

      await expect(
        createOpenAIProvider({ client }).translate({ 0: "Hello" }, "en", "de")
      ).rejects.toThrow(KeySetMismatchError);
    });

    it("wraps a thrown SDK error as TransportError, keeping the original on cause", async () => {
      const boom = new Error("429 rate limited");
      const { client } = stubClient(() => {
        throw boom;
      });

      const failure = await createOpenAIProvider({ client })
        .translate({ 0: "Hello" }, "en", "de")
        .catch((e: unknown) => e);

      expect(failure).toBeInstanceOf(TransportError);
      expect((failure as TransportError).cause).toBe(boom);
    });

    // The message reaches an HTTP response body; a vendor error can carry the API key.
    it("does not copy the SDK error's text into the message it surfaces", async () => {
      const { client } = stubClient(() => {
        throw new Error("401 — key sk-test-abcdef123456");
      });

      const failure = (await createOpenAIProvider({ client })
        .translate({ 0: "Hello" }, "en", "de")
        .catch((e: unknown) => e)) as Error;

      expect(failure.message).not.toContain("sk-test-abcdef123456");
    });
  });

  describe("with an apiKey", () => {
    it("loads the SDK on first use and passes a 60s default timeout", async () => {
      const { client } = stubClient('{"0":"Hallo"}');
      loadClient.mockResolvedValue(client);

      await createOpenAIProvider({ apiKey: "sk-test" }).translate({ 0: "Hello" }, "en", "de");

      expect(loadClient).toHaveBeenCalledWith({
        apiKey: "sk-test",
        timeout: 60_000,
        maxRetries: undefined,
      });
    });

    it("lets an explicit timeout override the default", async () => {
      const { client } = stubClient('{"0":"Hallo"}');
      loadClient.mockResolvedValue(client);

      await createOpenAIProvider({ apiKey: "sk-test", timeout: 5000 }).translate(
        { 0: "Hello" },
        "en",
        "de"
      );

      expect(loadClient).toHaveBeenCalledWith(expect.objectContaining({ timeout: 5000 }));
    });

    it("does not load the SDK at construction time — only on first translate", () => {
      createOpenAIProvider({ apiKey: "sk-test" });

      expect(loadClient).not.toHaveBeenCalled();
    });

    // The memo holds the import promise, not its result: two concurrent first calls would otherwise
    // each find an unset cache and start their own import.
    it("loads the SDK once even when two first calls run concurrently", async () => {
      const { client } = stubClient('{"0":"Hallo"}');
      loadClient.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(client), 10))
      );

      const provider = createOpenAIProvider({ apiKey: "sk-test" });
      await Promise.all([
        provider.translate({ 0: "Hello" }, "en", "de"),
        provider.translate({ 0: "Hello" }, "en", "de"),
      ]);

      expect(loadClient).toHaveBeenCalledTimes(1);
    });

    // The provider is built once at config time and lives for the whole process. Memoizing a rejected
    // promise would leave one transient failure — an HMR race, a cold serverless start — breaking
    // every later translation, with the job runner's retries replaying the same stale error.
    it("retries the load after a failure instead of caching the rejection", async () => {
      const { client } = stubClient('{"0":"Hallo"}');
      loadClient.mockRejectedValueOnce(new Error("transient")).mockResolvedValue(client);

      const provider = createOpenAIProvider({ apiKey: "sk-test" });

      await expect(provider.translate({ 0: "Hello" }, "en", "de")).rejects.toThrow();
      await expect(provider.translate({ 0: "Hello" }, "en", "de")).resolves.toEqual({ 0: "Hallo" });
      expect(loadClient).toHaveBeenCalledTimes(2);
    });

    // The SDK's own guard is `apiKey === undefined`, so defaulting to "" would construct a client that
    // 401s on every request instead of saying the key is missing.
    it("passes a missing apiKey through as undefined rather than an empty string", async () => {
      const { client } = stubClient('{"0":"Hallo"}');
      loadClient.mockResolvedValue(client);

      await createOpenAIProvider({ apiKey: undefined as unknown as string }).translate(
        { 0: "Hello" },
        "en",
        "de"
      );

      expect(loadClient).toHaveBeenCalledWith(expect.objectContaining({ apiKey: undefined }));
    });

    it("does not share a client between two providers", async () => {
      const { client } = stubClient('{"0":"Hallo"}');
      loadClient.mockResolvedValue(client);

      await createOpenAIProvider({ apiKey: "sk-one" }).translate({ 0: "Hello" }, "en", "de");
      await createOpenAIProvider({ apiKey: "sk-two" }).translate({ 0: "Hello" }, "en", "de");

      expect(loadClient).toHaveBeenCalledTimes(2);
      expect(loadClient).toHaveBeenNthCalledWith(1, expect.objectContaining({ apiKey: "sk-one" }));
      expect(loadClient).toHaveBeenNthCalledWith(2, expect.objectContaining({ apiKey: "sk-two" }));
    });
  });

  describe("dry run", () => {
    it("returns reversed text without calling anything", async () => {
      const result = await createOpenAIProvider({ apiKey: "", dryRun: true }).translate(
        { 0: "Hello", 1: "World" },
        "en",
        "de"
      );

      expect(result).toEqual({ 0: "olleH", 1: "dlroW" });
    });

    // apps/dev's integration suite builds this provider with an empty key. That only works because a
    // dry run short-circuits before the SDK loader is reached.
    it("never loads the SDK, so an empty apiKey is fine", async () => {
      await createOpenAIProvider({ apiKey: "", dryRun: true }).translate(
        { 0: "Hello" },
        "en",
        "de"
      );

      expect(loadClient).not.toHaveBeenCalled();
    });

    it("uses a custom transformer", async () => {
      const result = await createOpenAIProvider({
        apiKey: "",
        dryRun: { transform: (text) => `[TRANSLATED] ${text}` },
      }).translate({ 0: "Hello" }, "en", "de");

      expect(result).toEqual({ 0: "[TRANSLATED] Hello" });
    });

    it("preserves empty and whitespace-only strings", async () => {
      const result = await createOpenAIProvider({ apiKey: "", dryRun: true }).translate(
        { 0: "", 1: "   ", 2: "Hi" },
        "en",
        "de"
      );

      expect(result).toEqual({ 0: "", 1: "   ", 2: "iH" });
    });

    it("supports an async transformer", async () => {
      const result = await createOpenAIProvider({
        apiKey: "",
        dryRun: { transform: async (text) => text.toUpperCase() },
      }).translate({ 0: "Hello" }, "en", "de");

      expect(result).toEqual({ 0: "HELLO" });
    });
  });

  describe("configuration is exclusive", () => {
    // Without the `?: never` members on each branch, TypeScript accepts an object carrying members of
    // both — one of the two would then be silently ignored at runtime. The directive below is the
    // assertion: if the union ever stops rejecting this, the now-unused directive fails the check.
    it("rejects an object carrying both apiKey and client", () => {
      const { client } = stubClient('{"0":"Hallo"}');

      // @ts-expect-error apiKey and client are mutually exclusive
      const build = () => createOpenAIProvider({ apiKey: "sk-test", client });

      expect(build).toBeTypeOf("function");
    });
  });
});

describe("OpenAITranslationProvider (deprecated class)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("still works, and produces what the factory produces", async () => {
    const { client } = stubClient('{"0":"Hallo"}');

    const fromClass = await new OpenAITranslationProvider({ client }).translate(
      { 0: "Hello" },
      "en",
      "de"
    );
    const fromFactory = await createOpenAIProvider({ client }).translate(
      { 0: "Hello" },
      "en",
      "de"
    );

    expect(fromClass).toEqual(fromFactory);
  });

  it("delegates rather than re-implementing — a dry run short-circuits there too", async () => {
    const result = await new OpenAITranslationProvider({ apiKey: "", dryRun: true }).translate(
      { 0: "Hello" },
      "en",
      "de"
    );

    expect(result).toEqual({ 0: "olleH" });
    expect(loadClient).not.toHaveBeenCalled();
  });
});
