import { describe, expect, it, vi } from "vitest";
import { applyVariantPercentage } from "../../src/utils/applyVariantPercentage";
import type { VariantPercentageEntry } from "../../src/utils/buildPercentagePlan";

function makeReq(rawRow: Record<string, unknown> | null = { id: "v1", slug: "about--x" }) {
  const payload = {
    update: vi.fn().mockResolvedValue({}),
    db: {
      findOne: vi.fn().mockResolvedValue(rawRow),
      updateOne: vi.fn().mockResolvedValue({}),
    },
  };
  return { req: { payload } as never, payload };
}

const entry = (over: Partial<VariantPercentageEntry> = {}): VariantPercentageEntry => ({
  variantId: "v1",
  desired: 30,
  draftPercentage: 10,
  publishedPercentage: 10,
  isDirty: false,
  ...over,
});

describe("applyVariantPercentage", () => {
  it("writes only the draft when the original is saved as a draft", async () => {
    const { req, payload } = makeReq();
    await applyVariantPercentage({
      collectionSlug: "pages",
      entry: entry(),
      isPublish: false,
      req,
    });
    expect(payload.update).toHaveBeenCalledTimes(1);
    expect(payload.update.mock.calls[0][0]).toMatchObject({ draft: true, id: "v1" });
    expect(payload.db.updateOne).not.toHaveBeenCalled();
  });

  it("publishes cleanly with a single update when the variant has no unpublished changes", async () => {
    const { req, payload } = makeReq();
    await applyVariantPercentage({ collectionSlug: "pages", entry: entry(), isPublish: true, req });
    expect(payload.update).toHaveBeenCalledTimes(1);
    expect(payload.update.mock.calls[0][0]).not.toHaveProperty("draft");
    expect(payload.db.updateOne).not.toHaveBeenCalled();
  });

  it("writes the draft and patches the published row when the variant is dirty", async () => {
    const { req, payload } = makeReq();
    await applyVariantPercentage({
      collectionSlug: "pages",
      entry: entry({ isDirty: true }),
      isPublish: true,
      req,
    });
    expect(payload.update.mock.calls[0][0]).toMatchObject({ draft: true });
    expect(payload.db.findOne).toHaveBeenCalledTimes(1);
    expect(payload.db.updateOne.mock.calls[0][0].data).toMatchObject({
      id: "v1",
      slug: "about--x",
      _abPassPercentage: 30,
    });
  });

  it("never touches the published row of a variant that was never published", async () => {
    const { req, payload } = makeReq();
    await applyVariantPercentage({
      collectionSlug: "pages",
      entry: entry({ isDirty: true, publishedPercentage: null }),
      isPublish: true,
      req,
    });
    expect(payload.update).toHaveBeenCalledTimes(1);
    expect(payload.db.updateOne).not.toHaveBeenCalled();
  });

  it("skips the published write when the published value already matches", async () => {
    const { req, payload } = makeReq();
    await applyVariantPercentage({
      collectionSlug: "pages",
      entry: entry({ isDirty: true, publishedPercentage: 30 }),
      isPublish: true,
      req,
    });
    expect(payload.update).toHaveBeenCalledTimes(1);
    expect(payload.db.updateOne).not.toHaveBeenCalled();
  });

  it("skips the draft write when the draft value already matches", async () => {
    const { req, payload } = makeReq();
    await applyVariantPercentage({
      collectionSlug: "pages",
      entry: entry({ isDirty: true, draftPercentage: 30 }),
      isPublish: true,
      req,
    });
    expect(payload.update).not.toHaveBeenCalled();
    expect(payload.db.updateOne).toHaveBeenCalledTimes(1);
  });

  it("does not write when the raw row disappeared", async () => {
    const { req, payload } = makeReq(null);
    await applyVariantPercentage({
      collectionSlug: "pages",
      entry: entry({ isDirty: true }),
      isPublish: true,
      req,
    });
    expect(payload.db.updateOne).not.toHaveBeenCalled();
  });
});
