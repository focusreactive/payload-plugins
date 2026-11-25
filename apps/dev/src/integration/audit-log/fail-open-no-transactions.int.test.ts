import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  auditErrorMessages,
  bootAuditPayload,
  dbAdapterName,
  targetActions,
  withAuditInsertsBlocked,
} from "./bootAuditPayload";
import type { AuditTestPayload } from "./bootAuditPayload";

describe.runIf(dbAdapterName() === "sqlite")(
  "fail open on SQLite's default setup, which runs without transactions",
  () => {
    let ctx: AuditTestPayload;
    beforeAll(async () => {
      ctx = await bootAuditPayload();
    });
    afterAll(async () => {
      await ctx?.cleanup();
    });
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("a failing audit insert does not fail the change and is logged", async () => {
      const doc = await ctx.payload.create({
        collection: "posts" as never,
        data: { title: "N1" } as never,
      });
      const errorLog = vi.spyOn(ctx.payload.logger, "error");

      await withAuditInsertsBlocked(ctx.payload, () =>
        ctx.payload.update({
          collection: "posts" as never,
          id: doc.id,
          data: { title: "N2" } as never,
        })
      );

      const saved = await ctx.payload.findByID({ collection: "posts" as never, id: doc.id });
      expect((saved as { title?: string }).title).toBe("N2");
      expect(await targetActions(ctx.payload, "posts", doc.id)).toEqual(["doc.create"]);
      expect(auditErrorMessages(errorLog).length).toBeGreaterThan(0);
    });
  }
);
