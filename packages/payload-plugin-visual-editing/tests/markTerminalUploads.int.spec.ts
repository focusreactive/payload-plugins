import { describe, expect, it } from "vitest";

import { markTerminalUploads } from "../src/internal/markTerminalUploads";
import { META_KEY } from "../src/internal/shared";

const pagesSchema = {
  title: "text",
  image: "upload:media",
  gallery: [{ kind: "upload:media" }] as unknown,
  hero: {
    backgroundImage: "upload:media",
  },
  blocks: {
    "media-block": {
      picture: "upload:media",
    },
  },
  related: "relationship:posts",
};

const postsSchema = {
  title: "text",
  cover: "upload:media",
};

const resolveSchema = (slug: string) => {
  if (slug === "pages") return pagesSchema;
  if (slug === "posts") return postsSchema;
  return null;
};

const hostMeta = {
  path: "",
  docId: "p-1",
  collectionSlug: "pages",
  kind: "collection",
} as const;

const mediaHolder = (docId: string) => ({
  id: docId,
  url: `/media/${docId}.jpg`,
  alt: "alt text",
  [META_KEY]: { path: "", docId, collectionSlug: "media", kind: "collection" },
});

describe("markTerminalUploads", () => {
  it("flips _meta.terminal on a direct upload-field child", () => {
    const doc = {
      title: "Hi",
      image: mediaHolder("m-1"),
      [META_KEY]: { ...hostMeta },
    };

    markTerminalUploads(doc, resolveSchema as never);

    expect(doc.image[META_KEY]).toMatchObject({
      collectionSlug: "media",
      docId: "m-1",
      terminal: true,
    });
  });

  it("unwraps polymorphic {relationTo, value} before marking terminal", () => {
    const doc = {
      image: { relationTo: "media", value: mediaHolder("m-2") },
      [META_KEY]: { ...hostMeta },
    };

    // Pretend the schema encodes polymorphic as 'upload:media|videos'
    const poly = (slug: string) => (slug === "pages" ? { image: "upload:media|videos" } : null);

    markTerminalUploads(doc, poly as never);

    expect((doc.image.value as { _meta?: unknown })._meta).toMatchObject({
      terminal: true,
      collectionSlug: "media",
      docId: "m-2",
    });
  });

  it("descends into nested groups", () => {
    const doc = {
      hero: { backgroundImage: mediaHolder("m-3") },
      [META_KEY]: { ...hostMeta },
    };

    markTerminalUploads(doc, resolveSchema as never);

    expect(doc.hero.backgroundImage[META_KEY]).toMatchObject({ terminal: true });
  });

  it("descends into arrays of objects", () => {
    const gallerySchema = { kind: "upload:media" };
    const doc = {
      gallery: [{ kind: mediaHolder("m-4") }, { kind: mediaHolder("m-5") }],
      [META_KEY]: { ...hostMeta },
    };
    const resolve = (slug: string) => (slug === "pages" ? { gallery: gallerySchema } : null);

    markTerminalUploads(doc, resolve as never);

    expect(doc.gallery[0]!.kind[META_KEY]).toMatchObject({ terminal: true });
    expect(doc.gallery[1]!.kind[META_KEY]).toMatchObject({ terminal: true });
  });

  it("picks the right block sub-schema by blockType", () => {
    const doc = {
      blocks: [{ blockType: "media-block", picture: mediaHolder("m-6") }],
      [META_KEY]: { ...hostMeta },
    };
    const resolve = (slug: string) =>
      slug === "pages" ? { blocks: { "media-block": { picture: "upload:media" } } } : null;

    markTerminalUploads(doc, resolve as never);

    expect(doc.blocks[0]!.picture[META_KEY]).toMatchObject({ terminal: true });
  });

  it("recurses into related docs under their own schema", () => {
    const doc = {
      related: {
        id: "post-1",
        title: "Hi",
        cover: mediaHolder("m-7"),
        [META_KEY]: {
          path: "",
          docId: "post-1",
          collectionSlug: "posts",
          kind: "collection",
        },
      },
      [META_KEY]: { ...hostMeta },
    };

    markTerminalUploads(doc, resolveSchema as never);

    expect(doc.related.cover[META_KEY]).toMatchObject({ terminal: true });
  });

  it("leaves upload fields untouched when child is a plain string id (depth=0)", () => {
    const doc = {
      image: "m-8", // not populated
      [META_KEY]: { ...hostMeta },
    };
    // must not throw
    markTerminalUploads(doc, resolveSchema as never);
    expect(doc.image).toBe("m-8");
  });

  it("is a no-op when root has no _meta or schema is missing", () => {
    markTerminalUploads({ title: "Hi" }, resolveSchema as never);
    markTerminalUploads(
      { [META_KEY]: { ...hostMeta, collectionSlug: "unknown" } },
      resolveSchema as never
    );
    // nothing to assert — just that neither call throws
  });
});
