import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { resolvePath } from "../../src/server/index.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { createFolder, uniqueName } from "../helpers/treeFixtures.js";

// The dev app's public read access (`publicReads: true`), the one the frontend example runs on: an
// anonymous visitor reading in de must see a page that only en published, because every live
// check in the plugin counts it live in de through fallback (decision 24).
let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload({ publicReads: true });
});

afterAll(async () => {
  await harness?.destroy();
});

const createEnglishPage = async (status: "draft" | "published") => {
  const folder = await createFolder(harness.payload, { slug: uniqueName("public") });
  const page = await harness.payload.create({
    collection: "pages",
    data: { _status: status, folder: folder.id, slug: "only-english", title: "Only English" },
    depth: 0,
    draft: status === "draft",
    locale: "en",
    overrideAccess: true,
  });

  return { folder, page };
};

describe("anonymous reads of a page that only en published", () => {
  it("resolvePath in de answers the page", async () => {
    const { folder } = await createEnglishPage("published");

    const result = await resolvePath(harness.payload, {
      locale: "de",
      path: `/${folder.slug}/only-english`,
    });

    expect(result.type).toBe("page");
  });

  it("findByID in de answers the page, and a draft-only page stays hidden", async () => {
    const { page } = await createEnglishPage("published");
    const { page: draftPage } = await createEnglishPage("draft");

    const found = await harness.payload.findByID({
      collection: "pages",
      id: page.id,
      locale: "de",
      overrideAccess: false,
    });
    expect(found.id).toBe(page.id);

    await expect(
      harness.payload.findByID({
        collection: "pages",
        id: draftPage.id,
        locale: "de",
        overrideAccess: false,
      })
    ).rejects.toThrow();
  });

  it("the default locale and locale all keep the plain published check", async () => {
    const { page } = await createEnglishPage("published");

    for (const locale of ["en", "all"] as const) {
      const found = await harness.payload.findByID({
        collection: "pages",
        id: page.id,
        locale,
        overrideAccess: false,
      });
      expect(found.id).toBe(page.id);
    }
  });
});
