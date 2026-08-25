import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTranslationProvider } from "./CompletionProvider.provider";
import type { CompletionRequest } from "./CompletionProvider.provider";
import {
  KeySetMismatchError,
  NoContentError,
  ProviderConfigurationError,
  TransportError,
  UnparseableReplyError,
} from "./errors";

function recordingComplete(reply: string) {
  const seen: CompletionRequest[] = [];
  const complete = vi.fn(async (request: CompletionRequest) => {
    seen.push(request);
    return reply;
  });
  return { complete, seen };
}

describe("createTranslationProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("hands the transport a built prompt, the serialized input and a schema", async () => {
    const { complete, seen } = recordingComplete('{"0":"Startseite"}');

    await createTranslationProvider({ complete }).translate({ 0: "Home" }, "en", "de");

    expect(complete).toHaveBeenCalledTimes(1);
    expect(seen[0].systemPrompt).toContain("from en into de");
    expect(seen[0].userContent).toBe('{"0":"Home"}');
    expect(seen[0].responseSchema).toEqual({
      type: "object",
      properties: { "0": { type: "string" } },
      required: ["0"],
      additionalProperties: false,
    });
  });

  it("returns the parsed translations", async () => {
    const { complete } = recordingComplete('{"0":"Startseite","1":"Über uns"}');

    const result = await createTranslationProvider({ complete }).translate(
      { 0: "Home", 1: "About us" },
      "en",
      "de"
    );

    expect(result).toEqual({ 0: "Startseite", 1: "Über uns" });
  });

  it("applies a partial reply and warns, naming the untranslated index", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { complete } = recordingComplete('{"0":"Startseite","2":"Kontakt"}');

    const result = await createTranslationProvider({ complete }).translate(
      { 0: "Home", 1: "About us", 2: "Contact" },
      "en",
      "de"
    );

    expect(result).toEqual({ 0: "Startseite", 2: "Kontakt" });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0].join(" "))).toContain("1");
  });

  it("stays quiet when the reply is complete", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { complete } = recordingComplete('{"0":"Startseite"}');

    await createTranslationProvider({ complete }).translate({ 0: "Home" }, "en", "de");

    expect(warn).not.toHaveBeenCalled();
  });

  it("passes a systemPrompt override through to the transport", async () => {
    const { complete, seen } = recordingComplete('{"0":"x"}');

    await createTranslationProvider({
      complete,
      systemPrompt: ({ defaultPrompt }) => `${defaultPrompt}\nBe formal.`,
    }).translate({ 0: "Home" }, "en", "de");

    expect(seen[0].systemPrompt).toContain("Be formal.");
  });

  it("throws NoContentError on an empty reply", async () => {
    const { complete } = recordingComplete("");

    await expect(
      createTranslationProvider({ complete }).translate({ 0: "Home" }, "en", "de")
    ).rejects.toThrow(NoContentError);
  });

  it("throws UnparseableReplyError when the transport returns prose", async () => {
    const { complete } = recordingComplete("I cannot do that.");

    await expect(
      createTranslationProvider({ complete }).translate({ 0: "Home" }, "en", "de")
    ).rejects.toThrow(UnparseableReplyError);
  });

  it("throws KeySetMismatchError when the reply answers nothing", async () => {
    const { complete } = recordingComplete('{"9":"x"}');

    await expect(
      createTranslationProvider({ complete }).translate({ 0: "Home" }, "en", "de")
    ).rejects.toThrow(KeySetMismatchError);
  });

  it("wraps whatever the transport throws as TransportError", async () => {
    const boom = new Error("connection refused");
    const complete = vi.fn(async () => {
      throw boom;
    });

    const failure = await createTranslationProvider({ complete })
      .translate({ 0: "Home" }, "en", "de")
      .catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(TransportError);
    expect((failure as TransportError).cause).toBe(boom);
  });

  // A consumer of this factory supplies only the transport, so there is no way for them to hand back
  // an already-parsed object and have their parsing stand in for ours.
  it("parses the reply itself rather than trusting the transport", async () => {
    const { complete } = recordingComplete('{"0":"Startseite"}');

    const result = await createTranslationProvider({ complete }).translate(
      { 0: "Home" },
      "en",
      "de"
    );

    expect(typeof result).toBe("object");
    expect(result).not.toBe('{"0":"Startseite"}');
  });

  describe("dry run", () => {
    it("never reaches the transport", async () => {
      const { complete } = recordingComplete('{"0":"unused"}');

      const result = await createTranslationProvider({ complete, dryRun: true }).translate(
        { 0: "Home" },
        "en",
        "de"
      );

      expect(complete).not.toHaveBeenCalled();
      expect(result).toEqual({ 0: "emoH" });
    });

    it("uses a custom transformer", async () => {
      const { complete } = recordingComplete("unused");

      const result = await createTranslationProvider({
        complete,
        dryRun: { transform: (t) => `[T] ${t}` },
      }).translate({ 0: "Home" }, "en", "de");

      expect(result).toEqual({ 0: "[T] Home" });
    });
  });

  // Consumer callbacks are the one place an untyped throw could escape the taxonomy. They are
  // classified as configuration failures, not transport ones — nothing was sent.
  describe("consumer callbacks cannot escape the taxonomy", () => {
    it("reports a throwing dry-run transformer as a configuration failure", async () => {
      const { complete } = recordingComplete("unused");

      await expect(
        createTranslationProvider({
          complete,
          dryRun: {
            transform: () => {
              throw new Error("transformer blew up");
            },
          },
        }).translate({ 0: "Home" }, "en", "de")
      ).rejects.toThrow(ProviderConfigurationError);
    });

    it("reports a throwing systemPrompt builder as a configuration failure", async () => {
      const { complete } = recordingComplete('{"0":"x"}');

      await expect(
        createTranslationProvider({
          complete,
          systemPrompt: () => {
            throw new Error("prompt builder blew up");
          },
        }).translate({ 0: "Home" }, "en", "de")
      ).rejects.toThrow(ProviderConfigurationError);
    });
  });

  it("does not claim untranslated fields when only an extra key came back", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { complete } = recordingComplete('{"0":"Startseite","note":"done"}');

    await createTranslationProvider({ complete }).translate({ 0: "Home" }, "en", "de");

    expect(warn).toHaveBeenCalledTimes(1);
    const warned = String(warn.mock.calls[0].join(" "));
    expect(warned).not.toContain("Untranslated indices");
    // The headline must not claim missing coverage either — this reply covered every field.
    expect(warned).not.toContain("did not cover every field");
  });

  it("short-circuits empty input without calling the transport", async () => {
    const { complete } = recordingComplete("unused");

    const result = await createTranslationProvider({ complete }).translate({}, "en", "de");

    expect(complete).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });
});
