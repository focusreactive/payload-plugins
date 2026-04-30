import { describe, it, expect, vi } from "vitest";
import { createPublishReleaseHandler } from "../../endpoints/publishRelease";

function makeReq({
  releaseId = "rel-1",
  releaseData = { status: "draft", name: "Test" } as any,
  releaseItems = [] as any[],
  updateResult = {} as any,
} = {}) {
  return {
    routeParams: { id: releaseId },
    user: { id: "user-1" },
    payload: {
      findByID: vi.fn().mockResolvedValue(releaseData),
      find: vi.fn().mockResolvedValue({ docs: releaseItems }),
      update: vi.fn().mockResolvedValue(updateResult),
    },
  };
}

describe("publishRelease handler", () => {
  const handler = createPublishReleaseHandler({
    conflictStrategy: "fail",
    publishBatchSize: 20,
  });

  it("should reject unauthenticated requests", async () => {
    const req = makeReq();
    (req as any).user = undefined;
    const response = await handler(req as any);
    expect(response.status).toBe(401);
  });

  it.each(["publishing", "published", "failed", "reverting", "reverted"])(
    "should reject publishing a release with status %s",
    async (status) => {
      const req = makeReq({ releaseData: { status, name: "Test" } });
      const response = await handler(req as any);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain(status);
    },
  );

  it.each(["scheduled", "cancelled"])("should allow publishing a release with status %s", async (status) => {
    const req = makeReq({ releaseData: { status, name: "Test" } });
    const response = await handler(req as any);
    // 200 with failed status (empty items) is acceptable — the guard passed
    expect(response.status).toBe(200);
  });

  it("should handle publishing an empty release as failed", async () => {
    const req = makeReq({ releaseItems: [] });
    const response = await handler(req as any);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("failed");
  });

  it("should return 200 on successful publish", async () => {
    const items = [
      {
        id: "item-1",
        targetCollection: "pages",
        targetDoc: "doc-1",
        action: "publish",
        status: "pending",
        baseVersion: null,
        snapshot: { title: "Hello", _status: "published" },
      },
    ];
    const req = makeReq({ releaseItems: items });
    req.payload.findByID
      .mockResolvedValueOnce({ status: "draft", name: "Test" })
      .mockResolvedValue({ id: "doc-1", updatedAt: "2026-01-01" });

    const response = await handler(req as any);
    expect(response.status).toBe(200);
  });
});
