import { describe, expect, it, vi } from "vitest";
import { ensureExperimentRecords } from "../../src/hooks/ensureExperimentRecords";
import type { AbTestingPluginConfig, CollectionABConfig } from "../../src/types/config";

const abConfig: CollectionABConfig = {
  generatePath: ({ doc }) => {
    const slug = doc.slug as string | undefined;
    return slug ? `/${slug}` : null;
  },
};

const pluginConfig = {
  collections: { pages: abConfig },
  storage: {} as never,
  experimentsCollectionSlug: "ab-experiments",
} as AbTestingPluginConfig;

function makeReq(opts: {
  parentDoc: Record<string, unknown>;
  variantCount: number;
  existingRows?: Array<{ manifestKey: string }>;
  localization?: string[];
}) {
  const created: Array<Record<string, unknown>> = [];
  const payload = {
    config: {
      localization: opts.localization ? { locales: opts.localization.map((code) => ({ code })) } : false,
    },
    findByID: vi.fn().mockResolvedValue(opts.parentDoc),
    find: vi.fn().mockImplementation(({ collection }: { collection: string }) => {
      if (collection === "ab-experiments") {
        return Promise.resolve({ docs: opts.existingRows ?? [] });
      }
      return Promise.resolve({ docs: Array.from({ length: opts.variantCount }, (_, i) => ({ id: `v${i}` })) });
    }),
    create: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => {
      created.push(data);
      return Promise.resolve(data);
    }),
  };
  return { req: { payload }, created, payload };
}

describe("ensureExperimentRecords", () => {
  it("creates a row with startedAt when a parent's manifest key has published variants and no row exists", async () => {
    const { req, created } = makeReq({ parentDoc: { id: "p1", slug: "about" }, variantCount: 1 });
    await ensureExperimentRecords("p1", "pages", abConfig, pluginConfig, req as never);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ manifestKey: "/about", parentDocId: "p1", parentCollection: "pages", locale: null });
    expect(typeof created[0].startedAt).toBe("string");
  });

  it("is idempotent — does not create a row when one already exists for the manifest key", async () => {
    const { req, created } = makeReq({
      parentDoc: { id: "p1", slug: "about" },
      variantCount: 2,
      existingRows: [{ manifestKey: "/about" }],
    });
    await ensureExperimentRecords("p1", "pages", abConfig, pluginConfig, req as never);
    expect(created).toHaveLength(0);
  });

  it("creates nothing when the parent has no published variants", async () => {
    const { req, created } = makeReq({ parentDoc: { id: "p1", slug: "about" }, variantCount: 0 });
    await ensureExperimentRecords("p1", "pages", abConfig, pluginConfig, req as never);
    expect(created).toHaveLength(0);
  });

  it("creates one row per locale when localization is enabled", async () => {
    const localizedConfig: CollectionABConfig = {
      generatePath: ({ doc, locale }) => {
        const slug = doc.slug as string | undefined;
        return slug ? `/${locale}/${slug}` : null;
      },
    };
    const { req, created } = makeReq({
      parentDoc: { id: "p1", slug: "about" },
      variantCount: 1,
      localization: ["en", "de"],
    });
    await ensureExperimentRecords("p1", "pages", localizedConfig, pluginConfig, req as never);
    expect(created.map((r) => r.manifestKey).sort()).toEqual(["/de/about", "/en/about"]);
    expect(created.map((r) => r.locale).sort()).toEqual(["de", "en"]);
  });

  it("creates nothing when the parent document cannot be found", async () => {
    const { req, created, payload } = makeReq({ parentDoc: { id: "p1", slug: "about" }, variantCount: 1 });
    payload.findByID = vi.fn().mockResolvedValue(null);
    await ensureExperimentRecords("p1", "pages", abConfig, pluginConfig, req as never);
    expect(created).toHaveLength(0);
  });

  it("creates nothing when generatePath returns null (no manifest key)", async () => {
    const { req, created } = makeReq({ parentDoc: { id: "p1" }, variantCount: 1 });
    await ensureExperimentRecords("p1", "pages", abConfig, pluginConfig, req as never);
    expect(created).toHaveLength(0);
  });
});
