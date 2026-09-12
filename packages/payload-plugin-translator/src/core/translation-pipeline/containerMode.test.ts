import type { Field } from "payload";
import { describe, expect, it, vi } from "vitest";
import type { TranslationProvider } from "../domain/translation-providers";
import { translateContent } from "./translateContent";

const text = (value: string, format = 0) => ({
  type: "text",
  text: value,
  format,
  detail: 0,
  mode: "normal",
  style: "",
  version: 1,
});

const paragraph = (children: unknown[]) => ({
  type: "paragraph",
  children,
  format: "",
  indent: 0,
  version: 1,
  direction: "ltr",
});

const richText = (paragraphs: unknown[]) => ({
  root: { type: "root", children: paragraphs, format: "", indent: 0, version: 1, direction: "ltr" },
});

const link = (url: string, children: unknown[]) => ({
  type: "link",
  fields: { url, linkType: "custom" },
  children,
  version: 3,
});

const schema: Field[] = [{ name: "body", type: "richText", localized: true }];

const mixedSchema: Field[] = [
  { name: "body", type: "richText", localized: true },
  { name: "title", type: "text", localized: true },
];

/** Wraps each value so the result is deterministic, and records what was sent. */
const bracketProvider = (
  extra?: Partial<TranslationProvider> & { capabilities?: { inlineMarks?: boolean } }
) => {
  const sent: Record<number, string>[] = [];
  const provider = {
    translate: vi.fn(async (input: Record<number, string>) => {
      sent.push({ ...input });
      const out: Record<number, string> = {};
      for (const [key, value] of Object.entries(input)) out[Number(key)] = `[${value}]`;
      return out;
    }),
    ...extra,
  } as TranslationProvider;
  return { provider, sent };
};

type Wrapper = { type: string; fields?: { url?: string }; children?: { text?: string }[] };
type Paragraph = { children: ({ text?: string } & Partial<Wrapper>)[] };

const paragraphsOf = (data: Record<string, unknown> | null): Paragraph[] => {
  if (!data) throw new Error("translateContent returned nothing");
  return (data.body as { root: { children: Paragraph[] } }).root.children;
};

describe("container mode", () => {
  describe("flag off", () => {
    // Baseline captured from the untouched tree on 2026-09-09 (see the task contract).
    it("translates per node, byte-identical to the recorded baseline", async () => {
      const { provider } = bracketProvider();
      const source = {
        body: richText([
          paragraph([text("Buy "), text("our product", 1), text(" today")]),
          paragraph([text("Read the "), link("/docs", [text("documentation")]), text(" first")]),
        ]),
      };

      const result = await translateContent({
        schema,
        sourceData: source,
        sourceLng: "en",
        targetLng: "fr",
        translationProvider: provider,
      });

      const [first, second] = paragraphsOf(result ?? null);
      expect(first?.children.map((node) => node.text)).toEqual([
        "[Buy ]",
        "[our product]",
        "[ today]",
      ]);
      // The nested link is the half that catches structural damage: text-only assertions pass
      // even when a rebuild flattens or duplicates a wrapper.
      expect(second?.children).toEqual([
        expect.objectContaining({ type: "text", text: "[Read the ]" }),
        expect.objectContaining({
          type: "link",
          fields: { url: "/docs", linkType: "custom" },
          children: [expect.objectContaining({ type: "text", text: "[documentation]" })],
        }),
        expect.objectContaining({ type: "text", text: "[ first]" }),
      ]);
    });
  });

  describe("flag on", () => {
    it("sends a formatted paragraph as one marked string", async () => {
      const { provider, sent } = bracketProvider({ capabilities: { inlineMarks: true } });
      const source = {
        body: richText([paragraph([text("a "), text("red", 1), text(" car")])]),
      };

      await translateContent({
        schema,
        sourceData: source,
        sourceLng: "en",
        targetLng: "fr",
        translationProvider: provider,
        inlineMarks: true,
      });

      expect(Object.values(sent[0] ?? {})).toEqual(["<1>a </1><2>red</2><3> car</3>"]);
    });

    it("rebuilds children in the reply's order when marks move", async () => {
      const provider = {
        capabilities: { inlineMarks: true },
        translate: vi.fn(async () => ({ 0: "<1>une </1><3>voiture </3><2>rouge</2>" })),
      } as TranslationProvider;
      const source = {
        body: richText([paragraph([text("a "), text("red", 1), text(" car")])]),
      };

      const result = await translateContent({
        schema,
        sourceData: source,
        sourceLng: "en",
        targetLng: "fr",
        translationProvider: provider,
        inlineMarks: true,
      });

      expect(paragraphsOf(result ?? null)[0]?.children.map((node) => node.text)).toEqual([
        "une ",
        "voiture ",
        "rouge",
      ]);
    });

    it("translates the caller's paragraph without touching its nodes", async () => {
      const nodes = [text("a "), text("red", 1), text(" car")];
      const provider = {
        capabilities: { inlineMarks: true },
        translate: vi.fn(async () => ({ 0: "<1>une </1><2>rouge</2><3> voiture</3>" })),
      } as TranslationProvider;

      const result = await translateContent({
        schema,
        sourceData: { body: richText([paragraph(nodes)]) },
        sourceLng: "en",
        targetLng: "fr",
        translationProvider: provider,
        inlineMarks: true,
      });

      // Both halves matter: the text alone passes on code that mutates the caller's tree, and the
      // untouched source alone passes on code that translated nothing.
      expect(paragraphsOf(result ?? null)[0]?.children.map((node) => node.text)).toEqual([
        "une ",
        "rouge",
        " voiture",
      ]);
      expect(nodes.map((node) => node.text)).toEqual(["a ", "red", " car"]);
      expect(paragraphsOf(result ?? null)[0]?.children[1]).not.toBe(nodes[1]);
    });

    // The point of the whole mode: a wrapper has to travel with the word it formats, so the rebuilt
    // array must carry the wrapper node itself, never the bare leaf inside it.
    it("moves a link with its word when the reply reorders them", async () => {
      const provider = {
        capabilities: { inlineMarks: true },
        translate: vi.fn(async () => ({ 0: "<2>Dokumentation</2><1> lesen</1>" })),
      } as TranslationProvider;

      const result = await translateContent({
        schema,
        sourceData: {
          body: richText([paragraph([text("Read the "), link("/docs", [text("docs")])])]),
        },
        sourceLng: "en",
        targetLng: "de",
        translationProvider: provider,
        inlineMarks: true,
      });

      const children = paragraphsOf(result ?? null)[0]?.children;

      expect(children?.[0]?.type).toBe("link");
      expect(children?.[0]?.fields?.url).toBe("/docs");
      expect(children?.[0]?.children?.[0]?.text).toBe("Dokumentation");
      expect(children?.[1]?.text).toBe(" lesen");
    });

    it("drops the node of a mark that came back empty", async () => {
      const provider = {
        capabilities: { inlineMarks: true },
        translate: vi.fn(async () => ({ 0: "<1>une voiture rouge</1><2></2><3></3>" })),
      } as TranslationProvider;

      const result = await translateContent({
        schema,
        sourceData: { body: richText([paragraph([text("a "), text("red", 1), text(" car")])]) },
        sourceLng: "en",
        targetLng: "fr",
        translationProvider: provider,
        inlineMarks: true,
      });

      expect(paragraphsOf(result ?? null)[0]?.children.map((node) => node.text)).toEqual([
        "une voiture rouge",
      ]);
    });

    it("falls back to per-node when the source holds a mark-shaped sequence", async () => {
      const { provider, sent } = bracketProvider({ capabilities: { inlineMarks: true } });
      const source = {
        body: richText([
          paragraph([text("use "), text("<1>", 1), text(" as a placeholder")]),
          paragraph([text("a "), text("red", 1), text(" car")]),
        ]),
      };

      await translateContent({
        schema,
        sourceData: source,
        sourceLng: "en",
        targetLng: "fr",
        translationProvider: provider,
        inlineMarks: true,
      });

      expect(Object.values(sent[0] ?? {})).toEqual([
        "use ",
        "<1>",
        " as a placeholder",
        "<1>a </1><2>red</2><3> car</3>",
      ]);
    });

    it("falls back to per-node for a single-fragment container", async () => {
      const { provider, sent } = bracketProvider({ capabilities: { inlineMarks: true } });
      const source = {
        body: richText([
          paragraph([text("Sign up now")]),
          paragraph([text("a "), text("red", 1), text(" car")]),
        ]),
      };

      await translateContent({
        schema,
        sourceData: source,
        sourceLng: "en",
        targetLng: "fr",
        translationProvider: provider,
        inlineMarks: true,
      });

      expect(Object.values(sent[0] ?? {})).toEqual([
        "Sign up now",
        "<1>a </1><2>red</2><3> car</3>",
      ]);
    });

    // The glued whitespace node has no fragment, so it is absent from the rebuilt array. Were it
    // left in place beside the neighbour that swallowed its space, the space would render twice.
    it("does not double a glued space", async () => {
      const provider = {
        capabilities: { inlineMarks: true },
        translate: vi.fn(async () => ({ 0: "<1>Achetez </1><2>notre produit</2>" })),
      } as TranslationProvider;

      const result = await translateContent({
        schema,
        sourceData: {
          body: richText([paragraph([text("Buy"), text(" "), text("our product", 1)])]),
        },
        sourceLng: "en",
        targetLng: "fr",
        translationProvider: provider,
        inlineMarks: true,
      });

      expect(paragraphsOf(result ?? null)[0]?.children.map((node) => node.text)).toEqual([
        "Achetez ",
        "notre produit",
      ]);
    });

    it("takes the whole field per-node when every container is skipped", async () => {
      const { provider, sent } = bracketProvider({ capabilities: { inlineMarks: true } });
      const source = {
        body: richText([paragraph([text("Sign up now")]), paragraph([text("No card needed")])]),
      };

      await translateContent({
        schema,
        sourceData: source,
        sourceLng: "en",
        targetLng: "fr",
        translationProvider: provider,
        inlineMarks: true,
      });

      expect(Object.values(sent[0] ?? {})).toEqual(["Sign up now", "No card needed"]);
    });

    it("leaves a plain text field to the plain expander", async () => {
      const { provider, sent } = bracketProvider({ capabilities: { inlineMarks: true } });

      await translateContent({
        schema: mixedSchema,
        sourceData: {
          body: richText([paragraph([text("a "), text("red", 1), text(" car")])]),
          title: "Weather data",
        },
        sourceLng: "en",
        targetLng: "fr",
        translationProvider: provider,
        inlineMarks: true,
      });

      expect(Object.values(sent[0] ?? {})).toEqual([
        "<1>a </1><2>red</2><3> car</3>",
        "Weather data",
      ]);
    });

    it("leaves the container untranslated when the reply is corrupt", async () => {
      const provider = {
        capabilities: { inlineMarks: true },
        // Mark 3 never comes back: corrupt per D13.
        translate: vi.fn(async () => ({ 0: "<1>une </1><2>rouge</2>" })),
      } as TranslationProvider;

      const result = await translateContent({
        schema,
        sourceData: { body: richText([paragraph([text("a "), text("red", 1), text(" car")])]) },
        sourceLng: "en",
        targetLng: "fr",
        translationProvider: provider,
        inlineMarks: true,
      });

      expect(paragraphsOf(result ?? null)[0]?.children.map((node) => node.text)).toEqual([
        "a ",
        "red",
        " car",
      ]);
    });

    it("stays per-node when the provider does not declare inlineMarks", async () => {
      const body = () => ({
        body: richText([paragraph([text("a "), text("red", 1), text(" car")])]),
      });
      const silent = bracketProvider();
      const declaring = bracketProvider({ capabilities: { inlineMarks: true } });

      for (const each of [silent, declaring]) {
        await translateContent({
          schema,
          sourceData: body(),
          sourceLng: "en",
          targetLng: "fr",
          translationProvider: each.provider,
          inlineMarks: true,
        });
      }

      expect(Object.values(silent.sent[0] ?? {})).toEqual(["a ", "red", " car"]);
      expect(Object.values(declaring.sent[0] ?? {})).toEqual(["<1>a </1><2>red</2><3> car</3>"]);
    });
  });
});
