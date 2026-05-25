import { describe, it, expect, vi, beforeEach } from "vitest";

import { OpenAITranslationProvider } from "./OpenAITranslation.provider";

// Mock OpenAI
vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
}));

describe("OpenAITranslationProvider", () => {
  let provider: OpenAITranslationProvider;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get the mocked OpenAI class
    const OpenAI = (await import("openai")).default;
    mockCreate = vi.fn();
    (OpenAI as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    }));

    provider = new OpenAITranslationProvider({ apiKey: "test-api-key" });
  });

  describe("translate", () => {
    it("calls OpenAI API with correct parameters", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '{"0": "Hallo"}' } }],
      });

      await provider.translate({ 0: "Hello" }, "en", "de");

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "system" }),
            expect.objectContaining({
              role: "user",
              content: '{"0":"Hello"}',
            }),
          ]),
          model: "gpt-4o",
          response_format: { type: "json_object" },
          temperature: 0,
        })
      );
    });

    it("returns parsed JSON response", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '{"0": "Titel", "1": "Inhalt"}' } }],
      });

      const result = await provider.translate(
        { 0: "Title", 1: "Content" },
        "en",
        "de"
      );

      expect(result).toEqual({ 0: "Titel", 1: "Inhalt" });
    });

    it("returns null when API returns empty content", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      const result = await provider.translate({ 0: "Hello" }, "en", "de");

      expect(result).toBeNull();
    });

    it("returns null when API returns invalid JSON", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "not valid json" } }],
      });

      const result = await provider.translate({ 0: "Hello" }, "en", "de");

      expect(result).toBeNull();
    });

    it("includes source language in system prompt when provided", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "{}" } }],
      });

      await provider.translate({ 0: "Hello" }, "en", "de");

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining("from en"),
              role: "system",
            }),
          ]),
        })
      );
    });
  });

  describe("dryRun mode", () => {
    describe("with dryRun: true (default transformer, no delay)", () => {
      beforeEach(async () => {
        provider = new OpenAITranslationProvider({
          apiKey: "test-key",
          dryRun: true,
        });
      });

      it("does not call OpenAI API in dry run mode", async () => {
        await provider.translate({ 0: "Hello" }, "en", "de");
        expect(mockCreate).not.toHaveBeenCalled();
      });

      it("returns mock translation with reversed text", async () => {
        const result = await provider.translate(
          { 0: "Hello World" },
          "en",
          "de"
        );
        expect(result).toEqual({ 0: "dlroW olleH" });
      });

      it("handles multiple indexed entries in dry run", async () => {
        const content = {
          0: "First text",
          1: "Second text",
          2: "Third text",
        };

        const result = await provider.translate(content, "en", "fr");

        expect(result).toEqual({
          0: "txet tsriF",
          1: "txet dnoceS",
          2: "txet drihT",
        });
      });

      it("preserves empty strings in dry run", async () => {
        const content = {
          0: "Hello",
          1: "",
          2: "World",
        };

        const result = await provider.translate(content, "en", "de");

        expect(result).toEqual({
          0: "olleH",
          1: "",
          2: "dlroW",
        });
      });

      it("handles whitespace-only strings in dry run", async () => {
        const content = {
          0: "Hello",
          1: "   ",
          2: "World",
        };

        const result = await provider.translate(content, "en", "de");

        // Whitespace-only strings are not transformed (value.trim() is empty)
        expect(result).toEqual({
          0: "olleH",
          1: "   ",
          2: "dlroW",
        });
      });
    });

    describe("with custom transformer config", () => {
      it("uses custom transformer function", async () => {
        provider = new OpenAITranslationProvider({
          apiKey: "test-key",
          dryRun: {
            transform: (text) => `[TRANSLATED] ${text}`,
          },
        });

        const result = await provider.translate(
          { 0: "Hello World" },
          "en",
          "de"
        );
        expect(result).toEqual({ 0: "[TRANSLATED] Hello World" });
      });

      it("uses custom transformer for multiple entries", async () => {
        provider = new OpenAITranslationProvider({
          apiKey: "test-key",
          dryRun: {
            transform: (text) => text.toUpperCase(),
          },
        });

        const content = {
          0: "hello",
          1: "world",
        };

        const result = await provider.translate(content, "en", "fr");

        expect(result).toEqual({
          0: "HELLO",
          1: "WORLD",
        });
      });

      it("does not call OpenAI API with custom transformer", async () => {
        provider = new OpenAITranslationProvider({
          apiKey: "test-key",
          dryRun: {
            transform: (text) => `mock: ${text}`,
          },
        });

        await provider.translate({ 0: "Test" }, "en", "de");
        expect(mockCreate).not.toHaveBeenCalled();
      });

      it("respects timeout option", async () => {
        vi.useFakeTimers();

        provider = new OpenAITranslationProvider({
          apiKey: "test-key",
          dryRun: {
            timeout: 1000,
            transform: (text) => `[T] ${text}`,
          },
        });

        const translatePromise = provider.translate({ 0: "Hello" }, "en", "de");

        // Should not resolve immediately
        await vi.advanceTimersByTimeAsync(500);

        // Advance past timeout
        await vi.advanceTimersByTimeAsync(600);

        const result = await translatePromise;
        expect(result).toEqual({ 0: "[T] Hello" });

        vi.useRealTimers();
      });

      it("supports async transformer function", async () => {
        provider = new OpenAITranslationProvider({
          apiKey: "test-key",
          dryRun: {
            transform: async (text) => {
              // Simulate async operation (e.g., external API call)
              await new Promise((resolve) => setTimeout(resolve, 10));
              return `[ASYNC] ${text}`;
            },
          },
        });

        const result = await provider.translate(
          { 0: "Hello", 1: "World" },
          "en",
          "de"
        );

        expect(result).toEqual({
          0: "[ASYNC] Hello",
          1: "[ASYNC] World",
        });
      });
    });
  });
});
