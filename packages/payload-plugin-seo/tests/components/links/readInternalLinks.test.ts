import { describe, expect, it } from "vitest";
import { readInternalLinks } from "../../../src/components/SeoDrawer/links/readInternalLinks";
import { MAX_LINKED_DOCS } from "../../../src/constants";

function internalLink(relationTo: string, value: unknown) {
  return {
    type: "link",
    fields: { linkType: "internal", doc: { relationTo, value } },
    children: [{ type: "text", text: "see" }],
  };
}

function richText(...children: unknown[]) {
  return { root: { type: "root", children: [{ type: "paragraph", children }] } };
}

describe("readInternalLinks", () => {
  it("collects internal lexical links with plain or populated ids", () => {
    const values = {
      title: "Post",
      content: richText(internalLink("posts", "2"), internalLink("pages", { id: 7, title: "x" })),
      blocks: [{ body: richText(internalLink("posts", 3)) }],
    };

    expect(readInternalLinks(values)).toEqual([
      { collection: "posts", docId: "2" },
      { collection: "pages", docId: "7" },
      { collection: "posts", docId: "3" },
    ]);
  });

  it("does not read links inside a populated linked document", () => {
    const linked = { id: 7, content: richText(internalLink("posts", "9")) };

    expect(readInternalLinks(richText(internalLink("pages", linked)))).toEqual([
      { collection: "pages", docId: "7" },
    ]);
  });

  it("does not read links inside a populated relationship", () => {
    const related = { id: 5, content: richText(internalLink("posts", "9")) };
    const values = { related: { relationTo: "posts", value: related } };

    expect(readInternalLinks(values)).toEqual([]);
  });

  it("ignores custom links and malformed docs", () => {
    const values = richText(
      { type: "link", fields: { linkType: "custom", url: "/a" } },
      internalLink("posts", null),
      { type: "link", fields: { linkType: "internal", doc: "posts" } }
    );

    expect(readInternalLinks(values)).toEqual([]);
  });

  it("dedupes and caps the list", () => {
    const links = Array.from({ length: MAX_LINKED_DOCS + 1 }, (_, i) =>
      internalLink("posts", String(i))
    );
    const values = richText(internalLink("posts", "0"), ...links);

    const targets = readInternalLinks(values);

    expect(targets).toHaveLength(MAX_LINKED_DOCS);
    expect(targets.filter((t) => t.docId === "0")).toHaveLength(1);
  });
});
