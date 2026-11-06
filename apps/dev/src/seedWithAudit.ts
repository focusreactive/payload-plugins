import { logAuditEvent, withAuditActor } from "@focus-reactive/payload-plugin-audit-log";
import type { Payload } from "payload";

export const SEED_LABEL = "apps/dev seed";

export const seedWithAudit = (payload: Payload, seed: (payload: Payload) => Promise<void>) =>
  withAuditActor({ label: SEED_LABEL, type: "seed" }, async () => {
    await seed(payload);
    await logAuditEvent(payload, {
      action: "system.seed",
      target: { kind: "system", label: SEED_LABEL, slug: "seed" },
    });
  });
