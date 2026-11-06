import type { PayloadRequest } from "payload";

import { ServerResponse } from "../../shared/index.js";
import type { TaskRunnerFactory } from "../../modules/task-runner/index.js";
import { assignmentsFromRows } from "../../modules/runs/index.js";
import type { RunRecord, RunRecordStoreFactory } from "../../modules/runs/index.js";
import { isCollectionAvailable } from "../_lib/collection-utils.js";
import { authorisedHandles } from "../../shared/access/authorised.js";

import { CancelByCollectionInputSchema } from "./model.js";
import type { CancelConfig } from "./model.js";

const hasStarted = (row: RunRecord): boolean => row.startedAt !== null;

const runsWithNoLocaleInFlight = (rows: readonly RunRecord[]): RunRecord[] => {
  const inFlight = new Set(rows.filter(hasStarted).map((row) => row.handle));
  return rows.filter((row) => !inFlight.has(row.handle));
};

/**
 * Cancels every queued run for a collection. Answers 204 whether or not some were refused — unlike
 * `/cancel`, which names them: the caller here named no handles to be told about.
 */
export class CancelByCollectionHandler {
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
    const validationResult = CancelByCollectionInputSchema.safeParse(req.routeParams);
    if (validationResult.error)
      return ServerResponse.validationError(validationResult.error.issues);

    const collectionSlug = isCollectionAvailable(
      validationResult.data.collection_slug,
      this.config.availableCollections
    );
    if (!collectionSlug)
      return ServerResponse.badRequest("Collection not available for translation");

    const runner = this.taskRunnerFactory.create(req.payload);
    if (!runner.stop) return ServerResponse.notImplemented("This runner cannot stop work.");

    const live = await this.runRecordStoreFactory(req.payload).findLiveInCollection(collectionSlug);
    if (live.length === 0) return ServerResponse.noContent();

    const queued = assignmentsFromRows(runsWithNoLocaleInFlight(live));
    if (queued.length === 0) return ServerResponse.noContent();

    const { authorised } = await authorisedHandles({
      payload: req.payload,
      user: req.user,
      jobs: queued,
    });
    if (authorised.length === 0) return ServerResponse.noContent();

    await runner.stop(authorised);

    return ServerResponse.noContent();
  }
}
