import type { PayloadRequest, TaskConfig } from "payload";
import { DEFAULT_PURGE_CRON, DEFAULT_PURGE_QUEUE, PURGE_TASK_SLUG } from "../constants";
import { recordAuditEvent } from "../core/writeEvent";
import type { EventSettings } from "../core/writeEvent";
import type { AuditRetentionOptions } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

export const cutoffDate = (now: Date, days: number) => new Date(now.getTime() - days * DAY_MS);

export function buildPurgeTask(
  settings: EventSettings,
  retention: AuditRetentionOptions
): TaskConfig {
  const { slug } = settings;
  return {
    slug: PURGE_TASK_SLUG,
    label: "Audit log retention purge",
    schedule: [
      { cron: retention.cron ?? DEFAULT_PURGE_CRON, queue: retention.queue ?? DEFAULT_PURGE_QUEUE },
    ],
    handler: async ({ req }: { req: PayloadRequest }) => {
      const before = cutoffDate(new Date(), retention.days).toISOString();
      const olderThanCutoff = {
        collection: slug,
        where: { occurredAt: { less_than: before } },
        req,
      };
      const { totalDocs: deleted } = await req.payload.db.count(olderThanCutoff);
      if (deleted > 0) await req.payload.db.deleteMany(olderThanCutoff);
      await recordAuditEvent(req, settings, {
        action: "audit.retention_purge",
        target: { kind: "audit", slug },
        actorOverride: {
          actor: { type: "system", label: PURGE_TASK_SLUG, source: "plugin" },
          via: "job",
        },
        metadata: { deleted, days: retention.days, before },
      });
      return { output: {} };
    },
  } as TaskConfig;
}
