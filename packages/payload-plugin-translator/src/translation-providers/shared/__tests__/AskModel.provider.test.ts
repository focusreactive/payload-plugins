import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTranslationProvider } from "../AskModel.provider.js";
import {
  KeySetMismatchError,
  NoContentError,
  ProviderConfigurationError,
  TransportError,
  UnparseableReplyError,
} from "../errors/index.js";
import type { TranslationInput } from "../../../core/domain/translation-providers/index.js";
import { aRequest, plainReply, recordingAsk, texts } from "./fixtures/askModel.js";

describe("createTranslationProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("tells a systemPrompt builder which document the request is for", async () => {
    const { askModel } = recordingAsk(plainReply({ 0: "Startseite" }));
    let seenDocument: { collection: string; id: string } | undefined;

    await createTranslationProvider({
      askModel,
      systemPrompt: ({ document, defaultPrompt }) => {
        seenDocument = document;
        return defaultPrompt;
      },
    }).translate(texts({ 0: "Home" }), aRequest({ document: { collection: "machines", id: "7" } }));

    expect(seenDocument).toEqual({ collection: "machines", id: "7" });
  });

  it("awaits a builder that reads something before it answers", async () => {
    const { askModel, seen } = recordingAsk(plainReply({ 0: "Startseite" }));

    await createTranslationProvider({
      askModel,
      systemPrompt: async ({ defaultPrompt }) => {
        await Promise.resolve();
        return `${defaultPrompt}\nGlossary: ampere = Ampere.`;
      },
    }).translate(texts({ 0: "Home" }), aRequest());

    expect(seen[0].systemPrompt).toContain("Glossary: ampere = Ampere.");
  });

  it("hands the transport a built prompt, the serialized input and a schema", async () => {
    const { askModel, seen } = recordingAsk(plainReply({ 0: "Startseite" }));

    await createTranslationProvider({ askModel }).translate(texts({ 0: "Home" }), aRequest());

    expect(askModel).toHaveBeenCalledTimes(1);
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
    const { askModel } = recordingAsk(plainReply({ 0: "Startseite", 1: "Über uns" }));

    const result = await createTranslationProvider({ askModel }).translate(
      texts({ 0: "Home", 1: "About us" }),
      aRequest()
    );

    expect(result).toEqual({
      0: { kind: "text", text: "Startseite" },
      1: { kind: "text", text: "Über uns" },
    });
  });

  it("applies a partial reply, keeping only the fields that came back", async () => {
    const { askModel } = recordingAsk(plainReply({ 0: "Startseite", 2: "Kontakt" }));

    const result = await createTranslationProvider({ askModel }).translate(
      texts({ 0: "Home", 1: "About us", 2: "Contact" }),
      aRequest()
    );

    expect(result).toEqual({
      0: { kind: "text", text: "Startseite" },
      2: { kind: "text", text: "Kontakt" },
    });
  });

  it("passes a systemPrompt override through to the transport", async () => {
    const { askModel, seen } = recordingAsk(plainReply({ 0: "x" }));

    await createTranslationProvider({
      askModel,
      systemPrompt: ({ defaultPrompt }) => `${defaultPrompt}\nBe formal.`,
    }).translate(texts({ 0: "Home" }), aRequest());

    expect(seen[0].systemPrompt).toContain("Be formal.");
  });

  it("throws NoContentError on an empty reply", async () => {
    const { askModel } = recordingAsk("");

    await expect(
      createTranslationProvider({ askModel }).translate(texts({ 0: "Home" }), aRequest())
    ).rejects.toThrow(NoContentError);
  });

  it("throws UnparseableReplyError when the transport returns prose", async () => {
    const { askModel } = recordingAsk("I cannot do that.");

    await expect(
      createTranslationProvider({ askModel }).translate(texts({ 0: "Home" }), aRequest())
    ).rejects.toThrow(UnparseableReplyError);
  });

  it("throws KeySetMismatchError when the reply answers nothing", async () => {
    const { askModel } = recordingAsk(plainReply({ 9: "x" }));

    await expect(
      createTranslationProvider({ askModel }).translate(texts({ 0: "Home" }), aRequest())
    ).rejects.toThrow(KeySetMismatchError);
  });

  it("wraps whatever the transport throws as TransportError", async () => {
    const boom = new Error("connection refused");
    const askModel = vi.fn(async () => {
      throw boom;
    });

    const failure = await createTranslationProvider({ askModel })
      .translate(texts({ 0: "Home" }), aRequest())
      .catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(TransportError);
    expect((failure as TransportError).cause).toBe(boom);
  });

  it("parses the reply itself rather than trusting the transport", async () => {
    const { askModel } = recordingAsk(plainReply({ 0: "Startseite" }));

    const result = await createTranslationProvider({ askModel }).translate(
      texts({ 0: "Home" }),
      aRequest()
    );

    expect(result).toEqual({ 0: { kind: "text", text: "Startseite" } });
  });

  describe("consumer callbacks cannot escape the taxonomy", () => {
    it("reports an input that cannot be serialized as a configuration failure", async () => {
      const { askModel } = recordingAsk(plainReply({ 0: "x" }));
      const unserializable = {
        0: { kind: "text", text: BigInt(1) },
      } as unknown as TranslationInput;

      await expect(
        createTranslationProvider({ askModel }).translate(unserializable, aRequest())
      ).rejects.toThrow(ProviderConfigurationError);
    });

    it("reports a throwing systemPrompt builder as a configuration failure", async () => {
      const { askModel } = recordingAsk(plainReply({ 0: "x" }));

      await expect(
        createTranslationProvider({
          askModel,
          systemPrompt: () => {
            throw new Error("prompt builder blew up");
          },
        }).translate(texts({ 0: "Home" }), aRequest())
      ).rejects.toThrow(ProviderConfigurationError);
    });
  });

  it("ignores a key that was never requested, and keeps the one that was", async () => {
    const { askModel } = recordingAsk(plainReply({ 0: "Startseite", note: "done" }));

    const result = await createTranslationProvider({ askModel }).translate(
      texts({ 0: "Home" }),
      aRequest()
    );

    expect(result).toEqual({ 0: { kind: "text", text: "Startseite" } });
  });

  it("short-circuits empty input without calling the transport", async () => {
    const { askModel } = recordingAsk("unused");

    const result = await createTranslationProvider({ askModel }).translate({}, aRequest());

    expect(askModel).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });
});
