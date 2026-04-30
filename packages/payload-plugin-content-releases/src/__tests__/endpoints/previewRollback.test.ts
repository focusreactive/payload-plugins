import { describe, it, expect, vi } from "vitest";
import { createPreviewRollbackHandler } from "../../endpoints/previewRollback";

function makeReq({
  releaseId = "rel-1",
  releaseData = { status: "published" } as any,
} = {}) {
  return {
    routeParams: { id: releaseId },
    user: { id: "user-1" },
    payload: {
      findByID: vi.fn().mockResolvedValue(releaseData),
      findVersions: vi.fn().mockResolvedValue({ docs: [] }),
    },
  };
}

describe("createPreviewRollbackHandler", () => {
  it("unauthenticated request → 401", async () => {
    const handler = createPreviewRollbackHandler();
    const req = makeReq();
    (req as any).user = undefined;

    const response = await handler(req as any);

    expect(response.status).toBe(401);
  });

  it("non-published release → 400", async () => {
    const handler = createPreviewRollbackHandler();
    const req = makeReq({ releaseData: { status: "draft" } });

    const response = await handler(req as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  it("valid published release → 200 with eligible and skipped", async () => {
    const handler = createPreviewRollbackHandler();
    const req = makeReq({
      releaseData: {
        status: "published",
        rollbackSnapshot: [
          {
            collection: "pages",
            docId: "doc-1",
            action: "publish",
            previousState: { title: "Old" },
          },
        ],
        publishedAt: "2026-01-10T00:00:00.000Z",
      },
    });

    const response = await handler(req as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("eligible");
    expect(body).toHaveProperty("skipped");
    expect(Array.isArray(body.eligible)).toBe(true);
    expect(Array.isArray(body.skipped)).toBe(true);
  });
});
