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

  it("should reject publishing a non-draft release", async () => {
    const req = makeReq({ releaseData: { status: "published", name: "Test" } });
    const response = await handler(req as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("draft");
  });

  it("should reject publishing an empty release", async () => {
    const req = makeReq({ releaseItems: [] });
    const response = await handler(req as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("no items");
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
