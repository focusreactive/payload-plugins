import type { Field } from "payload";
import { describe, expect, it, vi } from "vitest";
import type {
  SegmentId,
  TranslatableValue,
  TranslatedValue,
  TranslationInput,
  TranslationOutput,
  TranslationProvider,
} from "../../domain/translation-providers/index.js";
import { link, paragraph, richText, text } from "./fixtures/lexical.js";
import { translateContent } from "../translateContent.js";
import type { TranslateContentArgs } from "../translateContent.js";
import type { PipelineResult } from "../types/index.js";
import { everyTranslatableLeaf } from "../../domain/content-projection/contentProjector.js";

const translateAll = (args: Omit<TranslateContentArgs, "selection">) =>
  translateContent({
    ...args,
    selection: everyTranslatableLeaf(args.sourceData, args.schema),
  });

const schema: Field[] = [{ name: "body", type: "richText", localized: true }];

const mixedSchema: Field[] = [
  { name: "body", type: "richText", localized: true },
  { name: "title", type: "text", localized: true },
];

const bracketTextKeepSegments = (value: TranslatableValue): TranslatedValue =>
  value.kind === "text"
    ? { kind: "text", text: `[${value.text}]` }
    : {
        kind: "segments",
        segments: value.segments.map((segment) => ({ id: segment.id, text: segment.text ?? "" })),
      };

const bracketProvider = () => {
  const sent: TranslationInput[] = [];
  const provider: TranslationProvider = {
    translate: vi.fn(async (input: TranslationInput) => {
      sent.push(structuredClone(input));
      const out: TranslationOutput = {};
      for (const [key, value] of Object.entries(input))
        out[Number(key)] = bracketTextKeepSegments(value);
      return out;
    }),
  };
  return { provider, sent };
};

const answeringTheOnlyValue = (...segments: [SegmentId, string][]): TranslationProvider => ({
  translate: vi.fn(async () => ({
    0: { kind: "segments", segments: segments.map(([id, said]) => ({ id, text: said })) } as const,
  })),
});

const asSegments = (...pieces: string[]): TranslatableValue => ({
  kind: "segments",
  segments: pieces.map((piece, at) => ({ id: at + 1, text: piece })),
});

const asText = (value: string): TranslatableValue => ({ kind: "text", text: value });

const RED_CAR = asSegments("a ", "red", " car");

type Wrapper = { type: string; fields?: { url?: string }; children?: { text?: string }[] };
type Paragraph = { children: ({ text?: string } & Partial<Wrapper>)[] };

const paragraphsOf = (result: PipelineResult): Paragraph[] => {
  if (!result.sent) throw new Error("translateContent sent nothing");
  return (result.translatedData.body as { root: { children: Paragraph[] } }).root.children;
};

describe("container mode", () => {
  it("sends a formatted paragraph as its numbered segments", async () => {
    const { provider, sent } = bracketProvider();
    const source = {
      body: richText([paragraph([text("a "), text("red", 1), text(" car")])]),
    };

    await translateAll({
      document: { collection: "docs", id: "1" },
      schema,
      sourceData: source,
      sourceLng: "en",
      targetLng: "fr",
      translationProvider: provider,
    });

    expect(Object.values(sent[0] ?? {})).toEqual([RED_CAR]);
  });

  it("rebuilds children in the reply's order when segments move", async () => {
    const provider = answeringTheOnlyValue([1, "une "], [3, "voiture "], [2, "rouge"]);
    const source = {
      body: richText([paragraph([text("a "), text("red", 1), text(" car")])]),
    };

    const result = await translateAll({
      document: { collection: "docs", id: "1" },
      schema,
      sourceData: source,
      sourceLng: "en",
      targetLng: "fr",
      translationProvider: provider,
    });

    expect(paragraphsOf(result)[0]?.children.map((node) => node.text)).toEqual([
      "une ",
      "voiture ",
      "rouge",
    ]);
  });

  it("translates the caller's paragraph without touching its nodes", async () => {
    const nodes = [text("a "), text("red", 1), text(" car")];
    const provider = answeringTheOnlyValue([1, "une "], [2, "rouge"], [3, " voiture"]);

    const result = await translateAll({
      document: { collection: "docs", id: "1" },
      schema,
      sourceData: { body: richText([paragraph(nodes)]) },
      sourceLng: "en",
      targetLng: "fr",
      translationProvider: provider,
    });

    expect(paragraphsOf(result)[0]?.children.map((node) => node.text)).toEqual([
      "une ",
      "rouge",
      " voiture",
    ]);
    expect(nodes.map((node) => node.text)).toEqual(["a ", "red", " car"]);
    expect(paragraphsOf(result)[0]?.children[1]).not.toBe(nodes[1]);
  });

  // The point of the whole mode: a wrapper has to travel with the word it formats, so the rebuilt
  // array must carry the wrapper node itself, never the bare leaf inside it.
  it("moves a link with its word when the reply reorders them", async () => {
    const provider = answeringTheOnlyValue([2, "Dokumentation"], [1, " lesen"]);

    const result = await translateAll({
      document: { collection: "docs", id: "1" },
      schema,
      sourceData: {
        body: richText([paragraph([text("Read the "), link("/docs", [text("docs")])])]),
      },
      sourceLng: "en",
      targetLng: "de",
      translationProvider: provider,
    });

    const children = paragraphsOf(result)[0]?.children;

    expect(children?.[0]?.type).toBe("link");
    expect(children?.[0]?.fields?.url).toBe("/docs");
    expect(children?.[0]?.children?.[0]?.text).toBe("Dokumentation");
    expect(children?.[1]?.text).toBe(" lesen");
  });

  it("drops the node of a segment that came back empty", async () => {
    const provider = answeringTheOnlyValue([1, "une voiture rouge"], [2, ""], [3, ""]);

    const result = await translateAll({
      document: { collection: "docs", id: "1" },
      schema,
      sourceData: { body: richText([paragraph([text("a "), text("red", 1), text(" car")])]) },
      sourceLng: "en",
      targetLng: "fr",
      translationProvider: provider,
    });

    expect(paragraphsOf(result)[0]?.children.map((node) => node.text)).toEqual([
      "une voiture rouge",
    ]);
  });

  it("sends a paragraph whose text looks like a mark as segments, like any other", async () => {
    const { provider, sent } = bracketProvider();
    const source = {
      body: richText([
        paragraph([text("use "), text("<1>", 1), text(" as a placeholder")]),
        paragraph([text("a "), text("red", 1), text(" car")]),
      ]),
    };

    const result = await translateAll({
      document: { collection: "docs", id: "1" },
      schema,
      sourceData: source,
      sourceLng: "en",
      targetLng: "fr",
      translationProvider: provider,
    });

    expect(Object.values(sent[0] ?? {})).toEqual([
      asSegments("use ", "<1>", " as a placeholder"),
      RED_CAR,
    ]);
    expect(paragraphsOf(result)[0]?.children.map((node) => node.text)).toEqual([
      "use ",
      "<1>",
      " as a placeholder",
    ]);
  });

  it("falls back to per-node for a single-fragment container", async () => {
    const { provider, sent } = bracketProvider();
    const source = {
      body: richText([
        paragraph([text("Sign up now")]),
        paragraph([text("a "), text("red", 1), text(" car")]),
      ]),
    };

    await translateAll({
      document: { collection: "docs", id: "1" },
      schema,
      sourceData: source,
      sourceLng: "en",
      targetLng: "fr",
      translationProvider: provider,
    });

    expect(Object.values(sent[0] ?? {})).toEqual([asText("Sign up now"), RED_CAR]);
  });

  // The glued whitespace node has no fragment, so it is absent from the rebuilt array. Were it
  // left in place beside the neighbour that swallowed its space, the space would render twice.
  it("does not double a glued space", async () => {
    const provider = answeringTheOnlyValue([1, "Achetez "], [2, "notre produit"]);

    const result = await translateAll({
      document: { collection: "docs", id: "1" },
      schema,
      sourceData: {
        body: richText([paragraph([text("Buy"), text(" "), text("our product", 1)])]),
      },
      sourceLng: "en",
      targetLng: "fr",
      translationProvider: provider,
    });

    expect(paragraphsOf(result)[0]?.children.map((node) => node.text)).toEqual([
      "Achetez ",
      "notre produit",
    ]);
  });

  it("writes a fallen-back paragraph node by node, beside a container, without flattening its link", async () => {
    const { provider, sent } = bracketProvider();

    const result = await translateAll({
      document: { collection: "docs", id: "1" },
      schema,
      sourceData: {
        body: richText([
          paragraph([link("/docs", [text("here")])]),
          paragraph([text("a "), text("red", 1), text(" car")]),
        ]),
      },
      sourceLng: "en",
      targetLng: "fr",
      translationProvider: provider,
    });

    expect(Object.values(sent[0] ?? {})).toEqual([asText("here"), RED_CAR]);
    const [fallenBack, container] = paragraphsOf(result);
    expect(fallenBack?.children).toEqual([
      expect.objectContaining({
        type: "link",
        fields: { url: "/docs", linkType: "custom" },
        children: [expect.objectContaining({ type: "text", text: "[here]" })],
      }),
    ]);
    expect(container?.children.map((node) => node.text)).toEqual(["a ", "red", " car"]);
  });

  it("takes the whole field per-node when every container is skipped", async () => {
    const { provider, sent } = bracketProvider();
    const source = {
      body: richText([paragraph([text("Sign up now")]), paragraph([text("No card needed")])]),
    };

    await translateAll({
      document: { collection: "docs", id: "1" },
      schema,
      sourceData: source,
      sourceLng: "en",
      targetLng: "fr",
      translationProvider: provider,
    });

    expect(Object.values(sent[0] ?? {})).toEqual([asText("Sign up now"), asText("No card needed")]);
  });

  it("leaves a plain text field to the plain expander", async () => {
    const { provider, sent } = bracketProvider();

    await translateAll({
      document: { collection: "docs", id: "1" },
      schema: mixedSchema,
      sourceData: {
        body: richText([paragraph([text("a "), text("red", 1), text(" car")])]),
        title: "Weather data",
      },
      sourceLng: "en",
      targetLng: "fr",
      translationProvider: provider,
    });

    expect(Object.values(sent[0] ?? {})).toEqual([RED_CAR, asText("Weather data")]);
  });

  it("leaves the container untranslated when a segment is missing from the reply", async () => {
    const provider = answeringTheOnlyValue([1, "une "], [2, "rouge"]);

    const result = await translateAll({
      document: { collection: "docs", id: "1" },
      schema,
      sourceData: { body: richText([paragraph([text("a "), text("red", 1), text(" car")])]) },
      sourceLng: "en",
      targetLng: "fr",
      translationProvider: provider,
    });

    expect(paragraphsOf(result)[0]?.children.map((node) => node.text)).toEqual([
      "a ",
      "red",
      " car",
    ]);
    expect(result.sent && result.leaves).toEqual([
      { idPath: "body", answered: false, failures: [{ code: "missing-segment" }] },
    ]);
  });
});
