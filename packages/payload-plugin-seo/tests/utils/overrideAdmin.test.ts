import { describe, expect, it } from "vitest";
import { overrideAdmin } from "../../src/utils/config/overrideAdmin";

const incoming = {
  collections: [
    { slug: "pages", fields: [] },
    { slug: "media", fields: [] },
  ],
} as never;

describe("overrideAdmin", () => {
  it("adds a beforeDocumentControls component only to configured collections", () => {
    const result = overrideAdmin(incoming, {
      collections: [{ slug: "pages", fields: { slug: "slug", content: "sections" } }],
      site: { name: "RunShop" },
    }) as never as { collections: { slug: string; admin?: { components?: { edit?: { beforeDocumentControls?: unknown[] } } } }[] };

    const pages = result.collections.find((c) => c.slug === "pages");
    const media = result.collections.find((c) => c.slug === "media");
    expect(pages?.admin?.components?.edit?.beforeDocumentControls).toHaveLength(1);
    expect(media?.admin?.components?.edit?.beforeDocumentControls).toBeUndefined();
  });

  it("passes resolved field paths + site as clientProps", () => {
    const result = overrideAdmin(incoming, {
      collections: [{ slug: "pages", fields: { slug: "slug" } }],
      site: { name: "RunShop", baseUrl: "https://runshop.com" },
    }) as never as { collections: { slug: string; admin?: { components?: { edit?: { beforeDocumentControls?: { clientProps?: Record<string, unknown> }[] } } } }[] };

    const entry = result.collections.find((c) => c.slug === "pages")?.admin?.components?.edit?.beforeDocumentControls?.[0];
    expect(entry?.clientProps).toMatchObject({
      collectionSlug: "pages",
      fields: { slug: "slug" },
      site: { name: "RunShop", baseUrl: "https://runshop.com" },
    });
  });

  it("passes normalized resolveDepth as a clientProp (default 2, honors config, clamps negatives to 0)", () => {
    const run = (resolveDepth?: number) => {
      const result = overrideAdmin(incoming, {
        collections: [{ slug: "pages", ...(resolveDepth === undefined ? {} : { resolveDepth }) }],
      }) as never as { collections: { slug: string; admin?: { components?: { edit?: { beforeDocumentControls?: { clientProps?: { resolveDepth?: number } }[] } } } }[] };
      return result.collections.find((c) => c.slug === "pages")?.admin?.components?.edit?.beforeDocumentControls?.[0]?.clientProps?.resolveDepth;
    };
    expect(run()).toBe(2);
    expect(run(3)).toBe(3);
    expect(run(0)).toBe(0);
    expect(run(-5)).toBe(0);
    expect(run(1.7)).toBe(1);
    expect(run(Number.NaN)).toBe(0);
  });
});
