import type { Field } from "payload";
import { describe, expect, it } from "vitest";

import { everyTranslatableLeaf } from "../../domain/content-projection/contentProjector.js";
import type {
  TranslatableValue,
  TranslatedValue,
  TranslationInput,
  TranslationOutput,
  TranslationProvider,
} from "../../domain/translation-providers/index.js";
import { paragraph, richText, text } from "./fixtures/lexical.js";
import { translateContent } from "../translateContent.js";

const schema: Field[] = [
  { name: "title", type: "text", localized: true },
  { name: "body", type: "richText", localized: true },
];

const redCar = () => richText([paragraph([text("a "), text("red", 1), text(" car")])]);

type Answer = (value: TranslatableValue) => TranslatedValue | undefined;

const provider = (answer: Answer, seen: TranslationInput[] = []): TranslationProvider => ({
  translate: async (input) => {
    seen.push(input);
    const out: TranslationOutput = {};
    for (const [key, value] of Object.entries(input)) {
      const answered = answer(value);
      if (answered) out[Number(key)] = answered;
    }
    return out;
  },
});

const piecewise: Answer = (value) =>
  value.kind === "text"
    ? { kind: "text", text: value.text.toUpperCase() }
    : {
        kind: "segments",
        segments: value.segments.map((s) => ({ id: s.id, text: (s.text ?? "").toUpperCase() })),
      };

const trimmed: Answer = (value) =>
  value.kind === "segments"
    ? {
        kind: "segments",
        segments: value.segments.map((s) => ({ id: s.id, text: (s.text ?? "").trim() })),
      }
    : { kind: "text", text: value.text };

const translate = async (
  source: Record<string, unknown>,
  translationProvider: TranslationProvider
) =>
  translateContent({
    document: { collection: "docs", id: "1" },
    schema,
    sourceData: source,
    selection: everyTranslatableLeaf(source, schema),
    sourceLng: "en",
    targetLng: "fr",
    translationProvider,
  });

type Node = { text?: string; format?: number };
const nodesOf = (result: Awaited<ReturnType<typeof translate>>): Node[] => {
  if (!result.sent) throw new Error("nothing was sent");
  const body = result.translatedData.body as { root: { children: { children: Node[] }[] } };
  return body.root.children[0]?.children ?? [];
};

const failuresOf = (result: Awaited<ReturnType<typeof translate>>, idPath: string) => {
  if (!result.sent) throw new Error("nothing was sent");
  const leaf = result.leaves.find((each) => String(each.idPath) === idPath);
  return leaf && !leaf.answered ? leaf.failures.map((failure) => failure.code) : [];
};

describe("rich text crosses the port as segments", () => {
  it("sends a formatted paragraph as its numbered segments and a plain field as text", async () => {
    const seen: TranslationInput[] = [];
    await translate({ title: "Pricing", body: redCar() }, provider(piecewise, seen));

    expect(Object.values(seen[0] ?? {})).toEqual([
      { kind: "text", text: "Pricing" },
      {
        kind: "segments",
        segments: [
          { id: 1, text: "a " },
          { id: 2, text: "red" },
          { id: 3, text: " car" },
        ],
      },
    ]);
  });

  it("writes a paragraph translated piece by piece, with no marks, keeping each piece's formatting", async () => {
    const result = await translate({ title: "Pricing", body: redCar() }, provider(piecewise));

    expect(nodesOf(result).map((node) => [node.text, node.format])).toEqual([
      ["A ", 0],
      ["RED", 1],
      [" CAR", 0],
    ]);
  });

  it("gives a same-shape answer its source's edge spaces back", async () => {
    const result = await translate({ title: "Pricing", body: redCar() }, provider(trimmed));

    expect(nodesOf(result).map((node) => node.text)).toEqual(["a ", "red", " car"]);
  });

  it("checks the answer against what it sent, not against the input the provider may have edited", async () => {
    const editing: TranslationProvider = {
      translate: async (input) => {
        const out: TranslationOutput = {};
        for (const [key, value] of Object.entries(input)) {
          if (value.kind === "text") {
            out[Number(key)] = { kind: "text", text: value.text };
            continue;
          }
          (value.segments as { id: number; text: string | null }[]).splice(0, 1);
          out[Number(key)] = {
            kind: "segments",
            segments: value.segments.map((s) => ({ id: s.id, text: s.text ?? "" })),
          };
        }
        return out;
      },
    };

    const result = await translate({ title: "Pricing", body: redCar() }, editing);

    expect(failuresOf(result, "body")).toEqual(["missing-segment"]);
  });
});

describe("a value that cannot be written says why", () => {
  const refusals: [string, Answer, string][] = [
    [
      "an answer of the wrong kind",
      (v) => (v.kind === "segments" ? { kind: "text", text: "x" } : piecewise(v)),
      "wrong-kind",
    ],
    [
      "a missing segment",
      (v) =>
        v.kind === "segments"
          ? {
              kind: "segments",
              segments: [
                { id: 2, text: "rot" },
                { id: 3, text: " Auto" },
              ],
            }
          : piecewise(v),
      "missing-segment",
    ],
    [
      "an unknown segment",
      (v) =>
        v.kind === "segments"
          ? {
              kind: "segments",
              segments: [
                { id: 1, text: "a" },
                { id: 2, text: "b" },
                { id: 3, text: "c" },
                { id: 9, text: "d" },
              ],
            }
          : piecewise(v),
      "unknown-segment",
    ],
    [
      "a repeated segment",
      (v) =>
        v.kind === "segments"
          ? {
              kind: "segments",
              segments: [
                { id: 1, text: "a" },
                { id: 1, text: "b" },
                { id: 2, text: "c" },
                { id: 3, text: "d" },
              ],
            }
          : piecewise(v),
      "repeated-segment",
    ],
    [
      "segments all left empty",
      (v) =>
        v.kind === "segments"
          ? { kind: "segments", segments: v.segments.map((s) => ({ id: s.id, text: "" })) }
          : piecewise(v),
      "no-text",
    ],
    [
      "a failed answer",
      (v) => (v.kind === "segments" ? { kind: "failed", code: "refused" } : piecewise(v)),
      "refused",
    ],
    [
      "a key left out of the reply",
      (v) => (v.kind === "segments" ? undefined : piecewise(v)),
      "not-answered",
    ],
  ];

  it.each(refusals)(
    "keeps the source text for %s and records why",
    async (_label, answer, code) => {
      const result = await translate({ title: "Pricing", body: redCar() }, provider(answer));

      expect(failuresOf(result, "body")).toEqual([code]);
      expect(nodesOf(result).map((node) => node.text)).toEqual(["a ", "red", " car"]);
      if (!result.sent) throw new Error("nothing was sent");
      expect(result.translatedData.title).toBe("PRICING");
    }
  );
});

describe("a run that sends nothing says so", () => {
  it("returns sent: false rather than null", async () => {
    const result = await translate({ title: "", body: richText([]) }, provider(piecewise));

    expect(result).toEqual({ sent: false });
  });
});

describe("a provider's own reason for a failed value", () => {
  it("travels with the failure, so the log can carry it", async () => {
    const result = await translate(
      { title: "Pricing", body: redCar() },
      provider((value) =>
        value.kind === "segments"
          ? { kind: "failed", code: "refused", message: "content policy" }
          : piecewise(value)
      )
    );

    if (!result.sent) throw new Error("nothing was sent");
    const body = result.leaves.find((leaf) => String(leaf.idPath) === "body");
    expect(body).toEqual({
      idPath: "body",
      answered: false,
      failures: [{ code: "refused", message: "content policy" }],
    });
  });
});

describe("a plain value that cannot be written says why", () => {
  const titleRefusals: [string, Answer, string][] = [
    [
      "an answer of the wrong kind",
      (v) =>
        v.kind === "text" ? { kind: "segments", segments: [{ id: 1, text: "x" }] } : piecewise(v),
      "wrong-kind",
    ],
    [
      "a failed answer",
      (v) => (v.kind === "text" ? { kind: "failed", code: "refused" } : piecewise(v)),
      "refused",
    ],
    [
      "a key left out of the reply",
      (v) => (v.kind === "text" ? undefined : piecewise(v)),
      "not-answered",
    ],
  ];

  it.each(titleRefusals)(
    "keeps the source title for %s and records why",
    async (_label, answer, code) => {
      const result = await translate({ title: "Pricing", body: redCar() }, provider(answer));

      expect(failuresOf(result, "title")).toEqual([code]);
      if (!result.sent) throw new Error("nothing was sent");
      expect(result.translatedData.title).toBe("Pricing");
    }
  );
});

describe("a provider that empties its input", () => {
  it("still has its answers written: the run was sent", async () => {
    const emptying: TranslationProvider = {
      translate: async (input) => {
        const out: TranslationOutput = {};
        for (const key of Object.keys(input)) {
          const value = input[Number(key)];
          if (value) out[Number(key)] = piecewise(value) as TranslatedValue;
          Reflect.deleteProperty(input, key);
        }
        return out;
      },
    };

    const result = await translate({ title: "Pricing", body: redCar() }, emptying);

    if (!result.sent) throw new Error("the run was reported as nothing sent");
    expect(result.translatedData.title).toBe("PRICING");
  });
});
