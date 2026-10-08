import { describe, expect, it } from "vitest";

import { withVisualEditingPath } from "../src/client/withVisualEditingPath";
import {
  DATA_VE_COLLECTION_ATTR,
  DATA_VE_DOC_ID_ATTR,
  DATA_VE_KIND_ATTR,
  DATA_VE_PATH_ATTR,
} from "../src/constants";
import { encodeStega } from "../src/internal/encodeStega";
import { META_KEY } from "../src/internal/shared";

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
  it("returns data-ve-* attrs pointing at the media doc after encoding", () => {
    const data = {
      image: {
        id: "m-1",
        url: "/m-1.jpg",
        alt: "alt",
        [META_KEY]: { path: "", docId: "m-1", collectionSlug: "media", kind: "collection" },
      },
      [META_KEY]: { path: "", docId: "p-1", collectionSlug: "pages", kind: "collection" },
    };
    const result = encodeStega(data as any, (slug) => {
      if (slug === "pages") return { image: "upload:media" };
      if (slug === "media") return { alt: "text", url: "text" };
      return null;
    });

    const attrs = withVisualEditingPath((result as any).image);

    expect(attrs).toEqual({
      [DATA_VE_PATH_ATTR]: "",
      [DATA_VE_DOC_ID_ATTR]: "m-1",
      [DATA_VE_COLLECTION_ATTR]: "media",
      [DATA_VE_KIND_ATTR]: "collection",
    });
  });
});
