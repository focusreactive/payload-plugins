import { describe, it, expect, vi } from "vitest";
import { checkScheduledReleases } from "../../scheduler/checkScheduledReleases";

function makePayload(dueReleases: any[] = [], items: any[] = []) {
  return {
    find: vi.fn()
      .mockResolvedValueOnce({ docs: dueReleases }) // scheduled releases query
      .mockResolvedValue({ docs: items }), // release items query
    findByID: vi.fn().mockResolvedValue({ id: "doc-1", updatedAt: "2026-01-01" }),
    update: vi.fn().mockResolvedValue({}),
    logger: {
      info: vi.fn(),
      error: vi.fn(),
    },
  };
}

describe("checkScheduledReleases", () => {
  it("should do nothing when no releases are due", async () => {
    const payload = makePayload([]);

    await checkScheduledReleases({
      payload: payload as any,
      conflictStrategy: "fail",
      batchSize: 20,
    });

    // Only one find call (for scheduled releases), no updates
    expect(payload.find).toHaveBeenCalledTimes(1);
    expect(payload.update).not.toHaveBeenCalled();
  });

  it("should process due releases", async () => {
    const dueRelease = {
      id: "rel-1",
      name: "Spring Campaign",
      status: "scheduled",
      scheduledAt: new Date(Date.now() - 60000).toISOString(),
    };
    const items = [
      {
        id: "item-1",
        targetCollection: "pages",
        targetDoc: "doc-1",
        action: "publish",
        status: "pending",
        baseVersion: null,
        snapshot: { title: "Published", _status: "published" },
      },
    ];

    const payload = makePayload([dueRelease], items);

    await checkScheduledReleases({
      payload: payload as any,
      conflictStrategy: "fail",
      batchSize: 20,
    });

    // Should have called update multiple times (status transitions + item updates)
    expect(payload.update).toHaveBeenCalled();
    expect(payload.logger.info).toHaveBeenCalledWith(
      expect.stringContaining("Spring Campaign"),
    );
  });

  it("should log errors for failed releases", async () => {
    const dueRelease = {
      id: "rel-1",
      name: "Bad Release",
      status: "scheduled",
      scheduledAt: new Date(Date.now() - 60000).toISOString(),
    };

    const payload = makePayload([dueRelease]);
    // Make find fail on second call (items query)
    payload.find
      .mockReset()
      .mockResolvedValueOnce({ docs: [dueRelease] })
      .mockRejectedValueOnce(new Error("DB connection lost"));
    // orchestratePublish will throw
    payload.update.mockRejectedValue(new Error("DB connection lost"));

    await checkScheduledReleases({
      payload: payload as any,
      conflictStrategy: "fail",
      batchSize: 20,
    });

    expect(payload.logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Bad Release"),
    );
  });
});
