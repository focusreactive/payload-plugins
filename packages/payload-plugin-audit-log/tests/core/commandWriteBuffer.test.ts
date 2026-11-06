import type { Payload } from "payload";
import { describe, expect, it, vi } from "vitest";

const silentPayload = { logger: { warn: vi.fn() } } as unknown as Payload;

describe("bufferAuditWritesUntilCommandEnds", () => {
  it("shares the active command between copies of the module", async () => {
    vi.resetModules();
    const copyA = await import("../../src/core/commandWriteBuffer");
    vi.resetModules();
    const copyB = await import("../../src/core/commandWriteBuffer");
    expect(copyB).not.toBe(copyA);
    const seenByCopyB = await copyA.bufferAuditWritesUntilCommandEnds(silentPayload, async () =>
      copyB.activeCommandWrites()
    );
    expect(seenByCopyB).toEqual({ held: [], writeAfterNextCommit: false });
  });
});
