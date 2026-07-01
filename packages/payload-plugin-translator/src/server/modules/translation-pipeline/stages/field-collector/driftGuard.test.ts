import type { Field } from "payload";
import { describe, expect, it } from "vitest";

import { projectTranslatableContent } from "../../../../shared/content-projection/contentProjector";
import type { FieldLike } from "../../../../shared/field-traversal/types";
import { OverwriteStrategy } from "../../strategies";
import type { FieldChunk } from "../../types";
import { PlainTextExpander } from "../text-expander/PlainTextExpander";
import { RichTextExpander } from "../text-expander/RichTextExpander";
import { TextChunkExpander } from "../text-expander/TextChunkExpander";
import { FieldChunkCollector } from "./FieldChunkCollector";

// Drift guard (slice 6, option B): the read-only ContentProjector and the translation pipeline
// must agree on WHICH leaves are translatable and WHAT source text each holds. They derive that
// from one shared selection core, so this fixture pins their agreement executably. If someone
// changes the translatable set on one side only, this fails.

const richText = (...texts: string[]) => ({
  root: {
    type: "root",
    children: texts.map((text) => ({
      type: "paragraph",
      children: [{ type: "text", text }],
    })),
  },
});

const schema: FieldLike[] = [
  { name: "title", type: "text", localized: true },
  {
    name: "internalNote",
    type: "text",
    localized: true,
    custom: { translateKit: { exclude: true } },
  },
  { name: "slug", type: "text" }, // not localized
  { name: "views", type: "number", localized: true }, // not a translatable type
  { name: "body", type: "richText", localized: true },
  {
    name: "meta",
    type: "group",
    fields: [{ name: "description", type: "textarea", localized: true }],
  },
  {
    name: "content",
    type: "blocks",
    blocks: [
      {
        slug: "hero",
        fields: [
          { name: "heading", type: "text", localized: true },
          { name: "sub", type: "richText", localized: true },
        ],
      },
    ],
  },
];

const doc = {
  title: "The Title",
  internalNote: "secret",
  slug: "the-title",
  views: 42,
  body: richText("Body para one.", "Body para two."),
  meta: { description: "A description." },
  content: [
    { id: "b1", blockType: "hero", heading: "Hero heading", sub: richText("Hero sub.") },
    { id: "b2", blockType: "hero", heading: "Second hero", sub: richText("Second sub.") },
  ],
};

/** Reconstruct the pipeline's per-field source text from the collector + expanders. */
const pipelineFieldTexts = (): string[] => {
  const filteredData = structuredClone(doc);
  const source = structuredClone(doc);
  const chunks: FieldChunk[] = new FieldChunkCollector(
    schema as unknown as Field[],
    filteredData,
    source,
    {}, // empty target → Overwrite translates every present source value
    new OverwriteStrategy()
  ).collect();

  const expander = new TextChunkExpander([new RichTextExpander(), new PlainTextExpander()]);

  // Expand each field chunk independently, then join per field (richText spans multiple nodes).
  return chunks.map((chunk) => {
    const { textChunks } = expander.expand([chunk]);
    return textChunks
      .map((tc) => tc.text)
      .join("")
      .trim();
  });
};

describe("projection / translation drift guard", () => {
  it("both select the same leaves with the same source text (as a multiset)", () => {
    const projectionTexts = projectTranslatableContent(doc, schema)
      .map((entry) => entry.text)
      .sort();
    const pipelineTexts = pipelineFieldTexts().sort();

    expect(pipelineTexts).toEqual(projectionTexts);
  });

  it("both select the same number of translatable leaves", () => {
    expect(pipelineFieldTexts()).toHaveLength(projectTranslatableContent(doc, schema).length);
  });

  it("excludes the same non-translatable content from both", () => {
    const projectionTexts = projectTranslatableContent(doc, schema).map((e) => e.text);
    expect(projectionTexts).not.toContain("secret"); // excluded field
    expect(projectionTexts).not.toContain("the-title"); // not localized
    expect(pipelineFieldTexts()).not.toContain("secret");
    expect(pipelineFieldTexts()).not.toContain("the-title");
  });
});
