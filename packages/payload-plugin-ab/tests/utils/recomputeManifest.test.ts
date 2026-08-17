import { describe, expect, it, vi } from "vitest";
import { recomputeManifestForParent } from "../../src/utils/recomputeManifest";
import type { AbTestingPluginConfig, CollectionABConfig } from "../../src/types/config";

const abConfig: CollectionABConfig = {
  generatePath: ({ doc }) => {
    const slug = doc.slug as string | undefined;
    return slug ? `/${slug}` : null;
  },
};

function makeReq(draftsEnabled: boolean) {
  const find = vi.fn().mockResolvedValue({ docs: [{ id: "v1", slug: "about--x" }] });
  const payload = {
    config: { localization: false },
    collections: {
      pages: { config: draftsEnabled ? { versions: { drafts: true } } : { versions: false } },
    },
    findByID: vi.fn().mockResolvedValue({ id: "p1", slug: "about" }),
    find,
  };
  return { req: { payload } as never, find };
}

const pluginConfig = {
  collections: { pages: abConfig },
  storage: { write: vi.fn(), clear: vi.fn(), read: vi.fn() },
} as unknown as AbTestingPluginConfig;

describe("recomputeManifestForParent", () => {
  it("only reads published variants when the collection has drafts", async () => {
    const { req, find } = makeReq(true);
    await recomputeManifestForParent("p1", "pages", abConfig, pluginConfig, req);
    expect(find.mock.calls[0][0].where).toEqual({
      and: [{ _abVariantOf: { equals: "p1" } }, { _status: { equals: "published" } }],
    });
  });

  it("does not filter by status when the collection has no drafts", async () => {
    const { req, find } = makeReq(false);
    await recomputeManifestForParent("p1", "pages", abConfig, pluginConfig, req);
    expect(find.mock.calls[0][0].where).toEqual({ _abVariantOf: { equals: "p1" } });
  });

  it("still honours excludeId alongside the status filter", async () => {
    const { req, find } = makeReq(true);
    await recomputeManifestForParent("p1", "pages", abConfig, pluginConfig, req, {
      excludeId: "v9",
    });
    expect(find.mock.calls[0][0].where).toEqual({
      and: [
        { _abVariantOf: { equals: "p1" } },
        { id: { not_equals: "v9" } },
        { _status: { equals: "published" } },
      ],
    });
  });
});
