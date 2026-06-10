import { describe, expect, it } from "vitest";
import { transformLexicalUploads } from "../../../src/content/uploads/transform-lexical-uploads";
import type { UploadRef } from "../../../src/content/uploads/types";

const lexical = (children: unknown[]) => ({
  root: { type: "root", children, direction: null, format: "", indent: 0, version: 1 },
});

const uploadNode = (value: unknown) => ({ type: "upload", relationTo: "media", value, version: 2 });

describe("transformLexicalUploads", () => {
  it("replaces upload node values when the transform returns a doc", () => {
    const doc = { id: 7, url: "/m/a.jpg", mimeType: "image/jpeg", alt: "A" };
    const input = lexical([{ type: "paragraph", children: [{ type: "text", text: "hi" }] }, uploadNode(7)]);

    const out = transformLexicalUploads(input, () => doc);

    const root = out.root as { children: Array<{ type: string; value?: unknown }> };
    expect(root.children[1].value).toBe(doc);
    // original untouched
    const inRoot = input.root as { children: Array<{ type: string; value?: unknown }> };
    expect(inRoot.children[1].value).toBe(7);
  });

  it("leaves nodes unchanged when the transform returns undefined, and records the ref", () => {
    const seen: UploadRef[] = [];
    const input = lexical([uploadNode(7)]);

    const out = transformLexicalUploads(input, (ref) => {
      seen.push(ref);
      return undefined;
    });

    expect(seen).toEqual([{ collection: "media", id: 7 }]);
    const root = out.root as { children: Array<{ value?: unknown }> };
    expect(root.children[0].value).toBe(7);
  });

  it("finds upload nodes nested in children and ignores populated/invalid nodes", () => {
    const seen: UploadRef[] = [];
    const input = lexical([
      { type: "quote", children: [uploadNode("abc123")] },
      uploadNode({ id: 9, url: "/x.jpg" }), // already populated → not a ref
      { type: "upload", value: 3 }, // missing relationTo → not a ref
    ]);

    transformLexicalUploads(input, (ref) => {
      seen.push(ref);
      return undefined;
    });

    expect(seen).toEqual([{ collection: "media", id: "abc123" }]);
  });

  it("returns the value as-is when there is no root object", () => {
    const input = { root: undefined };
    expect(transformLexicalUploads(input, () => undefined)).toBe(input);
  });
});
