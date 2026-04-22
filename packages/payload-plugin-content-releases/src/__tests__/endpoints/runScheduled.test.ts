import { describe, it, expect, vi } from "vitest";
import { createRunScheduledHandler } from "../../endpoints/runScheduled";

describe("runScheduled handler", () => {
  const handler = createRunScheduledHandler({
    secret: "test-secret",
    conflictStrategy: "fail",
    publishBatchSize: 20,
  });

  it("should reject unauthorized requests", async () => {
    const req = { headers: { get: () => null }, payload: {} };
    const response = await handler(req as any);
    expect(response.status).toBe(401);
  });

  it("should reject wrong bearer token", async () => {
    const req = { headers: { get: () => "Bearer wrong-token" }, payload: {} };
    const response = await handler(req as any);
    expect(response.status).toBe(401);
  });

  it("should process due scheduled releases", async () => {
    const dueRelease = {
      id: "rel-1",
      name: "Test Release",
      status: "scheduled",
      scheduledAt: new Date(Date.now() - 60000).toISOString(),
    };
    const req = {
      headers: { get: () => "Bearer test-secret" },
      payload: {
        find: vi.fn()
          .mockResolvedValueOnce({ docs: [dueRelease] })  // find due releases
          .mockResolvedValueOnce({ docs: [] }),            // find items (empty -> failed)
        findByID: vi.fn().mockResolvedValue(dueRelease),
        update: vi.fn().mockResolvedValue({}),
      },
    };

    const response = await handler(req as any);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
  });
});
