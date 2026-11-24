import type { Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AUDIT_SLUG, bootDevAppPayload } from "./bootAuditPayload";

let ctx: { payload: Payload; cleanup: () => Promise<void> };
beforeAll(async () => {
  ctx = await bootDevAppPayload();
});
afterAll(async () => {
  await ctx?.cleanup();
});

describe("apps/dev config", () => {
  it("registers the audit log plugin and its collection", () => {
    expect(ctx.payload.config.custom.auditLog).toEqual({
      slug: AUDIT_SLUG,
      recordIpAndUserAgent: true,
    });
    expect(ctx.payload.collections[AUDIT_SLUG as never]).toBeDefined();
  });
});
