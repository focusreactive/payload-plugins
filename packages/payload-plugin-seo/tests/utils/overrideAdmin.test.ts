import type { CollectionConfig, Config } from "payload";
import { describe, expect, it } from "vitest";
import { overrideAdmin } from "../../src/utils/config/overrideAdmin";

const incoming = {
  collections: [
    { slug: "pages", fields: [] },
    { slug: "media", fields: [] },
  ],
} as unknown as Config;

type ComponentEntry = { clientProps?: Record<string, unknown> };

function findCollection(config: Config, slug: string): CollectionConfig | undefined {
  return config.collections?.find((c) => c.slug === slug);
}

function beforeDocumentControls(config: Config, slug: string): ComponentEntry[] | undefined {
  return findCollection(config, slug)?.admin?.components?.edit?.beforeDocumentControls as
    | ComponentEntry[]
    | undefined;
}

describe("overrideAdmin", () => {
  it("adds a beforeDocumentControls component only to configured collections", () => {
    const result = overrideAdmin(incoming, {
      collections: [{ slug: "pages", fields: { slug: "slug" }, extractContentPath: "@/x#default" }],
      site: { name: "RunShop" },
    });

    expect(beforeDocumentControls(result, "pages")).toHaveLength(1);
    expect(beforeDocumentControls(result, "media")).toBeUndefined();
  });

  it("forwards collectionSlug, fields, site, and extractContentPath as clientProps", () => {
    const result = overrideAdmin(incoming, {
      collections: [
        { slug: "pages", fields: { slug: "slug" }, extractContentPath: "@/page#default" },
      ],
      site: { name: "RunShop", baseUrl: "https://runshop.com" },
    });

    expect(beforeDocumentControls(result, "pages")?.[0]?.clientProps).toMatchObject({
      collectionSlug: "pages",
      fields: { slug: "slug" },
      extractContentPath: "@/page#default",
      site: { name: "RunShop", baseUrl: "https://runshop.com" },
    });
  });

  it("tells the button whether the keyphrase index is on", () => {
    const read = (keyphraseIndex?: boolean) => {
      const result = overrideAdmin(incoming, {
        collections: [{ slug: "pages", extractContentPath: "@/x#default" }],
        keyphraseIndex,
      });
      return beforeDocumentControls(result, "pages")?.[0]?.clientProps?.keyphraseIndex;
    };
    expect(read()).toBe(false);
    expect(read(true)).toBe(true);
  });
});
