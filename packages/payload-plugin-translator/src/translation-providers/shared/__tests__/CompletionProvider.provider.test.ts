import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTranslationProvider } from "../CompletionProvider.provider.js";
import type { CompletionRequest } from "../CompletionProvider.provider.js";
import {
  KeySetMismatchError,
  NoContentError,
  ProviderConfigurationError,
  TransportError,
  UnparseableReplyError,
} from "../errors/index.js";
import type {
  TranslationInput,
  TranslationRequest,
} from "../../../core/domain/translation-providers/index.js";

function recordingComplete(reply: string) {
  const seen: CompletionRequest[] = [];
  const complete = vi.fn(async (request: CompletionRequest) => {
    seen.push(request);
    return reply;
  });
  return { complete, seen };
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

const texts = (values: Record<number, string>): TranslationInput =>
  Object.fromEntries(
    Object.entries(values).map(([key, text]) => [key, { kind: "text", text } as const])
  );

const plainReply = (values: Record<string, unknown>): string =>
  JSON.stringify({ marked: {}, plain: values });

describe("createTranslationProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("tells a systemPrompt builder which document the request is for", async () => {
    const { complete } = recordingComplete(plainReply({ 0: "Startseite" }));
    let seenDocument: { collection: string; id: string } | undefined;

    await createTranslationProvider({
      complete,
      systemPrompt: ({ document, defaultPrompt }) => {
        seenDocument = document;
        return defaultPrompt;
      },
    }).translate(texts({ 0: "Home" }), aRequest({ document: { collection: "machines", id: "7" } }));

    expect(seenDocument).toEqual({ collection: "machines", id: "7" });
  });

  it("awaits a builder that reads something before it answers", async () => {
    const { complete, seen } = recordingComplete(plainReply({ 0: "Startseite" }));

    await createTranslationProvider({
      complete,
      systemPrompt: async ({ defaultPrompt }) => {
        await Promise.resolve();
        return `${defaultPrompt}\nGlossary: ampere = Ampere.`;
      },
    }).translate(texts({ 0: "Home" }), aRequest());

    expect(seen[0].systemPrompt).toContain("Glossary: ampere = Ampere.");
  });

  it("hands the transport a built prompt, the serialized input and a schema", async () => {
    const { complete, seen } = recordingComplete(plainReply({ 0: "Startseite" }));

    await createTranslationProvider({ complete }).translate(texts({ 0: "Home" }), aRequest());

    expect(complete).toHaveBeenCalledTimes(1);
    expect(seen[0].systemPrompt).toContain("from en into de");
    expect(seen[0].userContent).toBe('{"marked":{},"plain":{"0":"Home"}}');
    expect(seen[0].responseSchema).toEqual({
      type: "object",
      properties: {
        marked: { type: "object", properties: {}, required: [], additionalProperties: false },
        plain: {
          type: "object",
          properties: { "0": { type: "string" } },
          required: ["0"],
          additionalProperties: false,
        },
      },
      required: ["marked", "plain"],
      additionalProperties: false,
    });
  });

  it("returns the parsed translations", async () => {
    const { complete } = recordingComplete(plainReply({ 0: "Startseite", 1: "Über uns" }));

    const result = await createTranslationProvider({ complete }).translate(
      texts({ 0: "Home", 1: "About us" }),
      aRequest()
    );

    expect(result).toEqual({
      0: { kind: "text", text: "Startseite" },
      1: { kind: "text", text: "Über uns" },
    });
  });

  it("applies a partial reply, keeping only the fields that came back", async () => {
    const { complete } = recordingComplete(plainReply({ 0: "Startseite", 2: "Kontakt" }));

    const result = await createTranslationProvider({ complete }).translate(
      texts({ 0: "Home", 1: "About us", 2: "Contact" }),
      aRequest()
    );

    expect(result).toEqual({
      0: { kind: "text", text: "Startseite" },
      2: { kind: "text", text: "Kontakt" },
    });
  });

  it("passes a systemPrompt override through to the transport", async () => {
    const { complete, seen } = recordingComplete(plainReply({ 0: "x" }));

    await createTranslationProvider({
      complete,
      systemPrompt: ({ defaultPrompt }) => `${defaultPrompt}\nBe formal.`,
    }).translate(texts({ 0: "Home" }), aRequest());

    expect(seen[0].systemPrompt).toContain("Be formal.");
  });

  it("throws NoContentError on an empty reply", async () => {
    const { complete } = recordingComplete("");

    await expect(
      createTranslationProvider({ complete }).translate(texts({ 0: "Home" }), aRequest())
    ).rejects.toThrow(NoContentError);
  });

  it("throws UnparseableReplyError when the transport returns prose", async () => {
    const { complete } = recordingComplete("I cannot do that.");

    await expect(
      createTranslationProvider({ complete }).translate(texts({ 0: "Home" }), aRequest())
    ).rejects.toThrow(UnparseableReplyError);
  });

  it("throws KeySetMismatchError when the reply answers nothing", async () => {
    const { complete } = recordingComplete(plainReply({ 9: "x" }));

    await expect(
      createTranslationProvider({ complete }).translate(texts({ 0: "Home" }), aRequest())
    ).rejects.toThrow(KeySetMismatchError);
  });

  it("wraps whatever the transport throws as TransportError", async () => {
    const boom = new Error("connection refused");
    const complete = vi.fn(async () => {
      throw boom;
    });

    const failure = await createTranslationProvider({ complete })
      .translate(texts({ 0: "Home" }), aRequest())
      .catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(TransportError);
    expect((failure as TransportError).cause).toBe(boom);
  });

  it("parses the reply itself rather than trusting the transport", async () => {
    const { complete } = recordingComplete(plainReply({ 0: "Startseite" }));

    const result = await createTranslationProvider({ complete }).translate(
      texts({ 0: "Home" }),
      aRequest()
    );

    expect(result).toEqual({ 0: { kind: "text", text: "Startseite" } });
  });

  describe("consumer callbacks cannot escape the taxonomy", () => {
    it("reports an input that cannot be serialized as a configuration failure", async () => {
      const { complete } = recordingComplete(plainReply({ 0: "x" }));
      const unserializable = {
        0: { kind: "text", text: BigInt(1) },
      } as unknown as TranslationInput;

      await expect(
        createTranslationProvider({ complete }).translate(unserializable, aRequest())
      ).rejects.toThrow(ProviderConfigurationError);
    });

    it("reports a throwing systemPrompt builder as a configuration failure", async () => {
      const { complete } = recordingComplete(plainReply({ 0: "x" }));

      await expect(
        createTranslationProvider({
          complete,
          systemPrompt: () => {
            throw new Error("prompt builder blew up");
          },
        }).translate(texts({ 0: "Home" }), aRequest())
      ).rejects.toThrow(ProviderConfigurationError);
    });
  });

  it("ignores a key that was never requested, and keeps the one that was", async () => {
    const { complete } = recordingComplete(plainReply({ 0: "Startseite", note: "done" }));

    const result = await createTranslationProvider({ complete }).translate(
      texts({ 0: "Home" }),
      aRequest()
    );

    expect(result).toEqual({ 0: { kind: "text", text: "Startseite" } });
  });

  it("short-circuits empty input without calling the transport", async () => {
    const { complete } = recordingComplete("unused");

    const result = await createTranslationProvider({ complete }).translate({}, aRequest());

    expect(complete).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });
});
