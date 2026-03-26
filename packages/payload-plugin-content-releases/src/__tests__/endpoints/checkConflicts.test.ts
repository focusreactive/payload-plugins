import { describe, it, expect, vi } from "vitest";
import { createCheckConflictsHandler } from "../../endpoints/checkConflicts";

describe("checkConflicts handler", () => {
  const handler = createCheckConflictsHandler();

  it("should return empty conflicts for items with matching versions", async () => {
    const req = {
      routeParams: { id: "rel-1" },
      payload: {
        find: vi.fn().mockResolvedValue({
          docs: [
            { id: "item-1", targetCollection: "pages", targetDoc: "doc-1", baseVersion: "2026-01-01T00:00:00Z", action: "publish" },
          ],
        }),
        findByID: vi.fn().mockResolvedValue({ id: "doc-1", updatedAt: "2026-01-01T00:00:00Z" }),
      },
    };
    const response = await handler(req as any);
    const body = await response.json();
    expect(body.conflicts).toHaveLength(0);
  });

  it("should return conflicts for modified documents", async () => {
    const req = {
      routeParams: { id: "rel-1" },
      payload: {
        find: vi.fn().mockResolvedValue({
          docs: [
            { id: "item-1", targetCollection: "pages", targetDoc: "doc-1", baseVersion: "2026-01-01T00:00:00Z", action: "publish" },
          ],
        }),
        findByID: vi.fn().mockResolvedValue({ id: "doc-1", updatedAt: "2026-01-02T00:00:00Z" }),
      },
    };
    const response = await handler(req as any);
    const body = await response.json();
    expect(body.conflicts).toHaveLength(1);
  });
});
