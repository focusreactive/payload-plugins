/**
 * Proves the full loop the SEO drawer relies on: structured block fields
 * (a link, an image upload) are serialized into real <a>/<img> by extractContent,
 * so the keyphrase checks that read them — textCompetingLinks (getAnchorsWithKeyphrase,
 * tree-dependent) and imageKeyphrase (altTagCount) — resolve with live data instead of
 * silently returning undefined.
 */
import { describe, expect, it } from "vitest";
import type { ClientField } from "payload";
import { extractContent } from "../../src/content/extractContent";
import { serialize } from "../../src/content/schema/serialize";
import { runAnalysis } from "../../src/engine/runAnalysis";
import type { AnalysisInput } from "../../src/engine/types/analysis";
import { collectUploadRefs } from "../../src/content/uploads/collect-upload-refs";
import { hydrateUploadValues } from "../../src/content/uploads/hydrate-values";
import type { UploadWalkContext } from "../../src/content/uploads/transform-upload-values";

describe("content extraction → analysis (links + images)", () => {
  it("a Hero link with keyphrase anchor text and a keyphrase image alt light up the checks", () => {
    const data = {
      sections: [
        {
          blockType: "hero",
          title: "The Best Running Shoes",
          description: "Everything about running shoes for every runner.",
          // Anchor text equals the keyphrase and points off-site → a genuine competing link.
          links: [{ id: "1", label: "running shoes", url: "https://competitor.example/running-shoes" }],
          image: { id: "m1", url: "/media/trail.jpg", mimeType: "image/jpeg", alt: "running shoes on a trail" },
        },
        {
          blockType: "copy",
          text: "Running shoes are essential for runners. Buy quality running shoes today and improve your running every day.",
        },
      ],
    };

    const contentHtml = serialize(extractContent(data, { content: "sections" }));
    expect(contentHtml).toContain('<a href="https://competitor.example/running-shoes">running shoes</a>');
    expect(contentHtml).toContain('<img src="/media/trail.jpg" alt="running shoes on a trail" />');

    const input: AnalysisInput = {
      title: "The Best Running Shoes",
      slug: "best-running-shoes",
      description: "Best running shoes for runners who want quality running shoes for daily running.",
      contentHtml,
      keyphrase: "running shoes",
      locale: "en_US",
      site: { name: "Shop", baseUrl: "https://shop.example" },
      has: { seoTitle: true, metaDescription: true, slug: true, content: true },
    };
    const result = runAnalysis(input);

    const competing = result.keyphrase.checks.find((c) => c.id === "textCompetingLinks");
    expect(competing?.data, "textCompetingLinks must resolve once a competing link exists").toBeDefined();
    const items = (competing?.data as { items?: unknown[] } | undefined)?.items;
    expect(Array.isArray(items)).toBe(true);
    expect((items as unknown[]).length).toBeGreaterThan(0);

    const image = result.keyphrase.checks.find((c) => c.id === "imageKeyphrase");
    expect(image?.data, "imageKeyphrase must resolve once an <img> exists").toBeDefined();
    expect((image?.data as { total?: number } | undefined)?.total).toBeGreaterThan(0);
  });

  it("form-state upload IDs hydrate into <img> and light up imageCount/altTagCount", () => {
    const schema = [
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
    const walkCtx: UploadWalkContext = { isUploadCollection: (slug) => slug === "media", blocksBySlug: {} };
    // what reduceFieldsToValues actually yields: the upload field is a bare ID
    const formValues = {
      sections: [{ blockType: "hero", title: "The Best Running Shoes", image: 7 }],
    };

    const refs = collectUploadRefs(formValues, schema, walkCtx);
    expect(refs).toEqual([{ collection: "media", id: 7 }]);

    const resolved = new Map([["media:7", { id: 7, url: "/media/trail.jpg", mimeType: "image/jpeg", alt: "running shoes on a trail" }]]);
    const hydrated = hydrateUploadValues(formValues, schema, walkCtx, resolved);
    const contentHtml = serialize(extractContent(hydrated, { content: "sections" }));
    expect(contentHtml).toContain('<img src="/media/trail.jpg" alt="running shoes on a trail" />');

    const result = runAnalysis({
      title: "The Best Running Shoes",
      slug: "best-running-shoes",
      description: "Best running shoes for runners.",
      contentHtml,
      keyphrase: "running shoes",
      locale: "en_US",
      site: { name: "Shop", baseUrl: "https://shop.example" },
      has: { seoTitle: true, metaDescription: true, slug: true, content: true },
    });

    const images = result.onPage.checks.find((c) => c.id === "images");
    expect((images?.data as { count?: number } | undefined)?.count).toBe(1);

    const imageKeyphrase = result.keyphrase.checks.find((c) => c.id === "imageKeyphrase");
    expect((imageKeyphrase?.data as { total?: number; matched?: number } | undefined)?.total).toBe(1);
    expect((imageKeyphrase?.data as { matched?: number } | undefined)?.matched).toBe(1);

    expect(result.vitals.images).toBe(1);
  });
});
