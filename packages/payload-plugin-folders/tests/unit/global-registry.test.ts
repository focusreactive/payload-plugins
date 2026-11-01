import type { Payload, PayloadRequest } from "payload";
import { describe, expect, it, vi } from "vitest";

// A Next.js app loads the plugin once per route layer: the copy that boots Payload and the copy a
// page imports are two module instances. These tests load two copies the same way and check that
// the state a write depends on is one state.
const loadCopy = async <TModule>(load: () => Promise<TModule>): Promise<TModule> => {
  vi.resetModules();

  return load();
};

describe("state shared by two copies of the plugin", () => {
  it("a tree lock taken by one copy is held for the other", async () => {
    const payload = { db: {}, logger: { error: vi.fn(), warn: vi.fn() } } as unknown as Payload;
    const req = { payload } as unknown as PayloadRequest;
    const copyThatTakes = await loadCopy(() => import("../../src/core/treeLock.js"));
    const copyThatAsks = await loadCopy(() => import("../../src/core/treeLock.js"));
    expect(copyThatAsks).not.toBe(copyThatTakes);

    expect(await copyThatTakes.acquireTreeLock(req)).toBe(true);

    expect(await copyThatAsks.holdsTreeLock(req)).toBe(true);
    expect(copyThatAsks.isTreeLockHeld(payload)).toBe(true);
    // The second copy joins the hold instead of queueing behind it.
    expect(await copyThatAsks.acquireTreeLock(req)).toBe(false);
    copyThatAsks.releaseUnboundTreeLock(req);
    expect(copyThatTakes.isTreeLockHeld(payload)).toBe(false);
  });

  it("an operation handler registered by one copy runs for the other", async () => {
    const copyThatRegisters = await loadCopy(() => import("../../src/core/operations.js"));
    const copyThatStarts = await loadCopy(() => import("../../src/core/operations.js"));
    expect(copyThatStarts).not.toBe(copyThatRegisters);
    const req = {
      payload: { db: { create: async () => ({ id: 1 }) } },
      user: null,
    } as unknown as PayloadRequest;

    copyThatRegisters.registerOperationHandler("publish", { run: async () => undefined });

    await expect(
      copyThatStarts.startOperation({ items: [], kind: "publish", req })
    ).resolves.toEqual({ id: 1, total: 0 });
  });

  it("a page snapshot pushed by one copy is popped by the other", async () => {
    const req = { payload: {} } as unknown as PayloadRequest;
    const snapshot = { folder: 3 } as never;
    const copyThatPushes = await loadCopy(() => import("../../src/core/pageRecords.js"));
    const copyThatPops = await loadCopy(() => import("../../src/core/pageRecords.js"));
    expect(copyThatPops).not.toBe(copyThatPushes);

    copyThatPushes.pushSnapshot(req, "pages", 1, snapshot);

    expect(copyThatPops.popSnapshot(req, "pages", 1)).toBe(snapshot);
  });

  it("a folder snapshot pushed by one copy is popped by the other", async () => {
    const req = { payload: {} } as unknown as PayloadRequest;
    const record = { id: 7 } as never;
    const copyThatPushes = await loadCopy(() => import("../../src/core/subtree.js"));
    const copyThatPops = await loadCopy(() => import("../../src/core/subtree.js"));
    expect(copyThatPops).not.toBe(copyThatPushes);

    copyThatPushes.pushFolderSnapshot(req, record);

    expect(copyThatPops.popFolderSnapshot(req, 7)).toBe(record);
  });
});
