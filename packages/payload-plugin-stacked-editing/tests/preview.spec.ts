import type { ClientField } from "payload";
import { describe, expect, it } from "vitest";

import { createTranslate } from "../src/lib/breadcrumbs.js";
import {
  definePreview,
  fieldAtPath,
  mediaOf,
  previewConfigOf,
  resolvePreview,
  richTextToPlain,
} from "../src/lib/preview.js";

const translate = createTranslate({ language: "en" });

const fields = [
  {
    type: "row",
    fields: [
      { name: "kicker", type: "text" },
      {
        name: "tone",
        type: "select",
        options: [{ label: { en: "Warm" }, value: "warm" }, "cool"],
      },
    ],
  },
  { type: "collapsible", label: "More", fields: [{ name: "headline", type: "text" }] },
  { name: "cta", type: "group", fields: [{ name: "label", type: "text" }] },
  { name: "body", type: "richText" },
  { name: "image", type: "upload", relationTo: "media" },
  { name: "doc", type: "upload", relationTo: "files" },
  {
    name: "points",
    type: "array",
    labels: { singular: "Point", plural: "Points" },
    fields: [{ name: "text", type: "text" }],
  },
] as unknown as ClientField[];

const richText = (...paragraphs: string[]) => ({
  root: {
    type: "root",
    children: paragraphs.map((text) => ({
      type: "paragraph",
      children: text
        ? [{ type: "text", text }, { type: "linebreak" }, { type: "text", text: "more" }]
        : [],
    })),
  },
});

const resolve = (
  values: Record<string, unknown>,
  extra: Partial<Parameters<typeof resolvePreview>[0]> = {}
) =>
  resolvePreview({
    fields,
    getRowCount: (path) => (path === "points" ? 2 : undefined),
    getValue: (path) => values[path],
    isImageCollection: (slug) => slug === "media",
    kindLabel: "Promo",
    translate,
    ...extra,
  });

describe("resolvePreview — select", () => {
  it("reads dot paths, select labels, counts and media", () => {
    expect(
      resolve(
        { "cta.label": "Buy now", tone: "warm", image: 7 },
        { select: { title: "cta.label", subtitle: "tone", media: "image" } }
      )
    ).toEqual({
      title: "Buy now",
      subtitle: "Warm",
      media: { kind: "doc", relationTo: "media", id: 7 },
    });
    expect(resolve({}, { select: { title: "kicker", subtitle: "points.length" } }).subtitle).toBe(
      "2 Points"
    );
  });

  it("falls back to the defaults when a selected value is missing", () => {
    expect(
      resolve(
        { headline: "Fallback headline" },
        { select: { title: "cta.label", subtitle: "tone" } }
      )
    ).toEqual({ title: "Fallback headline", subtitle: "Promo" });
  });
});

describe("resolvePreview — defaults", () => {
  it("takes the first text-like field with a value, through rows and collapsibles", () => {
    expect(resolve({ kicker: "  ", tone: "cool", headline: "Later" }).title).toBe("cool");
    expect(resolve({ headline: "Later" }).title).toBe("Later");
  });

  it("does not look into named groups, and uses rich text as a last resort", () => {
    expect(resolve({ "cta.label": "Hidden" }).title).toBeUndefined();
    expect(resolve({ body: richText("", "First words") }).title).toBe("First words more");
  });

  it("lets a block name win", () => {
    expect(resolve({ blockName: "My hero", headline: "x" }, { withBlockName: true }).title).toBe(
      "My hero"
    );
    expect(resolve({ blockName: "My hero", headline: "x" }).title).toBe("x");
  });

  it("uses the kind label as subtitle and the first upload into an image collection", () => {
    expect(resolve({ doc: 1, image: { id: 3, url: "/m/a.png" } })).toEqual({
      subtitle: "Promo",
      media: { kind: "url", url: "/m/a.png" },
    });
    expect(resolve({ doc: 1 }).media).toBeUndefined();
  });

  it("leaves everything empty when the row has nothing", () => {
    expect(resolve({}, { kindLabel: undefined })).toEqual({});
  });
});

describe("helpers", () => {
  it("extracts the first paragraph of rich text and truncates it", () => {
    expect(richTextToPlain(richText("Hello"))).toBe("Hello more");
    expect(richTextToPlain({ root: { children: [] } })).toBeUndefined();
    expect(richTextToPlain("nope")).toBeUndefined();
    expect(richTextToPlain(richText("x".repeat(300)))?.length).toBe(120);
  });

  it("finds fields by relative path", () => {
    expect(fieldAtPath(fields, "cta.label")?.name).toBe("label");
    expect(fieldAtPath(fields, "points.1.text")?.name).toBe("text");
    expect(fieldAtPath(fields, "missing")).toBeUndefined();
  });

  it("reads every upload value shape", () => {
    const upload = { name: "image", type: "upload", relationTo: "media" } as never;
    expect(mediaOf("abc", upload)).toEqual({ kind: "doc", relationTo: "media", id: "abc" });
    expect(
      mediaOf({ id: 2, sizes: { thumbnail: { url: "/t.png" } }, url: "/f.png" }, upload)
    ).toEqual({
      kind: "url",
      url: "/t.png",
    });
    expect(mediaOf({ relationTo: "images", value: { id: 9 } }, upload)).toEqual({
      kind: "doc",
      relationTo: "images",
      id: 9,
    });
    expect(mediaOf(null, upload)).toBeUndefined();
  });

  it("reads the preview config from the block or the array field", () => {
    const preview = definePreview({ title: "title", media: "image" });
    expect(previewConfigOf({ field: {}, block: { admin: { custom: { preview } } } })).toEqual(
      preview
    );
    expect(previewConfigOf({ field: { admin: { custom: { preview } } } })).toEqual(preview);
    expect(previewConfigOf({ field: { admin: {} } })).toBeUndefined();
  });
});
