import { describe, it, expect, vi } from "vitest";
import { previewRollback } from "../../rollback/previewRollback";

function makePayload({
  findByIDResult = {} as any,
  findVersionsResult = { docs: [] } as any,
} = {}) {
  return {
    findByID: vi.fn().mockResolvedValue(findByIDResult),
    findVersions: vi.fn().mockResolvedValue(findVersionsResult),
  };
}

const BASE_RELEASE = {
  rollbackSnapshot: [
    {
      collection: "pages",
      docId: "doc-1",
      action: "publish",
      previousState: { title: "Old" },
    },
  ],
  publishedAt: "2026-01-10T00:00:00.000Z",
};

describe("previewRollback", () => {
  it("no newer published version → entry is eligible", async () => {
    const payload = makePayload({
      findByIDResult: BASE_RELEASE,
      findVersionsResult: {
        docs: [{ updatedAt: "2026-01-05T00:00:00.000Z" }],
      },
    });

    const result = await previewRollback({ releaseId: "rel-1", payload: payload as any });

    expect(result.eligible).toHaveLength(1);
    expect(result.skipped).toHaveLength(0);
    expect(result.eligible[0]!.docId).toBe("doc-1");
  });

  it("published version with updatedAt after release.publishedAt → entry is skipped", async () => {
    const payload = makePayload({
      findByIDResult: BASE_RELEASE,
      findVersionsResult: {
        docs: [{ updatedAt: "2026-01-15T00:00:00.000Z" }],
      },
    });

    const result = await previewRollback({ releaseId: "rel-1", payload: payload as any });

    expect(result.eligible).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]!.docId).toBe("doc-1");
  });

  it("no versions at all → entry is eligible", async () => {
    const payload = makePayload({
      findByIDResult: BASE_RELEASE,
      findVersionsResult: { docs: [] },
    });

    const result = await previewRollback({ releaseId: "rel-1", payload: payload as any });

    expect(result.eligible).toHaveLength(1);
    expect(result.skipped).toHaveLength(0);
  });

  it("mixed entries → correct split between eligible and skipped", async () => {
    const release = {
      rollbackSnapshot: [
        {
          collection: "pages",
          docId: "doc-1",
          action: "publish",
          previousState: { title: "Old Page" },
        },
        {
          collection: "pages",
          docId: "doc-2",
          action: "publish",
          previousState: { title: "Old Page 2" },
        },
      ],
      publishedAt: "2026-01-10T00:00:00.000Z",
    };

    const payload = makePayload({ findByIDResult: release });
    // First call: version before publishedAt → eligible
    // Second call: version after publishedAt → skipped
    payload.findVersions
      .mockResolvedValueOnce({ docs: [{ updatedAt: "2026-01-05T00:00:00.000Z" }] })
      .mockResolvedValueOnce({ docs: [{ updatedAt: "2026-01-15T00:00:00.000Z" }] });

    const result = await previewRollback({ releaseId: "rel-1", payload: payload as any });

    expect(result.eligible).toHaveLength(1);
    expect(result.skipped).toHaveLength(1);
    expect(result.eligible[0]!.docId).toBe("doc-1");
    expect(result.skipped[0]!.docId).toBe("doc-2");
  });
});
