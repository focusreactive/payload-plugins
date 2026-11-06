import { describe, expect, it } from "vitest";

import {
  inlineMarksInstruction,
  canEncodeSegments,
  decodeSegments,
  encodeSegments,
} from "../index.js";
import type { TranslationProvider } from "../index.js";

const reverseMarks = (marked: string): string =>
  [...marked.matchAll(/<(\d+)>([\s\S]*?)<\/\1>/gu)]
    .map(([, id, text]) => `<${id}>${(text ?? "").toUpperCase()}</${id}>`)
    .reverse()
    .join("");

describe("a provider built from the public mark utilities alone", () => {
  const provider: TranslationProvider = {
    async translate(input) {
      const out: Awaited<ReturnType<TranslationProvider["translate"]>> = {};
      for (const [key, value] of Object.entries(input)) {
        if (value.kind === "text") {
          out[Number(key)] = { kind: "text", text: value.text.toUpperCase() };
          continue;
        }
        if (!canEncodeSegments(value.segments)) {
          out[Number(key)] = { kind: "failed", code: "untranslatable" };
          continue;
        }
        const decoded = decodeSegments(reverseMarks(encodeSegments(value.segments)));
        out[Number(key)] = decoded.ok
          ? { kind: "segments", segments: decoded.segments }
          : { kind: "failed", code: "malformed" };
      }
      return out;
    },
  };

  it("round-trips a paragraph through marks, in the reply's order", async () => {
    const output = await provider.translate(
      {
        0: {
          kind: "segments",
          segments: [
            { id: 1, text: "a " },
            { id: 2, text: "red" },
          ],
        },
      },
      { sourceLng: "en", targetLng: "de", document: { collection: "docs", id: "1" } }
    );

    expect(output[0]).toEqual({
      kind: "segments",
      segments: [
        { id: 2, text: "RED" },
        { id: 1, text: "A " },
      ],
    });
  });

  it("refuses to encode a paragraph whose own text looks like a mark", () => {
    expect(canEncodeSegments([{ id: 1, text: "Use <1> here" }])).toBe(false);
    expect(canEncodeSegments([{ id: 1, text: "plain" }])).toBe(true);
  });

  it("ships the instruction a model needs", () => {
    expect(inlineMarksInstruction()).toMatch(/<1>/u);
  });
});
