import type { PayloadRequest } from "payload";

import { ServerResponse } from "../../shared";
import type { TaskRunnerFactory } from "../../modules/task-runner";
import { isCollectionAvailable } from "../_lib/collection-utils";

import {
  GetDocumentStatusInputSchema,
  latestTaskPerTargetLocale,
  taskToJobStatusOutput,
} from "./model";
import type { GetDocumentStatusConfig } from "./model";

/**
 * Gets the translation status for a specific document
 */
export class GetDocumentStatusHandler {
  constructor(
    private readonly config: GetDocumentStatusConfig,
    private readonly taskRunnerFactory: TaskRunnerFactory
  ) {}

  async handle(req: PayloadRequest): Promise<Response> {
    const validationResult = GetDocumentStatusInputSchema.safeParse(req.routeParams);
    if (validationResult.error)
      return ServerResponse.validationError(validationResult.error.issues);

    const { collection_slug, collection_id } = validationResult.data;

    const collectionSlug = isCollectionAvailable(collection_slug, this.config.availableCollections);
    if (!collectionSlug)
      return ServerResponse.badRequest("Collection not available for translation");

    const runner = this.taskRunnerFactory.create(req.payload);
    const tasks = await runner.findByCollection(collectionSlug, [collection_id]);

    // One job per target locale (latest), not a single job for the whole document — re-translate
    // queues an independent job per locale, and the status panel renders a row per locale.
    return ServerResponse.success(latestTaskPerTargetLocale(tasks).map(taskToJobStatusOutput));
  }
}
