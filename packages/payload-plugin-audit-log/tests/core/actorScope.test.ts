import { describe, expect, it, vi } from "vitest";
import { getScopedAuditActor, withAuditActor } from "../../src/core/actorScope";

describe("withAuditActor", () => {
  it("exposes the actor inside the scope, across awaits", async () => {
    const seen = await withAuditActor({ type: "agent", label: "importer" }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return getScopedAuditActor();
    });
    expect(seen).toEqual({ type: "agent", label: "importer" });
  });

  it("is empty outside any scope", () => {
    expect(getScopedAuditActor()).toBeUndefined();
  });

  it("inner scope wins and restores the outer one", async () => {
    await withAuditActor({ type: "system" }, async () => {
      await withAuditActor({ type: "agent" }, () => {
        expect(getScopedAuditActor()?.type).toBe("agent");
      });
      expect(getScopedAuditActor()?.type).toBe("system");
    });
  });

  it("turns a synchronous throw into a rejection", async () => {
    let result: Promise<unknown> | undefined;
    expect(() => {
      result = withAuditActor({ type: "agent" }, () => {
        throw new Error("boom");
      });
    }).not.toThrow();
    await expect(result).rejects.toThrow("boom");
  });

  it("shares the scope between copies of the module", async () => {
    vi.resetModules();
    const copyA = await import("../../src/core/actorScope");
    vi.resetModules();
    const copyB = await import("../../src/core/actorScope");
    expect(copyB).not.toBe(copyA);
    const seen = await copyA.withAuditActor({ type: "agent", label: "copy A" }, () =>
      copyB.getScopedAuditActor()
    );
    expect(seen).toEqual({ type: "agent", label: "copy A" });
  });
});
