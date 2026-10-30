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
    inlineMarks: false,
    ...over,
  };
}

describe("OpenAITranslationProvider (deprecated class)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("still works, and produces what the factory produces", async () => {
    const { client } = stubClient('{"0":"Hallo"}');

    const fromClass = await new OpenAITranslationProvider({ client }).translate(
      { 0: "Hello" },
      aRequest()
    );
    const fromFactory = await createOpenAIProvider({ client }).translate(
      { 0: "Hello" },
      aRequest()
    );

    expect(fromClass).toEqual(fromFactory);
  });

  it("delegates rather than re-implementing — a dry run short-circuits there too", async () => {
    const result = await new OpenAITranslationProvider({ apiKey: "", dryRun: true }).translate(
      { 0: "Hello" },
      aRequest()
    );

    expect(result).toEqual({ 0: "olleH" });
    expect(loadClient).not.toHaveBeenCalled();
  });

  it("reports the same capabilities as the factory it wraps", () => {
    const provider = new OpenAITranslationProvider({ apiKey: "sk-test" });

    expect(provider.capabilities?.inlineMarks).toBe(true);
  });
});
