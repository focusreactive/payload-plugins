import { describe, expect, it } from "vitest";

import { createTranslationProvider } from "../AskModel.provider.js";
import { KeySetMismatchError } from "../errors/index.js";
import { inlineMarksInstruction } from "../wire/index.js";
import { recordingAsk } from "./fixtures/askModel.js";
import type { ModelRequest } from "../AskModel.provider.js";
import type {
  TranslationInput,
  TranslationRequest,
} from "../../../core/domain/translation-providers/index.js";

const request: TranslationRequest = {
  sourceLng: "en",
  targetLng: "de",
  document: { collection: "docs", id: "1" },
};

const replying = (reply: unknown) => recordingAsk(JSON.stringify(reply));

const sentContent = (seen: ModelRequest[]) =>
  JSON.parse(seen[0]?.userContent ?? "{}") as {
    marked: Record<string, string>;
    plain: Record<string, string>;
  };

const input: TranslationInput = {
  0: { kind: "text", text: "Compare <1> and <2> plans" },
  1: {
    kind: "segments",
    segments: [
      { id: 1, text: "a " },
      { id: 2, text: "red" },
      { id: 3, text: " car" },
    ],
  },
  2: {
    kind: "segments",
    segments: [
      { id: 1, text: "Use <1> " },
      { id: 2, text: "here" },
    ],
  },
};

describe("the built-in provider sends marked and plain values apart", () => {
  it("puts an encodable paragraph under marked, and plain text — even text that looks like a mark — under plain", async () => {
    const { askModel, seen } = replying({ marked: {}, plain: { 0: "Vergleich" } });

    await createTranslationProvider({ askModel }).translate(input, request);

    const content = sentContent(seen);
    expect(content.marked).toEqual({ 1: "<1>a </1><2>red</2><3> car</3>" });
    expect(content.plain).toEqual({
      0: "Compare <1> and <2> plans",
      "2.1": "Use <1> ",
      "2.2": "here",
    });
  });

  it("tells the model that marks appear only in the marked section", async () => {
    const { askModel, seen } = replying({ marked: {}, plain: { 0: "Vergleich" } });

    await createTranslationProvider({ askModel }).translate(input, request);

    expect(seen[0]?.systemPrompt).toContain(inlineMarksInstruction());
  });

  it("leaves the mark instruction out when nothing is sent marked", async () => {
    const { askModel, seen } = replying({ marked: {}, plain: { 0: "Vergleich" } });

    await createTranslationProvider({ askModel }).translate(
      { 0: { kind: "text", text: "Compare" } },
      request
    );

    expect(seen[0]?.systemPrompt).not.toContain(inlineMarksInstruction());
  });

  it("leaves out a paragraph sent in pieces when one of its pieces was not answered", async () => {
    const { askModel } = replying({
      marked: { 1: "<1>ein </1><2>rotes</2><3> Auto</3>" },
      plain: { 0: "Vergleich", "2.1": "Nutze <1> " },
    });

    const output = await createTranslationProvider({ askModel }).translate(input, request);

    expect(2 in output).toBe(false);
    expect(output[1]?.kind).toBe("segments");
  });

  it("answers each value in its own kind, a paragraph it could not encode assembled from its pieces", async () => {
    const { askModel } = replying({
      marked: { 1: "<2>rotes</2><1>ein </1><3> Auto</3>" },
      plain: { 0: "Vergleichen Sie <1> und <2>", "2.1": "Nutze <1> ", "2.2": "hier" },
    });

    const output = await createTranslationProvider({ askModel }).translate(input, request);

    expect(output).toEqual({
      0: { kind: "text", text: "Vergleichen Sie <1> und <2>" },
      1: {
        kind: "segments",
        segments: [
          { id: 2, text: "rotes" },
          { id: 1, text: "ein " },
          { id: 3, text: " Auto" },
        ],
      },
      2: {
        kind: "segments",
        segments: [
          { id: 1, text: "Nutze <1> " },
          { id: 2, text: "hier" },
        ],
      },
    });
  });

  it("answers failed for a marked reply it cannot read, and leaves out a key the model did not answer", async () => {
    const { askModel } = replying({
      marked: { 1: "<1>ein <2>rotes</2></1>" },
      plain: { 0: "Vergleich" },
    });

    const output = await createTranslationProvider({ askModel }).translate(input, request);

    expect(output[1]).toEqual({ kind: "failed", code: "malformed" });
    expect(output[0]).toEqual({ kind: "text", text: "Vergleich" });
    expect(2 in output).toBe(false);
  });

  it("fails the whole call when no value could be assembled, even though some piece came back", async () => {
    const { askModel } = replying({ marked: {}, plain: { "2.1": "Nutze <1> " } });

    await expect(
      createTranslationProvider({ askModel }).translate(
        { 2: input[2] as TranslationInput[number] },
        request
      )
    ).rejects.toBeInstanceOf(KeySetMismatchError);
  });
});
