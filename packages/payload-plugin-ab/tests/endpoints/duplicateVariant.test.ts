import { describe, expect, it, vi } from "vitest";
import { AB_PASS_PERCENTAGE_FIELD, AB_VARIANT_OF_FIELD } from "../../src/constants";
import { duplicateVariantHandler } from "../../src/endpoints/duplicateVariant";

function makeReq(parentDoc: Record<string, unknown>) {
  const payload = {
    findByID: vi.fn().mockResolvedValue(parentDoc),
    duplicate: vi
      .fn()
      .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 99, ...data })
      ),
  };
  const req = {
    payload,
    json: () => Promise.resolve({ collectionSlug: "page", docId: parentDoc.id }),
  };
  return { payload, req };
}

describe("duplicateVariantHandler", () => {
  it("duplicates a draft parent as a draft so draft-only content does not fail validation", async () => {
    const { payload, req } = makeReq({ id: 1, slug: "home", _status: "draft" });

    const res = await duplicateVariantHandler(req as never);

    expect(res.status).toBe(201);
    expect(payload.duplicate).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "page", draft: true, id: 1 })
    );
  });

  it("keeps published parents producing published variants", async () => {
    const { payload, req } = makeReq({ id: 1, slug: "home", _status: "published" });

    await duplicateVariantHandler(req as never);

    expect(payload.duplicate).toHaveBeenCalledWith(expect.objectContaining({ draft: false }));
  });

  it("does not request a draft for collections without versioning", async () => {
    const { payload, req } = makeReq({ id: 1, slug: "home" });

    await duplicateVariantHandler(req as never);

    expect(payload.duplicate).toHaveBeenCalledWith(expect.objectContaining({ draft: false }));
  });

  it("links the variant to its parent with a suffixed slug and 1% traffic", async () => {
    const { payload, req } = makeReq({ id: 1, slug: "home", _status: "draft" });

    const res = await duplicateVariantHandler(req as never);
    const body = await res.json();

    const { data } = payload.duplicate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(data[AB_VARIANT_OF_FIELD]).toBe(1);
    expect(data[AB_PASS_PERCENTAGE_FIELD]).toBe(1);
    expect(data.slug).toMatch(/^home--[a-z0-9]+$/u);
    expect(body).toMatchObject({ id: 99, passPercentage: 1, slug: data.slug });
  });
});
