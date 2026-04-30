import { describe, it, expect, vi } from "vitest";
import { executePublish } from "../../publish/executePublish";

function makePayload({
  findByIdResult = {} as any,
  updateResult = {} as any,
} = {}) {
  return {
    findByID: vi.fn().mockResolvedValue(findByIdResult),
    update: vi.fn().mockResolvedValue(updateResult),
  };
}

function makeItems(overrides: any[] = []) {
  return overrides.map((o, i) => ({
    id: `item-${i}`,
    targetCollection: "pages",
    targetDoc: `doc-${i}`,
    action: "publish",
    status: "pending",
    baseVersion: null,
    snapshot: { title: `Page ${i}`, _status: "published" },
    ...o,
  }));
}

describe("executePublish", () => {
  it("should publish all items by calling payload.update", async () => {
    const payload = makePayload({ findByIdResult: { id: "doc-0", updatedAt: "2026-01-01" } });
    const items = makeItems([{ targetDoc: "doc-0" }]);

    const result = await executePublish({
      items: items as any,
      payload: payload as any,
      conflictStrategy: "fail",
      batchSize: 20,
    });

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "pages",
        id: "doc-0",
        data: expect.objectContaining({ title: "Page 0" }),
      }),
    );
    expect(result.published).toHaveLength(1);
    expect(result.failed).toHaveLength(0);
  });

  it("should capture rollback snapshot before publishing", async () => {
    const originalDoc = { id: "doc-0", title: "Original", updatedAt: "2026-01-01" };
    const payload = makePayload({ findByIdResult: originalDoc });
    const items = makeItems([{ targetDoc: "doc-0" }]);

    const result = await executePublish({
      items: items as any,
      payload: payload as any,
      conflictStrategy: "fail",
      batchSize: 20,
    });

    expect(result.rollbackSnapshot).toHaveLength(1);
    expect(result.rollbackSnapshot[0]!.previousState).toEqual(originalDoc);
  });

  it("should handle unpublish action by setting _status to draft", async () => {
    const payload = makePayload({
      findByIdResult: { id: "doc-0", _status: "published", updatedAt: "2026-01-01" },
    });
    const items = makeItems([{ targetDoc: "doc-0", action: "unpublish" }]);

    await executePublish({
      items: items as any,
      payload: payload as any,
      conflictStrategy: "fail",
      batchSize: 20,
    });

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ _status: "draft" }),
      }),
    );
  });

  it("should skip items with conflicts when strategy is fail", async () => {
    const payload = makePayload({
      findByIdResult: { id: "doc-0", updatedAt: "2026-01-02T00:00:00Z" },
    });
    const items = makeItems([{ targetDoc: "doc-0", baseVersion: "2026-01-01T00:00:00Z" }]);

    const result = await executePublish({
      items: items as any,
      payload: payload as any,
      conflictStrategy: "fail",
      batchSize: 20,
    });

    expect(result.failed).toHaveLength(1);
    expect(result.published).toHaveLength(0);
  });

  it("should force-publish items with conflicts when strategy is force", async () => {
    const payload = makePayload({
      findByIdResult: { id: "doc-0", updatedAt: "2026-01-02T00:00:00Z" },
    });
    const items = makeItems([{ targetDoc: "doc-0", baseVersion: "2026-01-01T00:00:00Z" }]);

    const result = await executePublish({
      items: items as any,
      payload: payload as any,
      conflictStrategy: "force",
      batchSize: 20,
    });

    expect(result.published).toHaveLength(1);
  });

  it("should record errors for failed updates", async () => {
    const payload = makePayload({
      findByIdResult: { id: "doc-0", updatedAt: "2026-01-01" },
    });
    payload.update.mockRejectedValue(new Error("DB write failed"));
    const items = makeItems([{ targetDoc: "doc-0" }]);

    const result = await executePublish({
      items: items as any,
      payload: payload as any,
      conflictStrategy: "fail",
      batchSize: 20,
    });

    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]!.error).toContain("DB write failed");
  });
});
