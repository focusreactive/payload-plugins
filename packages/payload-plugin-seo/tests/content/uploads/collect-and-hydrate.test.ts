import type { ClientField } from "payload";
import { describe, expect, it } from "vitest";
import { collectUploadRefs } from "../../../src/content/uploads/collect-upload-refs";
import { hydrateUploadValues } from "../../../src/content/uploads/hydrate-values";
import type { UploadWalkContext } from "../../../src/content/uploads/transform-upload-values";
import type { ResolvedUploadDoc } from "../../../src/content/uploads/types";

const FIELDS = [
  { name: "image", type: "upload", relationTo: "media" },
  { name: "again", type: "upload", relationTo: "media" },
  { name: "body", type: "richText" },
] as unknown as ClientField[];

const CTX: UploadWalkContext = { isUploadCollection: (slug) => slug === "media", blocksBySlug: {} };

describe("collectUploadRefs", () => {
  it("dedupes refs across sites", () => {
    const refs = collectUploadRefs({ image: 1, again: 1 }, FIELDS, CTX);
    expect(refs).toEqual([{ collection: "media", id: 1 }]);
  });
});

describe("hydrateUploadValues", () => {
  const doc: ResolvedUploadDoc = { id: 1, url: "/m/a.jpg", mimeType: "image/jpeg", alt: "A" };

  it("replaces resolved IDs with docs and unresolved IDs with null", () => {
    const resolved = new Map([["media:1", doc]]);
    const out = hydrateUploadValues({ image: 1, again: 2 }, FIELDS, CTX, resolved);

    expect(out.image).toBe(doc);
    expect(out.again).toBeNull();
  });

  it("hydrates lexical upload nodes only with renderable docs (url + mimeType)", () => {
    const broken: ResolvedUploadDoc = { id: 3, alt: "no url or mime" };
    const resolved = new Map([
      ["media:1", doc],
      ["media:3", broken],
    ]);
    const values = {
      body: {
        root: {
          type: "root",
          children: [
            { type: "upload", relationTo: "media", value: 1 },
            { type: "upload", relationTo: "media", value: 3 },
          ],
        },
      },
    };

    const out = hydrateUploadValues(values, FIELDS, CTX, resolved);
    const root = (out.body as { root: { children: Array<{ value: unknown }> } }).root;

    expect(root.children[0].value).toBe(doc);
    expect(root.children[1].value).toBeNull();
  });
});
