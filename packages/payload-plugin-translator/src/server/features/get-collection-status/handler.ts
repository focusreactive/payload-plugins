import type { PayloadRequest } from "payload";

import { ServerResponse } from "../../shared/index.js";
import type { TaskRunnerFactory } from "../../modules/task-runner/index.js";
import { isCollectionAvailable } from "../_lib/collection-utils.js";

import { GetCollectionStatusInputSchema } from "./model.js";
import type { GetCollectionStatusConfig } from "./model.js";

/**
 * Gets translation status for all documents in a collection
 */
export class GetCollectionStatusHandler {
  constructor(
    private readonly config: GetCollectionStatusConfig,
    private readonly taskRunnerFactory: TaskRunnerFactory
  ) {}

  async handle(req: PayloadRequest): Promise<Response> {
    const validationResult = GetCollectionStatusInputSchema.safeParse(req.routeParams);
    if (validationResult.error)
      return ServerResponse.validationError(validationResult.error.issues);

    const collectionSlug = isCollectionAvailable(
      validationResult.data.collection_slug,
      this.config.availableCollections
    );
    if (!collectionSlug)
      return ServerResponse.badRequest("Collection not available for translation");

    const runner = this.taskRunnerFactory.create(req.payload);
    const tasks = await runner.findByCollection(collectionSlug);

    return ServerResponse.success({
      docs: tasks.map((task) => ({
        id: task.id,
        status: task.status,
      })),
    });
  }
}
