import type { CollectionSlug, Payload } from "payload";

import { TICK_PAGE } from "../lib/constants.js";

import type { JobId } from "./commit.js";
import { runJobsInline } from "./inline.js";
import { contextFor, settleIn } from "./operations.js";
import { SETTLE_SELECT, subjectOf } from "./store.js";
import type { InstanceDoc } from "./store.js";
import { loadSubject } from "./subject.js";

/**
 * Settles every active run with the current time. Needed only for `now`-based conditions; one
 * broken run is logged and skipped, never stops the others.
 */
export const tickWorkflows = async (
  payload: Payload
): Promise<{ checked: number; advanced: number }> => {
  const ctx = await contextFor(payload, null);
  let checked = 0;
  let advanced = 0;
  const jobs: JobId[] = [];
  // Keyset pages by id: a run that completes drops out of `active` without shifting later pages.
  let after: string | number | undefined;
  for (;;) {
    const page = await payload.find({
      collection: ctx.resolved.instancesSlug as CollectionSlug,
      where: {
        and: [
          { status: { equals: "active" } },
          ...(after === undefined ? [] : [{ id: { greater_than: after } }]),
        ],
      },
      select: SETTLE_SELECT,
      sort: "id",
      limit: TICK_PAGE,
      pagination: false,
      depth: 0,
      overrideAccess: true,
      req: ctx.req,
    });
    const active = page.docs as unknown as InstanceDoc[];
    for (const doc of active) {
      checked += 1;
      try {
        const subject = await loadSubject(payload, subjectOf(doc), null, ctx.req);
        const outcome = await settleIn(ctx, doc, subject);
        if (outcome.advanced) {
          advanced += 1;
        }
        jobs.push(...outcome.jobs);
      } catch (error) {
        payload.logger.error({ err: error, msg: `workflows: tick could not settle run ${doc.id}` });
      }
    }
    if (active.length < TICK_PAGE) {
      break;
    }
    after = active.at(-1)?.id;
  }
  await runJobsInline(payload, jobs);
  return { checked, advanced };
};
