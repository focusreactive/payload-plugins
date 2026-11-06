import { describe, expect, it, vi } from "vitest";
import { normalizeOptions } from "../../src/options";
import { buildPurgeTask, cutoffDate } from "../../src/retention/purgeTask";

const run = (task: ReturnType<typeof buildPurgeTask>, req: unknown) =>
  (task.handler as (a: unknown) => Promise<unknown>)({ req, input: {} });

const makeReq = (stale = 3) => {
  const deleteMany = vi.fn().mockResolvedValue(undefined);
  const count = vi.fn().mockResolvedValue({ totalDocs: stale });
  const create = vi.fn().mockResolvedValue({});
  const req = {
    context: {},
    user: null,
    payloadAPI: "local",
    headers: new Headers(),
    payload: { db: { count, deleteMany, create } },
  };
  return { req, deleteMany, count, create };
};

describe("retention", () => {
  it("cutoff is N days before now", () => {
    expect(cutoffDate(new Date("2026-11-04T00:00:00.000Z"), 30).toISOString()).toBe(
      "2026-10-05T00:00:00.000Z"
    );
  });

  it("counts and deletes older events through the adapter and records how many it deleted", async () => {
    const { req, deleteMany, count, create } = makeReq(3);
    const task = buildPurgeTask("audit-events", { days: 30 });
    expect(task.slug).toBe("auditLogPurge");
    expect(task.schedule).toEqual([{ cron: "0 3 * * *", queue: "default" }]);
    await run(task, req);
    const arg = deleteMany.mock.calls[0]?.[0];
    expect(arg.collection).toBe("audit-events");
    expect(arg.where.occurredAt.less_than).toMatch(/^\d{4}-/u);
    expect(count).toHaveBeenCalledWith({ collection: "audit-events", where: arg.where, req });
    const data = create.mock.calls[0]?.[0].data;
    expect(data).toMatchObject({
      action: "audit.retention_purge",
      actor: { type: "system", label: "auditLogPurge", source: "plugin" },
      via: "job",
      target: { kind: "audit", slug: "audit-events" },
      metadata: { deleted: 3, days: 30, before: arg.where.occurredAt.less_than },
    });
  });

  it("skips the delete when nothing is old enough, and still records the run", async () => {
    const { req, deleteMany, create } = makeReq(0);
    await run(buildPurgeTask("audit-events", { days: 30 }), req);
    expect(deleteMany).not.toHaveBeenCalled();
    expect(create.mock.calls[0]?.[0].data.metadata).toMatchObject({ deleted: 0, days: 30 });
  });

  it("honours custom cron, queue and slug", async () => {
    const { req, deleteMany } = makeReq();
    const task = buildPurgeTask("journal", { days: 7, cron: "0 1 * * 0", queue: "nightly" });
    expect(task.schedule).toEqual([{ cron: "0 1 * * 0", queue: "nightly" }]);
    await run(task, req);
    expect(deleteMany.mock.calls[0]?.[0].collection).toBe("journal");
  });

  it("does not throw when the audit insert fails (fail-open)", async () => {
    const { req, create } = makeReq();
    create.mockRejectedValue(new Error("db down"));
    (req.payload as Record<string, unknown>).logger = { error: vi.fn() };
    const task = buildPurgeTask("audit-events", { days: 1 });
    await expect(run(task, req)).resolves.toEqual({ output: {} });
  });

  it("rejects invalid retention.days at normalizeOptions time", () => {
    for (const days of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => normalizeOptions({ retention: { days } })).toThrow(/retention\.days/u);
    }
    expect(normalizeOptions({ retention: { days: 90 } }).retention?.days).toBe(90);
  });
});
