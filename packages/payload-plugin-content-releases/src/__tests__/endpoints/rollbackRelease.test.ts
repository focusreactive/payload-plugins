import { describe, it, expect, vi } from "vitest";
import { createRollbackReleaseHandler } from "../../endpoints/rollbackRelease";

const PUBLISHED_RELEASE_WITH_SNAPSHOT = {
  status: "published",
  rollbackSnapshot: [
    {
      collection: "pages",
      docId: "doc-1",
      action: "publish",
      previousState: { title: "Old", _status: "published" },
    },
  ],
  publishedAt: "2026-01-01T00:00:00.000Z",
};

function makeReq({
  releaseId = "rel-1",
  releaseData = PUBLISHED_RELEASE_WITH_SNAPSHOT as any,
} = {}) {
  return {
    routeParams: { id: releaseId },
    user: { id: "user-1" },
    payload: {
      findByID: vi.fn().mockResolvedValue(releaseData),
      findVersions: vi.fn().mockResolvedValue({ docs: [] }),
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

describe("createRollbackReleaseHandler", () => {
  it("unauthenticated request → 401", async () => {
    const handler = createRollbackReleaseHandler({});
    const req = makeReq();
    (req as any).user = undefined;

    const response = await handler(req as any);

    expect(response.status).toBe(401);
  });

  it("non-published release → 400 with error mentioning the current status", async () => {
    const handler = createRollbackReleaseHandler({});
    const req = makeReq({ releaseData: { status: "draft" } });

    const response = await handler(req as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/draft/i);
  });

  it("all eligible, all succeed → 200, status reverted", async () => {
    const handler = createRollbackReleaseHandler({});
    const req = makeReq();

    const response = await handler(req as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("reverted");
  });

  it("all eligible, all fail → status failed", async () => {
    const handler = createRollbackReleaseHandler({});
    const req = makeReq();

    // orchestrateRollback calls:
    //   1st findByID  → release (in orchestrateRollback)
    //   2nd findByID  → release (in previewRollback)
    //   1st update    → set to "reverting"
    //   2nd update    → restore doc (this should fail)
    //   3rd update    → set final status
    req.payload.update
      .mockResolvedValueOnce({})             // set to "reverting"
      .mockRejectedValueOnce(new Error("DB error")) // restore doc fails
      .mockResolvedValue({});               // set final status

    const response = await handler(req as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("failed");
  });

  it("afterRollback hook fires on success", async () => {
    const afterRollback = vi.fn().mockResolvedValue(undefined);
    const handler = createRollbackReleaseHandler({ hooks: { afterRollback } });
    const req = makeReq();

    const response = await handler(req as any);
    const body = await response.json();

    expect(body.status).toBe("reverted");
    expect(afterRollback).toHaveBeenCalledOnce();
    expect(afterRollback).toHaveBeenCalledWith(
      expect.objectContaining({ releaseId: "rel-1" }),
    );
  });

  it("onRollbackError hook fires on failure", async () => {
    const onRollbackError = vi.fn().mockResolvedValue(undefined);
    const handler = createRollbackReleaseHandler({ hooks: { onRollbackError } });
    const req = makeReq();

    req.payload.update
      .mockResolvedValueOnce({})                    // set to "reverting"
      .mockRejectedValueOnce(new Error("DB error")) // restore doc fails
      .mockResolvedValue({});                       // set final status

    const response = await handler(req as any);
    const body = await response.json();

    expect(body.status).toBe("failed");
    expect(onRollbackError).toHaveBeenCalledOnce();
    expect(onRollbackError).toHaveBeenCalledWith(
      expect.objectContaining({
        releaseId: "rel-1",
        errors: expect.arrayContaining([
          expect.objectContaining({ docId: "doc-1", error: "DB error" }),
        ]),
      }),
    );
  });
});
