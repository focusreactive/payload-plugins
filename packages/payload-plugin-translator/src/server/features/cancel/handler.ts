import type { PayloadRequest } from "payload";

import { ServerResponse } from "../../shared/index.js";
import { authorisedHandles } from "../../shared/access/authorised.js";
import { assignmentsFromRows } from "../../modules/runs/index.js";
import type { RunRecord, RunRecordStoreFactory } from "../../modules/runs/index.js";
import type { TaskRunnerFactory } from "../../modules/task-runner/index.js";
import { isCollectionAvailable } from "../_lib/collection-utils.js";

import { CancelInputSchema } from "./model.js";
import type { CancelConfig } from "./model.js";

/**
 * Which documents a set of refused runs stands for. Answered in documents rather than run handles:
 * under `select_all` the caller never named the runs, so handing their handles back would publish
 * the one thing this route stopped carrying.
 */
const documentsOf = (handles: readonly string[], rows: readonly RunRecord[]): string[] => {
  const refused = new Set(handles);
  return [...new Set(rows.filter((row) => refused.has(row.handle)).map((row) => row.collectionId))];
};

/**
 * Stops the live runs of the documents a request names, as far as the runner can.
 *
 * Cancelling never stops a locale already being translated — the runner says so in its own event
 * contract — so this reaches what the queue still holds, not what a worker has in hand.
 */
export class CancelHandler {
  private readonly config: CancelConfig;
  private readonly taskRunnerFactory: TaskRunnerFactory;
  private readonly runRecordStoreFactory: RunRecordStoreFactory;

  constructor(
    config: CancelConfig,
    taskRunnerFactory: TaskRunnerFactory,
    runRecordStoreFactory: RunRecordStoreFactory
  ) {
    this.config = config;
    this.taskRunnerFactory = taskRunnerFactory;
    this.runRecordStoreFactory = runRecordStoreFactory;
  }

  async handle(req: PayloadRequest): Promise<Response> {
    const validationResult = CancelInputSchema.safeParse(await req.json?.());
    if (validationResult.error) {
      return ServerResponse.validationError(validationResult.error.issues);
    }

    const { collection_slug, collection_id, select_all } = validationResult.data;

    const collectionSlug = isCollectionAvailable(collection_slug, this.config.availableCollections);
    if (!collectionSlug) {
      return ServerResponse.badRequest("Collection not available for translation");
    }

    const runner = this.taskRunnerFactory.create(req.payload);
    if (!runner.stop) return ServerResponse.notImplemented("This runner cannot stop work.");

    const runs = this.runRecordStoreFactory(req.payload);
    const live = select_all
      ? await runs.findLiveInCollection(collectionSlug)
      : await runs.findLiveForDocuments(collectionSlug, collection_id);

    const { authorised, refused } = await authorisedHandles({
      payload: req.payload,
      user: req.user,
      runs: assignmentsFromRows(live),
    });

    await runner.stop(authorised);

    if (refused.length === 0) return ServerResponse.noContent();
    return ServerResponse.success({ refused: documentsOf(refused, live) });
  }
}
