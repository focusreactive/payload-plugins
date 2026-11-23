import { describe, expect, it } from "vitest";

import { withVisualEditingPath } from "../../src/client/withVisualEditingPath";
import {
  DATA_VE_COLLECTION_ATTR,
  DATA_VE_DOC_ID_ATTR,
  DATA_VE_KEY_ATTR,
  DATA_VE_KIND_ATTR,
  DATA_VE_LOCALE_ATTR,
  DATA_VE_PATH_ATTR,
} from "../../src/shared/protocol";
import { markRead } from "../../src/server/markRead";

describe("withVisualEditingPath", () => {
  it("returns empty object when no meta", () => {
    expect(withVisualEditingPath(undefined)).toEqual({});
    expect(withVisualEditingPath({})).toEqual({});
  });

  it("extracts all attrs when meta is present", () => {
    const attrs = withVisualEditingPath({
      _meta: {
        path: "body",
        docId: "p-1",
        collectionSlug: "pages",
        kind: "collection",
        terminal: true,
      },
    });
    expect(attrs).toEqual({
      [DATA_VE_PATH_ATTR]: "body",
      [DATA_VE_DOC_ID_ATTR]: "p-1",
      [DATA_VE_COLLECTION_ATTR]: "pages",
      [DATA_VE_KIND_ATTR]: "collection",
    });
  });

  it("states the locale of a value read with every locale", () => {
    const attrs = withVisualEditingPath({
      _meta: {
        collectionSlug: "pages",
        docId: "p-1",
        kind: "collection",
        locale: "de",
        path: "body",
      },
    });

    expect(attrs).toMatchObject({ [DATA_VE_LOCALE_ATTR]: "de", [DATA_VE_PATH_ATTR]: "body" });
  });

  it("states the stable key of the field when the marker has one", () => {
    const attrs = withVisualEditingPath({
      _meta: {
        collectionSlug: "pages",
        key: "layout.6a1f.body",
        kind: "collection",
        path: "layout.0.body",
      },
    });

    expect(attrs[DATA_VE_KEY_ATTR]).toBe("layout.6a1f.body");
  });

  it("leaves the key out when the marker has none", () => {
    const attrs = withVisualEditingPath({
      _meta: { collectionSlug: "pages", kind: "collection", path: "content" },
    });

    expect(DATA_VE_KEY_ATTR in attrs).toBe(false);
  });

  it("omits docId attr for globals", () => {
    const attrs = withVisualEditingPath({
      _meta: {
        path: "title",
        collectionSlug: "siteSettings",
        kind: "global",
      },
    });
    expect((attrs as any)[DATA_VE_DOC_ID_ATTR]).toBeUndefined();
    expect(attrs).toMatchObject({
      [DATA_VE_COLLECTION_ATTR]: "siteSettings",
      [DATA_VE_KIND_ATTR]: "global",
    });
  });
});

describe("withVisualEditingPath — upload end-to-end", () => {
  it("returns data-ve-* attrs pointing at the upload field of the document that holds it", () => {
    const inPage = { collectionSlug: "pages", docId: "p-1", kind: "collection" } as const;
    const result = markRead(
      { image: { alt: "alt", id: "m-1" } },
      { identity: inPage, schema: { image: "upload" } }
    );

    expect(withVisualEditingPath(result.image)).toEqual({
      [DATA_VE_PATH_ATTR]: "image",
      [DATA_VE_DOC_ID_ATTR]: "p-1",
      [DATA_VE_COLLECTION_ATTR]: "pages",
      [DATA_VE_KIND_ATTR]: "collection",
    });
  });
});
