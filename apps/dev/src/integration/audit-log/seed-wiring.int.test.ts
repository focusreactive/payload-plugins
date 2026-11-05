import type { Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { SEED_LABEL, seedWithAudit } from "../../seedWithAudit";
import { AUDIT_SLUG, bootDevAppPayload, events, eventsWithAction } from "./bootAuditPayload";

let ctx: { payload: Payload; cleanup: () => Promise<void> };
beforeAll(async () => {
  ctx = await bootDevAppPayload();
});
afterAll(async () => {
  await ctx?.cleanup();
});

describe("apps/dev config", () => {
  it("registers the audit log plugin and its collection", () => {
    expect(ctx.payload.config.custom.auditLog).toEqual({ slug: AUDIT_SLUG });
    expect(ctx.payload.collections[AUDIT_SLUG as never]).toBeDefined();
  });
});

describe("apps/dev seed wiring", () => {
  it("everything the seed writes is done by the seed actor, and the run is recorded once as system.seed", async () => {
    const { seed } = await import("../../seed");
    const before = (await events(ctx.payload)).length;
    await seedWithAudit(ctx.payload, seed);

    const seeded = (await events(ctx.payload)).slice(before);
    const writtenTargets = new Set(seeded.map((event) => `${event.action} ${event.target.slug}`));
    expect(writtenTargets).toEqual(
      new Set([
        "doc.create users",
        "global.update header",
        "doc.create pages",
        "doc.create articles",
        "doc.create playground",
        "system.seed seed",
      ])
    );
    expect(seeded.at(-1)?.action).toBe("system.seed");
    for (const event of seeded) {
      expect(event.actor).toMatchObject({ type: "seed", label: SEED_LABEL, source: "als" });
    }
    const seedRuns = await eventsWithAction(ctx.payload, "system.seed");
    expect(seedRuns).toHaveLength(1);
    expect(seedRuns[0]?.target).toMatchObject({ kind: "system", slug: "seed", label: SEED_LABEL });
  });
});
