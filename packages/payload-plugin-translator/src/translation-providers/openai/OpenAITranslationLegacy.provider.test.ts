import { beforeEach, describe, expect, it, vi } from "vitest";

import { createOpenAIProvider } from "./OpenAITranslation.provider";
import { OpenAITranslationProvider } from "./OpenAITranslationLegacy.provider";
import type { OpenAIChatParams, OpenAIClientShape } from "./OpenAI.shapes";
import { loadOpenAIClient } from "./loadOpenAIClient";

vi.mock("./loadOpenAIClient", () => ({
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
