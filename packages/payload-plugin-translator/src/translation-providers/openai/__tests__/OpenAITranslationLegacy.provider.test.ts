import { beforeEach, describe, expect, it, vi } from "vitest";

import { createOpenAIProvider } from "../OpenAITranslation.provider.js";
import { OpenAITranslationProvider } from "../OpenAITranslationLegacy.provider.js";
import type { OpenAIChatParams, OpenAIClientShape } from "../OpenAI.shapes.js";
import { loadOpenAIClient } from "../loadOpenAIClient.js";
import type { TranslationRequest } from "../../../core/domain/translation-providers/index.js";

vi.mock("../loadOpenAIClient.js", () => ({
  loadOpenAIClient: vi.fn(),
}));

const loadClient = vi.mocked(loadOpenAIClient);

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
const HALLO_REPLY = '{"marked":{},"plain":{"0":"Hallo"}}';

describe("OpenAITranslationProvider (deprecated class)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("still works, and produces what the factory produces", async () => {
    const { client } = stubClient(HALLO_REPLY);

    const fromClass = await new OpenAITranslationProvider({ client }).translate(HELLO, aRequest());
    const fromFactory = await createOpenAIProvider({ client }).translate(HELLO, aRequest());

    expect(fromClass).toEqual({ 0: { kind: "text", text: "Hallo" } });
    expect(fromClass).toEqual(fromFactory);
  });

  it("delegates rather than re-implementing — the factory's lazy SDK load and default timeout apply", async () => {
    const { client } = stubClient(HALLO_REPLY);
    loadClient.mockResolvedValue(client);

    const result = await new OpenAITranslationProvider({ apiKey: "sk-test" }).translate(
      HELLO,
      aRequest()
    );

    expect(result).toEqual({ 0: { kind: "text", text: "Hallo" } });
    expect(loadClient).toHaveBeenCalledWith({
      apiKey: "sk-test",
      timeout: 60_000,
      maxRetries: undefined,
    });
  });
});
