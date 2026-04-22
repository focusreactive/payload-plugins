import { describe, it, expect, vi } from "vitest";
import { detectConflicts } from "../../publish/detectConflicts";

function makePayload(docs: Record<string, any>) {
  return {
    findByID: vi.fn().mockImplementation(({ collection, id }) => {
      const key = `${collection}:${id}`;
      if (docs[key]) return Promise.resolve(docs[key]);
      return Promise.reject(new Error("Not found"));
    }),
  };
}

describe("detectConflicts", () => {
  it("should return no conflicts when baseVersion matches", async () => {
    const payload = makePayload({
      "pages:doc-1": { id: "doc-1", updatedAt: "2026-01-01T00:00:00Z" },
    });
    const items = [
      { id: "item-1", targetCollection: "pages", targetDoc: "doc-1", baseVersion: "2026-01-01T00:00:00Z", action: "publish" },
    ];
    const result = await detectConflicts(items as any, payload as any);
    expect(result).toHaveLength(0);
  });

  it("should detect conflict when baseVersion differs", async () => {
    const payload = makePayload({
      "pages:doc-1": { id: "doc-1", updatedAt: "2026-01-02T00:00:00Z" },
    });
    const items = [
      { id: "item-1", targetCollection: "pages", targetDoc: "doc-1", baseVersion: "2026-01-01T00:00:00Z", action: "publish" },
    ];
    const result = await detectConflicts(items as any, payload as any);
    expect(result).toHaveLength(1);
    expect(result[0]!.itemId).toBe("item-1");
  });

  it("should detect conflict when document is missing", async () => {
    const payload = makePayload({});
    const items = [
      { id: "item-1", targetCollection: "pages", targetDoc: "doc-1", baseVersion: "2026-01-01T00:00:00Z", action: "publish" },
    ];
    const result = await detectConflicts(items as any, payload as any);
    expect(result).toHaveLength(1);
    expect(result[0]!.reason).toContain("not found");
  });

  it("should skip conflict check for items without baseVersion", async () => {
    const payload = makePayload({
      "pages:doc-1": { id: "doc-1", updatedAt: "2026-01-02T00:00:00Z" },
    });
    const items = [
      { id: "item-1", targetCollection: "pages", targetDoc: "doc-1", baseVersion: null, action: "publish" },
    ];
    const result = await detectConflicts(items as any, payload as any);
    expect(result).toHaveLength(0);
  });
});
