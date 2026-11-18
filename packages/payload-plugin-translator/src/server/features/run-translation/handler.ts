import type { PayloadRequest } from "payload";

import { ServerResponse } from "../../shared/index.js";
import { authorisedHandles } from "../../shared/access/authorised.js";
import { assignmentsFromRows } from "../../modules/runs/index.js";
import type { RunRecordStoreFactory } from "../../modules/runs/index.js";
import type { TaskRunnerFactory } from "../../modules/task-runner/index.js";
import { isCollectionAvailable } from "../_lib/collection-utils.js";

import { RunInputSchema } from "./model.js";
import type { RunConfig } from "./model.js";

/** Runs a document's queued translation now, for hosts whose queue moves only when asked. */
export class RunTranslationHandler {
  private readonly config: RunConfig;
  private readonly taskRunnerFactory: TaskRunnerFactory;
  private readonly runRecordStoreFactory: RunRecordStoreFactory;

  constructor(
    config: RunConfig,
    taskRunnerFactory: TaskRunnerFactory,
    runRecordStoreFactory: RunRecordStoreFactory
  ) {
    this.config = config;
    this.taskRunnerFactory = taskRunnerFactory;
    this.runRecordStoreFactory = runRecordStoreFactory;
  }

  async handle(req: PayloadRequest): Promise<Response> {
    const validationResult = RunInputSchema.safeParse(req.routeParams);
    if (validationResult.error)
      return ServerResponse.validationError(validationResult.error.issues);

    const { collection_slug, collection_id } = validationResult.data;

    const collectionSlug = isCollectionAvailable(collection_slug, this.config.availableCollections);
    if (!collectionSlug) {
      return ServerResponse.badRequest("Collection not available for translation");
    }

    const rows = await this.runRecordStoreFactory(req.payload).findByDocument({
      collectionSlug,
      collectionId: collection_id,
    });
    const [run] = assignmentsFromRows(rows);
    if (!run) return ServerResponse.notFound("No run found for this document");
    if (!run.startedBy) return ServerResponse.forbidden();

    const { authorised } = await authorisedHandles({
      payload: req.payload,
      user: req.user,
      runs: [run],
    });
    const [handle] = authorised;
    if (!handle) return ServerResponse.forbidden();

    const runner = this.taskRunnerFactory.create(req.payload);
    if (!runner.run) {
      return ServerResponse.notImplemented("This runner cannot start a run on demand.");
    }

    const result = await runner.run(handle);
    if (!result.success) {
      if (result.error === "not_found" || result.error === "already_completed") {
        return ServerResponse.notFound("No run found for this document");
      }
      if (result.error === "already_running") {
        return ServerResponse.tooManyRequests("Translation task is already in progress");
      }
    }

    return ServerResponse.noContent();
  }
}
