import type { ClientField } from "payload";
import { describe, expect, it, vi } from "vitest";
import { buildAnalysisInput } from "../../src/components/SeoDrawer/build-analysis-input";
import type { MediaResolver } from "../../src/content/uploads/media-resolver";
import type { UploadWalkContext } from "../../src/content/uploads/transform-upload-values";
import type { ResolvedUploadDoc } from "../../src/content/uploads/types";

const SCHEMA = [
  {
    name: "sections",
    type: "blocks",
    blocks: [
      {
        slug: "hero",
        fields: [
          { name: "title", type: "text" },
          { name: "image", type: "upload", relationTo: "media" },
        ],
      },
    ],
  },
] as unknown as ClientField[];

const WALK_CTX: UploadWalkContext = { isUploadCollection: (slug) => slug === "media", blocksBySlug: {} };

const fakeResolver = (docs: Record<string, ResolvedUploadDoc>): MediaResolver => ({
  resolve: async () => new Map(Object.entries(docs)),
  invalidate: () => undefined,
});

const baseArgs = {
  locale: "en" as const,
  payloadLocale: "en",
  keyphrase: "running shoes",
  fields: { content: "sections", slug: "slug" },
  site: { name: "Dev", baseUrl: "https://dev.test" },
  schemaFields: SCHEMA,
  walkCtx: WALK_CTX,
};

describe("buildAnalysisInput", () => {
  it("resolves upload IDs into <img> tags in contentHtml", async () => {
    const resolver = fakeResolver({
      "media:1": { id: 1, url: "/m/trail.jpg", mimeType: "image/jpeg", alt: "running shoes on a trail" },
    });
    const values = { sections: [{ blockType: "hero", title: "Hi", image: 1 }] };

    const input = await buildAnalysisInput({ ...baseArgs, values, resolver });

    expect(input.contentHtml).toContain('<img src="/m/trail.jpg" alt="running shoes on a trail" />');
  });

  it("skips collection/resolution entirely when no refs are present", async () => {
    const resolve = vi.fn();
    const resolver = { resolve, invalidate: () => undefined } as unknown as MediaResolver;
    const values = { sections: [{ blockType: "hero", title: "Hi" }] };

    const input = await buildAnalysisInput({ ...baseArgs, values, resolver });

    expect(resolve).not.toHaveBeenCalled();
    expect(input.contentHtml).toContain("<p>Hi</p>");
  });

  it("uses the async override with HYDRATED values and serializes its Intermediate Representation", async () => {
    const resolver = { resolve: vi.fn(async () => new Map()), invalidate: vi.fn() } as never;
    const override = vi.fn(async (data: Record<string, unknown>) => [{ type: "paragraph" as const, text: `custom ${String((data as { x?: unknown }).x)}` }]);
    const input = await buildAnalysisInput({ ...baseArgs, values: { x: 42 }, resolver, override });
    expect(override).toHaveBeenCalledOnce();
    expect(input.contentHtml).toBe("<p>custom 42</p>");
  });
});
