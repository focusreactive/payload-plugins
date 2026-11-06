import type { CollectionSlug, Payload } from "payload";

import type { TaskRunnerContext } from "../../TaskRunnerProvider.interface.js";
import { asRequester } from "../../../../shared/payload/RequestScope.shapes.js";
import type { PayloadJob, StoredWorkflowInput } from "../store/index.js";

import { readLegacyRun } from "./legacyInput.js";

export type AdoptionDeps = {
  payload: Payload;
  jobsCollection: string;
  report: TaskRunnerContext["report"];
};

/**
 * Gives a job queued before 1.0 the pointer a job carries now.
 *
 * Adopting twice is adopting once: it replays `queued` per locale, and recording a locale already
 * recorded leaves it alone. The job's own id becomes the handle — the only name it has ever had,
 * and a host may be holding it. Answers nothing when the row says too little to place.
 */
export async function adoptLegacyJob(
  deps: AdoptionDeps,
  job: PayloadJob
): Promise<StoredWorkflowInput | null> {
  const run = readLegacyRun(job.input);
  if (run === null) return null;

  const handle = String(job.id);
  const scope = { requester: asRequester(run.requesterId, run.requesterCollection) };

  for (const locale of run.locales) {
    await deps.report(
      deps.payload,
      { handle, targetLng: locale.lng },
      {
        state: "queued",
        work: {
          collectionSlug: run.collectionSlug as CollectionSlug,
          collectionId: run.collectionId,
          sourceLng: run.sourceLng,
          filters: locale.filters,
          publishOnTranslation: run.publishOnTranslation,
        },
      },
      scope
    );
  }

  const pointer: StoredWorkflowInput = {
    handle,
    locales: run.locales.map((locale) => locale.lng),
  };

  const db = deps.payload.db as {
    updateOne: (args: {
      collection: string;
      id: string | number;
      data: { input: StoredWorkflowInput };
      returning: false;
    }) => Promise<unknown>;
  };
  await db.updateOne({
    collection: deps.jobsCollection,
    id: job.id,
    data: { input: pointer },
    returning: false,
  });

  return pointer;
}
